import { type ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTheme } from '../theme'

/** Panel lateral (menú hamburguesa). Entra desde la izquierda. `footer` queda
 *  fijo abajo de todo (lo usamos para el sincronizador en vivo). */
export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  footer?: ReactNode
}) {
  const { c, dark } = useTheme()
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50"
      style={{ background: 'rgba(16,12,6,.55)', backdropFilter: 'blur(3px)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: '83%',
          maxWidth: 320,
          background: dark ? 'linear-gradient(160deg,#241B0E,#191309)' : 'linear-gradient(160deg,#FFFDF6,#F6EEDA)',
          borderRight: '1px solid ' + c.line,
          boxShadow: '0 0 60px -8px rgba(0,0,0,.6)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'mdlDrawerIn .26s cubic-bezier(.4,1.15,.5,1) both',
          overflow: 'hidden',
        }}
      >
        <div style={{ height: 4, flex: 'none', background: 'linear-gradient(90deg,#2F6DF0,#7B3FF2,#EC1C7D,#FF7A1A,#FFC21A,#1FA85C)' }} />
        <div className="flex items-center justify-between px-4 py-3" style={{ flex: 'none', borderBottom: '1px solid ' + c.line }}>
          <span className="font-bold" style={{ fontFamily: "'Archivo'", color: c.text }}>
            {title}
          </span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ color: c.muted, border: '1px solid ' + c.line, background: dark ? 'rgba(0,0,0,.3)' : 'rgba(0,0,0,.04)' }}
          >
            ✕
          </button>
        </div>
        <div className="px-4 py-4" style={{ flex: '1 1 auto', overflowY: 'auto' }}>{children}</div>
        {footer && (
          <div className="px-4 py-3" style={{ flex: 'none', borderTop: '1px solid ' + c.line }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
