import { TEAMS } from '../data/teams'
import { MATCHES, MATCH_BY_ID } from '../data/schedule'
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

export type Provider = 'apifootball' | 'thesportsdb' | 'footballdata'

export interface LiveConfig {
  provider: Provider
  apiKey: string
  leagueId: string
  season: string
}

export const DEFAULT_LIVE_CONFIG: LiveConfig = {
  provider: 'footballdata',
  apiKey: '',
  leagueId: 'WC', // football-data.org: 'WC' = Copa del Mundo (incluida en el plan free)
  season: '2026',
}

export interface LiveUpdate {
  matchId: number
  homeScore: number
  awayScore: number
  finished: boolean
  apiId?: number // id del partido en el proveedor (para traer eventos)
  homePens?: number // tanda de penales (sólo eliminatorias definidas por penales)
  awayPens?: number
}

export interface SyncResult {
  updates: LiveUpdate[]
  fetched: number
  matched: number
  /** Nombres de equipo que el proveedor mandó y no pudimos reconocer (diagnóstico). */
  unmatched: string[]
}

export interface LiveEvent {
  type: EventType
  team: 'home' | 'away'
  player?: string
  minute?: number
  note?: string
}

// Conectores que distintos proveedores ponen o sacan ("Bosnia and Herzegovina"
// vs "Bosnia-Herzegovina"). Se ignoran para que el emparejado por nombre sea
// robusto. Se comparan como PALABRAS sueltas, así no rompen nombres como
// "Ireland" (que contiene "and" como subcadena pero no como palabra).
const NAME_STOPWORDS = new Set(['and', 'the', 'of', 'y', 'e'])

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, "") // saca acentos
    .split(/[^a-z0-9]+/) // separa en palabras (espacios, guiones, &, etc.)
    .filter((w) => w && !NAME_STOPWORDS.has(w))
    .join('')
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
  hpens?: number | null // tanda de penales (si la hubo)
  apens?: number | null
  /** Fecha/hora (UTC ms) del partido según el proveedor, si la manda. Sirve para
   *  validar que el emparejado por nombre de equipo sea realmente NUESTRO partido
   *  (ver DATE_TOLERANCE_MS más abajo). */
  kickoffMs?: number
}

// Tolerancia entre la fecha que manda el proveedor y el kickoff real de nuestro
// calendario para aceptar un emparejado por nombre de equipo. Generosa (36h) para
// cubrir diferencias de huso horario/redondeo del proveedor, pero suficiente para
// rechazar un partido de OTRO evento que casualmente tenga los mismos dos equipos
// (ej.: un amistoso viejo, o un dato mal cacheado del proveedor) — el bug real que
// escribió un 0-3 en un cruce de octavos que todavía no se había jugado.
const DATE_TOLERANCE_MS = 36 * 60 * 60 * 1000

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
    kickoffMs: r.fixture?.date ? Date.parse(r.fixture.date) : undefined,
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
      kickoffMs: e.strTimestamp ? Date.parse(e.strTimestamp) : e.dateEvent ? Date.parse(e.dateEvent) : undefined,
    }
  })
}

// football-data.org vía el proxy serverless propio (/api/fd). El plan free
// incluye el Mundial ('WC'); devuelve marcadores (sin detalle de goleadores).
async function fetchFootballData(config: LiveConfig, signal?: AbortSignal): Promise<NormFixture[]> {
  const url = `/api/fd?competition=${encodeURIComponent(config.leagueId || 'WC')}&season=${encodeURIComponent(config.season)}`
  const res = await fetch(url, { signal })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.error || data?.message || `El proxy respondió ${res.status}`)
  }
  const rows: any[] = data.matches ?? []
  return rows.map((m) => {
    const penH = m.score?.penalties?.home ?? null
    const penA = m.score?.penalties?.away ?? null
    const { hs, as } = regulationScore(m.score?.fullTime?.home ?? null, m.score?.fullTime?.away ?? null, penH, penA)
    return {
      homeName: m.homeTeam?.name ?? '',
      awayName: m.awayTeam?.name ?? '',
      hs,
      as,
      finished: m.status === 'FINISHED',
      apiId: m.id,
      hpens: penH,
      apens: penA,
      kickoffMs: m.utcDate ? Date.parse(m.utcDate) : undefined,
    }
  })
}

/**
 * Marcador REAL del partido (el de después del alargue) a partir de lo que manda
 * football-data.org. Ese proveedor SUMA la tanda de penales al `fullTime` (ej.:
 * 1-1 que se define 4-3 por penales lo reporta como 5-4). Pero un partido que va
 * a penales terminó EMPATADO tras el alargue, así que el marcador no puede llevar
 * los penales encima.
 *
 * Si al restar los penales del fullTime queda un empate no-negativo, ése es el
 * marcador real (caso de football-data). Si no, el fullTime ya venía como el
 * marcador y se deja igual. Sin penales, devuelve el fullTime tal cual.
 */
export function regulationScore(
  ftHome: number | null,
  ftAway: number | null,
  penHome: number | null,
  penAway: number | null,
): { hs: number | null; as: number | null } {
  if (ftHome == null || ftAway == null || penHome == null || penAway == null) return { hs: ftHome, as: ftAway }
  const rH = ftHome - penHome
  const rA = ftAway - penAway
  if (rH >= 0 && rA >= 0 && rH === rA) return { hs: rH, as: rA }
  return { hs: ftHome, as: ftAway }
}

export async function fetchLiveFixtures(config: LiveConfig, signal?: AbortSignal): Promise<NormFixture[]> {
  if (config.provider === 'thesportsdb') return fetchTheSportsDb(config, signal)
  if (config.provider === 'footballdata') return fetchFootballData(config, signal)
  return fetchApiFootball(config, signal)
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
  const unmatched = new Set<string>()
  for (const f of fixtures) {
    const h = NAME_TO_ID[normalize(f.homeName)]
    const a = NAME_TO_ID[normalize(f.awayName)]
    // Diagnóstico: nombres que el proveedor manda y NO reconocemos (alias).
    if (!h) unmatched.add(f.homeName)
    if (!a) unmatched.add(f.awayName)
    if (!h || !a) continue
    const slot = byPair[`${h}|${a}`]
    if (!slot) continue
    // Sanity check de fecha: el emparejado es SÓLO por nombre de equipo, así que un
    // dato viejo/erróneo del proveedor con los mismos dos equipos (otro amistoso,
    // un cache corrupto) podría escribirse en un cruce nuestro que TODAVÍA no se
    // jugó. Si el proveedor manda fecha y está lejísimos del kickoff real de ESE
    // partido en nuestro calendario, descartamos el dato (no lo tratamos ni como
    // "matched", para que se vea en el diagnóstico de unmatched/fetched).
    const ourKickoff = Date.parse(MATCH_BY_ID[slot.matchId].kickoff)
    if (f.kickoffMs != null && Math.abs(f.kickoffMs - ourKickoff) > DATE_TOLERANCE_MS) continue
    matched++ // emparejado con uno de nuestros partidos (haya o no marcador)
    if (f.hs == null || f.as == null) continue // en el feed pero todavía sin marcador
    const sameOrientation = slot.home === h
    const hasPens = f.hpens != null && f.apens != null
    const homeScore = sameOrientation ? f.hs : f.as
    const awayScore = sameOrientation ? f.as : f.hs
    // REGLA DE PENALES (universal): un partido que se define por penales terminó
    // EMPATADO a los 120' y la tanda SIEMPRE tiene un ganador. Si el proveedor manda
    // penales con un marcador que NO es empate, o con la tanda EMPATADA (3-3: tanda
    // en curso / dato incompleto), el dato es inconsistente → NO lo escribimos, así
    // no se corrompe el resultado ni se pierde el bonus de "quién pasa". Con datos
    // limpios, regulationScore deja el marcador en empate y la tanda viene definida.
    if (hasPens && (homeScore !== awayScore || f.hpens === f.apens)) continue
    updates.push({
      matchId: slot.matchId,
      homeScore,
      awayScore,
      finished: f.finished,
      apiId: f.apiId,
      homePens: hasPens ? (sameOrientation ? f.hpens! : f.apens!) : undefined,
      awayPens: hasPens ? (sameOrientation ? f.apens! : f.hpens!) : undefined,
    })
  }
  return { updates, fetched: fixtures.length, matched, unmatched: [...unmatched] }
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
