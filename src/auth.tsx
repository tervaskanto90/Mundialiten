import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, isSupabaseEnabled } from './lib/supabase'
import { fetchMyAvatar } from './lib/remote'

interface AuthState {
  enabled: boolean
  loading: boolean
  user: User | null
  displayName: string
  avatarUrl: string | null
  isAdmin: boolean
  recovery: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName: string) => Promise<void>
  signOut: () => Promise<void>
  changePassword: (newPassword: string) => Promise<void>
  updateAvatar: (dataUrl: string | null) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  endRecovery: () => void
}

const AuthContext = createContext<AuthState | null>(null)

// Cuenta administradora: la única que puede subir/cambiar la imagen compartida
// del encabezado. El resto la ve pero no la edita (reforzado además por RLS en
// Supabase, ver supabase/schema.sql → tabla `branding`).
export const ADMIN_EMAIL = 'boggianooctavio@gmail.com'

function isAdminUser(user: User | null): boolean {
  return (user?.email ?? '').trim().toLowerCase() === ADMIN_EMAIL
}

function nameFromUser(user: User | null): string {
  if (!user) return ''
  return (user.user_metadata?.display_name as string) || user.email?.split('@')[0] || 'Jugador'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isSupabaseEnabled)
  const [recovery, setRecovery] = useState(false)
  // Avatar propio: se lee de la tabla `scores` (NO del JWT, ver updateAvatar).
  const [myAvatar, setMyAvatar] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      // El usuario abrió el link del mail de recupero: pedimos contraseña nueva.
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // Trae el avatar propio desde scores al iniciar sesión (o lo limpia al salir).
  const userId = session?.user?.id ?? null
  useEffect(() => {
    if (!userId) {
      setMyAvatar(null)
      return
    }
    let cancelled = false
    fetchMyAvatar(userId).then((a) => {
      if (!cancelled) setMyAvatar(a)
    })
    return () => {
      cancelled = true
    }
  }, [userId])

  const value: AuthState = {
    enabled: isSupabaseEnabled,
    loading,
    user: session?.user ?? null,
    displayName: nameFromUser(session?.user ?? null),
    // Avatar propio desde scores; fallback al metadata por compatibilidad (hasta
    // que se limpie en todos). NUNCA se vuelve a escribir en el metadata/JWT.
    avatarUrl: myAvatar ?? ((session?.user?.user_metadata?.avatar_url as string) || null),
    isAdmin: isAdminUser(session?.user ?? null),
    recovery,
    signIn: async (email, password) => {
      if (!supabase) throw new Error('Supabase no configurado')
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    },
    signUp: async (email, password, displayName) => {
      if (!supabase) throw new Error('Supabase no configurado')
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } },
      })
      if (error) throw error
    },
    signOut: async () => {
      if (!supabase) return
      await supabase.auth.signOut()
    },
    changePassword: async (newPassword) => {
      if (!supabase) throw new Error('Supabase no configurado')
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
    },
    updateAvatar: async (dataUrl) => {
      // La foto se guarda en scores.avatar_url (saveAvatar, desde AccountModal).
      // NO la metemos en el JWT (user_metadata): infla el token y rompe TODOS los
      // requests (header demasiado grande). Acá sólo actualizamos el estado local.
      setMyAvatar(dataUrl)
    },
    resetPassword: async (email) => {
      if (!supabase) throw new Error('Supabase no configurado')
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      })
      if (error) throw error
    },
    endRecovery: () => setRecovery(false),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth fuera de AuthProvider')
  return ctx
}
