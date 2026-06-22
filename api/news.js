// Proxy serverless (Vercel) para un feed de noticias del Mundial.
//
// Levanta el RSS de Google News (gratis, sin API key) con una búsqueda acotada a
// las últimas 48 h y lo devuelve como JSON ya parseado. El navegador no puede
// pegarle directo al RSS (CORS), por eso lo hace esta función del lado server.
//
// Query params:
//   lang = 'es' (default) | 'en'   → idioma/región del feed
//   q    = búsqueda opcional (si no, usa una por defecto del Mundial 2026)

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

async function fetchOgImage(link) {
  const first = await getHtml(link, 3800)
  if (first.html) {
    const og = parseOg(first.html)
    if (og && first.finalUrl && !/news\.google\.com/.test(first.finalUrl)) return og
    // Seguía en Google (interstitial): saltamos al medio real.
    const pub = extractPublisherUrl(first.html)
    if (pub) {
      const second = await getHtml(pub, 3800)
      const og2 = parseOg(second.html)
      if (og2) return og2
    }
    if (og) return og
  }
  return ''
}

async function enrichImages(items, deadline, max = 12) {
  const targets = items.slice(0, max)
  let i = 0
  const worker = async () => {
    while (i < targets.length && Date.now() < deadline) {
      const it = targets[i++]
      if (it.image) continue
      const img = await fetchOgImage(it.link)
      if (img) it.image = img
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker))
}

// ── Proveedor con imágenes confiables: GNews (gnews.io) ──────────────────────
// Si está la env var GNEWS_API_KEY, usamos GNews, que trae el campo `image`
// directo (URL de imagen real de la nota). Si no, caemos al RSS de Google News.
async function fetchGnews(lang) {
  const key = process.env.GNEWS_API_KEY
  const conf =
    lang === 'en'
      ? { lang: 'en', country: 'us', q: '"World Cup 2026" OR "FIFA World Cup 2026"' }
      : { lang: 'es', country: 'ar', q: '"Mundial 2026" OR "Copa del Mundo 2026"' }
  const from = new Date(Date.now() - 48 * 3600 * 1000).toISOString()
  const url =
    `https://gnews.io/api/v4/search?q=${encodeURIComponent(conf.q)}` +
    `&lang=${conf.lang}&country=${conf.country}&max=10&from=${encodeURIComponent(from)}` +
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

export default async function handler(req, res) {
  const lang = String(req.query.lang || 'es').toLowerCase() === 'en' ? 'en' : 'es'

  // 1) GNews si hay key (imágenes confiables).
  if (process.env.GNEWS_API_KEY) {
    try {
      const items = await fetchGnews(lang)
      if (items.length) {
        res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800')
        res.status(200).json({ items, generatedAt: new Date().toISOString(), lang, provider: 'gnews' })
        return
      }
    } catch (e) {
      // si GNews falla (cuota, etc.) seguimos con Google News.
      console.warn('[news] gnews', e && e.message ? e.message : e)
    }
  }

  // 2) Fallback: RSS de Google News (sin key) + og:image best-effort.
  const preset = PRESETS[lang]
  const q = req.query.q ? String(req.query.q) : preset.q
  const url =
    `https://news.google.com/rss/search?q=${encodeURIComponent(q)}` +
    `&hl=${preset.hl}&gl=${preset.gl}&ceid=${encodeURIComponent(preset.ceid)}`

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mundialiten/1.0 (+vercel)' },
      signal: ctrl.signal,
    })
    if (!r.ok) {
      res.status(502).json({ error: `Google News respondió ${r.status}`, items: [] })
      return
    }
    const xml = await r.text()
    const items = parseItems(xml)
    // Enriquecemos con la og:image del artículo (con presupuesto de tiempo para
    // no agotar el límite de la función serverless).
    await enrichImages(items, Date.now() + 7000)
    // Cache 10 min en el edge: las noticias no cambian a cada segundo.
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800')
    res.status(200).json({ items, generatedAt: new Date().toISOString(), lang })
  } catch (e) {
    res.status(502).json({ error: e && e.message ? e.message : 'No se pudo traer las noticias', items: [] })
  } finally {
    clearTimeout(timer)
  }
}
