import { useState } from 'react'
import { MATCH_BY_ID, STAGE_I18N } from '../data/schedule'
import { useStore, emptyResult } from '../store/useStore'
import { sideLabelFor, venueName, matchDateLabel, matchTimeLabel } from '../utils/labels'
import type { EventType, Player } from '../types'
import type { ActiveContext } from '../hooks'
import { Modal } from './Modal'
import { LineupPanel } from './LineupPanel'
import { fetchFixtureEvents } from '../engine/liveSync'
import { predictReason } from '../utils/stage'
import { useT } from '../i18n'
import { useTheme, ACCENT } from '../theme'

interface Props {
  matchId: number
  ctx: ActiveContext
  onClose: () => void
}

const EVENT_META: Record<EventType, { icon: string; es: string; en: string }> = {
  goal: { icon: '⚽', es: 'Gol', en: 'Goal' },
  penalty: { icon: '🥅', es: 'Gol de penal', en: 'Penalty goal' },
  own_goal: { icon: '🔴', es: 'Gol en contra', en: 'Own goal' },
  yellow: { icon: '🟨', es: 'Amarilla', en: 'Yellow' },
  red: { icon: '🟥', es: 'Roja', en: 'Red' },
  var: { icon: '📺', es: 'VAR', en: 'VAR' },
}

const GOAL_TYPES: EventType[] = ['goal', 'penalty', 'own_goal']

export function ResultEditor({ matchId, ctx, onClose }: Props) {
  const match = MATCH_BY_ID[matchId]
  const { t, lang } = useT()
  const { c } = useTheme()
  const setResult = useStore((s) => s.setResult)
  const clearResult = useStore((s) => s.clearResult)
  const addEvent = useStore((s) => s.addEvent)
  const removeEvent = useStore((s) => s.removeEvent)
  const setVarCount = useStore((s) => s.setVarCount)
  const liveConfig = useStore((s) => s.liveConfig)
  const fixtureId = useStore((s) => s.liveFixtureIds[matchId])
  const applyLiveEvents = useStore((s) => s.applyLiveEvents)

  const { scenario } = ctx
  const homeId = ctx.resolution.matches[matchId]?.home
  const awayId = ctx.resolution.matches[matchId]?.away
  const [eventsLoading, setEventsLoading] = useState(false)
  const [eventsError, setEventsError] = useState('')

  const fetchRealEvents = async () => {
    if (fixtureId == null || !homeId || !awayId) return
    setEventsLoading(true)
    setEventsError('')
    try {
      const evs = await fetchFixtureEvents(liveConfig, fixtureId, homeId, awayId)
      applyLiveEvents(matchId, evs)
    } catch (e) {
      setEventsError(e instanceof Error ? e.message : 'No se pudo traer los eventos')
    } finally {
      setEventsLoading(false)
    }
  }
  const base = ctx.results[matchId] ?? emptyResult()
  const home = sideLabelFor(matchId, match.home, 'home', ctx.resolution)
  const away = sideLabelFor(matchId, match.away, 'away', ctx.resolution)
  const isKnockout = match.stage !== 'group'
  const isReal = scenario.type === 'real'
  const isWhatif = scenario.type === 'whatif'
  const hasOverride = !!scenario.results[matchId]
  const inherited = isWhatif && !hasOverride
  // Predicciones: se habilitan por etapa y se cierran 5 min antes del partido.
  // (No aplica al what-if, que es sandbox.)
  const reason = scenario.type === 'prediction' ? predictReason(match) : 'open'
  const locked = reason !== 'open'
  const editingDisabled = isReal || locked

  // Para what-if sin sobrescritura, sembramos el override con el resultado
  // heredado antes de modificar, para no perder los datos reales.
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

  // Cantidad de intervenciones del VAR (predecible y rankeable).
  const setVarCountHandler = (n: number) => {
    ensureOverride()
    setVarCount(scenario.id, matchId, Math.max(0, n))
  }

  // Alta de evento desde la formación (clic en un jugador).
  const addPlayerEvent = (side: 'home' | 'away', player: Player, type: EventType) => {
    ensureOverride()
    if (!base.played) setResult(scenario.id, matchId, { played: true })
    addEvent(scenario.id, matchId, { type, team: side, player: player.name })
  }

  const events = base.events
  // Goles a favor de un lado = sus goles/penales + los goles EN CONTRA del rival.
  const goalCount = (side: 'home' | 'away') => {
    const other = side === 'home' ? 'away' : 'home'
    const own = events.filter((e) => e.team === side && (e.type === 'goal' || e.type === 'penalty')).length
    const rivalOwnGoals = events.filter((e) => e.team === other && e.type === 'own_goal').length
    return own + rivalOwnGoals
  }

  return (
    <Modal
      title={`${t('Partido', 'Match')} ${match.id} · ${t(STAGE_I18N[match.stage].es, STAGE_I18N[match.stage].en)}${match.group ? ` ${match.group}` : ''}`}
      onClose={onClose}
      wide
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
              <button
                onClick={() => {
                  clearResult(scenario.id, matchId)
                  onClose()
                }}
                className="px-3 py-2 rounded-lg text-sm"
                style={{ color: ACCENT.gold }}
              >
                ↺ {t('Volver al real', 'Back to real')}
              </button>
            )}
            {!isWhatif && !isReal && !locked && base.played && (
              <button
                onClick={() => {
                  clearResult(scenario.id, matchId)
                  onClose()
                }}
                className="px-3 py-2 rounded-lg text-sm"
                style={{ color: ACCENT.red }}
              >
                🗑 {t('Borrar', 'Clear')}
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: ACCENT.blue, color: '#fff' }}
            >
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
        <div
          className="text-[11px] rounded-lg px-3 py-2 mb-4"
          style={{ color: c.muted, background: ACCENT.red + '1A', border: '1px solid ' + ACCENT.red + '33' }}
        >
          {t(
            '🔴 Los resultados reales son la fuente de verdad y no se editan a mano: se actualizan automáticamente en vivo. Para simular escenarios, cloná esta pestaña como «What-if».',
            '🔴 The real results are the source of truth and are not edited by hand: they update automatically live. To simulate scenarios, clone this tab as “What-if”.',
          )}
        </div>
      )}

      {locked && (
        <div
          className="text-[11px] rounded-lg px-3 py-2 mb-4"
          style={{ color: c.text, background: ACCENT.gold + '1A', border: '1px solid ' + ACCENT.gold + '4D' }}
        >
          {reason === 'future'
            ? t(
                `🔒 Las predicciones de ${STAGE_I18N[match.stage].es} se abren cuando empiece esa fase.`,
                `🔒 Predictions for the ${STAGE_I18N[match.stage].en} open when that stage begins.`,
              )
            : reason === 'past'
              ? t(
                  `🔒 Las predicciones de ${STAGE_I18N[match.stage].es} ya cerraron.`,
                  `🔒 Predictions for the ${STAGE_I18N[match.stage].en} are closed.`,
                )
              : t(
                  '🔒 Ya no se aceptan predicciones para este partido (cerró 5 minutos antes del inicio).',
                  '🔒 Predictions for this match are closed (they closed 5 minutes before kick-off).',
                )}
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
          <button
            onClick={() => patch({ played: true })}
            className="text-xs hover:underline"
            style={{ color: ACCENT.blue }}
          >
            {t('Marcar como jugado (0-0)', 'Mark as played (0-0)')}
          </button>
        </div>
      )}

      {/* Penales en eliminatorias empatadas */}
      {isKnockout && base.played && base.homeScore === base.awayScore && (
        <div className="rounded-xl p-3 mb-4" style={{ background: c.surface, border: '1px solid ' + c.line }}>
          <div className="text-xs mb-2" style={{ color: c.muted }}>{t('Definición por penales', 'Penalty shoot-out')}</div>
          <div className="flex items-center justify-center gap-2">
            {editingDisabled ? (
              <span className="text-lg font-bold tabular-nums" style={{ color: c.text }}>
                {base.homePens ?? 0} - {base.awayPens ?? 0}
              </span>
            ) : (
              <>
                <Stepper value={base.homePens ?? 0} onChange={(v) => patch({ homePens: Math.max(0, v) })} small />
                <span className="text-sm" style={{ color: c.muted }}>{t('penales', 'penalties')}</span>
                <Stepper value={base.awayPens ?? 0} onChange={(v) => patch({ awayPens: Math.max(0, v) })} small />
              </>
            )}
          </div>
        </div>
      )}

      {/* Coherencia goles vs marcador */}
      {base.played &&
        (goalCount('home') !== base.homeScore || goalCount('away') !== base.awayScore) &&
        events.some((e) => GOAL_TYPES.includes(e.type)) && (
          <div className="text-[11px] rounded-lg px-3 py-1.5 mb-3" style={{ color: ACCENT.gold, background: ACCENT.gold + '1A' }}>
            {t(
              `Ojo: los goleadores cargados (${goalCount('home')}-${goalCount('away')}) no coinciden con el marcador (${base.homeScore}-${base.awayScore}).`,
              `Heads up: the scorers entered (${goalCount('home')}-${goalCount('away')}) don't match the score (${base.homeScore}-${base.awayScore}).`,
            )}
          </div>
        )}

      {/* Eventos */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold" style={{ color: c.text }}>{t('Eventos', 'Events')}</h4>
          {isReal && liveConfig.provider === 'apifootball' && fixtureId != null && (
            <button
              onClick={fetchRealEvents}
              disabled={eventsLoading}
              className="text-xs font-medium disabled:opacity-50 px-2.5 py-1 rounded-lg"
              style={{ background: ACCENT.blue, color: '#fff' }}
            >
              {eventsLoading ? t('Trayendo…', 'Fetching…') : t('↻ Traer goles/tarjetas en vivo', '↻ Fetch goals/cards live')}
            </button>
          )}
        </div>
        {eventsError && <p className="text-[11px] mb-2" style={{ color: ACCENT.red }}>{eventsError}</p>}
        {events.length === 0 && !isReal && (
          <p className="text-xs mb-2" style={{ color: c.muted }}>
            {t(
              'Sin eventos. Cargá goles y tarjetas tocando jugadores en Formaciones; el VAR se agrega abajo.',
              'No events. Add goals and cards by tapping players in Line-ups; VAR is added below.',
            )}
          </p>
        )}
        {events.length === 0 && isReal && (
          <p className="text-xs mb-2" style={{ color: c.muted }}>
            {t('Sin eventos cargados.', 'No events loaded.')}{' '}
            {fixtureId != null
              ? t('Usá el botón para traerlos en vivo.', 'Use the button to fetch them live.')
              : t('Se cargarán al sincronizar el partido.', 'They will load when the match is synced.')}
          </p>
        )}
        <div className="space-y-1.5">
          {events.map((e) => {
            const side = e.team === 'home' ? home : away
            const meta = EVENT_META[e.type]
            const metaLabel = t(meta.es, meta.en)
            return (
              <div
                key={e.id}
                className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm"
                style={{ background: c.surface, border: '1px solid ' + c.line, color: c.text }}
              >
                <span>{meta.icon}</span>
                <span style={{ color: c.muted }}>{side.flag}</span>
                <span className="flex-1 truncate">
                  {e.type === 'var' ? (
                    <span style={{ color: c.text }}>{e.note || t('Revisión VAR', 'VAR review')}</span>
                  ) : (
                    <span>{e.player || metaLabel}</span>
                  )}
                  {e.minute != null && <span style={{ color: c.muted }}> {e.minute}'</span>}
                </span>
                <span className="text-[10px]" style={{ color: c.muted }}>{metaLabel}</span>
                {!editingDisabled && (
                  <button
                    onClick={() => {
                      ensureOverride()
                      removeEvent(scenario.id, matchId, e.id)
                    }}
                    style={{ color: c.muted }}
                    onMouseEnter={(ev) => (ev.currentTarget.style.color = ACCENT.red)}
                    onMouseLeave={(ev) => (ev.currentTarget.style.color = c.muted)}
                  >
                    ✕
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* VAR: cantidad de intervenciones en el partido (pronosticable, no rankeable) */}
      <div className="rounded-xl p-3" style={{ background: c.surface, border: '1px solid ' + c.line }}>
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-medium flex items-center gap-1.5" style={{ color: c.text }}>
            📺 {t('¿Cuántas veces intervino el VAR en este partido?', 'How many times did VAR intervene in this match?')}
          </div>
          {editingDisabled ? (
            <span className="text-lg font-bold tabular-nums" style={{ color: c.text }}>{base.varCount ?? 0}</span>
          ) : (
            <Stepper value={base.varCount ?? 0} onChange={setVarCountHandler} small />
          )}
        </div>
        <p className="text-[10px] mt-1.5" style={{ color: c.muted }}>
          {isReal
            ? t('El proveedor en vivo no trae este dato.', 'The live provider does not bring this data.')
            : t('Se puede pronosticar, pero el VAR no cuenta para el ranking.', 'It can be predicted, but VAR does not count for the ranking.')}
        </p>
      </div>

      {/* Formaciones: titulares y suplentes de ambos equipos */}
      <div className="mt-4 pt-4" style={{ borderTop: '1px solid ' + c.line }}>
        <LineupPanel
          homeId={ctx.resolution.matches[matchId]?.home}
          awayId={ctx.resolution.matches[matchId]?.away}
          home={home}
          away={away}
          readOnly={editingDisabled}
          onAction={addPlayerEvent}
        />
      </div>
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

function Stepper({
  value,
  onChange,
  small,
}: {
  value: number
  onChange: (v: number) => void
  small?: boolean
}) {
  const { c, dark } = useTheme()
  const stepStyle = {
    border: '1px solid ' + c.line,
    color: c.text,
    background: dark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.04)',
  }
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(value - 1)}
        className="w-7 h-7 rounded-lg text-lg leading-none"
        style={stepStyle}
      >
        −
      </button>
      <span
        className={`tabular-nums text-center ${small ? 'w-6 text-lg' : 'w-8 text-2xl'} font-bold`}
        style={{ color: c.text }}
      >
        {value}
      </span>
      <button
        onClick={() => onChange(value + 1)}
        className="w-7 h-7 rounded-lg text-lg leading-none"
        style={stepStyle}
      >
        +
      </button>
    </div>
  )
}
