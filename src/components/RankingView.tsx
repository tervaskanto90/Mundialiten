import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '../auth'
import { fetchRanking, fetchPastPredictions, type RankingRow, type PastPred } from '../lib/remote'
import { useT } from '../i18n'
import { useStore, getScenario, REAL_SCENARIO_ID } from '../store/useStore'
import { resolve } from '../engine/resolve'
import { MATCH_BY_ID } from '../data/schedule'
import { STAGE_POINTS, advancingSide } from '../engine/accuracy'
import { TEAM_BY_ID } from '../data/teams'
import { rankDeltas, tieGroups } from '../lib/rankDelta'
import { Avatar } from './Avatar'
import { useIsDesktop } from '../hooks/useIsDesktop'
import { STAGING, stagingFakePred, stagingFakeAdvanceCount } from '../staging'
import { useTheme, ACCENT } from '../theme'

const MEDALS = ['🥇', '🥈', '🥉']

// Puntos del marcador de un partido (sin el bonus de penales, que no se expone
// en el historial): exacto o sólo resultado, escalonado por fase.
function marcadorPoints(mid: number, ph: number, pa: number, rh: number, ra: number): number {
  const pts = STAGE_POINTS[MATCH_BY_ID[mid].stage]
  if (ph === rh && pa === ra) return pts.exact
  if (Math.sign(ph - pa) === Math.sign(rh - ra)) return pts.tendency
  return 0
}

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

// Predicción de un partido, coloreada por acierto (exacto/resultado/error).
function PredScore({ ph, pa, rh, ra, homeFlag, awayFlag, points, compact, dim }: { ph: number; pa: number; rh: number; ra: number; homeFlag: string; awayFlag: string; points: number; compact?: boolean; dim?: boolean }) {
  const { c } = useTheme()
  const exact = ph === rh && pa === ra
  const result = Math.sign(ph - pa) === Math.sign(rh - ra)
  const col = exact ? ACCENT.green : result ? ACCENT.blue : '#9b8d6e'
  return (
    <span
      className={`inline-flex items-center rounded-full font-bold shrink-0 ${compact ? 'gap-1 px-2 py-0.5 text-xs' : 'gap-1.5 px-2.5 py-1 text-sm'}`}
      style={{ background: col + '1A', border: '1px ' + (dim ? 'dashed ' : 'solid ') + col + (dim ? '99' : '55'), color: c.text, opacity: dim ? 0.72 : 1 }}
    >
      <span>{homeFlag}</span>
      <span className="tabular-nums" style={{ color: col }}>{ph}-{pa}</span>
      <span>{awayFlag}</span>
      {points > 0 && <span className={compact ? 'text-[9px]' : 'text-[10px]'} style={{ color: col }}>+{points}</span>}
    </span>
  )
}

export function RankingView() {
  const { enabled, user } = useAuth()
  const { t } = useT()
  const { c, dark } = useTheme()
  const isDesktop = useIsDesktop()
  const [rows, setRows] = useState<RankingRow[] | null>(null)
  const [past, setPast] = useState<PastPred[] | null>(null)
  const [error, setError] = useState('')
  const [scoringOpen, setScoringOpen] = useState(false)

  const real = useStore((s) => getScenario(s.scenarios, REAL_SCENARIO_ID))
  const realResults = real?.results ?? {}
  const realRes = useMemo(() => resolve(realResults), [realResults])

  // Partidos del último horario jugado: en la fase final de grupos (y en adelante)
  // se juegan de a DOS a la vez, así que mostramos ambos (1 o 2).
  const targetIds = useMemo(() => {
    const playedIds = Object.keys(realResults)
      .map(Number)
      .filter((id) => MATCH_BY_ID[id] && realResults[id]?.played)
    if (playedIds.length === 0) return [] as number[]
    const ko = (id: number) => Date.parse(MATCH_BY_ID[id].kickoff)
    const maxKo = Math.max(...playedIds.map(ko))
    return playedIds.filter((id) => ko(id) === maxKo).sort((a, b) => a - b).slice(0, 2)
  }, [realResults])

  // Partidos del lote que están EN VIVO (jugándose, sin terminar): se muestran
  // como provisorios en el ranking.
  const liveIds = useMemo(
    () => new Set(targetIds.filter((id) => realResults[id]?.played && !realResults[id]?.finished)),
    [targetIds, realResults],
  )
  const anyLive = liveIds.size > 0

  // Predicción de cada usuario para esos partidos (del historial público).
  const predByKey = useMemo(() => {
    const m = new Map<string, { home: number; away: number }>()
    for (const p of past ?? []) m.set(`${p.user_id}|${p.match_id}`, { home: p.home, away: p.away })
    return m
  }, [past])

  // En staging, si no hay predicción real para el partido (eliminatorias no se
  // suben a Supabase), usamos una sintética para poblar el preview.
  const predFor = (userId: string, matchId: number): { home: number; away: number; homePens?: number; awayPens?: number } | undefined =>
    predByKey.get(`${userId}|${matchId}`) ?? (STAGING ? stagingFakePred(userId, matchId) : undefined)

  // Pases de ronda acertados (3er desempate). El servidor todavía no lo trae;
  // en staging lo sintetizamos para el preview.
  const advCountOf = (r: RankingRow): number => {
    const fromServer = (r as RankingRow & { advance_count?: number }).advance_count
    if (fromServer != null) return Number(fromServer)
    return STAGING ? stagingFakeAdvanceCount(r.user_id) : 0
  }
  const showAdvance = STAGING || rows?.some((r) => (r as RankingRow & { advance_count?: number }).advance_count != null)

  const deltas = useMemo(
    () =>
      rankDeltas(
        (rows ?? []).map((r) => ({ user_id: r.user_id, points: Number(r.points), last_points: Number(r.last_points ?? 0) })),
      ),
    [rows],
  )

  // Orden del ranking (también lo hace el servidor, pero lo reforzamos en el
  // cliente para que el desempate valga aun con datos viejos):
  //   1º más PUNTOS · 2º más marcadores EXACTOS · 3º más RESULTADOS acertados ·
  //   4º más PASES DE RONDA acertados. Sólo comparten puesto quienes empatan en
  //   los cuatro.
  const rowList = useMemo(() => {
    const sorted = [...(rows ?? [])].sort(
      (a, b) =>
        Number(b.points) - Number(a.points) ||
        Number(b.exact_count ?? 0) - Number(a.exact_count ?? 0) ||
        Number(b.result_count ?? 0) - Number(a.result_count ?? 0) ||
        advCountOf(b) - advCountOf(a),
    )
    return tieGroups(
      sorted,
      (r) => `${Number(r.points)}|${Number(r.exact_count ?? 0)}|${Number(r.result_count ?? 0)}|${advCountOf(r)}`,
    ).flatMap((g) => g.members.map((r) => ({ r, rank: g.rank })))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows])

  const load = () => {
    setError('')
    fetchRanking()
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : t('No se pudo cargar', 'Could not load')))
    fetchPastPredictions().then(setPast).catch(() => setPast([]))
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

      {targetIds.length > 0 && (
        <div
          className="rounded-xl px-3 py-2 mb-3 text-sm flex items-center gap-x-3 gap-y-1 flex-wrap"
          style={{
            background: anyLive ? (dark ? 'rgba(229,50,43,.14)' : 'rgba(229,50,43,.10)') : dark ? 'rgba(31,168,92,.14)' : 'rgba(31,168,92,.12)',
            border: '1px solid ' + (anyLive ? 'rgba(229,50,43,.45)' : 'rgba(31,168,92,.35)'),
            color: c.text,
          }}
        >
          <span className="font-semibold" style={{ color: anyLive ? ACCENT.red : ACCENT.green, animation: anyLive ? 'mdlGlow 1.6s ease-in-out infinite' : undefined }}>
            {anyLive ? '🔴 ' + t('EN VIVO:', 'LIVE:') : targetIds.length > 1 ? '🟢 ' + t('Últimos resultados:', 'Latest results:') : '🟢 ' + t('Último resultado:', 'Latest result:')}
          </span>
          {targetIds.map((mid) => {
            const rr = realResults[mid]!
            const tm = realRes.matches[mid]
            const live = liveIds.has(mid)
            return (
              <span key={mid} className="font-medium tabular-nums whitespace-nowrap">
                <TeamMini id={tm?.home} /> {rr.homeScore}-{rr.awayScore} <TeamMini id={tm?.away} />
                {live && <span style={{ color: ACCENT.red, fontWeight: 700 }}> · {t('en juego', 'in play')}</span>}
                {rr.homePens != null && rr.awayPens != null && <span style={{ color: c.muted }}> ({rr.homePens}-{rr.awayPens}p)</span>}
              </span>
            )
          })}
          {anyLive && (
            <span className="text-[11px] w-full" style={{ color: c.muted }}>
              {t('Marcador y puntos PROVISORIOS hasta que termine el partido (puede cambiar en el alargue/penales).', 'Score and points are PROVISIONAL until the match ends (can change in extra time/penalties).')}
            </span>
          )}
        </div>
      )}

      <div className="rounded-xl mb-4 text-xs overflow-hidden" style={{ background: c.cardGrad, border: '1px solid ' + c.line, color: c.muted }}>
        <button
          onClick={() => setScoringOpen((o) => !o)}
          className="w-full flex items-center justify-between p-3"
          style={{ color: c.text }}
        >
          <span className="font-semibold">📋 {t('Cómo se puntúa', 'How scoring works')}</span>
          <span className="text-[11px]" style={{ color: c.muted }}>{scoringOpen ? '▾' : '▸'} {scoringOpen ? t('ocultar', 'hide') : t('ver detalle', 'details')}</span>
        </button>
        {scoringOpen && (
        <div className="px-3 pb-3 space-y-1.5">
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
        <p className="font-semibold pt-1" style={{ color: c.text }}>🥅 {t('Eliminatorias: quién pasa', 'Knockouts: who advances')}</p>
        <p style={{ color: c.muted }}>
          {t('En el mata-mata, además del marcador, sumás un bonus por acertar qué equipo avanza (en la final/3º, quién gana): 16avos/8vos +2 · 4tos +3 · Semis +4 · Final y 3º +5. Si predecís empate, elegí quién gana los penales (no se predice el marcador de la tanda).', 'In the knockouts, on top of the score you earn a bonus for calling which team advances (in the final/3rd, who wins): R32/R16 +2 · QF +3 · SF +4 · Final & 3rd +5. If you predict a draw, pick who wins on penalties (the shoot-out score isn’t predicted).')}
        </p>
        <p style={{ color: c.muted }}>
          {t('Ojo: el marcador y el bonus de “quién pasa” se cuentan POR SEPARADO. Podés fallar el marcador y aun así llevarte el bonus por acertar quién avanza (y al revés).', 'Heads up: the score and the “who advances” bonus are counted SEPARATELY. You can miss the score and still take the bonus for calling who advances (and vice versa).')}
        </p>
        <p style={{ color: c.muted }}>
          {t('Cada ronda (16avos → 8vos → 4tos → semis → final/3º) se predice CUANDO SE ABRE, ya armada con los equipos que realmente clasificaron y avanzaron. Por eso errar una ronda no te impide predecir la siguiente. El detalle completo está en “¿Cómo jugar?”.', 'Each round (R32 → R16 → QF → semis → final/3rd) is predicted WHEN IT OPENS, already built with the teams that actually qualified and advanced. So missing a round doesn’t stop you from predicting the next. Full detail is in “How to play”.')}
        </p>
        <div className="rounded-lg p-2.5 mt-1 space-y-1" style={{ background: dark ? 'rgba(31,168,92,.10)' : 'rgba(31,168,92,.08)', border: '1px solid rgba(31,168,92,.32)' }}>
          <p className="font-semibold" style={{ color: c.text }}>📐 {t('Ejemplo en CUARTOS de final', 'Example in the QUARTER-finals')}</p>
          <p style={{ color: c.muted }}>
            {t('Estás en cuartos de final. Predecís 1-1 y que pasa A (ganador de penales). Sale A 2-1:', 'You’re in a quarter-final. You predict 1-1 with A advancing (penalty winner). It ends A 2-1:')}
          </p>
          <ul className="list-disc pl-4 space-y-0.5" style={{ color: c.muted }}>
            <li>{t('Marcador: pronosticaste empate pero ganó A → ni exacto ni resultado → ', 'Score: you predicted a draw but A won → neither exact nor result → ')}<strong style={{ color: ACCENT.red }}>0</strong>.</li>
            <li>{t('Quién pasa: dijiste A y pasó A → ', 'Who advances: you said A and A advanced → ')}<strong style={{ color: ACCENT.green }}>+3</strong> {t('(bonus de cuartos)', '(QF bonus)')}.</li>
            <li><strong style={{ color: c.text }}>{t('Total: 3 puntos', 'Total: 3 points')}</strong> {t('(de 9 posibles en cuartos: 6 exacto + 3 bonus).', '(out of 9 possible in the QF: 6 exact + 3 bonus).')}</li>
          </ul>
        </div>
        <p className="font-semibold pt-1" style={{ color: c.text }}>⚖️ {t('Desempate (en orden)', 'Tie-breaker (in order)')}</p>
        <p style={{ color: c.muted }}>
          {t('Si dos personas tienen los mismos puntos, queda más arriba quien tenga, en este orden: ', 'If two people have the same points, the one ranked higher is whoever has, in this order: ')}
          <strong style={{ color: ACCENT.green }}>{t('🎯 más marcadores exactos', '🎯 more exact scores')}</strong>
          {t('; si siguen iguales, ', '; if still tied, ')}
          <strong style={{ color: ACCENT.blue }}>{t('✅ más resultados acertados', '✅ more correct results')}</strong>
          {t(' (ganó/empató/perdió); si siguen iguales, ', ' (win/draw/loss); if still tied, ')}
          <strong style={{ color: ACCENT.gold }}>{t('🎟️ más pases de ronda acertados', '🎟️ more correct advances')}</strong>
          {t(' (a quién acertaste que avanza en eliminatorias). Si todo coincide, comparten el mismo puesto.', ' (who you correctly called to go through in the knockouts). If everything matches, they share the same position.')}
        </p>
        </div>
        )}
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
            const nameBox = (
              <div className="font-semibold truncate" style={{ color: c.text, fontFamily: "'Archivo'" }}>
                {r.display_name}
                {mine && <span className="text-[10px] ml-1" style={{ color: ACCENT.blue }}>{t('(vos)', '(you)')}</span>}
              </div>
            )
            const badges = (
              <>
                {targetIds.length > 0 && <DeltaBadge delta={deltas.get(r.user_id) ?? 0} />}
                <span className="text-[10px] font-semibold tabular-nums" style={{ color: ACCENT.green }} title={t('Marcadores exactos (1er desempate)', 'Exact scores (1st tie-breaker)')}>
                  🎯 {Number(r.exact_count ?? 0)} {t('exactos', 'exact')}
                </span>
                <span className="text-[10px] font-semibold tabular-nums" style={{ color: ACCENT.blue }} title={t('Resultados acertados — ganó/empató/perdió (2º desempate)', 'Correct results — win/draw/loss (2nd tie-breaker)')}>
                  ✅ {Number(r.result_count ?? 0)} {t('result.', 'results')}
                </span>
                {showAdvance && (
                  <span className="text-[10px] font-semibold tabular-nums" style={{ color: ACCENT.gold }} title={t('Pases de ronda acertados — quién avanza en eliminatorias (3er desempate)', 'Correct advances — who goes through in knockouts (3rd tie-breaker)')}>
                    🎟️ {advCountOf(r)} {t('pases', 'advances')}
                  </span>
                )}
                <span className="text-[10px]" style={{ color: c.faint }}>{Number(r.accuracy).toFixed(0)}% {t('efectiv.', 'acc.')}</span>
              </>
            )
            const pointsBox = (
              <div className="text-right shrink-0">
                <div className="font-bold tabular-nums leading-none" style={{ fontFamily: "'Archivo'", fontSize: 20, color: c.text }}>
                  {Math.round(Number(r.points))}
                  <span className="text-[10px] ml-0.5 font-semibold" style={{ color: c.muted }}>{t('pts', 'pts')}</span>
                </div>
              </div>
            )
            const predPills =
              targetIds.length > 0
                ? targetIds.map((mid) => {
                    const rr = realResults[mid]
                    if (!rr?.played) return null
                    const tm = realRes.matches[mid]
                    const hf = TEAM_BY_ID[tm?.home ?? '']?.flag ?? '🏳️'
                    const af = TEAM_BY_ID[tm?.away ?? '']?.flag ?? '🏳️'
                    const p = predFor(r.user_id, mid)
                    const live = liveIds.has(mid)
                    // Equipo que el usuario eligió que PASA de ronda (sólo
                    // eliminatorias): el ganador del marcador o, si predijo
                    // empate, su elegido por penales.
                    const isKO = MATCH_BY_ID[mid]?.stage !== 'group'
                    const advSide = isKO && p ? advancingSide({ homeScore: p.home, awayScore: p.away, homePens: p.homePens, awayPens: p.awayPens }) : null
                    const advTeam = advSide === 'home' ? tm?.home : advSide === 'away' ? tm?.away : undefined
                    const realAdv = rr.finished ? advancingSide({ homeScore: rr.homeScore, awayScore: rr.awayScore, homePens: rr.homePens, awayPens: rr.awayPens }) : null
                    const advRight = realAdv != null && advSide != null && advSide === realAdv
                    const advCol = live ? '#9b8d6e' : advRight ? ACCENT.green : realAdv != null ? ACCENT.red : '#9b8d6e'
                    return p ? (
                      <span key={mid} className="inline-flex items-center gap-1 shrink-0">
                        {advTeam && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold shrink-0"
                            style={{ background: advCol + '1A', border: '1px solid ' + advCol + '66', color: c.text, opacity: live ? 0.72 : 1 }}
                            title={t('Eligió que pase de ronda', 'Picked to advance')}
                          >
                            🎟️ {TEAM_BY_ID[advTeam]?.flag} {advTeam}
                          </span>
                        )}
                        <PredScore compact={isDesktop} ph={p.home} pa={p.away} rh={rr.homeScore} ra={rr.awayScore} homeFlag={hf} awayFlag={af} points={marcadorPoints(mid, p.home, p.away, rr.homeScore, rr.awayScore)} dim={live} />
                        {live && <span className="text-[8px] font-bold uppercase" style={{ color: ACCENT.red }}>{t('prov', 'prov')}</span>}
                      </span>
                    ) : (
                      <span key={mid} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs shrink-0" style={{ color: c.faint, border: '1px solid ' + c.line }} title={t('Sin predicción', 'No prediction')}>
                        {hf}<span style={{ opacity: 0.6 }}>–</span>{af}
                      </span>
                    )
                  })
                : null
            return (
              <div
                key={r.user_id}
                className="rounded-2xl px-3 py-2.5"
                style={mine ? { border: '1px solid ' + ACCENT.blue, background: dark ? 'rgba(47,109,240,.16)' : 'rgba(47,109,240,.09)' } : { border: '1px solid ' + c.line, background: c.cardGrad, boxShadow: c.shadow }}
              >
                {isDesktop ? (
                  // DESKTOP: una sola línea — predicciones al lado del puntaje.
                  <div className="flex items-center gap-2.5">
                    <RankBadge rank={rank} />
                    <Avatar src={r.avatar_url} name={r.display_name} size={36} />
                    <div className="flex-1 min-w-0">
                      {nameBox}
                      <div className="mt-0.5 flex items-center gap-2 flex-wrap">{badges}</div>
                    </div>
                    {predPills && <div className="flex items-center gap-1.5 shrink-0">{predPills}</div>}
                    {pointsBox}
                  </div>
                ) : (
                  // MOBILE: nombre + puntaje arriba; debajo, badges y predicciones
                  // en sus propias filas (legible, no apretado).
                  <>
                    <div className="flex items-center gap-2.5">
                      <RankBadge rank={rank} />
                      <Avatar src={r.avatar_url} name={r.display_name} size={36} />
                      <div className="flex-1 min-w-0">{nameBox}</div>
                      {pointsBox}
                    </div>
                    <div className="mt-1.5 flex items-center gap-x-3 gap-y-1 flex-wrap">{badges}</div>
                    {predPills && <div className="mt-2 flex items-center gap-2 flex-wrap">{predPills}</div>}
                  </>
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
