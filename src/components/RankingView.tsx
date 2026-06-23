import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '../auth'
import { fetchRanking, type RankingRow } from '../lib/remote'
import { useT } from '../i18n'
import { useStore, getScenario, REAL_SCENARIO_ID } from '../store/useStore'
import { resolve } from '../engine/resolve'
import { TEAM_BY_ID } from '../data/teams'
import { rankDeltas, tieGroups } from '../lib/rankDelta'
import { LiveBanner } from './LiveBanner'
import { Avatar } from './Avatar'
import { useTheme, ACCENT } from '../theme'

const MEDALS = ['🥇', '🥈', '🥉']

function TeamMini({ id }: { id?: string }) {
  const team = id ? TEAM_BY_ID[id] : undefined
  return (
    <span className="whitespace-nowrap">
      {team?.flag ?? '🏳️'} {id ?? '???'}
    </span>
  )
}

// Puesto: medalla para el top 3, número en círculo para el resto.
function RankBadge({ rank }: { rank: number }) {
  const { c, dark } = useTheme()
  if (rank <= 3) return <span className="shrink-0 text-center" style={{ width: 30, fontSize: 22, lineHeight: 1 }}>{MEDALS[rank - 1]}</span>
  return (
    <span
      className="shrink-0 flex items-center justify-center"
      style={{ width: 30, height: 30, borderRadius: 10, fontFamily: "'Archivo'", fontWeight: 800, fontSize: 13, color: c.muted, background: dark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.05)', border: '1px solid ' + c.line }}
    >
      {rank}
    </span>
  )
}

// Cambio de puesto: chip verde (subió) / rojo (bajó) / gris (igual).
function DeltaBadge({ delta }: { delta: number }) {
  const { c } = useTheme()
  if (delta === 0) {
    return <span className="text-[10px]" style={{ color: c.faint }}>▬</span>
  }
  const up = delta > 0
  const col = up ? ACCENT.green : ACCENT.red
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums" style={{ color: col, background: col + '1F' }}>
      {up ? '▲' : '▼'} {Math.abs(delta)}
    </span>
  )
}

// Predicción del último partido, coloreada por acierto (exacto/resultado/error).
function PredScore({ ph, pa, rh, ra, homeFlag, awayFlag, points }: { ph: number; pa: number; rh: number; ra: number; homeFlag: string; awayFlag: string; points: number }) {
  const { c } = useTheme()
  const exact = ph === rh && pa === ra
  const result = Math.sign(ph - pa) === Math.sign(rh - ra)
  const col = exact ? ACCENT.green : result ? ACCENT.blue : '#9b8d6e'
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-bold shrink-0" style={{ background: col + '1A', border: '1px solid ' + col + '55', color: c.text }}>
      <span>{homeFlag}</span>
      <span className="tabular-nums" style={{ color: col }}>{ph}-{pa}</span>
      <span>{awayFlag}</span>
      {points > 0 && <span className="text-[10px]" style={{ color: col }}>+{points}</span>}
    </span>
  )
}

export function RankingView() {
  const { enabled, user } = useAuth()
  const { t } = useT()
  const { c, dark } = useTheme()
  const [rows, setRows] = useState<RankingRow[] | null>(null)
  const [error, setError] = useState('')

  const real = useStore((s) => getScenario(s.scenarios, REAL_SCENARIO_ID))
  const realResults = real?.results ?? {}
  const realRes = useMemo(() => resolve(realResults), [realResults])

  const lastMatchId = rows?.find((r) => r.last_match_id != null)?.last_match_id ?? null
  const lastTeams = lastMatchId != null ? realRes.matches[lastMatchId] : undefined
  const lastReal = lastMatchId != null ? realResults[lastMatchId] : undefined
  const lastHomeFlag = TEAM_BY_ID[lastTeams?.home ?? '']?.flag ?? '🏳️'
  const lastAwayFlag = TEAM_BY_ID[lastTeams?.away ?? '']?.flag ?? '🏳️'

  const deltas = useMemo(
    () =>
      rankDeltas(
        (rows ?? []).map((r) => ({ user_id: r.user_id, points: Number(r.points), last_points: Number(r.last_points ?? 0) })),
      ),
    [rows],
  )

  // Orden del ranking (también lo hace el servidor, pero lo reforzamos en el
  // cliente para que el desempate valga aun con datos viejos):
  //   1º más PUNTOS · 2º más marcadores EXACTOS · 3º más RESULTADOS acertados.
  // Sólo comparten puesto quienes empatan en los tres.
  const rowList = useMemo(() => {
    const sorted = [...(rows ?? [])].sort(
      (a, b) =>
        Number(b.points) - Number(a.points) ||
        Number(b.exact_count ?? 0) - Number(a.exact_count ?? 0) ||
        Number(b.result_count ?? 0) - Number(a.result_count ?? 0),
    )
    return tieGroups(
      sorted,
      (r) => `${Number(r.points)}|${Number(r.exact_count ?? 0)}|${Number(r.result_count ?? 0)}`,
    ).flatMap((g) => g.members.map((r) => ({ r, rank: g.rank })))
  }, [rows])

  const load = () => {
    setError('')
    fetchRanking()
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : t('No se pudo cargar', 'Could not load')))
  }

  useEffect(() => {
    if (!(enabled && user)) return
    load()
    const id = setInterval(load, 60_000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, user])

  const lastSync = useStore((s) => s.lastSync)
  useEffect(() => {
    if (!(enabled && user) || !lastSync) return
    const id = setTimeout(load, 3000)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastSync, enabled, user])

  if (!enabled) {
    return <Empty>{t('El ranking compartido necesita el login con Supabase configurado. Por ahora estás en modo local.', 'The shared ranking needs login with Supabase configured. You are currently in local mode.')}</Empty>
  }
  if (!user) {
    return <Empty>{t('Iniciá sesión para ver el ranking de toda la plataforma.', 'Sign in to see the platform-wide ranking.')}</Empty>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold" style={{ fontFamily: "'Archivo'", color: c.text }}>🏆 Ranking{rows && rows.length > 0 ? ` · ${rows.length}` : ''}</h2>
        <button onClick={load} className="text-xs px-2 py-1 rounded-lg" style={{ color: c.muted }}>↻ {t('Actualizar', 'Refresh')}</button>
      </div>

      <LiveBanner realResults={realResults} />

      {lastMatchId != null && lastReal?.played && (
        <div className="rounded-xl px-3 py-2 mb-3 text-sm flex items-center gap-2 flex-wrap" style={{ background: dark ? 'rgba(31,168,92,.14)' : 'rgba(31,168,92,.12)', border: '1px solid rgba(31,168,92,.35)', color: c.text }}>
          <span className="font-semibold" style={{ color: ACCENT.green }}>🟢 {t('Último resultado:', 'Latest result:')}</span>
          <span className="font-medium tabular-nums whitespace-nowrap">
            <TeamMini id={lastTeams?.home} /> {lastReal.homeScore}-{lastReal.awayScore} <TeamMini id={lastTeams?.away} />
            {lastReal.homePens != null && lastReal.awayPens != null && (
              <span style={{ color: c.muted }}> ({lastReal.homePens}-{lastReal.awayPens} pen)</span>
            )}
          </span>
        </div>
      )}

      <div className="rounded-xl p-3 mb-4 text-xs space-y-1.5" style={{ background: c.cardGrad, border: '1px solid ' + c.line, color: c.muted }}>
        <p className="font-semibold" style={{ color: c.text }}>📋 {t('Cómo se puntúa', 'How scoring works')}</p>
        <p>
          {t('El ranking cuenta sólo los resultados de los partidos, que es lo que la app verifica con los marcadores en vivo:', 'The ranking counts only match results, which the app verifies from the live scores:')}
        </p>
        <ul className="list-disc pl-4 space-y-0.5" style={{ color: c.muted }}>
          <li>
            <strong style={{ color: ACCENT.green }}>{t('Marcador exacto', 'Exact score')}</strong> {t('o', 'or')} <strong style={{ color: ACCENT.blue }}>{t('sólo el resultado', 'just the result')}</strong> {t('(ganó/empató/perdió).', '(win/draw/loss).')}
          </li>
          <li>{t('Errar el resultado: 0 puntos.', 'Wrong result: 0 points.')}</li>
        </ul>
        <p style={{ color: c.muted }}>
          {t('Los puntos valen más a medida que avanza el torneo (exacto / resultado): Grupos 3/1 · 16avos 4/2 · 8vos 5/2 · 4tos 6/3 · Semis 8/4 · Final y 3º 10/5.', 'Points are worth more as the tournament advances (exact / result): Groups 3/1 · R32 4/2 · R16 5/2 · QF 6/3 · SF 8/4 · Final & 3rd 10/5.')}
        </p>
        <p className="font-semibold pt-1" style={{ color: c.text }}>⚖️ {t('Desempate', 'Tie-breaker')}</p>
        <p style={{ color: c.muted }}>
          {t('Si dos personas tienen los mismos puntos, queda más arriba quien tenga ', 'If two people have the same points, the one ranked higher is whoever has ')}
          <strong style={{ color: ACCENT.green }}>{t('más marcadores exactos', 'more exact scores')}</strong>
          {t('. Si siguen iguales, quien tenga ', '. If still tied, whoever has ')}
          <strong style={{ color: ACCENT.blue }}>{t('más resultados acertados', 'more correct results')}</strong>
          {t(' (ganó/empató/perdió). Si todo coincide, comparten el mismo puesto.', ' (win/draw/loss). If everything matches, they share the same position.')}
        </p>
      </div>

      {error && <p className="text-xs mb-2" style={{ color: ACCENT.red }}>{error}</p>}
      {rows == null ? (
        <p className="text-sm" style={{ color: c.muted }}>{t('Cargando…', 'Loading…')}</p>
      ) : rows.length === 0 ? (
        <Empty>{t('Todavía no hay puntajes cargados. ¡Sé el primero en armar tu predicción!', 'No scores yet. Be the first to make your prediction!')}</Empty>
      ) : (
        <div className="space-y-2">
          {rowList.map(({ r, rank }) => {
            const mine = r.user_id === user.id
            const predicted = r.last_pred_home != null && r.last_pred_away != null
            return (
              <div
                key={r.user_id}
                className="rounded-2xl px-3 py-2.5"
                style={mine ? { border: '1px solid ' + ACCENT.blue, background: dark ? 'rgba(47,109,240,.16)' : 'rgba(47,109,240,.09)' } : { border: '1px solid ' + c.line, background: c.cardGrad, boxShadow: c.shadow }}
              >
                <div className="flex items-center gap-2.5">
                  <RankBadge rank={rank} />
                  <Avatar src={r.avatar_url} name={r.display_name} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate" style={{ color: c.text, fontFamily: "'Archivo'" }}>
                      {r.display_name}
                      {mine && <span className="text-[10px] ml-1" style={{ color: ACCENT.blue }}>{t('(vos)', '(you)')}</span>}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                      {lastMatchId != null && <DeltaBadge delta={deltas.get(r.user_id) ?? 0} />}
                      <span className="text-[10px] font-semibold tabular-nums" style={{ color: ACCENT.green }} title={t('Marcadores exactos (1er desempate)', 'Exact scores (1st tie-breaker)')}>
                        🎯 {Number(r.exact_count ?? 0)} {t('exactos', 'exact')}
                      </span>
                      <span className="text-[10px] font-semibold tabular-nums" style={{ color: ACCENT.blue }} title={t('Resultados acertados — ganó/empató/perdió (2º desempate)', 'Correct results — win/draw/loss (2nd tie-breaker)')}>
                        ✅ {Number(r.result_count ?? 0)} {t('result.', 'results')}
                      </span>
                      <span className="text-[10px]" style={{ color: c.faint }}>{Number(r.accuracy).toFixed(0)}% {t('efectiv.', 'acc.')}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold tabular-nums leading-none" style={{ fontFamily: "'Archivo'", fontSize: 20, color: c.text }}>
                      {Math.round(Number(r.points))}
                      <span className="text-[10px] ml-0.5 font-semibold" style={{ color: c.muted }}>{t('pts', 'pts')}</span>
                    </div>
                  </div>
                </div>

                {lastMatchId != null && lastReal?.played && (
                  <div className="mt-2 flex items-center justify-between gap-2" style={{ paddingLeft: 40 }}>
                    <span className="text-[10px]" style={{ color: c.faint }}>{t('Su pronóstico del último', 'Last match pick')}</span>
                    {predicted ? (
                      <PredScore ph={r.last_pred_home!} pa={r.last_pred_away!} rh={lastReal.homeScore} ra={lastReal.awayScore} homeFlag={lastHomeFlag} awayFlag={lastAwayFlag} points={Number(r.last_points ?? 0)} />
                    ) : (
                      <span className="text-xs italic" style={{ color: c.faint }}>{t('Sin predicción', 'No prediction')}</span>
                    )}
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
