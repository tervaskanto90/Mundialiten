import { useState } from 'react'
import { useStore } from '../store/useStore'
import { runLiveSync } from '../hooks'

const STATUS_DOT: Record<string, string> = {
  idle: 'bg-slate-500',
  syncing: 'bg-amber-400 animate-pulse',
  ok: 'bg-emerald-500',
  error: 'bg-rose-500',
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'nunca'
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.round(diff / 1000)
  if (s < 60) return `hace ${s}s`
  const m = Math.round(s / 60)
  if (m < 60) return `hace ${m} min`
  const h = Math.round(m / 60)
  return `hace ${h} h`
}

export function LiveSyncBar() {
  const liveEnabled = useStore((s) => s.liveEnabled)
  const setLiveEnabled = useStore((s) => s.setLiveEnabled)
  const syncStatus = useStore((s) => s.syncStatus)
  const syncMessage = useStore((s) => s.syncMessage)
  const lastSync = useStore((s) => s.lastSync)
  const liveConfig = useStore((s) => s.liveConfig)
  const setLiveConfig = useStore((s) => s.setLiveConfig)

  const [showConfig, setShowConfig] = useState(false)

  return (
    <div className="bg-slate-800/60 border border-white/10 rounded-xl px-3 py-2.5 mb-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT[syncStatus]}`} />
        <span className="text-sm font-medium">🔴 En vivo</span>
        <span className="text-xs text-slate-400">
          {syncStatus === 'syncing' ? 'sincronizando…' : `actualizado ${relativeTime(lastSync)}`}
        </span>

        <label className="ml-auto flex items-center gap-1.5 text-xs cursor-pointer select-none">
          <input
            type="checkbox"
            checked={liveEnabled}
            onChange={(e) => setLiveEnabled(e.target.checked)}
            className="accent-pitch-500"
          />
          Auto (cada 5 min)
        </label>
        <button
          onClick={() => runLiveSync()}
          disabled={syncStatus === 'syncing'}
          className="text-xs font-medium bg-pitch-500 hover:bg-pitch-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg"
        >
          ↻ Sincronizar
        </button>
        <button
          onClick={() => setShowConfig((v) => !v)}
          title="Configurar proveedor"
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
          <label className="block text-xs">
            <span className="text-slate-400">Proveedor</span>
            <select
              value={liveConfig.provider}
              onChange={(e) => {
                const provider = e.target.value as 'apifootball' | 'thesportsdb' | 'footballdata'
                const leagueId =
                  provider === 'apifootball' ? '1' : provider === 'footballdata' ? 'WC' : '4429'
                setLiveConfig({ provider, leagueId })
              }}
              className="mt-1 w-full bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-pitch-500"
            >
              <option value="footballdata">football-data.org (gratis, cubre el Mundial 2026)</option>
              <option value="thesportsdb">TheSportsDB (sólo marcadores, sin key)</option>
              <option value="apifootball">API-Football (goles/tarjetas/VAR · 2026 es de pago)</option>
            </select>
          </label>

          {liveConfig.provider === 'footballdata' && (
            <p className="text-[11px] text-slate-500 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-2">
              Recomendado y gratis. Necesita un token gratuito de football-data.org cargado en Vercel
              como variable de entorno <code className="text-emerald-300">FOOTBALL_DATA_TOKEN</code>.
              Trae marcadores en vivo (sin detalle de goleadores). Funciona en el deploy de Vercel.
            </p>
          )}

          {liveConfig.provider === 'apifootball' && (
            <>
              <label className="block text-xs">
                <span className="text-slate-400">API key</span>
                <input
                  value={liveConfig.apiKey}
                  onChange={(e) => setLiveConfig({ apiKey: e.target.value })}
                  type="password"
                  placeholder="Pegá tu key de api-sports.io"
                  className="mt-1 w-full bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-pitch-500"
                />
              </label>
              <p className="text-[11px] text-amber-400/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-2">
                Ojo: el plan gratis de API-Football <strong>no incluye la temporada 2026</strong>
                (sólo 2022–2024). Para el Mundial 2026 necesitás un plan pago, o usá football-data.org.
              </p>
            </>
          )}

          <div className="flex gap-2">
            <label className="flex-1 text-xs">
              <span className="text-slate-400">
                {liveConfig.provider === 'footballdata' ? 'Competición' : 'Id de liga'}
              </span>
              <input
                value={liveConfig.leagueId}
                onChange={(e) => setLiveConfig({ leagueId: e.target.value })}
                className="mt-1 w-full bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-pitch-500"
              />
            </label>
            <label className="flex-1 text-xs">
              <span className="text-slate-400">Temporada</span>
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
