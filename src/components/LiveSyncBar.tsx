import { useState } from 'react'
import { useStore } from '../store/useStore'
import { runLiveSync } from '../hooks'
import { useT } from '../i18n'

const STATUS_DOT: Record<string, string> = {
  idle: 'bg-slate-500',
  syncing: 'bg-amber-400 animate-pulse',
  ok: 'bg-emerald-500',
  error: 'bg-rose-500',
}

function relativeTime(iso: string | null, en: boolean): string {
  if (!iso) return en ? 'never' : 'nunca'
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.round(diff / 1000)
  if (s < 60) return en ? `${s}s ago` : `hace ${s}s`
  const m = Math.round(s / 60)
  if (m < 60) return en ? `${m} min ago` : `hace ${m} min`
  const h = Math.round(m / 60)
  return en ? `${h} h ago` : `hace ${h} h`
}

export function LiveSyncBar() {
  const liveEnabled = useStore((s) => s.liveEnabled)
  const setLiveEnabled = useStore((s) => s.setLiveEnabled)
  const syncStatus = useStore((s) => s.syncStatus)
  const syncMessage = useStore((s) => s.syncMessage)
  const lastSync = useStore((s) => s.lastSync)
  const liveConfig = useStore((s) => s.liveConfig)
  const setLiveConfig = useStore((s) => s.setLiveConfig)
  const { t } = useT()

  const [showConfig, setShowConfig] = useState(false)

  return (
    <div className="bg-slate-800/60 border border-white/10 rounded-xl px-3 py-2.5 mb-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT[syncStatus]}`} />
        <span className="text-sm font-medium">🔴 {t('En vivo', 'Live')}</span>
        <span className="text-xs text-slate-400">
          {syncStatus === 'syncing'
            ? t('sincronizando…', 'syncing…')
            : t(`actualizado ${relativeTime(lastSync, false)}`, `updated ${relativeTime(lastSync, true)}`)}
        </span>

        <label className="ml-auto flex items-center gap-1.5 text-xs cursor-pointer select-none">
          <input
            type="checkbox"
            checked={liveEnabled}
            onChange={(e) => setLiveEnabled(e.target.checked)}
            className="accent-pitch-500"
          />
          {t('Auto (cada 5 min)', 'Auto (every 5 min)')}
        </label>
        <button
          onClick={() => runLiveSync()}
          disabled={syncStatus === 'syncing'}
          className="text-xs font-medium bg-pitch-500 hover:bg-pitch-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg"
        >
          ↻ {t('Sincronizar', 'Sync')}
        </button>
        <button
          onClick={() => setShowConfig((v) => !v)}
          title={t('Configurar proveedor', 'Configure provider')}
          className="text-xs text-slate-400 hover:text-white px-2 py-1.5 rounded-lg hover:bg-white/5"
        >
          ⚙
        </button>
      </div>

      {syncMessage && (
        <div
          className={`text-[11px] mt-1.5 ${
            syncStatus === 'error' ? 'text-rose-400' : 'text-slate-500'
          }`}
        >
          {syncMessage}
        </div>
      )}

      {showConfig && (
        <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
          <p className="text-[11px] text-slate-500 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-2">
            {t('Proveedor:', 'Provider:')} <strong>football-data.org</strong>{' '}
            {t(
              '(gratis, cubre el Mundial 2026). Trae marcadores en vivo a través del token cargado en Vercel',
              '(free, covers World Cup 2026). Brings live scores via the token set in Vercel',
            )}{' '}
            (<code className="text-emerald-300">FOOTBALL_DATA_TOKEN</code>).
          </p>
          <div className="flex gap-2">
            <label className="flex-1 text-xs">
              <span className="text-slate-400">{t('Competición', 'Competition')}</span>
              <input
                value={liveConfig.leagueId}
                onChange={(e) => setLiveConfig({ leagueId: e.target.value })}
                className="mt-1 w-full bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-pitch-500"
              />
            </label>
            <label className="flex-1 text-xs">
              <span className="text-slate-400">{t('Temporada', 'Season')}</span>
              <input
                value={liveConfig.season}
                onChange={(e) => setLiveConfig({ season: e.target.value })}
                className="mt-1 w-full bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-pitch-500"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  )
}
