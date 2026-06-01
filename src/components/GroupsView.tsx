import { GROUPS, TEAM_BY_ID } from '../data/teams'
import type { ActiveContext } from '../hooks'
import type { StandingRow } from '../engine/standings'

interface Props {
  ctx: ActiveContext
}

export function GroupsView({ ctx }: Props) {
  const { standings, bestThirds } = ctx.resolution
  const qualifiedThirds = new Set((bestThirds ?? []).slice(0, 8))

  return (
    <div>
      <div className="flex flex-wrap gap-3 text-[11px] text-slate-400 mb-3">
        <Legend color="bg-emerald-500" label="Clasifican directo (1° y 2°)" />
        <Legend color="bg-amber-500" label="Mejor 3° clasificado" />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {GROUPS.map((g) => (
          <GroupTable
            key={g}
            group={g}
            rows={standings[g]}
            qualifiedThirds={qualifiedThirds}
            thirdsKnown={bestThirds != null}
          />
        ))}
      </div>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-block w-3 h-3 rounded ${color}`} />
      {label}
    </span>
  )
}

function GroupTable({
  group,
  rows,
  qualifiedThirds,
  thirdsKnown,
}: {
  group: string
  rows: StandingRow[]
  qualifiedThirds: Set<string>
  thirdsKnown: boolean
}) {
  return (
    <div className="bg-slate-800/40 rounded-xl overflow-hidden border border-white/5">
      <div className="px-3 py-2 bg-pitch-900/60 font-semibold text-sm">Grupo {group}</div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-slate-500">
            <th className="text-left font-medium px-2 py-1.5">Equipo</th>
            <th className="px-1 py-1.5 w-6" title="Partidos jugados">PJ</th>
            <th className="px-1 py-1.5 w-6" title="Diferencia de gol">DG</th>
            <th className="px-1.5 py-1.5 w-7" title="Puntos">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const team = TEAM_BY_ID[r.teamId]
            const direct = i < 2
            const isThird = i === 2
            const thirdQual = isThird && qualifiedThirds.has(r.teamId)
            const bar = direct
              ? 'border-l-2 border-emerald-500'
              : thirdQual
                ? 'border-l-2 border-amber-500'
                : isThird && !thirdsKnown
                  ? 'border-l-2 border-amber-500/30'
                  : 'border-l-2 border-transparent'
            return (
              <tr key={r.teamId} className={`${bar} ${i % 2 ? 'bg-white/[0.02]' : ''}`}>
                <td className="px-2 py-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-slate-500 w-3">{i + 1}</span>
                    <span>{team?.flag}</span>
                    <span className="truncate">{team?.name ?? r.teamId}</span>
                  </div>
                </td>
                <td className="text-center text-slate-400">{r.played}</td>
                <td className="text-center text-slate-400">
                  {r.gd > 0 ? `+${r.gd}` : r.gd}
                </td>
                <td className="text-center font-bold">{r.points}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
