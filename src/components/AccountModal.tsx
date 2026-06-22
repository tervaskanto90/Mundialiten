import { useState } from 'react'
import { Modal } from './Modal'
import { useAuth } from '../auth'
import { useT } from '../i18n'
import { useTheme, ACCENT } from '../theme'

/** Panel de cuenta: cambiar contraseña y cerrar sesión. Se abre desde el botón
 *  del usuario, arriba a la derecha. */
export function AccountModal({ onClose }: { onClose: () => void }) {
  const { user, enabled, changePassword, signOut } = useAuth()
  const { t } = useT()
  const { c } = useTheme()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const save = async () => {
    setErr('')
    setMsg('')
    if (pw.length < 6) {
      setErr(t('La contraseña debe tener al menos 6 caracteres.', 'Password must be at least 6 characters.'))
      return
    }
    if (pw !== pw2) {
      setErr(t('Las contraseñas no coinciden.', 'Passwords do not match.'))
      return
    }
    setBusy(true)
    try {
      await changePassword(pw)
      setMsg(t('Contraseña actualizada ✅', 'Password updated ✅'))
      setPw('')
      setPw2('')
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('No se pudo cambiar', 'Could not change'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={t('Mi cuenta', 'My account')} onClose={onClose}>
      <div className="space-y-3">
        {enabled && user ? (
          <>
            <div className="text-sm" style={{ color: c.muted }}>{user.email}</div>
            <div className="text-xs font-semibold pt-1" style={{ color: c.text }}>{t('Cambiar contraseña', 'Change password')}</div>
            <input
              type="password"
              className="auth-input"
              placeholder={t('Nueva contraseña', 'New password')}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
            />
            <input
              type="password"
              className="auth-input"
              placeholder={t('Repetir nueva contraseña', 'Repeat new password')}
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
            />
            {err && <p className="text-xs" style={{ color: ACCENT.red }}>{err}</p>}
            {msg && <p className="text-xs" style={{ color: ACCENT.green }}>{msg}</p>}
            <button
              onClick={save}
              disabled={busy}
              className="w-full py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
              style={{ background: ACCENT.blue, color: '#fff' }}
            >
              {busy ? '…' : t('Guardar contraseña', 'Save password')}
            </button>
            <button
              onClick={() => {
                signOut()
                onClose()
              }}
              className="w-full py-2.5 rounded-lg text-sm font-medium"
              style={{ color: ACCENT.red, border: '1px solid ' + c.line }}
            >
              {t('Cerrar sesión', 'Sign out')}
            </button>
          </>
        ) : (
          <p className="text-sm" style={{ color: c.muted }}>
            {t('Estás en modo local (sin cuenta).', 'You are in local mode (no account).')}
          </p>
        )}
      </div>
    </Modal>
  )
}
