import type { Match, MatchResult } from '../types'
import { TEAM_BY_ID, teamsOfGroup, GROUPS } from '../data/teams'
import { MATCHES } from '../data/schedule'

export interface StandingRow {
  teamId: string
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
  gd: number
  points: number
  yellow: number
  red: number
}

function emptyRow(teamId: string): StandingRow {
  return {
    teamId,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    gf: 0,
    ga: 0,
    gd: 0,
    points: 0,
    yellow: 0,
    red: 0,
  }
}

const GROUP_MATCHES: Match[] = MATCHES.filter((m) => m.stage === 'group')

/** Cantidad de partidos de grupo jugados en un grupo (para saber si terminó). */
export function groupComplete(group: string, results: Record<number, MatchResult>): boolean {
  const ms = GROUP_MATCHES.filter((m) => m.group === group)
  return ms.length > 0 && ms.every((m) => results[m.id]?.played)
}

export function allGroupsComplete(results: Record<number, MatchResult>): boolean {
  return GROUPS.every((g) => groupComplete(g, results))
}

function countCards(res: MatchResult, side: 'home' | 'away') {
  let yellow = 0
  let red = 0
  for (const ev of res.events) {
    if (ev.team !== side) continue
    if (ev.type === 'yellow') yellow++
    if (ev.type === 'red') red++
  }
  return { yellow, red }
}

export function sortStanding(a: StandingRow, b: StandingRow): number {
  if (b.points !== a.points) return b.points - a.points
  if (b.gd !== a.gd) return b.gd - a.gd
  if (b.gf !== a.gf) return b.gf - a.gf
  // Fair play: menos rojas, luego menos amarillas
  const aDisc = a.red * 3 + a.yellow
  const bDisc = b.red * 3 + b.yellow
  if (aDisc !== bDisc) return aDisc - bDisc
  return (TEAM_BY_ID[a.teamId]?.name ?? a.teamId).localeCompare(
    TEAM_BY_ID[b.teamId]?.name ?? b.teamId,
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Orden oficial FIFA 2026: entre equipos IGUALADOS EN PUNTOS, primero el
// enfrentamiento directo (head-to-head): pts → DG → goles SÓLO de los partidos
// entre ellos. Recién si siguen empatados, criterios generales (DG total, goles
// totales, fair play, alfabético) vía sortStanding.
// ─────────────────────────────────────────────────────────────────────────────
function orderTied(
  tied: StandingRow[],
  group: string,
  results: Record<number, MatchResult>,
): StandingRow[] {
  const ids = new Set(tied.map((r) => r.teamId))
  const h2h: Record<string, { pts: number; gd: number; gf: number }> = {}
  for (const r of tied) h2h[r.teamId] = { pts: 0, gd: 0, gf: 0 }
  for (const m of GROUP_MATCHES) {
    if (m.group !== group || !ids.has(m.home) || !ids.has(m.away)) continue
    const res = results[m.id]
    if (!res?.played) continue
    const hh = h2h[m.home]
    const ah = h2h[m.away]
    hh.gf += res.homeScore
    hh.gd += res.homeScore - res.awayScore
    ah.gf += res.awayScore
    ah.gd += res.awayScore - res.homeScore
    if (res.homeScore > res.awayScore) hh.pts += 3
    else if (res.homeScore < res.awayScore) ah.pts += 3
    else {
      hh.pts += 1
      ah.pts += 1
    }
  }
  return [...tied].sort((a, b) => {
    const A = h2h[a.teamId]
    const B = h2h[b.teamId]
    if (B.pts !== A.pts) return B.pts - A.pts
    if (B.gd !== A.gd) return B.gd - A.gd
    if (B.gf !== A.gf) return B.gf - A.gf
    return sortStanding(a, b) // criterios generales (DG total, goles, fair play, nombre)
  })
}

/** Ordena un grupo aplicando el desempate oficial (head-to-head entre empatados). */
export function orderGroup(
  rows: StandingRow[],
  group: string,
  results: Record<number, MatchResult>,
): StandingRow[] {
  const byPoints = [...rows].sort((a, b) => b.points - a.points)
  const out: StandingRow[] = []
  let i = 0
  while (i < byPoints.length) {
    const pts = byPoints[i].points
    const tied: StandingRow[] = []
    while (i < byPoints.length && byPoints[i].points === pts) {
      tied.push(byPoints[i])
      i++
    }
    if (tied.length === 1) out.push(tied[0])
    else out.push(...orderTied(tied, group, results))
  }
  return out
}

/**
 * Equipos de un grupo SIN chances de entrar al top 3 — SÓLIDO (nunca marca de
 * más). Un equipo está eliminado si al menos 3 rivales quedan arriba SÍ o SÍ:
 *   - el rival tiene más puntos que el MÁXIMO del equipo (gane todo lo que le
 *     queda), o
 *   - empatan en ese máximo PERO el rival ya le ganó el HEAD-TO-HEAD (partido
 *     jugado, no se puede revertir; la diferencia de gol no cuenta porque es un
 *     criterio posterior). Captura el caso Turquía.
 * Si hay un empate cuyo desempate depende de la DG futura, NO se marca (el equipo
 * podría ganarlo).
 */
export function eliminatedFromTop3(
  group: string,
  results: Record<number, MatchResult>,
): Set<string> {
  const teamIds = teamsOfGroup(group).map((t) => t.id)
  const pts: Record<string, number> = {}
  const played: Record<string, number> = {}
  const beat: Record<string, Set<string>> = {} // beat[a] = equipos a los que 'a' le ganó
  for (const id of teamIds) {
    pts[id] = 0
    played[id] = 0
    beat[id] = new Set()
  }
  for (const m of GROUP_MATCHES) {
    if (m.group !== group) continue
    const res = results[m.id]
    if (!res?.played) continue
    played[m.home]++
    played[m.away]++
    if (res.homeScore > res.awayScore) {
      pts[m.home] += 3
      beat[m.home].add(m.away)
    } else if (res.homeScore < res.awayScore) {
      pts[m.away] += 3
      beat[m.away].add(m.home)
    } else {
      pts[m.home] += 1
      pts[m.away] += 1
    }
  }
  const out = new Set<string>()
  for (const t of teamIds) {
    const maxT = pts[t] + 3 * (3 - played[t]) // gana todo lo que le queda
    let guaranteedAbove = 0
    for (const x of teamIds) {
      if (x === t) continue
      const minX = pts[x] // pierde todo lo que le queda
      if (minX > maxT || (minX === maxT && beat[x].has(t))) guaranteedAbove++
    }
    if (guaranteedAbove >= 3) out.add(t)
  }
  return out
}

/** Tabla de un grupo, ordenada. */
export function computeGroupStanding(
  group: string,
  results: Record<number, MatchResult>,
): StandingRow[] {
  const rows: Record<string, StandingRow> = {}
  for (const t of teamsOfGroup(group)) rows[t.id] = emptyRow(t.id)

  for (const m of GROUP_MATCHES) {
    if (m.group !== group) continue
    const res = results[m.id]
    if (!res?.played) continue
    const home = rows[m.home]
    const away = rows[m.away]
    if (!home || !away) continue

    home.played++
    away.played++
    home.gf += res.homeScore
    home.ga += res.awayScore
    away.gf += res.awayScore
    away.ga += res.homeScore

    const hc = countCards(res, 'home')
    const ac = countCards(res, 'away')
    home.yellow += hc.yellow
    home.red += hc.red
    away.yellow += ac.yellow
    away.red += ac.red

    if (res.homeScore > res.awayScore) {
      home.won++
      home.points += 3
      away.lost++
    } else if (res.homeScore < res.awayScore) {
      away.won++
      away.points += 3
      home.lost++
    } else {
      home.drawn++
      away.drawn++
      home.points++
      away.points++
    }
  }

  for (const r of Object.values(rows)) r.gd = r.gf - r.ga
  return orderGroup(Object.values(rows), group, results)
}

export function computeAllStandings(
  results: Record<number, MatchResult>,
): Record<string, StandingRow[]> {
  const out: Record<string, StandingRow[]> = {}
  for (const g of GROUPS) out[g] = computeGroupStanding(g, results)
  return out
}
