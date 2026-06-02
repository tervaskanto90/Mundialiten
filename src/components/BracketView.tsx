import { MATCHES, STAGE_I18N } from '../data/schedule'
import type { StageId } from '../types'
import { sideLabelFor } from '../utils/labels'
import type { ActiveContext } from '../hooks'
import { useT } from '../i18n'

interface Props {
  ctx: ActiveContext
  onEdit: (matchId: number) => void
}

const ROUNDS: StageId[] = ['r32', 'r16', 'qf', 'sf', 'final']

export function BracketView({ ctx, onEdit }: Props) {
  const { t } = useT()
  const finalMatch = ctx.resolution.matches[104]
  const champLabel = finalMatch?.winner
    ? sideLabelFor(104, finalMatch.winner, 'home', ctx.resolution)
    : null
  const thirdMatch = MATCHES.find((m) => m.stage === 'third')

  return (
    <div>
      <div
        className={`mb-4 text-center rounded-xl py-3 border ${
          champLabel?.resolved
            ? 'bg-gradient-to-r from-amber-500/25 to-amber-600/20 border-amber-500/40'
            : 'bg-slate-800/40 border-white/5'
        }`}
      >
        <div className="text-xs text-amber-300/80 tracking-wide">🏆 {t('CAMPEÓN', 'CHAMPION')}</div>
        <div className="text-xl font-bold flex items-center justify-center gap-2 mt-0.5">
          {champLabel?.resolved ? (
            <>
              <span>{champLabel.flag}</span> {champLabel.name}
            </>
          ) : (
            <span className="text-slate-500 text-base font-medium">{t('Por definir', 'To be decided')}</span>
          )}
        </div>
      </div>

      <p className="text-[11px] text-slate-500 mb-2">
        {t(
          'Las posiciones se actualizan en vivo con la tabla: el 1° y 2° actual de cada grupo aparecen (provisorios) apenas juegan. Al cerrar la fase de grupos, las predicciones arman la fase final con los equipos que realmente clasificaron.',
          'Positions update live with the standings: the current 1st and 2nd of each group appear (provisional) as soon as they play. When the group stage ends, predictions build the knockouts with the teams that actually qualified.',
        )}
      </p>
      <div className="overflow-x-auto pb-2">
        <div className="bracket min-w-max">
          {ROUNDS.map((stage) => {
            const matches = MATCHES.filter((m) => m.stage === stage)
            return (
              <div key={stage} className="bracket-round">
                <div className="bracket-round-title">{t(STAGE_I18N[stage].es, STAGE_I18N[stage].en)}</div>
                <div className="bracket-col">
                  {matches.map((m) => (
                    <div key={m.id} className="bracket-match">
                      <BracketCard matchId={m.id} ctx={ctx} onEdit={onEdit} highlight={stage === 'final'} />
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {thirdMatch && (
        <div className="mt-5 max-w-xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
            🥉 {t('Tercer puesto', 'Third place')}
          </div>
          <BracketCard matchId={thirdMatch.id} ctx={ctx} onEdit={onEdit} />
        </div>
      )}
    </div>
  )
}

function BracketCard({
  matchId,
  ctx,
  onEdit,
  highlight,
}: {
  matchId: number
  ctx: ActiveContext
  onEdit: (matchId: number) => void
  highlight?: boolean
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
      className={`w-full text-left rounded-lg border overflow-hidden transition hover:border-pitch-500/60 ${
        highlight ? 'border-amber-500/40 bg-amber-500/5' : 'border-white/10 bg-slate-800/70'
      }`}
    >
      <div className="px-2 pt-1 text-[9px] text-slate-500">P{match.id}</div>
      <BracketSide
        label={home}
        score={played ? res!.homeScore : undefined}
        pens={res?.homePens}
        winner={played && rm?.winner === home.short}
      />
      <div className="border-t border-white/5" />
      <BracketSide
        label={away}
        score={played ? res!.awayScore : undefined}
        pens={res?.awayPens}
        winner={played && rm?.winner === away.short}
      />
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
    <div
      className={`flex items-center gap-1.5 px-2 py-1 ${
        winner ? 'bg-pitch-500/15' : ''
      }`}
    >
      <span className="shrink-0 text-sm">{label.flag}</span>
      <span
        className={`text-xs truncate flex-1 ${
          winner ? 'font-bold text-white' : label.resolved ? 'text-slate-200' : 'text-slate-500'
        }`}
      >
        {label.name}
      </span>
      {pens != null && <span className="text-[9px] text-slate-500">({pens})</span>}
      <span className={`text-xs tabular-nums w-4 text-right ${winner ? 'font-bold' : 'text-slate-400'}`}>
        {score ?? ''}
      </span>
    </div>
  )
}
