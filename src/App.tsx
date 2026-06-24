import { useState, useEffect } from 'react'
import { ScenarioToggle } from './components/ScenarioToggle'
import { LiveBanner } from './components/LiveBanner'
import { AccountModal } from './components/AccountModal'
import { ProjectsShowcase } from './components/ProjectsShowcase'
import { FixtureView } from './components/FixtureView'
import { AccuracyView } from './components/AccuracyView'
import { ResultEditor } from './components/ResultEditor'
import { LiveSyncBar } from './components/LiveSyncBar'
import { RankingView } from './components/RankingView'
import { HomeView } from './components/HomeView'
import { HeaderScore } from './components/HeaderScore'
import { Avatar } from './components/Avatar'
import { useActiveContext, useLiveSyncPolling } from './hooks'
import { useStore, getScenario, REAL_SCENARIO_ID } from './store/useStore'
import { useAuth } from './auth'
import { useSupabaseSync } from './lib/sync'
import { useT, type Lang } from './i18n'
import { HowToPlay } from './components/HowToPlay'
import { HeaderBrand } from './components/HeaderBrand'
import { Drawer } from './components/Drawer'
import { Band } from './components/Bands'
import { useTheme } from './theme'
import { useIsDesktop } from './hooks/useIsDesktop'
import { useBranding } from './lib/branding'

type View = 'home' | 'fixture' | 'precision' | 'ranking'

const NAV: { id: View; es: string; en: string; icon: string }[] = [
  { id: 'home', es: 'Inicio', en: 'Home', icon: '🏠' },
  { id: 'fixture', es: 'Fixture y Tablas', en: 'Fixtures & Tables', icon: '🗓️' },
  { id: 'precision', es: 'Estadísticas', en: 'Stats', icon: '📊' },
  { id: 'ranking', es: 'Ranking', en: 'Ranking', icon: '🏆' },
]

const LANGS: { id: Lang; flag: string }[] = [
  { id: 'es', flag: '🇪🇸' },
  { id: 'en', flag: '🇬🇧' },
]

export default function App() {
  const [view, setView] = useState<View>('home')
  const [editingMatch, setEditingMatch] = useState<number | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const ctx = useActiveContext()
  const { enabled, user, displayName, avatarUrl } = useAuth()
  const { t, lang, setLang } = useT()
  const { c, dark, toggle } = useTheme()
  const isDesktop = useIsDesktop()
  const [branding, setBranding] = useBranding()
  const realScenario = useStore((s) => getScenario(s.scenarios, REAL_SCENARIO_ID))
  const realResults = realScenario?.results ?? {}
  useLiveSyncPolling()
  useSupabaseSync()

  // Favicon = imagen del sitio en modo oscuro (o la clara si no hay oscura).
  useEffect(() => {
    const icon = branding.dark || branding.light
    if (!icon) return
    let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = icon
  }, [branding.dark, branding.light])

  const name = (enabled && user && displayName) || 'Invitado'

  // Escala de la barra de arriba (la define el admin, la ven todos). Acota.
  const hs = Math.min(1.6, Math.max(1, branding.scale || 1))
  const px = (n: number) => `${Math.round(n * hs)}px`

  const pageStyle: React.CSSProperties = {
    height: isDesktop ? '100vh' : undefined,
    minHeight: '100vh',
    width: '100%',
    display: 'flex',
    alignItems: 'stretch',
    justifyContent: 'center',
    overflow: isDesktop ? 'hidden' : undefined,
    fontFamily: "'Twemoji Country Flags', 'Noto Sans', system-ui, sans-serif",
    color: c.text,
    backgroundColor: c.page,
  }
  const canvasStyle: React.CSSProperties = {
    position: 'relative',
    flex: isDesktop ? '0 1 1600px' : '0 1 472px',
    width: '100%',
    maxWidth: isDesktop ? 1600 : 472,
    minWidth: 0,
    height: isDesktop ? '100vh' : undefined,
    display: isDesktop ? 'flex' : 'block',
    flexDirection: 'column',
    backgroundColor: c.canvas,
    padding: isDesktop ? '24px 32px 0' : '14px 14px 34px',
    overflow: isDesktop ? 'hidden' : 'visible',
    boxShadow: dark ? '0 0 60px -10px rgba(0,0,0,.7)' : '0 0 60px -16px rgba(120,90,30,.3)',
  }
  const headerStyle: React.CSSProperties = {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: px(14),
    padding: `${px(16)} ${px(16)}`,
    borderRadius: '18px',
    background: c.cardGrad,
    border: '1px solid ' + c.line,
    boxShadow: c.shadow,
  }
  const mainStyle: React.CSSProperties = isDesktop
    ? { flex: '1 1 0', minWidth: 0, marginTop: '16px', overflowY: 'auto', paddingRight: '8px', paddingBottom: '32px', animation: 'mdlUp .34s ease both' }
    : { flex: 'none', minWidth: 0, marginTop: '12px', animation: 'mdlUp .34s ease both' }
  // En mobile, encabezado fijo (sticky) MÍNIMO: hamburguesa + logo + MUNDIALITEN,
  // y debajo el/los partidos en vivo. Todo lo demás (cuenta, escenario, idioma,
  // tema, cómo jugar) vive en el menú hamburguesa.
  const mobileHeaderStyle: React.CSSProperties = {
    position: 'sticky',
    top: 0,
    zIndex: 30,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: '9px',
    background: c.canvas,
    marginLeft: '-14px',
    marginRight: '-14px',
    padding: '11px 14px',
    borderBottom: '1px solid ' + c.line,
    boxShadow: dark ? '0 7px 16px -10px rgba(0,0,0,.85)' : '0 7px 16px -12px rgba(120,90,30,.5)',
  }

  // Botón de navegación dentro del menú hamburguesa (desktop y mobile).
  const drawerNavBtn = (active: boolean): React.CSSProperties => ({
    width: '100%',
    textAlign: 'left',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontFamily: "'Archivo'",
    fontSize: '14.5px',
    fontWeight: 700,
    cursor: 'pointer',
    padding: '12px 15px',
    borderRadius: '12px',
    transition: 'all .18s ease',
    color: active ? (dark ? '#0C0904' : '#FBF6EA') : c.text,
    background: active ? c.text : dark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.035)',
    border: '1px solid ' + (active ? c.text : c.line),
  })

  // Cluster de controles de la derecha del header (idioma + tema).
  const langToggle = (
    <div
      style={{
        display: 'flex',
        background: dark ? 'rgba(0,0,0,.3)' : 'rgba(0,0,0,.04)',
        border: '1px solid ' + c.line,
        borderRadius: '11px',
        padding: '3px',
        gap: '2px',
        flex: 'none',
      }}
    >
      {LANGS.map((l) => {
        const active = lang === l.id
        return (
          <button
            key={l.id}
            onClick={() => setLang(l.id)}
            style={{
              fontSize: px(13),
              lineHeight: 1,
              padding: `${px(5)} ${px(8)}`,
              borderRadius: '8px',
              cursor: 'pointer',
              border: 'none',
              transition: 'all .18s ease',
              background: active ? (dark ? 'rgba(255,194,26,.22)' : 'rgba(47,109,240,.16)') : 'transparent',
              filter: active ? 'none' : 'grayscale(.7) opacity(.5)',
              transform: active ? 'scale(1.05)' : 'scale(1)',
            }}
          >
            {l.flag}
          </button>
        )
      })}
    </div>
  )
  const themeBtn = (
    <button
      onClick={toggle}
      title={dark ? t('Modo claro', 'Light mode') : t('Modo oscuro', 'Dark mode')}
      style={{
        width: px(34),
        height: px(34),
        flex: 'none',
        borderRadius: '11px',
        cursor: 'pointer',
        fontSize: px(15),
        border: '1px solid ' + c.line,
        background: dark ? 'rgba(255,194,26,.14)' : 'rgba(47,109,240,.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {dark ? '☀️' : '🌙'}
    </button>
  )
  const hamburgerBtn = (
    <button
      onClick={() => setMenuOpen(true)}
      aria-label={t('Menú', 'Menu')}
      style={{
        width: px(40),
        height: px(40),
        flex: 'none',
        borderRadius: '12px',
        cursor: 'pointer',
        fontSize: px(18),
        border: '1px solid ' + c.line,
        background: dark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.04)',
        color: c.text,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      ☰
    </button>
  )
  const userChip = (
    <button
      onClick={() => setAccountOpen(true)}
      title={t('Mi cuenta', 'My account')}
      style={{ display: 'flex', alignItems: 'center', gap: '9px', flex: 'none', paddingLeft: '4px', background: 'none', border: 'none', cursor: 'pointer' }}
    >
      <div style={{ minWidth: 0, textAlign: 'right' }}>
        <div style={{ fontSize: '13px', fontWeight: 800, color: c.text, lineHeight: 1 }}>{name}</div>
        <div style={{ fontSize: '10.5px', color: c.muted, fontWeight: 700, marginTop: '2px' }}>
          {enabled && user ? t('Mi cuenta', 'My account') : t('Modo local', 'Local mode')}
        </div>
      </div>
      <Avatar src={avatarUrl} name={name} size={38} radius={11} />
    </button>
  )

  return (
    <div style={pageStyle}>
      <Band offset={0} dark={dark} thin={!isDesktop} />

      <div style={canvasStyle}>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg,#2F6DF0,#7B3FF2,#EC1C7D,#FF7A1A,#FFC21A,#1FA85C)',
          }}
        />

        {/* HEADER */}
        {isDesktop ? (
          <header style={headerStyle}>
            {hamburgerBtn}
            <HeaderBrand branding={branding} onChange={setBranding} size={Math.round(52 * hs)} onClick={() => setView('home')} />
            <div style={{ minWidth: 0, cursor: 'pointer' }} onClick={() => setView('home')} title={t('Ir al inicio', 'Go home')}>
              <div style={{ fontFamily: "'Archivo'", fontWeight: 900, fontSize: px(18), lineHeight: 1, letterSpacing: '-.3px', color: c.text }}>
                MUNDIALITEN
              </div>
              <div style={{ fontSize: px(11), color: c.muted, fontWeight: 700, letterSpacing: '.3px', marginTop: '3px' }}>
                {t('Mundial 2026', 'World Cup 2026')} · 🇺🇸 🇨🇦 🇲🇽
                <a
                  href="https://oboggiano.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="oboggiano.vercel.app"
                  onClick={(e) => e.stopPropagation()}
                  style={{ color: '#5aa9f0', textDecoration: 'none', fontWeight: 700, marginLeft: 5 }}
                >
                  · {t('hecho por', 'made by')} Octavio Boggiano 🌐
                </a>
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', minWidth: 0, padding: '0 12px' }}>
              <HeaderScore ctx={ctx} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: px(8), flex: 'none' }}>
              <HowToPlay />
              {langToggle}
              {themeBtn}
              {userChip}
            </div>
          </header>
        ) : (
          // MOBILE: encabezado fijo MÍNIMO — sólo hamburguesa + logo + MUNDIALITEN.
          // Debajo, el/los partidos en vivo. Todo lo demás vive en el menú.
          <header style={mobileHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: px(11) }}>
              {hamburgerBtn}
              <HeaderBrand branding={branding} onChange={setBranding} size={Math.round(46 * hs)} onClick={() => setView('home')} />
              <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setView('home')}>
                <div style={{ fontFamily: "'Archivo'", fontWeight: 900, fontSize: px(18), lineHeight: 1, letterSpacing: '-.3px', color: c.text }}>
                  MUNDIALITEN
                </div>
                <div style={{ fontSize: px(11), color: c.muted, fontWeight: 700, letterSpacing: '.3px', marginTop: '3px' }}>
                  {t('Mundial 2026', 'World Cup 2026')} · 🇺🇸 🇨🇦 🇲🇽
                </div>
              </div>
            </div>
            <LiveBanner realResults={realResults} embedded />
          </header>
        )}

        {/* BODY */}
        {(() => {
          const drawerLabel: React.CSSProperties = {
            fontSize: '10.5px',
            fontWeight: 800,
            letterSpacing: '.6px',
            textTransform: 'uppercase',
            color: c.faint,
            margin: '2px 2px 8px',
          }
          const drawer = (
            <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} title={t('Menú', 'Menu')} footer={<LiveSyncBar />}>
              {/* En mobile, el menú concentra TODO lo que sacamos del encabezado:
                  cuenta, cómo jugar, escenario, idioma y tema. */}
              {!isDesktop && (
                <>
                  <button
                    onClick={() => {
                      setAccountOpen(true)
                      setMenuOpen(false)
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      textAlign: 'left',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      background: dark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.035)',
                      border: '1px solid ' + c.line,
                      marginBottom: '10px',
                    }}
                  >
                    <Avatar src={avatarUrl} name={name} size={38} radius={11} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13.5px', fontWeight: 800, color: c.text, lineHeight: 1.1, fontFamily: "'Archivo'" }}>{name}</div>
                      <div style={{ fontSize: '10.5px', color: c.muted, fontWeight: 700, marginTop: '2px' }}>
                        {enabled && user ? t('Mi cuenta', 'My account') : t('Modo local', 'Local mode')}
                      </div>
                    </div>
                    <span style={{ color: c.muted, fontSize: '16px', flex: 'none' }}>›</span>
                  </button>
                  <div style={{ marginBottom: '18px' }}>
                    <HowToPlay />
                  </div>
                </>
              )}

              <div style={drawerLabel}>{t('Sección', 'Section')}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '18px' }}>
                {NAV.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => {
                      setView(n.id)
                      setMenuOpen(false)
                    }}
                    style={drawerNavBtn(view === n.id)}
                  >
                    <span>{n.icon}</span> {lang === 'en' ? n.en : n.es}
                  </button>
                ))}
              </div>

              {!isDesktop && (
                <>
                  <div style={drawerLabel}>{t('Vista', 'View')}</div>
                  <div style={{ marginBottom: '18px' }}>
                    <ScenarioToggle compact />
                  </div>

                  <div style={drawerLabel}>{t('Preferencias', 'Preferences')}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {langToggle}
                    {themeBtn}
                  </div>
                </>
              )}

              <div style={{ marginTop: isDesktop ? 30 : 22, paddingTop: isDesktop ? 18 : 16, borderTop: '1px solid ' + c.line }}>
                {isDesktop ? <ProjectsShowcase tiny /> : <ProjectsShowcase micro />}
              </div>
            </Drawer>
          )
          const mainContent = (
            <main style={mainStyle} key={view}>
              {view === 'fixture' && (
                <div
                  style={
                    isDesktop
                      ? { position: 'sticky', top: 0, zIndex: 20, background: c.canvas, paddingTop: '2px', paddingBottom: '12px', marginBottom: '6px' }
                      : { marginBottom: '12px' }
                  }
                >
                  <ScenarioToggle />
                </div>
              )}
              {view === 'home' && <HomeView ctx={ctx} onJump={setView} onEditMatch={setEditingMatch} />}
              {view === 'fixture' && <FixtureView ctx={ctx} onEdit={setEditingMatch} />}
              {view === 'precision' && <AccuracyView />}
              {view === 'ranking' && <RankingView />}

              <div style={{ textAlign: 'center', marginTop: '22px', fontSize: '10px', color: c.faint, fontWeight: 600, letterSpacing: '.3px' }}>
                Mundialiten · {t('hecho por', 'made by')} Octavio Boggiano ·{' '}
                {ctx.resolution.bestThirds
                  ? t('fase de grupos completa', 'group stage complete')
                  : t('fase de grupos en curso', 'group stage in progress')}{' '}
                · v1.0.0
              </div>
            </main>
          )
          if (isDesktop) {
            return (
              <>
                {mainContent}
                {drawer}
              </>
            )
          }
          // ── MOBILE ── (el encabezado sticky de arriba ya tiene la hamburguesa)
          return (
            <>
              {drawer}
              {mainContent}
            </>
          )
        })()}
      </div>

      <Band offset={5} dark={dark} thin={!isDesktop} />

      {editingMatch != null && (
        <ResultEditor matchId={editingMatch} ctx={ctx} onClose={() => setEditingMatch(null)} />
      )}

      {accountOpen && <AccountModal onClose={() => setAccountOpen(false)} />}
    </div>
  )
}
