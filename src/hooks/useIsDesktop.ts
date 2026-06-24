import { useEffect, useState } from 'react'

/** ≥980px = layout de escritorio con sidebar (umbral del handoff de diseño). */
export function useIsDesktop(breakpoint = 980): boolean {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= breakpoint : true,
  )
  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= breakpoint)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [breakpoint])
  return isDesktop
}
