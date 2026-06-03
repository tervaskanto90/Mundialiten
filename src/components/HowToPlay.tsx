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

      <H>📅 Se predice por etapa</H>
      <p>
        Predecís <strong>una etapa por vez</strong>, según la fase en curso del Mundial:
        grupos → 16avos → 8avos → 4tos → (semis + final + 3er puesto). Sólo está abierta la etapa
        actual; las demás se abren a medida que avanza el torneo. <strong>Antes de que empiece el
        Mundial</strong> sólo se predice la fase de grupos. Podés <strong>entrar en cualquier
        instancia</strong>, aunque no hayas predicho antes. En <strong>Calendario</strong> ves arriba
        cuál es la etapa abierta.
      </p>

      <H>⚽ Cargar tu predicción</H>
      <p>
        En <strong>Calendario</strong>, tocá un partido y poné el marcador con los botones + / −. Para
        goleadores, abrí <strong>Formaciones</strong> y <strong>tocá un jugador</strong> (suma un gol);
        con <strong>mantener apretado / clic derecho</strong> elegís gol de penal, en contra, amarilla
        o roja. También podés pronosticar cuántas veces interviene el VAR.
      </p>

      <H>⏱️ Cierre 5 minutos antes</H>
      <p>
        Cada partido se cierra 5 minutos antes de empezar (para que nadie haga trampa), en todas las
        etapas.
      </p>

      <H>📊 Grupos y 🏆 Llaves</H>
      <p>
        Las <strong>tablas</strong> se calculan solas. Cada etapa de eliminatoria se arma con los
        equipos que <strong>realmente clasificaron</strong>, así siempre predecís los cruces reales
        (aunque hayas errado rondas anteriores).
      </p>

      <H>🎯 Cómo se puntúa</H>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Marcador exacto</strong>: máximo puntaje.</li>
        <li><strong>Sólo el resultado</strong> (ganó/empató/perdió, sin el marcador): puntaje parcial.</li>
        <li>Errar: 0.</li>
        <li>Los puntos <strong>valen más a medida que avanza el torneo</strong> (la final vale mucho más que un partido de grupos).</li>
      </ul>
      <p>
        El <strong>ranking se ordena por los puntos acumulados</strong> durante todo el Mundial. Ojo:
        goleadores, tarjetas y VAR se pueden pronosticar para divertirse, pero <strong>no suman al
        ranking</strong>.
      </p>

      <H>🏅 Ranking y 🎯 Precisión</H>
      <p>
        En <strong>Precisión</strong> ves tus puntos con el desglose. En <strong>Ranking</strong> ves
        a todos ordenados por <strong>puntos</strong>. ¡A ganar la copa de la familia! 🏆
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

      <H>📅 You predict one stage at a time</H>
      <p>
        You predict <strong>one stage at a time</strong>, following the tournament: groups → R32 →
        R16 → QF → (semis + final + 3rd). Only the current stage is open; the rest open as the
        tournament advances. <strong>Before the World Cup starts</strong>, only the group stage is
        open. You can <strong>join at any stage</strong>, even if you didn't predict earlier ones.
        The open stage is shown at the top of <strong>Calendar</strong>.
      </p>

      <H>⚽ Making your prediction</H>
      <p>
        In <strong>Calendar</strong>, tap a match and set the score with the + / − buttons. For
        scorers, open <strong>Line-ups</strong> and <strong>tap a player</strong> (adds a goal); with
        <strong> long-press / right-click</strong> you pick penalty goal, own goal, yellow or red
        card. You can also predict how many times VAR intervenes.
      </p>

      <H>⏱️ Locked 5 minutes before</H>
      <p>
        Each match closes 5 minutes before kick-off (so no one can cheat), in every stage.
      </p>

      <H>📊 Groups and 🏆 Bracket</H>
      <p>
        The <strong>standings</strong> are computed automatically. Each knockout stage is built with
        the teams that <strong>actually qualified</strong>, so you always predict the real ties (even
        if you missed earlier rounds).
      </p>

      <H>🎯 How scoring works</H>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Exact score</strong>: maximum points.</li>
        <li><strong>Just the result</strong> (win/draw/loss, without the exact score): partial points.</li>
        <li>Wrong: 0.</li>
        <li>Points are <strong>worth more as the tournament advances</strong> (the final is worth far more than a group match).</li>
      </ul>
      <p>
        The <strong>ranking is ordered by total points accumulated</strong> over the whole World Cup.
        Note: scorers, cards and VAR can be predicted for fun, but they <strong>don't count</strong>
        for the ranking.
      </p>

      <H>🏅 Ranking and 🎯 Accuracy</H>
      <p>
        In <strong>Accuracy</strong> you see your points with the breakdown. In
        <strong> Ranking</strong> you see everyone ordered by <strong>points</strong>. Go win the
        family cup! 🏆
      </p>
    </>
  )
}
