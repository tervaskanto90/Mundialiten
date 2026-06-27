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
    emoji: '🥅',
    accent: '#1FA85C',
    es: { title: '¡Empiezan las eliminatorias!', body: 'Terminó la fase de grupos. Ahora es mata-mata: 16avos → 8vos → cuartos → semis → final. Se abre una etapa por vez, siguiendo al Mundial real. Ya podés predecir los 16avos.' },
    en: { title: 'The knockouts are here!', body: "The group stage is over. Now it's win-or-go-home: Round of 32 → R16 → quarters → semis → final. One stage opens at a time, following the real World Cup. You can predict the Round of 32 now." },
  },
  {
    emoji: '🔮',
    accent: '#7B3FF2',
    es: { title: 'Cómo predecir un cruce', body: 'En Calendario, cada partido ya viene con los equipos que REALMENTE clasificaron. Tocá el partido y cargá el marcador (el de después del alargue) con + / −. Cada partido cierra 5 minutos antes de empezar.' },
    en: { title: 'How to predict a tie', body: 'In Calendar, each match already shows the teams that ACTUALLY qualified. Tap a match and set the score (the one after extra time) with + / −. Each match closes 5 minutes before kick-off.' },
  },
  {
    emoji: '🥊',
    accent: '#2F6DF0',
    es: { title: 'Si empatan, ¿quién pasa?', body: 'Si predecís un empate, elegís quién avanza (gana en el tiempo extra o en los penales). El marcador de la tanda no se predice: sólo quién pasa de fase.' },
    en: { title: 'If it ends level, who goes through?', body: "If you predict a draw, you pick who advances (wins in extra time or on penalties). You don't predict the shoot-out score — only who goes through." },
  },
  {
    emoji: '🎯',
    accent: '#E59A12',
    es: { title: 'Cómo sumás puntos', body: 'Por el marcador (exacto o sólo el resultado) Y, aparte, un bonus por acertar quién pasa. Valen más a medida que avanza: 16avos 4/2 +2 · 8vos 5/2 +2 · 4tos 6/3 +3 · semis 8/4 +4 · final 10/5 +5.' },
    en: { title: 'How you score', body: 'From the score (exact or just the result) AND, separately, a bonus for calling who advances. Worth more as it goes: R32 4/2 +2 · R16 5/2 +2 · QF 6/3 +3 · SF 8/4 +4 · final 10/5 +5.' },
  },
  {
    emoji: '🎟️',
    accent: '#EC1C7D',
    es: { title: 'Errar no te anula', body: 'Aunque falles un cruce, la próxima ronda se arma igual con los ganadores reales: nunca quedás afuera de seguir jugando. Desempate del ranking: 1º exactos, 2º resultados, 3º pases de ronda. El detalle completo está en «¿Cómo jugar?». ¡A predecir!' },
    en: { title: "Missing a tie doesn't sink you", body: "Even if you miss a tie, the next round is still built with the real winners — you're never out. Ranking tie-break: 1st exact scores, 2nd correct results, 3rd correct advances. Full detail in “How to play”. Go predict!" },
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
            {t('Eliminatorias', 'Knockouts')} · {i + 1}/{STEPS.length}
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
