import { useMemo } from 'react'
import { resolve } from '../engine/resolve'
import { TEAM_BY_ID } from '../data/teams'
import { liveMatchIds } from '../utils/live'
import type { MatchResult } from '../types'
import { useT } from '../i18n'
import { useTheme, ACCENT } from '../theme'

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
export function LiveBanner({ realResults, embedded = false }: { realResults: Record<number, MatchResult>; embedded?: boolean }) {
  const { t } = useT()
  const { c, dark } = useTheme()
  const res = useMemo(() => resolve(realResults), [realResults])
  const ids = useMemo(() => liveMatchIds(realResults), [realResults])
  if (ids.length === 0) return null
  return (
    <div className={embedded ? 'space-y-1.5' : 'mb-3 space-y-1.5'}>
      {ids.map((id) => {
        const m = res.matches[id]
        const r = realResults[id]
        return (
          <div
            key={id}
            className={embedded ? 'rounded-xl px-2.5 py-1.5 text-[13px] flex items-center gap-2 flex-wrap' : 'rounded-xl px-3 py-2 text-sm flex items-center gap-2 flex-wrap'}
            style={{
              background: dark ? 'linear-gradient(150deg, rgba(60,20,12,.7), rgba(25,19,9,.9))' : 'linear-gradient(150deg,#FFF4EC,#FFFDF6)',
              border: '1px solid rgba(229,50,43,.32)',
              boxShadow: '0 12px 30px -18px rgba(229,50,43,.5)',
              color: c.text,
            }}
          >
            <span className="font-semibold flex items-center gap-1.5" style={{ color: ACCENT.red, fontFamily: "'Archivo'" }}>
              <span style={{ display: 'inline-block', animation: 'mdlLivePulse 1.2s ease-in-out infinite' }}>🔴</span>{' '}
              {t('EN VIVO', 'LIVE')}
            </span>
            <span className="font-medium tabular-nums whitespace-nowrap" style={{ fontFamily: "'Archivo'", fontWeight: 800 }}>
              <TeamMini id={m?.home} />{' '}
              {r?.played ? `${r.homeScore}-${r.awayScore}` : <span style={{ color: c.muted }}>{t('vs', 'vs')}</span>}{' '}
              <TeamMini id={m?.away} />
            </span>
            {!r?.played && (
              <span className="text-[10px]" style={{ color: c.muted }}>
                {t('· marcador en breve', '· score soon')}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
