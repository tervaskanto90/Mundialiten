import { useState } from 'react'
import { Modal } from './Modal'
import { useT } from '../i18n'

export function HowToPlay() {
  const { t, lang } = useT()
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-medium bg-white/10 hover:bg-white/20 text-white px-2.5 py-1 rounded-lg whitespace-nowrap"
      >
        ❓ {t('¿Cómo jugar?', 'How to play?')}
      </button>
      {open && (
        <Modal title={t('¿Cómo jugar?', 'How to play?')} onClose={() => setOpen(false)} wide>
          <div className="space-y-4 text-sm leading-relaxed text-slate-300">
            {lang === 'en' ? <GuideEN /> : <GuideES />}
          </div>
        </Modal>
      )}
    </>
  )
}

function H({ children }: { children: React.ReactNode }) {
  return <h3 className="font-semibold text-white mt-4">{children}</h3>
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
  return (
    <div className="rounded-lg border border-white/10 overflow-hidden text-xs mt-1">
      <div className="grid grid-cols-3 bg-white/5 font-semibold text-slate-200">
        <span className="px-2 py-1.5">{lang === 'es' ? 'Fase' : 'Stage'}</span>
        <span className="px-2 py-1.5 text-center">{lang === 'es' ? 'Exacto' : 'Exact'}</span>
        <span className="px-2 py-1.5 text-center">{lang === 'es' ? 'Sólo resultado' : 'Result only'}</span>
      </div>
      {POINTS_ROWS.map(([key, exact, tend]) => {
        const [esKey, en] = key.split('|')
        return (
          <div key={key} className="grid grid-cols-3 border-t border-white/5">
            <span className="px-2 py-1.5">{lang === 'es' ? POINTS_LABEL_ES[esKey] : en}</span>
            <span className="px-2 py-1.5 text-center font-semibold text-emerald-400">{exact}</span>
            <span className="px-2 py-1.5 text-center font-semibold text-amber-400">{tend}</span>
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
      <p className="text-center text-slate-200 text-xs bg-white/5 rounded-lg py-2">
        Grupos → 16avos → 8vos → Cuartos → (Semis + Final + 3er puesto)
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
      <p className="text-center text-slate-200 text-xs bg-white/5 rounded-lg py-2">
        Groups → Round of 32 → Round of 16 → Quarter-finals → (Semis + Final + 3rd place)
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
