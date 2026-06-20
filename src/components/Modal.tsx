import { type ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTheme } from '../theme'

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}

export function Modal({ title, onClose, children, footer, wide }: Props) {
  const { c, dark } = useTheme()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Portal al body: evita que un ancestro con transform/backdrop-filter (el
  // header) rompa el position:fixed y mande el modal fuera de la pantalla.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      style={{ background: 'rgba(16,12,6,.62)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className={`w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'} rounded-[22px] max-h-[88vh] flex flex-col`}
        style={{
          background: dark ? 'linear-gradient(160deg,#241B0E,#191309)' : 'linear-gradient(160deg,#FFFDF6,#F6EEDA)',
          border: '1px solid ' + c.line,
          color: c.text,
          boxShadow: '0 30px 70px -20px rgba(0,0,0,.6)',
          animation: 'mdlModalIn .28s cubic-bezier(.34,1.4,.64,1) both',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid ' + c.line }}>
          <h2 className="font-bold" style={{ fontFamily: "'Archivo'", color: c.text }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg"
            style={{ color: c.muted, border: '1px solid ' + c.line, background: dark ? 'rgba(0,0,0,.3)' : 'rgba(0,0,0,.04)' }}
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-4 flex-1">{children}</div>
        {footer && (
          <div className="px-4 py-3" style={{ borderTop: '1px solid ' + c.line }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
