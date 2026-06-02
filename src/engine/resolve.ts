import type { MatchResult } from '../types'
import { GROUPS } from '../data/teams'
import { MATCHES } from '../data/schedule'
import {
  computeAllStandings,
  allGroupsComplete,
  sortStanding,
  type StandingRow,
} from './standings'

export interface ResolvedMatch {
  home?: string // team id, undefined si todavía no se conoce
  away?: string
  winner?: string
  loser?: string
  decided: boolean
}

export interface Resolution {
  standings: Record<string, StandingRow[]>
  /** Mejores terceros ordenados (los primeros 8 clasifican), o null si aún no se sabe. */
  bestThirds: string[] | null
  /** Equipo resuelto por puesto, ej. resolved['1A'] = 'MEX'. */
  slots: Record<string, string>
  /** Estado resuelto de cada partido. */
  matches: Record<number, ResolvedMatch>
}

function computeBestThirds(
  standings: Record<string, StandingRow[]>,
): { teamId: string; group: string }[] {
  const thirds = GROUPS.map((g) => ({ row: standings[g][2], group: g })).filter(
    (x) => x.row,
  )
  thirds.sort((a, b) => sortStanding(a.row, b.row))
  return thirds.map((x) => ({ teamId: x.row.teamId, group: x.group }))
}

/**
 * Resuelve tablas, clasificados y el cuadro de eliminación para un conjunto de
 * resultados (ya "efectivos", es decir con la herencia de what-if aplicada).
 */
export function resolve(results: Record<number, MatchResult>): Resolution {
  const standings = computeAllStandings(results)

  // Puestos de grupo (1° y 2°) PROVISORIOS según la tabla actual.
  // Se ubica al líder/escolta apenas tienen ≥1 partido jugado; si el equipo de
  // esa posición no jugó nada todavía, se deja el puesto sin asignar (por definir).
  const slots: Record<string, string> = {}
  for (const g of GROUPS) {
    const table = standings[g]
    if (table[0] && table[0].played > 0) slots[`1${g}`] = table[0].teamId
    if (table[1] && table[1].played > 0) slots[`2${g}`] = table[1].teamId
  }

  // Mejores terceros: se ubican recién cuando TODOS los grupos terminaron
  // (compararlos antes sería engañoso porque dependen de los 12 grupos).
  let bestThirds: string[] | null = null
  if (allGroupsComplete(results)) {
    const ranked = computeBestThirds(standings)
    bestThirds = ranked.map((x) => x.teamId)
    ranked.slice(0, 8).forEach((x, i) => {
      slots[`3RD-${i + 1}`] = x.teamId
    })
  }

  const matches: Record<number, ResolvedMatch> = {}

  const resolveRef = (ref: string): string | undefined => {
    // Puesto de grupo (1A/2B) o mejor tercero (3RD-n) ya resuelto.
    if (ref in slots) return slots[ref]
    // Ganador / perdedor de un partido previo.
    if (/^W\d+$/.test(ref)) return matches[Number(ref.slice(1))]?.winner
    if (/^L\d+$/.test(ref)) return matches[Number(ref.slice(1))]?.loser
    // Puesto/tercero todavía sin resolver -> desconocido.
    if (/^[12][A-L]$/.test(ref) || ref.startsWith('3RD-')) return undefined
    // En cualquier otro caso es un id de equipo concreto.
    return ref
  }

  // Iteramos hasta punto fijo (las llaves dependen de partidos previos).
  for (let pass = 0; pass < MATCHES.length + 2; pass++) {
    let changed = false
    for (const m of MATCHES) {
      const prev = matches[m.id]
      const home = resolveRef(m.home)
      const away = resolveRef(m.away)
      const res = results[m.id]

      let winner: string | undefined
      let loser: string | undefined
      let decided = false
      if (res?.played && home && away) {
        if (res.homeScore > res.awayScore) {
          winner = home
          loser = away
        } else if (res.homeScore < res.awayScore) {
          winner = away
          loser = home
        } else if (res.homePens != null && res.awayPens != null && res.homePens !== res.awayPens) {
          winner = res.homePens > res.awayPens ? home : away
          loser = res.homePens > res.awayPens ? away : home
        }
        decided = winner != null
      }

      const next: ResolvedMatch = { home, away, winner, loser, decided }
      if (
        !prev ||
        prev.home !== home ||
        prev.away !== away ||
        prev.winner !== winner ||
        prev.loser !== loser
      ) {
        changed = true
      }
      matches[m.id] = next
    }
    if (!changed) break
  }

  return { standings, bestThirds, slots, matches }
}
