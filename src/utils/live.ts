import { MATCHES, MATCH_BY_ID } from '../data/schedule'
import type { MatchResult } from '../types'

// Tope de seguridad: si por algún motivo nunca llega el estado FINISHED, no
// dejamos un partido "en vivo" para siempre (un partido + alargue + penales no
// pasa de ~3.5 h).
const MAX_LIVE_MS = 3.5 * 60 * 60_000

/**
 * Partidos que se están jugando AHORA según los resultados reales:
 * tienen marcador cargado (played), todavía NO terminaron (finished != true) y
 * están dentro de la ventana razonable desde su inicio. Ordenados por horario.
 * Puede devolver más de uno (en el Mundial hay partidos en simultáneo).
 */
/**
 * Partidos que se están jugando AHORA. Se basa en el HORARIO del calendario: ya
 * arrancó y todavía no terminó (finished != true), dentro de una ventana
 * razonable. NO exige que haya llegado el marcador, así marcamos "en juego"
 * aunque el proveedor todavía no haya mandado el resultado (suele venir con
 * demora). Ordenados por horario; puede devolver más de uno (simultáneos).
 */
export function liveMatchIds(
  realResults: Record<number, MatchResult>,
  now: number = Date.now(),
): number[] {
  const ids: number[] = []
  for (const m of MATCHES) {
    if (realResults[m.id]?.finished) continue // ya terminó (lo marcó la sync)
    const ko = Date.parse(m.kickoff)
    if (now < ko || now > ko + MAX_LIVE_MS) continue
    ids.push(m.id)
  }
  return ids.sort((a, b) => Date.parse(MATCH_BY_ID[a].kickoff) - Date.parse(MATCH_BY_ID[b].kickoff))
}

/** ¿Este partido puntual se está jugando ahora? (chequeo O(1), por horario). */
export function isMatchLive(
  realResults: Record<number, MatchResult>,
  matchId: number,
  now: number = Date.now(),
): boolean {
  const m = MATCH_BY_ID[matchId]
  if (!m || realResults[matchId]?.finished) return false
  const ko = Date.parse(m.kickoff)
  return now >= ko && now <= ko + MAX_LIVE_MS
}
