import { useEffect, useState } from 'react'
import { fetchBranding, DEFAULT_BRANDING, type Branding } from './remote'

/**
 * Trae (una vez) la imagen + escala compartida del encabezado desde Supabase.
 * Devuelve el estado y un setter para reflejar al instante lo que guarda el
 * admin sin tener que recargar.
 */
export function useBranding(): [Branding, (b: Branding) => void] {
  const [branding, setBranding] = useState<Branding>(DEFAULT_BRANDING)
  useEffect(() => {
    let cancelled = false
    fetchBranding()
      .then((b) => {
        if (!cancelled && b) setBranding({ ...DEFAULT_BRANDING, ...b })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])
  return [branding, setBranding]
}
