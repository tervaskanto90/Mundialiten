import { useEffect, useMemo, useState } from 'react'
import { MATCHES, STAGE_I18N } from '../data/schedule'
import { GROUPS } from '../data/teams'
import type { StageId } from '../types'
import { MatchRow } from './MatchRow'
import { LiveBanner } from './LiveBanner'
import { formatDate, matchDateKey } from '../utils/labels'
import type { ActiveContext } from '../hooks'
import { useT } from '../i18n'
import { activeBucket, type BucketId } from '../utils/stage'
import { useTheme, ACCENT } from '../theme'

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
type ViewMode = 'calendar' | 'groups'

const FILTERS: { id: Filter; es: string; en: string }[] = [
  { id: 'all', es: 'Todos', en: 'All' },
  { id: 'group', es: 'Grupos', en: 'Groups' },
  { id: 'r32', es: 'Dieciseisavos', en: 'Round of 32' },
  { id: 'r16', es: 'Octavos', en: 'Round of 16' },
  { id: 'qf', es: 'Cuartos', en: 'Quarters' },
  { id: 'sf', es: 'Semis', en: 'Semis' },
  { id: 'final', es: 'Final', en: 'Final' },
]

// Orden de las etapas de eliminación para la vista por grupos.
const KO_ORDER: StageId[] = ['r32', 'r16', 'qf', 'sf', 'third', 'final']

export function CalendarView({ ctx, onEdit }: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const [onlyPending, setOnlyPending] = useState(false)
  const [view, setView] = useState<ViewMode>(
    () => (typeof localStorage !== 'undefined' && localStorage.getItem('mundi-calview') === 'groups' ? 'groups' : 'calendar'),
  )
  const { t, lang } = useT()
  const { c, dark } = useTheme()

  useEffect(() => {
    try {
      localStorage.setItem('mundi-calview', view)
    } catch {
      /* ignore */
    }
  }, [view])

  const isPending = (id: number) => !ctx.results[id]?.played

  // Vista calendario: lista cronológica filtrada por etapa.
  const filtered = useMemo(() => {
    return MATCHES.filter((m) => {
      if (filter === 'final') {
        if (m.stage !== 'final' && m.stage !== 'third') return false
      } else if (filter !== 'all' && m.stage !== filter) {
        return false
      }
      if (onlyPending && !isPending(m.id)) return false
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
    for (const arr of map.values()) arr.sort((a, b) => Date.parse(a.kickoff) - Date.parse(b.kickoff))
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  const byKickoff = (a: (typeof MATCHES)[number], b: (typeof MATCHES)[number]) =>
    Date.parse(a.kickoff) - Date.parse(b.kickoff)
  const groupSections = useMemo(
    () =>
      GROUPS.map((g) => ({
        key: g,
        title: `${lang === 'en' ? 'Group' : 'Grupo'} ${g}`,
        matches: MATCHES.filter((m) => m.stage === 'group' && m.group === g && (!onlyPending || isPending(m.id))).sort(byKickoff),
      })),
    [onlyPending, ctx.results, lang],
  )
  const koSections = useMemo(
    () =>
      KO_ORDER.map((st) => ({
        key: st,
        title: lang === 'en' ? STAGE_I18N[st].en : STAGE_I18N[st].es,
        matches: MATCHES.filter((m) => m.stage === st && (!onlyPending || isPending(m.id))).sort(byKickoff),
      })).filter((s) => s.matches.length > 0),
    [onlyPending, ctx.results, lang],
  )

  const playedCount = MATCHES.filter((m) => ctx.results[m.id]?.played).length
  const openBucket = activeBucket()

  // Píldora de filtro/toggle reutilizable.
  const pill = (active: boolean, accent: string = ACCENT.blue): React.CSSProperties => ({
    fontSize: '12px',
    fontWeight: 700,
    fontFamily: "'Archivo'",
    cursor: 'pointer',
    padding: '7px 14px',
    borderRadius: '99px',
    whiteSpace: 'nowrap',
    transition: 'all .18s ease',
    color: active ? '#fff' : c.text,
    background: active ? accent : dark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.04)',
    border: '1px solid ' + (active ? accent : c.line),
  })

  return (
    <div>
      {ctx.scenario.type === 'real' && <LiveBanner realResults={ctx.real.results} />}
      {ctx.scenario.type === 'prediction' && (
        <div
          className="rounded-xl px-3 py-2 mb-3 text-xs"
          style={{ background: dark ? 'rgba(47,109,240,.14)' : 'rgba(47,109,240,.10)', border: '1px solid rgba(47,109,240,.30)', color: c.text }}
        >
          {openBucket ? (
            <>
              📣 {t('Etapa abierta para predecir:', 'Open stage to predict:')}{' '}
              <strong>{t(BUCKET_LABEL[openBucket].es, BUCKET_LABEL[openBucket].en)}</strong>.{' '}
              <span style={{ color: c.muted }}>
                {t(
                  'Sólo se predice la etapa en curso (cada partido, hasta 5 min antes). Las demás se abren a medida que avanza el Mundial.',
                  'Only the current stage can be predicted (each match, until 5 min before). The others open as the World Cup advances.',
                )}
              </span>
            </>
          ) : (
            <span style={{ color: c.muted }}>
              {t('El Mundial terminó: ya no se aceptan predicciones.', 'The World Cup is over: predictions are closed.')}
            </span>
          )}
        </div>
      )}

      {/* Cambio de vista: Calendario ↔ Grupos */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="inline-flex gap-1.5">
          <button onClick={() => setView('calendar')} style={pill(view === 'calendar')}>
            🗓️ {t('Calendario', 'Calendar')}
          </button>
          <button onClick={() => setView('groups')} style={pill(view === 'groups')}>
            🗂️ {t('Grupos', 'Groups')}
          </button>
        </div>
        <button onClick={() => setOnlyPending((v) => !v)} style={pill(onlyPending, ACCENT.gold)}>
          {onlyPending ? t('⏳ Sólo pendientes', '⏳ Only pending') : t('Mostrar todos', 'Show all')}
        </button>
      </div>

      {/* Filtros por etapa: sólo en la vista calendario. */}
      {view === 'calendar' && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {FILTERS.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={pill(filter === f.id)}>
              {lang === 'en' ? f.en : f.es}
            </button>
          ))}
        </div>
      )}

      <div className="text-xs mb-3" style={{ color: c.faint, fontWeight: 600 }}>
        {playedCount}/{MATCHES.length}{' '}
        {t(`partidos cargados en «${ctx.scenario.name}»`, `matches set in “${ctx.scenario.name}”`)}
      </div>

      {view === 'calendar' ? (
        <div className="space-y-5">
          {byDate.map(([date, matches]) => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm capitalize" style={{ fontFamily: "'Archivo'", fontWeight: 800, color: c.text }}>
                  {formatDate(date, lang)}
                </h3>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ color: c.muted, background: dark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.05)', fontWeight: 700 }}
                >
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
            <p className="text-center py-10 text-sm" style={{ color: c.faint }}>
              {t('No hay partidos para este filtro.', 'No matches for this filter.')}
            </p>
          )}
        </div>
      ) : (
        <div>
          <div className="grid lg:grid-cols-2 gap-3">
            {groupSections.map((s) => (
              <SectionCard key={s.key} title={s.title} matches={s.matches} ctx={ctx} onEdit={onEdit} />
            ))}
          </div>
          {koSections.length > 0 && (
            <>
              <h3 className="text-sm mt-5 mb-2" style={{ fontFamily: "'Archivo'", fontWeight: 800, color: c.text }}>
                {t('Eliminatorias', 'Knockouts')}
              </h3>
              <div className="grid lg:grid-cols-2 gap-3">
                {koSections.map((s) => (
                  <SectionCard key={s.key} title={s.title} matches={s.matches} ctx={ctx} onEdit={onEdit} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function SectionCard({
  title,
  matches,
  ctx,
  onEdit,
}: {
  title: string
  matches: typeof MATCHES
  ctx: ActiveContext
  onEdit: (matchId: number) => void
}) {
  const { t } = useT()
  const { c } = useTheme()
  return (
    <div
      className="rounded-2xl overflow-hidden self-start"
      style={{ background: c.cardGrad, border: '1px solid ' + c.line, boxShadow: c.shadow }}
    >
      <div className="px-3.5 py-2.5" style={{ fontFamily: "'Archivo'", fontWeight: 800, fontSize: '14px', color: c.text }}>
        {title}
      </div>
      <div className="p-2 space-y-1.5">
        {matches.length > 0 ? (
          matches.map((m) => <MatchRow key={m.id} matchId={m.id} ctx={ctx} onEdit={onEdit} showVenue={false} showDate />)
        ) : (
          <p className="text-xs px-2 py-3 text-center" style={{ color: c.faint }}>
            {t('Sin partidos pendientes', 'No pending matches')}
          </p>
        )}
      </div>
    </div>
  )
}
