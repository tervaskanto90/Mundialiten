import { useRef, useState } from 'react'
import { getRoster } from '../data/rosters'
import type { EventType, Player } from '../types'
import type { SideLabel } from '../utils/labels'
import { ContextMenu, type MenuItem } from './ContextMenu'
import { useT } from '../i18n'

interface Props {
  homeId?: string
  awayId?: string
  home: SideLabel
  away: SideLabel
  readOnly: boolean
  // side = equipo del jugador; type = evento a registrar
  onAction: (side: 'home' | 'away', player: Player, type: EventType) => void
}

interface MenuState {
  x: number
  y: number
  side: 'home' | 'away'
  player: Player
}

// Handlers que enlazan a cada jugador: clic = gol, clic derecho / mantener
// apretado = menú con el resto de opciones.
type PlayerBinder = (
  side: 'home' | 'away',
  player: Player,
) => {
  onClick: (e: React.MouseEvent) => void
  onContextMenu: (e: React.MouseEvent) => void
  onTouchStart: (e: React.TouchEvent) => void
  onTouchMove: (e: React.TouchEvent) => void
  onTouchEnd: () => void
}

const LONG_PRESS_MS = 450

export function LineupPanel({ homeId, awayId, home, away, readOnly, onAction }: Props) {
  const [menu, setMenu] = useState<MenuState | null>(null)
  const { t } = useT()
  const homeRoster = getRoster(homeId)
  const awayRoster = getRoster(awayId)

  // Estado del gesto táctil (long-press).
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const suppressClick = useRef(false) // evita que el toque tras un long-press cargue un gol

  const openMenu = (x: number, y: number, side: 'home' | 'away', player: Player) => {
    if (readOnly) return
    setMenu({ x, y, side, player })
  }

  const bind: PlayerBinder = (side, player) => ({
    onClick: (e) => {
      e.preventDefault()
      if (readOnly) return
      if (suppressClick.current) {
        suppressClick.current = false
        return
      }
      onAction(side, player, 'goal')
    },
    onContextMenu: (e) => {
      if (readOnly) return
      e.preventDefault()
      openMenu(e.clientX, e.clientY, side, player)
    },
    onTouchStart: (e) => {
      if (readOnly) return
      const t0 = e.touches[0]
      startPos.current = { x: t0.clientX, y: t0.clientY }
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        suppressClick.current = true
        openMenu(t0.clientX, t0.clientY, side, player)
      }, LONG_PRESS_MS)
    },
    onTouchMove: (e) => {
      const t0 = e.touches[0]
      if (
        Math.abs(t0.clientX - startPos.current.x) > 10 ||
        Math.abs(t0.clientY - startPos.current.y) > 10
      ) {
        if (timer.current) clearTimeout(timer.current)
      }
    },
    onTouchEnd: () => {
      if (timer.current) clearTimeout(timer.current)
    },
  })

  const items: MenuItem[] = menu
    ? [
        { icon: '🥅', label: t('Gol de penal', 'Penalty goal'), onClick: () => onAction(menu.side, menu.player, 'penalty') },
        { icon: '🔴', label: t('Gol en contra', 'Own goal'), onClick: () => onAction(menu.side, menu.player, 'own_goal') },
        { icon: '🟨', label: t('Tarjeta amarilla', 'Yellow card'), onClick: () => onAction(menu.side, menu.player, 'yellow') },
        { icon: '🟥', label: t('Tarjeta roja', 'Red card'), onClick: () => onAction(menu.side, menu.player, 'red') },
      ]
    : []

  return (
    <div>
      <h4 className="text-sm font-semibold mb-1">{t('Formaciones', 'Line-ups')}</h4>
      {!readOnly && (
        <p className="text-[11px] text-slate-500 mb-2">
          {t(
            'Tocá un jugador = gol. Mantené apretado (o clic derecho en la compu) = gol de penal, gol en contra, amarilla o roja.',
            'Tap a player = goal. Long-press (or right-click on desktop) = penalty goal, own goal, yellow or red card.',
          )}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <TeamColumn side="home" label={home} roster={homeRoster} bind={bind} />
        <TeamColumn side="away" label={away} roster={awayRoster} bind={bind} />
      </div>

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={items}
          onClose={() => setMenu(null)}
          title={`${menu.player.number ? `#${menu.player.number} ` : ''}${menu.player.name}`}
        />
      )}
    </div>
  )
}

function TeamColumn({
  side,
  label,
  roster,
  bind,
}: {
  side: 'home' | 'away'
  label: SideLabel
  roster: ReturnType<typeof getRoster>
  bind: PlayerBinder
}) {
  const { t } = useT()
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span>{label.flag}</span>
        <span className="text-xs font-medium truncate">{label.name}</span>
      </div>
      {!roster || !label.resolved ? (
        <p className="text-[11px] text-slate-600 italic">{t('Equipo por definir', 'Team to be decided')}</p>
      ) : (
        <div className="space-y-2">
          <PlayerList title={t('Titulares', 'Starters')} players={roster.starters} side={side} bind={bind} />
          <PlayerList title={t('Suplentes', 'Substitutes')} players={roster.subs} side={side} bind={bind} dim />
        </div>
      )}
    </div>
  )
}

function PlayerList({
  title,
  players,
  side,
  bind,
  dim,
}: {
  title: string
  players: Player[]
  side: 'home' | 'away'
  bind: PlayerBinder
  dim?: boolean
}) {
  const { t } = useT()
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-0.5">{title}</div>
      <div className="space-y-0.5">
        {players.map((p) => (
          <button
            key={p.id}
            {...bind(side, p)}
            title={t('Tocá = gol · mantené apretado / clic derecho = más opciones', 'Tap = goal · long-press / right-click = more options')}
            className={`w-full text-left flex items-center gap-1.5 px-1.5 py-1 rounded-md hover:bg-pitch-500/15 select-none ${
              dim ? 'opacity-70' : ''
            }`}
          >
            <span className="text-[10px] text-slate-500 w-5 tabular-nums">{p.number}</span>
            <span className="text-xs truncate">{p.name}</span>
            <span className="text-[9px] text-slate-600 ml-auto">{p.position}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
