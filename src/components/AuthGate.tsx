import { useState, type ReactNode } from 'react'
import { useAuth } from '../auth'
import { useT } from '../i18n'
import { LangToggle } from './LangToggle'

/**
 * Si Supabase está configurado y no hay sesión, muestra la pantalla de
 * login/registro. Permite además entrar "sin cuenta" para uso local.
 * Si Supabase no está configurado, no molesta: renderiza la app directo.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { enabled, loading, user } = useAuth()
  const { t } = useT()
  const [guest, setGuest] = useState(false)

  if (!enabled || user || guest) return <>{children}</>

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center text-slate-400 text-sm">
        {t('Cargando…', 'Loading…')}
      </div>
    )
  }

  return <AuthScreen onGuest={() => setGuest(true)} />
}

function AuthScreen({ onGuest }: { onGuest: () => void }) {
  const { signIn, signUp } = useAuth()
  const { t } = useT()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password)
      } else {
        if (name.trim().length < 2) throw new Error(t('Poné un nombre para el ranking.', 'Enter a name for the ranking.'))
        await signUp(email.trim(), password, name.trim())
        setInfo(t('Cuenta creada. Si no entrás automáticamente, iniciá sesión.', 'Account created. If you are not signed in automatically, please log in.'))
        setMode('login')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Algo salió mal', 'Something went wrong'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-full flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-end mb-2">
          <LangToggle />
        </div>
        <div className="text-center mb-6">
          <div className="text-4xl">⚽</div>
          <h1 className="text-2xl font-bold mt-1">Mundialiten</h1>
          <p className="text-sm text-slate-400">{t('Prode del Mundial 2026', 'World Cup 2026 prediction game')}</p>
        </div>

        <div className="bg-slate-800/60 border border-white/10 rounded-2xl p-5">
          <div className="flex gap-1 bg-slate-900/60 rounded-lg p-1 mb-4">
            {(['login', 'signup'] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m)
                  setError('')
                  setInfo('')
                }}
                className={`flex-1 py-1.5 rounded-md text-sm font-medium ${
                  mode === m ? 'bg-pitch-500 text-white' : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                {m === 'login' ? t('Entrar', 'Log in') : t('Crear cuenta', 'Sign up')}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === 'signup' && (
              <Field label={t('Nombre para el ranking', 'Name for the ranking')}>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('Ej: Octavio', 'E.g. Octavio')}
                  className="auth-input"
                />
              </Field>
            )}
            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="auth-input"
              />
            </Field>
            <Field label={t('Contraseña', 'Password')}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="auth-input"
              />
            </Field>

            {error && <p className="text-xs text-rose-400">{error}</p>}
            {info && <p className="text-xs text-emerald-400">{info}</p>}

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-pitch-500 hover:bg-pitch-600 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg"
            >
              {busy ? '…' : mode === 'login' ? t('Entrar', 'Log in') : t('Crear cuenta', 'Sign up')}
            </button>
          </form>
        </div>

        <button
          onClick={onGuest}
          className="w-full text-center text-xs text-slate-500 hover:text-slate-300 mt-4"
        >
          {t('Entrar sin cuenta (sólo local, no cuenta para el ranking)', 'Continue without an account (local only, does not count for the ranking)')}
        </button>

        <p className="text-center text-[11px] text-slate-600 mt-6">{t('hecho por', 'made by')} Octavio Boggiano</p>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-slate-400">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}
