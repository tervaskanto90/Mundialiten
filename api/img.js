// Proxy de imágenes (Vercel). Sirve para mostrar fotos de notas de otros medios
// sin que el navegador las bloquee por hotlinking / CORS / mixed-content: las
// trae el server (mandando un Referer del propio dominio) y las reenvía.
//
//   /api/img?u=<url-encodeada>

const TIMEOUT_MS = 8000
const ALLOWED = /^https:\/\//i

export default async function handler(req, res) {
  const raw = req.query.u
  const url = Array.isArray(raw) ? raw[0] : raw
  if (!url || !ALLOWED.test(url)) {
    res.status(400).send('bad url')
    return
  }
  let origin = ''
  try {
    origin = new URL(url).origin
  } catch {
    res.status(400).send('bad url')
    return
  }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MundialitenBot/1.0)',
        Referer: origin + '/',
        Accept: 'image/avif,image/webp,image/*,*/*;q=0.8',
      },
      redirect: 'follow',
      signal: ctrl.signal,
    })
    const type = r.headers.get('content-type') || ''
    if (!r.ok || !type.startsWith('image/')) {
      res.status(502).send('no image')
      return
    }
    const buf = Buffer.from(await r.arrayBuffer())
    res.setHeader('Content-Type', type)
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800')
    res.status(200).send(buf)
  } catch {
    res.status(502).send('fetch failed')
  } finally {
    clearTimeout(timer)
  }
}
