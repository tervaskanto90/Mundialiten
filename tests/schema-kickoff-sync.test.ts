// Verifica que el mapa id→kickoff embebido en la función SQL recompute_all_scores
// (supabase/schema.sql) coincida EXACTAMENTE con el calendario. Así el servidor
// elige bien el "último partido" por hora de inicio (los nº no son cronológicos).
import { readFileSync } from 'node:fs'
import { MATCHES } from '../src/data/schedule'

let pass = 0, fail = 0
function check(name: string, cond: boolean, extra = '') {
  if (cond) pass++; else { fail++; console.log(`  ❌ ${name} ${extra}`) }
}

const sql = readFileSync('supabase/schema.sql', 'utf8')
const block = sql.match(/ko\(mid, ts\) as \(values([\s\S]*?)\n\s*\),\n\s*lastm as/)
check('encontró el bloque ko(mid, ts) en schema.sql', !!block)

const pairs = new Map<number, number>()
if (block) {
  const re = /\((\d+),(\d+)\)/g
  let g: RegExpExecArray | null
  while ((g = re.exec(block[1]))) pairs.set(Number(g[1]), Number(g[2]))
}
check('104 pares (id, kickoff)', pairs.size === 104, `got ${pairs.size}`)

let mismatches = 0
for (const m of MATCHES) {
  if (pairs.get(m.id) !== Date.parse(m.kickoff)) {
    mismatches++
    if (mismatches <= 3) console.log(`   m${m.id}: sql=${pairs.get(m.id)} real=${Date.parse(m.kickoff)}`)
  }
}
check('kickoffs del SQL == calendario', mismatches === 0, `${mismatches} distintos`)

// El bug concreto: el partido 13 (Bélgica) arranca DESPUÉS del 14 (España), así
// que el "último" jugado entre ambos es el 13 (no el de mayor número).
check('M13 arranca después del M14 (no alcanza con max(id))', (pairs.get(13) ?? 0) > (pairs.get(14) ?? 0))

console.log(`\n──────── KICKOFF SYNC (SQL ↔ calendario): ${pass} OK, ${fail} FALLOS ────────`)
if (fail > 0) process.exit(1)
