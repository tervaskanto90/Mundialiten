import { useStore, getScenario, REAL_SCENARIO_ID } from '../store/useStore'
import { STAGING, KO_BUCKETS, openKnockoutBucket, simulateBucketResults, simulatedGroupResults } from '../staging'
import type { MatchResult } from '../types'
import type { BucketId } from '../utils/stage'
import { useTheme, ACCENT } from '../theme'

const LABEL: Record<BucketId, string> = {
  group: 'Grupos',
  r32: '16avos',
  r16: '8vos',
  qf: '4tos',
  finals: 'Semis/Final',
}

function nextOf(b: BucketId): BucketId | null {
  const i = KO_BUCKETS.indexOf(b)
  return i >= 0 && i < KO_BUCKETS.length - 1 ? KO_BUCKETS[i + 1] : null
}

/**
 * Panel de control SÓLO de staging (sandbox). Permite "jugar" cada ronda de
 * eliminatoria: simula los resultados reales de la ronda abierta (local, nunca a
 * Supabase) para abrir la siguiente y poder predecirla. Reset vuelve a 16avos.
 */
export function StagingControls() {
  const { c, dark } = useTheme()
  const results = useStore((s) => getScenario(s.scenarios, REAL_SCENARIO_ID)?.results ?? {})
  if (!STAGING) return null

  const open = openKnockoutBucket(results)
  const next = open ? nextOf(open) : null

  const mergeReal = (upd: Record<number, MatchResult>) =>
    useStore.setState((s) => ({
      scenarios: s.scenarios.map((sc) =>
        sc.id === REAL_SCENARIO_ID ? { ...sc, results: { ...sc.results, ...upd } } : sc,
      ),
    }))

  const simulate = () => {
    if (open) mergeReal(simulateBucketResults(open))
  }
  const reset = () =>
    useStore.setState((s) => ({
      scenarios: s.scenarios.map((sc) =>
        sc.id === REAL_SCENARIO_ID ? { ...sc, results: simulatedGroupResults() } : sc,
      ),
    }))

  const btn: React.CSSProperties = {
    fontFamily: "'Archivo'",
    fontWeight: 800,
    fontSize: 12,
    borderRadius: 10,
    padding: '8px 12px',
    cursor: 'pointer',
    width: '100%',
  }

  return (
    <div
      style={{
        position: 'fixed',
        right: 12,
        bottom: 12,
        zIndex: 70,
        width: 230,
        maxWidth: 'calc(100vw - 24px)',
        background: dark ? 'rgba(20,16,10,.96)' : 'rgba(255,255,255,.97)',
        border: '1px solid ' + ACCENT.red + '88',
        borderRadius: 14,
        boxShadow: '0 18px 40px -16px rgba(0,0,0,.6)',
        padding: 12,
        backdropFilter: 'blur(6px)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontFamily: "'Archivo'", fontWeight: 900, fontSize: 12, color: ACCENT.red }}>🧪 STAGING</span>
        <span style={{ fontSize: 10, color: c.muted }}>sandbox local</span>
      </div>

      {open ? (
        <>
          <div style={{ fontSize: 11, color: c.muted, marginBottom: 8 }}>
            Etapa abierta: <strong style={{ color: c.text }}>{LABEL[open]}</strong>. Predecila y después simulá
            los resultados para abrir la próxima.
          </div>
          <button onClick={simulate} style={{ ...btn, background: ACCENT.green, color: '#fff', marginBottom: 6 }}>
            {next ? `Simular ${LABEL[open]} → abrir ${LABEL[next]}` : `Simular ${LABEL[open]} 🏁`}
          </button>
        </>
      ) : (
        <div style={{ fontSize: 11, color: c.text, marginBottom: 8, fontWeight: 700 }}>
          ✓ Eliminatoria simulada completa
        </div>
      )}

      <button onClick={reset} style={{ ...btn, background: 'transparent', color: c.muted, border: '1px solid ' + c.line }}>
        ↺ Reiniciar a 16avos
      </button>
    </div>
  )
}
