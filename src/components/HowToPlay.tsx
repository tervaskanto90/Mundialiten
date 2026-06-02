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
  return <h3 className="font-semibold text-white mt-3">{children}</h3>
}

function GuideES() {
  return (
    <>
      <p>
        <strong>Mundialiten</strong> es un prode del Mundial 2026: pronosticás los partidos y competís
        por el ranking con tu familia y amigos. Lectura de 2–3 minutos 👇
      </p>

      <H>🔑 Cuenta</H>
      <p>
        Entrás con email y contraseña (y un nombre para el ranking). Tu predicción es privada; en el
        ranking sólo se ve tu nombre y tu porcentaje.
      </p>

      <H>🗂️ Las pestañas de arriba</H>
      <ul className="list-disc pl-5 space-y-1">
        <li>🔴 <strong>Resultados reales</strong>: lo que va pasando de verdad. No se edita a mano: se actualiza solo en vivo.</li>
        <li>🔮 <strong>Predicción</strong>: tu pronóstico. Tenés una por cuenta y es la que cuenta para el ranking.</li>
        <li>🧪 <strong>What-if</strong>: un "¿qué pasaría si…?". Parte de lo real y lo cambiás para simular. No cuenta para el ranking.</li>
      </ul>

      <H>📅 Cargar tu predicción</H>
      <p>
        En <strong>Calendario</strong>, tocá un partido y poné el marcador con los botones + / −. Para
        cargar goleadores, abrí <strong>Formaciones</strong> y <strong>cliqueá un jugador</strong> (suma
        un gol). Con <strong>clic derecho</strong> (o mantener apretado en el celu) elegís gol de penal,
        gol en contra, amarilla o roja. También podés pronosticar cuántas veces interviene el VAR.
      </p>

      <H>⏱️ Cierre 5 minutos antes</H>
      <p>
        Cada partido se cierra 5 minutos antes de empezar (para que nadie haga trampa). Sólo cuentan
        los partidos que pronosticaste a tiempo.
      </p>

      <H>📊 Grupos y 🏆 Llaves</H>
      <p>
        Las <strong>tablas</strong> se calculan solas con los resultados. Las <strong>llaves</strong> se
        van llenando con el 1° y 2° de cada grupo. Al terminar la fase de grupos, las eliminatorias se
        arman con los equipos que <strong>realmente clasificaron</strong>, así todos pronostican los
        cruces correctos.
      </p>

      <H>🎯 Cómo se puntúa</H>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Marcador exacto</strong>: máximo puntaje.</li>
        <li><strong>Sólo el resultado</strong> (ganó/empató/perdió, sin el marcador): puntaje parcial.</li>
        <li>Errar: 0.</li>
        <li>Los puntos <strong>valen más a medida que avanza el torneo</strong> (la final vale mucho más que un partido de grupos), así el ranking queda abierto hasta el final.</li>
      </ul>
      <p>
        Ojo: goleadores, tarjetas y VAR se pueden pronosticar para divertirse, pero <strong>no suman al
        ranking</strong> (sólo cuentan los resultados, que es lo que se verifica solo).
      </p>

      <H>🏅 Ranking y 🎯 Precisión</H>
      <p>
        En <strong>Precisión</strong> ves tu porcentaje con el desglose. En <strong>Ranking</strong> ves
        a todos ordenados por puntaje. ¡A ganar la copa de la familia! 🏆
      </p>
    </>
  )
}

function GuideEN() {
  return (
    <>
      <p>
        <strong>Mundialiten</strong> is a World Cup 2026 prediction game: forecast the matches and
        compete on the ranking with family and friends. A 2–3 minute read 👇
      </p>

      <H>🔑 Account</H>
      <p>
        You sign in with email and password (and a name for the ranking). Your prediction is private;
        the ranking only shows your name and percentage.
      </p>

      <H>🗂️ The tabs at the top</H>
      <ul className="list-disc pl-5 space-y-1">
        <li>🔴 <strong>Real results</strong>: what's actually happening. Not edited by hand — it updates live.</li>
        <li>🔮 <strong>Prediction</strong>: your forecast. One per account, and it's the one that counts for the ranking.</li>
        <li>🧪 <strong>What-if</strong>: a "what would happen if…". Starts from the real results and you tweak it to simulate. Doesn't count for the ranking.</li>
      </ul>

      <H>📅 Making your prediction</H>
      <p>
        In <strong>Calendar</strong>, tap a match and set the score with the + / − buttons. To add
        scorers, open <strong>Line-ups</strong> and <strong>click a player</strong> (adds a goal).
        With <strong>right-click</strong> (or long-press on mobile) you pick penalty goal, own goal,
        yellow or red card. You can also predict how many times VAR intervenes.
      </p>

      <H>⏱️ Locked 5 minutes before</H>
      <p>
        Each match closes 5 minutes before kick-off (so no one can cheat). Only the matches you
        predicted in time count.
      </p>

      <H>📊 Groups and 🏆 Bracket</H>
      <p>
        The <strong>standings</strong> are computed automatically from the results. The
        <strong> bracket</strong> fills with the 1st and 2nd of each group. When the group stage ends,
        the knockouts are built with the teams that <strong>actually qualified</strong>, so everyone
        forecasts the correct ties.
      </p>

      <H>🎯 How scoring works</H>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Exact score</strong>: maximum points.</li>
        <li><strong>Just the result</strong> (win/draw/loss, without the exact score): partial points.</li>
        <li>Wrong: 0.</li>
        <li>Points are <strong>worth more as the tournament advances</strong> (the final is worth far more than a group match), so the ranking stays open until the end.</li>
      </ul>
      <p>
        Note: scorers, cards and VAR can be predicted for fun, but they <strong>don't add to the
        ranking</strong> (only results count, which is what's verified automatically).
      </p>

      <H>🏅 Ranking and 🎯 Accuracy</H>
      <p>
        In <strong>Accuracy</strong> you see your percentage with the breakdown. In
        <strong> Ranking</strong> you see everyone ordered by score. Go win the family cup! 🏆
      </p>
    </>
  )
}
