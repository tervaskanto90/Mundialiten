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

// Avatar propio (desde la tabla scores). El avatar NO se guarda en el JWT
// (user_metadata) porque lo infla y rompe los requests; vive sólo en scores.
export async function fetchMyAvatar(userId: string): Promise<string | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('scores')
    .select('avatar_url')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) return null
  return (data?.avatar_url as string | null) ?? null
}

// Avatares de TODOS los usuarios (data URLs), indexados por user_id. Se baja UNA
// sola vez (NO en el polling del ranking) y se reutiliza: así la foto deja de
// viajar en cada fila del ranking y de past_predictions, que es lo que reventó
// el Egress. Las fotos cambian poquísimo; con bajarlas al abrir la vista alcanza.
export async function fetchAvatars(): Promise<Record<string, string | null>> {
  if (!supabase) return {}
  const { data, error } = await supabase.from('scores').select('user_id, avatar_url')
  if (error) return {}
  const map: Record<string, string | null> = {}
  for (const r of (data as { user_id: string; avatar_url: string | null }[]) ?? []) {
    map[r.user_id] = r.avatar_url ?? null
  }
  return map
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

// Caché local de branding: los logos son data URLs grandes. En vez de bajarlos en
// cada carga, primero pedimos sólo `updated_at` (pesa nada) y, si no cambió desde
// lo cacheado, reutilizamos las imágenes locales SIN volver a bajarlas (egress).
const BRANDING_CACHE_KEY = 'mundi-branding-v1'
interface BrandingCache {
  updatedAt: string
  branding: Branding
}
function readBrandingCache(): BrandingCache | null {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(BRANDING_CACHE_KEY) : null
    return raw ? (JSON.parse(raw) as BrandingCache) : null
  } catch {
    return null
  }
}
function writeBrandingCache(c: BrandingCache): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(c))
  } catch {
    /* localStorage lleno o no disponible: no es crítico */
  }
}

export async function fetchBranding(): Promise<Branding | null> {
  if (!supabase) return null
  const cached = readBrandingCache()
  // 1) Metadata liviana: sólo el sello de actualización (la columna existe siempre).
  const meta = await supabase.from('branding').select('updated_at').eq('id', 1).maybeSingle()
  if (!meta.error) {
    if (!meta.data) return null // no hay branding configurado
    const updatedAt = String((meta.data as { updated_at?: string }).updated_at ?? '')
    // Si no cambió respecto del caché, reusamos las imágenes locales (cero egress).
    if (cached && cached.updatedAt === updatedAt) return cached.branding
    // Cambió (o no había caché): ahora sí bajamos las imágenes completas y cacheamos.
    const branding = await fetchBrandingFull()
    if (branding) writeBrandingCache({ updatedAt, branding })
    return branding
  }
  // Si la metadata falló (tabla sin migrar, etc.), caemos al fetch completo
  // tolerante; si tampoco se puede, usamos el caché que tengamos.
  console.warn('[branding] meta', meta.error.message)
  return (await fetchBrandingFull()) ?? cached?.branding ?? null
}

async function fetchBrandingFull(): Promise<Branding | null> {
  if (!supabase) return null
  // select('*') es tolerante: si todavía no se corrió la migración que agrega
  // `img_scale`, igual trae light_url/dark_url sin romper.
  const { data, error } = await supabase.from('branding').select('*').eq('id', 1).maybeSingle()
  if (error) {
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
  // avatar_url ya NO viene en la RPC (egress): se resuelve por user_id con fetchAvatars.
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
  // OJO (egress): este query se POLLEA cada par de minutos, así que NO trae
  // avatar_url. La foto se baja aparte una sola vez (fetchAvatars) y se mergea por
  // user_id en la vista. Antes, traer la foto en cada poll inflaba el egress.
  const withTiebreak = await supabase
    .from('scores')
    .select('user_id, display_name, accuracy, points, exact_count, result_count, advance_count, last_match_id, last_pred_home, last_pred_away, last_points')
    .order('points', { ascending: false })
    .order('exact_count', { ascending: false })
    .order('result_count', { ascending: false })
    .order('advance_count', { ascending: false })
  if (!withTiebreak.error) return (withTiebreak.data as RankingRow[]) ?? []
  // 1) con snapshot del último partido (sin avatar).
  const withAvatar = await supabase
    .from('scores')
    .select('user_id, display_name, accuracy, points, last_match_id, last_pred_home, last_pred_away, last_points')
    .order('points', { ascending: false })
  if (!withAvatar.error) return (withAvatar.data as RankingRow[]) ?? []
  // 2) básico con snapshot.
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
