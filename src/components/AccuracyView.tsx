import { useMemo } from 'react'
import { useStore, effectiveResults, REAL_SCENARIO_ID, getScenario } from '../store/useStore'
import {
  computeAccuracy,
  computeRankingScore,
  computePredStats,
  type AccuracyReport,
  type RankingScore,
  type PredStats,
  type HitKind,
} from '../engine/accuracy'
import { STAGE_I18N } from '../data/schedule'
import { formatDateShort } from '../utils/labels'
import type { Scenario } from '../types'
import { useT } from '../i18n'
import { useTheme, ACCENT } from '../theme'

// Factores informativos que SÍ tienen sentido mostrar aparte (cuando hay datos):
// se relistan sólo los que ya tienen muestras (>0), para no llenar de "sin datos".
const EXTRA_KEYS = ['qualifiers', 'knockout', 'champion'] as const
const FACTOR_EN: Record<string, string> = {
  qualifiers: 'Qualified to knockouts',
  knockout: 'Knockout winners',
  champion: 'Champion',
}

const HIT_COLOR: Record<HitKind, string> = {
  exact: ACCENT.green,
  result: ACCENT.blue,
  miss: '#9b8d6e',
}

export function AccuracyView() {
  const scenarios = useStore((s) => s.scenarios)
  const real = getScenario(scenarios, REAL_SCENARIO_ID) ?? scenarios[0]
  const { t } = useT()
  const { c } = useTheme()

  const cards = useMemo(() => {
    return scenarios
      .filter((s) => s.type !== 'real')
      .map((s) => {
        const eff = effectiveResults(s, real)
        return {
          scenario: s,
          score: computeRankingScore(eff, real.results),
          report: computeAccuracy(eff, real.results),
          stats: computePredStats(eff, real.results),
        }
      })
  }, [scenarios, real])

  const realPlayed = Object.values(real.results).filter((r) => r.played).length

  if (cards.length === 0) {
    return (
      <div className="text-center py-12" style={{ color: c.muted }}>
        <p className="text-4xl mb-3">🎯</p>
        <p className="text-sm">{t('Todavía no hay predicciones ni escenarios.', 'No predictions or scenarios yet.')}</p>
        <p className="text-xs mt-1">{t('Creá una predicción para medir tu acierto.', 'Create a prediction to measure your accuracy.')}</p>
      </div>
    )
  }

  return (
    <div>
      <p className="text-xs mb-4" style={{ color: c.muted }}>
        {t(
          `Se comparan tus pestañas con los resultados reales (${realPlayed} partidos jugados). El puntaje que ordena el ranking cuenta sólo los partidos que predijiste antes del cierre, con puntos que aumentan por fase.`,
          `Your tabs are compared with the real results (${realPlayed} matches played). The score that orders the ranking counts only the matches you predicted before the close, with points increasing per stage.`,
        )}
      </p>
      <div className="space-y-4">
        {cards
          .slice()
          .sort((a, b) => b.score.points - a.score.points)
          .map(({ scenario, score, report, stats }) => (
            <AccuracyCard key={scenario.id} scenario={scenario} score={score} report={report} stats={stats} />
          ))}
      </div>
    </div>
  )
}

function AccuracyCard({
  scenario,
  score,
  report,
  stats,
}: {
  scenario: Scenario
  score: RankingScore
  report: AccuracyReport
  stats: PredStats
}) {
  const { t, lang } = useT()
  const { c, dark } = useTheme()

  const predicted = stats.exact + stats.result + stats.miss
  const seg = (n: number) => (predicted > 0 ? (n / predicted) * 100 : 0)
  const extras = report.factors.filter((f) => EXTRA_KEYS.includes(f.key as never) && f.total > 0)

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: c.cardGrad, border: '1px solid ' + c.line, boxShadow: c.shadow }}>
      {/* Cabecera */}
      <div className="flex items-center gap-3 px-4 py-3" style={{ borderLeft: `4px solid ${scenario.color}` }}>
        <div className="flex-1 min-w-0">
          <div className="font-semibold flex items-center gap-1.5" style={{ color: c.text, fontFamily: "'Archivo'" }}>
            {scenario.type === 'prediction' ? '🔮' : '🧪'}
            <span className="truncate">{scenario.name}</span>
          </div>
          <div className="text-[11px]" style={{ color: c.muted }}>
            {scenario.type === 'prediction' ? t('Predicción', 'Prediction') : 'What-if'}
            {scenario.predictionDate ? ` · ${formatDateShort(scenario.predictionDate)}` : ''}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold" style={{ color: scenario.color }}>
            {Math.round(score.points)} {t('pts', 'pts')}
          </div>
          <div className="text-[10px]" style={{ color: c.muted }}>
            {t('puntos del ranking', 'ranking points')} · {score.pct.toFixed(0)}%
          </div>
        </div>
      </div>

      <div className="px-4 pb-4 pt-1 border-t" style={{ borderColor: c.line }}>
        {predicted === 0 ? (
          <p className="text-xs py-3 text-center" style={{ color: c.faint }}>
            {t('Todavía no jugaste ningún partido que hayas predicho.', 'No predicted matches have been played yet.')}
          </p>
        ) : (
          <>
            {/* Distribución exacto / resultado / error */}
            <div className="mt-3 mb-1.5 flex h-3 rounded-full overflow-hidden" style={{ background: dark ? 'rgba(0,0,0,.35)' : 'rgba(0,0,0,.06)' }}>
              {(['exact', 'result', 'miss'] as HitKind[]).map((k) => {
                const n = k === 'exact' ? stats.exact : k === 'result' ? stats.result : stats.miss
                return <div key={k} style={{ width: `${seg(n)}%`, background: HIT_COLOR[k] }} title={`${n}`} />
              })}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] mb-3" style={{ color: c.muted }}>
              <Legend color={HIT_COLOR.exact} label={`🎯 ${stats.exact} ${t('exactos', 'exact')} (${seg(stats.exact).toFixed(0)}%)`} />
              <Legend color={HIT_COLOR.result} label={`✅ ${stats.result} ${t('sólo resultado', 'result only')} (${seg(stats.result).toFixed(0)}%)`} />
              <Legend color={HIT_COLOR.miss} label={`❌ ${stats.miss} ${t('errados', 'missed')} (${seg(stats.miss).toFixed(0)}%)`} />
            </div>

            {/* Puntos por fase */}
            <div className="text-[10px] uppercase tracking-wide mb-1.5" style={{ color: c.muted }}>
              {t('Puntos por fase', 'Points by stage')}
            </div>
            <div className="space-y-1.5 mb-3">
              {stats.byStage.map((b) => (
                <div key={b.stage}>
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span style={{ color: c.text }}>{t(STAGE_I18N[b.stage].es, STAGE_I18N[b.stage].en)}</span>
                    <span style={{ color: c.muted }}>
                      {b.points}/{b.max} {t('pts', 'pts')} · {b.exact}/{b.played} {t('exactos', 'exact')}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: dark ? 'rgba(0,0,0,.4)' : 'rgba(0,0,0,.06)' }}>
                    <div className="h-full rounded-full" style={{ width: `${b.max > 0 ? (b.points / b.max) * 100 : 0}%`, background: scenario.color }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Forma reciente */}
            <div className="text-[10px] uppercase tracking-wide mb-1.5" style={{ color: c.muted }}>
              {t('Forma reciente', 'Recent form')} <span style={{ color: c.faint }}>· {t('más nuevo', 'newest')} →</span>
            </div>
            <div className="flex gap-1 flex-wrap">
              {stats.form.map((f, i) => (
                <span
                  key={`${f.matchId}-${i}`}
                  title={`P${f.matchId}`}
                  style={{ width: 14, height: 14, borderRadius: 5, background: HIT_COLOR[f.kind], display: 'inline-block' }}
                />
              ))}
            </div>

            {/* Extras informativos (sólo cuando ya hay datos, ej. eliminatorias) */}
            {extras.length > 0 && (
              <div className="mt-4 pt-3 border-t space-y-2" style={{ borderColor: c.line }}>
                <div className="text-[10px] uppercase tracking-wide" style={{ color: c.muted }}>{t('Pronóstico de torneo', 'Tournament forecast')}</div>
                {extras.map((f) => (
                  <div key={f.key} className="flex items-center justify-between text-xs">
                    <span style={{ color: c.muted }}>{lang === 'en' ? FACTOR_EN[f.key] ?? f.label : f.label}</span>
                    <span style={{ color: c.text }}>{f.correct}/{f.total} · {f.pct.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span style={{ width: 9, height: 9, borderRadius: 3, background: color, display: 'inline-block' }} />
      {label}
    </span>
  )
}
