import { TEAM_BY_ID } from '../data/teams'
import { VENUE_BY_ID } from '../data/venues'
import type { Resolution } from '../engine/resolve'
import type { Match, Team } from '../types'

/** Nombre del equipo en el idioma activo (inglés: usa el alias en inglés). */
export function teamDisplayName(team: Team): string {
  if (labelLang === 'en' && team.aliases && team.aliases.length > 0) return team.aliases[0]
  return team.name
}

export interface SideLabel {
  flag: string
  name: string
  short: string
  resolved: boolean
}

const PLACEHOLDER_FLAG = '⚪'

// Idioma actual para las etiquetas que se generan fuera de componentes React.
let labelLang: 'es' | 'en' = 'es'
export function setLabelLang(l: 'es' | 'en') {
  labelLang = l
}

/** Texto humano para una referencia de puesto no resuelta. */
function placeholderName(ref: string): string {
  const en = labelLang === 'en'
  const groupPos = /^([12])([A-L])$/.exec(ref)
  if (groupPos) {
    const g = groupPos[2]
    if (groupPos[1] === '1') return en ? `1st Group ${g}` : `1° Grupo ${g}`
    return en ? `2nd Group ${g}` : `2° Grupo ${g}`
  }
  const third = /^3([A-L]{2,})$/.exec(ref)
  if (third) {
    const set = third[1].split('').join('/')
    return en ? `3rd Group ${set}` : `3° Grupo ${set}`
  }
  const w = /^W(\d+)$/.exec(ref)
  if (w) return en ? `Winner M${w[1]}` : `Ganador P${w[1]}`
  const l = /^L(\d+)$/.exec(ref)
  if (l) return en ? `Loser M${l[1]}` : `Perdedor P${l[1]}`
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
    return { flag: t.flag, name: teamDisplayName(t), short: t.id, resolved: true }
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

type Lng = 'es' | 'en'
const locale = (lang: Lng) => (lang === 'en' ? 'en-GB' : 'es-ES')

export function formatDate(iso: string, lang: Lng = 'es'): string {
  const d = new Date(iso + 'T00:00:00')
  return new Intl.DateTimeFormat(locale(lang), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(d)
}

export function formatDateShort(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return `${d.getDate()}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

// ── Horarios de partido (en la zona horaria del dispositivo, desde el UTC) ──

const pad = (n: number) => String(n).padStart(2, '0')

/** Clave de fecha local 'YYYY-MM-DD' para agrupar el calendario. */
export function matchDateKey(m: Match): string {
  const d = new Date(m.kickoff)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Hora local 'HH:mm' del partido. */
export function matchTimeLabel(m: Match): string {
  const d = new Date(m.kickoff)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Fecha local larga, ej. 'jueves, 11 de junio' / 'Thursday, 11 June'. */
export function matchDateLabel(m: Match, lang: Lng = 'es'): string {
  return new Intl.DateTimeFormat(locale(lang), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(m.kickoff))
}
