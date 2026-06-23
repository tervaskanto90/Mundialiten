import { useMemo, useState } from 'react'
import { useStore, effectiveResults, REAL_SCENARIO_ID, getScenario } from '../store/useStore'
import {
  computeRankingScore,
  computePredStats,
  type RankingScore,
  type PredStats,
  type HitKind,
  type HitEntry,
} from '../engine/accuracy'
import { resolve, type Resolution } from '../engine/resolve'
import { STAGE_I18N, MATCH_BY_ID } from '../data/schedule'
import { formatDateShort, sideLabelFor } from '../utils/labels'
import type { Scenario } from '../types'
import { CompetitionStats } from './CompetitionStats'
import { UserComparison } from './UserComparison'
import { useT } from '../i18n'
import { useTheme, ACCENT } from '../theme'

const HIT_COLOR: Record<HitKind, string> = { exact: ACCENT.green, result: ACCENT.blue, miss: '#9b8d6e' }

export function AccuracyView() {
  const scenarios = useStore((s) => s.scenarios)
  const real = getScenario(scenarios, REAL_SCENARIO_ID) ?? scenarios[0]
  const { t } = useT()
  const { c } = useTheme()
  const realRes = useMemo(() => resolve(real.results), [real.results])

  // Sólo predicciones (el what-if ya no figura acá).
  const cards = useMemo(() => {
    return scenarios
      .filter((s) => s.type === 'prediction')
      .map((s) => {
        const eff = effectiveResults(s, real)
        return { scenario: s, score: computeRankingScore(eff, real.results), stats: computePredStats(eff, real.results) }
      })
  }, [scenarios, real])

  const realPlayed = Object.values(real.results).filter((r) => r.played).length

  if (cards.length === 0) {
    return (
      <div className="text-center py-12" style={{ color: c.muted }}>
        <p className="text-4xl mb-3">📊</p>
        <p className="text-sm">{t('Todavía no tenés una predicción.', 'You don’t have a prediction yet.')}</p>
        <p className="text-xs mt-1">{t('Creá tu predicción para ver tus estadísticas.', 'Create your prediction to see your stats.')}</p>
      </div>
    )
  }

  return (
    <div>
      <p className="text-xs mb-4" style={{ color: c.muted }}>
        {t(
          `Tus estadísticas vs los resultados reales (${realPlayed} partidos jugados). El puntaje cuenta sólo los partidos que predijiste antes del cierre, con puntos que aumentan por fase.`,
          `Your stats vs the real results (${realPlayed} matches played). The score counts only the matches you predicted before the close, with points increasing per stage.`,
        )}
      </p>
      <div className="space-y-4">
        {cards
          .slice()
          .sort((a, b) => b.score.points - a.score.points)
          .map(({ scenario, score, stats }) => (
            <StatsCard key={scenario.id} scenario={scenario} score={score} stats={stats} realRes={realRes} />
          ))}
      </div>
      <UserComparison />
      <CompetitionStats realResults={real.results} realRes={realRes} />
    </div>
  )
}

function Donut({ data, size = 96 }: { data: { value: number; color: string }[]; size?: number }) {
  const { dark } = useTheme()
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  const r = size / 2 - 8
  const C = 2 * Math.PI * r
  let acc = 0
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flex: 'none' }}>
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={dark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.07)'} strokeWidth={11} />
        {data.map((d, i) => {
          const len = (d.value / total) * C
          const el = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth={11}
              strokeDasharray={`${len} ${C - len}`}
              strokeDashoffset={-acc}
              strokeLinecap={len > 0 && len < C ? 'round' : 'butt'}
            />
          )
          acc += len
          return el
        })}
      </g>
    </svg>
  )
}

function StatsCard({
  scenario,
  score,
  stats,
  realRes,
}: {
  scenario: Scenario
  score: RankingScore
  stats: PredStats
  realRes: Resolution
}) {
  const { t } = useT()
  const { c, dark } = useTheme()
  const [tab, setTab] = useState<HitKind | null>(null)

  const total = stats.exact + stats.result + stats.miss
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0)
  const donut = [
    { value: stats.exact, color: HIT_COLOR.exact },
    { value: stats.result, color: HIT_COLOR.result },
    { value: stats.miss, color: HIT_COLOR.miss },
  ]
  const tabs: { k: HitKind; icon: string; label: string; n: number }[] = [
    { k: 'exact', icon: '🎯', label: t('Exactos', 'Exact'), n: stats.exact },
    { k: 'result', icon: '✅', label: t('Resultado', 'Result'), n: stats.result },
    { k: 'miss', icon: '❌', label: t('Errados', 'Missed'), n: stats.miss },
  ]
  const list = tab === 'exact' ? stats.lists.exact : tab === 'result' ? stats.lists.result : tab === 'miss' ? stats.lists.miss : []

  // Métricas avanzadas (de tu predicción vs los resultados reales).
  const streak = (() => { let n = 0; for (const f of stats.form) { if (f.kind === 'miss') break; n++ } return n })()
  const strongest = [...stats.byStage].filter((b) => b.played > 0).sort((a, b) => b.exact / b.played - a.exact / a.played || b.points / b.max - a.points / a.max)[0]
  const best = [...stats.lists.exact].sort((a, b) => b.points - a.points || b.matchId - a.matchId)[0]
  const bestM = best ? MATCH_BY_ID[best.matchId] : null
  const bestHome = bestM ? sideLabelFor(best!.matchId, bestM.home, 'home', realRes) : null
  const bestAway = bestM ? sideLabelFor(best!.matchId, bestM.away, 'away', realRes) : null

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: c.cardGrad, border: '1px solid ' + c.line, boxShadow: c.shadow }}>
      <div className="flex items-center gap-3 px-4 py-3" style={{ borderLeft: `4px solid ${scenario.color}` }}>
        <div className="flex-1 min-w-0">
          <div className="font-semibold flex items-center gap-1.5" style={{ color: c.text, fontFamily: "'Archivo'" }}>
            🔮 <span className="truncate">{scenario.name}</span>
          </div>
          <div className="text-[11px]" style={{ color: c.muted }}>
            {t('Predicción', 'Prediction')}{scenario.predictionDate ? ` · ${formatDateShort(scenario.predictionDate)}` : ''}
          </div>
        </div>
      </div>

      <div className="px-4 pb-4 pt-2 border-t" style={{ borderColor: c.line }}>
        {total === 0 ? (
          <p className="text-xs py-4 text-center" style={{ color: c.faint }}>
            {t('Todavía no jugaste ningún partido que hayas predicho.', 'No predicted matches have been played yet.')}
          </p>
        ) : (
          <>
            {/* Resumen: donut + números grandes */}
            <div className="flex items-center gap-4 my-2">
              <div className="relative" style={{ flex: 'none' }}>
                <Donut data={donut} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold leading-none" style={{ fontFamily: "'Archivo'", color: c.text }}>{total}</span>
                  <span className="text-[9px]" style={{ color: c.muted }}>{t('jugados', 'played')}</span>
                </div>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-2">
                <Stat big value={Math.round(score.points)} label={t('puntos', 'points')} color={scenario.color} />
                <Stat big value={`${score.pct.toFixed(0)}%`} label={t('efectividad', 'accuracy')} color={c.text} />
                <Stat value={`${pct(stats.exact)}%`} label={`🎯 ${t('exactos', 'exact')}`} color={HIT_COLOR.exact} />
                <Stat value={`${pct(stats.result + stats.exact)}%`} label={`✅ ${t('al menos resultado', 'at least result')}`} color={HIT_COLOR.result} />
              </div>
            </div>

            {/* Puntos por fase (barras) */}
            {stats.byStage.length > 0 && (
              <>
                <div className="text-[10px] uppercase tracking-wide mt-3 mb-1.5" style={{ color: c.muted }}>{t('Puntos por fase', 'Points by stage')}</div>
                <div className="space-y-1.5 mb-1">
                  {stats.byStage.map((b) => (
                    <div key={b.stage} className="flex items-center gap-2">
                      <span className="text-[11px] w-20 shrink-0 truncate" style={{ color: c.text }}>{t(STAGE_I18N[b.stage].es, STAGE_I18N[b.stage].en)}</span>
                      <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: dark ? 'rgba(0,0,0,.4)' : 'rgba(0,0,0,.06)' }}>
                        <div className="h-full rounded-full" style={{ width: `${b.max > 0 ? (b.points / b.max) * 100 : 0}%`, background: scenario.color }} />
                      </div>
                      <span className="text-[10px] tabular-nums w-14 text-right shrink-0" style={{ color: c.muted }}>{b.points}/{b.max}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Tus métricas avanzadas */}
            <div className="text-[10px] uppercase tracking-wide mt-3 mb-1.5" style={{ color: c.muted }}>{t('Tus métricas', 'Your metrics')}</div>
            <div className="grid grid-cols-3 gap-2 mb-1">
              <div className="rounded-xl px-2 py-2 text-center" style={{ background: dark ? 'rgba(0,0,0,.18)' : 'rgba(0,0,0,.025)', border: '1px solid ' + c.line }}>
                <div className="text-lg font-bold leading-none" style={{ fontFamily: "'Archivo'", color: streak > 0 ? ACCENT.green : c.text }}>🔥 {streak}</div>
                <div className="text-[9.5px] mt-1" style={{ color: c.muted }}>{t('racha de aciertos', 'hit streak')}</div>
              </div>
              <div className="rounded-xl px-2 py-2 text-center" style={{ background: dark ? 'rgba(0,0,0,.18)' : 'rgba(0,0,0,.025)', border: '1px solid ' + c.line }}>
                <div className="text-[13px] font-bold leading-tight" style={{ fontFamily: "'Archivo'", color: c.text }}>{strongest ? t(STAGE_I18N[strongest.stage].es, STAGE_I18N[strongest.stage].en) : '—'}</div>
                <div className="text-[9.5px] mt-1" style={{ color: c.muted }}>{t('fase más fuerte', 'strongest stage')}</div>
              </div>
              <div className="rounded-xl px-2 py-2 text-center" style={{ background: dark ? 'rgba(0,0,0,.18)' : 'rgba(0,0,0,.025)', border: '1px solid ' + c.line }}>
                {best && bestHome && bestAway ? (
                  <>
                    <div className="text-[13px] font-bold leading-none tabular-nums" style={{ fontFamily: "'Archivo'", color: ACCENT.green }}>{bestHome.flag}{bestAway.flag} {best.rh}-{best.ra}</div>
                    <div className="text-[9.5px] mt-1" style={{ color: c.muted }}>{t('mejor acierto', 'best call')} +{best.points}</div>
                  </>
                ) : (
                  <>
                    <div className="text-[13px] font-bold" style={{ color: c.text }}>—</div>
                    <div className="text-[9.5px] mt-1" style={{ color: c.muted }}>{t('mejor acierto', 'best call')}</div>
                  </>
                )}
              </div>
            </div>

            {/* Detalle por categoría (aparece al tocar) */}
            <div className="flex gap-2 mt-3">
              {tabs.map((tb) => {
                const on = tab === tb.k
                return (
                  <button
                    key={tb.k}
                    onClick={() => setTab(on ? null : tb.k)}
                    className="flex-1 rounded-xl px-2 py-2 text-center transition"
                    style={{
                      border: '1px solid ' + (on ? HIT_COLOR[tb.k] : c.line),
                      background: on ? HIT_COLOR[tb.k] + '22' : dark ? 'rgba(0,0,0,.18)' : 'rgba(0,0,0,.025)',
                    }}
                  >
                    <div className="text-base font-bold leading-none" style={{ fontFamily: "'Archivo'", color: HIT_COLOR[tb.k] }}>{tb.n}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: c.muted }}>{tb.icon} {tb.label}</div>
                  </button>
                )
              })}
            </div>

            {tab && (
              <div className="mt-2 rounded-xl p-2" style={{ background: dark ? 'rgba(0,0,0,.2)' : 'rgba(0,0,0,.025)', border: '1px solid ' + c.line }}>
                {list.length === 0 ? (
                  <div className="text-[11px] py-2 text-center" style={{ color: c.faint }}>{t('Sin partidos en esta categoría.', 'No matches in this category.')}</div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-x-3 gap-y-1">
                    {list.map((e) => (
                      <HitRow key={e.matchId} e={e} realRes={realRes} color={HIT_COLOR[tab]} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Stat({ value, label, color, big }: { value: string | number; label: string; color: string; big?: boolean }) {
  const { c } = useTheme()
  return (
    <div>
      <div className={big ? 'text-2xl font-bold leading-none' : 'text-base font-bold leading-none'} style={{ fontFamily: "'Archivo'", color }}>{value}</div>
      <div className="text-[10px] mt-0.5" style={{ color: c.muted }}>{label}</div>
    </div>
  )
}

function HitRow({ e, realRes, color }: { e: HitEntry; realRes: Resolution; color: string }) {
  const { c } = useTheme()
  const m = MATCH_BY_ID[e.matchId]
  const home = sideLabelFor(e.matchId, m.home, 'home', realRes)
  const away = sideLabelFor(e.matchId, m.away, 'away', realRes)
  return (
    <div className="flex items-center gap-1 text-[11px]" style={{ color: c.muted }} title={`${home.name} ${e.rh}-${e.ra} ${away.name}`}>
      <span className="truncate flex-1">{home.flag}{away.flag} <span className="tabular-nums">{e.rh}-{e.ra}</span></span>
      <span className="tabular-nums shrink-0" style={{ color: c.faint }}>({e.ph}-{e.pa})</span>
      {e.points > 0 && <span className="tabular-nums shrink-0 font-semibold" style={{ color }}>+{e.points}</span>}
    </div>
  )
}
