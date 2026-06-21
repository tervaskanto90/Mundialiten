import { supabase } from './supabase'
import type { MatchResult } from '../types'
import type { AccuracyFactor } from '../engine/accuracy'

// Acceso a los datos compartidos en Supabase. Todas las funciones son no-op /
// devuelven null si Supabase no está configurado.

export interface RankingRow {
  user_id: string
  display_name: string
  accuracy: number // % de acierto (dato secundario)
  points: number // puntos acumulados (ordena el ranking)
  // Snapshot del último partido jugado (lo completa el recálculo en el servidor):
  last_match_id?: number | null // nº del último partido sincronizado
  last_pred_home?: number | null // marcador que predijo (local), o null si no predijo
  last_pred_away?: number | null
  last_points?: number // puntos que le dio ese último partido
}

// ─── Imagen compartida del encabezado (una para modo claro, otra para oscuro) ──
// La sube SÓLO el admin (RLS por email en Supabase) pero la ve todo el mundo.
// `scale` agranda toda la barra de arriba (imagen + textos + botones) y también
// es compartido: lo define el admin y lo ven todos.
export interface Branding {
  light: string | null
  dark: string | null
  scale: number
}

export const DEFAULT_BRANDING: Branding = { light: null, dark: null, scale: 1 }

export async function fetchBranding(): Promise<Branding | null> {
  if (!supabase) return null
  // select('*') es tolerante: si todavía no se corrió la migración que agrega
  // `img_scale`, igual trae light_url/dark_url sin romper.
  const { data, error } = await supabase.from('branding').select('*').eq('id', 1).maybeSingle()
  if (error) {
    // Si la tabla todavía no existe (migración sin correr) no rompemos la app:
    // simplemente no hay imagen custom y se usa el escudo por defecto.
    console.warn('[branding] fetch', error.message)
    return null
  }
  if (!data) return null
  const scale = Number((data as { img_scale?: number }).img_scale ?? 1)
  return {
    light: (data.light_url as string | null) ?? null,
    dark: (data.dark_url as string | null) ?? null,
    scale: Number.isFinite(scale) && scale > 0 ? scale : 1,
  }
}

export async function saveBranding(b: Branding): Promise<void> {
  if (!supabase) throw new Error('Supabase no configurado')
  const { error } = await supabase.from('branding').upsert({
    id: 1,
    light_url: b.light,
    dark_url: b.dark,
    img_scale: b.scale,
    updated_at: new Date().toISOString(),
  })
  if (error) throw error
}

export async function fetchRealResults(): Promise<Record<number, MatchResult> | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('real_results')
    .select('results')
    .eq('id', 1)
    .maybeSingle()
  if (error) throw error
  return (data?.results as Record<number, MatchResult>) ?? null
}

export async function saveRealResults(results: Record<number, MatchResult>): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('real_results')
    .upsert({ id: 1, results, updated_at: new Date().toISOString() })
  if (error) throw error
}

export async function fetchMyPrediction(
  userId: string,
): Promise<Record<number, MatchResult> | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('predictions')
    .select('results')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return (data?.results as Record<number, MatchResult>) ?? null
}

export async function saveMyPrediction(
  userId: string,
  results: Record<number, MatchResult>,
): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('predictions')
    .upsert({ user_id: userId, results, updated_at: new Date().toISOString() })
  if (error) throw error
}

export async function upsertScore(
  userId: string,
  displayName: string,
  accuracy: number,
  points: number,
  factors: AccuracyFactor[],
): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('scores').upsert({
    user_id: userId,
    display_name: displayName,
    accuracy,
    points,
    factors,
    updated_at: new Date().toISOString(),
  })
  if (error) throw error
}

export async function fetchRanking(): Promise<RankingRow[]> {
  if (!supabase) return []
  // Intentamos con las columnas del snapshot del último partido.
  const full = await supabase
    .from('scores')
    .select('user_id, display_name, accuracy, points, last_match_id, last_pred_home, last_pred_away, last_points')
    .order('points', { ascending: false })
  if (!full.error) return (full.data as RankingRow[]) ?? []
  // Compatibilidad: si todavía no se corrió la migración (columnas last_*),
  // caemos a las columnas básicas para no romper el ranking.
  const basic = await supabase
    .from('scores')
    .select('user_id, display_name, accuracy, points')
    .order('points', { ascending: false })
  if (basic.error) throw basic.error
  return (basic.data as RankingRow[]) ?? []
}
