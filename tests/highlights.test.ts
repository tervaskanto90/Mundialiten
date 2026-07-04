// HIGHLIGHTS de fin de fase (api/remind.ts): detección de fases terminadas,
// cálculo del top de la fase y armado del mail. Es un envío masivo automático:
// la lógica queda clavada acá.
import { REMIND_BUCKETS, HIGHLIGHTS_GRACE_MS, HIGHLIGHTS_FRESH_MS, endedBuckets, computePhaseStats, buildHighlightsEmail } from '../api/remind'

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

console.log(`\n──────── HIGHLIGHTS DE FASE: ${pass} OK, ${fail} FALLOS ────────`)
if (fail > 0) process.exit(1)
