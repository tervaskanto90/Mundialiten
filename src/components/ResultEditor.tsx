import { useState } from 'react'
import { MATCH_BY_ID, STAGE_LABELS } from '../data/schedule'
import { useStore, emptyResult } from '../store/useStore'
import { sideLabelFor, venueName, formatDate } from '../utils/labels'
import type { EventType, Player } from '../types'
import type { ActiveContext } from '../hooks'
import { Modal } from './Modal'
import { LineupPanel } from './LineupPanel'
import { fetchFixtureEvents } from '../engine/liveSync'
import { isPredictionLocked } from '../utils/lock'

interface Props {
  matchId: number
  ctx: ActiveContext
  onClose: () => void
}

const EVENT_META: Record<EventType, { icon: string; label: string }> = {
  goal: { icon: '⚽', label: 'Gol' },
  penalty: { icon: '🥅', label: 'Gol de penal' },
  own_goal: { icon: '🔴', label: 'Gol en contra' },
  yellow: { icon: '🟨', label: 'Amarilla' },
  red: { icon: '🟥', label: 'Roja' },
  var: { icon: '📺', label: 'VAR' },
}

const GOAL_TYPES: EventType[] = ['goal', 'penalty', 'own_goal']

export function ResultEditor({ matchId, ctx, onClose }: Props) {
  const match = MATCH_BY_ID[matchId]
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
  // Las predicciones se cierran 5 min antes del partido (no aplica a what-if).
  const locked = scenario.type === 'prediction' && isPredictionLocked(match)
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
      title={`Partido ${match.id} · ${STAGE_LABELS[match.stage]}${match.group ? ` ${match.group}` : ''}`}
      onClose={onClose}
      wide
      footer={
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-slate-500">
            En «{scenario.name}»
            {inherited && ' · heredando del real'}
            {isReal && ' · 🔴 sólo lectura (en vivo)'}
            {locked && ' · 🔒 cerrado'}
          </div>
          <div className="flex gap-2">
            {isWhatif && hasOverride && (
              <button
                onClick={() => {
                  clearResult(scenario.id, matchId)
                  onClose()
                }}
                className="px-3 py-2 rounded-lg text-sm text-amber-300 hover:bg-amber-500/10"
              >
                ↺ Volver al real
              </button>
            )}
            {!isWhatif && !isReal && !locked && base.played && (
              <button
                onClick={() => {
                  clearResult(scenario.id, matchId)
                  onClose()
                }}
                className="px-3 py-2 rounded-lg text-sm text-rose-300 hover:bg-rose-500/10"
              >
                🗑 Borrar
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-pitch-500 hover:bg-pitch-600 text-white"
            >
              Listo
            </button>
          </div>
        </div>
      }
    >
      <div className="text-xs text-slate-500 mb-4 capitalize">
        {formatDate(match.date)} · {match.time} · 📍 {venueName(match.venueId)}
      </div>

      {isReal && (
        <div className="text-[11px] text-slate-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2 mb-4">
          🔴 Los resultados reales son la fuente de verdad y no se editan a mano: se actualizan
          automáticamente en vivo. Para simular escenarios, cloná esta pestaña como «What-if».
        </div>
      )}

      {locked && (
        <div className="text-[11px] text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 mb-4">
          🔒 Ya no se aceptan predicciones para este partido (cerró 5 minutos antes del inicio). Si no
          lo predijiste a tiempo, no cuenta para el ranking.
        </div>
      )}

      {/* Marcador */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 mb-4">
        <ScoreSide flag={home.flag} name={home.name} />
        {editingDisabled ? (
          <div className="text-3xl font-bold tabular-nums px-2">
            {base.played ? `${base.homeScore} - ${base.awayScore}` : 'vs'}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Stepper value={base.played ? base.homeScore : 0} onChange={(v) => setScore('home', v)} />
            <span className="text-slate-500">-</span>
            <Stepper value={base.played ? base.awayScore : 0} onChange={(v) => setScore('away', v)} />
          </div>
        )}
        <ScoreSide flag={away.flag} name={away.name} right />
      </div>

      {!base.played && !editingDisabled && (
        <div className="text-center -mt-2 mb-3">
          <button
            onClick={() => patch({ played: true })}
            className="text-xs text-pitch-500 hover:underline"
          >
            Marcar como jugado (0-0)
          </button>
        </div>
      )}

      {/* Penales en eliminatorias empatadas */}
      {isKnockout && base.played && base.homeScore === base.awayScore && (
        <div className="bg-slate-800/60 rounded-xl p-3 mb-4">
          <div className="text-xs text-slate-400 mb-2">Definición por penales</div>
          <div className="flex items-center justify-center gap-2">
            {editingDisabled ? (
              <span className="text-lg font-bold tabular-nums">
                {base.homePens ?? 0} - {base.awayPens ?? 0}
              </span>
            ) : (
              <>
                <Stepper value={base.homePens ?? 0} onChange={(v) => patch({ homePens: Math.max(0, v) })} small />
                <span className="text-slate-500 text-sm">penales</span>
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
          <div className="text-[11px] text-amber-400/90 bg-amber-500/10 rounded-lg px-3 py-1.5 mb-3">
            Ojo: los goleadores cargados ({goalCount('home')}-{goalCount('away')}) no coinciden con el
            marcador ({base.homeScore}-{base.awayScore}).
          </div>
        )}

      {/* Eventos */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold">Eventos</h4>
          {isReal && liveConfig.provider === 'apifootball' && fixtureId != null && (
            <button
              onClick={fetchRealEvents}
              disabled={eventsLoading}
              className="text-xs font-medium bg-pitch-500 hover:bg-pitch-600 disabled:opacity-50 text-white px-2.5 py-1 rounded-lg"
            >
              {eventsLoading ? 'Trayendo…' : '↻ Traer goles/tarjetas en vivo'}
            </button>
          )}
        </div>
        {eventsError && <p className="text-[11px] text-rose-400 mb-2">{eventsError}</p>}
        {events.length === 0 && !isReal && (
          <p className="text-xs text-slate-500 mb-2">
            Sin eventos. Cargá goles y tarjetas tocando jugadores en Formaciones; el VAR se agrega abajo.
          </p>
        )}
        {events.length === 0 && isReal && (
          <p className="text-xs text-slate-500 mb-2">
            Sin eventos cargados. {fixtureId != null ? 'Usá el botón para traerlos en vivo.' : 'Se cargarán al sincronizar el partido.'}
          </p>
        )}
        <div className="space-y-1.5">
          {events.map((e) => {
            const side = e.team === 'home' ? home : away
            const meta = EVENT_META[e.type]
            return (
              <div
                key={e.id}
                className="flex items-center gap-2 bg-slate-800/60 rounded-lg px-2.5 py-1.5 text-sm"
              >
                <span>{meta.icon}</span>
                <span className="text-slate-400">{side.flag}</span>
                <span className="flex-1 truncate">
                  {e.type === 'var' ? (
                    <span className="text-slate-300">{e.note || 'Revisión VAR'}</span>
                  ) : (
                    <span>{e.player || meta.label}</span>
                  )}
                  {e.minute != null && <span className="text-slate-500"> {e.minute}'</span>}
                </span>
                <span className="text-[10px] text-slate-500">{meta.label}</span>
                {!editingDisabled && (
                  <button
                    onClick={() => {
                      ensureOverride()
                      removeEvent(scenario.id, matchId, e.id)
                    }}
                    className="text-slate-500 hover:text-rose-400"
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
      <div className="bg-slate-800/40 rounded-xl p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-medium flex items-center gap-1.5">
            📺 ¿Cuántas veces intervino el VAR en este partido?
          </div>
          {editingDisabled ? (
            <span className="text-lg font-bold tabular-nums">{base.varCount ?? 0}</span>
          ) : (
            <Stepper value={base.varCount ?? 0} onChange={setVarCountHandler} small />
          )}
        </div>
        <p className="text-[10px] text-slate-500 mt-1.5">
          {isReal
            ? 'El proveedor en vivo no trae este dato.'
            : 'Se puede pronosticar, pero el VAR no cuenta para el ranking.'}
        </p>
      </div>

      {/* Formaciones: titulares y suplentes de ambos equipos */}
      <div className="mt-4 pt-4 border-t border-white/10">
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
  return (
    <div className={`flex items-center gap-2 min-w-0 ${right ? 'flex-row-reverse text-right' : ''}`}>
      <span className="text-2xl shrink-0">{flag}</span>
      <span className="text-sm font-medium truncate">{name}</span>
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
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(value - 1)}
        className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 text-lg leading-none"
      >
        −
      </button>
      <span className={`tabular-nums text-center ${small ? 'w-6 text-lg' : 'w-8 text-2xl'} font-bold`}>
        {value}
      </span>
      <button
        onClick={() => onChange(value + 1)}
        className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 text-lg leading-none"
      >
        +
      </button>
    </div>
  )
}
