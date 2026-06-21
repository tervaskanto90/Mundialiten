import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MatchEvent, MatchResult, Scenario, ScenarioType } from '../types'
import { DEFAULT_LIVE_CONFIG, type LiveConfig, type LiveUpdate, type LiveEvent } from '../engine/liveSync'

const REAL_ID = 'real'
// Id fijo de la predicción única atada a la cuenta (cuando hay login).
export const ACCOUNT_PRED_ID = 'account-pred'

// ─────────────────────────────────────────────────────────────────────────────
// CORRECCIONES MANUALES DE RESULTADOS REALES
// A veces el proveedor (football-data) reporta un marcador equivocado. Acá
// forzamos el marcador correcto por nº de partido: se aplica tanto al hidratar
// desde Supabase como en CADA sincronización en vivo, así la API no lo vuelve a
// pisar. Quitar la entrada cuando el proveedor corrija el dato.
//   #14 · España 0-0 Cabo Verde (15-jun-2026)
//   #38 · España 4-0 Arabia Saudí (21-jun-2026): la API lo marcaba 5-0 por error.
// ─────────────────────────────────────────────────────────────────────────────
const RESULT_OVERRIDES: Record<number, { homeScore: number; awayScore: number }> = {
  14: { homeScore: 0, awayScore: 0 },
  38: { homeScore: 4, awayScore: 0 },
}

function applyResultOverride(matchId: number, r: MatchResult): MatchResult {
  const o = RESULT_OVERRIDES[matchId]
  if (!o) return r
  return { ...r, homeScore: o.homeScore, awayScore: o.awayScore }
}

function applyOverridesToMap(results: Record<number, MatchResult>): Record<number, MatchResult> {
  let out = results
  for (const idStr of Object.keys(RESULT_OVERRIDES)) {
    const id = Number(idStr)
    if (out[id]) out = { ...out, [id]: applyResultOverride(id, out[id]) }
  }
  return out
}

const SCENARIO_COLORS = [
  '#2f6df0',
  '#e0529c',
  '#16a34a',
  '#f59e0b',
  '#8b5cf6',
  '#ef4444',
  '#0891b2',
  '#db2777',
]

function uid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function emptyResult(): MatchResult {
  return { played: false, homeScore: 0, awayScore: 0, events: [] }
}

// Cuánto suma un evento al marcador: gol/penal suma a su equipo; el gol en
// contra suma al rival. El resto (tarjetas/VAR) no afecta el marcador.
function goalDelta(type: MatchEvent['type'], team: 'home' | 'away'): [number, number] {
  if (type === 'goal' || type === 'penalty') return team === 'home' ? [1, 0] : [0, 1]
  if (type === 'own_goal') return team === 'home' ? [0, 1] : [1, 0]
  return [0, 0]
}

export type SyncStatus = 'idle' | 'syncing' | 'ok' | 'error'

interface State {
  scenarios: Scenario[]
  activeId: string

  // Sincronización en vivo del escenario real
  liveEnabled: boolean
  liveConfig: LiveConfig
  syncStatus: SyncStatus
  syncMessage: string
  lastSync: string | null
  // id de cada partido en el proveedor (para traer eventos), por nº de partido
  liveFixtureIds: Record<number, number>

  setActive: (id: string) => void
  addScenario: (type: ScenarioType, name: string, predictionDate?: string) => string
  removeScenario: (id: string) => void
  renameScenario: (id: string, name: string, predictionDate?: string) => void

  setResult: (scenarioId: string, matchId: number, patch: Partial<MatchResult>) => void
  clearResult: (scenarioId: string, matchId: number) => void

  addEvent: (scenarioId: string, matchId: number, ev: Omit<MatchEvent, 'id'>) => void
  removeEvent: (scenarioId: string, matchId: number, eventId: string) => void
  // Cantidad de intervenciones del VAR. Permitida en cualquier escenario,
  // incluido el real (el proveedor no la trae, se carga a mano).
  setVarCount: (scenarioId: string, matchId: number, count: number) => void

  setLiveEnabled: (on: boolean) => void
  setLiveConfig: (cfg: Partial<LiveConfig>) => void
  setSyncStatus: (status: SyncStatus, message?: string) => void
  applyLiveResults: (updates: LiveUpdate[]) => void
  applyLiveEvents: (matchId: number, events: LiveEvent[]) => void

  // Hidratación desde Supabase (cuando hay sesión iniciada)
  hydrateReal: (results: Record<number, MatchResult>) => void
  hydratePrediction: (results: Record<number, MatchResult>, name?: string) => void
  removeAccountPrediction: () => void

  importState: (data: { scenarios: Scenario[]; activeId?: string }) => void
}

function realScenario(): Scenario {
  return {
    id: REAL_ID,
    name: 'Resultados reales',
    type: 'real',
    color: SCENARIO_COLORS[0],
    createdAt: new Date().toISOString(),
    results: {},
  }
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      scenarios: [realScenario()],
      activeId: REAL_ID,

      liveEnabled: true,
      liveConfig: DEFAULT_LIVE_CONFIG,
      syncStatus: 'idle',
      syncMessage: '',
      lastSync: null,
      liveFixtureIds: {},

      setActive: (id) => set({ activeId: id }),

      addScenario: (type, name, predictionDate) => {
        const id = uid()
        const used = get().scenarios.length
        const scenario: Scenario = {
          id,
          name: name.trim() || (type === 'prediction' ? 'Predicción' : 'Escenario'),
          type,
          color: SCENARIO_COLORS[used % SCENARIO_COLORS.length],
          createdAt: new Date().toISOString(),
          predictionDate: type === 'prediction' ? predictionDate ?? todayISO() : undefined,
          results: {},
        }
        set((s) => ({ scenarios: [...s.scenarios, scenario], activeId: id }))
        return id
      },

      removeScenario: (id) => {
        if (id === REAL_ID) return
        set((s) => {
          const scenarios = s.scenarios.filter((x) => x.id !== id)
          const activeId = s.activeId === id ? REAL_ID : s.activeId
          return { scenarios, activeId }
        })
      },

      renameScenario: (id, name, predictionDate) =>
        set((s) => ({
          scenarios: s.scenarios.map((x) =>
            x.id === id
              ? {
                  ...x,
                  name: name.trim() || x.name,
                  predictionDate:
                    x.type === 'prediction' ? predictionDate ?? x.predictionDate : x.predictionDate,
                }
              : x,
          ),
        })),

      // El escenario real es de SÓLO LECTURA: se actualiza únicamente en vivo
      // (vía applyLiveResults). Las acciones manuales lo ignoran.
      setResult: (scenarioId, matchId, patch) => {
        if (scenarioId === REAL_ID) return
        set((s) => ({
          scenarios: s.scenarios.map((sc) => {
            if (sc.id !== scenarioId) return sc
            const cur = sc.results[matchId] ?? emptyResult()
            return {
              ...sc,
              results: { ...sc.results, [matchId]: { ...cur, ...patch } },
            }
          }),
        }))
      },

      clearResult: (scenarioId, matchId) => {
        if (scenarioId === REAL_ID) return
        set((s) => ({
          scenarios: s.scenarios.map((sc) => {
            if (sc.id !== scenarioId) return sc
            const results = { ...sc.results }
            delete results[matchId]
            return { ...sc, results }
          }),
        }))
      },

      addEvent: (scenarioId, matchId, ev) => {
        if (scenarioId === REAL_ID) return
        set((s) => ({
          scenarios: s.scenarios.map((sc) => {
            if (sc.id !== scenarioId) return sc
            const cur = sc.results[matchId] ?? emptyResult()
            const event: MatchEvent = { ...ev, id: uid() }
            const [dh, da] = goalDelta(ev.type, ev.team)
            return {
              ...sc,
              results: {
                ...sc.results,
                [matchId]: {
                  ...cur,
                  played: true,
                  homeScore: cur.homeScore + dh,
                  awayScore: cur.awayScore + da,
                  events: [...cur.events, event],
                },
              },
            }
          }),
        }))
      },

      removeEvent: (scenarioId, matchId, eventId) => {
        if (scenarioId === REAL_ID) return
        set((s) => ({
          scenarios: s.scenarios.map((sc) => {
            if (sc.id !== scenarioId) return sc
            const cur = sc.results[matchId]
            if (!cur) return sc
            const ev = cur.events.find((e) => e.id === eventId)
            const [dh, da] = ev ? goalDelta(ev.type, ev.team) : [0, 0]
            return {
              ...sc,
              results: {
                ...sc.results,
                [matchId]: {
                  ...cur,
                  homeScore: Math.max(0, cur.homeScore - dh),
                  awayScore: Math.max(0, cur.awayScore - da),
                  events: cur.events.filter((e) => e.id !== eventId),
                },
              },
            }
          }),
        }))
      },

      setVarCount: (scenarioId, matchId, count) => {
        if (scenarioId === REAL_ID) return // el real no se edita a mano
        set((s) => ({
          scenarios: s.scenarios.map((sc) => {
            if (sc.id !== scenarioId) return sc
            const cur = sc.results[matchId] ?? emptyResult()
            const varCount = Math.max(0, count)
            return {
              ...sc,
              results: {
                ...sc.results,
                [matchId]: { ...cur, varCount, played: cur.played || varCount > 0 },
              },
            }
          }),
        }))
      },

      setLiveEnabled: (on) => set({ liveEnabled: on }),

      setLiveConfig: (cfg) => set((s) => ({ liveConfig: { ...s.liveConfig, ...cfg } })),

      setSyncStatus: (status, message = '') => set({ syncStatus: status, syncMessage: message }),

      applyLiveResults: (updates) =>
        set((s) => {
          const liveFixtureIds = { ...s.liveFixtureIds }
          for (const u of updates) if (u.apiId != null) liveFixtureIds[u.matchId] = u.apiId
          return {
            lastSync: new Date().toISOString(),
            liveFixtureIds,
            scenarios: s.scenarios.map((sc) => {
              if (sc.id !== REAL_ID) return sc
              const results = { ...sc.results }
              for (const u of updates) {
                const prev = results[u.matchId]
                results[u.matchId] = applyResultOverride(u.matchId, {
                  played: true,
                  homeScore: u.homeScore,
                  awayScore: u.awayScore,
                  homePens: u.homePens ?? prev?.homePens,
                  awayPens: u.awayPens ?? prev?.awayPens,
                  events: prev?.events ?? [],
                  varCount: prev?.varCount, // preservar el VAR cargado a mano
                  finished: u.finished, // EN VIVO si played && !finished
                })
              }
              return { ...sc, results }
            }),
          }
        }),

      applyLiveEvents: (matchId, events) =>
        set((s) => ({
          scenarios: s.scenarios.map((sc) => {
            if (sc.id !== REAL_ID) return sc
            const cur = sc.results[matchId] ?? emptyResult()
            const mapped: MatchEvent[] = events.map((e) => ({ ...e, id: uid() }))
            return {
              ...sc,
              results: { ...sc.results, [matchId]: { ...cur, played: true, events: mapped } },
            }
          }),
        })),

      hydrateReal: (results) =>
        set((s) => {
          const corrected = applyOverridesToMap(results)
          return { scenarios: s.scenarios.map((sc) => (sc.id === REAL_ID ? { ...sc, results: corrected } : sc)) }
        }),

      hydratePrediction: (results, name) =>
        set((s) => {
          // Una sola predicción por cuenta: descartamos cualquier predicción
          // local previa (creada como invitado) y dejamos sólo la de la cuenta.
          const base = s.scenarios.filter(
            (x) => x.type !== 'prediction' || x.id === ACCOUNT_PRED_ID,
          )
          const exists = base.some((x) => x.id === ACCOUNT_PRED_ID)
          let scenarios: Scenario[]
          if (exists) {
            scenarios = base.map((sc) =>
              sc.id === ACCOUNT_PRED_ID ? { ...sc, results, name: name?.trim() || sc.name } : sc,
            )
          } else {
            const scenario: Scenario = {
              id: ACCOUNT_PRED_ID,
              name: name?.trim() || 'Mi predicción',
              type: 'prediction',
              color: SCENARIO_COLORS[1],
              createdAt: new Date().toISOString(),
              predictionDate: todayISO(),
              results,
            }
            scenarios = [...base, scenario]
          }
          // Si la pestaña activa era una predicción local que sacamos, reubicamos.
          const activeId = scenarios.some((x) => x.id === s.activeId) ? s.activeId : ACCOUNT_PRED_ID
          return { scenarios, activeId }
        }),

      removeAccountPrediction: () =>
        set((s) => ({
          scenarios: s.scenarios.filter((x) => x.id !== ACCOUNT_PRED_ID),
          activeId: s.activeId === ACCOUNT_PRED_ID ? REAL_ID : s.activeId,
        })),

      importState: (data) =>
        set(() => {
          const scenarios = data.scenarios?.length ? data.scenarios : [realScenario()]
          const hasReal = scenarios.some((x) => x.id === REAL_ID)
          return {
            scenarios: hasReal ? scenarios : [realScenario(), ...scenarios],
            activeId: data.activeId && scenarios.some((x) => x.id === data.activeId)
              ? data.activeId
              : REAL_ID,
          }
        }),
    }),
    {
      name: 'mundialiten-v1',
      version: 3,
      // Completa valores nuevos en datos guardados con versiones anteriores.
      migrate: (persisted: any) => {
        if (persisted && typeof persisted === 'object') {
          persisted.liveConfig = { ...DEFAULT_LIVE_CONFIG, ...(persisted.liveConfig ?? {}) }
          persisted.liveFixtureIds = persisted.liveFixtureIds ?? {}
          if (persisted.syncStatus == null) persisted.syncStatus = 'idle'
          if (persisted.syncMessage == null) persisted.syncMessage = ''
          if (persisted.lastSync === undefined) persisted.lastSync = null
          // Único proveedor: football-data.org, y auto-actualización activada.
          persisted.liveConfig.provider = 'footballdata'
          persisted.liveConfig.leagueId = 'WC'
          persisted.liveEnabled = true
        }
        return persisted
      },
    },
  ),
)

// ── Selectores / helpers ──────────────────────────────────────────────────

export const REAL_SCENARIO_ID = REAL_ID

export function getScenario(scenarios: Scenario[], id: string): Scenario | undefined {
  return scenarios.find((s) => s.id === id)
}

/**
 * Resultados "efectivos" de un escenario.
 * Los what-if heredan automáticamente los resultados reales para todo partido
 * que NO tenga una sobrescritura propia; así se actualizan solos a medida que
 * se cargan resultados reales.
 */
export function effectiveResults(
  scenario: Scenario,
  real: Scenario,
): Record<number, MatchResult> {
  if (scenario.type === 'whatif') {
    return { ...real.results, ...scenario.results }
  }
  return scenario.results
}
