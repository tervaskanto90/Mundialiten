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
    items.push({ title, source: from, link, pubDate, ts: pubDate ? Date.parse(pubDate) : null })
  }
  // Más nuevas primero y sólo de las últimas 48 h (defensivo, por si el feed
  // trae alguna más vieja).
  const cutoff = Date.now() - 1000 * 60 * 60 * 48
  return items
    .filter((it) => it.ts == null || it.ts >= cutoff)
    .sort((a, b) => (b.ts || 0) - (a.ts || 0))
}

export default async function handler(req, res) {
  const lang = String(req.query.lang || 'es').toLowerCase() === 'en' ? 'en' : 'es'
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
    // Cache 10 min en el edge: las noticias no cambian a cada segundo.
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800')
    res.status(200).json({ items, generatedAt: new Date().toISOString(), lang })
  } catch (e) {
    res.status(502).json({ error: e && e.message ? e.message : 'No se pudo traer las noticias', items: [] })
  } finally {
    clearTimeout(timer)
  }
}
