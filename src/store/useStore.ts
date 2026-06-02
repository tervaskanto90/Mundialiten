import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MatchEvent, MatchResult, Scenario, ScenarioType } from '../types'
import { DEFAULT_LIVE_CONFIG, type LiveConfig, type LiveUpdate, type LiveEvent } from '../engine/liveSync'

const REAL_ID = 'real'

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

  setLiveEnabled: (on: boolean) => void
  setLiveConfig: (cfg: Partial<LiveConfig>) => void
  setSyncStatus: (status: SyncStatus, message?: string) => void
  applyLiveResults: (updates: LiveUpdate[]) => void
  applyLiveEvents: (matchId: number, events: LiveEvent[]) => void

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

      liveEnabled: false,
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
            return {
              ...sc,
              results: {
                ...sc.results,
                [matchId]: { ...cur, events: [...cur.events, event] },
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
            return {
              ...sc,
              results: {
                ...sc.results,
                [matchId]: { ...cur, events: cur.events.filter((e) => e.id !== eventId) },
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
                results[u.matchId] = {
                  played: true,
                  homeScore: u.homeScore,
                  awayScore: u.awayScore,
                  homePens: prev?.homePens,
                  awayPens: prev?.awayPens,
                  events: prev?.events ?? [],
                }
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
      version: 2,
      // Completa valores nuevos en datos guardados con versiones anteriores.
      migrate: (persisted: any) => {
        if (persisted && typeof persisted === 'object') {
          persisted.liveConfig = { ...DEFAULT_LIVE_CONFIG, ...(persisted.liveConfig ?? {}) }
          persisted.liveFixtureIds = persisted.liveFixtureIds ?? {}
          if (persisted.syncStatus == null) persisted.syncStatus = 'idle'
          if (persisted.syncMessage == null) persisted.syncMessage = ''
          if (persisted.lastSync === undefined) persisted.lastSync = null
          if (persisted.liveEnabled == null) persisted.liveEnabled = false
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
