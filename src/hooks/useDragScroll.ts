import { useRef } from 'react'

/**
 * Scroll horizontal arrastrable con el mouse (grab) + helper para botones ◀▶.
 * El arrastre es sólo con mouse (en touch se usa el scroll nativo). Tras
 * arrastrar, anula el click siguiente para no disparar links/botones de adentro.
 */
export function useDragScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const drag = useRef({ down: false, moved: false, x: 0, left: 0 })
  const justDragged = useRef(false)

  const onPointerDown = (e: React.PointerEvent) => {
    const el = ref.current
    if (!el || e.button !== 0 || e.pointerType !== 'mouse') return
    drag.current = { down: true, moved: false, x: e.clientX, left: el.scrollLeft }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const el = ref.current
    const d = drag.current
    if (!el || !d.down) return
    const dx = e.clientX - d.x
    if (!d.moved && Math.abs(dx) < 6) return
    if (!d.moved) {
      d.moved = true
      el.style.cursor = 'grabbing'
      el.setPointerCapture?.(e.pointerId)
    }
    el.scrollLeft = d.left - dx
  }
  const onPointerUp = () => {
    const el = ref.current
    const d = drag.current
    if (el && d.moved) {
      justDragged.current = true
      el.style.cursor = 'grab'
      setTimeout(() => (justDragged.current = false), 60)
    }
    d.down = false
    d.moved = false
  }
  const onClickCapture = (e: React.MouseEvent) => {
    if (justDragged.current) {
      e.preventDefault()
      e.stopPropagation()
    }
  }
  const nudge = (dir: 1 | -1) => {
    const el = ref.current
    if (el) el.scrollBy({ left: dir * Math.max(300, el.clientWidth * 0.8), behavior: 'smooth' })
  }

  return {
    ref,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerLeave: onPointerUp, onClickCapture },
    nudge,
  }
}
