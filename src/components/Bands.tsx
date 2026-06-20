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

/** Banda lateral de mosaico multicolor (decorativa). */
export function Band({ offset, dark }: { offset: number; dark: boolean }) {
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
