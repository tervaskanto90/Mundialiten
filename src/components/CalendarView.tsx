import { useMemo, useState } from 'react'
import { MATCHES, STAGE_I18N } from '../data/schedule'
import type { StageId } from '../types'
import { MatchRow } from './MatchRow'
import { formatDate, matchDateKey } from '../utils/labels'
import type { ActiveContext } from '../hooks'
import { useT } from '../i18n'
import { activeBucket, type BucketId } from '../utils/stage'

const BUCKET_LABEL: Record<BucketId, { es: string; en: string }> = {
  group: { es: 'Fase de grupos', en: 'Group stage' },
  r32: { es: 'Dieciseisavos', en: 'Round of 32' },
  r16: { es: 'Octavos', en: 'Round of 16' },
  qf: { es: 'Cuartos', en: 'Quarter-finals' },
  finals: { es: 'Semifinal, final y 3er puesto', en: 'Semi-finals, final & third place' },
}

interface Props {
  ctx: ActiveContext
  onEdit: (matchId: number) => void
}

type Filter = 'all' | StageId

const FILTERS: { id: Filter; es: string; en: string }[] = [
  { id: 'all', es: 'Todos', en: 'All' },
  { id: 'group', es: 'Grupos', en: 'Groups' },
  { id: 'r32', es: 'Dieciseisavos', en: 'Round of 32' },
  { id: 'r16', es: 'Octavos', en: 'Round of 16' },
  { id: 'qf', es: 'Cuartos', en: 'Quarters' },
  { id: 'sf', es: 'Semis', en: 'Semis' },
  { id: 'final', es: 'Final', en: 'Final' },
]

export function CalendarView({ ctx, onEdit }: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const [onlyPending, setOnlyPending] = useState(false)
  const { t, lang } = useT()

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
      const key = matchDateKey(m)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(m)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  const playedCount = MATCHES.filter((m) => ctx.results[m.id]?.played).length
  const openBucket = activeBucket()

  return (
    <div>
      {ctx.scenario.type === 'prediction' && (
        <div className="bg-pitch-500/10 border border-pitch-500/30 rounded-xl px-3 py-2 mb-3 text-xs text-slate-200">
          {openBucket ? (
            <>
              📣 {t('Etapa abierta para predecir:', 'Open stage to predict:')}{' '}
              <strong>{t(BUCKET_LABEL[openBucket].es, BUCKET_LABEL[openBucket].en)}</strong>.{' '}
              <span className="text-slate-400">
                {t(
                  'Sólo se predice la etapa en curso (cada partido, hasta 5 min antes). Las demás se abren a medida que avanza el Mundial.',
                  'Only the current stage can be predicted (each match, until 5 min before). The others open as the World Cup advances.',
                )}
              </span>
            </>
          ) : (
            <span className="text-slate-400">
              {t('El Mundial terminó: ya no se aceptan predicciones.', 'The World Cup is over: predictions are closed.')}
            </span>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
              filter === f.id ? 'bg-pitch-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {lang === 'en' ? f.en : f.es}
          </button>
        ))}
        <button
          onClick={() => setOnlyPending((v) => !v)}
          className={`ml-auto px-3 py-1.5 rounded-full text-xs font-medium transition ${
            onlyPending ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          {onlyPending ? t('⏳ Sólo pendientes', '⏳ Only pending') : t('Mostrar todos', 'Show all')}
        </button>
      </div>

      <div className="text-xs text-slate-500 mb-3">
        {playedCount}/{MATCHES.length}{' '}
        {t(`partidos cargados en «${ctx.scenario.name}»`, `matches set in “${ctx.scenario.name}”`)}
      </div>

      <div className="space-y-5">
        {byDate.map(([date, matches]) => (
          <div key={date}>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-semibold text-slate-300 capitalize">{formatDate(date, lang)}</h3>
              <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                {t(STAGE_I18N[matches[0].stage].es, STAGE_I18N[matches[0].stage].en)}
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
          <p className="text-center text-slate-500 py-10 text-sm">
            {t('No hay partidos para este filtro.', 'No matches for this filter.')}
          </p>
        )}
      </div>
    </div>
  )
}
