import type { Team } from '../types'

// Banderas de subdivisión (Escocia/Inglaterra) como secuencia de etiquetas
// Unicode. La fuente "Twemoji Country Flags" las renderiza correctamente.
const tagFlag = (region: string): string =>
  '\u{1F3F4}' + [...region].map((c) => String.fromCodePoint(0xe0000 + c.charCodeAt(0))).join('') + '\u{E007F}'
const SCOTLAND = tagFlag('gbsct')
const ENGLAND = tagFlag('gbeng')

// ─────────────────────────────────────────────────────────────────────────────
// EQUIPOS POR GRUPO
//
// Las 6 repescas del calendario se reemplazaron por los países correspondientes.
// `aliases` son nombres alternativos (en inglés, etc.) que se usan para emparejar
// los resultados que llegan en vivo desde proveedores externos.
//
// Editable: cambiá nombre, bandera, grupo o aliases a gusto. Mantené ids únicos.
// ─────────────────────────────────────────────────────────────────────────────
export const TEAMS: Team[] = [
  // Grupo A
  { id: 'MEX', name: 'México', flag: '🇲🇽', group: 'A', aliases: ['Mexico'] },
  { id: 'RSA', name: 'Sudáfrica', flag: '🇿🇦', group: 'A', aliases: ['South Africa'] },
  { id: 'COR', name: 'Rep. de Corea', flag: '🇰🇷', group: 'A', aliases: ['South Korea', 'Korea Republic'] },
  { id: 'CZE', name: 'Chequia', flag: '🇨🇿', group: 'A', aliases: ['Czechia', 'Czech Republic'] },

  // Grupo B
  { id: 'CAN', name: 'Canadá', flag: '🇨🇦', group: 'B', aliases: ['Canada'] },
  { id: 'QAT', name: 'Qatar', flag: '🇶🇦', group: 'B', aliases: ['Qatar'] },
  { id: 'SUI', name: 'Suiza', flag: '🇨🇭', group: 'B', aliases: ['Switzerland'] },
  { id: 'BOS', name: 'Bosnia y Herzegovina', flag: '🇧🇦', group: 'B', aliases: ['Bosnia and Herzegovina', 'Bosnia'] },

  // Grupo C
  { id: 'BRA', name: 'Brasil', flag: '🇧🇷', group: 'C', aliases: ['Brazil'] },
  { id: 'MAR', name: 'Marruecos', flag: '🇲🇦', group: 'C', aliases: ['Morocco'] },
  { id: 'ESC', name: 'Escocia', flag: SCOTLAND, group: 'C', aliases: ['Scotland'] },
  { id: 'HAI', name: 'Haití', flag: '🇭🇹', group: 'C', aliases: ['Haiti'] },

  // Grupo D
  { id: 'USA', name: 'Estados Unidos', flag: '🇺🇸', group: 'D', aliases: ['United States', 'USA'] },
  { id: 'PAR', name: 'Paraguay', flag: '🇵🇾', group: 'D', aliases: ['Paraguay'] },
  { id: 'AUS', name: 'Australia', flag: '🇦🇺', group: 'D', aliases: ['Australia'] },
  { id: 'TUR', name: 'Turquía', flag: '🇹🇷', group: 'D', aliases: ['Turkey', 'Türkiye', 'Turkiye'] },

  // Grupo E
  { id: 'ALE', name: 'Alemania', flag: '🇩🇪', group: 'E', aliases: ['Germany'] },
  { id: 'ECU', name: 'Ecuador', flag: '🇪🇨', group: 'E', aliases: ['Ecuador'] },
  { id: 'CDM', name: 'Costa de Marfil', flag: '🇨🇮', group: 'E', aliases: ['Ivory Coast', "Cote d'Ivoire", 'Côte d’Ivoire'] },
  { id: 'CUR', name: 'Curazao', flag: '🇨🇼', group: 'E', aliases: ['Curacao', 'Curaçao'] },

  // Grupo F
  { id: 'PBA', name: 'Países Bajos', flag: '🇳🇱', group: 'F', aliases: ['Netherlands', 'Holland'] },
  { id: 'JAP', name: 'Japón', flag: '🇯🇵', group: 'F', aliases: ['Japan'] },
  { id: 'TUN', name: 'Túnez', flag: '🇹🇳', group: 'F', aliases: ['Tunisia'] },
  { id: 'SWE', name: 'Suecia', flag: '🇸🇪', group: 'F', aliases: ['Sweden'] },

  // Grupo G
  { id: 'BEL', name: 'Bélgica', flag: '🇧🇪', group: 'G', aliases: ['Belgium'] },
  { id: 'IRA', name: 'Irán', flag: '🇮🇷', group: 'G', aliases: ['Iran', 'IR Iran'] },
  { id: 'EGI', name: 'Egipto', flag: '🇪🇬', group: 'G', aliases: ['Egypt'] },
  { id: 'NZL', name: 'Nueva Zelanda', flag: '🇳🇿', group: 'G', aliases: ['New Zealand'] },

  // Grupo H
  { id: 'ESP', name: 'España', flag: '🇪🇸', group: 'H', aliases: ['Spain'] },
  { id: 'URU', name: 'Uruguay', flag: '🇺🇾', group: 'H', aliases: ['Uruguay'] },
  { id: 'ARA', name: 'Arabia Saudí', flag: '🇸🇦', group: 'H', aliases: ['Saudi Arabia'] },
  { id: 'CAB', name: 'Cabo Verde', flag: '🇨🇻', group: 'H', aliases: ['Cape Verde', 'Cabo Verde'] },

  // Grupo I
  { id: 'FRA', name: 'Francia', flag: '🇫🇷', group: 'I', aliases: ['France'] },
  { id: 'SEN', name: 'Senegal', flag: '🇸🇳', group: 'I', aliases: ['Senegal'] },
  { id: 'NOR', name: 'Noruega', flag: '🇳🇴', group: 'I', aliases: ['Norway'] },
  { id: 'IRK', name: 'Irak', flag: '🇮🇶', group: 'I', aliases: ['Iraq'] },

  // Grupo J
  { id: 'ARG', name: 'Argentina', flag: '🇦🇷', group: 'J', aliases: ['Argentina'] },
  { id: 'ALG', name: 'Argelia', flag: '🇩🇿', group: 'J', aliases: ['Algeria'] },
  { id: 'AUT', name: 'Austria', flag: '🇦🇹', group: 'J', aliases: ['Austria'] },
  { id: 'JOR', name: 'Jordania', flag: '🇯🇴', group: 'J', aliases: ['Jordan'] },

  // Grupo K
  { id: 'POR', name: 'Portugal', flag: '🇵🇹', group: 'K', aliases: ['Portugal'] },
  { id: 'UZB', name: 'Uzbekistán', flag: '🇺🇿', group: 'K', aliases: ['Uzbekistan'] },
  { id: 'COL', name: 'Colombia', flag: '🇨🇴', group: 'K', aliases: ['Colombia'] },
  { id: 'COD', name: 'RD del Congo', flag: '🇨🇩', group: 'K', aliases: ['DR Congo', 'Congo DR', 'Democratic Republic of the Congo', 'Congo'] },

  // Grupo L
  { id: 'ING', name: 'Inglaterra', flag: ENGLAND, group: 'L', aliases: ['England'] },
  { id: 'CRO', name: 'Croacia', flag: '🇭🇷', group: 'L', aliases: ['Croatia'] },
  { id: 'GHA', name: 'Ghana', flag: '🇬🇭', group: 'L', aliases: ['Ghana'] },
  { id: 'PAN', name: 'Panamá', flag: '🇵🇦', group: 'L', aliases: ['Panama'] },
]

export const TEAM_BY_ID: Record<string, Team> = Object.fromEntries(
  TEAMS.map((t) => [t.id, t]),
)

export const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

export function teamsOfGroup(group: string): Team[] {
  return TEAMS.filter((t) => t.group === group)
}
