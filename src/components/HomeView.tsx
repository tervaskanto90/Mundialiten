import { useEffect, useMemo, useState } from 'react'
import { MATCHES, MATCH_BY_ID } from '../data/schedule'
import { sideLabelFor, matchTimeLabel } from '../utils/labels'
import { liveMatchIds } from '../utils/live'
import { useOdds, oddsForMatch, type OddsState } from '../lib/odds'
import { useStore, getScenario, ACCOUNT_PRED_ID } from '../store/useStore'
import { computeRankingScore, computePredStats } from '../engine/accuracy'
import { fetchRanking, type RankingRow } from '../lib/remote'
import { Avatar } from './Avatar'
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

type View = 'home' | 'fixture' | 'precision' | 'ranking'

// Alto fijo de cada renglón en Pronóstico y Tu predicción, para que matcheen
// fila a fila entre los dos cuadrantes.
const ROW_H = 66

type Outcome = 'home' | 'draw' | 'away'
const outcomeOf = (h: number, a: number): Outcome => (h > a ? 'home' : h < a ? 'away' : 'draw')

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
  const odds = useOdds()
  const scenarios = useStore((s) => s.scenarios)
  const setActive = useStore((s) => s.setActive)
  const addScenario = useStore((s) => s.addScenario)

  const goToPrediction = () => {
    const pred = getScenario(scenarios, ACCOUNT_PRED_ID) ?? scenarios.find((s) => s.type === 'prediction')
    setActive(pred ? pred.id : addScenario('prediction', t('Mi predicción', 'My prediction')))
    onJump('fixture')
  }

  const realResults = ctx.real.results
  const now = Date.now()
  // Partidos en juego AHORA (pueden ser varios simultáneos en la última fecha)
  // + próximos, recortado a 3 partidos compartidos por los dos cuadrantes.
  const dashIds = useMemo(() => {
    const liveIds = liveMatchIds(realResults, now)
    const liveSet = new Set(liveIds)
    const upcoming = MATCHES.filter(
      (m) => !realResults[m.id]?.played && !liveSet.has(m.id) && Date.parse(m.kickoff) >= now - 5 * 60_000,
    )
      .sort((a, b) => Date.parse(a.kickoff) - Date.parse(b.kickoff))
      .map((m) => m.id)
    return { ids: [...liveIds, ...upcoming].slice(0, 3), liveSet }
  }, [realResults, now])

  return (
    <div>
      <NewsStrip />
      <div className="grid gap-4 lg:grid-cols-2 mt-4">
        <Panel title={t('📊 Pronóstico de las casas', '📊 Bookmaker odds')} subtitle={t('En juego y próximos', 'Live and upcoming')}>
          <OddsList ctx={ctx} ids={dashIds.ids} liveSet={dashIds.liveSet} odds={odds} onEditMatch={onEditMatch} />
        </Panel>

        <Panel title={t('🔮 Tu predicción', '🔮 Your prediction')} subtitle={t('Mismos partidos', 'Same matches')} action={{ label: t('Ir a tu predicción →', 'Go to your prediction →'), onClick: goToPrediction }}>
          <PredictionList ctx={ctx} ids={dashIds.ids} liveSet={dashIds.liveSet} odds={odds} onEditMatch={onEditMatch} />
        </Panel>

        <Panel title={t('🏆 Ranking', '🏆 Ranking')} subtitle={t('Tu zona', 'Your zone')} action={{ label: t('Ver completo →', 'View full →'), onClick: () => onJump('ranking') }}>
          <RankingSummary />
        </Panel>

        <Panel title={t('🎯 Tus estadísticas', '🎯 Your stats')} subtitle={t('Resumen de Precisión', 'Accuracy summary')} action={{ label: t('Ver detalle →', 'View detail →'), onClick: () => onJump('precision') }}>
          <StatsSummary ctx={ctx} />
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

function TeamsLabel({ ctx, id }: { ctx: ActiveContext; id: number }) {
  const { c } = useTheme()
  const m = MATCH_BY_ID[id]
  const home = sideLabelFor(id, m.home, 'home', ctx.resolution)
  const away = sideLabelFor(id, m.away, 'away', ctx.resolution)
  return (
    <span className="truncate font-semibold" style={{ color: c.text }}>
      {home.flag} {home.short} <span style={{ color: c.faint }}>vs</span> {away.short} {away.flag}
    </span>
  )
}

function OddsList({ ctx, ids, liveSet, odds, onEditMatch }: { ctx: ActiveContext; ids: number[]; liveSet: Set<number>; odds: OddsState; onEditMatch: (id: number) => void }) {
  const { t } = useT()
  const { c, dark } = useTheme()
  if (ids.length === 0) return <Empty>{t('No hay partidos próximos.', 'No upcoming matches.')}</Empty>
  const pct = (n: number) => Math.round(n * 100)
  return (
    <div className="py-1">
      {ids.map((id) => {
        const rm = ctx.resolution.matches[id]
        const o = oddsForMatch(odds, rm?.home, rm?.away)
        return (
          <button key={id} onClick={() => onEditMatch(id)} className="w-full text-left flex flex-col justify-center border-b last:border-b-0" style={{ height: ROW_H, borderColor: c.line }}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="truncate flex items-center gap-1">
                {liveSet.has(id) && <span style={{ color: ACCENT.red }}>●</span>}
                <TeamsLabel ctx={ctx} id={id} />
              </span>
              <span className="text-[10px] shrink-0 ml-2" style={{ color: c.faint }}>{o ? o.bookmaker : t('sin cuota', 'no odds')}</span>
            </div>
            {o ? (
              <>
                <div className="flex h-2 rounded-full overflow-hidden mb-1" style={{ background: dark ? 'rgba(0,0,0,.35)' : 'rgba(0,0,0,.06)' }}>
                  <div style={{ width: `${o.home * 100}%`, background: ACCENT.blue }} />
                  <div style={{ width: `${o.draw * 100}%`, background: dark ? '#6b7280' : '#9ca3af' }} />
                  <div style={{ width: `${o.away * 100}%`, background: ACCENT.pink }} />
                </div>
                <div className="flex items-center justify-between text-[10px] font-semibold" style={{ color: c.muted }}>
                  <span>{pct(o.home)}%</span>
                  <span>X {pct(o.draw)}%</span>
                  <span>{pct(o.away)}%</span>
                </div>
              </>
            ) : (
              <div className="text-[10px]" style={{ color: c.faint }}>
                {odds.configured ? t('Sin cuota para este partido.', 'No odds for this match.') : t('Cargá ODDS_API_KEY en Vercel.', 'Add ODDS_API_KEY in Vercel.')}
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

function PredictionList({ ctx, ids, liveSet, odds, onEditMatch }: { ctx: ActiveContext; ids: number[]; liveSet: Set<number>; odds: OddsState; onEditMatch: (id: number) => void }) {
  const { t } = useT()
  const { c, dark } = useTheme()
  const scenarios = useStore((s) => s.scenarios)
  const pred = getScenario(scenarios, ACCOUNT_PRED_ID) ?? scenarios.find((s) => s.type === 'prediction')
  if (ids.length === 0) return <Empty>{t('No hay partidos próximos.', 'No upcoming matches.')}</Empty>

  return (
    <div className="py-1">
      {ids.map((id) => {
        const r = pred?.results[id]
        const rm = ctx.resolution.matches[id]
        const o = oddsForMatch(odds, rm?.home, rm?.away)
        // ¿Va contra las casas? El resultado que predijo vs el favorito de la casa.
        let against = false
        if (r?.played && o) {
          const fav: Outcome = o.home >= o.draw && o.home >= o.away ? 'home' : o.away >= o.draw ? 'away' : 'draw'
          against = outcomeOf(r.homeScore, r.awayScore) !== fav
        }
        return (
          <button key={id} onClick={() => onEditMatch(id)} className="w-full text-left flex items-center gap-2 border-b last:border-b-0 text-xs" style={{ height: ROW_H, borderColor: c.line }}>
            <span className="flex items-center gap-1 flex-1 min-w-0">
              {liveSet.has(id) && <span style={{ color: ACCENT.red }}>●</span>}
              <TeamsLabel ctx={ctx} id={id} />
            </span>
            {against && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ color: ACCENT.gold, background: dark ? 'rgba(255,194,26,.16)' : 'rgba(255,194,26,.18)' }} title={t('Vas contra el favorito de las casas', 'Going against the bookmaker favorite')}>
                ⚡ {t('vs casas', 'vs odds')}
              </span>
            )}
            {r?.played ? (
              <span className="font-bold tabular-nums shrink-0" style={{ color: ACCENT.purple }}>{r.homeScore}-{r.awayScore}</span>
            ) : (
              <span className="text-[11px] shrink-0" style={{ color: c.faint }}>{t('cargar', 'set')} +</span>
            )}
            <span className="text-[10px] shrink-0 w-9 text-right" style={{ color: c.faint }}>{matchTimeLabel(MATCH_BY_ID[id])}</span>
          </button>
        )
      })}
    </div>
  )
}

function StatsSummary({ ctx }: { ctx: ActiveContext }) {
  const { t } = useT()
  const { c, dark } = useTheme()
  const scenarios = useStore((s) => s.scenarios)
  const pred = getScenario(scenarios, ACCOUNT_PRED_ID) ?? scenarios.find((s) => s.type === 'prediction')

  if (!pred) return <Empty>{t('Creá tu predicción para ver estadísticas.', 'Create your prediction to see stats.')}</Empty>
  const score = computeRankingScore(pred.results, ctx.real.results)
  const stats = computePredStats(pred.results, ctx.real.results)
  const total = stats.exact + stats.result + stats.miss
  const seg = (n: number) => (total > 0 ? (n / total) * 100 : 0)

  return (
    <div className="py-2 px-1">
      <div className="flex items-end justify-between mb-3">
        <div>
          <div className="text-3xl font-bold" style={{ fontFamily: "'Archivo'", color: ACCENT.purple }}>{Math.round(score.points)}</div>
          <div className="text-[11px]" style={{ color: c.muted }}>{t('puntos del ranking', 'ranking points')}</div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold" style={{ fontFamily: "'Archivo'", color: c.text }}>{score.pct.toFixed(0)}%</div>
          <div className="text-[11px]" style={{ color: c.muted }}>{t('efectividad', 'accuracy')}</div>
        </div>
      </div>
      {total > 0 ? (
        <>
          <div className="flex h-2.5 rounded-full overflow-hidden mb-1.5" style={{ background: dark ? 'rgba(0,0,0,.35)' : 'rgba(0,0,0,.06)' }}>
            <div style={{ width: `${seg(stats.exact)}%`, background: ACCENT.green }} />
            <div style={{ width: `${seg(stats.result)}%`, background: ACCENT.blue }} />
            <div style={{ width: `${seg(stats.miss)}%`, background: '#9b8d6e' }} />
          </div>
          <div className="flex justify-between text-[11px] font-semibold" style={{ color: c.muted }}>
            <span>🎯 {stats.exact} {t('exactos', 'exact')}</span>
            <span>✅ {stats.result} {t('resultado', 'result')}</span>
            <span>❌ {stats.miss} {t('errados', 'missed')}</span>
          </div>
        </>
      ) : (
        <div className="text-xs py-2" style={{ color: c.faint }}>{t('Todavía no jugaste partidos que hayas predicho.', 'No predicted matches played yet.')}</div>
      )}
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
  const win = sorted.slice(start, start + 5)

  return (
    <div className="space-y-1 py-1">
      {win.map((r) => {
        const pos = sorted.indexOf(r) + 1
        const mine = r.user_id === user.id
        return (
          <div key={r.user_id} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs" style={mine ? { background: dark ? 'rgba(47,109,240,.18)' : 'rgba(47,109,240,.1)', border: '1px solid ' + ACCENT.blue } : { background: dark ? 'rgba(255,255,255,.03)' : 'rgba(0,0,0,.025)', border: '1px solid ' + c.line }}>
            <span className="w-5 text-center font-bold" style={{ color: c.muted }}>{pos}</span>
            <Avatar src={r.avatar_url} name={r.display_name} size={24} />
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
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl animate-pulse shrink-0" style={{ width: 200, height: 210, background: dark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.05)' }} />
            ))
          : items.length === 0
            ? <div className="text-xs py-6" style={{ color: c.faint }}>{t('Sin noticias por ahora.', 'No news right now.')}</div>
            : items.map((it, i) => <NewsCard key={i} item={it} index={i} />)}
      </div>
    </div>
  )
}

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
    <a href={item.link} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-xl overflow-hidden flex flex-col" style={{ width: 200, background: c.cardGrad, border: '1px solid ' + c.line, boxShadow: c.shadow }}>
      <div style={{ width: '100%', height: 130, background: grad, position: 'relative' }}>
        {item.image && imgOk ? (
          <img src={`/api/img?u=${encodeURIComponent(item.image)}`} alt="" loading="lazy" onError={() => setImgOk(false)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
