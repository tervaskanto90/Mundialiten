import { useState } from 'react'
import { Modal } from './Modal'
import { useT } from '../i18n'
import { useTheme } from '../theme'

export function HowToPlay() {
  const { t, lang } = useT()
  const { c, dark } = useTheme()
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontFamily: "'Noto Sans'",
          fontSize: '12px',
          fontWeight: 800,
          color: dark ? '#FFCF45' : '#B07D08',
          background: dark ? 'rgba(255,194,26,.12)' : 'rgba(255,194,26,.18)',
          border: '1px solid ' + (dark ? 'rgba(255,194,26,.3)' : 'rgba(176,125,8,.3)'),
          padding: '8px 13px',
          borderRadius: '11px',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ fontSize: '13px' }}>💡</span> {t('¿Cómo jugar?', 'How to play?')}
      </button>
      {open && (
        <Modal title={t('¿Cómo jugar?', 'How to play?')} onClose={() => setOpen(false)} wide>
          <div className="space-y-4 text-sm leading-relaxed" style={{ color: c.muted }}>
            {lang === 'en' ? <GuideEN /> : <GuideES />}
          </div>
        </Modal>
      )}
    </>
  )
}

function H({ children }: { children: React.ReactNode }) {
  const { c } = useTheme()
  return (
    <h3 className="font-bold mt-4" style={{ fontFamily: "'Archivo'", color: c.text }}>
      {children}
    </h3>
  )
}

// Tabla de puntos por fase (exacto / sólo resultado). Misma data en ambos idiomas.
const POINTS_ROWS: Array<[string, string, string]> = [
  ['ES_GRUPOS|Group stage', '3', '1'],
  ['ES_16|Round of 32', '4', '2'],
  ['ES_8|Round of 16', '5', '2'],
  ['ES_4|Quarter-finals', '6', '3'],
  ['ES_SEMI|Semi-finals', '8', '4'],
  ['ES_FINAL|Final & 3rd place', '10', '5'],
]
const POINTS_LABEL_ES: Record<string, string> = {
  ES_GRUPOS: 'Fase de grupos', ES_16: '16avos de final', ES_8: '8vos de final',
  ES_4: 'Cuartos', ES_SEMI: 'Semifinales', ES_FINAL: 'Final y 3er puesto',
}

function PointsTable({ lang }: { lang: 'es' | 'en' }) {
  const { c, dark } = useTheme()
  const headBg = dark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.04)'
  return (
    <div className="rounded-lg overflow-hidden text-xs mt-1" style={{ border: '1px solid ' + c.line }}>
      <div className="grid grid-cols-3 font-semibold" style={{ background: headBg, color: c.text }}>
        <span className="px-2 py-1.5">{lang === 'es' ? 'Fase' : 'Stage'}</span>
        <span className="px-2 py-1.5 text-center">{lang === 'es' ? 'Exacto' : 'Exact'}</span>
        <span className="px-2 py-1.5 text-center">{lang === 'es' ? 'Sólo resultado' : 'Result only'}</span>
      </div>
      {POINTS_ROWS.map(([key, exact, tend]) => {
        const [esKey, en] = key.split('|')
        return (
          <div key={key} className="grid grid-cols-3" style={{ borderTop: '1px solid ' + c.line, color: c.muted }}>
            <span className="px-2 py-1.5">{lang === 'es' ? POINTS_LABEL_ES[esKey] : en}</span>
            <span className="px-2 py-1.5 text-center font-semibold" style={{ color: '#1FA85C' }}>{exact}</span>
            <span className="px-2 py-1.5 text-center font-semibold" style={{ color: '#E59A12' }}>{tend}</span>
          </div>
        )
      })}
    </div>
  )
}

// Ejemplo trabajado de una eliminatoria, para dejar bien claro que el MARCADOR y
// el bonus de QUIÉN PASA se cobran por SEPARADO (podés fallar uno y cobrar el otro).
function KnockoutExample({ lang }: { lang: 'es' | 'en' }) {
  const { c, dark } = useTheme()
  const box: React.CSSProperties = {
    background: dark ? 'rgba(31,168,92,.10)' : 'rgba(31,168,92,.08)',
    border: '1px solid rgba(31,168,92,.32)',
    borderRadius: 12,
  }
  if (lang === 'en') {
    return (
      <div className="p-3 mt-2 text-xs space-y-2" style={box}>
        <p className="font-bold" style={{ color: c.text }}>📐 Worked example (Quarter-final)</p>
        <p><strong style={{ color: c.text }}>You're in a quarter-final (QF)</strong>. You predict <strong style={{ color: c.text }}>1-1 and that A goes through</strong> (you picked A to win on penalties). The match ends <strong style={{ color: c.text }}>A 2-1</strong>.</p>
        <ul className="list-disc pl-4 space-y-1">
          <li><strong style={{ color: c.text }}>Score:</strong> you predicted a draw but A won → it's neither exact nor the right result → <strong style={{ color: '#E5322B' }}>0 points</strong> from the score.</li>
          <li><strong style={{ color: c.text }}>Who advances:</strong> you said A and A advanced → <strong style={{ color: '#1FA85C' }}>+3</strong> (the QF bonus).</li>
          <li><strong style={{ color: c.text }}>Total: 3 points</strong> (out of 9 possible in the QF: 6 for an exact score + 3 for the bonus).</li>
        </ul>
        <p>
          The key: the <strong style={{ color: c.text }}>score</strong> and the <strong style={{ color: c.text }}>“who advances” bonus are counted separately</strong>. You can miss the score and still earn the bonus for calling who goes through — and the other way around (nail the score but pick the wrong penalty winner → you keep the score points but lose the +3).
        </p>
      </div>
    )
  }
  return (
    <div className="p-3 mt-2 text-xs space-y-2" style={box}>
      <p className="font-bold" style={{ color: c.text }}>📐 Ejemplo detallado (Cuartos de final)</p>
      <p><strong style={{ color: c.text }}>Estás en cuartos de final</strong> (4tos). Predecís <strong style={{ color: c.text }}>1-1 y que pasa A</strong> (elegiste a A como ganador de los penales). El partido termina <strong style={{ color: c.text }}>A 2-1</strong>.</p>
      <ul className="list-disc pl-4 space-y-1">
        <li><strong style={{ color: c.text }}>Marcador:</strong> pronosticaste empate pero ganó A → no es exacto ni acertaste el resultado → <strong style={{ color: '#E5322B' }}>0 puntos</strong> de marcador.</li>
        <li><strong style={{ color: c.text }}>Quién pasa:</strong> dijiste que avanzaba A y avanzó A → <strong style={{ color: '#1FA85C' }}>+3</strong> (el bonus de cuartos).</li>
        <li><strong style={{ color: c.text }}>Total: 3 puntos</strong> (de 9 posibles en cuartos: 6 del marcador exacto + 3 del bonus).</li>
      </ul>
      <p>
        La clave: el <strong style={{ color: c.text }}>marcador</strong> y el <strong style={{ color: c.text }}>bonus de “quién pasa” se cuentan por separado</strong>. Podés fallar el marcador y aun así cobrar el bonus por acertar quién avanza — y al revés (clavás el marcador pero elegís mal al ganador de los penales → te quedás con los puntos del marcador pero perdés el +3).
      </p>
    </div>
  )
}

// Tabla resumen de cómo se predice y puntúa cada ronda de eliminatoria.
const STAGE_ROWS: Array<{ es: [string, string]; en: [string, string]; sc: string; bonus: string }> = [
  { es: ['16avos', '1° y 2° de cada grupo + los 8 mejores 3° · 16 partidos'], en: ['Round of 32', 'Top 2 of each group + the 8 best 3rd-placed · 16 matches'], sc: '4 / 2', bonus: '+2' },
  { es: ['8vos', 'Los 16 ganadores de 16avos · 8 partidos'], en: ['Round of 16', 'The 16 R32 winners · 8 matches'], sc: '5 / 2', bonus: '+2' },
  { es: ['4tos', 'Los 8 ganadores de 8vos · 4 partidos'], en: ['Quarter-finals', 'The 8 R16 winners · 4 matches'], sc: '6 / 3', bonus: '+3' },
  { es: ['Semifinales', 'Los 4 ganadores de 4tos · 2 partidos'], en: ['Semi-finals', 'The 4 QF winners · 2 matches'], sc: '8 / 4', bonus: '+4' },
  { es: ['Final', 'Los 2 ganadores de semis · 1 partido'], en: ['Final', 'The 2 semi winners · 1 match'], sc: '10 / 5', bonus: '+5' },
  { es: ['3er puesto', 'Los 2 perdedores de semis · 1 partido'], en: ['Third place', 'The 2 semi losers · 1 match'], sc: '10 / 5', bonus: '+5' },
]

function KnockoutStages({ lang }: { lang: 'es' | 'en' }) {
  const { c, dark } = useTheme()
  const headBg = dark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.04)'
  const head = lang === 'es' ? ['Etapa', 'Quiénes juegan', 'Exacto/Result.', 'Bonus'] : ['Stage', 'Who plays', 'Exact/Result', 'Bonus']
  return (
    <div className="rounded-lg overflow-hidden text-[11px] mt-1" style={{ border: '1px solid ' + c.line }}>
      <div className="grid font-semibold" style={{ gridTemplateColumns: '1.1fr 2.6fr 1fr .7fr', background: headBg, color: c.text }}>
        {head.map((h, i) => (
          <span key={i} className={`px-2 py-1.5 ${i >= 2 ? 'text-center' : ''}`}>{h}</span>
        ))}
      </div>
      {STAGE_ROWS.map((r) => {
        const [name, who] = lang === 'es' ? r.es : r.en
        return (
          <div key={name} className="grid" style={{ gridTemplateColumns: '1.1fr 2.6fr 1fr .7fr', borderTop: '1px solid ' + c.line, color: c.muted }}>
            <span className="px-2 py-1.5 font-semibold" style={{ color: c.text }}>{name}</span>
            <span className="px-2 py-1.5">{who}</span>
            <span className="px-2 py-1.5 text-center font-semibold" style={{ color: '#1FA85C' }}>{r.sc}</span>
            <span className="px-2 py-1.5 text-center font-semibold" style={{ color: '#E59A12' }}>{r.bonus}</span>
          </div>
        )
      })}
    </div>
  )
}

function GuideES() {
  return (
    <>
      <p>
        <strong>Mundialiten</strong> es un prode del Mundial 2026: pronosticás los partidos y competís
        por el ranking con tu familia y amigos. Esta guía se lee en ~5 minutos 👇
      </p>

      <H>🔑 Tu cuenta</H>
      <p>
        Entrás con <strong>email y contraseña</strong> y elegís un nombre para el ranking. Tu
        predicción es <strong>privada</strong> y vale para <strong>todos tus dispositivos</strong>:
        si entrás con la misma cuenta desde la compu y el celu, es la misma predicción. En el ranking
        los demás sólo ven tu nombre y tus puntos.
      </p>

      <H>🗂️ Las tres pestañas de arriba</H>
      <ul className="list-disc pl-5 space-y-1">
        <li>🔴 <strong>Resultados reales</strong>: lo que pasa de verdad. <strong>No se edita a mano</strong>: se actualiza solo, en vivo. Es la fuente con la que se comparan tus aciertos.</li>
        <li>🔮 <strong>Predicción</strong>: tu pronóstico. Tenés <strong>una por cuenta</strong> y es la única que <strong>cuenta para el ranking</strong>.</li>
        <li>🧪 <strong>What-if</strong>: un "¿qué pasaría si…?" para fantasear. Parte de lo real y lo cambiás libremente. <strong>No cuenta</strong> para el ranking ni tiene límite de etapas.</li>
      </ul>

      <H>📅 Se juega por etapas (lo más importante)</H>
      <p>
        Esta es la regla grande que cambió. Ya <strong>no se completa todo el cuadro de una</strong>:
        predecís <strong>una etapa por vez</strong>, acompañando al Mundial real:
      </p>
      <p className="text-center text-xs rounded-lg py-2" style={{ background: 'rgba(127,127,127,.12)', color: 'inherit', fontWeight: 600 }}>
        Grupos → 16avos → 8vos → Cuartos → Semis → (Final + 3er puesto)
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Sólo está abierta <strong>la etapa en curso</strong>; las demás se van abriendo solas a medida que avanza el torneo.</li>
        <li><strong>Antes de que empiece el Mundial</strong> (ahora) sólo se predice la <strong>fase de grupos</strong>.</li>
        <li>Podés <strong>sumarte en cualquier instancia</strong>, aunque no hayas predicho las etapas anteriores.</li>
        <li>Cada eliminatoria se arma con los <strong>equipos que realmente clasificaron</strong> (ver "Llaves"): aunque hayas errado una ronda, en la siguiente predecís los <strong>cruces reales</strong>, no equipos fantasma.</li>
      </ul>
      <p>
        Arriba en <strong>Calendario</strong> siempre ves un cartel con la <strong>etapa abierta</strong>.
      </p>

      <H>⏱️ Cada partido cierra 5 minutos antes</H>
      <p>
        Aunque la etapa esté abierta, <strong>cada partido se cierra 5 minutos antes</strong> de su
        inicio (para que nadie pronostique con el partido ya empezado). Esto vale para
        <strong> todas las etapas</strong>. Después de eso, ese partido queda sólo de lectura.
      </p>

      <H>⚽ Cómo cargar tu predicción</H>
      <ul className="list-disc pl-5 space-y-1">
        <li>En <strong>Calendario</strong>, tocá un partido y poné el <strong>marcador</strong> con los botones + / −.</li>
        <li>Para <strong>goleadores</strong>, abrí <strong>Formaciones</strong> y <strong>tocá un jugador</strong>: suma un gol (y se actualiza el marcador solo).</li>
        <li><strong>Mantené apretado</strong> el jugador (celular) o <strong>clic derecho</strong> (compu) para elegir <strong>gol de penal, gol en contra, amarilla o roja</strong>.</li>
        <li>También podés pronosticar <strong>cuántas veces interviene el VAR</strong> en el partido.</li>
        <li>Arriba podés cambiar entre <strong>🗓️ Calendario</strong> (partidos por fecha) y <strong>🗂️ Grupos</strong> (ordenados por grupo, como los prodes de siempre).</li>
      </ul>

      <H>📊 Tablas y 🏆 Llaves (automáticas)</H>
      <p>
        Las <strong>tablas de los grupos</strong> se calculan solas con los resultados que cargás. El
        <strong> cuadro de eliminatorias</strong> también: cada ronda se rellena con los
        <strong> equipos reales clasificados</strong>, así nunca predecís contra equipos que ya
        quedaron afuera.
      </p>

      <H>🎯 Cómo se puntúa</H>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong className="text-emerald-400">Marcador exacto</strong> (ej: predijiste 2-1 y salió 2-1): puntaje máximo.</li>
        <li><strong className="text-amber-400">Sólo el resultado</strong> (acertás quién ganó/empató, pero no el marcador): puntaje parcial.</li>
        <li>Errar el resultado: <strong>0</strong>.</li>
      </ul>
      <p>
        Los puntos <strong>valen más a medida que avanza el torneo</strong>, así la definición se
        mantiene emocionante:
      </p>
      <PointsTable lang="es" />

      <H>🥅 Eliminatorias: quién pasa</H>
      <p>
        En el mata-mata, además del marcador, sumás un <strong>bonus por acertar qué equipo avanza</strong> de
        fase (en la final y el 3er puesto, quién gana). Se <strong>suma</strong> al marcador:
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>16avos y 8vos:</strong> +2 · <strong>4tos:</strong> +3 · <strong>Semis:</strong> +4 · <strong>Final y 3°:</strong> +5.</li>
        <li>El marcador que cargás es el de <strong>después del alargue</strong>. Si predecís <strong>empate</strong>, elegís <strong>quién gana los penales</strong> — y ese es el equipo que pasa.</li>
        <li><strong>No se predice el marcador de la tanda</strong> de penales (es pura suerte): sólo quién avanza.</li>
      </ul>
      <p>
        <strong>Importante:</strong> el <strong>marcador</strong> y el <strong>bonus de quién pasa</strong> son
        <strong> dos cosas independientes</strong> y se suman por separado. Acertar quién avanza
        <strong> no exige</strong> acertar el marcador.
      </p>
      <KnockoutExample lang="es" />

      <H>🥊 Cómo se predice cada ronda (en detalle)</H>
      <p>
        Las eliminatorias se predicen <strong>una etapa por vez</strong>, en orden:
        <strong> 16avos → 8vos → cuartos → semifinales → (final + 3er puesto)</strong>. Cada etapa se
        <strong> abre</strong> cuando el Mundial real llega a esa instancia.
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          Cada ronda ya viene <strong>armada con los equipos REALES</strong>: los 16avos, con los que
          clasificaron de los grupos (1°, 2° y los 8 mejores 3°); las rondas siguientes, con los
          <strong> ganadores REALES</strong> de la ronda anterior. Aunque hayas errado un cruce,
          <strong> en la próxima ronda predecís los partidos verdaderos</strong> (no equipos fantasma) y
          nunca te quedás afuera de seguir jugando.
        </li>
        <li>
          En cada partido cargás el <strong>marcador</strong> (el de <strong>después del alargue</strong>).
          Si te queda <strong>empate</strong>, elegís <strong>quién avanza</strong> (gana en el tiempo
          extra o en los penales).
        </li>
        <li>
          Sumás por el <strong>marcador</strong> (exacto o sólo resultado) y, <strong>aparte</strong>, un
          <strong> bonus por acertar quién pasa</strong>. Los dos se cuentan por separado.
        </li>
        <li>
          La <strong>semifinal es su propia etapa</strong>: predecís las 2 semis y, cuando se juegan, se
          abren la <strong>final</strong> (con los ganadores reales de las semis) y el
          <strong> 3er puesto</strong> (con los perdedores). Así, errar una semi
          <strong> no te impide</strong> predecir la final ni el tercer puesto.
        </li>
      </ul>
      <KnockoutStages lang="es" />
      <p className="text-slate-400 text-xs">
        Marcador = puntos por exacto / sólo resultado. Bonus = se suma por acertar quién avanza (en la
        final y el 3er puesto, quién gana). En 16avos el máximo de un partido es 4+2 = <strong>6</strong>;
        en la final, 10+5 = <strong>15</strong>.
      </p>

      <H>⚖️ Desempate del ranking (en orden)</H>
      <p>
        Si dos personas terminan con los <strong>mismos puntos</strong>, se ordenan por estos criterios,
        uno tras otro:
      </p>
      <ol className="list-decimal pl-5 space-y-1">
        <li><strong style={{ color: '#1FA85C' }}>🎯 Más marcadores exactos</strong> (acertaste el resultado tal cual, ej. 2-1 = 2-1).</li>
        <li><strong style={{ color: '#2F6DF0' }}>✅ Más resultados acertados</strong> (acertaste quién ganó/empató/perdió, aunque no el marcador).</li>
        <li><strong style={{ color: '#E59A12' }}>🎟️ Más pases de ronda acertados</strong> — en eliminatorias, cuántas veces le pegaste a <strong>qué equipo avanza</strong> (en una victoria, el ganador; en un empate, el que elegiste por penales). Es un <strong>parámetro aparte</strong> del marcador.</li>
      </ol>
      <p>Si después de los tres siguen iguales, <strong>comparten el mismo puesto</strong>.</p>

      <p>
        El <strong>ranking se ordena por los puntos acumulados</strong> durante todo el Mundial (no por
        porcentaje). Por eso conviene jugar todas las etapas que puedas: quien participa más, tiene más
        chances de sumar. Los puntos que ganaste <strong>se mantienen de principio a fin</strong>.
      </p>
      <p className="text-slate-400 text-xs">
        Nota: goleadores, tarjetas y VAR se pueden pronosticar por diversión, pero <strong>no suman al
        ranking</strong> (el ranking cuenta sólo el resultado de los partidos).
      </p>

      <H>🏅 Ranking y 🎯 Precisión</H>
      <p>
        En <strong>Precisión</strong> ves tus puntos con el desglose de aciertos. En
        <strong> Ranking</strong> ves a toda la plataforma ordenada por <strong>puntos</strong>.
      </p>

      <H>💡 Preguntas rápidas</H>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Entré tarde, ¿pierdo?</strong> No: sumás desde la etapa en la que entrás. No estás obligado a haber jugado las anteriores.</li>
        <li><strong>¿Puedo cambiar un pronóstico?</strong> Sí, hasta 5 minutos antes de ese partido.</li>
        <li><strong>¿Y si una eliminatoria se define por penales?</strong> Cuenta el resultado tras los penales, igual que en la realidad.</li>
        <li><strong>🌐 Idioma:</strong> con la banderita de arriba a la derecha cambiás entre español e inglés.</li>
      </ul>
      <p>¡A ganar la copa de la familia! 🏆</p>
    </>
  )
}

function GuideEN() {
  return (
    <>
      <p>
        <strong>Mundialiten</strong> is a World Cup 2026 prediction game: forecast the matches and
        compete on the ranking with family and friends. This guide takes ~5 minutes 👇
      </p>

      <H>🔑 Your account</H>
      <p>
        You sign in with <strong>email and password</strong> and pick a name for the ranking. Your
        prediction is <strong>private</strong> and works across <strong>all your devices</strong>: if
        you log in with the same account on your laptop and phone, it's the same prediction. On the
        ranking, others only see your name and your points.
      </p>

      <H>🗂️ The three tabs at the top</H>
      <ul className="list-disc pl-5 space-y-1">
        <li>🔴 <strong>Real results</strong>: what's actually happening. <strong>Not edited by hand</strong> — it updates live. It's the source your predictions are compared against.</li>
        <li>🔮 <strong>Prediction</strong>: your forecast. You get <strong>one per account</strong>, and it's the only one that <strong>counts for the ranking</strong>.</li>
        <li>🧪 <strong>What-if</strong>: a "what would happen if…" sandbox. It starts from the real results and you change it freely. It <strong>doesn't count</strong> for the ranking and has no stage limit.</li>
      </ul>

      <H>📅 You play stage by stage (the key rule)</H>
      <p>
        This is the big change. You <strong>no longer fill in the whole bracket at once</strong>: you
        predict <strong>one stage at a time</strong>, following the real tournament:
      </p>
      <p className="text-center text-xs rounded-lg py-2" style={{ background: 'rgba(127,127,127,.12)', color: 'inherit', fontWeight: 600 }}>
        Groups → Round of 32 → Round of 16 → Quarter-finals → Semis → (Final + 3rd place)
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Only the <strong>current stage</strong> is open; the rest open automatically as the tournament progresses.</li>
        <li><strong>Before the World Cup starts</strong> (right now), only the <strong>group stage</strong> is open.</li>
        <li>You can <strong>join at any stage</strong>, even if you didn't predict the earlier ones.</li>
        <li>Each knockout round is built from the <strong>teams that actually qualified</strong> (see "Bracket"): even if you missed a round, the next one shows the <strong>real ties</strong>, not phantom teams.</li>
      </ul>
      <p>
        The <strong>open stage</strong> is always shown in a banner at the top of <strong>Calendar</strong>.
      </p>

      <H>⏱️ Each match locks 5 minutes before</H>
      <p>
        Even while a stage is open, <strong>each match closes 5 minutes before</strong> kick-off (so no
        one predicts once the match has started). This applies to <strong>every stage</strong>. After
        that, the match becomes read-only.
      </p>

      <H>⚽ How to make your prediction</H>
      <ul className="list-disc pl-5 space-y-1">
        <li>In <strong>Calendar</strong>, tap a match and set the <strong>score</strong> with the + / − buttons.</li>
        <li>For <strong>scorers</strong>, open <strong>Line-ups</strong> and <strong>tap a player</strong>: it adds a goal (and updates the score automatically).</li>
        <li><strong>Long-press</strong> the player (phone) or <strong>right-click</strong> (computer) to pick <strong>penalty goal, own goal, yellow or red card</strong>.</li>
        <li>You can also predict <strong>how many times VAR intervenes</strong> in the match.</li>
        <li>At the top you can switch between <strong>🗓️ Calendar</strong> (matches by date) and <strong>🗂️ Groups</strong> (organized by group, like classic pools).</li>
      </ul>

      <H>📊 Standings and 🏆 Bracket (automatic)</H>
      <p>
        The <strong>group standings</strong> are computed automatically from the results you enter. So
        is the <strong>knockout bracket</strong>: each round is filled with the
        <strong> real qualified teams</strong>, so you never predict against teams that are already out.
      </p>

      <H>🎯 How scoring works</H>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong className="text-emerald-400">Exact score</strong> (e.g. you predicted 2-1 and it ended 2-1): maximum points.</li>
        <li><strong className="text-amber-400">Just the result</strong> (you got who won/drew, but not the score): partial points.</li>
        <li>Wrong result: <strong>0</strong>.</li>
      </ul>
      <p>
        Points are <strong>worth more as the tournament advances</strong>, so the finish stays exciting:
      </p>
      <PointsTable lang="en" />

      <H>🥅 Knockouts: who advances</H>
      <p>
        In the knockouts, on top of the score you earn a <strong>bonus for calling which team advances</strong>
        (in the final and third place, who wins). It's <strong>added</strong> to the score:
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>R32 &amp; R16:</strong> +2 · <strong>QF:</strong> +3 · <strong>SF:</strong> +4 · <strong>Final &amp; 3rd:</strong> +5.</li>
        <li>The score you enter is the one <strong>after extra time</strong>. If you predict a <strong>draw</strong>, you pick <strong>who wins on penalties</strong> — that's the team that goes through.</li>
        <li>You <strong>don't predict the shoot-out score</strong> (it's pure luck): only who advances.</li>
      </ul>
      <p>
        <strong>Important:</strong> the <strong>score</strong> and the <strong>who-advances bonus</strong> are
        <strong> two independent things</strong> and add up separately. Calling who advances
        <strong> does not require</strong> getting the score right.
      </p>
      <KnockoutExample lang="en" />

      <H>🥊 How each round is predicted (in detail)</H>
      <p>
        The knockouts are predicted <strong>one stage at a time</strong>, in order:
        <strong> Round of 32 → Round of 16 → quarter-finals → semi-finals → (final + 3rd place)</strong>.
        Each stage <strong>opens</strong> when the real World Cup reaches it.
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          Each round is already <strong>built with the REAL teams</strong>: the Round of 32 with the
          teams that qualified from the groups (1st, 2nd and the 8 best 3rd); the later rounds, with the
          <strong> REAL winners</strong> of the previous round. Even if you missed a tie,
          <strong> in the next round you predict the real matches</strong> (no phantom teams) and you're
          never left out of playing on.
        </li>
        <li>
          For each match you enter the <strong>score</strong> (the one <strong>after extra time</strong>).
          If it's a <strong>draw</strong>, you pick <strong>who advances</strong> (wins in extra time or
          on penalties).
        </li>
        <li>
          You score on the <strong>result</strong> (exact or just the result) and, <strong>separately</strong>,
          a <strong>bonus for calling who advances</strong>. The two are counted independently.
        </li>
        <li>
          The <strong>semi-final is its own stage</strong>: you predict the 2 semis and, once they're
          played, the <strong>final</strong> (with the real semi winners) and the
          <strong> 3rd place</strong> (with the losers) open up. So missing a semi
          <strong> doesn't stop you</strong> predicting the final or the third-place match.
        </li>
      </ul>
      <KnockoutStages lang="en" />
      <p className="text-slate-400 text-xs">
        Exact/Result = points for an exact score / just the result. Bonus = added for calling who
        advances (in the final and 3rd place, who wins). In the R32 a match is worth up to 4+2 =
        <strong> 6</strong>; in the final, 10+5 = <strong>15</strong>.
      </p>

      <H>⚖️ Ranking tie-breaker (in order)</H>
      <p>
        If two people end with the <strong>same points</strong>, they're ordered by these criteria, one
        after another:
      </p>
      <ol className="list-decimal pl-5 space-y-1">
        <li><strong style={{ color: '#1FA85C' }}>🎯 More exact scores</strong> (you nailed the score, e.g. 2-1 = 2-1).</li>
        <li><strong style={{ color: '#2F6DF0' }}>✅ More correct results</strong> (you got who won/drew/lost, even if not the score).</li>
        <li><strong style={{ color: '#E59A12' }}>🎟️ More correct advances</strong> — in the knockouts, how often you called <strong>which team goes through</strong> (in a win, the winner; in a draw, the team you picked on penalties). It's a <strong>separate parameter</strong> from the score.</li>
      </ol>
      <p>If they're still level after all three, they <strong>share the same position</strong>.</p>

      <p>
        The <strong>ranking is ordered by total points accumulated</strong> over the whole World Cup
        (not by percentage). That's why it pays to play every stage you can: the more you take part, the
        more you can score. Points you've earned <strong>stay with you from start to finish</strong>.
      </p>
      <p className="text-slate-400 text-xs">
        Note: scorers, cards and VAR can be predicted for fun, but they <strong>don't count</strong> for
        the ranking (the ranking only counts match results).
      </p>

      <H>🏅 Ranking and 🎯 Accuracy</H>
      <p>
        In <strong>Accuracy</strong> you see your points with the breakdown of hits. In
        <strong> Ranking</strong> you see the whole platform ordered by <strong>points</strong>.
      </p>

      <H>💡 Quick questions</H>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>I joined late — do I lose?</strong> No: you score from the stage you join. You're not required to have played earlier ones.</li>
        <li><strong>Can I change a prediction?</strong> Yes, up to 5 minutes before that match.</li>
        <li><strong>What if a knockout match goes to penalties?</strong> The result after the shootout counts, just like in real life.</li>
        <li><strong>🌐 Language:</strong> use the little flag at the top-right to switch between Spanish and English.</li>
      </ul>
      <p>Go win the family cup! 🏆</p>
    </>
  )
}
