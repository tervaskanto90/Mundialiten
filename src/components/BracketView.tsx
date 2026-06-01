import { MATCHES } from '../data/schedule'
import type { StageId } from '../types'
import { sideLabelFor } from '../utils/labels'
import type { ActiveContext } from '../hooks'

interface Props {
  ctx: ActiveContext
  onEdit: (matchId: number) => void
}

const COLUMNS: { stage: StageId | 'finals'; label: string }[] = [
  { stage: 'r32', label: 'Dieciseisavos' },
  { stage: 'r16', label: 'Octavos' },
  { stage: 'qf', label: 'Cuartos' },
  { stage: 'sf', label: 'Semifinal' },
  { stage: 'finals', label: 'Final / 3°' },
]

export function BracketView({ ctx, onEdit }: Props) {
  const champ = ctx.resolution.matches[104]?.winner
  const champLabel = champ ? sideLabelFor(104, ctx.resolution.matches[104]!.winner!, 'home', ctx.resolution) : null

  return (
    <div>
      {champLabel?.resolved && (
        <div className="mb-4 text-center bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-500/30 rounded-xl py-3">
          <div className="text-xs text-amber-300/80">CAMPEÓN</div>
          <div className="text-xl font-bold flex items-center justify-center gap-2">
            🏆 <span>{champLabel.flag}</span> {champLabel.name}
          </div>
        </div>
      )}

      <div className="overflow-x-auto pb-2">
        <div className="flex gap-4 min-w-max">
          {COLUMNS.map((col) => {
            const matches = MATCHES.filter((m) =>
              col.stage === 'finals' ? m.stage === 'final' || m.stage === 'third' : m.stage === col.stage,
            )
            return (
              <div key={col.label} className="w-56 shrink-0">
                <h3 className="text-xs font-semibold text-slate-400 mb-2 sticky left-0">{col.label}</h3>
                <div className="space-y-2">
                  {matches.map((m) => (
                    <BracketCard
                      key={m.id}
                      matchId={m.id}
                      ctx={ctx}
                      onEdit={onEdit}
                      isFinal={m.stage === 'final'}
                      isThird={m.stage === 'third'}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function BracketCard({
  matchId,
  ctx,
  onEdit,
  isFinal,
  isThird,
}: {
  matchId: number
  ctx: ActiveContext
  onEdit: (matchId: number) => void
  isFinal?: boolean
  isThird?: boolean
}) {
  const match = MATCHES.find((m) => m.id === matchId)!
  const res = ctx.results[matchId]
  const rm = ctx.resolution.matches[matchId]
  const home = sideLabelFor(matchId, match.home, 'home', ctx.resolution)
  const away = sideLabelFor(matchId, match.away, 'away', ctx.resolution)
  const played = res?.played

  return (
    <button
      onClick={() => onEdit(matchId)}
      className={`w-full text-left rounded-lg border px-2.5 py-2 transition hover:bg-slate-800 ${
        isFinal
          ? 'bg-amber-500/10 border-amber-500/30'
          : isThird
            ? 'bg-orange-900/10 border-orange-700/30'
            : 'bg-slate-800/60 border-white/5'
      }`}
    >
      <div className="text-[10px] text-slate-500 mb-1">
        {isFinal ? 'FINAL' : isThird ? '3° PUESTO' : `P${match.id}`}
      </div>
      <BracketSide label={home} score={played ? res!.homeScore : undefined} winner={played && rm?.winner === home.short} pens={res?.homePens} />
      <BracketSide label={away} score={played ? res!.awayScore : undefined} winner={played && rm?.winner === away.short} pens={res?.awayPens} />
    </button>
  )
}

function BracketSide({
  label,
  score,
  winner,
  pens,
}: {
  label: { flag: string; name: string; resolved: boolean }
  score?: number
  winner?: boolean
  pens?: number
}) {
  return (
    <div className="flex items-center gap-1.5 py-0.5">
      <span className="shrink-0">{label.flag}</span>
      <span
        className={`text-xs truncate flex-1 ${
          winner ? 'font-bold text-white' : label.resolved ? 'text-slate-200' : 'text-slate-500'
        }`}
      >
        {label.name}
      </span>
      {pens != null && <span className="text-[9px] text-slate-500">({pens})</span>}
      <span className="text-xs font-bold tabular-nums w-4 text-right">{score ?? ''}</span>
    </div>
  )
}
