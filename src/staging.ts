// ─────────────────────────────────────────────────────────────────────────────
// MODO STAGING (sandbox de pruebas)
//
// Sólo se activa en el build de la rama `staging` (ver vite.config.ts). Sirve
// para probar el flujo de predicciones de la fase ELIMINATORIA antes de tiempo:
//  - simula TODA la fase de grupos (para que el cuadro se arme con equipos reales)
//  - fuerza la etapa abierta a 16avos (ver utils/stage.ts)
//  - el título muestra "STAGING" (ver App.tsx)
//
// IMPORTANTE: en staging NO se escribe nada a Supabase (ver lib/sync.ts). Todo es
// local al navegador, así main (que comparte la misma base) queda intacto.
// ─────────────────────────────────────────────────────────────────────────────
import type { MatchResult } from './types'
import { MATCHES } from './data/schedule'
import { GROUPS, teamsOfGroup } from './data/teams'

// __STAGING__ lo inyecta Vite. Con typeof evitamos un ReferenceError en entornos
// donde no está definido (p. ej. el runner de tests, que no aplica el define).
export const STAGING: boolean = typeof __STAGING__ !== 'undefined' ? __STAGING__ === true : false

// Resultados simulados de toda la fase de grupos. Cada grupo queda con un orden
// limpio 9/6/3/0: el equipo más fuerte (menor índice dentro del grupo) le gana a
// los más débiles 2-0. Así los grupos quedan completos y resolubles, y el cuadro
// de 16avos se arma con los clasificados reales.
export function simulatedGroupResults(): Record<number, MatchResult> {
  const idx = new Map<string, number>() // teamId → índice dentro de su grupo
  for (const g of GROUPS) teamsOfGroup(g).forEach((tm, i) => idx.set(tm.id, i))

  const out: Record<number, MatchResult> = {}
  for (const m of MATCHES) {
    if (m.stage !== 'group' || !m.home || !m.away) continue
    const homeWins = (idx.get(m.home) ?? 0) < (idx.get(m.away) ?? 0)
    out[m.id] = {
      played: true,
      finished: true,
      homeScore: homeWins ? 2 : 0,
      awayScore: homeWins ? 0 : 2,
      events: [],
    }
  }
  return out
}
