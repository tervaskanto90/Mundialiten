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
  return Object.values(rows).sort(sortStanding)
}

export function computeAllStandings(
  results: Record<number, MatchResult>,
): Record<string, StandingRow[]> {
  const out: Record<string, StandingRow[]> = {}
  for (const g of GROUPS) out[g] = computeGroupStanding(g, results)
  return out
}
