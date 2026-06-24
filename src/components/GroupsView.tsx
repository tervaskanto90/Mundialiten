import { GROUPS, TEAM_BY_ID } from '../data/teams'
import type { ActiveContext } from '../hooks'
import type { StandingRow } from '../engine/standings'
import { useT } from '../i18n'
import { teamDisplayName } from '../utils/labels'
import { useTheme, ACCENT } from '../theme'

interface Props {
  ctx: ActiveContext
}

export function GroupsView({ ctx }: Props) {
  const { standings, bestThirds, eliminated, qualified } = ctx.resolution
  const qualifiedThirds = new Set((bestThirds ?? []).slice(0, 8))
  const { t } = useT()
  const { c } = useTheme()

  return (
    <div>
      <div className="flex flex-wrap gap-3 text-[11px] mb-3" style={{ color: c.muted }}>
        <span className="flex items-center gap-1.5">
          <span style={{ color: ACCENT.green, fontWeight: 800 }}>ABC</span>
          {t('Clasificado', 'Qualified')}
        </span>
        <Legend color={ACCENT.green} label={t('Zona directa (1° y 2°)', 'Direct zone (1st & 2nd)')} />
        <Legend color={ACCENT.gold} label={t('Mejor 3°', 'Best 3rd')} />
        <span className="flex items-center gap-1.5">
          <span style={{ textDecoration: 'line-through', color: ACCENT.red, fontWeight: 800 }}>ABC</span>
          {t('Eliminado', 'Eliminated')}
        </span>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {GROUPS.map((g) => (
          <GroupTable
            key={g}
            group={g}
            rows={standings[g]}
            qualifiedThirds={qualifiedThirds}
            thirdsKnown={bestThirds != null}
            eliminated={eliminated}
            qualified={qualified}
            t={t}
          />
        ))}
      </div>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block w-3 h-3 rounded" style={{ background: color }} />
      {label}
    </span>
  )
}

function GroupTable({
  group,
  rows,
  qualifiedThirds,
  thirdsKnown,
  eliminated,
  qualified,
  t,
}: {
  group: string
  rows: StandingRow[]
  qualifiedThirds: Set<string>
  thirdsKnown: boolean
  eliminated: Set<string>
  qualified: Set<string>
  t: (es: string, en: string) => string
}) {
  const { c, dark } = useTheme()
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: c.cardGrad, border: '1px solid ' + c.line, boxShadow: c.shadow }}
    >
      <div
        className="px-3.5 py-2.5 flex items-center justify-between"
        style={{ fontFamily: "'Archivo'", fontWeight: 800, fontSize: '14px', color: c.text }}
      >
        <span>
          {t('Grupo', 'Group')} {group}
        </span>
        <span style={{ fontSize: '9.5px', color: c.faint, fontWeight: 800, letterSpacing: '.5px' }}>
          {t('PJ · DG · PTS', 'P · GD · PTS')}
        </span>
      </div>
      <table className="w-full text-xs">
        <tbody>
          {rows.map((r, i) => {
            const team = TEAM_BY_ID[r.teamId]
            const direct = i < 2
            const isThird = i === 2
            const thirdQual = isThird && qualifiedThirds.has(r.teamId)
            const elim = eliminated.has(r.teamId)
            const qual = qualified.has(r.teamId)
            const nameColor = qual ? ACCENT.green : elim ? ACCENT.red : c.text
            const barColor = direct
              ? ACCENT.green
              : thirdQual
                ? ACCENT.gold
                : isThird && !thirdsKnown
                  ? 'rgba(255,194,26,.4)'
                  : c.line
            const rowBg = direct
              ? 'rgba(31,168,92,.10)'
              : i % 2
                ? dark
                  ? 'rgba(0,0,0,.25)'
                  : 'rgba(0,0,0,.03)'
                : 'transparent'
            return (
              <tr key={r.teamId} style={{ background: rowBg, borderLeft: '3px solid ' + barColor }}>
                <td className="px-2 py-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span style={{ width: 12, color: c.faint, fontFamily: "'Archivo'", fontWeight: 800 }}>{i + 1}</span>
                    <span style={{ filter: elim ? 'grayscale(1)' : 'none', opacity: elim ? 0.5 : 1 }}>{team?.flag}</span>
                    <span
                      className="truncate"
                      style={{ color: nameColor, textDecoration: elim ? 'line-through' : 'none', fontWeight: qual || elim ? 800 : 700 }}
                    >
                      {team ? teamDisplayName(team) : r.teamId}
                    </span>
                  </div>
                </td>
                <td className="text-center" style={{ color: c.muted }}>
                  {r.played}
                </td>
                <td className="text-center" style={{ color: c.muted }}>
                  {r.gd > 0 ? `+${r.gd}` : r.gd}
                </td>
                <td className="text-center" style={{ fontFamily: "'Archivo'", fontWeight: 800, color: c.text }}>
                  {r.points}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
