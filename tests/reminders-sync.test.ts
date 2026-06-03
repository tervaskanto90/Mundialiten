// Verifica que api/remind.ts (autocontenido, lo que corre en Vercel) NO se
// desincronice de la fuente de verdad: mismos buckets que el calendario real y
// misma lógica/contenido que src/lib/reminders.ts.
import { MATCHES } from '../src/data/schedule'
import { bucketOf } from '../src/utils/stage'
import { planReminders as planSrc, buildReminderEmail as emailSrc } from '../src/lib/reminders'
import {
  REMIND_BUCKETS,
  BUCKET_ORDER,
  planReminders as planApi,
  buildReminderEmail as emailApi,
  activeBucket as activeApi,
} from '../api/remind'

let pass = 0, fail = 0
function check(name: string, cond: boolean, extra = '') {
  if (cond) pass++; else { fail++; console.log(`  ❌ ${name} ${extra}`) }
}

// 1) Los buckets embebidos coinciden con el calendario real.
for (const b of BUCKET_ORDER) {
  const ms = MATCHES.filter((m) => bucketOf(m.stage) === b)
  const ids = ms.map((m) => m.id).sort((a, z) => a - z)
  const ks = ms.map((m) => Date.parse(m.kickoff))
  const first = Math.min(...ks)
  const last = Math.max(...ks)
  check(`${b}: ids embebidos == calendario`, JSON.stringify(REMIND_BUCKETS[b].ids) === JSON.stringify(ids), `api=${REMIND_BUCKETS[b].ids.length} real=${ids.length}`)
  check(`${b}: primer kickoff == calendario`, REMIND_BUCKETS[b].first === first, `api=${new Date(REMIND_BUCKETS[b].first).toISOString()} real=${new Date(first).toISOString()}`)
  check(`${b}: último kickoff == calendario`, REMIND_BUCKETS[b].last === last, `api=${new Date(REMIND_BUCKETS[b].last).toISOString()} real=${new Date(last).toISOString()}`)
}

// 2) Paridad de planReminders (api vs src) en varios escenarios.
const T = (iso: string) => Date.parse(iso)
const played = { played: true }
const scenarios = [
  { now: T('2026-06-20T12:00:00Z'), userIds: ['u1'], sent: new Set<string>() },
  { now: T('2026-06-10T18:00:00Z'), userIds: ['u1'], sent: new Set(['u1|open']) },
  { now: T('2026-07-04T16:00:00Z'), userIds: ['a', 'b'], sent: new Set(['a|open']) },
  { now: T('2026-08-01T00:00:00Z'), userIds: ['u1'], sent: new Set<string>() },
]
for (let i = 0; i < scenarios.length; i++) {
  const s = scenarios[i]
  const predBy = new Map<string, Record<number, { played?: boolean }>>()
  const a = planApi({ now: s.now, userIds: s.userIds, predBy, sent: s.sent })
  const b = planSrc({ now: s.now, userIds: s.userIds, predBy, sent: s.sent })
  check(`planReminders paridad #${i + 1}`, JSON.stringify(a) === JSON.stringify(b), `api=${JSON.stringify(a.send)} src=${JSON.stringify(b.send)}`)
}
// Escenario con predicción parcial (last-call).
{
  const now = REMIND_BUCKETS.group.first - 25 * 3600_000
  const predBy = new Map<string, Record<number, { played?: boolean }>>([['u1', { 1: played }]])
  const a = planApi({ now, userIds: ['u1'], predBy, sent: new Set(['u1|open']) })
  const b = planSrc({ now, userIds: ['u1'], predBy, sent: new Set(['u1|open']) })
  check('planReminders paridad (last-call parcial)', JSON.stringify(a) === JSON.stringify(b))
}

// 3) Paridad de buildReminderEmail (api vs src).
const cases: Array<[any, any, string, string]> = [
  ['group', 'open', 'Octavio', 'https://x.vercel.app'],
  ['r16', 'lastcall', '', ''],
  ['finals', 'open', 'Gonzalo', 'https://x.vercel.app'],
]
for (const [bk, kind, name, urlv] of cases) {
  const a = emailApi(bk, kind, name, urlv)
  const b = emailSrc(bk, kind, name, urlv)
  check(`buildReminderEmail paridad ${bk}/${kind}`, JSON.stringify(a) === JSON.stringify(b))
}

// 4) activeBucket del api coincide con el calendario en fechas clave.
check('activeApi pre-Mundial = group', activeApi(T('2026-06-03T12:00:00Z')) === 'group')
check('activeApi durante r16 = r16', activeApi(T('2026-07-05T12:00:00Z')) === 'r16')
check('activeApi tras la final = null', activeApi(T('2026-07-20T00:00:00Z')) === null)

console.log(`\n──────── RECORDATORIOS (paridad api↔src): ${pass} OK, ${fail} FALLOS ────────`)
if (fail > 0) process.exit(1)
