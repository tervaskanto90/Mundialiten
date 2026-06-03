// Pruebas de la lógica pura de recordatorios (a quién avisar + contenido del mail).
import { planReminders, buildReminderEmail, bucketFirstKickoff, LASTCALL_HOURS } from '../src/lib/reminders'

let pass = 0, fail = 0
function check(name: string, cond: boolean, extra = '') {
  if (cond) pass++; else { fail++; console.log(`  ❌ ${name} ${extra}`) }
}
const T = (iso: string) => Date.parse(iso)
const played = { played: true }

// Durante la fase de grupos, lejos del 1er partido (que ya pasó el 11/06).
const duringGroups = T('2026-06-20T12:00:00Z')

// 1) Usuario nuevo (sin 'open') → recibe 'open'.
let plan = planReminders({ now: duringGroups, userIds: ['u1'], predBy: new Map(), sent: new Set() })
check('Bucket abierto = group', plan.bucket === 'group')
check('Usuario sin open → recibe open', plan.send.length === 1 && plan.send[0].kind === 'open')

// 2) Ya recibió 'open' y el 1er partido ya pasó (hoursToFirst<0) → nada.
plan = planReminders({ now: duringGroups, userIds: ['u1'], predBy: new Map(), sent: new Set(['u1|open']) })
check('Con open y 1er partido pasado → sin lastcall', plan.send.length === 0, JSON.stringify(plan.send))

// 3) Antes del Mundial, dentro de la ventana de last-call del 1er partido de grupos.
const firstGroup = bucketFirstKickoff('group') // 2026-06-11T19:00Z
const within = firstGroup - 25 * 3600_000 // 25 h antes (<= 30)
// 3a) ya tiene open, le falta predecir → lastcall
plan = planReminders({ now: within, userIds: ['u1'], predBy: new Map(), sent: new Set(['u1|open']) })
check('Dentro de ventana + falta predecir → lastcall', plan.send.length === 1 && plan.send[0].kind === 'lastcall', `h=${plan.hoursToFirst.toFixed(1)}`)
check('hoursToFirst dentro de (0, LASTCALL_HOURS]', plan.hoursToFirst > 0 && plan.hoursToFirst <= LASTCALL_HOURS)

// 3b) ya tiene open y predijo TODOS los partidos de grupos → nada.
const allGroups = new Map<string, Record<number, { played?: boolean }>>()
const full: Record<number, { played?: boolean }> = {}
for (let id = 1; id <= 72; id++) full[id] = played
allGroups.set('u1', full)
plan = planReminders({ now: within, userIds: ['u1'], predBy: allGroups, sent: new Set(['u1|open']) })
check('Predijo todo → sin lastcall', plan.send.length === 0)

// 3c) ya recibió open y lastcall → nada aunque le falte.
plan = planReminders({ now: within, userIds: ['u1'], predBy: new Map(), sent: new Set(['u1|open', 'u1|lastcall']) })
check('Ya recibió ambos → nada', plan.send.length === 0)

// 4) Si corresponde 'open', NO se manda 'lastcall' en la misma corrida.
plan = planReminders({ now: within, userIds: ['u1'], predBy: new Map(), sent: new Set() })
check('open tiene prioridad sobre lastcall en una corrida', plan.send.length === 1 && plan.send[0].kind === 'open')

// 5) Más lejos que la ventana → ni open (si ya lo tiene) ni lastcall.
const farBefore = firstGroup - 100 * 3600_000
plan = planReminders({ now: farBefore, userIds: ['u1'], predBy: new Map(), sent: new Set(['u1|open']) })
check('Fuera de ventana → sin lastcall', plan.send.length === 0)

// 6) Después del Mundial → bucket null, nada que enviar.
plan = planReminders({ now: T('2026-08-01T00:00:00Z'), userIds: ['u1', 'u2'], predBy: new Map(), sent: new Set() })
check('Torneo terminado → bucket null y sin envíos', plan.bucket === null && plan.send.length === 0)

// 7) Varios usuarios mezclados.
plan = planReminders({
  now: within,
  userIds: ['a', 'b', 'c'],
  predBy: allGroupsFor(['c']),
  sent: new Set(['a|open', 'b|open', 'b|lastcall', 'c|open']),
})
// a: open ya, falta predecir, dentro de ventana → lastcall
// b: ya tiene ambos → nada
// c: open ya, predijo todo → nada
check('Mezcla: sólo "a" recibe lastcall', plan.send.length === 1 && plan.send[0].userId === 'a' && plan.send[0].kind === 'lastcall', JSON.stringify(plan.send))

function allGroupsFor(ids: string[]) {
  const m = new Map<string, Record<number, { played?: boolean }>>()
  const f: Record<number, { played?: boolean }> = {}
  for (let id = 1; id <= 72; id++) f[id] = played
  for (const id of ids) m.set(id, f)
  return m
}

// 8) Contenido del mail.
const e1 = buildReminderEmail('r16', 'open', 'Octavio', 'https://miapp.vercel.app')
check('Subject open menciona la etapa', e1.subject.includes('octavos'))
check('HTML incluye el link a la app', e1.html.includes('https://miapp.vercel.app'))
check('HTML saluda por nombre', e1.html.includes('Octavio'))
const e2 = buildReminderEmail('finals', 'lastcall', '', '')
check('Subject lastcall dice "Último aviso"', e2.subject.includes('Último aviso'))
check('Sin nombre usa saludo genérico', e2.html.includes('¡Hola!'))
check('Sin appUrl no rompe (sin botón)', !e2.html.includes('href=""'))

console.log(`\n──────── RECORDATORIOS: ${pass} OK, ${fail} FALLOS ────────`)
if (fail > 0) process.exit(1)
