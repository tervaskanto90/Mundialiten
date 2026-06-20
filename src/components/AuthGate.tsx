import { useState, type ReactNode } from 'react'
import { useAuth } from '../auth'
import { useT } from '../i18n'
import { LangToggle } from './LangToggle'
import { useTheme, ACCENT } from '../theme'
import { Emblem } from './Emblem'

/**
 * Si Supabase está configurado y no hay sesión, muestra la pantalla de
 * login/registro. Permite además entrar "sin cuenta" para uso local.
 * Si Supabase no está configurado, no molesta: renderiza la app directo.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { enabled, loading, user } = useAuth()

  // Si Supabase no está configurado, la app funciona local (sin login).
  if (!enabled || user) return <>{children}</>

  if (loading) {
    return <LoadingScreen />
  }

  return <AuthScreen />
}

function LoadingScreen() {
  const { t } = useT()
  const { c } = useTheme()
  return (
    <div
      className="min-h-full flex items-center justify-center text-sm"
      style={{ background: c.page, color: c.muted, minHeight: '100vh' }}
    >
      {t('Cargando…', 'Loading…')}
    </div>
  )
}

function AuthScreen() {
  const { signIn, signUp } = useAuth()
  const { t } = useT()
  const { c } = useTheme()
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
    <div
      className="min-h-full flex items-center justify-center p-4"
      style={{ background: c.page, color: c.text, minHeight: '100vh' }}
    >
      <div className="w-full max-w-sm">
        <div className="flex justify-end mb-2">
          <LangToggle />
        </div>
        <div className="text-center mb-6">
          <div className="flex justify-center">
            <Emblem size={56} />
          </div>
          <h1
            className="text-2xl mt-1"
            style={{ fontFamily: "'Archivo'", fontWeight: 900, color: c.text }}
          >
            Mundialiten
          </h1>
          <p className="text-sm" style={{ color: c.muted }}>{t('Prode del Mundial 2026', 'World Cup 2026 prediction game')}</p>
        </div>

        <div
          className="rounded-2xl p-5 overflow-hidden"
          style={{ background: c.cardGrad, border: '1px solid ' + c.line, boxShadow: c.shadow }}
        >
          <div
            className="-mx-5 -mt-5 mb-4"
            style={{
              height: 4,
              background:
                'linear-gradient(90deg,#2F6DF0,#7B3FF2,#EC1C7D,#FF7A1A,#FFC21A,#1FA85C)',
            }}
          />
          <div
            className="flex gap-1 rounded-lg p-1 mb-4"
            style={{ background: c.canvas, border: '1px solid ' + c.line }}
          >
            {(['login', 'signup'] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m)
                  setError('')
                  setInfo('')
                }}
                className="flex-1 py-1.5 rounded-md text-sm font-medium"
                style={
                  mode === m
                    ? { background: ACCENT.blue, color: '#fff' }
                    : { color: c.muted }
                }
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

            {error && <p className="text-xs" style={{ color: ACCENT.red }}>{error}</p>}
            {info && <p className="text-xs" style={{ color: ACCENT.green }}>{info}</p>}

            <button
              type="submit"
              disabled={busy}
              className="w-full disabled:opacity-50 font-medium py-2.5 rounded-lg"
              style={{ background: ACCENT.blue, color: '#fff' }}
            >
              {busy ? '…' : mode === 'login' ? t('Entrar', 'Log in') : t('Crear cuenta', 'Sign up')}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] mt-6" style={{ color: c.faint }}>{t('hecho por', 'made by')} Octavio Boggiano</p>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  const { c } = useTheme()
  return (
    <label className="block">
      <span className="text-xs" style={{ color: c.muted }}>{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}
