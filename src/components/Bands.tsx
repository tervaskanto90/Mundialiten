import { PAL } from '../theme'

const RADII = ['100% 0 0 0', '0 100% 0 0', '0 0 100% 0', '0 0 0 100%', '0', '100%', '0', '0 100% 100% 0']

function cells(offset: number) {
  const out = []
  for (let i = 0; i < 16; i++) {
    out.push({
      bg: PAL[(i + offset) % PAL.length],
      radius: RADII[(i + offset) % RADII.length],
    })
  }
  return out
}

// Línea fina vertical con todos los colores de la paleta (para mobile, donde no
// entra el mosaico ancho pero queremos conservar el acento de color a los lados).
const THIN_GRAD =
  'linear-gradient(180deg,' +
  PAL.map((p, i) => `${p} ${Math.round((i / PAL.length) * 100)}%`).join(',') +
  ',' +
  PAL[0] +
  ' 100%)'

/** Banda lateral de mosaico multicolor (decorativa). En `thin` es una línea
 *  finita (mobile). */
export function Band({ offset, dark, thin }: { offset: number; dark: boolean; thin?: boolean }) {
  if (thin) {
    return (
      <aside
        aria-hidden
        style={{
          width: 6,
          flex: 'none',
          alignSelf: 'stretch',
          background: THIN_GRAD,
          opacity: dark ? 0.85 : 1,
        }}
      />
    )
  }
  return (
    <aside
      aria-hidden
      style={{
        flex: '1 1 0',
        minWidth: 0,
        alignSelf: 'stretch',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        opacity: dark ? 0.9 : 1,
      }}
    >
      {cells(offset).map((c, i) => (
        <div
          key={i}
          style={{
            width: '100%',
            aspectRatio: '1',
            flex: 'none',
            background: c.bg,
            borderRadius: c.radius,
          }}
        />
      ))}
    </aside>
  )
}
