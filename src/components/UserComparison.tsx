import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth'
import { fetchRanking, type RankingRow } from '../lib/remote'
import { useStore, getScenario, REAL_SCENARIO_ID } from '../store/useStore'
import { resolve } from '../engine/resolve'
import { TEAM_BY_ID } from '../data/teams'
import { Avatar } from './Avatar'
import { useT } from '../i18n'
import { useTheme, ACCENT } from '../theme'

/** Comparación contra el resto de los usuarios, sólo con datos públicos del
 *  ranking (puntos, % y la predicción del ÚLTIMO partido — no expone las
 *  predicciones privadas del historial). */
export function UserComparison() {
  const { enabled, user } = useAuth()
  const { t } = useT()
  const { c, dark } = useTheme()
  const [rows, setRows] = useState<RankingRow[] | null>(null)
  const lastSync = useStore((s) => s.lastSync)
  const real = useStore((s) => getScenario(s.scenarios, REAL_SCENARIO_ID))
  const realResults = real?.results ?? {}
  const realRes = useMemo(() => resolve(realResults), [realResults])

  useEffect(() => {
    if (!(enabled && user)) return
    fetchRanking().then(setRows).catch(() => setRows([]))
  }, [enabled, user, lastSync])

  if (!enabled || !user || !rows || rows.length < 2) return null

  const sorted = [...rows].sort((a, b) => Number(b.points) - Number(a.points))
  const N = sorted.length
  const myIdx = sorted.findIndex((r) => r.user_id === user.id)
  const me = myIdx >= 0 ? sorted[myIdx] : null
  if (!me) return null
  const avgPts = sorted.reduce((s, r) => s + Number(r.points), 0) / N
  const avgAcc = sorted.reduce((s, r) => s + Number(r.accuracy), 0) / N
  const leader = sorted[0]
  const ahead = myIdx > 0 ? sorted[myIdx - 1] : null
  const percentile = N > 1 ? Math.round((1 - myIdx / (N - 1)) * 100) : 100
  const diffPts = (n: number) => (n >= 0 ? `+${Math.round(n)}` : `${Math.round(n)}`)

  // Head-to-head del último partido (con la predicción guardada de cada uno).
  const lastMatchId = rows.find((r) => r.last_match_id != null)?.last_match_id ?? null
  const lastTeams = lastMatchId != null ? realRes.matches[lastMatchId] : undefined
  const lastReal = lastMatchId != null ? realResults[lastMatchId] : undefined
  let exact = 0, result = 0, miss = 0
  let mine: 'exact' | 'result' | 'miss' | null = null
  if (lastReal?.played) {
    for (const r of rows) {
      if (r.last_pred_home == null || r.last_pred_away == null) continue
      const ph = Number(r.last_pred_home), pa = Number(r.last_pred_away)
      const k = ph === lastReal.homeScore && pa === lastReal.awayScore ? 'exact' : Math.sign(ph - pa) === Math.sign(lastReal.homeScore - lastReal.awayScore) ? 'result' : 'miss'
      if (k === 'exact') exact++
      else if (k === 'result') result++
      else miss++
      if (r.user_id === user.id) mine = k
    }
  }
  const h2hTotal = exact + result + miss

  return (
    <div className="mt-5">
      <div className="text-[11px] uppercase tracking-wide font-bold mb-3" style={{ color: c.muted }}>👥 {t('Vos vs el resto', 'You vs the field')}</div>

      <div className="rounded-2xl p-4" style={{ background: c.cardGrad, border: '1px solid ' + c.line, boxShadow: c.shadow }}>
        <div className="flex items-center gap-3 mb-3">
          <Avatar src={me.avatar_url} name={me.display_name} size={40} />
          <div className="flex-1 min-w-0">
            <div className="font-bold" style={{ fontFamily: "'Archivo'", color: c.text }}>{me.display_name}</div>
            <div className="text-[11px]" style={{ color: c.muted }}>{t('Puesto', 'Position')} #{myIdx + 1} {t('de', 'of')} {N} · {t('mejor que el', 'better than')} {Math.max(0, percentile)}%</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold leading-none" style={{ fontFamily: "'Archivo'", color: ACCENT.blue }}>{Math.round(Number(me.points))}</div>
            <div className="text-[10px]" style={{ color: c.muted }}>{t('puntos', 'points')}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Cmp label={t('vs la media', 'vs average')} value={diffPts(Number(me.points) - avgPts)} sub={`${t('media', 'avg')} ${Math.round(avgPts)}`} pos={Number(me.points) >= avgPts} c={c} dark={dark} />
          <Cmp label={t('vs efectividad media', 'vs avg accuracy')} value={`${diffPts(Number(me.accuracy) - avgAcc)}%`} sub={`${t('media', 'avg')} ${avgAcc.toFixed(0)}%`} pos={Number(me.accuracy) >= avgAcc} c={c} dark={dark} />
          <Cmp label={ahead ? t('al de arriba', 'to the one above') : t('sos el líder', 'you lead')} value={ahead ? diffPts(Number(me.points) - Number(ahead.points)) : '👑'} sub={ahead ? ahead.display_name : `${t('líder', 'leader')}: ${leader.display_name}`} pos={!ahead} c={c} dark={dark} />
        </div>

        {h2hTotal > 0 && lastTeams && (
          <div className="mt-4 pt-3" style={{ borderTop: '1px solid ' + c.line }}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold" style={{ color: c.text }}>
                {t('Último partido', 'Last match')}: {TEAM_BY_ID[lastTeams.home ?? '']?.flag} {lastReal!.homeScore}-{lastReal!.awayScore} {TEAM_BY_ID[lastTeams.away ?? '']?.flag}
              </span>
              {mine && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: mine === 'exact' ? ACCENT.green : mine === 'result' ? ACCENT.blue : '#9b8d6e', background: (mine === 'exact' ? ACCENT.green : mine === 'result' ? ACCENT.blue : '#9b8d6e') + '22' }}>
                  {t('vos', 'you')}: {mine === 'exact' ? t('exacto', 'exact') : mine === 'result' ? t('resultado', 'result') : t('errado', 'missed')}
                </span>
              )}
            </div>
            <div className="flex h-3 rounded-full overflow-hidden mb-1" style={{ background: dark ? 'rgba(0,0,0,.35)' : 'rgba(0,0,0,.06)' }}>
              <div style={{ width: `${(exact / h2hTotal) * 100}%`, background: ACCENT.green }} />
              <div style={{ width: `${(result / h2hTotal) * 100}%`, background: ACCENT.blue }} />
              <div style={{ width: `${(miss / h2hTotal) * 100}%`, background: '#9b8d6e' }} />
            </div>
            <div className="flex justify-between text-[10px] font-semibold" style={{ color: c.muted }}>
              <span>🎯 {exact} {t('exactos', 'exact')}</span>
              <span>✅ {result} {t('resultado', 'result')}</span>
              <span>❌ {miss} {t('errados', 'missed')}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Cmp({ label, value, sub, pos, c, dark }: { label: string; value: string; sub: string; pos: boolean; c: { text: string; muted: string; line: string }; dark: boolean }) {
  return (
    <div className="rounded-xl px-2 py-2.5 text-center" style={{ background: dark ? 'rgba(0,0,0,.18)' : 'rgba(0,0,0,.025)', border: '1px solid ' + c.line }}>
      <div className="text-base font-bold leading-none" style={{ fontFamily: "'Archivo'", color: pos ? ACCENT.green : ACCENT.red }}>{value}</div>
      <div className="text-[9.5px] mt-1 leading-tight" style={{ color: c.muted }}>{label}</div>
      <div className="text-[9px] truncate" style={{ color: c.muted, opacity: 0.7 }}>{sub}</div>
    </div>
  )
}
