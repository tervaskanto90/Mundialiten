// Proxy serverless (Vercel) para football-data.org.
//
// El navegador no puede llamar a football-data.org directamente (no manda CORS),
// así que esta función reenvía el pedido agregando la API key desde una variable
// de entorno del proyecto (FOOTBALL_DATA_TOKEN). El plan gratuito de
// football-data.org incluye el Mundial (competición 'WC').
//
// Robustez: timeout corto + reintentos con backoff, porque el proveedor a veces
// corta la conexión ("fetch failed") y conviene recuperarse solo. Si igual falla,
// devolvemos la causa real (DNS/timeout/conexión) para diagnosticar.
//
// Configurar en Vercel: Project Settings → Environment Variables →
//   FOOTBALL_DATA_TOKEN = <tu token gratis de football-data.org>

const TIMEOUT_MS = 9000
const RETRIES = 2 // intentos extra ante fallo de red

function describe(e) {
  // undici envuelve el motivo real en e.cause (ENOTFOUND, ECONNRESET, timeout…).
  const cause = e && e.cause ? (e.cause.code || e.cause.message || String(e.cause)) : ''
  return [e && e.message ? e.message : String(e), cause].filter(Boolean).join(' · ')
}

async function fetchOnce(url, token) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    return await fetch(url, {
      headers: { 'X-Auth-Token': token, 'User-Agent': 'Mundialiten/1.0 (+vercel)' },
      signal: ctrl.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

export default async function handler(req, res) {
  const token = process.env.FOOTBALL_DATA_TOKEN
  if (!token) {
    res.status(500).json({ error: 'Falta la variable de entorno FOOTBALL_DATA_TOKEN en Vercel.' })
    return
  }

  const competition = String(req.query.competition || 'WC').replace(/[^A-Za-z0-9]/g, '')
  const season = String(req.query.season || '').replace(/[^0-9]/g, '')
  // resource: 'matches' (default) | 'scorers' (goleadores + asistencias)
  const resource = String(req.query.resource || 'matches') === 'scorers' ? 'scorers' : 'matches'

  let url = `https://api.football-data.org/v4/competitions/${competition}/${resource}`
  const qs = []
  if (season) qs.push(`season=${season}`)
  if (resource === 'scorers') qs.push('limit=20')
  if (qs.length) url += `?${qs.join('&')}`

  // Cache más largo para goleadores (cambian poco y comen cuota).
  const cache = resource === 'scorers' ? 's-maxage=300, stale-while-revalidate=900' : 's-maxage=30, stale-while-revalidate=60'

  let lastErr
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 400 * attempt)) // backoff 0.4s, 0.8s
    try {
      const r = await fetchOnce(url, token)
      const text = await r.text()
      res.setHeader('Cache-Control', cache)
      res.setHeader('Content-Type', 'application/json')
      res.status(r.status).send(text)
      return
    } catch (e) {
      lastErr = e
    }
  }
  res.status(502).json({
    error: `No se pudo contactar a football-data.org (${RETRIES + 1} intentos): ${describe(lastErr)}`,
  })
}
