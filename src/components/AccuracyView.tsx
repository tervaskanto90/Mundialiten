import { useMemo } from 'react'
import { useStore, effectiveResults, REAL_SCENARIO_ID, getScenario } from '../store/useStore'
import { computeAccuracy, type AccuracyReport } from '../engine/accuracy'
import { formatDateShort } from '../utils/labels'
import type { Scenario } from '../types'

export function AccuracyView() {
  const scenarios = useStore((s) => s.scenarios)
  const real = getScenario(scenarios, REAL_SCENARIO_ID) ?? scenarios[0]

  const reports = useMemo(() => {
    return scenarios
      .filter((s) => s.type !== 'real')
      .map((s) => ({
        scenario: s,
        report: computeAccuracy(effectiveResults(s, real), real.results),
      }))
  }, [scenarios, real])

  const realPlayed = Object.values(real.results).filter((r) => r.played).length

  if (reports.length === 0) {
    return (
      <div className="text-center text-slate-500 py-12">
        <p className="text-4xl mb-3">🎯</p>
        <p className="text-sm">Todavía no hay predicciones ni escenarios.</p>
        <p className="text-xs mt-1">Creá una pestaña de predicción desde arriba para medir tu precisión.</p>
      </div>
    )
  }

  return (
    <div>
      <p className="text-xs text-slate-500 mb-4">
        Se comparan tus pestañas contra los <strong>resultados reales</strong> ({realPlayed} partidos
        jugados). El porcentaje sube a medida que se cargan resultados reales.
      </p>
      <div className="space-y-4">
        {reports
          .slice()
          .sort((a, b) => b.report.overall - a.report.overall)
          .map(({ scenario, report }) => (
            <AccuracyCard key={scenario.id} scenario={scenario} report={report} />
          ))}
      </div>
    </div>
  )
}

function AccuracyCard({ scenario, report }: { scenario: Scenario; report: AccuracyReport }) {
  return (
    <div className="bg-slate-800/40 rounded-xl border border-white/5 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3" style={{ borderLeft: `4px solid ${scenario.color}` }}>
        <div className="flex-1 min-w-0">
          <div className="font-semibold flex items-center gap-1.5">
            {scenario.type === 'prediction' ? '🔮' : '🧪'}
            <span className="truncate">{scenario.name}</span>
          </div>
          <div className="text-[11px] text-slate-500">
            {scenario.type === 'prediction' ? 'Predicción' : 'What-if'}
            {scenario.predictionDate ? ` · ${formatDateShort(scenario.predictionDate)}` : ''}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold" style={{ color: scenario.color }}>
            {report.overall.toFixed(0)}%
          </div>
          <div className="text-[10px] text-slate-500">acierto global</div>
        </div>
      </div>

      <div className="px-4 pb-4 space-y-2">
        {report.factors.map((f) => (
          <div key={f.key}>
            <div className="flex items-center justify-between text-xs mb-0.5">
              <span className="text-slate-400">{f.label}</span>
              <span className={f.total === 0 ? 'text-slate-600' : 'text-slate-300'}>
                {f.total === 0 ? 'sin datos' : `${f.correct}/${f.total} · ${f.pct.toFixed(0)}%`}
              </span>
            </div>
            <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${f.total === 0 ? 0 : f.pct}%`,
                  background: scenario.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
