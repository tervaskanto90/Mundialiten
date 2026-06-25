import { useEffect, useRef } from 'react'

interface Piece {
  x: number
  y: number
  w: number
  h: number
  color: string
  rot: number
  vrot: number
  vy: number
  sway: number
  swaySpeed: number
  phase: number
}

/**
 * Lluvia de papel picado / confeti a pantalla completa (canvas), con los colores
 * que se le pasen (los de la bandera del campeón). Corre una ráfaga de unos
 * segundos y termina sola. No intercepta clicks.
 */
export function Confetti({ colors, durationMs = 10000 }: { colors: string[]; durationMs?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const palette = colors.length ? colors : ['#FFC21A', '#1FA85C', '#2F6DF0', '#E5322B']

    let W = 0
    let H = 0
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const resize = () => {
      W = window.innerWidth
      H = window.innerHeight
      canvas.width = W * dpr
      canvas.height = H * dpr
      canvas.style.width = W + 'px'
      canvas.style.height = H + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const rand = (a: number, b: number) => a + Math.random() * (b - a)
    const spawn = (top = false): Piece => ({
      x: rand(0, W),
      y: top ? rand(-120, -10) : rand(-H, 0),
      w: rand(7, 13),
      h: rand(10, 20),
      color: palette[Math.floor(Math.random() * palette.length)],
      rot: rand(0, Math.PI * 2),
      vrot: rand(-0.24, 0.24),
      vy: rand(1.8, 4.6),
      sway: rand(12, 34),
      swaySpeed: rand(0.01, 0.05),
      phase: rand(0, Math.PI * 2),
    })

    const COUNT = 340
    const pieces: Piece[] = Array.from({ length: COUNT }, () => spawn(false))

    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const elapsed = now - start
      ctx.clearRect(0, 0, W, H)
      let onScreen = 0
      const fade = elapsed > durationMs ? Math.max(0, 1 - (elapsed - durationMs) / 1500) : 1
      for (const p of pieces) {
        p.phase += p.swaySpeed
        p.y += p.vy
        p.x += Math.sin(p.phase) * p.sway * 0.06
        p.rot += p.vrot
        if (p.y > H + 24) {
          if (elapsed < durationMs) Object.assign(p, spawn(true))
          else continue
        }
        onScreen++
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.globalAlpha = fade
        ctx.fillStyle = p.color
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
      }
      if (elapsed < durationMs + 1600 && onScreen > 0) {
        raf = requestAnimationFrame(tick)
      } else {
        ctx.clearRect(0, 0, W, H)
      }
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [colors, durationMs])

  return <canvas ref={ref} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 80 }} aria-hidden />
}
