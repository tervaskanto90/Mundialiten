import { useState } from 'react'
import { useStore, ACCOUNT_PRED_ID } from '../store/useStore'
import type { Scenario, ScenarioType } from '../types'
import { Modal } from './Modal'
import { formatDateShort } from '../utils/labels'
import { useAuth } from '../auth'
import { useT } from '../i18n'
import { useTheme, ACCENT } from '../theme'
import { useIsDesktop } from '../hooks/useIsDesktop'

const TYPE_ICON: Record<ScenarioType, string> = { real: '🔴', prediction: '🔮', whatif: '🧪' }
const TYPE_ACCENT: Record<ScenarioType, string> = {
  real: ACCENT.red,
  prediction: ACCENT.purple,
  whatif: ACCENT.green,
}
const TYPE_NOTE: Record<ScenarioType, { es: string; en: string; icon: string }> = {
  real: { icon: '🔴', es: 'Marcadores reales en tiempo real desde las sedes.', en: 'Real scores live from the venues.' },
  prediction: { icon: '🔮', es: 'Estás viendo TUS predicciones cargadas para cada partido.', en: 'You are viewing YOUR predictions for each match.' },
  whatif: { icon: '🧪', es: 'Sandbox: cambiá resultados y mirá cómo se mueve el ranking.', en: 'Sandbox: change results and watch the ranking move.' },
}

export function TabBar() {
  const scenarios = useStore((s) => s.scenarios)
  const activeId = useStore((s) => s.activeId)
  const setActive = useStore((s) => s.setActive)
  const addScenario = useStore((s) => s.addScenario)
  const removeScenario = useStore((s) => s.removeScenario)
  const renameScenario = useStore((s) => s.renameScenario)
  const { enabled, user } = useAuth()
  const { t } = useT()
  const { c, dark } = useTheme()
  const isDesktop = useIsDesktop()
  const loggedIn = enabled && !!user

  const tabName = (sc: Scenario) => (sc.type === 'real' ? t('Resultados', 'Results') : sc.name)

  const [dialog, setDialog] = useState<null | { mode: 'new'; type: ScenarioType } | { mode: 'edit'; id: string }>(null)
  const [name, setName] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))

  const openNew = (type: ScenarioType) => {
    setName(type === 'prediction' ? t('Mi predicción', 'My prediction') : t('Escenario what-if', 'What-if scenario'))
    setDate(new Date().toISOString().slice(0, 10))
    setDialog({ mode: 'new', type })
  }
  const openEdit = (id: string) => {
    const sc = scenarios.find((s) => s.id === id)
    if (!sc) return
    setName(sc.name)
    setDate(sc.predictionDate ?? new Date().toISOString().slice(0, 10))
    setDialog({ mode: 'edit', id })
  }
  const confirmDialog = () => {
    if (!dialog) return
    if (dialog.mode === 'new') {
      addScenario(dialog.type, name, dialog.type === 'prediction' ? date : undefined)
    } else {
      renameScenario(dialog.id, name, date)
    }
    setDialog(null)
  }

  const dialogType =
    dialog?.mode === 'new'
      ? dialog.type
      : dialog?.mode === 'edit'
        ? scenarios.find((s) => s.id === dialog.id)?.type
        : undefined

  const activeScenario = scenarios.find((s) => s.id === activeId) ?? scenarios[0]
  const note = TYPE_NOTE[activeScenario?.type ?? 'real']

  const rowStyle: React.CSSProperties = isDesktop
    ? { display: 'flex', flexDirection: 'column', gap: '7px' }
    : { display: 'flex', gap: '7px', marginTop: '15px', overflowX: 'auto', paddingBottom: '2px' }

  const tabStyle = (active: boolean, type: ScenarioType): React.CSSProperties => {
    const accent = TYPE_ACCENT[type]
    return {
      flex: isDesktop ? '1 1 auto' : 'none',
      display: 'flex',
      flexDirection: isDesktop ? 'row' : 'column',
      alignItems: 'center',
      justifyContent: isDesktop ? 'flex-start' : 'center',
      gap: isDesktop ? '9px' : '4px',
      fontFamily: "'Noto Sans'",
      fontSize: isDesktop ? '12.5px' : '11px',
      fontWeight: 800,
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      padding: isDesktop ? '11px 14px' : '11px 8px',
      borderRadius: '14px',
      transition: 'all .2s ease',
      color: active ? '#fff' : c.muted,
      background: active ? accent : dark ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.035)',
      border: '1px solid ' + (active ? accent : c.line),
      boxShadow: active ? '0 8px 20px -10px ' + accent : 'none',
      transform: active ? 'translateY(-1px)' : 'none',
    }
  }

  return (
    <div>
      <div style={rowStyle} className="mdl-noscroll">
        {scenarios.map((sc) => {
          const active = sc.id === activeId
          return (
            <div key={sc.id} style={tabStyle(active, sc.type)} onClick={() => setActive(sc.id)}>
              <span style={{ fontSize: '11px' }}>{TYPE_ICON[sc.type]}</span>
              <span style={{ flex: isDesktop ? 1 : undefined, textAlign: 'left' }}>{tabName(sc)}</span>
              {sc.type === 'prediction' && sc.predictionDate && isDesktop && (
                <span style={{ fontSize: '9px', opacity: 0.7 }}>{formatDateShort(sc.predictionDate)}</span>
              )}
              {sc.type !== 'real' && (
                <span style={{ display: 'inline-flex', gap: '4px' }}>
                  <button
                    title={t('Renombrar', 'Rename')}
                    onClick={(e) => {
                      e.stopPropagation()
                      openEdit(sc.id)
                    }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '11px', opacity: 0.85 }}
                  >
                    ✎
                  </button>
                  {sc.id !== ACCOUNT_PRED_ID && (
                    <button
                      title={t('Eliminar', 'Delete')}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm(t(`¿Eliminar "${sc.name}"?`, `Delete "${sc.name}"?`))) removeScenario(sc.id)
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '11px', opacity: 0.85 }}
                    >
                      ✕
                    </button>
                  )}
                </span>
              )}
            </div>
          )
        })}

        {!loggedIn && (
          <button onClick={() => openNew('prediction')} style={tabStyle(false, 'prediction')}>
            🔮 + {t('Predicción', 'Prediction')}
          </button>
        )}
        <button onClick={() => openNew('whatif')} style={tabStyle(false, 'whatif')}>
          🧪 + What-if
        </button>
      </div>

      <div
        style={{
          marginTop: '10px',
          fontSize: '11.5px',
          color: c.muted,
          fontWeight: 600,
          padding: '0 3px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span style={{ fontSize: '11px' }}>{note.icon}</span> {t(note.es, note.en)}
      </div>

      {dialog && (
        <Modal
          title={dialog.mode === 'new' ? t('Nueva pestaña', 'New tab') : t('Editar pestaña', 'Edit tab')}
          onClose={() => setDialog(null)}
          footer={
            <div className="flex justify-end gap-2">
              <button onClick={() => setDialog(null)} className="px-3 py-2 rounded-lg text-sm" style={{ color: c.muted }}>
                {t('Cancelar', 'Cancel')}
              </button>
              <button
                onClick={confirmDialog}
                className="px-4 py-2 rounded-lg text-sm font-bold text-white"
                style={{ background: ACCENT.blue }}
              >
                {t('Guardar', 'Save')}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-sm" style={{ color: c.muted }}>
              {dialogType === 'prediction'
                ? t(
                    'Una predicción es independiente: cargás vos todos los resultados que pronosticás y después se compara con la realidad.',
                    'A prediction is independent: you enter all the results you forecast and then it is compared with reality.',
                  )
                : t(
                    'Un escenario what-if parte de los resultados reales y se actualiza solo a medida que se juegan los partidos. Sobrescribí los partidos que quieras para simular escenarios.',
                    'A what-if scenario starts from the real results and updates itself as matches are played. Override any matches to simulate scenarios.',
                  )}
            </p>
            <label className="block">
              <span className="text-xs" style={{ color: c.muted }}>
                {t('Nombre', 'Name')}
              </span>
              <input value={name} onChange={(e) => setName(e.target.value)} autoFocus className="auth-input mt-1" />
            </label>
            {dialogType === 'prediction' && (
              <label className="block">
                <span className="text-xs" style={{ color: c.muted }}>
                  {t('Fecha de la predicción', 'Prediction date')}
                </span>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="auth-input mt-1" />
              </label>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
