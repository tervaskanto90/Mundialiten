// Invariantes que, de fallar, romperían el gateo por etapas en silencio.
import { MATCHES } from '../src/data/schedule'
import { activeBucket, predictReason, bucketOf, BUCKET_ORDER, canPredict } from '../src/utils/stage'

let pass = 0, fail = 0
function check(name: string, cond: boolean, extra = '') {
  if (cond) pass++; else { fail++; console.log(`  ❌ ${name} ${extra}`) }
}
const T = (iso: string) => Date.parse(iso)

const first: Record<string, number> = {}, last: Record<string, number> = {}
for (const b of BUCKET_ORDER) { first[b] = Infinity; last[b] = -Infinity }
for (const m of MATCHES) {
  const b = bucketOf(m.stage); const k = T(m.kickoff)
  if (k < first[b]) first[b] = k
  if (k > last[b]) last[b] = k
}
console.log('Ventanas por bucket (UTC):')
for (const b of BUCKET_ORDER) console.log(`  ${b}: ${new Date(first[b]).toISOString()} → ${new Date(last[b]).toISOString()}`)

// A: los buckets no se solapan en el tiempo.
for (let i = 0; i < BUCKET_ORDER.length - 1; i++) {
  const a = BUCKET_ORDER[i], nx = BUCKET_ORDER[i + 1]
  check(`Bucket ${a} termina antes de que empiece ${nx}`, last[a] < first[nx])
}

// B: todo partido es predecible al menos a falta de 6 min.
const neverPredictable: number[] = []
for (const m of MATCHES) if (predictReason(m, T(m.kickoff) - 6 * 60_000) !== 'open') neverPredictable.push(m.id)
check('Todo partido es predecible a falta de 6 min', neverPredictable.length === 0, `impredecibles: ${neverPredictable.join(',')}`)

// C: sin huecos de etapa activa durante el torneo.
let holes = 0
const step = 30 * 60_000
for (let t = first.group; t <= last.finals; t += step) if (activeBucket(t) == null) holes++
check('Sin huecos de "etapa activa" durante el torneo', holes === 0, `huecos=${holes}`)

// D: activeBucket nunca retrocede.
let lastIdx = -1, monotonic = true
for (let t = first.group - 86400_000; t <= last.finals + 86400_000; t += step) {
  const ab = activeBucket(t)
  const idx = ab == null ? 999 : BUCKET_ORDER.indexOf(ab)
  if (idx < lastIdx) monotonic = false
  lastIdx = idx
}
check('activeBucket avanza monótonamente (nunca retrocede)', monotonic)

// E: todo partido predecible 10 min antes (cierre por partido independiente).
const badLockWindow: number[] = []
for (const m of MATCHES) if (!canPredict(m, T(m.kickoff) - 10 * 60_000)) badLockWindow.push(m.id)
check('Todo partido predecible 10 min antes', badLockWindow.length === 0, `${badLockWindow.join(',')}`)

console.log(`\n──────── INVARIANTES: ${pass} OK, ${fail} FALLOS ────────`)
if (fail > 0) process.exit(1)
