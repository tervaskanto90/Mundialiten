import { useMemo } from 'react'
import { useStore, effectiveResults, REAL_SCENARIO_ID, getScenario } from '../store/useStore'
import {
  computeAccuracy,
  computeRankingScore,
  type AccuracyReport,
  type RankingScore,
} from '../engine/accuracy'
import { formatDateShort } from '../utils/labels'
import type { Scenario } from '../types'
import { useT } from '../i18n'

// Factores que se derivan de los resultados (la base del ranking).
const RANKING_KEYS = new Set(['outcome', 'score'])

// Etiquetas de factores en inglés (por key); en español usa f.label.
const FACTOR_EN: Record<string, string> = {
  outcome: 'Result (1/X/2)',
  score: 'Exact score',
  goals: 'Scorers',
  yellow: 'Yellow cards',
  red: 'Red cards',
  var: 'VAR interventions count',
  qualifiers: 'Qualified to knockouts',
  knockout: 'Knockout winners',
  champion: 'Champion',
}

export function AccuracyView() {
  const scenarios = useStore((s) => s.scenarios)
  const real = getScenario(scenarios, REAL_SCENARIO_ID) ?? scenarios[0]
  const { t } = useT()

  const cards = useMemo(() => {
    return scenarios
      .filter((s) => s.type !== 'real')
      .map((s) => {
        const eff = effectiveResults(s, real)
        return {
          scenario: s,
          score: computeRankingScore(eff, real.results),
          report: computeAccuracy(eff, real.results),
        }
      })
  }, [scenarios, real])

  const realPlayed = Object.values(real.results).filter((r) => r.played).length

  if (cards.length === 0) {
    return (
      <div className="text-center text-slate-500 py-12">
        <p className="text-4xl mb-3">🎯</p>
        <p className="text-sm">{t('Todavía no hay predicciones ni escenarios.', 'No predictions or scenarios yet.')}</p>
        <p className="text-xs mt-1">{t('Creá una predicción para medir tu acierto.', 'Create a prediction to measure your accuracy.')}</p>
      </div>
    )
  }

  return (
    <div>
      <p className="text-xs text-slate-500 mb-4">
        {t(
          `Se comparan tus pestañas con los resultados reales (${realPlayed} partidos jugados). El puntaje (que ordena el ranking) cuenta sólo los resultados de los partidos que predijiste antes del cierre, con puntos que aumentan por fase (más detalle en la pestaña Ranking). El resto es informativo.`,
          `Your tabs are compared with the real results (${realPlayed} matches played). The score (which orders the ranking) counts only the results of the matches you predicted before the close, with points increasing per stage (more detail in the Ranking tab). The rest is informational.`,
        )}
      </p>
      <div className="space-y-4">
        {cards
          .slice()
          .sort((a, b) => b.score.pct - a.score.pct)
          .map(({ scenario, score, report }) => (
            <AccuracyCard key={scenario.id} scenario={scenario} score={score} report={report} />
          ))}
      </div>
    </div>
  )
}

function AccuracyCard({
  scenario,
  score,
  report,
}: {
  scenario: Scenario
  score: RankingScore
  report: AccuracyReport
}) {
  const { t, lang } = useT()
  return (
    <div className="bg-slate-800/40 rounded-xl border border-white/5 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3" style={{ borderLeft: `4px solid ${scenario.color}` }}>
        <div className="flex-1 min-w-0">
          <div className="font-semibold flex items-center gap-1.5">
            {scenario.type === 'prediction' ? '🔮' : '🧪'}
            <span className="truncate">{scenario.name}</span>
          </div>
          <div className="text-[11px] text-slate-500">
            {scenario.type === 'prediction' ? t('Predicción', 'Prediction') : 'What-if'}
            {scenario.predictionDate ? ` · ${formatDateShort(scenario.predictionDate)}` : ''}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold" style={{ color: scenario.color }}>
            {score.pct.toFixed(0)}%
          </div>
          <div className="text-[10px] text-slate-500">{t('puntaje del ranking', 'ranking score')}</div>
        </div>
      </div>

      <div className="px-4 pb-2 -mt-1">
        <div className="text-[11px] text-slate-400">
          🎯 {score.exact} {t('exactos', 'exact')} · ✅ {score.tendency} {t('sólo resultado', 'result only')} ·{' '}
          {t(`de ${score.played} jugados`, `of ${score.played} played`)}
          <span className="text-slate-600"> ({score.points}/{score.max} pts)</span>
        </div>
      </div>

      <div className="px-4 pb-4 pt-2 space-y-2 border-t border-white/5 mt-1">
        <div className="text-[10px] uppercase tracking-wide text-slate-500">{t('Detalle informativo', 'Informational detail')}</div>
        {report.factors.map((f) => (
          <div key={f.key}>
            <div className="flex items-center justify-between text-xs mb-0.5">
              <span className="text-slate-400">
                {lang === 'en' ? FACTOR_EN[f.key] ?? f.label : f.label}
                {RANKING_KEYS.has(f.key) && (
                  <span className="ml-1 text-[9px] text-emerald-400/80">· {t('cuenta', 'counts')}</span>
                )}
              </span>
              <span className={f.total === 0 ? 'text-slate-600' : 'text-slate-300'}>
                {f.total === 0 ? t('sin datos', 'no data') : `${f.correct}/${f.total} · ${f.pct.toFixed(0)}%`}
              </span>
            </div>
            <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${f.total === 0 ? 0 : f.pct}%`, background: scenario.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
