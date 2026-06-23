// Proxy serverless (Vercel) para un feed de noticias del Mundial.
//
// Levanta el RSS de Google News (gratis, sin API key) con una búsqueda acotada a
// las últimas 48 h y lo devuelve como JSON ya parseado. El navegador no puede
// pegarle directo al RSS (CORS), por eso lo hace esta función del lado server.
//
// Query params:
//   lang = 'es' (default) | 'en'   → idioma/región del feed
//   q    = búsqueda opcional (si no, usa una por defecto del Mundial 2026)

// Damos más margen de ejecución: resolver la og:image de las notas frescas
// (decodificar Google News + bajar la página del medio) lleva varios segundos.
export const config = { maxDuration: 25 }

const TIMEOUT_MS = 9000

const PRESETS = {
  es: {
    hl: 'es-419',
    gl: 'AR',
    ceid: 'AR:es-419',
    q: '(Mundial 2026 OR "Copa del Mundo 2026" OR "World Cup 2026") when:2d',
  },
  en: {
    hl: 'en-US',
    gl: 'US',
    ceid: 'US:en',
    q: '("FIFA World Cup 2026" OR "World Cup 2026") when:2d',
  },
}

function decodeEntities(s) {
  return String(s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .trim()
}

function pick(block, tag) {
  const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i').exec(block)
  return m ? decodeEntities(m[1]) : ''
}

function parseItems(xml) {
  const items = []
  const re = /<item>([\s\S]*?)<\/item>/g
  let m
  while ((m = re.exec(xml)) && items.length < 30) {
    const block = m[1]
    const rawTitle = pick(block, 'title')
    const source = pick(block, 'source')
    // Google News titula "Headline - Fuente": separamos la fuente si vino así.
    let title = rawTitle
    let from = source
    const dash = rawTitle.lastIndexOf(' - ')
    if (!from && dash > 0) {
      from = rawTitle.slice(dash + 3)
      title = rawTitle.slice(0, dash)
    } else if (from && rawTitle.endsWith(' - ' + from)) {
      title = rawTitle.slice(0, rawTitle.length - from.length - 3)
    }
    const pubDate = pick(block, 'pubDate')
    const link = pick(block, 'link')
    if (!title || !link) continue
    // Imagen: Google News a veces la mete en la descripción (<img src>) o en
    // media:content. Best-effort; si no hay, el front pone un placeholder.
    let image = ''
    const mc = /<media:(?:content|thumbnail)[^>]*url="([^"]+)"/i.exec(block)
    if (mc) image = mc[1]
    if (!image) {
      const desc = pick(block, 'description')
      const img = /<img[^>]*src="([^"]+)"/i.exec(desc)
      if (img) image = img[1]
    }
    items.push({ title, source: from, link, pubDate, ts: pubDate ? Date.parse(pubDate) : null, image })
  }
  // Más nuevas primero y sólo de las últimas 48 h (defensivo, por si el feed
  // trae alguna más vieja).
  const cutoff = Date.now() - 1000 * 60 * 60 * 48
  return items
    .filter((it) => it.ts == null || it.ts >= cutoff)
    .sort((a, b) => (b.ts || 0) - (a.ts || 0))
}

// ── Imagen de portada del artículo (og:image) ───────────────────────────────
// El <link> del RSS es un redirect de Google News. Lo seguimos hasta el medio y
// sacamos la og:image (la foto que el propio artículo declara para compartir).
function parseOg(html) {
  const pats = [
    /<meta[^>]+(?:property|name)=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+itemprop=["']image["'][^>]+content=["']([^"']+)["']/i,
    /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i,
  ]
  for (const re of pats) {
    const m = re.exec(html)
    if (m && m[1] && /^https?:\/\//i.test(m[1])) return decodeEntities(m[1])
  }
  return ''
}

function extractPublisherUrl(html) {
  let m = /<meta[^>]+http-equiv=["']refresh["'][^>]+content=["'][^"']*url=([^"']+)["']/i.exec(html)
  if (m) return decodeEntities(m[1])
  m = /data-n-au=["']([^"']+)["']/i.exec(html)
  if (m) return m[1]
  m = /https?:\/\/(?!news\.google|www\.google|accounts\.google|policies\.google|support\.google|gstatic\.com|googleusercontent)[^"'\s<>]+/i.exec(html)
  return m ? m[0] : ''
}

async function getHtml(url, ms) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MundialitenBot/1.0; +https://vercel.com)' },
      redirect: 'follow',
      signal: ctrl.signal,
    })
    if (!r.ok) return { html: '', finalUrl: r.url }
    const html = (await r.text()).slice(0, 220000) // con el <head> alcanza
    return { html, finalUrl: r.url }
  } catch {
    return { html: '', finalUrl: '' }
  } finally {
    clearTimeout(timer)
  }
}

// Decodifica el link de Google News (news.google.com/.../articles/<ID>) a la URL
// real del medio, usando el endpoint batchexecute (firma + timestamp de la
// página). Best-effort: si Google cambia el formato, devuelve '' y caemos al
// método de redirect. Así las notas FRESCAS del RSS consiguen su og:image.
async function decodeGNewsUrl(link) {
  try {
    const idm = /\/(?:rss\/)?articles\/([^?/]+)/.exec(link)
    if (!idm) return ''
    const id = idm[1]
    const pg = await getHtml(`https://news.google.com/rss/articles/${id}`, 3500)
    if (!pg.html) return ''
    const sig = /data-n-a-sg="([^"]+)"/.exec(pg.html)
    const ts = /data-n-a-ts="([^"]+)"/.exec(pg.html)
    if (!sig || !ts) return ''
    const inner = JSON.stringify([
      'garturlreq',
      [['X', 'X', ['X', 'X'], null, null, 1, 1, 'US:en', null, 1, null, null, null, null, null, 0, 1], 'X', 'X', 1, [1, 1, 1], 1, 1, null, 0, 0, null, 0],
      id,
      Number(ts[1]),
      sig[1],
    ])
    const freq = JSON.stringify([[['Fbv4je', inner, null, 'generic']]])
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 3000)
    try {
      const r = await fetch('https://news.google.com/_/DotsSplashUi/data/batchexecute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', 'User-Agent': 'Mozilla/5.0 (compatible; MundialitenBot/1.0)' },
        body: 'f.req=' + encodeURIComponent(freq),
        signal: ctrl.signal,
      })
      const txt = (await r.text()).replace(/\\u003d/g, '=').replace(/\\\//g, '/')
      const mm = /(https?:\/\/(?!news\.google|www\.google|gstatic\.com|googleusercontent)[^"\\\s]+)/.exec(txt)
      return mm ? mm[1] : ''
    } finally {
      clearTimeout(t)
    }
  } catch {
    return ''
  }
}

async function fetchOgImage(link) {
  // 1) Para links de Google News, decodificar a la URL real del medio.
  if (/news\.google\.com\/(?:rss\/)?articles\//.test(link)) {
    const real = await decodeGNewsUrl(link)
    if (real) {
      const r = await getHtml(real, 4500)
      const og = parseOg(r.html)
      if (og) return og
    }
  }
  // 2) Seguir el redirect y, si hace falta, saltar al medio.
  const first = await getHtml(link, 4500)
  if (first.html) {
    const og = parseOg(first.html)
    if (og && first.finalUrl && !/news\.google\.com/.test(first.finalUrl)) return og
    const pub = extractPublisherUrl(first.html)
    if (pub) {
      const second = await getHtml(pub, 4500)
      const og2 = parseOg(second.html)
      if (og2) return og2
    }
    if (og) return og
  }
  return ''
}

function raceTimeout(promise, ms) {
  return Promise.race([promise, new Promise((res) => setTimeout(() => res(''), ms))])
}

async function enrichImages(items, deadline, max = 12) {
  const targets = items.slice(0, max)
  let i = 0
  const worker = async () => {
    while (i < targets.length && Date.now() < deadline) {
      const it = targets[i++]
      if (it.image) continue
      // Tope duro por nota para no agotar el tiempo de la función serverless.
      const img = await raceTimeout(fetchOgImage(it.link), 8000)
      if (img) it.image = img
    }
  }
  await Promise.all(Array.from({ length: 10 }, worker))
}

// ── Proveedor con imágenes confiables: GNews (gnews.io) ──────────────────────
// Si está la env var GNEWS_API_KEY, usamos GNews, que trae el campo `image`
// directo (URL de imagen real de la nota). Si no, caemos al RSS de Google News.
async function fetchGnews(lang) {
  const key = process.env.GNEWS_API_KEY
  // Sin `country`: trae fuentes de todo el mundo hispano (Marca, AS, ESPN, Olé,
  // etc.), no sólo medios argentinos → más diversidad con imagen.
  const conf =
    lang === 'en'
      ? { lang: 'en', q: '"World Cup 2026" OR "FIFA World Cup 2026"' }
      : { lang: 'es', q: '"Mundial 2026" OR "Copa del Mundo 2026"' }
  const from = new Date(Date.now() - 48 * 3600 * 1000).toISOString()
  const url =
    `https://gnews.io/api/v4/search?q=${encodeURIComponent(conf.q)}` +
    `&lang=${conf.lang}&max=10&from=${encodeURIComponent(from)}` +
    `&sortby=publishedAt&apikey=${encodeURIComponent(key)}`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const r = await fetch(url, { signal: ctrl.signal })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(data?.errors?.[0] || `GNews respondió ${r.status}`)
    return (data.articles || []).map((a) => ({
      title: a.title || '',
      source: a.source?.name || '',
      link: a.url || '',
      pubDate: a.publishedAt || '',
      ts: a.publishedAt ? Date.parse(a.publishedAt) : null,
      image: a.image || '',
    })).filter((it) => it.title && it.link)
  } finally {
    clearTimeout(timer)
  }
}

// RSS de Google News (sin key): muy fresco y con muchas fuentes.
async function fetchGoogleRss(lang) {
  const preset = PRESETS[lang]
  const url =
    `https://news.google.com/rss/search?q=${encodeURIComponent(preset.q)}` +
    `&hl=${preset.hl}&gl=${preset.gl}&ceid=${encodeURIComponent(preset.ceid)}`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mundialiten/1.0 (+vercel)' }, signal: ctrl.signal })
    if (!r.ok) return []
    return parseItems(await r.text())
  } catch {
    return []
  } finally {
    clearTimeout(timer)
  }
}

function normTitle(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

// Junta varias listas y deduplica por título; conserva la imagen si alguna la
// trae y se queda con la versión más nueva.
function dedupeMerge(lists) {
  const byKey = new Map()
  for (const list of lists) {
    for (const it of list) {
      if (!it.title || !it.link) continue
      const key = normTitle(it.title).slice(0, 60)
      const prev = byKey.get(key)
      if (!prev) {
        byKey.set(key, { ...it })
        continue
      }
      // El más nuevo manda, pero nos quedamos con la imagen que exista.
      const newer = (it.ts || 0) >= (prev.ts || 0) ? it : prev
      byKey.set(key, { ...newer, image: newer.image || it.image || prev.image })
    }
  }
  return [...byKey.values()]
}

// Arma la lista final priorizando notas CON imagen (así las tarjetas tienen
// foto), ordenadas por fecha y con tope por fuente para no repetir el mismo
// medio. Si faltan, completa con más imágenes y, recién al final, sin imagen.
function diversify(items, total = 12) {
  const byTs = (a, b) => (b.ts || 0) - (a.ts || 0)
  const all = [...items].sort(byTs)
  const out = []
  const seen = new Set()
  const count = {}
  const add = (it) => {
    if (!it || seen.has(it) || out.length >= total) return
    seen.add(it)
    out.push(it)
    const s = (it.source || '?').toLowerCase()
    count[s] = (count[s] || 0) + 1
  }
  // 1) FRESCURA garantizada: las 2 notas más nuevas entran sí o sí (con o sin
  //    imagen), para que la "última noticia" sea siempre lo más reciente.
  add(all[0])
  add(all[1])
  // 2) Resto: priorizando notas CON imagen y repartiendo por fuente (1 por medio,
  //    luego 2, 3…) para diversidad.
  const withImg = all.filter((i) => i.image)
  for (const cap of [1, 2, 3, 99]) {
    if (out.length >= total) break
    for (const it of withImg) {
      if (out.length >= total) break
      const s = (it.source || '?').toLowerCase()
      if ((count[s] || 0) >= cap) continue
      add(it)
    }
  }
  // 3) Completar con lo que quede.
  for (const it of all) add(it)
  // Orden final por fecha: la más nueva primero.
  return out.sort(byTs)
}

export default async function handler(req, res) {
  const lang = String(req.query.lang || 'es').toLowerCase() === 'en' ? 'en' : 'es'

  // Traemos en paralelo el RSS de Google News (fresco + diverso) y GNews
  // (imágenes confiables, si hay key). Después fusionamos y ordenamos por fecha.
  const tasks = [fetchGoogleRss(lang).catch(() => [])]
  if (process.env.GNEWS_API_KEY) tasks.push(fetchGnews(lang).catch(() => []))

  try {
    const lists = await Promise.all(tasks)
    let merged = dedupeMerge(lists)
    // Completamos imágenes faltantes (items del RSS) con la og:image del artículo,
    // empezando por las MÁS FRESCAS (para que la última noticia tenga foto).
    merged.sort((a, b) => (b.ts || 0) - (a.ts || 0))
    await enrichImages(merged, Date.now() + 18000, 14)
    const items = diversify(merged, 12)
    // Cache corto en el edge para mantener la frescura (el front además refresca).
    res.setHeader('Cache-Control', 's-maxage=180, stale-while-revalidate=900')
    res.status(200).json({ items, generatedAt: new Date().toISOString(), lang })
  } catch (e) {
    res.status(502).json({ error: e && e.message ? e.message : 'No se pudo traer las noticias', items: [] })
  }
}
