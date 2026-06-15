import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '../auth'
import { fetchRanking, type RankingRow } from '../lib/remote'
import { useT } from '../i18n'
import { useStore, getScenario, REAL_SCENARIO_ID } from '../store/useStore'
import { resolve } from '../engine/resolve'
import { TEAM_BY_ID } from '../data/teams'
import { rankDeltas } from '../lib/rankDelta'

const MEDALS = ['🥇', '🥈', '🥉']

/** Bandera + código de 3 letras de una selección (el id ya es el código). */
function TeamMini({ id }: { id?: string }) {
  const team = id ? TEAM_BY_ID[id] : undefined
  return (
    <span className="whitespace-nowrap">
      {team?.flag ?? '🏳️'} {id ?? '???'}
    </span>
  )
}

function Arrow({ delta }: { delta: number }) {
  if (delta > 0) return <span className="text-emerald-400" title="Subió">▲</span>
  if (delta < 0) return <span className="text-rose-400" title="Bajó">▼</span>
  return <span className="text-slate-500" title="Se mantuvo">▬</span>
}

export function RankingView() {
  const { enabled, user } = useAuth()
  const { t, lang } = useT()
  const [rows, setRows] = useState<RankingRow[] | null>(null)
  const [error, setError] = useState('')

  // Resultados reales (para el recuadro del último partido y las banderas).
  const real = useStore((s) => getScenario(s.scenarios, REAL_SCENARIO_ID))
  const realResults = real?.results ?? {}
  const realRes = useMemo(() => resolve(realResults), [realResults])

  // Último partido sincronizado (lo marca el servidor en cada fila, igual para todos).
  const lastMatchId = rows?.find((r) => r.last_match_id != null)?.last_match_id ?? null
  const lastTeams = lastMatchId != null ? realRes.matches[lastMatchId] : undefined
  const lastReal = lastMatchId != null ? realResults[lastMatchId] : undefined

  // Cambio de puesto por efecto del último partido (se calcula en el cliente).
  const deltas = useMemo(
    () =>
      rankDeltas(
        (rows ?? []).map((r) => ({
          user_id: r.user_id,
          points: Number(r.points),
          last_points: Number(r.last_points ?? 0),
        })),
      ),
    [rows],
  )

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

      {lastMatchId != null && lastReal?.played && (
        <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-3 py-2 mb-3 text-sm flex items-center gap-2 flex-wrap">
          <span className="text-emerald-300 font-semibold">🟢 {t('Último resultado:', 'Latest result:')}</span>
          <span className="font-medium tabular-nums whitespace-nowrap">
            <TeamMini id={lastTeams?.home} /> {lastReal.homeScore}-{lastReal.awayScore}{' '}
            <TeamMini id={lastTeams?.away} />
            {lastReal.homePens != null && lastReal.awayPens != null && (
              <span className="text-slate-400"> ({lastReal.homePens}-{lastReal.awayPens} pen)</span>
            )}
          </span>
        </div>
      )}

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
            const predicted = r.last_pred_home != null && r.last_pred_away != null
            return (
              <div
                key={r.user_id}
                className={`rounded-xl px-3 py-2.5 border ${
                  mine ? 'border-pitch-500/50 bg-pitch-500/10' : 'border-white/5 bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
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

                {lastMatchId != null && (
                  <div className="flex items-center gap-2 mt-1.5 pl-10 text-xs">
                    <span className="flex items-center gap-1 shrink-0">
                      <Arrow delta={deltas.get(r.user_id) ?? 0} />
                      {predicted && (
                        <span className="text-slate-400 tabular-nums">+{Number(r.last_points ?? 0)}</span>
                      )}
                    </span>
                    <span className="ml-auto text-right truncate text-slate-300">
                      {predicted ? (
                        <span className="tabular-nums whitespace-nowrap">
                          <TeamMini id={lastTeams?.home} /> {r.last_pred_home}-{r.last_pred_away}{' '}
                          <TeamMini id={lastTeams?.away} />
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">{t('Sin predicción', 'No prediction')}</span>
                      )}
                    </span>
                  </div>
                )}
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
