import { useMemo } from 'react'
import { resolve } from '../engine/resolve'
import { TEAM_BY_ID } from '../data/teams'
import { liveMatchIds } from '../utils/live'
import type { MatchResult } from '../types'
import { useT } from '../i18n'

/** Bandera + código de 3 letras (el id ya es el código). */
function TeamMini({ id }: { id?: string }) {
  const team = id ? TEAM_BY_ID[id] : undefined
  return (
    <span className="whitespace-nowrap">
      {team?.flag ?? '🏳️'} {id ?? '???'}
    </span>
  )
}

/**
 * Renglón(es) de "partido en vivo" según los resultados reales. Muestra uno por
 * cada partido en juego (puede haber dos en simultáneo). No renderiza nada si no
 * hay ninguno en vivo.
 */
export function LiveBanner({ realResults }: { realResults: Record<number, MatchResult> }) {
  const { t } = useT()
  const res = useMemo(() => resolve(realResults), [realResults])
  const ids = useMemo(() => liveMatchIds(realResults), [realResults])
  if (ids.length === 0) return null
  return (
    <div className="mb-3 space-y-1.5">
      {ids.map((id) => {
        const m = res.matches[id]
        const r = realResults[id]
        return (
          <div
            key={id}
            className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2 text-sm flex items-center gap-2 flex-wrap"
          >
            <span className="text-rose-300 font-semibold flex items-center gap-1.5">
              <span className="animate-pulse">🔴</span> {t('EN VIVO', 'LIVE')}
            </span>
            <span className="font-medium tabular-nums whitespace-nowrap">
              <TeamMini id={m?.home} />{' '}
              {r?.played ? (
                `${r.homeScore}-${r.awayScore}`
              ) : (
                <span className="text-slate-400">{t('vs', 'vs')}</span>
              )}{' '}
              <TeamMini id={m?.away} />
            </span>
            {!r?.played && (
              <span className="text-[10px] text-slate-400">{t('· marcador en breve', '· score soon')}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
