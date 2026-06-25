import { useState } from 'react'
import { CalendarView } from './CalendarView'
import { GroupsView } from './GroupsView'
import { BracketView } from './BracketView'
import { SegToggle } from './SegToggle'
import type { ActiveContext } from '../hooks'
import { useT } from '../i18n'
import { useIsDesktop } from '../hooks/useIsDesktop'

type Sub = 'calendario' | 'grupos' | 'llaves'

const TABS: { id: Sub; es: string; en: string; icon: string }[] = [
  { id: 'calendario', es: 'Partidos', en: 'Matches', icon: '🗓️' },
  { id: 'grupos', es: 'Tablas', en: 'Tables', icon: '📊' },
  { id: 'llaves', es: 'Llaves', en: 'Bracket', icon: '🗝️' },
]

/**
 * Sección "Predicciones, Calendario y Tablas": reúne Calendario, Grupos y Llaves
 * en sub-pestañas. Las tres conviven con el escenario activo (resultados /
 * predicción / what-if), que se elige con el toggle de arriba.
 */
export function FixtureView({ ctx, onEdit }: { ctx: ActiveContext; onEdit: (id: number) => void }) {
  const [sub, setSub] = useState<Sub>('calendario')
  const { lang } = useT()
  const isDesktop = useIsDesktop()

  return (
    <div>
      <div className={(isDesktop ? 'flex justify-center' : '') + ' mb-4'}>
        <SegToggle
          block={!isDesktop}
          options={TABS.map((tb) => ({ key: tb.id, icon: tb.icon, label: lang === 'en' ? tb.en : tb.es }))}
          value={sub}
          onChange={(k) => setSub(k as Sub)}
        />
      </div>
      <div key={sub} style={{ animation: 'mdlUp .22s ease both' }}>
        {sub === 'calendario' && <CalendarView ctx={ctx} onEdit={onEdit} />}
        {sub === 'grupos' && <GroupsView ctx={ctx} />}
        {sub === 'llaves' && <BracketView ctx={ctx} onEdit={onEdit} />}
      </div>
    </div>
  )
}
