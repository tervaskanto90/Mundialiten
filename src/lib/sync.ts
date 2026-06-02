import { useEffect, useRef } from 'react'
import { useAuth } from '../auth'
import {
  useStore,
  getScenario,
  ACCOUNT_PRED_ID,
  REAL_SCENARIO_ID,
} from '../store/useStore'
import { computeAccuracy } from '../engine/accuracy'
import {
  fetchRealResults,
  saveRealResults,
  fetchMyPrediction,
  saveMyPrediction,
  upsertScore,
} from './remote'

const DEBOUNCE_MS = 1500

/**
 * Mantiene en sync con Supabase (cuando hay sesión):
 *  - al entrar: trae los resultados reales centrales y la predicción propia.
 *  - al editar: empuja la predicción y los resultados reales (debounced) y
 *    recalcula el % de acierto que alimenta el ranking.
 *  - al salir: quita la predicción de la cuenta del estado local.
 */
export function useSupabaseSync(): void {
  const { enabled, user, displayName } = useAuth()
  const userId = user?.id ?? null
  const lastPushed = useRef<{ pred: string; real: string }>({ pred: '∅', real: '∅' })

  // Hidratar al iniciar sesión (o limpiar al salir).
  useEffect(() => {
    if (!enabled) return
    if (!userId) {
      useStore.getState().removeAccountPrediction()
      lastPushed.current = { pred: '∅', real: '∅' }
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const real = await fetchRealResults()
        if (cancelled) return
        if (real) useStore.getState().hydrateReal(real)
        const pred = await fetchMyPrediction(userId)
        if (cancelled) return
        useStore.getState().hydratePrediction(pred ?? {}, displayName)
        // Marcamos lo hidratado como "ya empujado" para no reescribirlo enseguida.
        lastPushed.current = {
          pred: JSON.stringify(pred ?? {}),
          real: JSON.stringify(real ?? {}),
        }
        // Aseguramos una fila de score con el nombre y el % actual.
        await pushScore(userId, displayName)
      } catch (e) {
        console.error('[sync] hidratación', e)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [enabled, userId, displayName])

  // Empujar cambios con debounce.
  useEffect(() => {
    if (!enabled || !userId) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const unsub = useStore.subscribe((state) => {
      const pred = getScenario(state.scenarios, ACCOUNT_PRED_ID)
      const real = getScenario(state.scenarios, REAL_SCENARIO_ID)
      const ps = JSON.stringify(pred?.results ?? null)
      const rs = JSON.stringify(real?.results ?? {})
      if (ps === lastPushed.current.pred && rs === lastPushed.current.real) return
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => pushAll(userId, displayName, lastPushed), DEBOUNCE_MS)
    })
    return () => {
      unsub()
      if (timer) clearTimeout(timer)
    }
  }, [enabled, userId, displayName])
}

async function pushAll(
  userId: string,
  displayName: string,
  lastPushed: { current: { pred: string; real: string } },
): Promise<void> {
  const st = useStore.getState()
  const pred = getScenario(st.scenarios, ACCOUNT_PRED_ID)
  const real = getScenario(st.scenarios, REAL_SCENARIO_ID)
  const realResults = real?.results ?? {}
  const ps = JSON.stringify(pred?.results ?? null)
  const rs = JSON.stringify(realResults)
  try {
    if (pred && ps !== lastPushed.current.pred) await saveMyPrediction(userId, pred.results)
    if (rs !== lastPushed.current.real) await saveRealResults(realResults)
    lastPushed.current = { pred: ps, real: rs }
    await pushScore(userId, displayName)
  } catch (e) {
    console.error('[sync] push', e)
  }
}

async function pushScore(userId: string, displayName: string): Promise<void> {
  const st = useStore.getState()
  const pred = getScenario(st.scenarios, ACCOUNT_PRED_ID)
  const real = getScenario(st.scenarios, REAL_SCENARIO_ID)
  const report = computeAccuracy(pred?.results ?? {}, real?.results ?? {})
  await upsertScore(userId, displayName, Number(report.overall.toFixed(2)), report.factors)
}
