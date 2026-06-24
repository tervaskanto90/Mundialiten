import { Emblem } from './Emblem'
import { useTheme } from '../theme'
import { type Branding } from '../lib/remote'

/**
 * Imagen del encabezado, centrada a la izquierda. Muestra la imagen subida para
 * el tema actual (claro/oscuro) y, si no hay, cae al escudo por defecto.
 * `size` ya viene escalado desde App.
 */
export function HeaderBrand({
  branding,
  size = 58,
  onClick,
}: {
  branding: Branding
  size?: number
  onClick?: () => void
}) {
  const { dark } = useTheme()
  const current = dark ? branding.dark : branding.light

  // Caja CUADRADA fija (size × size), idéntica en claro y oscuro: la imagen se
  // mete con object-fit contain, así el logo y el título quedan SIEMPRE en el
  // mismo lugar, sin importar el ancho de cada imagen.
  return (
    <div
      onClick={onClick}
      style={{ width: size, height: size, flex: 'none', position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: onClick ? 'pointer' : undefined }}
    >
      {current ? (
        <img
          src={current}
          alt="Mundialiten"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            objectPosition: 'center',
            display: 'block',
            filter: 'drop-shadow(0 4px 10px rgba(124,63,242,.35))',
          }}
        />
      ) : (
        <div style={{ width: size, height: size, filter: 'drop-shadow(0 4px 10px rgba(124,63,242,.4))' }}>
          <Emblem size={size} />
        </div>
      )}
    </div>
  )
}
