// Cálculo del cambio de puesto en el ranking por efecto del ÚLTIMO partido.
// No hace falta historial: el ranking "de antes" se deriva restando a cada uno
// los puntos que le dio el último partido (last_points) y reordenando.

export interface RankDeltaRow {
  user_id: string
  points: number
  last_points: number
}

/** Puesto (competición estándar: 1 + cuántos tienen MÁS puntos). */
function rankByPoints(arr: Array<{ id: string; p: number }>): Map<string, number> {
  const m = new Map<string, number>()
  for (const x of arr) m.set(x.id, 1 + arr.filter((y) => y.p > x.p).length)
  return m
}

/**
 * Devuelve, por usuario, cuántos puestos subió (positivo) o bajó (negativo) por
 * efecto del último partido. 0 = se mantuvo.
 */
export function rankDeltas(rows: RankDeltaRow[]): Map<string, number> {
  const now = rankByPoints(rows.map((r) => ({ id: r.user_id, p: r.points })))
  const before = rankByPoints(rows.map((r) => ({ id: r.user_id, p: r.points - (r.last_points || 0) })))
  const out = new Map<string, number>()
  for (const r of rows) out.set(r.user_id, (before.get(r.user_id) ?? 0) - (now.get(r.user_id) ?? 0))
  return out
}

/**
 * Agrupa filas (YA ordenadas por el mismo criterio del ranking) por PUESTO: las
 * que comparten la MISMA clave quedan en el mismo grupo. `rank` = posición del
 * primero del grupo (1, 2, 2, 4… competición estándar).
 *
 * La clave puede ser compuesta (string): dos usuarios comparten puesto sólo si
 * empatan en TODOS los criterios de desempate (puntos → exactos → resultados).
 */
export function tieGroups<T>(rows: T[], key: (r: T) => number | string): { rank: number; members: T[] }[] {
  const out: { rank: number; members: T[] }[] = []
  let i = 0
  while (i < rows.length) {
    const k = key(rows[i])
    const rank = i + 1
    const members: T[] = []
    while (i < rows.length && key(rows[i]) === k) {
      members.push(rows[i])
      i++
    }
    out.push({ rank, members })
  }
  return out
}
