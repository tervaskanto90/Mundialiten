import { useState } from 'react'
import { useStore } from '../store/useStore'
import { runLiveSync } from '../hooks'
import { useT } from '../i18n'
import { useTheme, ACCENT } from '../theme'

const STATUS_COLOR: Record<string, string> = {
  idle: '#94a3b8',
  syncing: ACCENT.gold,
  ok: ACCENT.green,
  error: ACCENT.red,
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
  const { c } = useTheme()

  const [showConfig, setShowConfig] = useState(false)

  return (
    <div className="rounded-lg px-2.5 py-1.5" style={{ background: c.cardGrad, border: '1px solid ' + c.line }}>
      <div className="flex items-center gap-1.5">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: STATUS_COLOR[syncStatus], animation: syncStatus === 'syncing' ? 'mdlLivePulse 1.2s ease-in-out infinite' : 'none' }}
        />
        <span className="text-[11px] font-bold shrink-0" style={{ color: c.text }}>
          {t('En vivo', 'Live')}
        </span>
        <span className="text-[10px] truncate" style={{ color: c.muted }}>
          {syncStatus === 'syncing'
            ? t('sincronizando…', 'syncing…')
            : t(relativeTime(lastSync, false), relativeTime(lastSync, true))}
        </span>

        <label className="ml-auto flex items-center gap-1 text-[10px] cursor-pointer select-none shrink-0" style={{ color: c.muted }} title={t('Sincronizar cada 5 minutos', 'Sync every 5 minutes')}>
          <input
            type="checkbox"
            checked={liveEnabled}
            onChange={(e) => setLiveEnabled(e.target.checked)}
            style={{ accentColor: ACCENT.blue }}
          />
          {t('Auto', 'Auto')}
        </label>
        <button
          onClick={() => runLiveSync()}
          disabled={syncStatus === 'syncing'}
          className="text-[11px] font-bold px-2 py-1 rounded-md disabled:opacity-50 text-white shrink-0"
          style={{ background: ACCENT.blue }}
          title={t('Sincronizar ahora', 'Sync now')}
        >
          ↻
        </button>
        <button
          onClick={() => setShowConfig((v) => !v)}
          title={t('Configurar proveedor', 'Configure provider')}
          className="text-[11px] px-1.5 py-1 rounded-md shrink-0"
          style={{ color: c.muted, border: '1px solid ' + c.line }}
        >
          ⚙
        </button>
      </div>

      {syncMessage && (
        <div className="text-[10px] mt-1 truncate" style={{ color: syncStatus === 'error' ? ACCENT.red : c.faint }}>
          {syncMessage}
        </div>
      )}

      {showConfig && (
        <div className="mt-3 pt-3 space-y-2" style={{ borderTop: '1px solid ' + c.line }}>
          <p
            className="text-[11px] rounded-lg px-2.5 py-2"
            style={{ color: c.muted, background: 'rgba(31,168,92,.10)', border: '1px solid rgba(31,168,92,.25)' }}
          >
            {t('Proveedor:', 'Provider:')} <strong>football-data.org</strong>{' '}
            {t(
              '(gratis, cubre el Mundial 2026). Trae marcadores en vivo a través del token cargado en Vercel',
              '(free, covers World Cup 2026). Brings live scores via the token set in Vercel',
            )}{' '}
            (<code style={{ color: ACCENT.green }}>FOOTBALL_DATA_TOKEN</code>).
          </p>
          <div className="flex gap-2">
            <label className="flex-1 text-xs" style={{ color: c.muted }}>
              <span>{t('Competición', 'Competition')}</span>
              <input value={liveConfig.leagueId} onChange={(e) => setLiveConfig({ leagueId: e.target.value })} className="auth-input mt-1" />
            </label>
            <label className="flex-1 text-xs" style={{ color: c.muted }}>
              <span>{t('Temporada', 'Season')}</span>
              <input value={liveConfig.season} onChange={(e) => setLiveConfig({ season: e.target.value })} className="auth-input mt-1" />
            </label>
          </div>
        </div>
      )}
    </div>
  )
}
