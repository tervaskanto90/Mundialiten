import { useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '../auth'
import { fetchRanking, type RankingRow } from '../lib/remote'
import { useT } from '../i18n'

const MEDALS = ['🥇', '🥈', '🥉']

export function RankingView() {
  const { enabled, user } = useAuth()
  const { t, lang } = useT()
  const [rows, setRows] = useState<RankingRow[] | null>(null)
  const [error, setError] = useState('')

  const load = () => {
    setError('')
    fetchRanking()
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : t('No se pudo cargar', 'Could not load')))
  }

  useEffect(() => {
    if (enabled && user) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, user])

  if (!enabled) {
    return (
      <Empty>
        {t(
          'El ranking compartido necesita el login con Supabase configurado. Por ahora estás en modo local.',
          'The shared ranking needs login with Supabase configured. You are currently in local mode.',
        )}
      </Empty>
    )
  }
  if (!user) {
    return <Empty>{t('Iniciá sesión para ver el ranking de toda la plataforma.', 'Sign in to see the platform-wide ranking.')}</Empty>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">🏆 Ranking{rows && rows.length > 0 ? ` · ${rows.length}` : ''}</h2>
        <button onClick={load} className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-white/5">
          ↻ {t('Actualizar', 'Refresh')}
        </button>
      </div>

      <div className="bg-slate-800/50 border border-white/10 rounded-xl p-3 mb-4 text-xs text-slate-300 space-y-1.5">
        {lang === 'en' ? (
          <>
            <p className="font-semibold text-slate-200">📋 How scoring works</p>
            <p>
              The ranking counts <strong>only match results</strong>, which the app verifies
              automatically from the live scores:
            </p>
            <ul className="list-disc pl-4 space-y-0.5 text-slate-400">
              <li>
                <strong className="text-emerald-400">Exact score</strong> (e.g. you predicted 2-1 and
                it ended 2-1) or <strong className="text-amber-400">just the result</strong>
                (win/draw/loss, without the exact score; e.g. you predicted 1-1 and it ended 0-0).
              </li>
              <li>Wrong result: 0 points.</li>
            </ul>
            <p className="text-slate-400">
              Points are <strong>worth more as the tournament advances</strong> (exact / result):
              Groups 3/1 · R32 4/2 · R16 5/2 · QF 6/3 · SF 8/4 · Final & 3rd 10/5. So the knockouts
              keep the ranking open.
            </p>
            <p className="text-slate-400">
              🏟️ When the group stage ends, the <strong>knockouts are built with the teams that
              actually qualified</strong> (not the ones you predicted), so everyone forecasts the
              correct ties.
            </p>
            <p className="text-slate-400">
              ⏱️ Each match's prediction <strong>closes 5 minutes before</strong> kick-off. Only the
              matches you predicted in time count: the others neither add nor subtract.
            </p>
            <p className="text-slate-400">
              The % is over the maximum possible of <strong>the matches you predicted</strong> that
              have been played. <strong>Scorers, cards and VAR</strong> can be predicted per match but
              <strong>do not count</strong> (the free provider does not give that data to verify it).
            </p>
          </>
        ) : (
          <>
            <p className="font-semibold text-slate-200">📋 Cómo se puntúa</p>
            <p>
              El ranking cuenta <strong>sólo los resultados de los partidos</strong>, que es lo que la
              app verifica automáticamente con los marcadores en vivo:
            </p>
            <ul className="list-disc pl-4 space-y-0.5 text-slate-400">
              <li>
                <strong className="text-emerald-400">Marcador exacto</strong> (ej: predijiste 2-1 y
                salió 2-1) o <strong className="text-amber-400">sólo el resultado</strong>
                (ganó/empató/perdió, sin el marcador; ej: predijiste 1-1 y salió 0-0).
              </li>
              <li>Errar el resultado: 0 puntos.</li>
            </ul>
            <p className="text-slate-400">
              Los puntos <strong>valen más a medida que avanza el torneo</strong> (exacto / sólo
              resultado): Grupos 3/1 · 16avos 4/2 · 8vos 5/2 · 4tos 6/3 · Semis 8/4 · Final y 3º 10/5.
              Así la fase final mantiene el ranking abierto.
            </p>
            <p className="text-slate-400">
              🏟️ Al terminar la fase de grupos, la <strong>fase final se arma con los equipos que
              realmente clasificaron</strong> (no con los que predijiste), así todos pronostican los
              cruces correctos.
            </p>
            <p className="text-slate-400">
              ⏱️ Las predicciones de cada partido <strong>se cierran 5 minutos antes</strong> de que
              empiece. Sólo cuentan los partidos que predijiste a tiempo: los que no, no suman ni
              restan.
            </p>
            <p className="text-slate-400">
              El % es sobre el máximo posible de <strong>los partidos que predijiste</strong> y ya se
              jugaron. <strong>Goleadores, tarjetas y VAR</strong> se pueden pronosticar en cada
              partido, pero <strong>no suman al ranking</strong> (el proveedor gratis no trae ese dato
              para verificarlo).
            </p>
          </>
        )}
      </div>
      {error && <p className="text-xs text-rose-400 mb-2">{error}</p>}
      {rows == null ? (
        <p className="text-sm text-slate-500">{t('Cargando…', 'Loading…')}</p>
      ) : rows.length === 0 ? (
        <Empty>{t('Todavía no hay puntajes cargados. ¡Sé el primero en armar tu predicción!', 'No scores yet. Be the first to make your prediction!')}</Empty>
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
                  {mine && <span className="text-[10px] text-pitch-500 ml-1">{t('(vos)', '(you)')}</span>}
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
