import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '../i18n'
import { useTheme, ACCENT } from '../theme'

// ─────────────────────────────────────────────────────────────────────────────
// Tutorial de eliminatorias: pasos con EJEMPLOS visuales animados (cómo predecir,
// quién pasa, los escenarios de puntos con casos concretos, y el desempate).
// Aparece la primera vez en esta versión (lo controla App con un flag en
// localStorage) y se puede reabrir desde el menú. Se puede omitir.
// ─────────────────────────────────────────────────────────────────────────────

type StepKey = 'stages' | 'predict' | 'advance' | 'points' | 'example' | 'safe'

interface Step {
  key: StepKey
  emoji: string
  accent: string
  es: { title: string; body: string }
  en: { title: string; body: string }
}

const STEPS: Step[] = [
  {
    key: 'stages',
    emoji: '🥅',
    accent: ACCENT.green,
    es: { title: '¡Empiezan las eliminatorias!', body: 'Se predice UNA fase por vez, siguiendo al Mundial: cada etapa se abre cuando llega. Cada fase arranca de cero —cruces nuevos con los equipos reales— pero tus PUNTOS se acumulan toda la copa, no se reinician. Ya podés predecir los 16avos.' },
    en: { title: 'The knockouts are here!', body: "You predict ONE stage at a time, following the cup: each stage opens when it arrives. Every stage starts fresh —new ties with the real teams— but your POINTS carry over the whole tournament, they don't reset. You can predict the Round of 32 now." },
  },
  {
    key: 'predict',
    emoji: '🔮',
    accent: ACCENT.purple,
    es: { title: 'Cómo predecir un cruce', body: 'Cada partido ya viene con los equipos que REALMENTE clasificaron. Tocá el partido y cargá el marcador (después del alargue) con + / −. Cierra 5 min antes de empezar.' },
    en: { title: 'How to predict a tie', body: 'Each match already shows the teams that ACTUALLY qualified. Tap it and set the score (after extra time) with + / −. It closes 5 min before kick-off.' },
  },
  {
    key: 'advance',
    emoji: '🥊',
    accent: ACCENT.blue,
    es: { title: 'Si empatan, ¿quién pasa?', body: 'Si predecís un empate, elegís quién avanza (gana en el tiempo extra o en los penales). El marcador de la tanda NO se predice: sólo quién pasa.' },
    en: { title: 'If it ends level, who goes through?', body: "If you predict a draw, you pick who advances (extra time or penalties). You don't predict the shoot-out score — only who goes through." },
  },
  {
    key: 'points',
    emoji: '🎯',
    accent: ACCENT.gold,
    es: { title: 'Cómo sumás puntos (ejemplos)', body: 'Por el marcador: exacto (máximo), sólo el resultado (parcial) o errado (0). Suben por fase. Ejemplos en CUARTOS (6 / 3):' },
    en: { title: 'How you score (examples)', body: 'For the score: exact (max), just the result (partial) or wrong (0). They grow per stage. Examples in the QUARTERS (6 / 3):' },
  },
  {
    key: 'example',
    emoji: '🎟️',
    accent: ACCENT.red,
    es: { title: 'El bonus de "quién pasa"', body: 'Aparte del marcador, sumás un bonus por acertar quién avanza — y se cuentan POR SEPARADO. Mirá este caso de cuartos:' },
    en: { title: 'The "who advances" bonus', body: 'On top of the score, a bonus for calling who advances — counted SEPARATELY. Look at this quarter-final case:' },
  },
  {
    key: 'safe',
    emoji: '🏆',
    accent: '#EC1C7D',
    es: { title: 'Errar no te anula', body: 'Aunque falles un cruce, la próxima ronda se arma con los ganadores reales: nunca quedás afuera. Desempate del ranking, en orden:' },
    en: { title: "Missing a tie doesn't sink you", body: "Even if you miss a tie, the next round uses the real winners — you're never out. Ranking tie-break, in order:" },
  },
]

// ── Piezas reutilizables ──
function Chip({ children, color, delay = 0, anim = 'mdlPop' }: { children: React.ReactNode; color: string; delay?: number; anim?: string }) {
  const { c } = useTheme()
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums shrink-0"
      style={{ background: color + '1A', border: '1px solid ' + color + '55', color: c.text, animation: `${anim} .5s ${delay}s both` }}
    >
      {children}
    </span>
  )
}

function MiniBtn({ children }: { children: React.ReactNode }) {
  const { c, dark } = useTheme()
  return (
    <span
      className="inline-flex items-center justify-center font-bold"
      style={{ width: 22, height: 22, borderRadius: 8, fontSize: 14, color: c.muted, background: dark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.05)', border: '1px solid ' + c.line }}
    >
      {children}
    </span>
  )
}

// Visual (ejemplo animado) por paso.
function StepVisual({ k, accent }: { k: StepKey; accent: string }) {
  const { c, dark } = useTheme()
  const { t } = useT()
  const card: React.CSSProperties = { background: c.cardGrad, border: '1px solid ' + c.line, borderRadius: 14, boxShadow: c.shadow }

  if (k === 'stages') {
    const labels = ['16avos', '8vos', '4tos', t('Semis', 'Semis'), 'Final']
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center justify-center gap-1 flex-wrap px-2">
          {labels.map((l, i) => (
            <span key={l} className="inline-flex items-center gap-1">
              <span
                className="rounded-full px-2 py-1 text-[11px] font-bold"
                style={{ background: accent + '1A', border: '1px solid ' + accent + '55', color: c.text, animation: `mdlPop .42s ${i * 0.13}s both` }}
              >
                {l}
              </span>
              {i < labels.length - 1 && <span style={{ color: c.faint, animation: `mdlFadeIn .4s ${i * 0.13 + 0.1}s both` }}>›</span>}
            </span>
          ))}
          <span style={{ fontSize: 22, animation: 'mdlPop .55s .7s both' }}>🏆</span>
        </div>
        <span className="text-[11px] text-center" style={{ color: c.muted, animation: 'mdlFadeIn .5s .85s both' }}>
          🔒 {t('una fase por vez', 'one stage at a time')} · 🏆 {t('los puntos se acumulan', 'points carry over')}
        </span>
      </div>
    )
  }

  if (k === 'predict') {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-2.5" style={card}>
          <span style={{ fontSize: 18 }}>🇦🇷</span>
          <span className="text-xs font-bold" style={{ color: c.text }}>ARG</span>
          <div className="flex items-center gap-1 mx-1">
            <span style={{ animation: 'mdlGlow 1.4s ease-in-out infinite' }}><MiniBtn>−</MiniBtn></span>
            <span className="text-lg font-extrabold tabular-nums" style={{ fontFamily: "'Archivo'", color: c.text, width: 16, textAlign: 'center', display: 'inline-block', animation: 'mdlTutCount .5s .15s both' }}>2</span>
            <span style={{ animation: 'mdlGlow 1.4s ease-in-out infinite' }}><MiniBtn>+</MiniBtn></span>
          </div>
          <span style={{ color: c.faint }}>-</span>
          <div className="flex items-center gap-1 mx-1">
            <MiniBtn>−</MiniBtn>
            <span className="text-lg font-extrabold tabular-nums" style={{ fontFamily: "'Archivo'", color: c.text, width: 16, textAlign: 'center', display: 'inline-block', animation: 'mdlTutCount .5s .3s both' }}>1</span>
            <MiniBtn>+</MiniBtn>
          </div>
          <span className="text-xs font-bold" style={{ color: c.text }}>MEX</span>
          <span style={{ fontSize: 18 }}>🇲🇽</span>
        </div>
        <span className="text-[11px]" style={{ color: c.muted, animation: 'mdlFadeIn .5s .5s both' }}>👆 {t('tocá + / − para cargar tu marcador', 'tap + / − to set your score')}</span>
      </div>
    )
  }

  if (k === 'advance') {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-2" style={card}>
          <span style={{ fontSize: 16 }}>🇦🇷</span>
          <span className="text-xs font-bold" style={{ color: c.text }}>ARG</span>
          <span className="text-base font-extrabold tabular-nums mx-1" style={{ fontFamily: "'Archivo'", color: c.text }}>1 - 1</span>
          <span className="text-xs font-bold" style={{ color: c.text }}>MEX</span>
          <span style={{ fontSize: 16 }}>🇲🇽</span>
        </div>
        <span className="text-[11px] font-semibold" style={{ color: c.muted }}>🥅 {t('¿Quién pasa?', 'Who advances?')}</span>
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold"
            style={{ background: ACCENT.green + '22', border: '1px solid ' + ACCENT.green, color: c.text, animation: 'mdlTutWin 1.6s .3s ease-out infinite' }}
          >
            🇦🇷 ARG <span style={{ color: ACCENT.green, animation: 'mdlPop .5s .35s both', display: 'inline-block' }}>✓</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold" style={{ border: '1px solid ' + c.line, color: c.muted }}>
            🇲🇽 MEX
          </span>
        </div>
      </div>
    )
  }

  if (k === 'points') {
    const rows: Array<{ icon: string; col: string; es: string; en: string; pts: string }> = [
      { icon: '🎯', col: ACCENT.green, es: 'Predijiste 2-1 · salió 2-1', en: 'You said 2-1 · it ended 2-1', pts: '+6' },
      { icon: '✅', col: ACCENT.blue, es: 'Predijiste 2-0 · salió 3-1', en: 'You said 2-0 · it ended 3-1', pts: '+3' },
      { icon: '✖️', col: '#9b8d6e', es: 'Predijiste 0-0 · salió 2-1', en: 'You said 0-0 · it ended 2-1', pts: '0' },
    ]
    return (
      <div className="flex flex-col gap-1.5 w-full max-w-[300px] mx-auto">
        {rows.map((r, i) => (
          <div
            key={r.icon}
            className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
            style={{ background: r.col + '14', border: '1px solid ' + r.col + '44', animation: `mdlRight .45s ${i * 0.15}s both` }}
          >
            <span>{r.icon}</span>
            <span className="text-[11px] flex-1 tabular-nums" style={{ color: c.text }}>{t(r.es, r.en)}</span>
            <span className="text-sm font-extrabold tabular-nums" style={{ fontFamily: "'Archivo'", color: r.col }}>{r.pts}</span>
          </div>
        ))}
      </div>
    )
  }

  if (k === 'example') {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="text-[11px] text-center" style={{ color: c.muted, animation: 'mdlUp .4s both' }}>
          {t('Cuartos · predecís ', 'QF · you predict ')}
          <strong style={{ color: c.text }}>1-1</strong>
          {t(' y que pasa 🇦🇷. Sale ', ' with 🇦🇷 advancing. It ends ')}
          <strong style={{ color: c.text }}>🇦🇷 2-1</strong>.
        </div>
        <div className="flex items-center gap-1.5 flex-wrap justify-center">
          <Chip color={ACCENT.red} delay={0.2}>
            {t('Marcador', 'Score')} <span style={{ color: ACCENT.red }}>0</span>
          </Chip>
          <span className="font-extrabold" style={{ color: c.muted, animation: 'mdlFadeIn .4s .35s both' }}>+</span>
          <Chip color={ACCENT.green} delay={0.4}>
            {t('Quién pasa', 'Advances')} <span style={{ color: ACCENT.green }}>+3</span>
          </Chip>
          <span className="font-extrabold" style={{ color: c.muted, animation: 'mdlFadeIn .4s .55s both' }}>=</span>
          <span
            className="rounded-full px-3 py-1 text-sm font-extrabold tabular-nums"
            style={{ fontFamily: "'Archivo'", background: dark ? 'rgba(255,194,26,.16)' : 'rgba(255,194,26,.18)', border: '1px solid rgba(255,194,26,.5)', color: c.text, animation: 'mdlPop .5s .7s both' }}
          >
            3 {t('pts', 'pts')}
          </span>
        </div>
        <span className="text-[10px] text-center" style={{ color: c.faint, animation: 'mdlFadeIn .5s .9s both' }}>
          {t('Fallaste el marcador pero igual cobrás el bonus por acertar quién pasa.', 'You missed the score but still get the bonus for calling who advances.')}
        </span>
      </div>
    )
  }

  // safe
  const tb = [
    { i: '🎯', es: 'exactos', en: 'exact', col: ACCENT.green },
    { i: '✅', es: 'resultados', en: 'results', col: ACCENT.blue },
    { i: '🎟️', es: 'pases', en: 'advances', col: ACCENT.gold },
  ]
  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className="flex items-center gap-1.5 text-[11px]" style={{ animation: 'mdlUp .4s both' }}>
        <span className="rounded px-2 py-1" style={{ background: c.cardGrad, border: '1px solid ' + c.line, color: c.muted }}>{t('Errás un cruce', 'You miss a tie')}</span>
        <span style={{ color: c.faint }}>→</span>
        <span className="rounded px-2 py-1 font-bold" style={{ background: ACCENT.green + '1A', border: '1px solid ' + ACCENT.green + '55', color: c.text }}>{t('la próxima usa el ganador real', 'next round uses the real winner')}</span>
      </div>
      <div className="flex items-center gap-1.5">
        {tb.map((x, i) => (
          <span key={x.i} className="inline-flex items-center gap-1">
            <span className="rounded-full px-2 py-1 text-[11px] font-bold" style={{ background: x.col + '1A', border: '1px solid ' + x.col + '55', color: c.text, animation: `mdlPop .4s ${0.3 + i * 0.15}s both` }}>
              {x.i} {t(x.es, x.en)}
            </span>
            {i < tb.length - 1 && <span style={{ color: c.faint, fontSize: 11 }}>›</span>}
          </span>
        ))}
      </div>
    </div>
  )
}

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
        className="flex flex-col"
        style={{
          width: '100%',
          maxWidth: 420,
          maxHeight: '92dvh',
          borderRadius: 22,
          overflow: 'hidden',
          background: dark ? 'linear-gradient(165deg,#241B0E,#191309)' : 'linear-gradient(165deg,#FFFDF6,#F6EEDA)',
          border: '1px solid ' + c.line,
          boxShadow: '0 30px 80px -20px rgba(0,0,0,.65)',
          animation: 'mdlModalIn .28s cubic-bezier(.34,1.56,.64,1) both',
        }}
      >
        {/* Barra superior con el color del paso + Omitir */}
        <div style={{ height: 5, background: `linear-gradient(90deg, ${step.accent}, ${step.accent}88)`, flex: 'none' }} />
        <div className="flex items-center justify-between px-4 pt-3" style={{ flex: 'none' }}>
          <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: c.muted }}>
            {t('Eliminatorias', 'Knockouts')} · {i + 1}/{STEPS.length}
          </span>
          <button onClick={onClose} className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ color: c.muted }}>
            {t('Omitir', 'Skip')} ✕
          </button>
        </div>

        {/* Contenido del paso (scrollea si hace falta) */}
        <div key={i} className="px-6 pb-1 pt-3 text-center overflow-y-auto" style={{ animation: 'mdlUp .26s ease both' }}>
          <div
            className="mx-auto mb-3 flex items-center justify-center"
            style={{ width: 72, height: 72, borderRadius: 22, fontSize: 38, background: step.accent + '1A', border: '1px solid ' + step.accent + '44', animation: 'mdlPop .45s both' }}
          >
            {step.emoji}
          </div>
          <h2 className="font-extrabold mb-1.5" style={{ fontFamily: "'Archivo'", fontSize: 21, color: c.text }}>
            {txt.title}
          </h2>
          <p className="text-sm leading-relaxed mb-3" style={{ color: c.muted }}>
            {txt.body}
          </p>
          <StepVisual k={step.key} accent={step.accent} />
        </div>

        {/* Puntos de progreso */}
        <div className="flex items-center justify-center gap-1.5 pt-3 pb-2" style={{ flex: 'none' }}>
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
        <div className="flex items-center gap-2 px-4 pb-4" style={{ flex: 'none' }}>
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
            {last ? t('¡A predecir! 🎉', 'Go predict! 🎉') : t('Siguiente ›', 'Next ›')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
