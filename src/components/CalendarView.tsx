import { useMemo, useState } from 'react'
import { MATCHES, STAGE_LABELS } from '../data/schedule'
import type { StageId } from '../types'
import { MatchRow } from './MatchRow'
import { formatDate } from '../utils/labels'
import type { ActiveContext } from '../hooks'

interface Props {
  ctx: ActiveContext
  onEdit: (matchId: number) => void
}

type Filter = 'all' | StageId

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'group', label: 'Grupos' },
  { id: 'r32', label: 'Dieciseisavos' },
  { id: 'r16', label: 'Octavos' },
  { id: 'qf', label: 'Cuartos' },
  { id: 'sf', label: 'Semis' },
  { id: 'final', label: 'Final' },
]

export function CalendarView({ ctx, onEdit }: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const [onlyPending, setOnlyPending] = useState(false)

  const filtered = useMemo(() => {
    return MATCHES.filter((m) => {
      if (filter === 'final') {
        if (m.stage !== 'final' && m.stage !== 'third') return false
      } else if (filter !== 'all' && m.stage !== filter) {
        return false
      }
      if (onlyPending && ctx.results[m.id]?.played) return false
      return true
    })
  }, [filter, onlyPending, ctx.results])

  const byDate = useMemo(() => {
    const map = new Map<string, typeof MATCHES>()
    for (const m of filtered) {
      if (!map.has(m.date)) map.set(m.date, [])
      map.get(m.date)!.push(m)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  const playedCount = MATCHES.filter((m) => ctx.results[m.id]?.played).length

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
              filter === f.id ? 'bg-pitch-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {f.label}
          </button>
        ))}
        <button
          onClick={() => setOnlyPending((v) => !v)}
          className={`ml-auto px-3 py-1.5 rounded-full text-xs font-medium transition ${
            onlyPending ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          {onlyPending ? '⏳ Sólo pendientes' : 'Mostrar todos'}
        </button>
      </div>

      <div className="text-xs text-slate-500 mb-3">
        {playedCount}/{MATCHES.length} partidos cargados en «{ctx.scenario.name}»
      </div>

      <div className="space-y-5">
        {byDate.map(([date, matches]) => (
          <div key={date}>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-semibold text-slate-300 capitalize">{formatDate(date)}</h3>
              <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                {STAGE_LABELS[matches[0].stage]}
              </span>
            </div>
            <div className="space-y-1.5">
              {matches.map((m) => (
                <MatchRow key={m.id} matchId={m.id} ctx={ctx} onEdit={onEdit} />
              ))}
            </div>
          </div>
        ))}
        {byDate.length === 0 && (
          <p className="text-center text-slate-500 py-10 text-sm">No hay partidos para este filtro.</p>
        )}
      </div>
    </div>
  )
}
