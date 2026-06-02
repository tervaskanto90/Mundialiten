import { useEffect, useMemo } from 'react'
import { useStore, effectiveResults, REAL_SCENARIO_ID, getScenario } from './store/useStore'
import { resolve, type Resolution } from './engine/resolve'
import { allGroupsComplete } from './engine/standings'
import { fetchLiveFixtures, mapFixturesToUpdates } from './engine/liveSync'
import type { MatchResult, Scenario } from './types'

/** Intervalo de auto-actualización en vivo (ms). 5 min para cuidar la cuota del proveedor. */
const POLL_MS = 5 * 60_000

export interface ActiveContext {
  scenario: Scenario
  real: Scenario
  results: Record<number, MatchResult>
  resolution: Resolution
}

/** Escenario activo + sus resultados efectivos + resolución (tablas/llaves). */
export function useActiveContext(): ActiveContext {
  const scenarios = useStore((s) => s.scenarios)
  const activeId = useStore((s) => s.activeId)

  const real = getScenario(scenarios, REAL_SCENARIO_ID) ?? scenarios[0]
  const scenario = getScenario(scenarios, activeId) ?? real
  const results = effectiveResults(scenario, real)

  // Resolución del REAL: de ahí salen los clasificados reales para la fase final.
  const realResolution = useMemo(() => resolve(real.results), [real.results])

  // Cuando la fase de grupos real terminó, las PREDICCIONES arman su fase final
  // con los equipos que realmente clasificaron (automático para todos).
  const overrideSlots = useMemo(() => {
    if (scenario.type === 'prediction' && allGroupsComplete(real.results)) {
      return realResolution.slots
    }
    return undefined
  }, [scenario.type, real.results, realResolution])

  const resolution = useMemo(() => resolve(results, overrideSlots), [results, overrideSlots])
  return { scenario, real, results, resolution }
}

/**
 * Trae los resultados del proveedor y los aplica al escenario real.
 * Es una función suelta (no hook) para poder llamarla desde el polling
 * automático o desde un botón "Sincronizar ahora".
 */
export async function runLiveSync(): Promise<void> {
  const st = useStore.getState()
  st.setSyncStatus('syncing')
  try {
    const fixtures = await fetchLiveFixtures(st.liveConfig)
    const real = getScenario(st.scenarios, REAL_SCENARIO_ID)
    const resolution = resolve(real?.results ?? {})
    const { updates, matched, fetched } = mapFixturesToUpdates(fixtures, resolution)
    st.applyLiveResults(updates)
    st.setSyncStatus(
      'ok',
      fetched === 0
        ? 'El proveedor todavía no tiene partidos de este torneo'
        : `${updates.length} con resultado · ${matched} emparejados de ${fetched}`,
    )
  } catch (e) {
    st.setSyncStatus('error', e instanceof Error ? e.message : 'No se pudo conectar')
  }
}

/** Dispara el polling automático mientras la sincronización en vivo esté activa. */
export function useLiveSyncPolling(): void {
  const liveEnabled = useStore((s) => s.liveEnabled)
  const leagueId = useStore((s) => s.liveConfig.leagueId)
  const season = useStore((s) => s.liveConfig.season)

  useEffect(() => {
    if (!liveEnabled) return
    runLiveSync()
    const id = setInterval(runLiveSync, POLL_MS)
    return () => clearInterval(id)
  }, [liveEnabled, leagueId, season])
}
