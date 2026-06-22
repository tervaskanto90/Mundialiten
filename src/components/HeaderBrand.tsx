import { useEffect, useState } from 'react'
import { Modal } from './Modal'
import { Emblem } from './Emblem'
import { useAuth } from '../auth'
import { useTheme } from '../theme'
import { useT } from '../i18n'
import { saveBranding, type Branding } from '../lib/remote'

// Lado máximo al que reescalamos antes de guardar, para no meter imágenes
// enormes en la base (se reexporta en webp, que mantiene la transparencia).
const MAX_DIM = 640

const SIZE_OPTS: { v: number; es: string; en: string }[] = [
  { v: 1, es: 'Normal', en: 'Normal' },
  { v: 1.25, es: 'Grande', en: 'Large' },
  { v: 1.55, es: 'Extra', en: 'Extra' },
]

async function fileToDataUrl(file: File): Promise<string> {
  const original = await new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error ?? new Error('No se pudo leer el archivo'))
    r.readAsDataURL(file)
  })
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image()
    i.onload = () => resolve(i)
    i.onerror = () => reject(new Error('Archivo de imagen inválido'))
    i.src = original
  })
  const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height))
  const w = Math.max(1, Math.round(img.width * scale))
  const h = Math.max(1, Math.round(img.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return original
  ctx.drawImage(img, 0, 0, w, h)
  return canvas.toDataURL('image/webp', 0.92)
}

/**
 * Imagen del encabezado, centrada a la izquierda. Muestra la imagen subida para
 * el tema actual (claro/oscuro) y, si no hay, cae al escudo por defecto. La
 * cuenta admin ve un lápiz para subir/cambiar las imágenes y elegir el tamaño
 * de la barra (una imagen por tema). `size` ya viene escalado desde App.
 */
export function HeaderBrand({
  branding,
  onChange,
  size = 58,
  onClick,
}: {
  branding: Branding
  onChange: (b: Branding) => void
  size?: number
  onClick?: () => void
}) {
  const { isAdmin } = useAuth()
  const { dark, c } = useTheme()
  const { t } = useT()
  const [editing, setEditing] = useState(false)
  // Ancho del logo más ancho entre claro y oscuro: reservamos ese ancho fijo en
  // ambos temas para que el título NO se mueva al cambiar de modo.
  const [maxAspect, setMaxAspect] = useState(1)

  useEffect(() => {
    let alive = true
    const urls = [branding.light, branding.dark].filter(Boolean) as string[]
    if (urls.length === 0) {
      setMaxAspect(1)
      return
    }
    Promise.all(
      urls.map(
        (u) =>
          new Promise<number>((res) => {
            const i = new Image()
            i.onload = () => res(i.width / i.height || 1)
            i.onerror = () => res(1)
            i.src = u
          }),
      ),
    ).then((rs) => {
      if (alive) setMaxAspect(Math.max(1, ...rs))
    })
    return () => {
      alive = false
    }
  }, [branding.light, branding.dark])

  const current = dark ? branding.dark : branding.light
  const boxW = Math.round(size * maxAspect)

  return (
    <>
      <div
        onClick={onClick}
        style={{ width: boxW, height: size, flex: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-start', cursor: onClick ? 'pointer' : undefined }}
      >
        <div style={{ position: 'relative', height: size, display: 'inline-flex', alignItems: 'center' }}>
          {current ? (
            <img
              src={current}
              alt="Mundialiten"
              style={{
                height: '100%',
                width: 'auto',
                maxWidth: boxW,
                objectFit: 'contain',
                objectPosition: 'left center',
                display: 'block',
                filter: 'drop-shadow(0 4px 10px rgba(124,63,242,.35))',
              }}
            />
          ) : (
            <div style={{ width: size, height: size, filter: 'drop-shadow(0 4px 10px rgba(124,63,242,.4))' }}>
              <Emblem size={size} />
            </div>
          )}
          {isAdmin && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setEditing(true)
              }}
              title={t('Cambiar imagen del encabezado', 'Change header image')}
              style={{
                position: 'absolute',
                bottom: -7,
                right: -9,
                width: 22,
                height: 22,
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 11,
                lineHeight: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid ' + c.line,
                background: dark ? '#2E2312' : '#FFFDF6',
                color: c.text,
                boxShadow: '0 2px 7px rgba(0,0,0,.35)',
              }}
            >
              ✏️
            </button>
          )}
        </div>
      </div>

      {editing && (
        <BrandingEditor
          initial={branding}
          onClose={() => setEditing(false)}
          onSaved={(b) => {
            onChange(b)
            setEditing(false)
          }}
        />
      )}
    </>
  )
}

function BrandingEditor({
  initial,
  onClose,
  onSaved,
}: {
  initial: Branding
  onClose: () => void
  onSaved: (b: Branding) => void
}) {
  const { t } = useT()
  const { c } = useTheme()
  const [light, setLight] = useState<string | null>(initial.light)
  const [dark, setDark] = useState<string | null>(initial.dark)
  const [scale, setScale] = useState<number>(initial.scale || 1)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const pick = async (which: 'light' | 'dark', file: File | undefined) => {
    if (!file) return
    setErr('')
    try {
      const url = await fileToDataUrl(file)
      if (which === 'light') setLight(url)
      else setDark(url)
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('No se pudo procesar la imagen', 'Could not process the image'))
    }
  }

  const save = async () => {
    setBusy(true)
    setErr('')
    try {
      const next: Branding = { light, dark, scale }
      await saveBranding(next)
      onSaved(next)
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('No se pudo guardar', 'Could not save'))
      setBusy(false)
    }
  }

  return (
    <Modal
      title={t('Imagen del encabezado', 'Header image')}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ color: c.muted, border: '1px solid ' + c.line }}
          >
            {t('Cancelar', 'Cancel')}
          </button>
          <button
            onClick={save}
            disabled={busy}
            className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            style={{ background: '#2F6DF0', color: '#fff' }}
          >
            {busy ? '…' : t('Guardar', 'Save')}
          </button>
        </div>
      }
    >
      <p className="text-xs mb-4" style={{ color: c.muted }}>
        {t(
          'La imagen la ven todos, pero sólo vos podés cambiarla. Podés subir una para el modo claro y otra para el oscuro.',
          'Everyone sees the image, but only you can change it. Upload one for light mode and one for dark mode.',
        )}
      </p>
      <Slot
        label={t('Modo claro ☀️', 'Light mode ☀️')}
        value={light}
        bg="#FBF6EA"
        onPick={(f) => pick('light', f)}
        onClear={() => setLight(null)}
      />
      <div className="h-4" />
      <Slot
        label={t('Modo oscuro 🌙', 'Dark mode 🌙')}
        value={dark}
        bg="#191309"
        onPick={(f) => pick('dark', f)}
        onClear={() => setDark(null)}
      />

      <div className="mt-5">
        <div className="text-xs font-semibold mb-1.5" style={{ color: c.text }}>
          {t('Tamaño de la barra de arriba', 'Top bar size')}
        </div>
        <div className="flex gap-2">
          {SIZE_OPTS.map((o) => {
            const active = Math.abs(scale - o.v) < 0.01
            return (
              <button
                key={o.v}
                onClick={() => setScale(o.v)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={
                  active
                    ? { background: '#2F6DF0', color: '#fff', border: '1px solid #2F6DF0' }
                    : { color: c.muted, border: '1px solid ' + c.line }
                }
              >
                {t(o.es, o.en)}
              </button>
            )
          })}
        </div>
      </div>

      {err && (
        <p className="text-xs mt-3" style={{ color: '#E5322B' }}>
          {err}
        </p>
      )}
    </Modal>
  )
}

function Slot({
  label,
  value,
  bg,
  onPick,
  onClear,
}: {
  label: string
  value: string | null
  bg: string
  onPick: (file: File | undefined) => void
  onClear: () => void
}) {
  const { t } = useT()
  const { c } = useTheme()
  return (
    <div>
      <div className="text-xs font-semibold mb-1.5" style={{ color: c.text }}>
        {label}
      </div>
      <div className="flex items-center gap-3">
        <div
          className="rounded-xl flex items-center justify-center"
          style={{ width: 132, height: 64, flex: 'none', background: bg, border: '1px solid ' + c.line, overflow: 'hidden' }}
        >
          {value ? (
            <img src={value} alt="" style={{ maxWidth: '88%', maxHeight: '82%', objectFit: 'contain' }} />
          ) : (
            <span className="text-[10px]" style={{ color: '#9b8d6e' }}>
              {t('sin imagen', 'no image')}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer text-center"
            style={{ background: 'rgba(47,109,240,.12)', color: '#2F6DF0', border: '1px solid ' + c.line }}
          >
            {value ? t('Cambiar', 'Replace') : t('Subir imagen', 'Upload image')}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                onPick(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </label>
          {value && (
            <button onClick={onClear} className="text-[11px] font-medium" style={{ color: c.muted }}>
              {t('Quitar', 'Remove')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
