import { useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '../auth'
import { fetchRanking, type RankingRow } from '../lib/remote'

const MEDALS = ['🥇', '🥈', '🥉']

export function RankingView() {
  const { enabled, user } = useAuth()
  const [rows, setRows] = useState<RankingRow[] | null>(null)
  const [error, setError] = useState('')

  const load = () => {
    setError('')
    fetchRanking()
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : 'No se pudo cargar'))
  }

  useEffect(() => {
    if (enabled && user) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, user])

  if (!enabled) {
    return (
      <Empty>
        El ranking compartido necesita el login con Supabase configurado. Por ahora estás en modo
        local.
      </Empty>
    )
  }
  if (!user) {
    return <Empty>Iniciá sesión para ver el ranking de toda la plataforma.</Empty>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">🏆 Ranking{rows && rows.length > 0 ? ` · ${rows.length}` : ''}</h2>
        <button onClick={load} className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-white/5">
          ↻ Actualizar
        </button>
      </div>

      <div className="bg-slate-800/50 border border-white/10 rounded-xl p-3 mb-4 text-xs text-slate-300 space-y-1.5">
        <p className="font-semibold text-slate-200">📋 Cómo se puntúa</p>
        <p>
          El ranking cuenta <strong>sólo los resultados de los partidos</strong>, que es lo que la
          app verifica automáticamente con los marcadores en vivo:
        </p>
        <ul className="list-disc pl-4 space-y-0.5 text-slate-400">
          <li>
            <strong className="text-emerald-400">Marcador exacto</strong>: 3 puntos (ej: predijiste
            2-1 y salió 2-1).
          </li>
          <li>
            <strong className="text-amber-400">Sólo el resultado</strong> (ganó/empató/perdió, sin
            el marcador exacto): 1 punto (ej: predijiste 1-1 y salió 0-0; acertaste el empate).
          </li>
          <li>Errar el resultado: 0 puntos.</li>
        </ul>
        <p className="text-slate-400">
          El % es sobre el máximo posible de los partidos ya jugados. <strong>Goleadores, tarjetas y
          VAR</strong> se pueden pronosticar en cada partido, pero <strong>no suman al ranking</strong>
          (el proveedor gratis no trae ese dato para verificarlo).
        </p>
      </div>
      {error && <p className="text-xs text-rose-400 mb-2">{error}</p>}
      {rows == null ? (
        <p className="text-sm text-slate-500">Cargando…</p>
      ) : rows.length === 0 ? (
        <Empty>Todavía no hay puntajes cargados. ¡Sé el primero en armar tu predicción!</Empty>
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => {
            const mine = r.user_id === user.id
            return (
              <div
                key={r.user_id}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border ${
                  mine ? 'border-pitch-500/50 bg-pitch-500/10' : 'border-white/5 bg-slate-800/50'
                }`}
              >
                <span className="w-7 text-center text-lg">{MEDALS[i] ?? i + 1}</span>
                <span className="flex-1 truncate font-medium">
                  {r.display_name}
                  {mine && <span className="text-[10px] text-pitch-500 ml-1">(vos)</span>}
                </span>
                <span className="font-bold tabular-nums">{Number(r.accuracy).toFixed(0)}%</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="text-center text-slate-500 py-12 text-sm">
      <p className="text-4xl mb-3">🏆</p>
      <p className="max-w-xs mx-auto">{children}</p>
    </div>
  )
}
