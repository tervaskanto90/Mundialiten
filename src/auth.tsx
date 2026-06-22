import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, isSupabaseEnabled } from './lib/supabase'

interface AuthState {
  enabled: boolean
  loading: boolean
  user: User | null
  displayName: string
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName: string) => Promise<void>
  signOut: () => Promise<void>
  changePassword: (newPassword: string) => Promise<void>
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

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const value: AuthState = {
    enabled: isSupabaseEnabled,
    loading,
    user: session?.user ?? null,
    displayName: nameFromUser(session?.user ?? null),
    isAdmin: isAdminUser(session?.user ?? null),
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
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth fuera de AuthProvider')
  return ctx
}
