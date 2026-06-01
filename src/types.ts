// Tipos centrales de la aplicación.

export type StageId = 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'third' | 'final'

export interface Team {
  id: string // identificador corto, ej. 'MEX'
  name: string // nombre para mostrar, ej. 'México'
  flag: string // emoji de bandera
  group: string // 'A' .. 'L' (vacío si no aplica)
}

export interface Venue {
  id: string
  name: string // ej. 'Estadio Ciudad de México'
  city: string
  country: 'USA' | 'MEX' | 'CAN'
}

/**
 * Referencia a un participante de un partido.
 * Puede ser:
 *  - el id de un equipo concreto (ej. 'MEX')
 *  - un puesto de grupo: '1A' (1° del grupo A), '2B' (2° del grupo B)
 *  - un mejor tercero: '3RD-1' .. '3RD-8' (ordenados por ranking de terceros)
 *  - el ganador/perdedor de un partido: 'W73' (ganador 73), 'L101' (perdedor 101)
 */
export type SlotRef = string

export interface Match {
  id: number // número de partido 1..104
  stage: StageId
  group?: string // sólo fase de grupos
  date: string // 'YYYY-MM-DD'
  time: string // 'HH:mm'
  venueId: string
  home: SlotRef
  away: SlotRef
}

export type EventType = 'goal' | 'own_goal' | 'penalty' | 'yellow' | 'red' | 'var'

export interface MatchEvent {
  id: string
  type: EventType
  team: 'home' | 'away'
  player?: string
  minute?: number
  note?: string // descripción / resultado del VAR
}

export interface MatchResult {
  played: boolean
  homeScore: number
  awayScore: number
  // Definición por penales en eliminatorias (opcional)
  homePens?: number
  awayPens?: number
  events: MatchEvent[]
}

export type ScenarioType = 'real' | 'prediction' | 'whatif'

export interface Scenario {
  id: string
  name: string
  type: ScenarioType
  color: string
  createdAt: string // ISO
  predictionDate?: string // 'YYYY-MM-DD' para tabs de predicción
  /**
   * Resultados cargados en este escenario, por número de partido.
   * En escenarios 'whatif' sólo se guardan los partidos sobrescritos;
   * el resto hereda automáticamente del escenario real.
   */
  results: Record<number, MatchResult>
}
