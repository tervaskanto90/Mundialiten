import { TEAMS } from '../data/teams'
import { MATCHES } from '../data/schedule'
import type { Resolution } from './resolve'

// ─────────────────────────────────────────────────────────────────────────────
// SINCRONIZACIÓN EN VIVO
//
// Los resultados reales NO se editan a mano: se traen en vivo desde un proveedor
// externo. Por defecto usamos TheSportsDB (API pública y gratuita, con CORS).
// Si el torneo todavía no tiene datos en el proveedor, simplemente no actualiza.
//
// Cómo empareja: por nombre de los dos equipos (usando `aliases` en inglés).
// Para la fase de grupos los equipos son fijos; en eliminatorias empareja una
// vez que se conocen los clasificados.
// ─────────────────────────────────────────────────────────────────────────────

export interface LiveConfig {
  leagueId: string
  season: string
}

export const DEFAULT_LIVE_CONFIG: LiveConfig = {
  // TheSportsDB: id de liga de la Copa del Mundo de FIFA. Ajustable.
  leagueId: '4429',
  season: '2026',
}

export interface LiveUpdate {
  matchId: number
  homeScore: number
  awayScore: number
  finished: boolean
}

export interface SyncResult {
  updates: LiveUpdate[]
  fetched: number
  matched: number
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    // quita acentos y cualquier separador; queda sólo a-z0-9
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

// Mapa nombre/alias normalizado -> id de equipo.
const NAME_TO_ID: Record<string, string> = (() => {
  const m: Record<string, string> = {}
  for (const t of TEAMS) {
    m[normalize(t.name)] = t.id
    m[normalize(t.id)] = t.id
    for (const a of t.aliases ?? []) m[normalize(a)] = t.id
  }
  return m
})()

interface RawEvent {
  strHomeTeam?: string
  strAwayTeam?: string
  intHomeScore?: string | null
  intAwayScore?: string | null
  strStatus?: string | null
  strProgress?: string | null
}

export async function fetchLiveEvents(
  config: LiveConfig,
  signal?: AbortSignal,
): Promise<RawEvent[]> {
  const url = `https://www.thesportsdb.com/api/v1/json/3/eventsseason.php?id=${encodeURIComponent(
    config.leagueId,
  )}&s=${encodeURIComponent(config.season)}`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Proveedor respondió ${res.status}`)
  const data = (await res.json()) as { events: RawEvent[] | null }
  return data.events ?? []
}

const FINISHED_HINTS = ['ft', 'aet', 'pen', 'match finished', 'finished', 'full']

function isFinished(ev: RawEvent): boolean {
  const s = `${ev.strStatus ?? ''} ${ev.strProgress ?? ''}`.toLowerCase()
  return FINISHED_HINTS.some((h) => s.includes(h))
}

/** Convierte los eventos del proveedor en actualizaciones para nuestros partidos. */
export function matchEventsToUpdates(events: RawEvent[], resolution: Resolution): SyncResult {
  // Índice de nuestros partidos por par de equipos (cuando ya se conocen).
  const byPair: Record<string, { matchId: number; home: string; away: string }> = {}
  for (const m of MATCHES) {
    const rm = resolution.matches[m.id]
    if (rm?.home && rm?.away) {
      byPair[`${rm.home}|${rm.away}`] = { matchId: m.id, home: rm.home, away: rm.away }
      byPair[`${rm.away}|${rm.home}`] = { matchId: m.id, home: rm.home, away: rm.away }
    }
  }

  const updates: LiveUpdate[] = []
  let matched = 0
  for (const ev of events) {
    const h = ev.strHomeTeam ? NAME_TO_ID[normalize(ev.strHomeTeam)] : undefined
    const a = ev.strAwayTeam ? NAME_TO_ID[normalize(ev.strAwayTeam)] : undefined
    if (!h || !a) continue
    if (ev.intHomeScore == null || ev.intAwayScore == null || ev.intHomeScore === '' || ev.intAwayScore === '')
      continue
    const slot = byPair[`${h}|${a}`]
    if (!slot) continue
    matched++

    const evHome = Number(ev.intHomeScore)
    const evAway = Number(ev.intAwayScore)
    // Orientamos el marcador a NUESTRO local/visitante.
    const sameOrientation = slot.home === h
    updates.push({
      matchId: slot.matchId,
      homeScore: sameOrientation ? evHome : evAway,
      awayScore: sameOrientation ? evAway : evHome,
      finished: isFinished(ev),
    })
  }

  return { updates, fetched: events.length, matched }
}
