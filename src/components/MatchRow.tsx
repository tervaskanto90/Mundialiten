import { MATCH_BY_ID } from '../data/schedule'
import { sideLabelFor, venueName, matchTimeLabel, formatDateShort, matchDateKey } from '../utils/labels'
import { canPredict } from '../utils/stage'
import { isMatchLive } from '../utils/live'
import type { ActiveContext } from '../hooks'
import { useTheme, ACCENT } from '../theme'

interface Props {
  matchId: number
  ctx: ActiveContext
  onEdit: (matchId: number) => void
  showVenue?: boolean
  showDate?: boolean
}

export function MatchRow({ matchId, ctx, onEdit, showVenue = true, showDate = false }: Props) {
  const { c, dark } = useTheme()
  const match = MATCH_BY_ID[matchId]
  if (!match) return null
  const res = ctx.results[matchId]
  const home = sideLabelFor(matchId, match.home, 'home', ctx.resolution)
  const away = sideLabelFor(matchId, match.away, 'away', ctx.resolution)
  const played = res?.played
  const rm = ctx.resolution.matches[matchId]
  // En vivo según los resultados REALES (vale en cualquier pestaña).
  const live = isMatchLive(ctx.real.results, matchId)

  // Verde/rojo SOLO cuando está garantizado DE VERDAD (según los resultados
  // reales), por fase:
  //  - Grupos: verde si ya aseguró top-2 o mejor-3°; rojo si ya no puede entrar.
  //  - Eliminatorias: verde si GANÓ ese partido (pasa); rojo si lo PERDIÓ (afuera).
  // Las etapas/partidos sin definir quedan neutros (ni verde ni rojo).
  const realRes = ctx.realResolution
  const statusFor = (short?: string): { qualified: boolean; eliminated: boolean } => {
    if (!short) return { qualified: false, eliminated: false }
    if (match.stage === 'group') {
      return { qualified: realRes.qualified.has(short), eliminated: realRes.eliminated.has(short) }
    }
    const realM = realRes.matches[matchId]
    if (realM?.decided) {
      if (realM.winner === short) return { qualified: true, eliminated: false }
      if (realM.loser === short) return { qualified: false, eliminated: true }
    }
    return { qualified: false, eliminated: false }
  }
  const homeStatus = statusFor(home.short)
  const awayStatus = statusFor(away.short)
  // En una predicción, marcamos los partidos que todavía no se pueden predecir.
  const lockedForPrediction = ctx.scenario.type === 'prediction' && !canPredict(match)

  const cardStyle: React.CSSProperties = {
    width: '100%',
    textAlign: 'left',
    borderRadius: '16px',
    padding: '11px 12px',
    cursor: 'pointer',
    transition: 'transform .16s ease, border-color .2s ease',
    animation: 'mdlUp .4s both',
    background: live
      ? dark
        ? 'linear-gradient(150deg, rgba(60,20,12,.7), rgba(25,19,9,.9))'
        : 'linear-gradient(150deg,#FFF4EC,#FFFDF6)'
      : c.cardGrad,
    border: '1px solid ' + (live ? 'rgba(229,50,43,.32)' : c.line),
    boxShadow: live ? '0 12px 30px -18px rgba(229,50,43,.5)' : 'none',
    opacity: lockedForPrediction ? 0.72 : 1,
  }

  return (
    <button onClick={() => onEdit(matchId)} style={cardStyle} className="flex items-center gap-3">
      <div style={{ width: 46, flex: 'none', textAlign: 'center', lineHeight: 1.25 }}>
        <div style={{ fontSize: '10px', fontFamily: "'Archivo'", fontWeight: 800, color: live ? ACCENT.red : c.muted }}>
          {live ? '🔴 VIVO' : `${lockedForPrediction ? '🔒 ' : ''}P${match.id}`}
        </div>
        {showDate && <div style={{ fontSize: '9px', color: c.faint, fontWeight: 600 }}>{formatDateShort(matchDateKey(match))}</div>}
        <div style={{ fontSize: '10px', color: c.faint, fontWeight: 700 }}>{matchTimeLabel(match)}</div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <Side
            flag={home.flag}
            name={home.name}
            winner={!!played && rm?.winner === home.short}
            eliminated={homeStatus.eliminated}
            qualified={homeStatus.qualified}
            c={c}
          />
          <Score played={!!played} h={res?.homeScore} a={res?.awayScore} hp={res?.homePens} ap={res?.awayPens} live={live} c={c} />
          <Side
            flag={away.flag}
            name={away.name}
            winner={!!played && rm?.winner === away.short}
            eliminated={awayStatus.eliminated}
            qualified={awayStatus.qualified}
            right
            c={c}
          />
        </div>
        {showVenue && (
          <div style={{ fontSize: '10px', color: c.faint, marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            📍 {venueName(match.venueId)}
          </div>
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
  qualified,
  c,
}: {
  flag: string
  name: string
  right?: boolean
  winner?: boolean
  eliminated?: boolean
  qualified?: boolean
  c: { text: string; muted: string; faint: string }
}) {
  const nameColor = eliminated ? ACCENT.red : qualified ? ACCENT.green : winner ? c.text : c.muted
  return (
    <div className={`flex items-center gap-1.5 min-w-0 flex-1 ${right ? 'flex-row-reverse text-right' : ''}`}>
      <span className="text-lg shrink-0" style={{ filter: eliminated ? 'grayscale(1)' : 'none', opacity: eliminated ? 0.5 : 1 }}>
        {flag}
      </span>
      <span
        className="text-sm truncate"
        style={{
          color: nameColor,
          fontWeight: winner || qualified || eliminated ? 800 : 600,
          textDecoration: eliminated ? 'line-through' : 'none',
        }}
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
  live,
  c,
}: {
  played: boolean
  h?: number
  a?: number
  hp?: number
  ap?: number
  live?: boolean
  c: { text: string; muted: string; faint: string }
}) {
  if (!played) {
    return <span className="text-xs px-2 shrink-0" style={{ color: c.faint, fontWeight: 700 }}>vs</span>
  }
  return (
    <div className="shrink-0 px-2 text-center">
      <div style={{ fontFamily: "'Archivo'", fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: live ? ACCENT.red : c.text }}>
        {h} <span style={{ color: c.faint }}>-</span> {a}
      </div>
      {hp != null && ap != null && (
        <div style={{ fontSize: '10px', color: c.muted }}>
          ({hp}-{ap} pen)
        </div>
      )}
    </div>
  )
}
