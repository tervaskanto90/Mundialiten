import { useEffect, useState } from 'react'
import { TEAMS } from '../data/teams'

// ─────────────────────────────────────────────────────────────────────────────
// CUOTAS DE CASA DE APUESTAS (índice Local/Empate/Visitante)
// Trae /api/odds una sola vez (cacheado), empareja los partidos del proveedor
// con nuestros equipos por nombre/alias y los indexa por par de equipos, para
// que el editor de predicción pueda mostrar el índice de la casa.
// ─────────────────────────────────────────────────────────────────────────────

export interface MatchOdds {
  home: number // prob. implícita 0..1
  draw: number
  away: number
  bookmaker: string
}

interface OddsApiItem {
  home_team: string
  away_team: string
  bookmaker: string
  home: number
  draw: number
  away: number
}

export interface OddsState {
  loading: boolean
  configured: boolean
  byPair: Record<string, MatchOdds> // clave "homeId|awayId"
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !['and', 'the', 'of', 'y', 'e'].includes(w))
    .join('')
}

const NAME_TO_ID: Record<string, string> = (() => {
  const m: Record<string, string> = {}
  for (const t of TEAMS) {
    m[normalize(t.name)] = t.id
    m[normalize(t.id)] = t.id
    for (const a of t.aliases ?? []) m[normalize(a)] = t.id
  }
  return m
})()

const teamId = (name: string): string | undefined => NAME_TO_ID[normalize(name)]

let cache: Promise<OddsState> | null = null

async function load(): Promise<OddsState> {
  try {
    const r = await fetch('/api/odds')
    const data = await r.json()
    if (!data.configured) return { loading: false, configured: false, byPair: {} }
    const byPair: Record<string, MatchOdds> = {}
    for (const it of (data.items as OddsApiItem[]) ?? []) {
      const h = teamId(it.home_team)
      const a = teamId(it.away_team)
      if (!h || !a) continue
      const odds: MatchOdds = { home: it.home, draw: it.draw, away: it.away, bookmaker: it.bookmaker }
      byPair[`${h}|${a}`] = odds
      // También en orientación invertida (Local/Visitante intercambiados).
      byPair[`${a}|${h}`] = { home: it.away, draw: it.draw, away: it.home, bookmaker: it.bookmaker }
    }
    return { loading: false, configured: true, byPair }
  } catch {
    return { loading: false, configured: false, byPair: {} }
  }
}

export function useOdds(): OddsState {
  const [state, setState] = useState<OddsState>({ loading: true, configured: false, byPair: {} })
  useEffect(() => {
    let alive = true
    if (!cache) cache = load()
    cache.then((s) => alive && setState(s))
    return () => {
      alive = false
    }
  }, [])
  return state
}

/** Cuota para un partido según la orientación local/visitante dada. */
export function oddsForMatch(state: OddsState, homeId?: string, awayId?: string): MatchOdds | null {
  if (!homeId || !awayId) return null
  return state.byPair[`${homeId}|${awayId}`] ?? null
}
