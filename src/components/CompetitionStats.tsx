import { useEffect, useMemo, useState } from 'react'
import { TEAMS, TEAM_BY_ID } from '../data/teams'
import type { MatchResult } from '../types'
import type { Resolution } from '../engine/resolve'
import { useStore } from '../store/useStore'
import { useT } from '../i18n'
import { useTheme } from '../theme'

// ── Mapeo nombre de equipo (del proveedor) → id (para mostrar la bandera) ──
function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/).filter((w) => w && !['and', 'the', 'of', 'y', 'e'].includes(w)).join('')
}
const NAME_TO_ID: Record<string, string> = (() => {
  const m: Record<string, string> = {}
  for (const t of TEAMS) {
    m[norm(t.name)] = t.id
    m[norm(t.id)] = t.id
    for (const a of t.aliases ?? []) m[norm(a)] = t.id
  }
  return m
})()
const teamIdFromName = (n: string): string | undefined => NAME_TO_ID[norm(n || '')]

interface Scorer {
  name: string
  teamId?: string
  teamName: string
  goals: number
  assists: number
}

export function CompetitionStats({ realResults, realRes }: { realResults: Record<number, MatchResult>; realRes: Resolution }) {
  const { t } = useT()
  const { c, dark } = useTheme()
  const liveConfig = useStore((s) => s.liveConfig)

  const [scorers, setScorers] = useState<Scorer[] | null>(null)
  const [scorersErr, setScorersErr] = useState(false)

  useEffect(() => {
    let alive = true
    const comp = liveConfig.leagueId || 'WC'
    const season = liveConfig.season || '2026'
    fetch(`/api/fd?competition=${encodeURIComponent(comp)}&season=${encodeURIComponent(season)}&resource=scorers`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return
        const list: Scorer[] = (d.scorers ?? []).map((s: { player?: { name?: string }; team?: { name?: string }; goals?: number; assists?: number }) => ({
          name: s.player?.name ?? '—',
          teamName: s.team?.name ?? '',
          teamId: teamIdFromName(s.team?.name ?? ''),
          goals: s.goals ?? 0,
          assists: s.assists ?? 0,
        }))
        setScorers(list)
      })
      .catch(() => alive && setScorersErr(true))
    return () => {
      alive = false
    }
  }, [liveConfig.leagueId, liveConfig.season])

  // ── Stats de equipos desde los resultados reales ──
  const teamStats = useMemo(() => {
    const s: Record<string, { gf: number; ga: number; pj: number; cs: number }> = {}
    let goals = 0
    let matches = 0
    let draws = 0
    let biggest = { id: 0, diff: -1, hs: 0, as: 0, home: '', away: '' }
    for (const [idStr, res] of Object.entries(realResults)) {
      if (!res?.played) continue
      const id = Number(idStr)
      const rm = realRes.matches[id]
      const home = rm?.home
      const away = rm?.away
      if (!home || !away) continue
      matches++
      goals += res.homeScore + res.awayScore
      if (res.homeScore === res.awayScore) draws++
      for (const [tid, gf, ga] of [[home, res.homeScore, res.awayScore], [away, res.awayScore, res.homeScore]] as const) {
        const row = (s[tid as string] ??= { gf: 0, ga: 0, pj: 0, cs: 0 })
        row.gf += gf as number
        row.ga += ga as number
        row.pj += 1
        if ((ga as number) === 0) row.cs += 1
      }
      const diff = Math.abs(res.homeScore - res.awayScore)
      if (diff > biggest.diff) biggest = { id, diff, hs: res.homeScore, as: res.awayScore, home, away }
    }
    const arr = Object.entries(s).map(([id, v]) => ({ id, ...v }))
    const topScorTeams = [...arr].sort((a, b) => b.gf - a.gf || b.gf - b.ga - (a.gf - a.ga)).slice(0, 5)
    const cleanSheets = [...arr].filter((x) => x.cs > 0).sort((a, b) => b.cs - a.cs || a.ga - b.ga).slice(0, 5)
    return {
      matches,
      goals,
      draws,
      avg: matches > 0 ? goals / matches : 0,
      topScorTeams,
      cleanSheets,
      biggest: biggest.diff >= 0 ? biggest : null,
    }
  }, [realResults, realRes])

  if (teamStats.matches === 0 && (scorers == null || scorers.length === 0)) return null

  return (
    <div className="space-y-4 mt-5">
      <div className="text-[11px] uppercase tracking-wide font-bold" style={{ color: c.muted }}>🌍 {t('Datos del Mundial', 'World Cup data')}</div>

      {/* Tiles de resumen */}
      {teamStats.matches > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Tile value={teamStats.matches} label={t('partidos', 'matches')} c={c} />
          <Tile value={teamStats.avg.toFixed(2)} label={t('goles/partido', 'goals/match')} c={c} />
          <Tile value={`${Math.round((teamStats.draws / Math.max(1, teamStats.matches)) * 100)}%`} label={t('empates', 'draws')} c={c} />
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Goleadores */}
        <Panel title={t('⚽ Goleadores', '⚽ Top scorers')} c={c} dark={dark}>
          {scorers == null && !scorersErr && <Loading c={c} t={t} />}
          {scorersErr || (scorers && scorers.length === 0) ? (
            <Empty c={c}>{t('Sin datos de goleadores todavía.', 'No scorer data yet.')}</Empty>
          ) : (
            <div className="space-y-1">
              {(scorers ?? []).slice(0, 8).map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="w-4 text-center font-bold" style={{ color: c.faint }}>{i + 1}</span>
                  <span>{s.teamId ? TEAM_BY_ID[s.teamId]?.flag : '🏳️'}</span>
                  <span className="flex-1 truncate" style={{ color: c.text }}>{s.name}</span>
                  {s.assists > 0 && <span className="text-[10px]" style={{ color: c.muted }}>{s.assists} 🅰️</span>}
                  <span className="font-bold tabular-nums" style={{ color: c.text }}>{s.goals} ⚽</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Vallas invictas + más goleadores (equipo) */}
        <Panel title={t('🧤 Vallas invictas', '🧤 Clean sheets')} c={c} dark={dark}>
          {teamStats.cleanSheets.length === 0 ? (
            <Empty c={c}>{t('Todavía nadie mantuvo el arco en cero.', 'No clean sheets yet.')}</Empty>
          ) : (
            <div className="space-y-1">
              {teamStats.cleanSheets.map((x) => (
                <div key={x.id} className="flex items-center gap-2 text-xs">
                  <span>{TEAM_BY_ID[x.id]?.flag}</span>
                  <span className="flex-1 truncate" style={{ color: c.text }}>{TEAM_BY_ID[x.id]?.name ?? x.id}</span>
                  <span className="text-[10px]" style={{ color: c.muted }}>{x.ga} {t('en contra', 'against')}</span>
                  <span className="font-bold tabular-nums" style={{ color: c.text }}>{x.cs} 🧤</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title={t('🔥 Más goleadores (equipos)', '🔥 Top scoring teams')} c={c} dark={dark}>
          {teamStats.topScorTeams.length === 0 ? (
            <Empty c={c}>—</Empty>
          ) : (
            <div className="space-y-1">
              {teamStats.topScorTeams.map((x) => (
                <div key={x.id} className="flex items-center gap-2 text-xs">
                  <span>{TEAM_BY_ID[x.id]?.flag}</span>
                  <span className="flex-1 truncate" style={{ color: c.text }}>{TEAM_BY_ID[x.id]?.name ?? x.id}</span>
                  <span className="text-[10px]" style={{ color: c.muted }}>{x.gf - x.ga > 0 ? '+' : ''}{x.gf - x.ga} DG</span>
                  <span className="font-bold tabular-nums" style={{ color: c.text }}>{x.gf} ⚽</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Mayor goleada */}
        <Panel title={t('💥 Mayor goleada', '💥 Biggest win')} c={c} dark={dark}>
          {teamStats.biggest ? (
            <div className="flex items-center justify-center gap-3 py-3 text-sm font-bold" style={{ color: c.text }}>
              <span>{TEAM_BY_ID[teamStats.biggest.home]?.flag} {TEAM_BY_ID[teamStats.biggest.home]?.name}</span>
              <span className="tabular-nums text-lg" style={{ fontFamily: "'Archivo'" }}>{teamStats.biggest.hs}-{teamStats.biggest.as}</span>
              <span>{TEAM_BY_ID[teamStats.biggest.away]?.name} {TEAM_BY_ID[teamStats.biggest.away]?.flag}</span>
            </div>
          ) : (
            <Empty c={c}>—</Empty>
          )}
        </Panel>
      </div>
    </div>
  )
}

function Panel({ title, children, c, dark }: { title: string; children: React.ReactNode; c: { text: string; line: string; cardGrad: string; shadow: string }; dark: boolean }) {
  return (
    <div className="rounded-2xl overflow-hidden flex flex-col" style={{ background: c.cardGrad, border: '1px solid ' + c.line, boxShadow: c.shadow }}>
      <div className="px-3.5 py-2.5 font-bold text-sm" style={{ fontFamily: "'Archivo'", color: c.text, borderBottom: '1px solid ' + c.line }}>{title}</div>
      <div className="px-3 py-2.5 flex-1" style={{ background: dark ? 'transparent' : 'transparent' }}>{children}</div>
    </div>
  )
}
function Tile({ value, label, c }: { value: string | number; label: string; c: { text: string; muted: string; line: string; cardGrad: string } }) {
  return (
    <div className="rounded-xl px-2 py-2.5 text-center" style={{ background: c.cardGrad, border: '1px solid ' + c.line }}>
      <div className="text-xl font-bold leading-none" style={{ fontFamily: "'Archivo'", color: c.text }}>{value}</div>
      <div className="text-[10px] mt-1" style={{ color: c.muted }}>{label}</div>
    </div>
  )
}
function Loading({ c, t }: { c: { faint: string }; t: (a: string, b: string) => string }) {
  return <div className="text-xs py-3 text-center" style={{ color: c.faint }}>{t('Cargando…', 'Loading…')}</div>
}
function Empty({ children, c }: { children: React.ReactNode; c: { faint: string } }) {
  return <div className="text-xs py-3 text-center" style={{ color: c.faint }}>{children}</div>
}
