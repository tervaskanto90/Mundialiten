import { type ReactNode, useEffect } from 'react'

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}

export function Modal({ title, onClose, children, footer, wide }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className={`bg-slate-900 border border-white/10 w-full ${
          wide ? 'sm:max-w-2xl' : 'sm:max-w-md'
        } sm:rounded-2xl rounded-t-2xl max-h-[92vh] flex flex-col shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 className="font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white w-8 h-8 rounded-lg hover:bg-white/10"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-4 flex-1">{children}</div>
        {footer && <div className="px-4 py-3 border-t border-white/10">{footer}</div>}
      </div>
    </div>
  )
}
