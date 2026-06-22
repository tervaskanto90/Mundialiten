import { useStore, REAL_SCENARIO_ID, ACCOUNT_PRED_ID, getScenario } from '../store/useStore'
import { useT } from '../i18n'
import { useTheme, ACCENT } from '../theme'

type SegKey = 'real' | 'prediction' | 'whatif'

const SEGMENTS: { key: SegKey; icon: string; es: string; en: string; accent: string }[] = [
  { key: 'real', icon: '🔴', es: 'Resultados', en: 'Results', accent: ACCENT.red },
  { key: 'prediction', icon: '🔮', es: 'Predicción', en: 'Prediction', accent: ACCENT.purple },
  { key: 'whatif', icon: '🧪', es: 'What-if', en: 'What-if', accent: ACCENT.green },
]

/**
 * Toggle de "vista de datos": Resultados / Predicción / What-if. Siempre visible
 * arriba. El What-if es ÚNICO (se reusa o se crea uno solo); la predicción se
 * reusa la de la cuenta (o la primera) y se crea si no hay.
 */
export function ScenarioToggle() {
  const scenarios = useStore((s) => s.scenarios)
  const activeId = useStore((s) => s.activeId)
  const setActive = useStore((s) => s.setActive)
  const addScenario = useStore((s) => s.addScenario)
  const { t } = useT()
  const { c, dark } = useTheme()

  const active = getScenario(scenarios, activeId) ?? scenarios[0]
  const activeKey: SegKey = active?.type === 'real' ? 'real' : active?.type === 'whatif' ? 'whatif' : 'prediction'

  const go = (key: SegKey) => {
    if (key === 'real') {
      setActive(REAL_SCENARIO_ID)
      return
    }
    if (key === 'prediction') {
      const pred = getScenario(scenarios, ACCOUNT_PRED_ID) ?? scenarios.find((s) => s.type === 'prediction')
      setActive(pred ? pred.id : addScenario('prediction', t('Mi predicción', 'My prediction')))
      return
    }
    // What-if único.
    const wi = scenarios.find((s) => s.type === 'whatif')
    setActive(wi ? wi.id : addScenario('whatif', 'What-if'))
  }

  return (
    <div className="flex justify-center">
      <div
        className="inline-flex p-1 rounded-full"
        style={{ background: dark ? 'rgba(0,0,0,.3)' : 'rgba(0,0,0,.05)', border: '1px solid ' + c.line, boxShadow: c.shadow }}
      >
        {SEGMENTS.map((s) => {
          const on = activeKey === s.key
          return (
            <button
              key={s.key}
              onClick={() => go(s.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontFamily: "'Archivo'",
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer',
                padding: '8px 18px',
                borderRadius: '99px',
                border: 'none',
                whiteSpace: 'nowrap',
                transition: 'all .18s ease',
                color: on ? '#fff' : c.muted,
                background: on ? s.accent : 'transparent',
                boxShadow: on ? '0 6px 16px -8px ' + s.accent : 'none',
              }}
            >
              <span style={{ fontSize: '11px' }}>{s.icon}</span> {t(s.es, s.en)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
