import { useTheme, ACCENT } from '../theme'

export interface SegOption {
  key: string
  label: string
  icon?: string
}

/**
 * Control segmentado reutilizable (mismo look que el toggle de arriba
 * Resultados/Predicción/What-if): una píldora contenedora con N segmentos; el
 * activo va relleno con el color de acento. `block` lo hace ocupar todo el ancho.
 */
export function SegToggle({
  options,
  value,
  onChange,
  accent = ACCENT.blue,
  block = false,
  size = 'md',
}: {
  options: SegOption[]
  value: string
  onChange: (key: string) => void
  accent?: string
  block?: boolean
  size?: 'sm' | 'md'
}) {
  const { c, dark } = useTheme()
  return (
    <div className={block ? 'flex w-full' : 'inline-flex'} style={{ maxWidth: '100%', overflowX: 'auto' }}>
      <div
        className={(block ? 'flex w-full ' : 'inline-flex ') + 'p-1 rounded-full'}
        style={{ background: dark ? 'rgba(0,0,0,.3)' : 'rgba(0,0,0,.05)', border: '1px solid ' + c.line, boxShadow: c.shadow }}
      >
        {options.map((o) => {
          const on = value === o.key
          return (
            <button
              key={o.key}
              onClick={() => onChange(o.key)}
              style={{
                flex: block ? 1 : 'none',
                display: 'flex',
                minWidth: 0,
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontFamily: "'Archivo'",
                fontSize: size === 'sm' ? '12px' : '13px',
                fontWeight: 800,
                cursor: 'pointer',
                padding: size === 'sm' ? '7px 12px' : '8px 16px',
                borderRadius: '99px',
                border: 'none',
                whiteSpace: 'nowrap',
                transition: 'all .18s ease',
                color: on ? '#fff' : c.muted,
                background: on ? accent : 'transparent',
                boxShadow: on ? '0 6px 16px -8px ' + accent : 'none',
              }}
            >
              {o.icon && <span style={{ fontSize: '11px' }}>{o.icon}</span>} {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
