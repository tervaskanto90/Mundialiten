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

## Qué hace

- **Calendario**: los 104 partidos (grupos + eliminatorias) por fecha, con
  sede y horario. Tocá un partido para cargar el resultado.
- **Carga de resultados con eventos**: marcador, definición por penales en
  eliminatorias, y eventos de **goles** (incluye en contra y de penal),
  **amarillas**, **rojas** e **intervenciones del VAR**, eligiendo jugador y
  minuto.
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
