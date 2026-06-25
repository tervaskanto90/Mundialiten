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
  // Desempate cuando hay igualdad de puntos: 1º más marcadores EXACTOS,
  // 2º más resultados acertados (ganó/empató/perdió, incluye los exactos),
  // 3º más pases de ronda acertados (quién avanza en eliminatorias).
  exact_count?: number
  result_count?: number
  advance_count?: number
  // Snapshot del último partido jugado (lo completa el recálculo en el servidor):
  last_match_id?: number | null // nº del último partido sincronizado
  last_pred_home?: number | null // marcador que predijo (local), o null si no predijo
  last_pred_away?: number | null
  last_points?: number // puntos que le dio ese último partido
  avatar_url?: string | null // foto de perfil (data URL), opcional
}

// Guarda/actualiza la foto de perfil del usuario en su fila del ranking.
export async function saveAvatar(userId: string, displayName: string, avatarUrl: string | null): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('scores')
    .upsert({ user_id: userId, display_name: displayName, avatar_url: avatarUrl, updated_at: new Date().toISOString() })
  if (error) throw error
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
  exactCount: number,
  resultCount: number,
  advanceCount: number = 0,
): Promise<void> {
  if (!supabase) return
  const base = {
    user_id: userId,
    display_name: displayName,
    accuracy,
    points,
    factors,
    updated_at: new Date().toISOString(),
  }
  // Intentamos guardar también los desempates; si la migración que agrega esas
  // columnas todavía no se corrió, reintentamos sin ellas para no romper el sync.
  let { error } = await supabase
    .from('scores')
    .upsert({ ...base, exact_count: exactCount, result_count: resultCount, advance_count: advanceCount })
  if (error && /exact_count|result_count|advance_count|column/i.test(error.message)) {
    ;({ error } = await supabase.from('scores').upsert(base))
  }
  if (error) throw error
}

// Predicciones de TODOS los usuarios para partidos YA JUGADOS (las pendientes /
// en juego no se exponen). Lo resuelve una función RPC con security definer.
export interface PastPred {
  match_id: number
  user_id: string
  display_name: string
  avatar_url?: string | null
  home: number
  away: number
  // Penales que predijo (sólo en eliminatorias con empate): definen a quién eligió
  // que pasa de ronda. La RPC los devuelve como home_pens/away_pens.
  homePens?: number | null
  awayPens?: number | null
}
export async function fetchPastPredictions(): Promise<PastPred[]> {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('past_predictions')
  if (error) {
    console.warn('[past_predictions]', error.message)
    return []
  }
  return ((data as Array<PastPred & { home_pens?: number | null; away_pens?: number | null }>) ?? []).map((r) => ({
    ...r,
    homePens: r.home_pens ?? null,
    awayPens: r.away_pens ?? null,
  }))
}

export async function fetchRanking(): Promise<RankingRow[]> {
  if (!supabase) return []
  // 0) con desempate: a igualdad de PUNTOS, ordena por más EXACTOS y luego por
  //    más RESULTADOS acertados. Requiere las columnas exact_count/result_count.
  const withTiebreak = await supabase
    .from('scores')
    .select('user_id, display_name, accuracy, points, exact_count, result_count, advance_count, last_match_id, last_pred_home, last_pred_away, last_points, avatar_url')
    .order('points', { ascending: false })
    .order('exact_count', { ascending: false })
    .order('result_count', { ascending: false })
    .order('advance_count', { ascending: false })
  if (!withTiebreak.error) return (withTiebreak.data as RankingRow[]) ?? []
  // 1) con avatar + snapshot del último partido.
  const withAvatar = await supabase
    .from('scores')
    .select('user_id, display_name, accuracy, points, last_match_id, last_pred_home, last_pred_away, last_points, avatar_url')
    .order('points', { ascending: false })
  if (!withAvatar.error) return (withAvatar.data as RankingRow[]) ?? []
  // 2) sin avatar (migración de avatar sin correr), con snapshot.
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
