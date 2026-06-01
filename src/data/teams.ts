import type { Team } from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// EQUIPOS POR GRUPO
//
// Transcripción de los grupos de tu calendario. Varios eran "placeholders"
// (Repesca Europa / Repesca FIFA, etc.) porque el calendario es previo al sorteo.
// Es totalmente EDITABLE: cambiá nombre, bandera o grupo a gusto. El resto de la
// app trabaja por `id`, así que mantené los id únicos si agregás equipos.
// ─────────────────────────────────────────────────────────────────────────────
export const TEAMS: Team[] = [
  // Grupo A — México, Sudáfrica, Rep. de Corea, Repesca Europa
  { id: 'MEX', name: 'México', flag: '🇲🇽', group: 'A' },
  { id: 'RSA', name: 'Sudáfrica', flag: '🇿🇦', group: 'A' },
  { id: 'COR', name: 'Rep. de Corea', flag: '🇰🇷', group: 'A' },
  { id: 'CZE', name: 'Repesca Europa (A)', flag: '🇪🇺', group: 'A' },

  // Grupo B — Canadá, Qatar, Suiza, Repesca Europa
  { id: 'CAN', name: 'Canadá', flag: '🇨🇦', group: 'B' },
  { id: 'QAT', name: 'Qatar', flag: '🇶🇦', group: 'B' },
  { id: 'SUI', name: 'Suiza', flag: '🇨🇭', group: 'B' },
  { id: 'BOS', name: 'Repesca Europa (B)', flag: '🇪🇺', group: 'B' },

  // Grupo C — Brasil, Marruecos, Escocia, Haití
  { id: 'BRA', name: 'Brasil', flag: '🇧🇷', group: 'C' },
  { id: 'MAR', name: 'Marruecos', flag: '🇲🇦', group: 'C' },
  { id: 'ESC', name: 'Escocia', flag: '🏴', group: 'C' },
  { id: 'HAI', name: 'Haití', flag: '🇭🇹', group: 'C' },

  // Grupo D — EE.UU., Paraguay, Australia, Repesca Europa
  { id: 'USA', name: 'Estados Unidos', flag: '🇺🇸', group: 'D' },
  { id: 'PAR', name: 'Paraguay', flag: '🇵🇾', group: 'D' },
  { id: 'AUS', name: 'Australia', flag: '🇦🇺', group: 'D' },
  { id: 'TUR', name: 'Repesca Europa (D)', flag: '🇪🇺', group: 'D' },

  // Grupo E — Alemania, Ecuador, Costa de Marfil, Curazao
  { id: 'ALE', name: 'Alemania', flag: '🇩🇪', group: 'E' },
  { id: 'ECU', name: 'Ecuador', flag: '🇪🇨', group: 'E' },
  { id: 'CDM', name: 'Costa de Marfil', flag: '🇨🇮', group: 'E' },
  { id: 'CUR', name: 'Curazao', flag: '🇨🇼', group: 'E' },

  // Grupo F — Países Bajos, Japón, Túnez, Repesca Europa
  { id: 'PBA', name: 'Países Bajos', flag: '🇳🇱', group: 'F' },
  { id: 'JAP', name: 'Japón', flag: '🇯🇵', group: 'F' },
  { id: 'TUN', name: 'Túnez', flag: '🇹🇳', group: 'F' },
  { id: 'SWE', name: 'Repesca Europa (F)', flag: '🇪🇺', group: 'F' },

  // Grupo G — Bélgica, Irán, Egipto, Nueva Zelanda
  { id: 'BEL', name: 'Bélgica', flag: '🇧🇪', group: 'G' },
  { id: 'IRA', name: 'Irán', flag: '🇮🇷', group: 'G' },
  { id: 'EGI', name: 'Egipto', flag: '🇪🇬', group: 'G' },
  { id: 'NZL', name: 'Nueva Zelanda', flag: '🇳🇿', group: 'G' },

  // Grupo H — España, Uruguay, Arabia Saudí, Cabo Verde
  { id: 'ESP', name: 'España', flag: '🇪🇸', group: 'H' },
  { id: 'URU', name: 'Uruguay', flag: '🇺🇾', group: 'H' },
  { id: 'ARA', name: 'Arabia Saudí', flag: '🇸🇦', group: 'H' },
  { id: 'CAB', name: 'Cabo Verde', flag: '🇨🇻', group: 'H' },

  // Grupo I — Francia, Senegal, Noruega, Repesca FIFA
  { id: 'FRA', name: 'Francia', flag: '🇫🇷', group: 'I' },
  { id: 'SEN', name: 'Senegal', flag: '🇸🇳', group: 'I' },
  { id: 'NOR', name: 'Noruega', flag: '🇳🇴', group: 'I' },
  { id: 'IRK', name: 'Repesca FIFA (I)', flag: '🏳️', group: 'I' },

  // Grupo J — Argentina, Argelia, Austria, Jordania
  { id: 'ARG', name: 'Argentina', flag: '🇦🇷', group: 'J' },
  { id: 'ALG', name: 'Argelia', flag: '🇩🇿', group: 'J' },
  { id: 'AUT', name: 'Austria', flag: '🇦🇹', group: 'J' },
  { id: 'JOR', name: 'Jordania', flag: '🇯🇴', group: 'J' },

  // Grupo K — Portugal, Uzbekistán, Colombia, Repesca Concacaf
  { id: 'POR', name: 'Portugal', flag: '🇵🇹', group: 'K' },
  { id: 'UZB', name: 'Uzbekistán', flag: '🇺🇿', group: 'K' },
  { id: 'COL', name: 'Colombia', flag: '🇨🇴', group: 'K' },
  { id: 'CON', name: 'Repesca Concacaf (K)', flag: '🌎', group: 'K' },

  // Grupo L — Inglaterra, Croacia, Ghana, Panamá
  { id: 'ING', name: 'Inglaterra', flag: '🏴', group: 'L' },
  { id: 'CRO', name: 'Croacia', flag: '🇭🇷', group: 'L' },
  { id: 'GHA', name: 'Ghana', flag: '🇬🇭', group: 'L' },
  { id: 'PAN', name: 'Panamá', flag: '🇵🇦', group: 'L' },
]

export const TEAM_BY_ID: Record<string, Team> = Object.fromEntries(
  TEAMS.map((t) => [t.id, t]),
)

export const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

export function teamsOfGroup(group: string): Team[] {
  return TEAMS.filter((t) => t.group === group)
}
