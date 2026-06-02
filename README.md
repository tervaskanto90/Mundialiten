# ⚽ Mundialiten

Calendario interactivo del **Mundial 2026** para uso personal. Cargás los
resultados y la app completa sola las tablas de grupos y el cuadro de
eliminación. Además podés crear **predicciones** y **escenarios "what-if"**, y
ver qué tan acertada fue cada una.

Sin login. Todos los datos se guardan en tu navegador (localStorage).

## Cómo usarla

```bash
npm install
npm run dev      # abre http://localhost:5173
```

Para una versión optimizada: `npm run build` y luego `npm run preview`.
La carpeta `dist/` resultante se puede subir gratis a Vercel, Netlify, GitHub
Pages, etc.

### Deploy en Vercel

1. Importá el repo en Vercel. Detecta **Vite** automáticamente:
   - Build command: `npm run build`
   - Output directory: `dist`
2. No hace falta configurar nada más (ya hay un `vercel.json` con el fallback
   de SPA). Deploy y listo.
3. La API key del proveedor en vivo **no** se configura en Vercel: se carga
   desde la app (panel ⚙) y queda guardada en tu navegador.

## Qué hace

- **Calendario**: los 104 partidos (grupos + eliminatorias) por fecha, con
  sede y horario. Tocá un partido para cargar el resultado.
- **Carga de resultados con eventos**: marcador, definición por penales en
  eliminatorias, y eventos de **goles** (incluye en contra y de penal),
  **amarillas**, **rojas** e **intervenciones del VAR**, eligiendo jugador y
  minuto. *(Disponible en pestañas de predicción y what-if; el escenario real
  es de sólo lectura.)*
- **Formaciones**: al abrir un partido se ven **titulares y suplentes** de
  ambos equipos. Tocá (o clic derecho) un jugador para asignarle **gol a
  favor**, **gol en contra**, **amarilla** o **roja**. Las plantillas son
  genéricas y editables en `src/data/rosters.ts`.
- **Resultados reales en vivo**: el escenario «Resultados reales» es la fuente
  de verdad y **no se edita a mano**: se actualiza automáticamente desde un
  proveedor externo con un botón «Sincronizar» y auto-refresco cada 60s.
  Elegís el proveedor en el panel ⚙:
  - **football-data.org (por defecto, gratis y cubre el Mundial 2026)** — Trae
    marcadores en vivo. Como su API no permite llamadas desde el navegador, se
    usa un proxy serverless propio (`api/fd.js`) en Vercel. Configuración:
    1. Sacá un token gratis en football-data.org.
    2. En Vercel: *Project Settings → Environment Variables* →
       `FOOTBALL_DATA_TOKEN = <tu token>` y volvé a deployar.
  - **TheSportsDB** — Gratis y sin key, pero sólo marcadores y con cobertura/
    latencia limitada.
  - **API-Football** — Trae además goleadores/tarjetas/VAR (botón «Traer
    goles/tarjetas en vivo» en el partido), pero **su plan gratis no incluye la
    temporada 2026** (sólo 2022–2024): para el Mundial 2026 necesita plan pago.
  - El emparejado de partidos es por nombre de equipo (ver `aliases` en
    `src/data/teams.ts`). Si el proveedor todavía no tiene datos del torneo,
    simplemente no actualiza nada.
- **Grupos**: tablas que se calculan solas (puntos, diferencia de gol, fair
  play). Marca los 2 clasificados directos y el mejor 3°.
- **Llaves**: el cuadro de eliminación se va completando automáticamente a
  medida que se conocen ganadores. Resuelve puestos de grupo, mejores terceros
  y ganadores/perdedores de cada cruce.
- **Pestañas (tabs)**:
  - 🔴 **Resultados reales**: la pestaña principal, lo que va pasando.
  - 🔮 **Predicción**: independiente, con nombre y fecha. Cargás tu pronóstico
    completo y después se compara con la realidad.
  - 🧪 **What-if**: parte del real y se actualiza solo cuando se cargan
    resultados reales. Sobrescribí los partidos que quieras para simular
    escenarios ("¿qué pasa si X le gana a Y?"). Cada partido tiene "↺ Volver al
    real".
- **Precisión**: porcentaje de acierto de cada predicción/escenario contra la
  realidad, desglosado por factor (resultado, marcador exacto, goleadores,
  amarillas, rojas, VAR, clasificados, ganadores de eliminatoria y campeón).
- **Exportar / importar** (botones ⤓ / ⤒ arriba a la derecha): respaldo de
  todos tus datos en un archivo JSON.

## Editar los datos del torneo

Todo el contenido del torneo vive en archivos simples y editables:

- `src/data/teams.ts` — los 48 equipos por grupo (nombre, bandera, grupo).
  Varios son "placeholders" (Repesca Europa/FIFA) porque el calendario es
  previo al sorteo. Cambialos por los equipos reales cuando quieras.
- `src/data/venues.ts` — las 16 sedes.
- `src/data/schedule.ts` — la fase de grupos se genera automáticamente y las
  eliminatorias están definidas con fechas reales y un cuadro válido. Acá podés
  ajustar fechas, horarios, sedes o el sembrado del cuadro.

> Nota: las fechas/horarios de la fase de grupos se reparten de forma ordenada
> dentro de la ventana real del torneo; podés ajustarlos a tu calendario
> editando `src/data/schedule.ts`.
