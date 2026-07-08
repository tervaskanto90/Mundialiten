# Changelog — Mundialiten

Versionado **SemVer**: `MAYOR.MENOR.PATCH`.
- **MAYOR** (7.0.0): cambios grandes o que rompen.
- **MENOR** (6.x.0): funcionalidades nuevas.
- **PATCH** (6.0.x): fixes y ajustes.

La versión vive en `package.json` (única fuente). El footer muestra
`vX.Y.Z · build <hash de commit>` — el hash identifica el deploy.

## 6.4.3 — (producción)
- ✍️ **Nota editorial por fase en los highlights** (`PHASE_EDITORIAL` en
  api/remind.ts): una línea escrita a mano que sale SIEMPRE como "el partidazo"
  de la fase, por encima de la heurística automática — que podía dejar afuera el
  partido que importaba (la remontada de Argentina 3-2 a Egipto no salía si otro
  cruce tenía más goles). La de octavos ya está cargada. Si el proveedor de datos
  falla, la editorial sale igual. Sin editorial, sigue la automática.

## 6.4.2 — (producción)
- 📊 **El mail de highlights suma el resumen del ranking general**: top 5 con
  puntos (mismo orden que la app: pts → exactos → resultados → pases), con 👑
  para el líder. Y el partido con más goles ahora se presenta como **"el
  partidazo de la fase"** (a igual goles gana el más peleado: un 3-2 le gana a
  un 4-1 — caso Argentina-Egipto en octavos). Suite HIGHLIGHTS: 39 casos.

## 6.4.1 — (producción)
- 🎯 **La narrativa de highlights usa NUESTROS resultados, no los del proveedor.**
  El preview de octavos narraba "Suiza 4-3 Colombia" cuando fue 0-0 (4-3 por
  penales): football-data volvió a mandar la tanda sumada al marcador y sin el
  detalle de penales. Ahora cada fixture del proveedor se empareja con nuestro
  partido por kickoff (`KICKOFF_MS`, con test de paridad; sin ambigüedad en
  eliminatorias) y el marcador/penales sale de `real_results` (que tiene las
  correcciones `locked`); el proveedor sólo aporta nombres. Además, "el más
  vibrante" desempata por partido más peleado (un 3-2 le gana a un 4-1). Suite
  HIGHLIGHTS: 35 casos.

## 6.4.0 — (producción)
- 📰 **El mail de highlights ahora cuenta lo que pasó en la cancha** (máx. 2
  párrafos): cuántos partidos y goles tuvo la fase, la mayor goleada, el partido
  con más goles, las definiciones por penales (quién eliminó a quién y la tanda)
  y los cruces definidos por un gol. Los partidos y nombres salen de
  football-data (server-side) traducidos con un mapa estático de los 48 equipos
  (con test de paridad contra `teams.ts`). Best-effort: si el proveedor falla,
  el mail sale igual sin el resumen. Suite HIGHLIGHTS: 28 casos.

## 6.3.0 — (producción)
- 🏁 **Highlights automáticos al terminar cada fase** (mismo cron diario de
  /api/remind, sin gastar otro slot de cron): cuando una fase termina (último
  kickoff + 3.5h), un mail a todos con el **top 3 de la fase** (puntos ganados y
  exactos), el **total de exactos** entre todos y el **líder general**, con
  gancho a predecir la ronda siguiente. Dedup por usuario+fase (kind
  `highlights`) y **ventana de frescura de 48h** para no spamear resúmenes
  viejos (p.ej. grupos, que terminó hace días). Suite de tests nueva (17 casos).
- ℹ️ El aviso de **fase nueva abierta** ya existía y sigue igual: el mismo cron
  manda el "Se abrió la fase" (kind `open`) a todos apenas la fase se activa.

## 6.2.12 — (producción)
- ⚠️ **Empate de eliminatoria sin elegir quién pasa: imposible no verlo.** Era
  posible predecir un empate en el mata-mata y cerrar el editor sin elegir quién
  avanza (la advertencia era diminuta) → el usuario perdía el bonus sin saberlo
  (caso real: Sergio). Ahora: (1) banner rojo fuerte en el editor, y (2) aviso
  persistente en la tarjeta del calendario ("⚠️ Falta elegir quién PASA — tocá el
  partido") mientras la predicción esté incompleta. En la final/3º dice "quién
  GANA". No se autoelige un equipo (sería arbitrario) — se insiste hasta que elija.

## 6.2.11 — (producción)
- 🧹 **Se quita el "% efectiv." del ranking** (mobile y desktop): confundía y no
  es parte de los desempates. Quedan los badges que sí definen el orden:
  🎯 exactos · ✅ resultados · 🎟️ pases.

## 6.2.10 — (producción)
- ✅ **Se apaga el aviso de mantenimiento del login** (`MAINTENANCE_NOTICE = false`):
  Supabase levantó la restricción de cuota y el servicio volvió a la normalidad.

## 6.2.9 — (producción)
- 🛠️ **Aviso de mantenimiento: legible y sin mover el layout.** El banner del
  login tenía fondo translúcido y el mosaico de colores lavaba el texto (ilegible
  en claro y oscuro) → ahora usa la misma tarjeta opaca del login con franja y
  borde dorados. Además, al estar dentro de la columna central corría el ancla
  del panel "Mirá otras cosas" en desktop → ahora flota arriba del login sin
  ocupar lugar en el flujo (en mobile sigue en el flujo normal).

## 6.2.8 — (producción)
- 🛠️ **Aviso de mantenimiento en el login.** Banner en la pantalla de entrada
  avisando que hay un inconveniente con el servicio de base de datos (restricción
  de cuota de Supabase pendiente de levantarse) y que login/predicciones pueden
  fallar; aclara que los puntos y predicciones están a salvo. Bilingüe, estilado
  con el tema. Se activa/desactiva con `MAINTENANCE_NOTICE` en `AuthGate.tsx`
  (flag de código a propósito: el aviso existe justo para cuando la base no
  responde). **Recordar ponerlo en `false` y re-deployar cuando se resuelva.**

## 6.2.7 — (producción)
- 🚨 **Fix crítico: la sync en vivo escribía resultados de partidos que NO se
  habían jugado.** El emparejado con el proveedor de datos era SÓLO por nombre de
  equipo, sin chequear la fecha — así que un dato viejo/erróneo del proveedor con
  los mismos dos equipos (ej. un cruce de eliminatoria ya resuelto pero todavía sin
  jugarse) podía escribirse como si fuera nuestro partido. Caso real: un cruce de
  octavos (Paraguay-Francia, arrancaba 3 días después) apareció con "0-3" jugado.
  Ahora se valida la fecha del partido del proveedor contra el kickoff real de
  nuestro calendario (tolerancia 36h); si está muy lejos, se descarta. Tests
  nuevos (36/36 en LIVE SYNC).

## 6.2.6 — (infra, sin cambios de código)
- 🔧 **Fix silencioso de Supabase: tope de 1000 filas en la API.** `past_predictions()`
  devuelve una fila por (usuario × partido predicho); con ~21 jugadores y todos los
  partidos ya jugados, el total superó las 1000 filas por defecto de PostgREST
  (medido: 1093) — sin error, las filas de más simplemente no llegaban (caso: la
  predicción de "Victor pampa" para el P79 no aparecía en el ranking). Se subió el
  techo a 10.000 filas (`alter role authenticator set pgrst.db_max_rows`). Sin
  cambios de código; documentado en `supabase/schema.sql` para setups nuevos.

## 6.2.5 — (producción)
- 🥅 **Tanda de penales empatada = dato incompleto, se descarta.** Una tanda SIEMPRE
  tiene ganador; si el proveedor manda los penales empatados (ej.: 3-3, tanda en
  curso), `advancingSide` no encontraba ganador y se perdía el bonus de "quién pasa"
  (caso PBA-MAR: muchos acertaron que pasaba Marruecos y no se contabilizó). Ahora la
  sync sólo escribe el partido cuando la tanda está **definida** (un ganador). Tests.

## 6.2.4 — (producción)
- ⚖️ **Regla de penales, universal y automática.** Un partido por penales terminó
  EMPATADO a los 120'. Ahora la sync **descarta** cualquier resultado con penales
  cuyo marcador NO sea empate (dato inconsistente del proveedor), en vez de
  escribirlo. Junto con `regulationScore` (marcador = 120') y el candado `locked`,
  todo partido por penales queda bien sin tocar nada a mano. Los puntos siguen
  saliendo del marcador de los 120' + el bonus por quién pasa, y se recalculan solos
  al cambiar cualquier resultado. Tests nuevos.

## 6.2.3 — (producción)
- 🔐 **Candado `locked`: la sync nunca pisa un resultado congelado a mano.** El
  candado por `finished` de 6.2.2 no alcanzaba porque football-data manda datos
  malos de un partido SIN marcarlo terminado (`finished=false`), así que seguía
  pisándolo. Ahora un resultado con `locked:true` en la base es la verdad
  definitiva: pase lo que pase con el feed, la sincronización lo deja quieto.

## 6.2.2 — (producción)
- 🔒 **Un partido finalizado no se vuelve a pisar con la sincronización en vivo.**
  football-data.org seguía mandando datos raros de partidos ya terminados (la tanda
  de penales sumada al marcador, o tallies intermedios de la tanda), y la sync los
  re-escribía cada minuto. Ahora, una vez `finished`, el resultado queda firme; si
  quedó un dato malo, se corrige una vez en la base y no se vuelve a tocar. Va junto
  con el fix de penales de 6.2.1.

## 6.2.1 — (producción)
- 🥅 **Fix: los penales ya no se suman al marcador.** football-data.org reporta el
  `fullTime` con la tanda incluida (ej.: 1-1 definido 3-4 por penales lo manda como
  4-5). Ahora el marcador del partido es el de **después del alargue** (un empate) y
  los penales van aparte (ALE 1-1 PAR · 3-4p). `regulationScore()` resta la tanda
  cuando queda un empate no-negativo; si no, deja el `fullTime`. Test nuevo. Al
  re-sincronizar, el resultado mal guardado se corrige solo.

## 6.2.0 — (producción)
- 📈 **Digest automático cada 2 días** (`api/digest.ts` + Vercel Cron): mail a
  todos destacando a quien **trepó 2+ puestos** en el ranking desde el digest
  anterior (puestos y puntos ganados). Si nadie trepó 2+, **no se manda nada**;
  si treparon varios, **los menciona a todos**. Modos `test=1` (sólo al admin,
  preview), `dryRun=1` y `init=1` (sembrar el snapshot). Botón admin "📈 Probar
  digest". Snapshot del ranking en `scores` (`digest_rank/points/at`).
  - ⚠️ Requiere correr `supabase/migrations/digest_snapshot.sql`.

## 6.1.2 — (producción)
- 📉 **Egress de Supabase recortado ~50-100x** (estaba en 551% de la cuota). El
  ranking polleaba cada 60s y bajaba los avatares (data URLs) en CADA fila —
  `past_predictions` los duplicaba por (usuario × partido). Ahora:
  - La RPC `past_predictions` ya **no devuelve `avatar_url`** (sólo números).
  - Los avatares se bajan **una sola vez** (`fetchAvatars`) y se reutilizan por
    `user_id`; salen del query polleado del ranking.
  - El polling del ranking pasa a **2 min y se pausa con la pestaña en segundo
    plano** (antes 60s y seguía corriendo oculto).
  - **Branding cacheado** en localStorage: sólo re-baja los logos si cambió el
    `updated_at` (antes bajaba las imágenes en cada carga).
  - ⚠️ Requiere correr `supabase/migrations/past_predictions_no_avatar.sql`.

## 6.1.1 — (producción)
- 🗝️ **Cruces de 16avos corregidos**: los mejores terceros ahora se ubican en
  cada cruce siguiendo la **tabla oficial de la FIFA** («Annex C», 495
  combinaciones), no "cualquier" asignación válida por grupos. Antes el cuadro
  podía intercambiar terceros entre cruces respecto del oficial (p. ej. los
  terceros de los grupos D y F cruzados entre P74 y P77). Verificado contra dos
  fuentes independientes + test de regresión.

## 6.1.0 — (en staging, próximo a producción)
- 🥅 **Tutorial de eliminatorias** rediseñado y detallado, con ejemplos visuales
  animados (cómo predecir, quién pasa, los escenarios de puntos, el bonus, y que
  se predice una fase por vez con puntos acumulados).
- ✉️ **Email de aviso de 16avos** (cómo predecir + sistema de puntos), con modo
  de prueba (envío sólo al admin) y envío masivo idempotente.
- 🔢 **Footer con versión real + build** (en vez de "v6" fijo).
- 🟢 Ranking: muestra **todos** los partidos en vivo (no sólo el último horario).
- 📱 Mobile: vuelve "Pendientes" (sólo emoji) alineado junto a Etapa.

## 6.0.0 — Lanzamiento v6 (fase final del Mundial 2026)
- Rediseño completo: Inicio, Fixture/Tablas/Llaves, Estadísticas, Ranking.
- **Eliminatorias**: predicción por etapa (semifinal separada de final/3º),
  bonus por "quién pasa", 3er desempate por pases de ronda.
- Campeón con confeti/podio, tabla de mejores terceros, "¿Cómo jugar?" ampliado.
- Fixes post-lanzamiento: avatar fuera del JWT (rompía requests), ranking en vivo.
