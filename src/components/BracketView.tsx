import { useRef } from 'react'
import { MATCHES, MATCH_BY_ID, STAGE_I18N } from '../data/schedule'
import { TEAM_BY_ID } from '../data/teams'
import { flagColors } from '../data/flagColors'
import type { StageId } from '../types'
import { sideLabel, sideLabelFor, teamDisplayName } from '../utils/labels'
import type { ActiveContext } from '../hooks'
import { useT } from '../i18n'
import { useTheme, ACCENT } from '../theme'
import { useIsDesktop } from '../hooks/useIsDesktop'
import { useBranding } from '../lib/branding'
import { HeaderBrand } from './HeaderBrand'
import { Confetti } from './Confetti'

const FLAG_FONT = "'Twemoji Country Flags', 'Noto Color Emoji', sans-serif"

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
  const isDesktop = useIsDesktop()
  const [branding] = useBranding()
  // Scroll horizontal de la llave sin tener que bajar hasta la barra del fondo:
  // se arrastra con el mouse (grab) y/o con los botones ◀ ▶ de arriba.
  const scrollRef = useRef<HTMLDivElement>(null)
  const drag = useRef({ down: false, moved: false, x: 0, left: 0 })
  const justDragged = useRef(false)

  const onPointerDown = (e: React.PointerEvent) => {
    const el = scrollRef.current
    if (!el || e.button !== 0 || e.pointerType !== 'mouse') return // touch usa scroll nativo
    drag.current = { down: true, moved: false, x: e.clientX, left: el.scrollLeft }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const el = scrollRef.current
    const d = drag.current
    if (!el || !d.down) return
    const dx = e.clientX - d.x
    if (!d.moved && Math.abs(dx) < 6) return
    if (!d.moved) {
      d.moved = true
      el.style.cursor = 'grabbing'
      el.setPointerCapture?.(e.pointerId)
    }
    el.scrollLeft = d.left - dx
  }
  const onPointerUp = () => {
    const el = scrollRef.current
    if (el && drag.current.moved) {
      justDragged.current = true
      el.style.cursor = 'grab'
      setTimeout(() => (justDragged.current = false), 60)
    }
    drag.current.down = false
    drag.current.moved = false
  }
  // Tras arrastrar, anula el click que abriría el editor de ese partido.
  const onClickCapture = (e: React.MouseEvent) => {
    if (justDragged.current) {
      e.preventDefault()
      e.stopPropagation()
    }
  }
  const nudge = (dir: 1 | -1) => {
    const el = scrollRef.current
    if (el) el.scrollBy({ left: dir * Math.max(280, el.clientWidth * 0.7), behavior: 'smooth' })
  }

  const finalMatch = ctx.resolution.matches[104]
  // El campeón es el GANADOR de la final (no el local).
  const champLabel = finalMatch?.winner ? sideLabel(finalMatch.winner, finalMatch.winner) : null
  const thirdMatch = MATCHES.find((m) => m.stage === 'third')
  const championed = champLabel?.resolved

  // Podio: 1° = ganador de la final, 2° = perdedor de la final, 3° = ganador del
  // partido por el tercer puesto (cada uno, si ya está definido).
  const firstId = finalMatch?.winner
  const secondId = finalMatch?.loser
  const thirdId = thirdMatch ? ctx.resolution.matches[thirdMatch.id]?.winner : undefined

  return (
    <div>
      {championed && <Confetti key={firstId} colors={flagColors(firstId)} />}
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
              <HeaderBrand branding={branding} size={30} />
              <span style={{ fontSize: '26px', fontFamily: FLAG_FONT }}>{champLabel!.flag}</span> {champLabel!.name}
            </>
          ) : (
            <span style={{ color: c.faint, fontSize: '15px', fontWeight: 600 }}>{t('Por definir', 'To be decided')}</span>
          )}
        </div>
      </div>

      {championed && <Podium firstId={firstId} secondId={secondId} thirdId={thirdId} />}

      <p className="text-[11px] mb-2" style={{ color: c.faint }}>
        {t(
          'Las posiciones se actualizan en vivo con la tabla: el 1° y 2° actual de cada grupo aparecen (provisorios) apenas juegan. Al cerrar la fase de grupos, las predicciones arman la fase final con los equipos que realmente clasificaron.',
          'Positions update live with the standings: the current 1st and 2nd of each group appear (provisional) as soon as they play. When the group stage ends, predictions build the knockouts with the teams that actually qualified.',
        )}
      </p>
      {isDesktop && (
        <div className="flex items-center justify-end gap-1.5 mb-1.5">
          <span className="text-[11px] mr-1" style={{ color: c.faint }}>
            {t('Arrastrá o usá', 'Drag or use')}
          </span>
          {([-1, 1] as const).map((dir) => (
            <button
              key={dir}
              onClick={() => nudge(dir)}
              title={dir < 0 ? t('Ronda anterior', 'Previous round') : t('Ronda siguiente', 'Next round')}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs"
              style={{ border: '1px solid ' + c.line, background: c.cardGrad, color: c.text }}
            >
              {dir < 0 ? '◀' : '▶'}
            </button>
          ))}
        </div>
      )}
      <div
        ref={scrollRef}
        className="overflow-x-auto pb-2"
        style={{ cursor: isDesktop ? 'grab' : undefined, touchAction: 'pan-x pan-y' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onClickCapture={onClickCapture}
      >
        <div className="bracket min-w-max">
          {ROUNDS.map((stage) => {
            const matches = STAGE_ORDERED[stage].map((id) => MATCH_BY_ID[id])
            return (
              <div key={stage} className="bracket-round">
                <div className="bracket-round-title">{t(STAGE_I18N[stage].es, STAGE_I18N[stage].en)}</div>
                <div className="bracket-col">
                  {matches.map((m) =>
                    stage === 'final' && thirdMatch ? (
                      // La final queda como antes (centrada, con su conector). El
                      // 3er puesto va absoluto, MISMO tamaño, 2cm debajo de la
                      // tarjeta de la final y SIN línea que lo conecte.
                      <div key={m.id} className="bracket-match">
                        <div style={{ position: 'relative', width: '100%' }}>
                          <BracketCard matchId={m.id} ctx={ctx} onEdit={onEdit} highlight />
                          <div style={{ position: 'absolute', top: 'calc(100% + 2cm)', left: 0, width: '100%' }}>
                            <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: c.muted }}>
                              🥉 {t('Tercer puesto', 'Third place')}
                            </div>
                            <BracketCard matchId={thirdMatch.id} ctx={ctx} onEdit={onEdit} />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div key={m.id} className="bracket-match">
                        <BracketCard matchId={m.id} ctx={ctx} onEdit={onEdit} highlight={stage === 'final'} />
                      </div>
                    ),
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Podio del torneo: 1° (campeón), 2° (finalista) y 3° (ganador del 3er puesto).
function Podium({ firstId, secondId, thirdId }: { firstId?: string; secondId?: string; thirdId?: string }) {
  const { t } = useT()
  const { c, dark } = useTheme()
  const steps: Array<{ id?: string; place: 1 | 2 | 3; h: number; medal: string; col: string }> = [
    { id: secondId, place: 2, h: 54, medal: '🥈', col: '#C0C7D1' },
    { id: firstId, place: 1, h: 78, medal: '🥇', col: ACCENT.gold },
    { id: thirdId, place: 3, h: 38, medal: '🥉', col: '#CD8E5A' },
  ]
  return (
    <div
      className="mb-4 rounded-2xl px-3 pt-3 pb-0 flex items-end justify-center gap-2"
      style={{ background: c.cardGrad, border: '1px solid ' + c.line, boxShadow: c.shadow }}
    >
      {steps.map(({ id, place, h, medal, col }) => {
        const team = id ? TEAM_BY_ID[id] : undefined
        return (
          <div key={place} className="flex flex-col items-center" style={{ width: 92 }}>
            <div style={{ fontSize: 26, fontFamily: FLAG_FONT, lineHeight: 1 }}>{team?.flag ?? '🏳️'}</div>
            <div className="text-[11px] font-bold truncate w-full text-center mt-0.5" style={{ color: c.text }}>
              {team ? teamDisplayName(team) : t('—', '—')}
            </div>
            <div
              className="w-full rounded-t-lg mt-1.5 flex items-start justify-center pt-1"
              style={{ height: h, background: col + (dark ? '33' : '55'), borderTop: '2px solid ' + col }}
            >
              <span style={{ fontSize: 18 }}>{medal}</span>
            </div>
          </div>
        )
      })}
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
        loser={!!played && !!rm?.winner && home.resolved && rm.winner !== home.short}
      />
      <div style={{ borderTop: '1px solid ' + c.line }} />
      <BracketSide
        label={away}
        score={played ? res!.awayScore : undefined}
        pens={res?.awayPens}
        winner={!!played && rm?.winner === away.short}
        loser={!!played && !!rm?.winner && away.resolved && rm.winner !== away.short}
      />
    </button>
  )
}

function BracketSide({
  label,
  score,
  winner,
  loser,
  pens,
}: {
  label: { flag: string; name: string; resolved: boolean }
  score?: number
  winner?: boolean
  loser?: boolean
  pens?: number
}) {
  const { c } = useTheme()
  const nameColor = winner ? ACCENT.green : loser ? ACCENT.red : label.resolved ? c.muted : c.faint
  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1"
      style={{ background: winner ? 'linear-gradient(90deg, rgba(31,168,92,.18), transparent)' : 'transparent' }}
    >
      <span className="shrink-0 text-sm" style={{ filter: loser ? 'grayscale(1)' : 'none', opacity: loser ? 0.6 : 1 }}>{label.flag}</span>
      <span
        className="text-xs truncate flex-1"
        style={{ color: nameColor, fontWeight: winner || loser ? 800 : 600, textDecoration: loser ? 'line-through' : 'none' }}
      >
        {label.name}
      </span>
      {pens != null && <span className="text-[9px]" style={{ color: c.faint }}>({pens})</span>}
      <span
        className="text-xs tabular-nums w-4 text-right"
        style={{ color: winner ? ACCENT.green : c.muted, fontFamily: "'Archivo'", fontWeight: winner ? 800 : 600 }}
      >
        {score ?? ''}
      </span>
    </div>
  )
}
