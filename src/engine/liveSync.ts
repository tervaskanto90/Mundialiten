import { TEAMS } from '../data/teams'
import { MATCHES } from '../data/schedule'
import type { EventType } from '../types'
import type { Resolution } from './resolve'

// ─────────────────────────────────────────────────────────────────────────────
// SINCRONIZACIÓN EN VIVO
//
// Los resultados reales NO se editan a mano: se traen en vivo desde un proveedor.
//  • API-Football (api-sports.io): marcadores + goleadores + tarjetas + VAR.
//    Requiere una API key gratuita (header x-apisports-key). league=1 es el
//    Mundial de la FIFA.
//  • TheSportsDB: gratis y sin key, pero sólo marcadores.
//
// El emparejado de partidos es por nombre de los equipos (ver `aliases` en
// teams.ts). En la fase de grupos los equipos son fijos; en eliminatorias se
// empareja una vez conocidos los clasificados.
// ─────────────────────────────────────────────────────────────────────────────

export type Provider = 'apifootball' | 'thesportsdb'

export interface LiveConfig {
  provider: Provider
  apiKey: string
  leagueId: string
  season: string
}

export const DEFAULT_LIVE_CONFIG: LiveConfig = {
  provider: 'apifootball',
  apiKey: '',
  leagueId: '1', // API-Football: 1 = FIFA World Cup
  season: '2026',
}

export interface LiveUpdate {
  matchId: number
  homeScore: number
  awayScore: number
  finished: boolean
  apiId?: number // id del partido en el proveedor (para traer eventos)
}

export interface SyncResult {
  updates: LiveUpdate[]
  fetched: number
  matched: number
}

export interface LiveEvent {
  type: EventType
  team: 'home' | 'away'
  player?: string
  minute?: number
  note?: string
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    // quita acentos y separadores; queda sólo a-z0-9
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

// Forma normalizada de un partido del proveedor.
interface NormFixture {
  homeName: string
  awayName: string
  hs: number | null
  as: number | null
  finished: boolean
  apiId?: number
}

const APIF_BASE = 'https://v3.football.api-sports.io'
const FINISHED_SHORT = ['FT', 'AET', 'PEN']

async function fetchApiFootball(config: LiveConfig, signal?: AbortSignal): Promise<NormFixture[]> {
  if (!config.apiKey.trim()) {
    throw new Error('Falta la API key de API-Football (cargala en ⚙).')
  }
  const url = `${APIF_BASE}/fixtures?league=${encodeURIComponent(config.leagueId)}&season=${encodeURIComponent(config.season)}`
  const res = await fetch(url, { headers: { 'x-apisports-key': config.apiKey.trim() }, signal })
  if (!res.ok) throw new Error(`API-Football respondió ${res.status}`)
  const data = await res.json()
  if (data.errors && Object.keys(data.errors).length > 0) {
    throw new Error(String(Object.values(data.errors)[0]))
  }
  const rows: any[] = data.response ?? []
  return rows.map((r) => ({
    homeName: r.teams?.home?.name ?? '',
    awayName: r.teams?.away?.name ?? '',
    hs: r.goals?.home ?? null,
    as: r.goals?.away ?? null,
    finished: FINISHED_SHORT.includes(r.fixture?.status?.short),
    apiId: r.fixture?.id,
  }))
}

const TSDB_FINISHED = ['ft', 'aet', 'pen', 'match finished', 'finished', 'full']

async function fetchTheSportsDb(config: LiveConfig, signal?: AbortSignal): Promise<NormFixture[]> {
  const url = `https://www.thesportsdb.com/api/v1/json/3/eventsseason.php?id=${encodeURIComponent(
    config.leagueId,
  )}&s=${encodeURIComponent(config.season)}`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`TheSportsDB respondió ${res.status}`)
  const data = await res.json()
  const rows: any[] = data.events ?? []
  return rows.map((e) => {
    const status = `${e.strStatus ?? ''} ${e.strProgress ?? ''}`.toLowerCase()
    return {
      homeName: e.strHomeTeam ?? '',
      awayName: e.strAwayTeam ?? '',
      hs: e.intHomeScore == null || e.intHomeScore === '' ? null : Number(e.intHomeScore),
      as: e.intAwayScore == null || e.intAwayScore === '' ? null : Number(e.intAwayScore),
      finished: TSDB_FINISHED.some((h) => status.includes(h)),
    }
  })
}

export async function fetchLiveFixtures(config: LiveConfig, signal?: AbortSignal): Promise<NormFixture[]> {
  return config.provider === 'thesportsdb'
    ? fetchTheSportsDb(config, signal)
    : fetchApiFootball(config, signal)
}

/** Empareja los partidos del proveedor con los nuestros y arma las actualizaciones. */
export function mapFixturesToUpdates(fixtures: NormFixture[], resolution: Resolution): SyncResult {
  const byPair: Record<string, { matchId: number; home: string }> = {}
  for (const m of MATCHES) {
    const rm = resolution.matches[m.id]
    if (rm?.home && rm?.away) {
      byPair[`${rm.home}|${rm.away}`] = { matchId: m.id, home: rm.home }
      byPair[`${rm.away}|${rm.home}`] = { matchId: m.id, home: rm.home }
    }
  }

  const updates: LiveUpdate[] = []
  let matched = 0
  for (const f of fixtures) {
    const h = NAME_TO_ID[normalize(f.homeName)]
    const a = NAME_TO_ID[normalize(f.awayName)]
    if (!h || !a) continue
    if (f.hs == null || f.as == null) continue
    const slot = byPair[`${h}|${a}`]
    if (!slot) continue
    matched++
    const sameOrientation = slot.home === h
    updates.push({
      matchId: slot.matchId,
      homeScore: sameOrientation ? f.hs : f.as,
      awayScore: sameOrientation ? f.as : f.hs,
      finished: f.finished,
      apiId: f.apiId,
    })
  }
  return { updates, fetched: fixtures.length, matched }
}

function classifyEvent(type: string, detail: string): EventType | null {
  const t = type.toLowerCase()
  const d = detail.toLowerCase()
  if (t === 'goal') {
    if (d.includes('own')) return 'own_goal'
    if (d.includes('penalty') && !d.includes('missed')) return 'penalty'
    if (d.includes('missed')) return null
    return 'goal'
  }
  if (t === 'card') {
    if (d.includes('red') || d.includes('second yellow')) return 'red'
    if (d.includes('yellow')) return 'yellow'
  }
  if (t === 'var') return 'var'
  return null
}

/** Trae los eventos (goles/tarjetas/VAR) de un partido concreto (sólo API-Football). */
export async function fetchFixtureEvents(
  config: LiveConfig,
  apiId: number,
  homeId: string,
  _awayId: string,
  signal?: AbortSignal,
): Promise<LiveEvent[]> {
  if (config.provider !== 'apifootball') {
    throw new Error('El detalle de eventos sólo está disponible con API-Football.')
  }
  if (!config.apiKey.trim()) throw new Error('Falta la API key de API-Football.')
  const url = `${APIF_BASE}/fixtures/events?fixture=${apiId}`
  const res = await fetch(url, { headers: { 'x-apisports-key': config.apiKey.trim() }, signal })
  if (!res.ok) throw new Error(`API-Football respondió ${res.status}`)
  const data = await res.json()
  if (data.errors && Object.keys(data.errors).length > 0) {
    throw new Error(String(Object.values(data.errors)[0]))
  }
  const rows: any[] = data.response ?? []
  const out: LiveEvent[] = []
  for (const r of rows) {
    const type = classifyEvent(r.type ?? '', r.detail ?? '')
    if (!type) continue
    // El equipo del evento se resuelve por id (vía aliases) y se compara al local.
    const evTeamId = NAME_TO_ID[normalize(r.team?.name ?? '')]
    const side: 'home' | 'away' = evTeamId === homeId ? 'home' : 'away'
    out.push({
      type,
      team: side,
      player: r.player?.name ?? undefined,
      minute: r.time?.elapsed ?? undefined,
      note: type === 'var' ? r.detail ?? undefined : undefined,
    })
  }
  return out
}
