import { MATCH_BY_ID } from '../data/schedule'
import { sideLabelFor, venueName, matchTimeLabel, formatDateShort, matchDateKey } from '../utils/labels'
import { canPredict } from '../utils/stage'
import { isMatchLive } from '../utils/live'
import type { ActiveContext } from '../hooks'

interface Props {
  matchId: number
  ctx: ActiveContext
  onEdit: (matchId: number) => void
  showVenue?: boolean
  showDate?: boolean
}

export function MatchRow({ matchId, ctx, onEdit, showVenue = true, showDate = false }: Props) {
  const match = MATCH_BY_ID[matchId]
  if (!match) return null
  const res = ctx.results[matchId]
  const home = sideLabelFor(matchId, match.home, 'home', ctx.resolution)
  const away = sideLabelFor(matchId, match.away, 'away', ctx.resolution)
  const played = res?.played
  const rm = ctx.resolution.matches[matchId]
  // En vivo según los resultados REALES (vale en cualquier pestaña).
  const live = isMatchLive(ctx.real.results, matchId)
  // En una predicción, marcamos los partidos que todavía no se pueden predecir.
  const lockedForPrediction = ctx.scenario.type === 'prediction' && !canPredict(match)

  return (
    <button
      onClick={() => onEdit(matchId)}
      className={`w-full text-left rounded-xl px-3 py-2.5 flex items-center gap-3 transition border ${
        live
          ? 'border-rose-500/70 ring-2 ring-rose-500/50 bg-rose-500/10 hover:bg-rose-500/15'
          : lockedForPrediction
            ? 'border-white/5 bg-slate-800/30 hover:bg-slate-800/50'
            : 'border-white/5 bg-slate-800/60 hover:bg-slate-800'
      }`}
    >
      <div className="text-[10px] text-slate-500 w-12 shrink-0">
        <div className="font-mono">{live ? <span className="text-rose-400">🔴 VIVO</span> : `${lockedForPrediction ? '🔒' : ''}P${match.id}`}</div>
        {showDate && <div className="text-slate-400">{formatDateShort(matchDateKey(match))}</div>}
        <div>{matchTimeLabel(match)}</div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <Side
            flag={home.flag}
            name={home.name}
            winner={played && rm?.winner === home.short}
            eliminated={!!home.short && ctx.resolution.eliminated.has(home.short)}
          />
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
            eliminated={!!away.short && ctx.resolution.eliminated.has(away.short)}
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
  eliminated,
}: {
  flag: string
  name: string
  right?: boolean
  winner?: boolean
  eliminated?: boolean
}) {
  return (
    <div className={`flex items-center gap-1.5 min-w-0 flex-1 ${right ? 'flex-row-reverse text-right' : ''}`}>
      <span className={`text-lg shrink-0 ${eliminated ? 'grayscale opacity-50' : ''}`}>{flag}</span>
      <span
        className={`text-sm truncate ${
          eliminated ? 'line-through text-slate-500' : winner ? 'font-bold text-white' : 'text-slate-200'
        }`}
      >
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
