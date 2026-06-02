import type { Match, StageId } from '../types'
import { TEAM_BY_ID } from './teams'

// ─────────────────────────────────────────────────────────────────────────────
// CALENDARIO OFICIAL — Mundial 2026 (104 partidos)
//
// Datos oficiales (sorteo del 5/12/2025 + match schedule de la FIFA).
// Cada partido se guarda con su horario OFICIAL en hora local de la sede, y se
// convierte a un instante UTC (`kickoff`). La app muestra la hora en la zona
// horaria de tu dispositivo y usa ese instante para el cierre de predicciones.
//
// Fuente del fixture: openfootball (github.com/openfootball/worldcup).
// ─────────────────────────────────────────────────────────────────────────────

// Offset horario de cada sede en junio/julio 2026 (horas a SUMAR a la hora local
// para obtener UTC). México no aplica horario de verano (UTC−6).
const VENUE_UTC_OFFSET: Record<string, number> = {
  cdmx: 6, gdl: 6, mty: 6, // México (UTC−6)
  tor: 4, nyc: 4, bos: 4, phi: 4, atl: 4, mia: 4, // Este (UTC−4)
  kc: 5, dal: 5, hou: 5, // Central (UTC−5)
  van: 7, la: 7, sf: 7, sea: 7, // Pacífico (UTC−7)
}

function toUTC(date: string, time: string, venueId: string): string {
  const off = VENUE_UTC_OFFSET[venueId] ?? 0
  const [y, m, d] = date.split('-').map(Number)
  const [h, min] = time.split(':').map(Number)
  return new Date(Date.UTC(y, m - 1, d, h + off, min)).toISOString()
}

// Fase de grupos: [nº, fecha local, hora local, sede, local, visitante]
const GROUP_ROWS: Array<[number, string, string, string, string, string]> = [
  [1, '2026-06-11', '13:00', 'cdmx', 'MEX', 'RSA'],
  [2, '2026-06-11', '20:00', 'gdl', 'COR', 'CZE'],
  [3, '2026-06-12', '15:00', 'tor', 'CAN', 'BOS'],
  [4, '2026-06-12', '18:00', 'la', 'USA', 'PAR'],
  [5, '2026-06-13', '12:00', 'sf', 'QAT', 'SUI'],
  [6, '2026-06-13', '18:00', 'nyc', 'BRA', 'MAR'],
  [7, '2026-06-13', '21:00', 'bos', 'HAI', 'ESC'],
  [8, '2026-06-13', '21:00', 'van', 'AUS', 'TUR'],
  [9, '2026-06-14', '12:00', 'hou', 'ALE', 'CUR'],
  [10, '2026-06-14', '15:00', 'dal', 'PBA', 'JAP'],
  [11, '2026-06-14', '19:00', 'phi', 'CDM', 'ECU'],
  [12, '2026-06-14', '20:00', 'mty', 'SWE', 'TUN'],
  [13, '2026-06-15', '12:00', 'sea', 'BEL', 'EGI'],
  [14, '2026-06-15', '12:00', 'atl', 'ESP', 'CAB'],
  [15, '2026-06-15', '18:00', 'la', 'IRA', 'NZL'],
  [16, '2026-06-15', '18:00', 'mia', 'ARA', 'URU'],
  [17, '2026-06-16', '15:00', 'nyc', 'FRA', 'SEN'],
  [18, '2026-06-16', '18:00', 'bos', 'IRK', 'NOR'],
  [19, '2026-06-16', '20:00', 'kc', 'ARG', 'ALG'],
  [20, '2026-06-16', '21:00', 'sf', 'AUT', 'JOR'],
  [21, '2026-06-17', '12:00', 'hou', 'POR', 'COD'],
  [22, '2026-06-17', '15:00', 'dal', 'ING', 'CRO'],
  [23, '2026-06-17', '19:00', 'tor', 'GHA', 'PAN'],
  [24, '2026-06-17', '20:00', 'cdmx', 'UZB', 'COL'],
  [25, '2026-06-18', '12:00', 'atl', 'CZE', 'RSA'],
  [26, '2026-06-18', '12:00', 'la', 'SUI', 'BOS'],
  [27, '2026-06-18', '15:00', 'van', 'CAN', 'QAT'],
  [28, '2026-06-18', '19:00', 'gdl', 'MEX', 'COR'],
  [29, '2026-06-19', '12:00', 'sea', 'USA', 'AUS'],
  [30, '2026-06-19', '18:00', 'bos', 'ESC', 'MAR'],
  [31, '2026-06-19', '20:00', 'sf', 'TUR', 'PAR'],
  [32, '2026-06-19', '20:30', 'phi', 'BRA', 'HAI'],
  [33, '2026-06-20', '12:00', 'hou', 'PBA', 'SWE'],
  [34, '2026-06-20', '16:00', 'tor', 'ALE', 'CDM'],
  [35, '2026-06-20', '19:00', 'kc', 'ECU', 'CUR'],
  [36, '2026-06-20', '22:00', 'mty', 'TUN', 'JAP'],
  [37, '2026-06-21', '12:00', 'la', 'BEL', 'IRA'],
  [38, '2026-06-21', '12:00', 'atl', 'ESP', 'ARA'],
  [39, '2026-06-21', '18:00', 'van', 'NZL', 'EGI'],
  [40, '2026-06-21', '18:00', 'mia', 'URU', 'CAB'],
  [41, '2026-06-22', '12:00', 'dal', 'ARG', 'AUT'],
  [42, '2026-06-22', '17:00', 'phi', 'FRA', 'IRK'],
  [43, '2026-06-22', '20:00', 'nyc', 'NOR', 'SEN'],
  [44, '2026-06-22', '20:00', 'sf', 'JOR', 'ALG'],
  [45, '2026-06-23', '12:00', 'hou', 'POR', 'UZB'],
  [46, '2026-06-23', '16:00', 'bos', 'ING', 'GHA'],
  [47, '2026-06-23', '19:00', 'tor', 'PAN', 'CRO'],
  [48, '2026-06-23', '20:00', 'gdl', 'COL', 'COD'],
  [49, '2026-06-24', '18:00', 'mia', 'ESC', 'BRA'],
  [50, '2026-06-24', '18:00', 'atl', 'MAR', 'HAI'],
  [51, '2026-06-24', '19:00', 'cdmx', 'CZE', 'MEX'],
  [52, '2026-06-24', '19:00', 'mty', 'RSA', 'COR'],
  [53, '2026-06-24', '12:00', 'van', 'SUI', 'CAN'],
  [54, '2026-06-24', '12:00', 'sea', 'BOS', 'QAT'],
  [55, '2026-06-25', '16:00', 'phi', 'CUR', 'CDM'],
  [56, '2026-06-25', '16:00', 'nyc', 'ECU', 'ALE'],
  [57, '2026-06-25', '18:00', 'dal', 'JAP', 'SWE'],
  [58, '2026-06-25', '18:00', 'kc', 'TUN', 'PBA'],
  [59, '2026-06-25', '19:00', 'la', 'TUR', 'USA'],
  [60, '2026-06-25', '19:00', 'sf', 'PAR', 'AUS'],
  [61, '2026-06-26', '15:00', 'bos', 'NOR', 'FRA'],
  [62, '2026-06-26', '15:00', 'tor', 'SEN', 'IRK'],
  [63, '2026-06-26', '19:00', 'hou', 'CAB', 'ARA'],
  [64, '2026-06-26', '18:00', 'gdl', 'URU', 'ESP'],
  [65, '2026-06-26', '20:00', 'sea', 'EGI', 'IRA'],
  [66, '2026-06-26', '20:00', 'van', 'NZL', 'BEL'],
  [67, '2026-06-27', '19:30', 'mia', 'COL', 'POR'],
  [68, '2026-06-27', '19:30', 'atl', 'COD', 'UZB'],
  [69, '2026-06-27', '17:00', 'nyc', 'PAN', 'ING'],
  [70, '2026-06-27', '17:00', 'phi', 'CRO', 'GHA'],
  [71, '2026-06-27', '21:00', 'kc', 'ALG', 'AUT'],
  [72, '2026-06-27', '21:00', 'dal', 'JOR', 'ARG'],
]

// Eliminatorias: [nº, fase, fecha local, hora local, sede, local, visitante]
// Los terceros usan la notación oficial por combinación de grupos: '3ABCDF'.
const KO_ROWS: Array<[number, StageId, string, string, string, string, string]> = [
  [73, 'r32', '2026-06-28', '12:00', 'la', '2B', '2A'],
  [74, 'r32', '2026-06-29', '16:30', 'bos', '1E', '3ABCDF'],
  [75, 'r32', '2026-06-29', '19:00', 'mty', '1F', '2C'],
  [76, 'r32', '2026-06-29', '12:00', 'hou', '1C', '2F'],
  [77, 'r32', '2026-06-30', '17:00', 'nyc', '1I', '3CDFGH'],
  [78, 'r32', '2026-06-30', '12:00', 'dal', '2E', '2I'],
  [79, 'r32', '2026-06-30', '19:00', 'cdmx', '1A', '3CEFHI'],
  [80, 'r32', '2026-07-01', '12:00', 'atl', '1L', '3EHIJK'],
  [81, 'r32', '2026-07-01', '17:00', 'sf', '1D', '3BEFIJ'],
  [82, 'r32', '2026-07-01', '13:00', 'sea', '1G', '3AEHIJ'],
  [83, 'r32', '2026-07-02', '19:00', 'tor', '2K', '2L'],
  [84, 'r32', '2026-07-02', '12:00', 'la', '1H', '2J'],
  [85, 'r32', '2026-07-02', '20:00', 'van', '1B', '3EFGIJ'],
  [86, 'r32', '2026-07-03', '18:00', 'mia', '1J', '2H'],
  [87, 'r32', '2026-07-03', '20:30', 'kc', '1K', '3DEIJL'],
  [88, 'r32', '2026-07-03', '13:00', 'dal', '2D', '2G'],
  [89, 'r16', '2026-07-04', '17:00', 'phi', 'W74', 'W77'],
  [90, 'r16', '2026-07-04', '12:00', 'hou', 'W73', 'W75'],
  [91, 'r16', '2026-07-05', '16:00', 'nyc', 'W76', 'W78'],
  [92, 'r16', '2026-07-05', '18:00', 'cdmx', 'W79', 'W80'],
  [93, 'r16', '2026-07-06', '14:00', 'dal', 'W83', 'W84'],
  [94, 'r16', '2026-07-06', '17:00', 'sea', 'W81', 'W82'],
  [95, 'r16', '2026-07-07', '12:00', 'atl', 'W86', 'W88'],
  [96, 'r16', '2026-07-07', '13:00', 'van', 'W85', 'W87'],
  [97, 'qf', '2026-07-09', '16:00', 'bos', 'W89', 'W90'],
  [98, 'qf', '2026-07-10', '12:00', 'la', 'W93', 'W94'],
  [99, 'qf', '2026-07-11', '17:00', 'mia', 'W91', 'W92'],
  [100, 'qf', '2026-07-11', '20:00', 'kc', 'W95', 'W96'],
  [101, 'sf', '2026-07-14', '14:00', 'dal', 'W97', 'W98'],
  [102, 'sf', '2026-07-15', '15:00', 'atl', 'W99', 'W100'],
  [103, 'third', '2026-07-18', '17:00', 'mia', 'L101', 'L102'],
  [104, 'final', '2026-07-19', '15:00', 'nyc', 'W101', 'W102'],
]

const groupMatches: Match[] = GROUP_ROWS.map(([id, date, time, venueId, home, away]) => ({
  id,
  stage: 'group' as StageId,
  group: TEAM_BY_ID[home]?.group,
  venueId,
  home,
  away,
  kickoff: toUTC(date, time, venueId),
}))

const koMatches: Match[] = KO_ROWS.map(([id, stage, date, time, venueId, home, away]) => ({
  id,
  stage,
  venueId,
  home,
  away,
  kickoff: toUTC(date, time, venueId),
}))

export const MATCHES: Match[] = [...groupMatches, ...koMatches]

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
