import { useState } from 'react'
import { CalendarView } from './CalendarView'
import { GroupsView } from './GroupsView'
import { BracketView } from './BracketView'
import type { ActiveContext } from '../hooks'
import { useT } from '../i18n'
import { useTheme } from '../theme'

type Sub = 'calendario' | 'grupos' | 'llaves'

const TABS: { id: Sub; es: string; en: string; icon: string }[] = [
  { id: 'calendario', es: 'Partidos', en: 'Matches', icon: '🗓️' },
  { id: 'grupos', es: 'Tablas', en: 'Tables', icon: '📊' },
  { id: 'llaves', es: 'Llaves', en: 'Bracket', icon: '🗝️' },
]

/**
 * Sección "Fixture y Tablas": reúne Calendario, Grupos y Llaves en sub-pestañas.
 * Las tres conviven con el escenario activo (resultados / predicción / what-if),
 * que se elige con el toggle de arriba.
 */
export function FixtureView({ ctx, onEdit }: { ctx: ActiveContext; onEdit: (id: number) => void }) {
  const [sub, setSub] = useState<Sub>('calendario')
  const { lang } = useT()
  const { c, dark } = useTheme()

  const tabStyle = (active: boolean): React.CSSProperties => ({
    fontFamily: "'Archivo'",
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    padding: '9px 16px',
    borderRadius: '99px',
    whiteSpace: 'nowrap',
    transition: 'all .18s ease',
    color: active ? (dark ? '#0C0904' : '#FBF6EA') : c.text,
    background: active ? c.text : dark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.04)',
    border: '1px solid ' + (active ? c.text : c.line),
  })

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {TABS.map((tb) => (
          <button key={tb.id} onClick={() => setSub(tb.id)} style={tabStyle(sub === tb.id)}>
            {tb.icon} {lang === 'en' ? tb.en : tb.es}
          </button>
        ))}
      </div>
      <div key={sub} style={{ animation: 'mdlUp .22s ease both' }}>
        {sub === 'calendario' && <CalendarView ctx={ctx} onEdit={onEdit} />}
        {sub === 'grupos' && <GroupsView ctx={ctx} />}
        {sub === 'llaves' && <BracketView ctx={ctx} onEdit={onEdit} />}
      </div>
    </div>
  )
}
