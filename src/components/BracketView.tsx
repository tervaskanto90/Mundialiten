import { MATCHES, MATCH_BY_ID, STAGE_I18N } from '../data/schedule'
import type { StageId } from '../types'
import { sideLabel, sideLabelFor } from '../utils/labels'
import type { ActiveContext } from '../hooks'
import { useT } from '../i18n'
import { useTheme } from '../theme'

interface Props {
  ctx: ActiveContext
  onEdit: (matchId: number) => void
}

const ROUNDS: StageId[] = ['r32', 'r16', 'qf', 'sf', 'final']

// ── Orden del cuadro como árbol real ──
// Cada cruce de eliminación se alimenta de Wnn (ganador del partido nn). Para
// que las líneas conecten con la caja correcta, ordenamos cada ronda según el
// árbol (no por número de partido), partiendo de la final hacia atrás.
const feederId = (ref: string): number | null => {
  const m = /^W(\d+)$/.exec(ref)
  return m ? Number(m[1]) : null
}
const KO_PARENT: Record<number, number> = (() => {
  const p: Record<number, number> = {}
  for (const m of MATCHES) {
    for (const ref of [m.home, m.away]) {
      const f = feederId(ref)
      if (f != null) p[f] = m.id
    }
  }
  return p
})()
function collectLeaves(id: number, out: number[]) {
  const m = MATCH_BY_ID[id]
  const hf = feederId(m.home)
  const af = feederId(m.away)
  if (hf == null && af == null) {
    out.push(id)
    return
  }
  if (hf != null) collectLeaves(hf, out)
  if (af != null) collectLeaves(af, out)
}
const dedupe = (ids: number[]): number[] => [...new Set(ids)]
const R32_ORDER: number[] = (() => {
  const o: number[] = []
  collectLeaves(104, o)
  return o
})()
const R16_ORDER = dedupe(R32_ORDER.map((id) => KO_PARENT[id]))
const QF_ORDER = dedupe(R16_ORDER.map((id) => KO_PARENT[id]))
const SF_ORDER = dedupe(QF_ORDER.map((id) => KO_PARENT[id]))
const FINAL_ORDER = dedupe(SF_ORDER.map((id) => KO_PARENT[id]))
const STAGE_ORDERED: Record<string, number[]> = {
  r32: R32_ORDER,
  r16: R16_ORDER,
  qf: QF_ORDER,
  sf: SF_ORDER,
  final: FINAL_ORDER,
}

export function BracketView({ ctx, onEdit }: Props) {
  const { t } = useT()
  const { c, dark } = useTheme()
  const finalMatch = ctx.resolution.matches[104]
  // El campeón es el GANADOR de la final (no el local).
  const champLabel = finalMatch?.winner ? sideLabel(finalMatch.winner, finalMatch.winner) : null
  const thirdMatch = MATCHES.find((m) => m.stage === 'third')
  const championed = champLabel?.resolved

  return (
    <div>
      <div
        className="mb-4 text-center rounded-2xl py-4"
        style={{
          background: championed
            ? dark
              ? 'linear-gradient(160deg, rgba(255,194,26,.18), rgba(25,19,9,.92))'
              : 'linear-gradient(160deg,#FFF1C6,#FFFDF6)'
            : c.cardGrad,
          border: '1.5px solid ' + (championed ? 'rgba(255,194,26,.55)' : c.line),
          boxShadow: championed ? '0 14px 34px -16px rgba(255,194,26,.6)' : c.shadow,
          animation: championed ? 'mdlPop .5s cubic-bezier(.34,1.56,.64,1) both' : 'none',
        }}
      >
        <div style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '1px', color: dark ? '#FFCF45' : '#B07D08' }}>
          🏆 {t('TU CAMPEÓN', 'YOUR CHAMPION')}
        </div>
        <div className="flex items-center justify-center gap-2 mt-1" style={{ fontFamily: "'Archivo'", fontWeight: 900, fontSize: '20px', color: c.text }}>
          {championed ? (
            <>
              <span style={{ fontSize: '26px' }}>{champLabel!.flag}</span> {champLabel!.name}
            </>
          ) : (
            <span style={{ color: c.faint, fontSize: '15px', fontWeight: 600 }}>{t('Por definir', 'To be decided')}</span>
          )}
        </div>
      </div>

      <p className="text-[11px] mb-2" style={{ color: c.faint }}>
        {t(
          'Las posiciones se actualizan en vivo con la tabla: el 1° y 2° actual de cada grupo aparecen (provisorios) apenas juegan. Al cerrar la fase de grupos, las predicciones arman la fase final con los equipos que realmente clasificaron.',
          'Positions update live with the standings: the current 1st and 2nd of each group appear (provisional) as soon as they play. When the group stage ends, predictions build the knockouts with the teams that actually qualified.',
        )}
      </p>
      <div className="overflow-x-auto pb-2">
        <div className="bracket min-w-max">
          {ROUNDS.map((stage) => {
            const matches = STAGE_ORDERED[stage].map((id) => MATCH_BY_ID[id])
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
          <div className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: c.muted }}>
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
  const { c } = useTheme()
  const match = MATCHES.find((m) => m.id === matchId)!
  const res = ctx.results[matchId]
  const rm = ctx.resolution.matches[matchId]
  const home = sideLabelFor(matchId, match.home, 'home', ctx.resolution)
  const away = sideLabelFor(matchId, match.away, 'away', ctx.resolution)
  const played = res?.played

  return (
    <button
      onClick={() => onEdit(matchId)}
      className="w-full text-left rounded-xl overflow-hidden transition"
      style={{
        background: c.cardGrad,
        border: '1px solid ' + (highlight ? 'rgba(255,194,26,.5)' : c.line),
        boxShadow: c.shadow,
      }}
    >
      <div className="px-2 pt-1 text-[9px]" style={{ color: c.faint }}>P{match.id}</div>
      <BracketSide
        label={home}
        score={played ? res!.homeScore : undefined}
        pens={res?.homePens}
        winner={!!played && rm?.winner === home.short}
      />
      <div style={{ borderTop: '1px solid ' + c.line }} />
      <BracketSide
        label={away}
        score={played ? res!.awayScore : undefined}
        pens={res?.awayPens}
        winner={!!played && rm?.winner === away.short}
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
  const { c } = useTheme()
  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1"
      style={{ background: winner ? 'linear-gradient(90deg, rgba(31,168,92,.18), transparent)' : 'transparent' }}
    >
      <span className="shrink-0 text-sm">{label.flag}</span>
      <span
        className="text-xs truncate flex-1"
        style={{ color: winner ? c.text : label.resolved ? c.muted : c.faint, fontWeight: winner ? 800 : 600 }}
      >
        {label.name}
      </span>
      {pens != null && <span className="text-[9px]" style={{ color: c.faint }}>({pens})</span>}
      <span
        className="text-xs tabular-nums w-4 text-right"
        style={{ color: winner ? c.text : c.muted, fontFamily: "'Archivo'", fontWeight: winner ? 800 : 600 }}
      >
        {score ?? ''}
      </span>
    </div>
  )
}
