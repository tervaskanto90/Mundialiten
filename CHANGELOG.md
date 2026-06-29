# Changelog — Mundialiten

Versionado **SemVer**: `MAYOR.MENOR.PATCH`.
- **MAYOR** (7.0.0): cambios grandes o que rompen.
- **MENOR** (6.x.0): funcionalidades nuevas.
- **PATCH** (6.0.x): fixes y ajustes.

La versión vive en `package.json` (única fuente). El footer muestra
`vX.Y.Z · build <hash de commit>` — el hash identifica el deploy.

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
