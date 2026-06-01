import { useMemo } from 'react'
import { useStore, effectiveResults, REAL_SCENARIO_ID, getScenario } from './store/useStore'
import { resolve, type Resolution } from './engine/resolve'
import type { MatchResult, Scenario } from './types'

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

  const resolution = useMemo(() => resolve(results), [results])
  return { scenario, real, results, resolution }
}
