import { useState, type ReactNode } from 'react'
import { useAuth } from '../auth'
import { useT } from '../i18n'
import { LangToggle } from './LangToggle'
import { useTheme, ACCENT } from '../theme'
import { Emblem } from './Emblem'
import { Band } from './Bands'
import { ProjectsShowcase } from './ProjectsShowcase'
import { useBranding } from '../lib/branding'
import { useIsDesktop } from '../hooks/useIsDesktop'

/**
 * Si Supabase está configurado y no hay sesión, muestra la pantalla de
 * login/registro. Si el usuario llega desde el mail de recupero, pide la
 * contraseña nueva. Si Supabase no está configurado, renderiza la app directo.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { enabled, loading, user, recovery } = useAuth()

  if (recovery) return <RecoveryScreen />
  if (!enabled || user) return <>{children}</>
  if (loading) return <LoadingScreen />
  return <AuthScreen />
}

// Mosaico de color a pantalla completa (el mismo de las bandas de la app), fijo
// de fondo. Las cajas del login flotan encima, sin panel de soporte.
function MosaicBg() {
  const { dark } = useTheme()
  const isDesktop = useIsDesktop()
  const cols = isDesktop ? 16 : 6
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, display: 'flex', overflow: 'hidden', pointerEvents: 'none', opacity: dark ? 0.75 : 0.95 }} aria-hidden>
      {Array.from({ length: cols }).map((_, i) => (
        <Band key={i} offset={i} dark={dark} />
      ))}
    </div>
  )
}

function Shell({ children }: { children: ReactNode }) {
  const { c } = useTheme()
  return (
    <div style={{ minHeight: '100vh', position: 'relative', color: c.text }}>
      <MosaicBg />
      <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: 16 }}>
        {children}
      </div>
    </div>
  )
}

function Toggles() {
  const { dark, toggle, c } = useTheme()
  const { t } = useT()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <LangToggle />
      <button
        onClick={toggle}
        title={dark ? t('Modo claro', 'Light mode') : t('Modo oscuro', 'Dark mode')}
        style={{ width: 34, height: 34, borderRadius: 11, cursor: 'pointer', fontSize: 15, border: '1px solid ' + c.line, background: dark ? 'rgba(40,30,15,.92)' : 'rgba(255,253,246,.94)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px -4px rgba(0,0,0,.4)' }}
      >
        {dark ? '☀️' : '🌙'}
      </button>
    </div>
  )
}

function Footer() {
  const { t } = useT()
  const { c, dark } = useTheme()
  const links = [
    { href: 'https://x.com/tervaskanto', label: 'X', icon: <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /> },
    { href: 'https://www.linkedin.com/in/octavioboggiano', label: 'LinkedIn', icon: <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56zM22.22 0H1.77C.8 0 0 .78 0 1.74v20.52C0 23.22.8 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.74V1.74C24 .78 23.2 0 22.22 0z" /> },
    { href: 'https://oboggiano.vercel.app', label: 'Website', icon: <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.93 6h-2.95a15.7 15.7 0 0 0-1.38-3.56A8.03 8.03 0 0 1 18.93 8zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14a7.96 7.96 0 0 1 0-4h3.38a16.5 16.5 0 0 0 0 4zm.81 2h2.95c.34 1.27.81 2.47 1.38 3.56A8.03 8.03 0 0 1 5.07 16zm2.95-8H5.07a8.03 8.03 0 0 1 4.33-3.56A15.7 15.7 0 0 0 8.02 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82A15.7 15.7 0 0 1 12 19.96zM14.34 14H9.66a14.6 14.6 0 0 1 0-4h4.68a14.6 14.6 0 0 1 0 4zm.25 5.56c.57-1.09 1.04-2.29 1.38-3.56h2.95a8.03 8.03 0 0 1-4.33 3.56zM16.36 14a16.5 16.5 0 0 0 0-4h3.38a7.96 7.96 0 0 1 0 4z" /> },
  ]
  return (
    <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'center', paddingTop: 16 }}>
      <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 14, background: dark ? 'rgba(12,9,4,.55)' : 'rgba(251,246,234,.75)', backdropFilter: 'blur(6px)', border: '1px solid ' + c.line }}>
        <p className="text-[11px]" style={{ color: c.muted }}>{t('hecho por', 'made by')} Octavio Boggiano</p>
        <div className="flex items-center gap-3">
          {links.map((l) => (
            <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" title={l.label} className="rounded-lg flex items-center justify-center" style={{ width: 30, height: 30, border: '1px solid ' + c.line, color: c.muted, background: dark ? 'rgba(0,0,0,.3)' : 'rgba(255,255,255,.5)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">{l.icon}</svg>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

function BrandLogo({ size = 60 }: { size?: number }) {
  const { dark } = useTheme()
  const [branding] = useBranding()
  const current = dark ? branding.dark : branding.light
  return (
    <div style={{ width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      {current ? <img src={current} alt="Mundialiten" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <Emblem size={size} />}
    </div>
  )
}

function LoadingScreen() {
  const { t } = useT()
  const { c } = useTheme()
  return (
    <div className="min-h-full flex items-center justify-center text-sm" style={{ background: c.page, color: c.muted, minHeight: '100vh' }}>
      {t('Cargando…', 'Loading…')}
    </div>
  )
}

function AuthScreen() {
  const { signIn, signUp, resetPassword } = useAuth()
  const { t } = useT()
  const { c, dark } = useTheme()
  const isDesktop = useIsDesktop()
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login')
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
      } else if (mode === 'signup') {
        if (name.trim().length < 2) throw new Error(t('Poné un nombre para el ranking.', 'Enter a name for the ranking.'))
        await signUp(email.trim(), password, name.trim())
        setInfo(t('Cuenta creada. Si no entrás automáticamente, iniciá sesión.', 'Account created. If you are not signed in automatically, please log in.'))
        setMode('login')
      } else {
        if (!email.trim()) throw new Error(t('Ingresá tu email.', 'Enter your email.'))
        await resetPassword(email.trim())
        setInfo(t('Te mandamos un mail para restablecer la contraseña.', 'We sent you an email to reset your password.'))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Algo salió mal', 'Something went wrong'))
    } finally {
      setBusy(false)
    }
  }

  // (1) Recuadro de login, flotando sobre el fondo.
  const loginCard = (
    <div style={{ flex: 'none', width: '100%', maxWidth: 360 }}>
      <div className="text-center mb-5">
        <div className="flex justify-center"><BrandLogo size={60} /></div>
        <h1 className="text-2xl mt-1" style={{ fontFamily: "'Archivo'", fontWeight: 900, color: c.text }}>Mundialiten</h1>
        <p className="text-sm" style={{ color: c.muted }}>{t('Prode del Mundial 2026', 'World Cup 2026 prediction game')}</p>
      </div>
      <div className="rounded-2xl p-5 overflow-hidden" style={{ background: c.cardGrad, border: '1px solid ' + c.line, boxShadow: '0 24px 60px -20px rgba(0,0,0,.55)' }}>
        {mode !== 'forgot' && (
          <div className="flex gap-1 rounded-lg p-1 mb-4" style={{ background: c.canvas, border: '1px solid ' + c.line }}>
            {(['login', 'signup'] as const).map((m) => (
              <button key={m} onClick={() => { setMode(m); setError(''); setInfo('') }} className="flex-1 py-1.5 rounded-md text-sm font-medium" style={mode === m ? { background: ACCENT.blue, color: '#fff' } : { color: c.muted }}>
                {m === 'login' ? t('Entrar', 'Log in') : t('Crear cuenta', 'Sign up')}
              </button>
            ))}
          </div>
        )}
        <form onSubmit={submit} className="space-y-3">
          {mode === 'signup' && (
            <Field label={t('Nombre para el ranking', 'Name for the ranking')}>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('Ej: Octavio', 'E.g. Octavio')} className="auth-input" />
            </Field>
          )}
          <Field label="Email">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="auth-input" />
          </Field>
          {mode !== 'forgot' && (
            <Field label={t('Contraseña', 'Password')}>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="auth-input" />
            </Field>
          )}
          {error && <p className="text-xs" style={{ color: ACCENT.red }}>{error}</p>}
          {info && <p className="text-xs" style={{ color: ACCENT.green }}>{info}</p>}
          <button type="submit" disabled={busy} className="w-full disabled:opacity-50 font-medium py-2.5 rounded-lg" style={{ background: ACCENT.blue, color: '#fff' }}>
            {busy ? '…' : mode === 'login' ? t('Entrar', 'Log in') : mode === 'signup' ? t('Crear cuenta', 'Sign up') : t('Enviar mail de recupero', 'Send reset email')}
          </button>
          <div className="text-center">
            {mode === 'forgot' ? (
              <button type="button" onClick={() => { setMode('login'); setError(''); setInfo('') }} className="text-xs" style={{ color: c.muted }}>
                ← {t('Volver a entrar', 'Back to log in')}
              </button>
            ) : (
              <button type="button" onClick={() => { setMode('forgot'); setError(''); setInfo('') }} className="text-xs" style={{ color: c.muted }}>
                {t('¿Olvidaste tu contraseña?', 'Forgot your password?')}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )

  // (3) Panel de proyectos a la derecha; (4) toggles justo ARRIBA del panel.
  const rightSide = (
    <div style={{ flex: 'none', width: '100%', maxWidth: 280, position: 'relative' }}>
      <div style={{ position: isDesktop ? 'absolute' : 'static', top: -46, right: 0, display: 'flex', justifyContent: 'flex-end', marginBottom: isDesktop ? 0 : 10 }}>
        <Toggles />
      </div>
      <div className="rounded-2xl p-3" style={{ background: dark ? 'rgba(12,9,4,.5)' : 'rgba(251,246,234,.7)', backdropFilter: 'blur(6px)', border: '1px solid ' + c.line, boxShadow: '0 24px 60px -20px rgba(0,0,0,.5)' }}>
        <ProjectsShowcase compact />
      </div>
    </div>
  )

  return (
    <Shell>
      <div style={{ flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: isDesktop ? 46 : 8 }}>
        <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start', justifyContent: 'center', flexDirection: isDesktop ? 'row' : 'column', width: '100%' }}>
          {loginCard}
          {rightSide}
        </div>
      </div>
      <Footer />
    </Shell>
  )
}

function RecoveryScreen() {
  const { changePassword, endRecovery } = useAuth()
  const { t } = useT()
  const { c } = useTheme()
  const isDesktop = useIsDesktop()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    if (pw.length < 6) { setErr(t('Mínimo 6 caracteres.', 'Min 6 characters.')); return }
    if (pw !== pw2) { setErr(t('No coinciden.', 'They do not match.')); return }
    setBusy(true)
    try {
      await changePassword(pw)
      endRecovery()
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : t('No se pudo cambiar', 'Could not change'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Shell>
      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: 8 }}><Toggles /></div>
      <div style={{ flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: isDesktop ? 0 : 8 }}>
        <div style={{ maxWidth: 360, width: '100%' }}>
          <div className="text-center mb-5">
            <div className="flex justify-center"><BrandLogo size={56} /></div>
            <h1 className="text-xl mt-1" style={{ fontFamily: "'Archivo'", fontWeight: 900, color: c.text }}>{t('Nueva contraseña', 'New password')}</h1>
            <p className="text-sm" style={{ color: c.muted }}>{t('Elegí tu nueva contraseña.', 'Choose your new password.')}</p>
          </div>
          <form onSubmit={save} className="rounded-2xl p-5 space-y-3" style={{ background: c.cardGrad, border: '1px solid ' + c.line, boxShadow: '0 24px 60px -20px rgba(0,0,0,.55)' }}>
            <input type="password" className="auth-input" placeholder={t('Nueva contraseña', 'New password')} value={pw} onChange={(e) => setPw(e.target.value)} />
            <input type="password" className="auth-input" placeholder={t('Repetir contraseña', 'Repeat password')} value={pw2} onChange={(e) => setPw2(e.target.value)} />
            {err && <p className="text-xs" style={{ color: ACCENT.red }}>{err}</p>}
            <button type="submit" disabled={busy} className="w-full disabled:opacity-50 font-medium py-2.5 rounded-lg" style={{ background: ACCENT.blue, color: '#fff' }}>
              {busy ? '…' : t('Guardar y entrar', 'Save and enter')}
            </button>
          </form>
        </div>
      </div>
      <Footer />
    </Shell>
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
