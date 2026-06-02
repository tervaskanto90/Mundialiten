import { useState } from 'react'
import { getRoster } from '../data/rosters'
import type { EventType, Player } from '../types'
import type { SideLabel } from '../utils/labels'
import { ContextMenu, type MenuItem } from './ContextMenu'

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

export function LineupPanel({ homeId, awayId, home, away, readOnly, onAction }: Props) {
  const [menu, setMenu] = useState<MenuState | null>(null)
  const homeRoster = getRoster(homeId)
  const awayRoster = getRoster(awayId)

  const open = (e: React.MouseEvent, side: 'home' | 'away', player: Player) => {
    if (readOnly) return
    e.preventDefault()
    setMenu({ x: e.clientX, y: e.clientY, side, player })
  }

  // Clic izquierdo: gol directo. (El resto de opciones, por clic derecho.)
  const quickGoal = (e: React.MouseEvent, side: 'home' | 'away', player: Player) => {
    if (readOnly) return
    e.preventDefault()
    onAction(side, player, 'goal')
  }

  const items: MenuItem[] = menu
    ? [
        { icon: '🥅', label: 'Gol de penal', onClick: () => onAction(menu.side, menu.player, 'penalty') },
        { icon: '🔴', label: 'Gol en contra', onClick: () => onAction(menu.side, menu.player, 'own_goal') },
        { icon: '🟨', label: 'Tarjeta amarilla', onClick: () => onAction(menu.side, menu.player, 'yellow') },
        { icon: '🟥', label: 'Tarjeta roja', onClick: () => onAction(menu.side, menu.player, 'red') },
      ]
    : []

  return (
    <div>
      <h4 className="text-sm font-semibold mb-1">Formaciones</h4>
      {!readOnly && (
        <p className="text-[11px] text-slate-500 mb-2">
          <strong>Clic</strong> en un jugador = gol. <strong>Clic derecho</strong> (o mantené
          apretado en el celu) = gol en contra, amarilla o roja.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <TeamColumn side="home" label={home} roster={homeRoster} onPlayer={open} onQuick={quickGoal} />
        <TeamColumn side="away" label={away} roster={awayRoster} onPlayer={open} onQuick={quickGoal} />
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
  onPlayer,
  onQuick,
}: {
  side: 'home' | 'away'
  label: SideLabel
  roster: ReturnType<typeof getRoster>
  onPlayer: (e: React.MouseEvent, side: 'home' | 'away', player: Player) => void
  onQuick: (e: React.MouseEvent, side: 'home' | 'away', player: Player) => void
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span>{label.flag}</span>
        <span className="text-xs font-medium truncate">{label.name}</span>
      </div>
      {!roster || !label.resolved ? (
        <p className="text-[11px] text-slate-600 italic">Equipo por definir</p>
      ) : (
        <div className="space-y-2">
          <PlayerList title="Titulares" players={roster.starters} side={side} onPlayer={onPlayer} onQuick={onQuick} />
          <PlayerList title="Suplentes" players={roster.subs} side={side} onPlayer={onPlayer} onQuick={onQuick} dim />
        </div>
      )}
    </div>
  )
}

function PlayerList({
  title,
  players,
  side,
  onPlayer,
  onQuick,
  dim,
}: {
  title: string
  players: Player[]
  side: 'home' | 'away'
  onPlayer: (e: React.MouseEvent, side: 'home' | 'away', player: Player) => void
  onQuick: (e: React.MouseEvent, side: 'home' | 'away', player: Player) => void
  dim?: boolean
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-0.5">{title}</div>
      <div className="space-y-0.5">
        {players.map((p) => (
          <button
            key={p.id}
            onClick={(e) => onQuick(e, side, p)}
            onContextMenu={(e) => onPlayer(e, side, p)}
            title="Clic = gol · clic derecho = más opciones"
            className={`w-full text-left flex items-center gap-1.5 px-1.5 py-1 rounded-md hover:bg-pitch-500/15 ${
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
