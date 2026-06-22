import { useEffect, useMemo, useState } from 'react'
import { MATCHES, MATCH_BY_ID } from '../data/schedule'
import { sideLabelFor, matchTimeLabel, matchDateLabel } from '../utils/labels'
import { liveMatchIds } from '../utils/live'
import { useOdds, oddsForMatch } from '../lib/odds'
import { useStore, getScenario, ACCOUNT_PRED_ID } from '../store/useStore'
import { fetchRanking, type RankingRow } from '../lib/remote'
import type { ActiveContext } from '../hooks'
import { useAuth } from '../auth'
import { useT } from '../i18n'
import { useTheme, ACCENT } from '../theme'

interface NewsItem {
  title: string
  source: string
  link: string
  ts: number | null
  image?: string
}

type View = 'calendario' | 'grupos' | 'llaves' | 'precision' | 'ranking' | 'noticias' | 'home'

export function HomeView({
  ctx,
  onJump,
  onEditMatch,
}: {
  ctx: ActiveContext
  onJump: (v: View) => void
  onEditMatch: (id: number) => void
}) {
  const { t } = useT()

  const realResults = ctx.real.results
  const now = Date.now()
  const liveIds = useMemo(() => liveMatchIds(realResults, now), [realResults, now])
  const liveSet = useMemo(() => new Set(liveIds), [liveIds])

  const next5 = useMemo(() => {
    return MATCHES.filter((m) => !realResults[m.id]?.played && !liveSet.has(m.id) && Date.parse(m.kickoff) >= now - 5 * 60_000)
      .sort((a, b) => Date.parse(a.kickoff) - Date.parse(b.kickoff))
      .slice(0, 5)
      .map((m) => m.id)
  }, [realResults, liveSet, now])

  const oddsMatchIds = useMemo(() => [...liveIds, ...next5], [liveIds, next5])

  return (
    <div>
      <NewsStrip />
      <div className="grid gap-4 lg:grid-cols-2 mt-4">
        <Panel title={t('📊 Pronóstico de las casas', '📊 Bookmaker odds')} subtitle={t('En juego y próximos partidos', 'Live and upcoming matches')}>
          <OddsList ctx={ctx} matchIds={oddsMatchIds} liveSet={liveSet} onEditMatch={onEditMatch} />
        </Panel>

        <Panel title={t('🔮 Tu predicción', '🔮 Your prediction')} subtitle={t('Próximos 5 partidos', 'Next 5 matches')}>
          <PredictionList ctx={ctx} matchIds={next5} onEditMatch={onEditMatch} />
        </Panel>

        <Panel title={t('🏆 Ranking', '🏆 Ranking')} subtitle={t('Tu zona', 'Your zone')} action={{ label: t('Ver completo →', 'View full →'), onClick: () => onJump('ranking') }}>
          <RankingSummary />
        </Panel>

        <Panel title={t('⚽ Próximos partidos', '⚽ Upcoming matches')} subtitle={t('Calendario', 'Calendar')} action={{ label: t('Ir al calendario →', 'Go to calendar →'), onClick: () => onJump('calendario') }}>
          <UpcomingList ctx={ctx} matchIds={next5} onEditMatch={onEditMatch} />
        </Panel>
      </div>
    </div>
  )
}

function Panel({
  title,
  subtitle,
  action,
  children,
}: {
  title: string
  subtitle?: string
  action?: { label: string; onClick: () => void }
  children: React.ReactNode
}) {
  const { c } = useTheme()
  return (
    <div className="rounded-2xl overflow-hidden flex flex-col" style={{ background: c.cardGrad, border: '1px solid ' + c.line, boxShadow: c.shadow }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid ' + c.line }}>
        <div>
          <div className="font-bold text-sm" style={{ fontFamily: "'Archivo'", color: c.text }}>{title}</div>
          {subtitle && <div className="text-[11px]" style={{ color: c.muted }}>{subtitle}</div>}
        </div>
        {action && (
          <button onClick={action.onClick} className="text-[11px] font-semibold whitespace-nowrap" style={{ color: ACCENT.blue }}>
            {action.label}
          </button>
        )}
      </div>
      <div className="px-3 py-2 flex-1">{children}</div>
    </div>
  )
}

function OddsList({ ctx, matchIds, liveSet, onEditMatch }: { ctx: ActiveContext; matchIds: number[]; liveSet: Set<number>; onEditMatch: (id: number) => void }) {
  const { t } = useT()
  const { c, dark } = useTheme()
  const odds = useOdds()

  if (!odds.configured) {
    return <Empty>{t('Cargá ODDS_API_KEY en Vercel para ver las cuotas.', 'Add ODDS_API_KEY in Vercel to see odds.')}</Empty>
  }
  if (matchIds.length === 0) return <Empty>{t('No hay partidos próximos.', 'No upcoming matches.')}</Empty>

  const rows = matchIds
    .map((id) => {
      const rm = ctx.resolution.matches[id]
      return { id, o: oddsForMatch(odds, rm?.home, rm?.away) }
    })
    .filter((r) => r.o)

  if (rows.length === 0) return <Empty>{t('Sin cuotas para estos partidos todavía.', 'No odds for these matches yet.')}</Empty>

  return (
    <div className="space-y-1.5 py-1">
      {rows.map(({ id, o }) => {
        const m = MATCH_BY_ID[id]
        const home = sideLabelFor(id, m.home, 'home', ctx.resolution)
        const away = sideLabelFor(id, m.away, 'away', ctx.resolution)
        const pct = (n: number) => Math.round(n * 100)
        return (
          <button key={id} onClick={() => onEditMatch(id)} className="w-full text-left rounded-lg px-2.5 py-2" style={{ background: dark ? 'rgba(255,255,255,.03)' : 'rgba(0,0,0,.025)', border: '1px solid ' + c.line }}>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="truncate font-semibold" style={{ color: c.text }}>
                {liveSet.has(id) && <span style={{ color: ACCENT.red }}>● </span>}
                {home.flag} {home.short} <span style={{ color: c.faint }}>vs</span> {away.short} {away.flag}
              </span>
              <span className="text-[10px] shrink-0 ml-2" style={{ color: c.faint }}>{o!.bookmaker}</span>
            </div>
            <div className="flex h-2 rounded-full overflow-hidden mb-1" style={{ background: dark ? 'rgba(0,0,0,.35)' : 'rgba(0,0,0,.06)' }}>
              <div style={{ width: `${o!.home * 100}%`, background: ACCENT.blue }} />
              <div style={{ width: `${o!.draw * 100}%`, background: dark ? '#6b7280' : '#9ca3af' }} />
              <div style={{ width: `${o!.away * 100}%`, background: ACCENT.pink }} />
            </div>
            <div className="flex items-center justify-between text-[10px] font-semibold" style={{ color: c.muted }}>
              <span>{pct(o!.home)}%</span>
              <span>{t('X', 'X')} {pct(o!.draw)}%</span>
              <span>{pct(o!.away)}%</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function PredictionList({ ctx, matchIds, onEditMatch }: { ctx: ActiveContext; matchIds: number[]; onEditMatch: (id: number) => void }) {
  const { t } = useT()
  const { c, dark } = useTheme()
  const scenarios = useStore((s) => s.scenarios)
  const pred = getScenario(scenarios, ACCOUNT_PRED_ID) ?? scenarios.find((s) => s.type === 'prediction')

  if (matchIds.length === 0) return <Empty>{t('No hay partidos próximos.', 'No upcoming matches.')}</Empty>
  if (!pred) return <Empty>{t('Creá una predicción para cargar tus pronósticos.', 'Create a prediction to enter your forecasts.')}</Empty>

  return (
    <div className="space-y-1.5 py-1">
      {matchIds.map((id) => {
        const m = MATCH_BY_ID[id]
        const home = sideLabelFor(id, m.home, 'home', ctx.resolution)
        const away = sideLabelFor(id, m.away, 'away', ctx.resolution)
        const r = pred.results[id]
        return (
          <button key={id} onClick={() => onEditMatch(id)} className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs" style={{ background: dark ? 'rgba(255,255,255,.03)' : 'rgba(0,0,0,.025)', border: '1px solid ' + c.line }}>
            <span className="flex-1 truncate text-left" style={{ color: c.text }}>{home.flag} {home.short} <span style={{ color: c.faint }}>vs</span> {away.short} {away.flag}</span>
            {r?.played ? (
              <span className="font-bold tabular-nums" style={{ color: ACCENT.purple }}>{r.homeScore}-{r.awayScore}</span>
            ) : (
              <span className="text-[11px]" style={{ color: c.faint }}>{t('cargar', 'set')} +</span>
            )}
            <span className="text-[10px] shrink-0" style={{ color: c.faint }}>{matchTimeLabel(m)}</span>
          </button>
        )
      })}
    </div>
  )
}

function UpcomingList({ ctx, matchIds, onEditMatch }: { ctx: ActiveContext; matchIds: number[]; onEditMatch: (id: number) => void }) {
  const { t, lang } = useT()
  const { c, dark } = useTheme()
  if (matchIds.length === 0) return <Empty>{t('No hay partidos próximos.', 'No upcoming matches.')}</Empty>
  return (
    <div className="space-y-1.5 py-1">
      {matchIds.map((id) => {
        const m = MATCH_BY_ID[id]
        const home = sideLabelFor(id, m.home, 'home', ctx.resolution)
        const away = sideLabelFor(id, m.away, 'away', ctx.resolution)
        return (
          <button key={id} onClick={() => onEditMatch(id)} className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs" style={{ background: dark ? 'rgba(255,255,255,.03)' : 'rgba(0,0,0,.025)', border: '1px solid ' + c.line }}>
            <span className="flex-1 truncate text-left" style={{ color: c.text }}>{home.flag} {home.short} <span style={{ color: c.faint }}>vs</span> {away.short} {away.flag}</span>
            <span className="text-[10px] shrink-0 capitalize" style={{ color: c.muted }}>{matchDateLabel(m, lang)} · {matchTimeLabel(m)}</span>
          </button>
        )
      })}
    </div>
  )
}

function RankingSummary() {
  const { enabled, user } = useAuth()
  const { t } = useT()
  const { c, dark } = useTheme()
  const [rows, setRows] = useState<RankingRow[] | null>(null)
  const lastSync = useStore((s) => s.lastSync)

  useEffect(() => {
    if (!(enabled && user)) return
    fetchRanking().then(setRows).catch(() => setRows([]))
  }, [enabled, user, lastSync])

  if (!enabled || !user) return <Empty>{t('Iniciá sesión para ver tu posición.', 'Sign in to see your position.')}</Empty>
  if (rows == null) return <Empty>{t('Cargando…', 'Loading…')}</Empty>
  if (rows.length === 0) return <Empty>{t('Todavía no hay puntajes.', 'No scores yet.')}</Empty>

  const sorted = [...rows].sort((a, b) => Number(b.points) - Number(a.points))
  const myIdx = sorted.findIndex((r) => r.user_id === user.id)
  const start = myIdx < 0 ? 0 : Math.max(0, Math.min(myIdx - 2, sorted.length - 5))
  const window = sorted.slice(start, start + 5)

  return (
    <div className="space-y-1 py-1">
      {window.map((r) => {
        const pos = sorted.indexOf(r) + 1
        const mine = r.user_id === user.id
        return (
          <div key={r.user_id} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs" style={mine ? { background: dark ? 'rgba(47,109,240,.18)' : 'rgba(47,109,240,.1)', border: '1px solid ' + ACCENT.blue } : { background: dark ? 'rgba(255,255,255,.03)' : 'rgba(0,0,0,.025)', border: '1px solid ' + c.line }}>
            <span className="w-6 text-center font-bold" style={{ color: c.muted }}>{pos}</span>
            <span className="flex-1 truncate font-medium" style={{ color: c.text }}>
              {r.display_name}{mine && <span className="text-[9px] ml-1" style={{ color: ACCENT.blue }}>{t('(vos)', '(you)')}</span>}
            </span>
            <span className="font-bold tabular-nums" style={{ fontFamily: "'Archivo'", color: c.text }}>{Math.round(Number(r.points))} {t('pts', 'pts')}</span>
          </div>
        )
      })}
    </div>
  )
}

function NewsStrip() {
  const { t, lang } = useT()
  const { c, dark } = useTheme()
  const [items, setItems] = useState<NewsItem[] | null>(null)

  useEffect(() => {
    fetch(`/api/news?lang=${lang}`)
      .then((r) => r.json())
      .then((d) => setItems((d.items ?? []).slice(0, 10)))
      .catch(() => setItems([]))
  }, [lang])

  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide mb-1.5 font-bold" style={{ color: c.muted }}>📰 {t('Noticias del Mundial', 'World Cup news')}</div>
      <div className="flex gap-3 overflow-x-auto pb-2 mdl-noscroll">
        {items == null
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-xl animate-pulse shrink-0" style={{ width: 190, height: 200, background: dark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.05)' }} />
            ))
          : items.length === 0
            ? <div className="text-xs py-6" style={{ color: c.faint }}>{t('Sin noticias por ahora.', 'No news right now.')}</div>
            : items.map((it, i) => <NewsCard key={i} item={it} index={i} />)}
      </div>
    </div>
  )
}

// Paleta para los placeholders cuando la noticia no trae imagen.
const NEWS_GRADS = [
  'linear-gradient(135deg,#2F6DF0,#7B3FF2)',
  'linear-gradient(135deg,#EC1C7D,#FF7A1A)',
  'linear-gradient(135deg,#1FA85C,#16A8E0)',
  'linear-gradient(135deg,#FF7A1A,#FFC21A)',
  'linear-gradient(135deg,#7B3FF2,#EC1C7D)',
]

function NewsCard({ item, index }: { item: NewsItem; index: number }) {
  const { c, dark } = useTheme()
  const [imgOk, setImgOk] = useState(true)
  const grad = NEWS_GRADS[index % NEWS_GRADS.length]
  return (
    <a href={item.link} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-xl overflow-hidden flex flex-col" style={{ width: 190, background: c.cardGrad, border: '1px solid ' + c.line, boxShadow: c.shadow }}>
      <div style={{ width: '100%', height: 120, background: grad, position: 'relative' }}>
        {item.image && imgOk ? (
          <img src={item.image} alt="" onError={() => setImgOk(false)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div className="flex items-center justify-center h-full text-2xl">📰</div>
        )}
      </div>
      <div className="px-2.5 py-2 flex-1 flex flex-col">
        <div className="text-[12px] font-semibold leading-snug" style={{ color: c.text, fontFamily: "'Archivo'", display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.title}</div>
        <div className="text-[10px] mt-auto pt-1.5" style={{ color: dark ? c.faint : c.muted }}>{item.source}</div>
      </div>
    </a>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  const { c } = useTheme()
  return <div className="text-xs py-6 text-center" style={{ color: c.faint }}>{children}</div>
}
