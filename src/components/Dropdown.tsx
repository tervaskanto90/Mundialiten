import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTheme } from '../theme'

export interface DropOption<T> {
  value: T
  label: React.ReactNode
}

/**
 * Desplegable propio (reemplaza al <select> nativo, que ignora la fuente de
 * banderas y se ve gris/desentonado en modo oscuro). Renderiza con la fuente de
 * la app, así las banderas salen bien, y respeta el tema.
 */
export function Dropdown<T extends string | number>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T
  onChange: (v: T) => void
  options: DropOption<T>[]
  ariaLabel?: string
}) {
  const { c, dark } = useTheme()
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<{ left: number; top: number; width: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const toggle = () => {
    const el = btnRef.current
    if (el) {
      const r = el.getBoundingClientRect()
      setRect({ left: r.left, top: r.bottom + 6, width: r.width })
    }
    setOpen((o) => !o)
  }

  const cur = options.find((o) => o.value === value)
  const trigger: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: '12px',
    fontWeight: 700,
    fontFamily: "'Archivo'",
    cursor: 'pointer',
    padding: '7px 12px',
    borderRadius: '10px',
    color: c.text,
    background: dark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.04)',
    border: '1px solid ' + c.line,
    maxWidth: '100%',
  }

  return (
    <>
      <button ref={btnRef} type="button" onClick={toggle} aria-label={ariaLabel} style={trigger}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cur?.label}</span>
        <span style={{ flex: 'none', opacity: 0.6, fontSize: 10 }}>▾</span>
      </button>
      {open &&
        rect &&
        createPortal(
          <>
            <div className="fixed inset-0" style={{ zIndex: 60 }} onClick={() => setOpen(false)} />
            <div
              style={{
                position: 'fixed',
                top: rect.top,
                left: rect.left,
                minWidth: Math.max(rect.width, 240),
                maxWidth: 'min(88vw, 380px)',
                maxHeight: '60vh',
                overflowY: 'auto',
                zIndex: 61,
                borderRadius: 12,
                padding: 4,
                background: dark ? '#241B0E' : '#FFFDF6',
                border: '1px solid ' + c.line,
                boxShadow: '0 18px 50px -12px rgba(0,0,0,.55)',
                animation: 'mdlUp .16s ease both',
              }}
            >
              {options.map((o) => {
                const on = o.value === value
                return (
                  <button
                    key={String(o.value)}
                    type="button"
                    onClick={() => {
                      onChange(o.value)
                      setOpen(false)
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      whiteSpace: 'nowrap',
                      fontSize: '12.5px',
                      fontWeight: on ? 800 : 600,
                      fontFamily: "'Archivo'",
                      cursor: 'pointer',
                      padding: '8px 10px',
                      borderRadius: 8,
                      color: c.text,
                      background: on ? (dark ? 'rgba(47,109,240,.22)' : 'rgba(47,109,240,.12)') : 'transparent',
                    }}
                  >
                    {o.label}
                  </button>
                )
              })}
            </div>
          </>,
          document.body,
        )}
    </>
  )
}
