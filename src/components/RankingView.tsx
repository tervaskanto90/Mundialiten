import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '../auth'
import { fetchRanking, type RankingRow } from '../lib/remote'
import { useT } from '../i18n'
import { useStore, getScenario, REAL_SCENARIO_ID } from '../store/useStore'
import { resolve } from '../engine/resolve'
import { TEAM_BY_ID } from '../data/teams'
import { rankDeltas, tieGroups } from '../lib/rankDelta'
import { LiveBanner } from './LiveBanner'
import { useTheme, ACCENT } from '../theme'

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
  const { c } = useTheme()
  if (delta > 0) return <span style={{ color: ACCENT.green }} title="Subió">▲</span>
  if (delta < 0) return <span style={{ color: ACCENT.red }} title="Bajó">▼</span>
  return <span style={{ color: c.faint }} title="Se mantuvo">▬</span>
}

export function RankingView() {
  const { enabled, user } = useAuth()
  const { t, lang } = useT()
  const { c, dark } = useTheme()
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

  // Agrupa por PUESTO: usuarios con los mismos puntos comparten puesto y van en
  // el mismo renglón (repartido en partes iguales). El rank es la posición del
  // primero del grupo (1, 2, 2, 4… competición estándar).
  const groups = useMemo(
    () =>
      tieGroups(rows ?? [], (r) => Number(r.points)).map((g) => ({
        key: g.members.map((m) => m.user_id).join('|'),
        rank: g.rank,
        members: g.members,
      })),
    [rows],
  )

  const load = () => {
    setError('')
    fetchRanking()
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : t('No se pudo cargar', 'Could not load')))
  }

  // Carga inicial + refresco periódico (respaldo) mientras la pestaña está abierta.
  useEffect(() => {
    if (!(enabled && user)) return
    load()
    const id = setInterval(load, 60_000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, user])

  // Refresco al terminar cada sincronización en vivo (con un margen para que el
  // servidor recalcule el ranking tras guardarse los resultados reales).
  const lastSync = useStore((s) => s.lastSync)
  useEffect(() => {
    if (!(enabled && user) || !lastSync) return
    const id = setTimeout(load, 3000)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastSync, enabled, user])

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
        <h2 className="font-semibold" style={{ fontFamily: "'Archivo'", color: c.text }}>🏆 Ranking{rows && rows.length > 0 ? ` · ${rows.length}` : ''}</h2>
        <button onClick={load} className="text-xs px-2 py-1 rounded-lg" style={{ color: c.muted }}>
          ↻ {t('Actualizar', 'Refresh')}
        </button>
      </div>

      <LiveBanner realResults={realResults} />

      {lastMatchId != null && lastReal?.played && (
        <div
          className="rounded-xl px-3 py-2 mb-3 text-sm flex items-center gap-2 flex-wrap"
          style={{
            background: dark ? 'rgba(31,168,92,.14)' : 'rgba(31,168,92,.12)',
            border: '1px solid rgba(31,168,92,.35)',
            color: c.text,
          }}
        >
          <span className="font-semibold" style={{ color: ACCENT.green }}>🟢 {t('Último resultado:', 'Latest result:')}</span>
          <span className="font-medium tabular-nums whitespace-nowrap">
            <TeamMini id={lastTeams?.home} /> {lastReal.homeScore}-{lastReal.awayScore}{' '}
            <TeamMini id={lastTeams?.away} />
            {lastReal.homePens != null && lastReal.awayPens != null && (
              <span style={{ color: c.muted }}> ({lastReal.homePens}-{lastReal.awayPens} pen)</span>
            )}
          </span>
        </div>
      )}

      <div
        className="rounded-xl p-3 mb-4 text-xs space-y-1.5"
        style={{ background: c.cardGrad, border: '1px solid '+c.line, color: c.muted }}
      >
        {lang === 'en' ? (
          <>
            <p className="font-semibold" style={{ color: c.text }}>📋 How scoring works</p>
            <p>
              The ranking counts <strong>only match results</strong>, which the app verifies
              automatically from the live scores:
            </p>
            <ul className="list-disc pl-4 space-y-0.5" style={{ color: c.muted }}>
              <li>
                <strong style={{ color: ACCENT.green }}>Exact score</strong> (e.g. you predicted 2-1 and
                it ended 2-1) or <strong style={{ color: ACCENT.gold }}>just the result</strong>
                (win/draw/loss, without the exact score; e.g. you predicted 1-1 and it ended 0-0).
              </li>
              <li>Wrong result: 0 points.</li>
            </ul>
            <p style={{ color: c.muted }}>
              Points are <strong>worth more as the tournament advances</strong> (exact / result):
              Groups 3/1 · R32 4/2 · R16 5/2 · QF 6/3 · SF 8/4 · Final & 3rd 10/5. The ranking is
              ordered by <strong>total points accumulated over the whole World Cup</strong>.
            </p>
            <p style={{ color: c.muted }}>
              📣 You predict <strong>one stage at a time</strong>: only the current stage is open
              (groups → R32 → R16 → QF → semis+final+3rd). Each knockout stage shows the teams that
              <strong> actually qualified</strong>, and you can <strong>join at any stage</strong>.
            </p>
            <p style={{ color: c.muted }}>
              ⏱️ Each match <strong>closes 5 minutes before</strong> kick-off. <strong>Scorers, cards
              and VAR</strong> can be predicted but <strong>do not count</strong> for the ranking.
            </p>
          </>
        ) : (
          <>
            <p className="font-semibold" style={{ color: c.text }}>📋 Cómo se puntúa</p>
            <p>
              El ranking cuenta <strong>sólo los resultados de los partidos</strong>, que es lo que la
              app verifica automáticamente con los marcadores en vivo:
            </p>
            <ul className="list-disc pl-4 space-y-0.5" style={{ color: c.muted }}>
              <li>
                <strong style={{ color: ACCENT.green }}>Marcador exacto</strong> (ej: predijiste 2-1 y
                salió 2-1) o <strong style={{ color: ACCENT.gold }}>sólo el resultado</strong>
                (ganó/empató/perdió, sin el marcador; ej: predijiste 1-1 y salió 0-0).
              </li>
              <li>Errar el resultado: 0 puntos.</li>
            </ul>
            <p style={{ color: c.muted }}>
              Los puntos <strong>valen más a medida que avanza el torneo</strong> (exacto / sólo
              resultado): Grupos 3/1 · 16avos 4/2 · 8vos 5/2 · 4tos 6/3 · Semis 8/4 · Final y 3º 10/5.
              El ranking se ordena por el <strong>total de puntos acumulados en todo el Mundial</strong>.
            </p>
            <p style={{ color: c.muted }}>
              📣 Se predice <strong>una etapa por vez</strong>: sólo está abierta la etapa en curso
              (grupos → 16avos → 8avos → 4tos → semis+final+3º). Cada etapa de eliminatoria muestra los
              equipos que <strong>realmente clasificaron</strong>, y podés <strong>entrar en cualquier
              instancia</strong>.
            </p>
            <p style={{ color: c.muted }}>
              ⏱️ Cada partido <strong>se cierra 5 minutos antes</strong> de empezar.
              <strong> Goleadores, tarjetas y VAR</strong> se pueden pronosticar pero <strong>no suman
              al ranking</strong>.
            </p>
          </>
        )}
      </div>
      {error && <p className="text-xs mb-2" style={{ color: ACCENT.red }}>{error}</p>}
      {rows == null ? (
        <p className="text-sm" style={{ color: c.muted }}>{t('Cargando…', 'Loading…')}</p>
      ) : rows.length === 0 ? (
        <Empty>{t('Todavía no hay puntajes cargados. ¡Sé el primero en armar tu predicción!', 'No scores yet. Be the first to make your prediction!')}</Empty>
      ) : (
        <div className="space-y-2">
          {groups.map((g) => {
            const medal = MEDALS[g.rank - 1] ?? g.rank
            // Puesto compartido por 2+ usuarios → mismo renglón, repartido en partes iguales.
            if (g.members.length > 1) {
              return (
                <div
                  key={g.key}
                  className="rounded-xl px-3 py-2.5 flex items-center gap-2"
                  style={{ background: c.cardGrad, border: '1px solid '+c.line }}
                >
                  <span className="w-7 text-center text-lg shrink-0">{medal}</span>
                  <div className="flex-1 min-w-0 flex gap-2">
                    {g.members.map((r) => {
                      const mine = r.user_id === user.id
                      const predicted = r.last_pred_home != null && r.last_pred_away != null
                      return (
                        <div
                          key={r.user_id}
                          className="flex-1 basis-0 min-w-0 rounded-lg px-2 py-1.5"
                          style={
                            mine
                              ? {
                                  border: '1px solid '+ACCENT.blue,
                                  background: dark ? 'rgba(47,109,240,.18)' : 'rgba(47,109,240,.10)',
                                }
                              : { border: '1px solid '+c.line, background: c.cardGrad }
                          }
                        >
                          <div className="truncate font-medium text-sm" style={{ color: c.text }}>
                            {r.display_name}
                            {mine && <span className="text-[9px] ml-0.5" style={{ color: ACCENT.blue }}>{t('(vos)', '(you)')}</span>}
                          </div>
                          <div className="flex items-baseline gap-1">
                            <span className="font-bold tabular-nums text-sm" style={{ fontFamily: "'Archivo'", color: c.text }}>
                              {Math.round(Number(r.points))} {t('pts', 'pts')}
                            </span>
                            <span className="text-[9px] tabular-nums" style={{ color: c.faint }}>
                              {Number(r.accuracy).toFixed(0)}%
                            </span>
                          </div>
                          {lastMatchId != null && (
                            <div className="flex items-center gap-1 mt-1 text-[10px] min-w-0" style={{ color: c.muted }}>
                              <Arrow delta={deltas.get(r.user_id) ?? 0} />
                              {predicted && <span className="tabular-nums shrink-0">+{Number(r.last_points ?? 0)}</span>}
                              <span className="ml-auto truncate text-right">
                                {predicted ? (
                                  <span className="tabular-nums whitespace-nowrap">
                                    <TeamMini id={lastTeams?.home} /> {r.last_pred_home}-{r.last_pred_away}{' '}
                                    <TeamMini id={lastTeams?.away} />
                                  </span>
                                ) : (
                                  <span className="italic" style={{ color: c.faint }}>{t('Sin pred.', 'No pred.')}</span>
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            }

            // Puesto de un solo usuario → renglón completo (igual que siempre).
            const r = g.members[0]
            const mine = r.user_id === user.id
            const predicted = r.last_pred_home != null && r.last_pred_away != null
            return (
              <div
                key={g.key}
                className="rounded-xl px-3 py-2.5"
                style={
                  mine
                    ? {
                        border: '1px solid '+ACCENT.blue,
                        background: dark ? 'rgba(47,109,240,.18)' : 'rgba(47,109,240,.10)',
                      }
                    : { border: '1px solid '+c.line, background: c.cardGrad, boxShadow: c.shadow }
                }
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 text-center text-lg">{medal}</span>
                  <span className="flex-1 truncate font-medium" style={{ color: c.text }}>
                    {r.display_name}
                    {mine && <span className="text-[10px] ml-1" style={{ color: ACCENT.blue }}>{t('(vos)', '(you)')}</span>}
                  </span>
                  <div className="text-right">
                    <div className="font-bold tabular-nums" style={{ fontFamily: "'Archivo'", color: c.text }}>
                      {Math.round(Number(r.points))} {t('pts', 'pts')}
                    </div>
                    <div className="text-[10px] tabular-nums" style={{ color: c.faint }}>{Number(r.accuracy).toFixed(0)}%</div>
                  </div>
                </div>

                {lastMatchId != null && (
                  <div className="flex items-center gap-2 mt-1.5 pl-10 text-xs">
                    <span className="flex items-center gap-1 shrink-0">
                      <Arrow delta={deltas.get(r.user_id) ?? 0} />
                      {predicted && (
                        <span className="tabular-nums" style={{ color: c.muted }}>+{Number(r.last_points ?? 0)}</span>
                      )}
                    </span>
                    <span className="ml-auto text-right truncate" style={{ color: c.muted }}>
                      {predicted ? (
                        <span className="tabular-nums whitespace-nowrap">
                          <TeamMini id={lastTeams?.home} /> {r.last_pred_home}-{r.last_pred_away}{' '}
                          <TeamMini id={lastTeams?.away} />
                        </span>
                      ) : (
                        <span className="italic" style={{ color: c.faint }}>{t('Sin predicción', 'No prediction')}</span>
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
  const { c } = useTheme()
  return (
    <div className="text-center py-12 text-sm" style={{ color: c.muted }}>
      <p className="text-4xl mb-3">🏆</p>
      <p className="max-w-xs mx-auto">{children}</p>
    </div>
  )
}
