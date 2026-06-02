import { useRef, useState } from 'react'
import { useStore, ACCOUNT_PRED_ID } from '../store/useStore'
import type { Scenario, ScenarioType } from '../types'
import { Modal } from './Modal'
import { formatDateShort } from '../utils/labels'
import { useAuth } from '../auth'
import { useT } from '../i18n'

const TYPE_BADGE: Record<ScenarioType, { es: string; en: string }> = {
  real: { es: 'EN VIVO', en: 'LIVE' },
  prediction: { es: 'PREDICCIÓN', en: 'PREDICTION' },
  whatif: { es: 'WHAT-IF', en: 'WHAT-IF' },
}

export function TabBar() {
  const scenarios = useStore((s) => s.scenarios)
  const activeId = useStore((s) => s.activeId)
  const setActive = useStore((s) => s.setActive)
  const addScenario = useStore((s) => s.addScenario)
  const removeScenario = useStore((s) => s.removeScenario)
  const renameScenario = useStore((s) => s.renameScenario)
  const importState = useStore((s) => s.importState)
  const { enabled, user } = useAuth()
  const { t } = useT()
  const loggedIn = enabled && !!user

  // Nombre visible: el escenario real se traduce; el resto usa su nombre propio.
  const tabName = (sc: Scenario) =>
    sc.type === 'real' ? t('Resultados reales', 'Real results') : sc.name

  const [dialog, setDialog] = useState<null | { mode: 'new'; type: ScenarioType } | { mode: 'edit'; id: string }>(null)
  const [name, setName] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const fileRef = useRef<HTMLInputElement>(null)

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

  const exportData = () => {
    const data = JSON.stringify({ scenarios, activeId }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mundialiten-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const onImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result))
        importState(data)
      } catch {
        alert(t('Archivo inválido', 'Invalid file'))
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const dialogType =
    dialog?.mode === 'new'
      ? dialog.type
      : dialog?.mode === 'edit'
        ? scenarios.find((s) => s.id === dialog.id)?.type
        : undefined

  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-4 pb-2">
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {scenarios.map((sc) => {
          const active = sc.id === activeId
          return (
            <div
              key={sc.id}
              className={`group flex items-center gap-2 shrink-0 rounded-xl border px-3 py-1.5 cursor-pointer transition ${
                active ? 'border-transparent text-white' : 'border-white/10 text-slate-300 hover:bg-white/5'
              }`}
              style={active ? { background: sc.color } : undefined}
              onClick={() => setActive(sc.id)}
            >
              <div className="leading-tight">
                <div className="text-sm font-medium whitespace-nowrap flex items-center gap-1">
                  {sc.type === 'real' && '🔴'}
                  {sc.type === 'prediction' && '🔮'}
                  {sc.type === 'whatif' && '🧪'}
                  {tabName(sc)}
                </div>
                <div className={`text-[10px] ${active ? 'text-white/80' : 'text-slate-500'}`}>
                  {t(TYPE_BADGE[sc.type].es, TYPE_BADGE[sc.type].en)}
                  {sc.type === 'prediction' && sc.predictionDate
                    ? ` · ${formatDateShort(sc.predictionDate)}`
                    : ''}
                </div>
              </div>
              {sc.type !== 'real' && (
                <div className="flex items-center gap-1">
                  <button
                    title={t('Renombrar', 'Rename')}
                    onClick={(e) => {
                      e.stopPropagation()
                      openEdit(sc.id)
                    }}
                    className={`text-xs ${active ? 'text-white/80 hover:text-white' : 'text-slate-500 hover:text-slate-200'}`}
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
                      className={`text-xs ${active ? 'text-white/80 hover:text-white' : 'text-slate-500 hover:text-rose-400'}`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {!loggedIn && (
          <button
            onClick={() => openNew('prediction')}
            className="shrink-0 rounded-xl border border-dashed border-white/20 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5 whitespace-nowrap"
          >
            🔮 + {t('Predicción', 'Prediction')}
          </button>
        )}
        <button
          onClick={() => openNew('whatif')}
          className="shrink-0 rounded-xl border border-dashed border-white/20 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5 whitespace-nowrap"
        >
          🧪 + What-if
        </button>

        <div className="shrink-0 ml-auto flex items-center gap-1 pl-2">
          <button
            onClick={exportData}
            title={t('Exportar datos', 'Export data')}
            className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-white/5"
          >
            ⤓
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            title={t('Importar datos', 'Import data')}
            className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-white/5"
          >
            ⤒
          </button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={onImport} />
        </div>
      </div>

      {dialog && (
        <Modal
          title={dialog.mode === 'new' ? t('Nueva pestaña', 'New tab') : t('Editar pestaña', 'Edit tab')}
          onClose={() => setDialog(null)}
          footer={
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDialog(null)}
                className="px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-white/5"
              >
                {t('Cancelar', 'Cancel')}
              </button>
              <button
                onClick={confirmDialog}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-pitch-500 hover:bg-pitch-600 text-white"
              >
                {t('Guardar', 'Save')}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
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
              <span className="text-xs text-slate-400">{t('Nombre', 'Name')}</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                className="mt-1 w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-pitch-500"
              />
            </label>
            {dialogType === 'prediction' && (
              <label className="block">
                <span className="text-xs text-slate-400">{t('Fecha de la predicción', 'Prediction date')}</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1 w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-pitch-500"
                />
              </label>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
