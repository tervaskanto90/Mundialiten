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
  const { data, error } = await supabase
    .from('scores')
    .select('user_id, display_name, accuracy, points, last_match_id, last_pred_home, last_pred_away, last_points')
    .order('points', { ascending: false })
  if (error) throw error
  return (data as RankingRow[]) ?? []
}
