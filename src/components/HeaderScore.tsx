import { MATCHES, MATCH_BY_ID } from '../data/schedule'
import { sideLabelFor } from '../utils/labels'
import { liveMatchIds } from '../utils/live'
import type { ActiveContext } from '../hooks'
import { useT } from '../i18n'
import { useTheme, ACCENT } from '../theme'

/**
 * Marcador del header: los partidos EN VIVO (pueden ser varios simultáneos en la
 * última fecha de grupos) o, si no hay, el último resultado. Bien visible.
 */
export function HeaderScore({ ctx, onSelect, mini = false }: { ctx: ActiveContext; onSelect?: (matchId: number) => void; mini?: boolean }) {
  const { t } = useT()
  const { c, dark } = useTheme()
  const real = ctx.real.results
  const now = Date.now()
  const live = liveMatchIds(real, now)

  let ids: number[]
  const isLive = live.length > 0
  if (isLive) {
    ids = live.slice(0, 3)
  } else {
    // Último horario jugado: puede haber DOS partidos simultáneos (terminaron a
    // la vez) — mostramos toda la tanda, no sólo uno.
    const played = MATCHES.filter((m) => real[m.id]?.played)
    if (played.length) {
      const maxKo = Math.max(...played.map((m) => Date.parse(m.kickoff)))
      ids = played
        .filter((m) => Date.parse(m.kickoff) === maxKo)
        .map((m) => m.id)
        .sort((a, b) => a - b)
        .slice(0, 3)
    } else {
      ids = []
    }
  }
  if (ids.length === 0) return null

  // MINI (mobile, arriba a la derecha): chips chiquitos, uno DEBAJO del otro.
  if (mini) {
    return (
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <span className="text-[8px] font-bold leading-none" style={{ color: isLive ? ACCENT.red : c.faint, letterSpacing: '.3px' }}>
          {isLive ? '● ' + t('EN VIVO', 'LIVE') : t('ÚLTIMO', 'LATEST')}
        </span>
        {ids.map((id) => {
          const m = MATCH_BY_ID[id]
          const r = real[id]
          const home = sideLabelFor(id, m.home, 'home', ctx.resolution)
          const away = sideLabelFor(id, m.away, 'away', ctx.resolution)
          return (
            <button
              key={id}
              onClick={() => onSelect?.(id)}
              title={t('Ver el partido', 'View match')}
              className="flex items-center gap-1 text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-md whitespace-nowrap"
              style={{
                background: dark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.05)',
                border: '1px solid ' + (isLive ? ACCENT.red + '66' : c.line),
                color: c.text,
                cursor: onSelect ? 'pointer' : 'default',
              }}
            >
              <span>{home.flag} {home.short}</span>
              <span style={{ color: isLive ? ACCENT.red : c.text }}>{r?.homeScore ?? 0}-{r?.awayScore ?? 0}</span>
              <span>{away.short} {away.flag}</span>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 min-w-0">
      <span
        className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
        style={isLive ? { color: '#fff', background: ACCENT.red, animation: 'mdlGlow 1.6s ease-in-out infinite' } : { color: c.muted, border: '1px solid ' + c.line }}
      >
        {isLive ? '● ' + t('EN VIVO', 'LIVE') : t('ÚLTIMO', 'LATEST')}
      </span>
      <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
        {ids.map((id) => {
          const m = MATCH_BY_ID[id]
          const r = real[id]
          const home = sideLabelFor(id, m.home, 'home', ctx.resolution)
          const away = sideLabelFor(id, m.away, 'away', ctx.resolution)
          return (
            <button
              key={id}
              onClick={() => onSelect?.(id)}
              title={t('Ver el partido', 'View match')}
              className="flex items-center gap-1.5 text-sm font-bold tabular-nums px-2.5 py-1 rounded-lg shrink-0"
              style={{
                background: dark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.05)',
                border: '1px solid ' + (isLive ? ACCENT.red + '66' : c.line),
                color: c.text,
                cursor: onSelect ? 'pointer' : 'default',
                animation: isLive ? 'mdlLiveCard 1.8s ease-in-out infinite' : undefined,
              }}
            >
              {isLive && (
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: ACCENT.red, display: 'inline-block', flex: 'none', animation: 'mdlLiveDot 1s ease-in-out infinite' }} />
              )}
              <span>{home.flag} {home.short}</span>
              <span style={{ color: isLive ? ACCENT.red : c.text }}>{r?.homeScore ?? 0}-{r?.awayScore ?? 0}</span>
              <span>{away.short} {away.flag}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
