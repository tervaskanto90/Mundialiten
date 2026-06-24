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
export function HeaderScore({ ctx }: { ctx: ActiveContext }) {
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
    const played = MATCHES.filter((m) => real[m.id]?.played).sort((a, b) => Date.parse(b.kickoff) - Date.parse(a.kickoff))
    ids = played.length ? [played[0].id] : []
  }
  if (ids.length === 0) return null

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
            <span
              key={id}
              className="flex items-center gap-1.5 text-sm font-bold tabular-nums px-2.5 py-1 rounded-lg shrink-0"
              style={{
                background: dark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.05)',
                border: '1px solid ' + (isLive ? ACCENT.red + '66' : c.line),
                color: c.text,
                animation: isLive ? 'mdlLiveCard 1.8s ease-in-out infinite' : undefined,
              }}
            >
              {isLive && (
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: ACCENT.red, display: 'inline-block', flex: 'none', animation: 'mdlLiveDot 1s ease-in-out infinite' }} />
              )}
              <span>{home.flag} {home.short}</span>
              <span style={{ color: isLive ? ACCENT.red : c.text }}>{r?.homeScore ?? 0}-{r?.awayScore ?? 0}</span>
              <span>{away.short} {away.flag}</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}
