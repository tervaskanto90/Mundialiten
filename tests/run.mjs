// Runner de pruebas de Mundialiten.
// No agrega dependencias: usa esbuild (ya presente vía vite) para transpilar
// cada *.test.ts y lo ejecuta en un proceso node. Falla si algún test falla.
import { build } from 'esbuild'
import { execFileSync } from 'node:child_process'
import { readdirSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = mkdtempSync(join(tmpdir(), 'mtest-'))
const tests = readdirSync(here).filter((f) => f.endsWith('.test.ts')).sort()

let failed = 0
for (const t of tests) {
  const out = join(outDir, t.replace(/\.ts$/, '.mjs'))
  await build({
    entryPoints: [join(here, t)],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: out,
    logLevel: 'error',
  })
  try {
    const stdout = execFileSync(process.execPath, [out], { encoding: 'utf8' })
    process.stdout.write(stdout)
  } catch (e) {
    if (e.stdout) process.stdout.write(e.stdout)
    if (e.stderr) process.stderr.write(e.stderr)
    failed++
  }
}

console.log(`\n════════ ${tests.length - failed}/${tests.length} suites OK ════════`)
process.exit(failed > 0 ? 1 : 0)
