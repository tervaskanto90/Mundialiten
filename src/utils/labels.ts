import { TEAM_BY_ID } from '../data/teams'
import { VENUE_BY_ID } from '../data/venues'
import type { Resolution } from '../engine/resolve'

export interface SideLabel {
  flag: string
  name: string
  short: string
  resolved: boolean
}

const PLACEHOLDER_FLAG = '⚪'

/** Texto humano para una referencia de puesto no resuelta. */
function placeholderName(ref: string): string {
  const groupPos = /^([12])([A-L])$/.exec(ref)
  if (groupPos) {
    const pos = groupPos[1] === '1' ? '1°' : '2°'
    return `${pos} Grupo ${groupPos[2]}`
  }
  const third = /^3RD-(\d+)$/.exec(ref)
  if (third) return `Mejor 3° (${third[1]})`
  const w = /^W(\d+)$/.exec(ref)
  if (w) return `Ganador P${w[1]}`
  const l = /^L(\d+)$/.exec(ref)
  if (l) return `Perdedor P${l[1]}`
  return ref
}

/**
 * Devuelve cómo mostrar un lado de un partido.
 * Si la resolución ya conoce el equipo, muestra bandera+nombre; si no, el puesto.
 */
export function sideLabel(
  ref: string,
  resolvedTeamId: string | undefined,
  ): SideLabel {
  const teamId = resolvedTeamId ?? (TEAM_BY_ID[ref] ? ref : undefined)
  if (teamId && TEAM_BY_ID[teamId]) {
    const t = TEAM_BY_ID[teamId]
    return { flag: t.flag, name: t.name, short: t.id, resolved: true }
  }
  const name = placeholderName(ref)
  return { flag: PLACEHOLDER_FLAG, name, short: name, resolved: false }
}

export function sideLabelFor(
  matchId: number,
  ref: string,
  side: 'home' | 'away',
  res: Resolution,
): SideLabel {
  const rm = res.matches[matchId]
  const resolvedId = side === 'home' ? rm?.home : rm?.away
  return sideLabel(ref, resolvedId)
}

export function venueName(venueId: string): string {
  return VENUE_BY_ID[venueId]?.name ?? venueId
}

const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

export function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]}`
}

export function formatDateShort(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return `${d.getDate()}/${String(d.getMonth() + 1).padStart(2, '0')}`
}
