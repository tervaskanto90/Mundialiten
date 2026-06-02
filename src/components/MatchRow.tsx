import { MATCH_BY_ID } from '../data/schedule'
import { sideLabelFor, venueName, matchTimeLabel } from '../utils/labels'
import type { ActiveContext } from '../hooks'

interface Props {
  matchId: number
  ctx: ActiveContext
  onEdit: (matchId: number) => void
  showVenue?: boolean
}

export function MatchRow({ matchId, ctx, onEdit, showVenue = true }: Props) {
  const match = MATCH_BY_ID[matchId]
  if (!match) return null
  const res = ctx.results[matchId]
  const home = sideLabelFor(matchId, match.home, 'home', ctx.resolution)
  const away = sideLabelFor(matchId, match.away, 'away', ctx.resolution)
  const played = res?.played
  const rm = ctx.resolution.matches[matchId]

  return (
    <button
      onClick={() => onEdit(matchId)}
      className="w-full text-left bg-slate-800/60 hover:bg-slate-800 border border-white/5 rounded-xl px-3 py-2.5 flex items-center gap-3 transition"
    >
      <div className="text-[10px] text-slate-500 w-12 shrink-0">
        <div className="font-mono">P{match.id}</div>
        <div>{matchTimeLabel(match)}</div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <Side flag={home.flag} name={home.name} winner={played && rm?.winner === home.short} />
          <Score
            played={!!played}
            h={res?.homeScore}
            a={res?.awayScore}
            hp={res?.homePens}
            ap={res?.awayPens}
          />
          <Side
            flag={away.flag}
            name={away.name}
            winner={played && rm?.winner === away.short}
            right
          />
        </div>
        {showVenue && (
          <div className="text-[10px] text-slate-500 mt-1 truncate">📍 {venueName(match.venueId)}</div>
        )}
      </div>
    </button>
  )
}

function Side({
  flag,
  name,
  right,
  winner,
}: {
  flag: string
  name: string
  right?: boolean
  winner?: boolean
}) {
  return (
    <div className={`flex items-center gap-1.5 min-w-0 flex-1 ${right ? 'flex-row-reverse text-right' : ''}`}>
      <span className="text-lg shrink-0">{flag}</span>
      <span className={`text-sm truncate ${winner ? 'font-bold text-white' : 'text-slate-200'}`}>
        {name}
      </span>
    </div>
  )
}

function Score({
  played,
  h,
  a,
  hp,
  ap,
}: {
  played: boolean
  h?: number
  a?: number
  hp?: number
  ap?: number
}) {
  if (!played) {
    return <span className="text-xs text-slate-500 px-2 shrink-0">vs</span>
  }
  return (
    <div className="shrink-0 px-2 text-center">
      <div className="font-bold tabular-nums">
        {h} <span className="text-slate-500">-</span> {a}
      </div>
      {hp != null && ap != null && (
        <div className="text-[10px] text-slate-400">({hp}-{ap} pen)</div>
      )}
    </div>
  )
}
