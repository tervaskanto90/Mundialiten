import { useState } from 'react'
import { Modal } from './Modal'
import { Avatar } from './Avatar'
import { useAuth } from '../auth'
import { supabase } from '../lib/supabase'
import { saveAvatar } from '../lib/remote'
import { fileToAvatarDataUrl } from '../utils/img'
import { useT } from '../i18n'
import { useTheme, ACCENT } from '../theme'

/** Panel de cuenta: foto de perfil, cambiar contraseña y cerrar sesión. Se abre
 *  desde el botón del usuario, arriba a la derecha. */
export function AccountModal({ onClose }: { onClose: () => void }) {
  const { user, enabled, isAdmin, displayName, avatarUrl, changePassword, updateAvatar, signOut } = useAuth()
  const { t } = useT()
  const { c } = useTheme()
  const [announceBusy, setAnnounceBusy] = useState(false)
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [avatar, setAvatar] = useState<string | null>(avatarUrl)
  const [avatarBusy, setAvatarBusy] = useState(false)

  const pickAvatar = async (file: File | undefined) => {
    if (!file || !user) return
    setErr('')
    setAvatarBusy(true)
    try {
      const dataUrl = await fileToAvatarDataUrl(file)
      await updateAvatar(dataUrl) // perfil propio (header)
      await saveAvatar(user.id, displayName, dataUrl) // visible en el ranking
      setAvatar(dataUrl)
      setMsg(t('Foto actualizada ✅', 'Photo updated ✅'))
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('No se pudo subir la foto', 'Could not upload the photo'))
    } finally {
      setAvatarBusy(false)
    }
  }
  const removeAvatar = async () => {
    if (!user) return
    setAvatarBusy(true)
    try {
      await updateAvatar(null)
      await saveAvatar(user.id, displayName, null)
      setAvatar(null)
    } catch {
      /* noop */
    } finally {
      setAvatarBusy(false)
    }
  }

  // Admin: dispara el mail de anuncio de nueva versión a todos (usa la sesión
  // del admin como autorización; primero previsualiza y pide confirmación).
  const sendAnnounce = async () => {
    if (!supabase) return
    setErr('')
    setMsg('')
    setAnnounceBusy(true)
    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) throw new Error(t('Sesión no válida', 'Invalid session'))
      const headers = { Authorization: `Bearer ${token}` }
      const dry = await fetch('/api/announce?dryRun=1', { headers }).then((r) => r.json())
      if (!dry?.ok) {
        const dbg = dry?.debug ? ' · ' + JSON.stringify(dry.debug) : ''
        throw new Error((dry?.error || t('No se pudo previsualizar', 'Could not preview')) + dbg)
      }
      const n = dry.seMandariaA ?? 0
      if (n === 0) {
        setMsg(t('No hay usuarios pendientes de avisar ✅', 'No users pending to notify ✅'))
        return
      }
      const ok = window.confirm(
        t(
          `Se enviará el anuncio a ${n} usuario(s) (de ${dry.usuarios}, ${dry.yaAvisados} ya avisados). ¿Enviar ahora?`,
          `The announcement will be sent to ${n} user(s) (of ${dry.usuarios}, ${dry.yaAvisados} already notified). Send now?`,
        ),
      )
      if (!ok) return
      const sent = await fetch('/api/announce', { headers }).then((r) => r.json())
      if (!sent?.ok) throw new Error(sent?.error || t('No se pudo enviar', 'Could not send'))
      setMsg(t(`Anuncio enviado: ${sent.enviados}/${sent.intentados} ✅`, `Announcement sent: ${sent.enviados}/${sent.intentados} ✅`))
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('No se pudo enviar el anuncio', 'Could not send the announcement'))
    } finally {
      setAnnounceBusy(false)
    }
  }

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
            <div className="flex items-center gap-3">
              <Avatar src={avatar} name={displayName} size={56} />
              <div className="flex flex-col gap-1.5">
                <label
                  className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer text-center"
                  style={{ background: 'rgba(47,109,240,.12)', color: ACCENT.blue, border: '1px solid ' + c.line }}
                >
                  {avatarBusy ? '…' : avatar ? t('Cambiar foto', 'Change photo') : t('Subir foto', 'Upload photo')}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      pickAvatar(e.target.files?.[0])
                      e.target.value = ''
                    }}
                  />
                </label>
                {avatar && (
                  <button onClick={removeAvatar} className="text-[11px] font-medium" style={{ color: c.muted }}>
                    {t('Quitar foto', 'Remove photo')}
                  </button>
                )}
              </div>
            </div>
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

            {isAdmin && (
              <div className="pt-3 mt-1" style={{ borderTop: '1px solid ' + c.line }}>
                <div className="text-xs font-semibold pb-2" style={{ color: c.text }}>🛠️ {t('Admin', 'Admin')}</div>
                <button
                  onClick={sendAnnounce}
                  disabled={announceBusy}
                  className="w-full py-2.5 rounded-lg text-sm font-bold disabled:opacity-50"
                  style={{ background: ACCENT.gold, color: '#1c160c' }}
                >
                  {announceBusy ? '…' : t('📣 Enviar anuncio de nueva versión', '📣 Send new-version announcement')}
                </button>
                <p className="text-[10px] mt-1.5" style={{ color: c.muted }}>
                  {t('Manda el mail a todos los usuarios (no duplica a quien ya recibió).', 'Emails all users (won’t duplicate to those already notified).')}
                </p>
              </div>
            )}
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
