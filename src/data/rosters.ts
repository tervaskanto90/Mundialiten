import type { Player, Roster } from '../types'
import { TEAMS } from './teams'

// ─────────────────────────────────────────────────────────────────────────────
// PLANTILLAS (titulares y suplentes)
//
// Como las convocatorias reales todavía no se conocen, se generan plantillas
// genéricas y EDITABLES (11 titulares + 12 suplentes por equipo). Para cargar
// nombres reales de un equipo, agregá una entrada en ROSTER_OVERRIDES con el id
// del equipo. Lo que no esté en overrides usa la plantilla genérica.
// ─────────────────────────────────────────────────────────────────────────────

type Pos = NonNullable<Player['position']>

// Distribución de posiciones por dorsal (1..23): 1-2 arqueros, defensa, medio, ataque.
const POSITION_BY_NUMBER: Pos[] = [
  'POR', // 1
  'DEF', 'DEF', 'DEF', 'DEF', // 2-5
  'MED', 'MED', 'MED', 'MED', // 6-9
  'DEL', 'DEL', // 10-11
  'POR', // 12 (arquero suplente)
  'DEF', 'DEF', 'DEF', // 13-15
  'MED', 'MED', 'MED', // 16-18
  'DEL', 'DEL', 'DEL', 'DEL', 'DEL', // 19-23
]

const POS_LABEL: Record<Pos, string> = {
  POR: 'Arquero',
  DEF: 'Defensor',
  MED: 'Mediocampista',
  DEL: 'Delantero',
}

function buildGenericRoster(teamId: string): Roster {
  const players: Player[] = POSITION_BY_NUMBER.map((position, i) => {
    const number = i + 1
    return {
      id: `${teamId}-${number}`,
      number,
      position,
      name: `${POS_LABEL[position]} ${number}`,
    }
  })
  return {
    starters: players.slice(0, 11),
    subs: players.slice(11),
  }
}

// Cargá acá las convocatorias reales que quieras, por id de equipo.
// Ej: ARG: { starters: [{ id:'ARG-1', name:'Dibu Martínez', number:23, position:'POR' }, ...], subs:[...] }
export const ROSTER_OVERRIDES: Record<string, Roster> = {}

const GENERATED: Record<string, Roster> = Object.fromEntries(
  TEAMS.map((t) => [t.id, buildGenericRoster(t.id)]),
)

export function getRoster(teamId: string | undefined): Roster | null {
  if (!teamId) return null
  return ROSTER_OVERRIDES[teamId] ?? GENERATED[teamId] ?? null
}
