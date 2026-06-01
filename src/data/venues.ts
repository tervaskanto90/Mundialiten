import type { Venue } from '../types'

// 16 sedes del Mundial 2026 (nombres en español como en el calendario).
// Editable: podés cambiar nombres/ciudades sin romper nada (se referencian por id).
export const VENUES: Venue[] = [
  { id: 'cdmx', name: 'Estadio Ciudad de México', city: 'Ciudad de México', country: 'MEX' },
  { id: 'gdl', name: 'Estadio Guadalajara', city: 'Guadalajara', country: 'MEX' },
  { id: 'mty', name: 'Estadio Monterrey', city: 'Monterrey', country: 'MEX' },
  { id: 'tor', name: 'Estadio Toronto', city: 'Toronto', country: 'CAN' },
  { id: 'van', name: 'Estadio BC Place Vancouver', city: 'Vancouver', country: 'CAN' },
  { id: 'atl', name: 'Estadio Atlanta', city: 'Atlanta', country: 'USA' },
  { id: 'bos', name: 'Estadio Boston', city: 'Boston', country: 'USA' },
  { id: 'dal', name: 'Estadio Dallas', city: 'Dallas', country: 'USA' },
  { id: 'hou', name: 'Estadio Houston', city: 'Houston', country: 'USA' },
  { id: 'kc', name: 'Estadio Kansas City', city: 'Kansas City', country: 'USA' },
  { id: 'la', name: 'Estadio Los Ángeles', city: 'Los Ángeles', country: 'USA' },
  { id: 'mia', name: 'Estadio Miami', city: 'Miami', country: 'USA' },
  { id: 'nyc', name: 'Estadio Nueva York / Nueva Jersey', city: 'Nueva York', country: 'USA' },
  { id: 'phi', name: 'Estadio Filadelfia', city: 'Filadelfia', country: 'USA' },
  { id: 'sf', name: 'Estadio Bahía de San Francisco', city: 'San Francisco', country: 'USA' },
  { id: 'sea', name: 'Estadio Seattle', city: 'Seattle', country: 'USA' },
]

export const VENUE_BY_ID: Record<string, Venue> = Object.fromEntries(
  VENUES.map((v) => [v.id, v]),
)
