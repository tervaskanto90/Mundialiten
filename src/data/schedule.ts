import type { Match, StageId } from '../types'
import { GROUPS, teamsOfGroup } from './teams'
import { VENUES } from './venues'

// ─────────────────────────────────────────────────────────────────────────────
// CALENDARIO (104 partidos)
//
// La fase de grupos se genera automáticamente (round-robin de 4 equipos por
// grupo = 6 partidos) y se reparten fechas/sedes/horarios de forma ordenada
// dentro de la ventana real del Mundial 2026 (11–27 de junio).
// Las eliminatorias usan las fechas reales y un cuadro estructuralmente válido.
//
// Todo es EDITABLE: para ajustar un partido a tu calendario, cambiá su entrada
// en GROUP_MATCH_OVERRIDES (fecha/hora/sede) o editá KNOCKOUT abajo.
// ─────────────────────────────────────────────────────────────────────────────

const KICKOFF_TIMES = ['13:00', '16:00', '19:00', '22:00']

// Orden de enfrentamientos dentro de un grupo de 4 equipos (índices 0..3).
const ROUND_ROBIN: Array<[number, number]> = [
  [0, 1],
  [2, 3], // Fecha 1
  [0, 2],
  [3, 1], // Fecha 2
  [3, 0],
  [1, 2], // Fecha 3
]

function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function buildGroupStage(): Match[] {
  const matches: Match[] = []
  let matchId = 1
  let dayOffset = 0
  let slotInDay = 0
  const START = '2026-06-11'

  // Recorremos las 3 fechas; en cada fecha, todos los grupos juegan su par.
  for (let round = 0; round < 3; round++) {
    for (let g = 0; g < GROUPS.length; g++) {
      const group = GROUPS[g]
      const teams = teamsOfGroup(group)
      // Cada fecha aporta 2 partidos del round-robin.
      for (let m = 0; m < 2; m++) {
        const [hi, ai] = ROUND_ROBIN[round * 2 + m]
        const home = teams[hi]?.id ?? `${group}${hi}`
        const away = teams[ai]?.id ?? `${group}${ai}`

        const date = addDays(START, dayOffset)
        const time = KICKOFF_TIMES[slotInDay % KICKOFF_TIMES.length]
        const venue = VENUES[(matchId - 1) % VENUES.length]

        matches.push({
          id: matchId,
          stage: 'group',
          group,
          date,
          time,
          venueId: venue.id,
          home,
          away,
        })

        matchId++
        slotInDay++
        // ~6 partidos por día (para que los grupos terminen antes de los dieciseisavos).
        if (slotInDay % 6 === 0) {
          dayOffset++
        }
      }
    }
    // Separar las fechas dejando avanzar el calendario.
    if (slotInDay % 6 !== 0) {
      dayOffset++
      slotInDay = 0
    }
  }

  return matches
}

interface KnockoutDef {
  id: number
  stage: StageId
  date: string
  time: string
  venueId: string
  home: string
  away: string
}

// Cuadro de eliminación. Las referencias se resuelven en runtime:
//  1A=1° grupo A, 2B=2° grupo B, 3RD-n=enésimo mejor tercero, Wnn/Lnn=ganador/perdedor.
// Estructuralmente válido (cada puesto aparece una vez). Editable si querés
// replicar exactamente el sembrado oficial.
const KNOCKOUT: KnockoutDef[] = [
  // ── Dieciseisavos de final (Round of 32): 28/06 – 03/07 ──
  { id: 73, stage: 'r32', date: '2026-06-28', time: '17:00', venueId: 'la', home: '1A', away: '3RD-1' },
  { id: 74, stage: 'r32', date: '2026-06-28', time: '13:00', venueId: 'hou', home: '1B', away: '2C' },
  { id: 75, stage: 'r32', date: '2026-06-29', time: '17:00', venueId: 'mty', home: '1C', away: '2A' },
  { id: 76, stage: 'r32', date: '2026-06-29', time: '21:00', venueId: 'cdmx', home: '1D', away: '3RD-2' },
  { id: 77, stage: 'r32', date: '2026-06-30', time: '17:00', venueId: 'dal', home: '1E', away: '2D' },
  { id: 78, stage: 'r32', date: '2026-06-30', time: '21:00', venueId: 'kc', home: '1F', away: '2E' },
  { id: 79, stage: 'r32', date: '2026-07-01', time: '17:00', venueId: 'phi', home: '1G', away: '3RD-3' },
  { id: 80, stage: 'r32', date: '2026-07-01', time: '21:00', venueId: 'sf', home: '1H', away: '2F' },
  { id: 81, stage: 'r32', date: '2026-07-02', time: '17:00', venueId: 'sea', home: '1I', away: '3RD-4' },
  { id: 82, stage: 'r32', date: '2026-07-02', time: '21:00', venueId: 'atl', home: '1J', away: '2G' },
  { id: 83, stage: 'r32', date: '2026-07-03', time: '17:00', venueId: 'mia', home: '1K', away: '2H' },
  { id: 84, stage: 'r32', date: '2026-07-03', time: '21:00', venueId: 'nyc', home: '1L', away: '3RD-5' },
  { id: 85, stage: 'r32', date: '2026-06-28', time: '21:00', venueId: 'tor', home: '2B', away: '3RD-6' },
  { id: 86, stage: 'r32', date: '2026-06-29', time: '13:00', venueId: 'van', home: '2I', away: '2L' },
  { id: 87, stage: 'r32', date: '2026-07-01', time: '13:00', venueId: 'bos', home: '2J', away: '3RD-7' },
  { id: 88, stage: 'r32', date: '2026-07-02', time: '13:00', venueId: 'gdl', home: '2K', away: '3RD-8' },

  // ── Octavos de final (Round of 16): 04/07 – 07/07 ──
  { id: 89, stage: 'r16', date: '2026-07-04', time: '17:00', venueId: 'phi', home: 'W73', away: 'W74' },
  { id: 90, stage: 'r16', date: '2026-07-04', time: '21:00', venueId: 'hou', home: 'W75', away: 'W76' },
  { id: 91, stage: 'r16', date: '2026-07-05', time: '17:00', venueId: 'la', home: 'W77', away: 'W78' },
  { id: 92, stage: 'r16', date: '2026-07-05', time: '21:00', venueId: 'cdmx', home: 'W79', away: 'W80' },
  { id: 93, stage: 'r16', date: '2026-07-06', time: '17:00', venueId: 'sea', home: 'W81', away: 'W82' },
  { id: 94, stage: 'r16', date: '2026-07-06', time: '21:00', venueId: 'atl', home: 'W83', away: 'W84' },
  { id: 95, stage: 'r16', date: '2026-07-07', time: '17:00', venueId: 'dal', home: 'W85', away: 'W86' },
  { id: 96, stage: 'r16', date: '2026-07-07', time: '21:00', venueId: 'mia', home: 'W87', away: 'W88' },

  // ── Cuartos de final: 09/07 – 11/07 ──
  { id: 97, stage: 'qf', date: '2026-07-09', time: '17:00', venueId: 'bos', home: 'W89', away: 'W90' },
  { id: 98, stage: 'qf', date: '2026-07-10', time: '17:00', venueId: 'la', home: 'W91', away: 'W92' },
  { id: 99, stage: 'qf', date: '2026-07-10', time: '21:00', venueId: 'kc', home: 'W93', away: 'W94' },
  { id: 100, stage: 'qf', date: '2026-07-11', time: '17:00', venueId: 'mia', home: 'W95', away: 'W96' },

  // ── Semifinales: 14/07 – 15/07 ──
  { id: 101, stage: 'sf', date: '2026-07-14', time: '20:00', venueId: 'dal', home: 'W97', away: 'W98' },
  { id: 102, stage: 'sf', date: '2026-07-15', time: '20:00', venueId: 'atl', home: 'W99', away: 'W100' },

  // ── Tercer puesto: 18/07 ──
  { id: 103, stage: 'third', date: '2026-07-18', time: '16:00', venueId: 'mia', home: 'L101', away: 'L102' },

  // ── Final: 19/07 ──
  { id: 104, stage: 'final', date: '2026-07-19', time: '16:00', venueId: 'nyc', home: 'W101', away: 'W102' },
]

export const MATCHES: Match[] = [
  ...buildGroupStage(),
  ...KNOCKOUT.map((k) => ({ ...k })),
]

export const MATCH_BY_ID: Record<number, Match> = Object.fromEntries(
  MATCHES.map((m) => [m.id, m]),
)

export const STAGE_LABELS: Record<StageId, string> = {
  group: 'Fase de grupos',
  r32: 'Dieciseisavos',
  r16: 'Octavos',
  qf: 'Cuartos',
  sf: 'Semifinal',
  third: 'Tercer puesto',
  final: 'Final',
}

export const STAGE_ORDER: StageId[] = ['group', 'r32', 'r16', 'qf', 'sf', 'third', 'final']
