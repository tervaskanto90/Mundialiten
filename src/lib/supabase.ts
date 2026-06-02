import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Cliente de Supabase. Si no están configuradas las variables de entorno,
// `supabase` queda en null y la app funciona como antes (local, sin login).
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseEnabled = Boolean(url && anonKey)

export const supabase: SupabaseClient | null = isSupabaseEnabled
  ? createClient(url as string, anonKey as string)
  : null
