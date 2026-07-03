import { MATCH_BY_ID, STAGE_I18N } from '../data/schedule'
import { useStore, emptyResult } from '../store/useStore'
import { sideLabelFor, venueName, matchDateLabel, matchTimeLabel } from '../utils/labels'
import type { ActiveContext } from '../hooks'
import { Modal } from './Modal'
import { predictReason } from '../utils/stage'
import { useOdds, oddsForMatch, type MatchOdds } from '../lib/odds'
import { useT } from '../i18n'
import { useTheme, ACCENT } from '../theme'

interface Props {
  matchId: number
  ctx: ActiveContext
  onClose: () => void
}

export function ResultEditor({ matchId, ctx, onClose }: Props) {
  const match = MATCH_BY_ID[matchId]
  const { t, lang } = useT()
  const { c } = useTheme()
  const setResult = useStore((s) => s.setResult)
  const clearResult = useStore((s) => s.clearResult)

  const { scenario } = ctx
  const homeId = ctx.resolution.matches[matchId]?.home
  const awayId = ctx.resolution.matches[matchId]?.away
  const oddsState = useOdds()
  const odds = oddsForMatch(oddsState, homeId, awayId)

  const base = ctx.results[matchId] ?? emptyResult()
  const home = sideLabelFor(matchId, match.home, 'home', ctx.resolution)
  const away = sideLabelFor(matchId, match.away, 'away', ctx.resolution)
  const isKnockout = match.stage !== 'group'
  const isReal = scenario.type === 'real'
  const isWhatif = scenario.type === 'whatif'
  const hasOverride = !!scenario.results[matchId]
  const inherited = isWhatif && !hasOverride
  // Predicciones: se habilitan por etapa y se cierran 5 min antes del partido.
  const reason = scenario.type === 'prediction' ? predictReason(match) : 'open'
  const locked = reason !== 'open'
  const editingDisabled = isReal || locked

  // Para what-if sin sobrescritura, sembramos el override con el resultado real.
  const ensureOverride = () => {
    if (isWhatif && !scenario.results[matchId]) {
      setResult(scenario.id, matchId, { ...base })
    }
  }
  const patch = (p: Partial<typeof base>) => {
    ensureOverride()
    setResult(scenario.id, matchId, p)
  }
  const setScore = (side: 'home' | 'away', value: number) => {
    const v = Math.max(0, value)
    patch(side === 'home' ? { homeScore: v, played: true } : { awayScore: v, played: true })
  }

  return (
    <Modal
      title={`${t('Partido', 'Match')} ${match.id} · ${t(STAGE_I18N[match.stage].es, STAGE_I18N[match.stage].en)}${match.group ? ` ${match.group}` : ''}`}
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs" style={{ color: c.muted }}>
            {t('En', 'In')} «{scenario.type === 'real' ? t('Resultados reales', 'Real results') : scenario.name}»
            {inherited && t(' · heredando del real', ' · inheriting from real')}
            {isReal && t(' · 🔴 sólo lectura (en vivo)', ' · 🔴 read-only (live)')}
            {locked && t(' · 🔒 cerrado', ' · 🔒 closed')}
          </div>
          <div className="flex gap-2">
            {isWhatif && hasOverride && (
              <button onClick={() => { clearResult(scenario.id, matchId); onClose() }} className="px-3 py-2 rounded-lg text-sm" style={{ color: ACCENT.gold }}>
                ↺ {t('Volver al real', 'Back to real')}
              </button>
            )}
            {!isWhatif && !isReal && !locked && base.played && (
              <button onClick={() => { clearResult(scenario.id, matchId); onClose() }} className="px-3 py-2 rounded-lg text-sm" style={{ color: ACCENT.red }}>
                🗑 {t('Borrar', 'Clear')}
              </button>
            )}
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: ACCENT.blue, color: '#fff' }}>
              {t('Listo', 'Done')}
            </button>
          </div>
        </div>
      }
    >
      <div className="text-xs mb-4 capitalize" style={{ color: c.muted }}>
        {matchDateLabel(match, lang)} · {matchTimeLabel(match)} · 📍 {venueName(match.venueId)}
      </div>

      {isReal && (
        <div className="text-[11px] rounded-lg px-3 py-2 mb-4" style={{ color: c.muted, background: ACCENT.red + '1A', border: '1px solid ' + ACCENT.red + '33' }}>
          {t(
            '🔴 Los resultados reales son la fuente de verdad y se actualizan en vivo. Para simular, cloná esta pestaña como «What-if».',
            '🔴 The real results are the source of truth and update live. To simulate, clone this tab as “What-if”.',
          )}
        </div>
      )}

      {locked && (
        <div className="text-[11px] rounded-lg px-3 py-2 mb-4" style={{ color: c.text, background: ACCENT.gold + '1A', border: '1px solid ' + ACCENT.gold + '4D' }}>
          {reason === 'future'
            ? t(`🔒 Las predicciones de ${STAGE_I18N[match.stage].es} se abren cuando empiece esa fase.`, `🔒 Predictions for the ${STAGE_I18N[match.stage].en} open when that stage begins.`)
            : reason === 'past'
              ? t(`🔒 Las predicciones de ${STAGE_I18N[match.stage].es} ya cerraron.`, `🔒 Predictions for the ${STAGE_I18N[match.stage].en} are closed.`)
              : t('🔒 Ya no se aceptan predicciones para este partido (cerró 5 minutos antes del inicio).', '🔒 Predictions for this match are closed (they closed 5 minutes before kick-off).')}
        </div>
      )}

      {/* Marcador */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 mb-4">
        <ScoreSide flag={home.flag} name={home.name} />
        {editingDisabled ? (
          <div className="text-3xl font-bold tabular-nums px-2" style={{ color: c.text }}>
            {base.played ? `${base.homeScore} - ${base.awayScore}` : 'vs'}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Stepper value={base.played ? base.homeScore : 0} onChange={(v) => setScore('home', v)} />
            <span style={{ color: c.muted }}>-</span>
            <Stepper value={base.played ? base.awayScore : 0} onChange={(v) => setScore('away', v)} />
          </div>
        )}
        <ScoreSide flag={away.flag} name={away.name} right />
      </div>

      {!base.played && !editingDisabled && (
        <div className="text-center -mt-2 mb-3">
          <button onClick={() => patch({ played: true })} className="text-xs hover:underline" style={{ color: ACCENT.blue }}>
            {t('Marcar como jugado (0-0)', 'Mark as played (0-0)')}
          </button>
        </div>
      )}

      {/* Empate tras el alargue en eliminatoria → hay que elegir quién avanza (en
          la práctica, por penales; el alargue ya está reflejado en el marcador).
          En las predicciones NO se carga el marcador de la tanda (es azar): se
          elige quién avanza y ese acierto suma el bonus "quién pasa". En el real
          sí mostramos el tanteo de penales. */}
      {isKnockout && base.played && base.homeScore === base.awayScore && (() => {
        const isFinalish = match.stage === 'final' || match.stage === 'third'
        const hp = base.homePens ?? 0
        const ap = base.awayPens ?? 0
        const pick: 'home' | 'away' | null = hp > ap ? 'home' : ap > hp ? 'away' : null
        const choose = (side: 'home' | 'away') =>
          patch(side === 'home' ? { homePens: 1, awayPens: 0 } : { homePens: 0, awayPens: 1 })
        return (
          <div className="rounded-xl p-3 mb-4" style={{ background: c.surface, border: '1px solid ' + c.line }}>
            <div className="text-xs mb-2 flex items-center gap-1.5" style={{ color: c.muted }}>
              🥅 {isFinalish ? t('¿Quién gana? (si empatan tras el alargue)', 'Who wins? (if tied after extra time)') : t('¿Quién pasa? (si empatan tras el alargue)', 'Who advances? (if tied after extra time)')}
            </div>
            {editingDisabled ? (
              <div className="text-center text-sm font-bold" style={{ color: c.text }}>
                {pick === 'home' ? `${home.flag} ${home.name}` : pick === 'away' ? `${away.flag} ${away.name}` : t('—', '—')}
                <span className="ml-2 text-[11px] font-normal" style={{ color: c.muted }}>({hp}-{ap} pen)</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {(['home', 'away'] as const).map((side) => {
                  const lbl = side === 'home' ? home : away
                  const on = pick === side
                  return (
                    <button
                      key={side}
                      onClick={() => choose(side)}
                      className="rounded-lg px-2 py-2 text-sm font-bold flex items-center justify-center gap-1.5"
                      style={{
                        border: '1px solid ' + (on ? ACCENT.green : c.line),
                        background: on ? ACCENT.green + '22' : 'transparent',
                        color: on ? ACCENT.green : c.text,
                      }}
                    >
                      <span>{lbl.flag}</span>
                      <span className="truncate">{lbl.name}</span>
                    </button>
                  )
                })}
              </div>
            )}
            {!editingDisabled && !pick && (
              <div
                className="mt-2 rounded-lg px-3 py-2 text-center text-xs font-bold"
                style={{ color: ACCENT.red, background: ACCENT.red + '1A', border: '1px solid ' + ACCENT.red + '66' }}
              >
                ⚠️ {isFinalish
                  ? t('Te falta elegir quién GANA: sin esto no sumás el bonus.', 'You still need to pick who WINS: without it you earn no bonus.')
                  : t('Te falta elegir quién PASA: sin esto no sumás el bonus de esta ronda.', 'You still need to pick who ADVANCES: without it you earn no bonus this round.')}
              </div>
            )}
          </div>
        )
      })()}

      {odds && <OddsBar odds={odds} homeFlag={home.flag} awayFlag={away.flag} />}
    </Modal>
  )
}

function ScoreSide({ flag, name, right }: { flag: string; name: string; right?: boolean }) {
  const { c } = useTheme()
  return (
    <div className={`flex items-center gap-2 min-w-0 ${right ? 'flex-row-reverse text-right' : ''}`}>
      <span className="text-2xl shrink-0">{flag}</span>
      <span className="text-sm font-medium truncate" style={{ color: c.text }}>{name}</span>
    </div>
  )
}

function Stepper({ value, onChange, small }: { value: number; onChange: (v: number) => void; small?: boolean }) {
  const { c, dark } = useTheme()
  const stepStyle = { border: '1px solid ' + c.line, color: c.text, background: dark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.04)' }
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => onChange(value - 1)} className="w-7 h-7 rounded-lg text-lg leading-none" style={stepStyle}>−</button>
      <span className={`tabular-nums text-center ${small ? 'w-6 text-lg' : 'w-8 text-2xl'} font-bold`} style={{ color: c.text }}>{value}</span>
      <button onClick={() => onChange(value + 1)} className="w-7 h-7 rounded-lg text-lg leading-none" style={stepStyle}>+</button>
    </div>
  )
}

// Índice de una casa de apuestas: prob. implícita Local / Empate / Visitante.
function OddsBar({ odds, homeFlag, awayFlag }: { odds: MatchOdds; homeFlag: string; awayFlag: string }) {
  const { t } = useT()
  const { c, dark } = useTheme()
  const pct = (n: number) => Math.round(n * 100)
  const segs: { v: number; color: string }[] = [
    { v: odds.home, color: ACCENT.blue },
    { v: odds.draw, color: dark ? '#6b7280' : '#9ca3af' },
    { v: odds.away, color: ACCENT.pink },
  ]
  return (
    <div className="rounded-lg px-3 py-2" style={{ background: dark ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.035)', border: '1px solid ' + c.line }}>
      <div className="flex items-center justify-between text-[10px] mb-1.5" style={{ color: c.muted }}>
        <span>📊 {t('Probabilidad según', 'Odds from')} <strong style={{ color: c.text }}>{odds.bookmaker}</strong></span>
        <span style={{ color: c.faint }}>{t('referencia · no suma puntos', 'reference · no points')}</span>
      </div>
      <div className="flex h-2.5 rounded-full overflow-hidden mb-1.5" style={{ background: dark ? 'rgba(0,0,0,.35)' : 'rgba(0,0,0,.06)' }}>
        {segs.map((s, i) => (
          <div key={i} style={{ width: `${s.v * 100}%`, background: s.color }} />
        ))}
      </div>
      <div className="flex items-center justify-between text-[11px] font-semibold" style={{ color: c.text }}>
        <span>{homeFlag} {pct(odds.home)}%</span>
        <span style={{ color: c.muted }}>{t('Empate', 'Draw')} {pct(odds.draw)}%</span>
        <span>{pct(odds.away)}% {awayFlag}</span>
      </div>
    </div>
  )
}
