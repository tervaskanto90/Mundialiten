import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth'
import { fetchPastPredictions, type PastPred } from '../lib/remote'
import { useStore, getScenario, REAL_SCENARIO_ID } from '../store/useStore'
import { resolve } from '../engine/resolve'
import { MATCH_BY_ID } from '../data/schedule'
import { sideLabelFor } from '../utils/labels'
import { Avatar } from './Avatar'
import { useT } from '../i18n'
import { useTheme, ACCENT } from '../theme'

type Kind = 'exact' | 'result' | 'miss'
const KCOL: Record<Kind, string> = { exact: ACCENT.green, result: ACCENT.blue, miss: '#9b8d6e' }
const outcome = (ph: number, pa: number, rh: number, ra: number): Kind =>
  ph === rh && pa === ra ? 'exact' : Math.sign(ph - pa) === Math.sign(rh - ra) ? 'result' : 'miss'

/** Qué predijo CADA usuario en los partidos ya jugados de toda la competencia.
 *  Sólo partidos jugados (no se exponen predicciones pendientes). */
export function PastPredictions() {
  const { enabled, user } = useAuth()
  const { t, lang } = useT()
  const { c, dark } = useTheme()
  const [rows, setRows] = useState<PastPred[] | null>(null)
  const lastSync = useStore((s) => s.lastSync)
  const real = useStore((s) => getScenario(s.scenarios, REAL_SCENARIO_ID))
  const realResults = real?.results ?? {}
  const realRes = useMemo(() => resolve(realResults), [realResults])
  const [sel, setSel] = useState<number | null>(null)

  useEffect(() => {
    if (!(enabled && user)) return
    fetchPastPredictions().then(setRows).catch(() => setRows([]))
  }, [enabled, user, lastSync])

  // Partidos con predicciones, del más nuevo al más viejo (por horario).
  const matchIds = useMemo(() => {
    const set = new Set((rows ?? []).map((r) => r.match_id))
    return [...set]
      .filter((id) => MATCH_BY_ID[id] && realResults[id]?.played)
      .sort((a, b) => Date.parse(MATCH_BY_ID[b].kickoff) - Date.parse(MATCH_BY_ID[a].kickoff))
  }, [rows, realResults])

  if (!enabled || !user) return null
  if (rows == null) return <div className="mt-5 text-xs" style={{ color: c.faint }}>{t('Cargando historial…', 'Loading history…')}</div>
  if (matchIds.length === 0) return null

  const current = sel != null && matchIds.includes(sel) ? sel : matchIds[0]
  const m = MATCH_BY_ID[current]
  const rr = realResults[current]!
  const home = sideLabelFor(current, m.home, 'home', realRes)
  const away = sideLabelFor(current, m.away, 'away', realRes)

  const preds = (rows ?? [])
    .filter((r) => r.match_id === current)
    .map((r) => ({ ...r, k: outcome(r.home, r.away, rr.homeScore, rr.awayScore) }))
    .sort((a, b) => {
      const order = { exact: 0, result: 1, miss: 2 }
      return order[a.k] - order[b.k] || a.display_name.localeCompare(b.display_name)
    })

  const selStyle: React.CSSProperties = {
    fontSize: '12px', fontWeight: 700, fontFamily: "'Archivo'", cursor: 'pointer',
    padding: '7px 12px', borderRadius: '10px', color: c.text,
    background: dark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.04)', border: '1px solid ' + c.line,
  }

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="text-[11px] uppercase tracking-wide font-bold" style={{ color: c.muted }}>🗂️ {t('Qué puso cada uno', 'Everyone’s past picks')}</div>
        <select value={current} onChange={(e) => setSel(Number(e.target.value))} style={selStyle}>
          {matchIds.map((id) => {
            const mm = MATCH_BY_ID[id]
            const h = sideLabelFor(id, mm.home, 'home', realRes)
            const a = sideLabelFor(id, mm.away, 'away', realRes)
            const r = realResults[id]!
            const d = new Date(mm.kickoff).toLocaleDateString(lang === 'en' ? 'en-GB' : 'es-AR', { day: '2-digit', month: 'short' })
            return <option key={id} value={id}>{`${h.flag} ${h.short} ${r.homeScore}-${r.awayScore} ${a.short} ${a.flag} · ${d}`}</option>
          })}
        </select>
      </div>

      <div className="rounded-2xl p-3" style={{ background: c.cardGrad, border: '1px solid ' + c.line, boxShadow: c.shadow }}>
        <div className="flex items-center justify-center gap-2 pb-2 mb-2 font-bold" style={{ borderBottom: '1px solid ' + c.line, color: c.text }}>
          <span>{home.flag} {home.name}</span>
          <span className="tabular-nums px-2" style={{ fontFamily: "'Archivo'", color: ACCENT.green }}>{rr.homeScore}-{rr.awayScore}</span>
          <span>{away.name} {away.flag}</span>
          {rr.homePens != null && rr.awayPens != null && <span className="text-[10px]" style={{ color: c.muted }}>({rr.homePens}-{rr.awayPens} pen)</span>}
        </div>
        <div className="grid sm:grid-cols-2 gap-x-3 gap-y-1.5">
          {preds.map((p) => {
            const mine = p.user_id === user.id
            return (
              <div key={p.user_id} className="flex items-center gap-2 rounded-lg px-2 py-1" style={mine ? { background: dark ? 'rgba(47,109,240,.16)' : 'rgba(47,109,240,.08)' } : undefined}>
                <Avatar src={p.avatar_url} name={p.display_name} size={22} />
                <span className="flex-1 truncate text-xs" style={{ color: c.text }}>
                  {p.display_name}{mine && <span className="text-[9px] ml-1" style={{ color: ACCENT.blue }}>{t('(vos)', '(you)')}</span>}
                </span>
                <span className="text-xs font-bold tabular-nums px-2 py-0.5 rounded-full" style={{ color: KCOL[p.k], background: KCOL[p.k] + '1A', border: '1px solid ' + KCOL[p.k] + '44' }}>
                  {p.home}-{p.away}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
