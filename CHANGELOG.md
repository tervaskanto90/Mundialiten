# Changelog — Mundialiten

Versionado **SemVer**: `MAYOR.MENOR.PATCH`.
- **MAYOR** (7.0.0): cambios grandes o que rompen.
- **MENOR** (6.x.0): funcionalidades nuevas.
- **PATCH** (6.0.x): fixes y ajustes.

La versión vive en `package.json` (única fuente). El footer muestra
`vX.Y.Z · build <hash de commit>` — el hash identifica el deploy.

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
