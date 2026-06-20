import { useEffect } from 'react'
import { useTheme } from '../theme'

export interface MenuItem {
  label: string
  icon: string
  onClick: () => void
}

interface Props {
  x: number
  y: number
  items: MenuItem[]
  onClose: () => void
  title?: string
}

export function ContextMenu({ x, y, items, onClose, title }: Props) {
  const { c } = useTheme()
  useEffect(() => {
    const close = () => onClose()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    // Demoramos los listeners de cierre por click/contextmenu/scroll para que el
    // mismo gesto que abre el menú (toque o clic derecho) no lo cierre al instante.
    const id = setTimeout(() => {
      window.addEventListener('click', close)
      window.addEventListener('contextmenu', close)
      window.addEventListener('scroll', close, true)
    }, 0)
    return () => {
      clearTimeout(id)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('click', close)
      window.removeEventListener('contextmenu', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [onClose])

  // Evitar que se salga de la pantalla.
  const left = Math.min(x, window.innerWidth - 200)
  const top = Math.min(y, window.innerHeight - (items.length * 40 + 40))

  return (
    <div
      className="fixed z-[60] min-w-[190px] rounded-xl shadow-2xl overflow-hidden py-1"
      style={{ left, top, background: c.surface, border: '1px solid ' + c.line, color: c.text, boxShadow: c.shadow }}
      onClick={(e) => e.stopPropagation()}
    >
      {title && (
        <div
          className="px-3 py-1.5 text-[11px] truncate"
          style={{ color: c.muted, borderBottom: '1px solid ' + c.line }}
        >
          {title}
        </div>
      )}
      {items.map((it, i) => (
        <button
          key={i}
          onClick={() => {
            it.onClick()
            onClose()
          }}
          className="w-full text-left px-3 py-2 text-sm hover:bg-black/5 flex items-center gap-2.5"
          style={{ color: c.text }}
        >
          <span>{it.icon}</span>
          {it.label}
        </button>
      ))}
    </div>
  )
}
