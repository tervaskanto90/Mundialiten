import { GROUPS, TEAM_BY_ID } from '../data/teams'
import type { ActiveContext } from '../hooks'
import { sortStanding, type StandingRow } from '../engine/standings'
import { useT } from '../i18n'
import { teamDisplayName } from '../utils/labels'
import { useTheme, ACCENT } from '../theme'

interface Props {
  ctx: ActiveContext
}

export function GroupsView({ ctx }: Props) {
  const { standings, eliminated, qualified } = ctx.resolution
  const { t } = useT()
  const { c } = useTheme()

  // Ranking PROVISORIO de los 3° de cada grupo (mismo criterio que la FIFA):
  // los 8 mejores clasifican. Se calcula siempre (no sólo al cerrar los grupos)
  // para mostrar en amarillo quién clasificaría hasta el momento.
  const thirdsRanked = GROUPS.map((g) => ({ row: standings[g]?.[2], group: g }))
    .filter((x): x is { row: StandingRow; group: string } => !!x.row)
    .sort((a, b) => sortStanding(a.row, b.row))
  const qualifyingThirds = new Set(thirdsRanked.slice(0, 8).map((x) => x.row.teamId))

  return (
    <div>
      <div className="flex flex-wrap gap-3 text-[11px] mb-3" style={{ color: c.muted }}>
        <Legend color={ACCENT.green} label={t('Zona directa (1° y 2°)', 'Direct zone (1st & 2nd)')} />
        <Legend color={ACCENT.gold} label={t('Mejor 3° (clasifican 8)', 'Best 3rd (8 qualify)')} />
        <span className="flex items-center gap-1.5">
          <span style={{ textDecoration: 'line-through', color: ACCENT.red, fontWeight: 800 }}>ABC</span>
          {t('Eliminado', 'Eliminated')}
        </span>
      </div>
      <div className="flex flex-col xl:flex-row gap-3 items-start">
        <div className="w-full flex-1 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {GROUPS.map((g) => (
            <GroupTable
              key={g}
              group={g}
              rows={standings[g]}
              qualifyingThirds={qualifyingThirds}
              eliminated={eliminated}
              qualified={qualified}
              t={t}
            />
          ))}
        </div>
        <ThirdsTable entries={thirdsRanked} eliminated={eliminated} t={t} />
      </div>
    </div>
  )
}

// Tabla lateral con el ranking de terceros: los 8 primeros (en amarillo) son los
// que clasificarían hasta el momento.
function ThirdsTable({
  entries,
  eliminated,
  t,
}: {
  entries: { row: StandingRow; group: string }[]
  eliminated: Set<string>
  t: (es: string, en: string) => string
}) {
  const { c, dark } = useTheme()
  if (entries.length === 0) return null
  return (
    <div
      className="w-full xl:w-[260px] xl:shrink-0 rounded-2xl overflow-hidden"
      style={{ background: c.cardGrad, border: '1px solid ' + ACCENT.gold + '66', boxShadow: c.shadow }}
    >
      <div
        className="px-3.5 py-2.5"
        style={{ fontFamily: "'Archivo'", fontWeight: 800, fontSize: '13px', color: c.text }}
      >
        🥉 {t('Mejores terceros', 'Best third-placed')}
        <div style={{ fontSize: '9.5px', color: c.faint, fontWeight: 700, letterSpacing: '.3px' }}>
          {t('Clasifican los primeros 8', 'Top 8 qualify')}
        </div>
      </div>
      <table className="w-full text-xs">
        <tbody>
          {entries.map(({ row, group }, i) => {
            const qualifies = i < 8
            const team = TEAM_BY_ID[row.teamId]
            const elim = eliminated.has(row.teamId)
            const nameColor = elim ? ACCENT.red : qualifies ? ACCENT.gold : c.muted
            const cut = i === 8 // primera fila que NO clasifica
            return (
              <tr
                key={row.teamId}
                style={{
                  background: qualifies ? (dark ? 'rgba(255,194,26,.10)' : 'rgba(255,194,26,.12)') : 'transparent',
                  borderTop: cut ? '2px dashed ' + c.line : undefined,
                }}
              >
                <td className="px-2 py-1.5" style={{ width: 14, color: c.faint, fontFamily: "'Archivo'", fontWeight: 800 }}>{i + 1}</td>
                <td className="py-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span style={{ filter: elim ? 'grayscale(1)' : 'none', opacity: elim ? 0.5 : 1 }}>{team?.flag}</span>
                    <span className="truncate" style={{ color: nameColor, fontWeight: qualifies || elim ? 800 : 600, textDecoration: elim ? 'line-through' : 'none' }}>
                      {team ? teamDisplayName(team) : row.teamId}
                    </span>
                    <span className="text-[9px]" style={{ color: c.faint }}>{group}</span>
                  </div>
                </td>
                <td className="text-center px-1" style={{ color: c.muted }}>{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                <td className="text-center px-2" style={{ fontFamily: "'Archivo'", fontWeight: 800, color: c.text }}>{row.points}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
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
  qualifyingThirds,
  eliminated,
  qualified,
  t,
}: {
  group: string
  rows: StandingRow[]
  qualifyingThirds: Set<string>
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
            const elim = eliminated.has(r.teamId)
            const thirdQual = isThird && !elim && qualifyingThirds.has(r.teamId)
            const qual = qualified.has(r.teamId)
            // Amarillo: 3° que clasificaría (hasta el momento). Verde: zona directa.
            const nameColor = elim ? ACCENT.red : thirdQual ? ACCENT.gold : qual ? ACCENT.green : c.text
            const barColor = direct
              ? ACCENT.green
              : thirdQual
                ? ACCENT.gold
                : isThird
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
