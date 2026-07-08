// HIGHLIGHTS de fin de fase (api/remind.ts): detección de fases terminadas,
// cálculo del top de la fase y armado del mail. Es un envío masivo automático:
// la lógica queda clavada acá.
import { REMIND_BUCKETS, HIGHLIGHTS_GRACE_MS, HIGHLIGHTS_FRESH_MS, endedBuckets, computePhaseStats, buildHighlightsEmail, buildPhaseNarrative, applyRealResults, KICKOFF_MS, NAME_ES, normName } from '../api/remind'
import { TEAMS } from '../src/data/teams'
import { MATCHES } from '../src/data/schedule'

let pass = 0, fail = 0
const ok = (n: string, c: boolean, extra = '') => { if (c) pass++; else { fail++; console.log(`  ❌ ${n} ${extra}`) } }

// ── endedBuckets: fase terminada = último kickoff + margen, y FRESCA (≤48h) ──
const g = REMIND_BUCKETS.group, r32 = REMIND_BUCKETS.r32
ok('Antes del margen, grupos NO terminó', !endedBuckets(g.last + HIGHLIGHTS_GRACE_MS - 60_000).includes('group'))
ok('Pasado el margen, grupos terminó (fresco)', endedBuckets(g.last + HIGHLIGHTS_GRACE_MS + 60_000).includes('group'))
{
  const e = endedBuckets(r32.last + HIGHLIGHTS_GRACE_MS + 60_000)
  ok('Tras 16avos: 16avos fresco SÍ, octavos NO', e.includes('r32') && !e.includes('r16'))
  ok('Grupos ya NO se manda (viejo, evita spam retroactivo)', !e.includes('group'))
}
ok('Pasada la ventana de frescura, la fase no se manda más', !endedBuckets(g.last + HIGHLIGHTS_GRACE_MS + HIGHLIGHTS_FRESH_MS + 60_000).includes('group'))
ok('La final se manda fresca tras terminar', endedBuckets(REMIND_BUCKETS.finals.last + HIGHLIGHTS_GRACE_MS + 60_000).includes('finals'))

// ── computePhaseStats: puntos de la fase = marcador + bonus quién pasa ──
const real: Record<string, any> = {
  '73': { played: true, homeScore: 0, awayScore: 1 },
  '74': { played: true, homeScore: 1, awayScore: 1, homePens: 3, awayPens: 4 },
}
const preds = [
  // Ana: exacto en 73 (4) + pase (2) = 6 · en 74 eligió local en penales: nada
  { user_id: 'A', results: { '73': { played: true, homeScore: 0, awayScore: 1 }, '74': { played: true, homeScore: 2, awayScore: 0 } } },
  // Beto: 74 exacto 1-1 (4) + pase visitante (2) = 6, pero 0 en 73 (no predijo)
  { user_id: 'B', results: { '74': { played: true, homeScore: 1, awayScore: 1, homePens: 0, awayPens: 1 } } },
  // Caro: tendencia en 73 (2) — eligió visitante → pase (2) = 4
  { user_id: 'C', results: { '73': { played: true, homeScore: 0, awayScore: 3 } } },
  // Dani: todo mal → no aparece en el top
  { user_id: 'D', results: { '73': { played: true, homeScore: 2, awayScore: 0 } } },
]
const names = new Map([['A', 'Ana'], ['B', 'Beto'], ['C', 'Caro'], ['D', 'Dani']])
const totals = [
  { user_id: 'A', points: 80 },
  { user_id: 'B', points: 95 },
  { user_id: 'C', points: 60 },
  { user_id: 'D', points: 10 },
]
const s = computePhaseStats('r32', real, preds as any, names, totals)
ok('Top de la fase tiene 3 entradas (Dani con 0 queda afuera)', s.top.length === 3)
ok('Ana y Beto empatan en 6; desempata el exacto y ordena estable', s.top[0].pts === 6 && s.top[1].pts === 6 && s.top[2].name === 'Caro' && s.top[2].pts === 4)
ok('Exactos de la fase: Ana 1 + Beto 1 = 2', s.totalExacts === 2)
ok('Líder general: Beto con 95', s.leader?.name === 'Beto' && s.leader?.pts === 95)
ok('Ranking general: top 5 ordenado por puntos (Beto, Ana, Caro, Dani)', s.general.length === 4 && s.general.map((g) => g.name).join(',') === 'Beto,Ana,Caro,Dani')

// Fase sin resultados jugados → top vacío, sin exactos.
const s2 = computePhaseStats('qf', {}, preds as any, names, totals)
ok('Fase sin partidos jugados: top vacío y 0 exactos', s2.top.length === 0 && s2.totalExacts === 0)

// ── buildHighlightsEmail: contenido ──
const mail = buildHighlightsEmail('r32', 'Octavio', s, 'https://app.test')
ok('Asunto menciona el cierre de la fase', mail.subject.includes('16avos'))
ok('HTML lista al mejor de la fase con sus puntos', mail.html.includes('🥇') && mail.html.includes('+6 pts'))
ok('HTML menciona al líder general', mail.html.includes('Beto') && mail.html.includes('95 pts'))
ok('HTML incluye el link a la app', mail.html.includes('https://app.test'))
ok('Texto plano tiene el top y el líder', mail.text.includes('🥇') && mail.text.includes('Beto'))
ok('Saluda por nombre', mail.html.includes('Octavio'))

// ── NAME_ES: paridad con src/data/teams.ts (nombres + aliases) ──
{
  let missing = 0, wrong = 0
  for (const t of TEAMS) {
    for (const key of [t.name, t.id, ...(t.aliases ?? [])]) {
      const got = NAME_ES[normName(key)]
      if (got == null) { missing++; if (missing <= 3) console.log(`   falta: ${key}`) }
      else if (got !== t.name) { wrong++; if (wrong <= 3) console.log(`   mal: ${key} → ${got} (esperado ${t.name})`) }
    }
  }
  ok('NAME_ES cubre nombre+id+aliases de los 48 equipos', missing === 0, `${missing} faltantes`)
  ok('NAME_ES mapea cada alias a su nombre en español', wrong === 0, `${wrong} incorrectos`)
}

// ── buildPhaseNarrative: 2 párrafos como máximo, con goleada y penales ──
const fx = [
  { home: 'Brasil', away: 'Japón', h: 4, a: 0, hp: null, ap: null },
  { home: 'Países Bajos', away: 'Marruecos', h: 1, a: 1, hp: 2, ap: 3 },
  { home: 'México', away: 'Ecuador', h: 2, a: 1, hp: null, ap: null },
]
const nar = buildPhaseNarrative(fx)
ok('Narrativa: como máximo 2 párrafos', nar.split('\n\n').length <= 2)
ok('Narrativa: cuenta partidos y goles', nar.includes('3 partidos') && nar.includes('9 goles'))
ok('Narrativa: menciona la goleada con el ganador', nar.includes('Brasil') && nar.includes('4-0'))
ok('Narrativa: cuenta la definición por penales con el eliminado', nar.includes('Marruecos eliminó a Países Bajos') && nar.includes('2-3'))
ok('Narrativa vacía sin partidos', buildPhaseNarrative([]) === '')
// Con penales EMPATADOS (dato inválido) no se narra tanda.
const narBadPens = buildPhaseNarrative([{ home: 'A', away: 'B', h: 1, a: 1, hp: 3, ap: 3 }])
ok('Tanda empatada (dato inválido) no se narra como definición', !narBadPens.includes('eliminó'))

// El mail incorpora la narrativa en HTML y texto.
const mailNar = buildHighlightsEmail('r32', 'Octavio', s, 'https://app.test', nar)
ok('HTML del mail incluye la narrativa', mailNar.html.includes('Brasil') && mailNar.html.includes('4-0'))
ok('Texto plano incluye la narrativa', mailNar.text.includes('Marruecos eliminó a Países Bajos'))
// Sin narrativa, el mail sale igual (best-effort).
const mailSin = buildHighlightsEmail('r32', 'Octavio', s, 'https://app.test')
ok('Sin narrativa el mail se arma igual', mailSin.html.includes('🥇'))

// ── KICKOFF_MS: paridad con el calendario real ──
{
  let bad = 0
  for (const m of MATCHES) if (KICKOFF_MS[m.id] !== Date.parse(m.kickoff)) bad++
  ok('KICKOFF_MS coincide con schedule.ts en los 104 partidos', bad === 0, `${bad} distintos`)
}

// ── applyRealResults: NUESTRO marcador pisa al del proveedor ──
{
  // Caso real: Suiza-Colombia. El proveedor manda 4-3 (tanda sumada, sin pens);
  // nuestra base tiene 0-0 con pens 4-3 (corregido/locked). Debe narrar lo nuestro.
  const mid = REMIND_BUCKETS.r16.ids[REMIND_BUCKETS.r16.ids.length - 1] // P96
  const providerFx = [{ home: 'Suiza', away: 'Colombia', h: 4, a: 3, hp: null, ap: null, kickoffMs: KICKOFF_MS[mid] }]
  const ours = { [String(mid)]: { played: true, homeScore: 0, awayScore: 0, homePens: 4, awayPens: 3 } }
  const fixed = applyRealResults('r16', providerFx as any, ours as any)
  ok('Override: el 4-3 del proveedor pasa a nuestro 0-0 (4-3p)', fixed[0].h === 0 && fixed[0].a === 0 && fixed[0].hp === 4 && fixed[0].ap === 3)
  const narFixed = buildPhaseNarrative(fixed)
  ok('Narrativa post-override: Suiza eliminó a Colombia en la tanda', narFixed.includes('Suiza eliminó a Colombia') && narFixed.includes('0-0'))
  // Sin resultado nuestro (no jugado en la base) → queda el del proveedor.
  const untouched = applyRealResults('r16', providerFx as any, {} as any)
  ok('Sin resultado nuestro, queda el del proveedor', untouched[0].h === 4 && untouched[0].a === 3)
  // Fixture sin fecha → no se toca.
  const noDate = applyRealResults('r16', [{ home: 'A', away: 'B', h: 9, a: 0, hp: null, ap: null }] as any, ours as any)
  ok('Fixture sin kickoff no se empareja (queda igual)', noDate[0].h === 9)
}

// ── "Más vibrante": a igual goles gana el más peleado (3-2 sobre 4-1) ──
{
  const fx2 = [
    { home: 'Bélgica', away: 'Estados Unidos', h: 4, a: 1, hp: null, ap: null },
    { home: 'Argentina', away: 'Egipto', h: 3, a: 2, hp: null, ap: null },
    { home: 'México', away: 'Inglaterra', h: 1, a: 0, hp: null, ap: null },
  ]
  const nar2 = buildPhaseNarrative(fx2)
  ok('La goleada es de Bélgica (4-1)', nar2.includes('Bélgica') && nar2.includes('4-1'))
  ok('El partidazo es Argentina 3-2 (empata en goles pero es más peleado)', nar2.includes('El partidazo de la fase: Argentina 3-2 Egipto'))
}

// ── El mail incluye el resumen del ranking general (top 5) ──
{
  const mailRk = buildHighlightsEmail('r16', 'Octavio', s, 'https://app.test')
  ok('HTML tiene el bloque de ranking general', mailRk.html.includes('ranking general') && mailRk.html.includes('👑'))
  ok('HTML lista al 2º del general (Ana — 80 pts)', mailRk.html.includes('Ana') && mailRk.html.includes('80 pts'))
  ok('Texto plano tiene el ranking numerado', mailRk.text.includes('📊 Ranking general:') && mailRk.text.includes('1. Beto — 95 pts'))
}

console.log(`\n──────── HIGHLIGHTS DE FASE: ${pass} OK, ${fail} FALLOS ────────`)
if (fail > 0) process.exit(1)
