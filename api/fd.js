// Proxy serverless (Vercel) para football-data.org.
//
// El navegador no puede llamar a football-data.org directamente (no manda CORS),
// así que esta función reenvía el pedido agregando la API key desde una variable
// de entorno del proyecto (FOOTBALL_DATA_TOKEN). El plan gratuito de
// football-data.org incluye el Mundial (competición 'WC').
//
// Configurar en Vercel: Project Settings → Environment Variables →
//   FOOTBALL_DATA_TOKEN = <tu token gratis de football-data.org>
export default async function handler(req, res) {
  const token = process.env.FOOTBALL_DATA_TOKEN
  if (!token) {
    res.status(500).json({ error: 'Falta la variable de entorno FOOTBALL_DATA_TOKEN en Vercel.' })
    return
  }

  const competition = String(req.query.competition || 'WC').replace(/[^A-Za-z0-9]/g, '')
  const season = String(req.query.season || '').replace(/[^0-9]/g, '')

  let url = `https://api.football-data.org/v4/competitions/${competition}/matches`
  if (season) url += `?season=${season}`

  try {
    const r = await fetch(url, { headers: { 'X-Auth-Token': token } })
    const text = await r.text()
    // Cache breve para no quemar la cuota (10 pedidos/min en el plan free).
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60')
    res.setHeader('Content-Type', 'application/json')
    res.status(r.status).send(text)
  } catch (e) {
    res.status(502).json({ error: `No se pudo contactar a football-data.org: ${String(e)}` })
  }
}
