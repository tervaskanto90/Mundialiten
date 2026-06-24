import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '../i18n'
import { useTheme } from '../theme'

// ─────────────────────────────────────────────────────────────────────────────
// Tutorial de bienvenida: 5 pasos con las novedades de la app. Aparece SOLO la
// primera vez que el usuario entra a esta versión (lo controla App con un flag
// en localStorage). Se puede omitir en cualquier momento.
// ─────────────────────────────────────────────────────────────────────────────

interface Step {
  emoji: string
  es: { title: string; body: string }
  en: { title: string; body: string }
  accent: string
}

const STEPS: Step[] = [
  {
    emoji: '🏠',
    accent: '#2F6DF0',
    es: { title: 'Tu nuevo Inicio', body: 'Un tablero con todo de un vistazo: noticias del Mundial, el pronóstico de las casas de apuestas, el ranking y tus estadísticas.' },
    en: { title: 'Your new Home', body: 'A dashboard with everything at a glance: World Cup news, bookmaker odds, the ranking and your stats.' },
  },
  {
    emoji: '🗓️',
    accent: '#7B3FF2',
    es: { title: 'Fixture y Tablas', body: 'Calendario, tablas y llaves en un solo lugar. Con el toggle de arriba cambiás entre Resultados reales, tu Predicción y What-if. Los clasificados se marcan en verde y los eliminados en rojo.' },
    en: { title: 'Fixtures & Tables', body: 'Calendar, tables and bracket in one place. The top toggle switches between real Results, your Prediction and What-if. Qualified teams turn green, eliminated ones red.' },
  },
  {
    emoji: '🥅',
    accent: '#1FA85C',
    es: { title: 'Se juega por etapas', body: 'Predecís una etapa por vez, siguiendo al Mundial, y el ranking acumula puntos toda la copa. Nuevo: en eliminatorias, además del marcador, sumás puntos por acertar quién pasa de fase.' },
    en: { title: 'Play stage by stage', body: 'You predict one stage at a time, following the tournament, and the ranking adds up points all the way. New: in the knockouts, on top of the score you earn points for calling who advances.' },
  },
  {
    emoji: '📊',
    accent: '#E59A12',
    es: { title: 'Estadísticas', body: 'Mirá tu rendimiento con gráficos, compará tus puntos contra el resto y descubrí qué predijo cada uno en los partidos ya jugados.' },
    en: { title: 'Stats', body: 'See your performance in charts, compare your points against everyone and discover what each person predicted in the matches already played.' },
  },
  {
    emoji: '🏆',
    accent: '#EC1C7D',
    es: { title: 'Ranking y menú', body: 'Ranking renovado, con fotos de perfil y desempates claros. En el celular, deslizá el dedo hacia la derecha para abrir el menú. ¡Listo, a jugar!' },
    en: { title: 'Ranking & menu', body: 'A revamped ranking with profile photos and clear tie-breakers. On your phone, swipe right to open the menu. That’s it — enjoy!' },
  },
]

export function Tutorial({ onClose }: { onClose: () => void }) {
  const { t, lang } = useT()
  const { c, dark } = useTheme()
  const [i, setI] = useState(0)
  const step = STEPS[i]
  const txt = lang === 'en' ? step.en : step.es
  const first = i === 0
  const last = i === STEPS.length - 1

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ height: '100dvh', background: 'rgba(16,12,6,.62)', animation: 'mdlFadeIn .2s ease both' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 22,
          overflow: 'hidden',
          background: dark ? 'linear-gradient(165deg,#241B0E,#191309)' : 'linear-gradient(165deg,#FFFDF6,#F6EEDA)',
          border: '1px solid ' + c.line,
          boxShadow: '0 30px 80px -20px rgba(0,0,0,.65)',
          animation: 'mdlModalIn .28s cubic-bezier(.34,1.56,.64,1) both',
        }}
      >
        {/* Barra superior con el color del paso + Omitir */}
        <div style={{ height: 5, background: `linear-gradient(90deg, ${step.accent}, ${step.accent}88)` }} />
        <div className="flex items-center justify-between px-4 pt-3">
          <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: c.muted }}>
            {t('Novedades', "What's new")} · {i + 1}/{STEPS.length}
          </span>
          <button onClick={onClose} className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ color: c.muted }}>
            {t('Omitir', 'Skip')} ✕
          </button>
        </div>

        {/* Contenido del paso */}
        <div key={i} className="px-6 pb-2 pt-3 text-center" style={{ animation: 'mdlUp .26s ease both' }}>
          <div
            className="mx-auto mb-3 flex items-center justify-center"
            style={{ width: 84, height: 84, borderRadius: 24, fontSize: 44, background: step.accent + '1A', border: '1px solid ' + step.accent + '44' }}
          >
            {step.emoji}
          </div>
          <h2 className="font-extrabold mb-2" style={{ fontFamily: "'Archivo'", fontSize: 22, color: c.text }}>
            {txt.title}
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: c.muted }}>
            {txt.body}
          </p>
        </div>

        {/* Puntos de progreso */}
        <div className="flex items-center justify-center gap-1.5 py-4">
          {STEPS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setI(idx)}
              aria-label={`${idx + 1}`}
              style={{
                width: idx === i ? 22 : 8,
                height: 8,
                borderRadius: 99,
                background: idx === i ? step.accent : dark ? 'rgba(255,255,255,.18)' : 'rgba(0,0,0,.15)',
                transition: 'all .2s ease',
              }}
            />
          ))}
        </div>

        {/* Navegación */}
        <div className="flex items-center gap-2 px-4 pb-4">
          {!first && (
            <button
              onClick={() => setI((v) => Math.max(0, v - 1))}
              className="px-4 py-2.5 rounded-xl text-sm font-bold"
              style={{ color: c.text, border: '1px solid ' + c.line, background: dark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.035)' }}
            >
              ‹ {t('Atrás', 'Back')}
            </button>
          )}
          <button
            onClick={() => (last ? onClose() : setI((v) => Math.min(STEPS.length - 1, v + 1)))}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: step.accent, boxShadow: '0 10px 24px -10px ' + step.accent }}
          >
            {last ? t('¡Empezar a jugar! 🎉', 'Start playing! 🎉') : t('Siguiente ›', 'Next ›')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
