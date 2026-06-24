// Proxy serverless (Vercel) para cuotas de casas de apuestas (The Odds API).
//
// Devuelve, por partido, la probabilidad implícita de Local / Empate / Visitante
// según una casa (ej. Bet365/Pinnacle), derivada de las cuotas decimales h2h.
// El navegador no puede pegarle directo (CORS + key), por eso va del lado server.
//
// Requiere una API key GRATIS de https://the-odds-api.com (500 pedidos/mes):
//   Vercel → Project Settings → Environment Variables → ODDS_API_KEY = <tu key>
// Si no está la key, responde { configured:false } y la app oculta la barra.

const TIMEOUT_MS = 9000
// Clave del torneo en The Odds API. Configurable por query por si cambia.
const DEFAULT_SPORT = 'soccer_fifa_world_cup'

function impliedProbs(home, draw, away) {
  // 1/cuota = prob. con margen; normalizamos para que sumen 1 (saca el "vig").
  const inv = [1 / home, 1 / draw, 1 / away]
  const sum = inv[0] + inv[1] + inv[2]
  if (!isFinite(sum) || sum <= 0) return null
  return { home: inv[0] / sum, draw: inv[1] / sum, away: inv[2] / sum }
}

export default async function handler(req, res) {
  const key = process.env.ODDS_API_KEY
  if (!key) {
    res.status(200).json({ configured: false, items: [] })
    return
  }
  const sport = String(req.query.sport || DEFAULT_SPORT).replace(/[^a-z0-9_]/gi, '')
  const url =
    `https://api.the-odds-api.com/v4/sports/${sport}/odds` +
    `?regions=eu&markets=h2h&oddsFormat=decimal&apiKey=${encodeURIComponent(key)}`

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const r = await fetch(url, { signal: ctrl.signal })
    const text = await r.text()
    if (!r.ok) {
      res.status(502).json({ configured: true, error: `The Odds API respondió ${r.status}: ${text.slice(0, 140)}`, items: [] })
      return
    }
    const events = JSON.parse(text)
    const items = []
    for (const ev of events) {
      const bk = (ev.bookmakers || [])[0]
      if (!bk) continue
      const h2h = (bk.markets || []).find((m) => m.key === 'h2h')
      if (!h2h) continue
      const oc = h2h.outcomes || []
      const ph = oc.find((o) => o.name === ev.home_team)?.price
      const pa = oc.find((o) => o.name === ev.away_team)?.price
      const pd = oc.find((o) => o.name === 'Draw')?.price
      if (!ph || !pa || !pd) continue
      const probs = impliedProbs(ph, pd, pa)
      if (!probs) continue
      items.push({
        home_team: ev.home_team,
        away_team: ev.away_team,
        commence_time: ev.commence_time,
        bookmaker: bk.title,
        home: probs.home,
        draw: probs.draw,
        away: probs.away,
      })
    }
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600')
    res.status(200).json({ configured: true, items, generatedAt: new Date().toISOString() })
  } catch (e) {
    res.status(502).json({ configured: true, error: e && e.message ? e.message : 'No se pudo traer las cuotas', items: [] })
  } finally {
    clearTimeout(timer)
  }
}
