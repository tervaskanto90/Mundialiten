import { useTheme } from '../theme'
import { useT } from '../i18n'

// ─────────────────────────────────────────────────────────────────────────────
// "Mira otras cosas que construí": réplica de las tarjetas del portfolio, con la
// parte visual en movimiento. Se usa en el login (columna derecha) y en el menú
// hamburguesa del home (arriba del sincronizador).
// ─────────────────────────────────────────────────────────────────────────────

const SITE = 'https://oboggiano.vercel.app'

interface Project {
  name: string
  tagline: string
  desc: string
  tags: string[]
  link: string
  visual: 'cve' | 'wave' | 'nix' | 'pitch'
}

const PROJECTS: Project[] = [
  {
    name: 'CVE Intelligence',
    tagline: 'AI-powered vulnerability intelligence',
    desc: 'A platform that tracks, enriches and prioritizes CVEs with AI — turning raw vulnerability feeds into actionable intelligence for security teams.',
    tags: ['TypeScript', 'Next.js', 'AI', 'Security'],
    link: SITE,
    visual: 'cve',
  },
  {
    name: 'Fantasy Writer',
    tagline: 'An AI co-author for fantasy fiction',
    desc: 'A writing studio where AI helps worldbuild, outline and draft fantasy stories — storytelling and LLMs working in the same document.',
    tags: ['TypeScript', 'Next.js', 'LLM', 'Creative AI'],
    link: SITE,
    visual: 'wave',
  },
  {
    name: 'Nix it!',
    tagline: 'Your subscriptions, under control',
    desc: 'An app to track and manage your subscriptions — see exactly what you pay, spot what you no longer use, and nix it before the next renewal.',
    tags: ['TypeScript', 'Next.js', 'Productivity'],
    link: SITE,
    visual: 'nix',
  },
]

export function ProjectsShowcase({ compact = false }: { compact?: boolean }) {
  const { c } = useTheme()
  const { t } = useT()
  return (
    <div>
      <a href={SITE} target="_blank" rel="noopener noreferrer" className="block mb-3">
        <div className="font-bold flex items-center gap-1.5" style={{ fontFamily: "'Archivo'", color: c.text, fontSize: '14px' }}>
          🛠️ {t('Mirá otras cosas que construí', 'Other things I’ve built')} <span style={{ color: c.muted }}>↗</span>
        </div>
        <div className="text-[11px]" style={{ color: c.muted }}>{t('Proyectos de Octavio Boggiano', 'Projects by Octavio Boggiano')}</div>
      </a>
      <div className="flex flex-col gap-2.5">
        {PROJECTS.map((p) => (
          <ProjectCard key={p.name} p={p} compact={compact} />
        ))}
      </div>
    </div>
  )
}

function ProjectCard({ p, compact }: { p: Project; compact: boolean }) {
  const { c, dark } = useTheme()
  return (
    <a
      href={p.link}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl overflow-hidden transition"
      style={{ background: c.cardGrad, border: '1px solid ' + c.line, boxShadow: c.shadow }}
    >
      <div className="px-2.5 pt-2.5">
        <Visual kind={p.visual} dark={dark} compact={compact} />
      </div>
      <div className="px-3 pb-2.5 pt-2">
        <div className="flex items-center justify-between">
          <div className="font-bold" style={{ fontFamily: "'Archivo'", color: c.text, fontSize: '14px' }}>{p.name}</div>
          <span style={{ color: c.muted }}>↗</span>
        </div>
        <div className="text-[9.5px] uppercase tracking-wide font-bold mt-0.5" style={{ color: c.faint }}>{p.tagline}</div>
        <div className="flex flex-wrap gap-1 mt-2">
          {p.tags.map((tg) => (
            <span key={tg} className="text-[8.5px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full" style={{ color: c.muted, border: '1px solid ' + c.line }}>
              {tg}
            </span>
          ))}
        </div>
      </div>
    </a>
  )
}

function Visual({ kind, dark, compact }: { kind: Project['visual']; dark: boolean; compact: boolean }) {
  const h = compact ? 58 : 70
  const box: React.CSSProperties = {
    height: h,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    background: dark ? 'rgba(0,0,0,.35)' : 'rgba(20,16,40,.92)',
    border: '1px solid rgba(255,255,255,.08)',
  }
  if (kind === 'cve') {
    const cols = 13
    const rows = 3
    const palette = ['#2F6DF0', '#7B3FF2', '#EC1C7D', '#FF7A1A', '#FFC21A', '#1FA85C', '#16A8E0']
    return (
      <div style={box}>
        <div style={{ position: 'absolute', inset: '10px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          {Array.from({ length: rows }).map((_, r) => (
            <div key={r} style={{ display: 'flex', justifyContent: 'space-between' }}>
              {Array.from({ length: cols }).map((_, ci) => {
                const on = (r * 7 + ci * 5) % 3 === 0
                return <span key={ci} style={{ width: 4, height: 4, borderRadius: '50%', background: on ? palette[(r + ci) % palette.length] : 'rgba(255,255,255,.18)' }} />
              })}
            </div>
          ))}
        </div>
        <div style={{ position: 'absolute', left: 8, right: 8, height: 2, background: 'linear-gradient(90deg,transparent,#16A8E0,transparent)', animation: 'mdlScanLine 2.6s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', left: 10, bottom: 5, fontSize: 8, fontFamily: 'monospace', color: '#16A8E0', animation: 'mdlBlink 1.4s ease-in-out infinite' }}>
          CVE-2026-•••• · ANALYZING
        </div>
      </div>
    )
  }
  if (kind === 'wave') {
    return (
      <div style={box}>
        <svg width="520" height={h} viewBox={`0 0 520 ${h}`} style={{ position: 'absolute', left: 0, top: 0, animation: 'mdlWaveSlide 4s linear infinite' }}>
          <path
            d={`M0 ${h / 2} q 32.5 -22 65 0 t 65 0 t 65 0 t 65 0 t 65 0 t 65 0 t 65 0 t 65 0`}
            fill="none"
            stroke="#FF4DA6"
            strokeWidth="3"
            strokeLinecap="round"
            style={{ filter: 'drop-shadow(0 0 6px rgba(255,77,166,.8))' }}
          />
        </svg>
      </div>
    )
  }
  if (kind === 'nix') {
    const subs = [
      { name: 'Streaming', price: '$12.99', cut: false },
      { name: 'Cloud drive', price: '$4.99', cut: true },
      { name: 'News+', price: '$8.00', cut: false },
    ]
    return (
      <div style={{ ...box, padding: '8px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
        {subs.map((s) => (
          <div key={s.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,.82)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, border: '1px solid rgba(255,255,255,.4)', background: s.cut ? 'rgba(255,255,255,.25)' : 'transparent' }} />
              <span style={{ position: 'relative' }}>
                {s.name}
                {s.cut && <span style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1.5, background: '#EC1C7D', transformOrigin: 'left', animation: 'mdlStrike 3s ease-in-out infinite' }} />}
              </span>
            </span>
            <span style={{ color: 'rgba(255,255,255,.6)' }}>{s.price}</span>
          </div>
        ))}
      </div>
    )
  }
  // pitch
  return (
    <div style={box}>
      <svg width="100%" height={h} viewBox="0 0 200 80" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
        <rect x="6" y="6" width="188" height="68" rx="4" fill="none" stroke="rgba(31,168,92,.7)" strokeWidth="1.2" />
        <line x1="100" y1="6" x2="100" y2="74" stroke="rgba(31,168,92,.7)" strokeWidth="1.2" />
        <circle cx="100" cy="40" r="13" fill="none" stroke="rgba(31,168,92,.7)" strokeWidth="1.2" />
        <rect x="6" y="24" width="16" height="32" fill="none" stroke="rgba(31,168,92,.7)" strokeWidth="1.2" />
        <rect x="178" y="24" width="16" height="32" fill="none" stroke="rgba(31,168,92,.7)" strokeWidth="1.2" />
      </svg>
      <span style={{ position: 'absolute', width: 7, height: 7, borderRadius: '50%', background: '#fff', boxShadow: '0 0 8px rgba(255,255,255,.9)', animation: 'mdlBall 4.5s ease-in-out infinite' }} />
    </div>
  )
}
