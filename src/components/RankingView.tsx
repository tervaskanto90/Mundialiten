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
              Groups 3/1 · R32 4/2 · R16 5/2 · QF 6/3 · SF 8/4 · Final & 3rd 10/5. The ranking is
              ordered by <strong>total points accumulated over the whole World Cup</strong>.
            </p>
            <p className="text-slate-400">
              📣 You predict <strong>one stage at a time</strong>: only the current stage is open
              (groups → R32 → R16 → QF → semis+final+3rd). Each knockout stage shows the teams that
              <strong> actually qualified</strong>, and you can <strong>join at any stage</strong>.
            </p>
            <p className="text-slate-400">
              ⏱️ Each match <strong>closes 5 minutes before</strong> kick-off. <strong>Scorers, cards
              and VAR</strong> can be predicted but <strong>do not count</strong> for the ranking.
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
              El ranking se ordena por el <strong>total de puntos acumulados en todo el Mundial</strong>.
            </p>
            <p className="text-slate-400">
              📣 Se predice <strong>una etapa por vez</strong>: sólo está abierta la etapa en curso
              (grupos → 16avos → 8avos → 4tos → semis+final+3º). Cada etapa de eliminatoria muestra los
              equipos que <strong>realmente clasificaron</strong>, y podés <strong>entrar en cualquier
              instancia</strong>.
            </p>
            <p className="text-slate-400">
              ⏱️ Cada partido <strong>se cierra 5 minutos antes</strong> de empezar.
              <strong> Goleadores, tarjetas y VAR</strong> se pueden pronosticar pero <strong>no suman
              al ranking</strong>.
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
                <div className="text-right">
                  <div className="font-bold tabular-nums">
                    {Math.round(Number(r.points))} {t('pts', 'pts')}
                  </div>
                  <div className="text-[10px] text-slate-500 tabular-nums">{Number(r.accuracy).toFixed(0)}%</div>
                </div>
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
