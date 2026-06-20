import { useState } from 'react'
import { TabBar } from './components/TabBar'
import { CalendarView } from './components/CalendarView'
import { GroupsView } from './components/GroupsView'
import { BracketView } from './components/BracketView'
import { AccuracyView } from './components/AccuracyView'
import { ResultEditor } from './components/ResultEditor'
import { LiveSyncBar } from './components/LiveSyncBar'
import { RankingView } from './components/RankingView'
import { useActiveContext, useLiveSyncPolling } from './hooks'
import { useAuth } from './auth'
import { useSupabaseSync } from './lib/sync'
import { useT, type Lang } from './i18n'
import { HowToPlay } from './components/HowToPlay'
import { Emblem } from './components/Emblem'
import { Band } from './components/Bands'
import { useTheme } from './theme'
import { useIsDesktop } from './hooks/useIsDesktop'

type View = 'calendario' | 'grupos' | 'llaves' | 'precision' | 'ranking'

const NAV: { id: View; es: string; en: string }[] = [
  { id: 'calendario', es: 'Calendario', en: 'Calendar' },
  { id: 'grupos', es: 'Grupos', en: 'Groups' },
  { id: 'llaves', es: 'Llaves', en: 'Bracket' },
  { id: 'precision', es: 'Precisión', en: 'Accuracy' },
  { id: 'ranking', es: 'Ranking', en: 'Ranking' },
]

const LANGS: { id: Lang; flag: string }[] = [
  { id: 'es', flag: '🇪🇸' },
  { id: 'en', flag: '🇬🇧' },
]

export default function App() {
  const [view, setView] = useState<View>('calendario')
  const [editingMatch, setEditingMatch] = useState<number | null>(null)
  const ctx = useActiveContext()
  const { enabled, user, displayName, signOut } = useAuth()
  const { t, lang, setLang } = useT()
  const { c, dark, toggle } = useTheme()
  const isDesktop = useIsDesktop()
  useLiveSyncPolling()
  useSupabaseSync()

  const name = (enabled && user && displayName) || 'Invitado'
  const initial = name.slice(0, 1).toUpperCase()

  const pageStyle: React.CSSProperties = {
    minHeight: '100vh',
    width: '100%',
    display: 'flex',
    alignItems: 'stretch',
    justifyContent: 'center',
    fontFamily: "'Twemoji Country Flags', 'Noto Sans', system-ui, sans-serif",
    color: c.text,
    backgroundColor: c.page,
  }
  const canvasStyle: React.CSSProperties = {
    position: 'relative',
    flex: isDesktop ? '0 1 1120px' : '0 1 472px',
    width: '100%',
    maxWidth: isDesktop ? 1120 : 472,
    minWidth: 0,
    backgroundColor: c.canvas,
    padding: isDesktop ? '26px 32px 44px' : '18px 16px 34px',
    overflow: 'hidden',
    boxShadow: dark ? '0 0 60px -10px rgba(0,0,0,.7)' : '0 0 60px -16px rgba(120,90,30,.3)',
  }
  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '13px 14px',
    borderRadius: '18px',
    background: c.cardGrad,
    border: '1px solid ' + c.line,
    boxShadow: c.shadow,
  }
  const bodyWrapStyle: React.CSSProperties = isDesktop
    ? { display: 'flex', gap: '28px', alignItems: 'flex-start', marginTop: '20px' }
    : { display: 'block' }
  const sidebarStyle: React.CSSProperties = isDesktop
    ? { width: '252px', flex: 'none', position: 'sticky', top: '20px', display: 'flex', flexDirection: 'column' }
    : {}
  const sectionNavStyle: React.CSSProperties = isDesktop
    ? { display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid ' + c.line }
    : { display: 'flex', gap: '7px', marginTop: '13px', overflowX: 'auto', padding: '3px 2px 4px' }
  const mainStyle: React.CSSProperties = {
    flex: isDesktop ? '1 1 0' : 'none',
    minWidth: 0,
    marginTop: isDesktop ? 0 : '6px',
    animation: 'mdlUp .34s ease both',
  }

  const sectionBtn = (active: boolean): React.CSSProperties =>
    isDesktop
      ? {
          width: '100%',
          textAlign: 'left',
          fontFamily: "'Archivo'",
          fontSize: '13.5px',
          fontWeight: 700,
          cursor: 'pointer',
          padding: '11px 15px',
          borderRadius: '12px',
          transition: 'all .18s ease',
          color: active ? (dark ? '#0C0904' : '#FBF6EA') : c.text,
          background: active ? c.text : dark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.035)',
          border: '1px solid ' + (active ? c.text : c.line),
        }
      : {
          flex: 'none',
          whiteSpace: 'nowrap',
          fontFamily: "'Archivo'",
          fontSize: '12.5px',
          fontWeight: 700,
          cursor: 'pointer',
          padding: '8px 15px',
          borderRadius: '99px',
          transition: 'all .2s ease',
          color: active ? (dark ? '#0C0904' : '#FBF6EA') : c.text,
          background: active ? c.text : dark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.04)',
          border: '1px solid ' + (active ? c.text : c.line),
        }

  return (
    <div style={pageStyle}>
      <Band offset={0} dark={dark} />

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
        <header style={headerStyle}>
          <div style={{ width: 50, height: 50, flex: 'none', filter: 'drop-shadow(0 4px 10px rgba(124,63,242,.4))' }}>
            <Emblem size={50} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Archivo'", fontWeight: 900, fontSize: '18px', lineHeight: 1, letterSpacing: '-.3px', color: c.text }}>
              MUNDIALITEN
            </div>
            <div style={{ fontSize: '11px', color: c.muted, fontWeight: 700, letterSpacing: '.3px', marginTop: '3px' }}>
              {t('Mundial 2026', 'World Cup 2026')} · 🇺🇸 🇨🇦 🇲🇽
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flex: 'none' }}>
            <div
              style={{
                display: 'flex',
                background: dark ? 'rgba(0,0,0,.3)' : 'rgba(0,0,0,.04)',
                border: '1px solid ' + c.line,
                borderRadius: '11px',
                padding: '3px',
                gap: '2px',
              }}
            >
              {LANGS.map((l) => {
                const active = lang === l.id
                return (
                  <button
                    key={l.id}
                    onClick={() => setLang(l.id)}
                    style={{
                      fontSize: '13px',
                      lineHeight: 1,
                      padding: '5px 8px',
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
            <button
              onClick={toggle}
              title={dark ? t('Modo claro', 'Light mode') : t('Modo oscuro', 'Dark mode')}
              style={{
                width: '34px',
                height: '34px',
                flex: 'none',
                borderRadius: '11px',
                cursor: 'pointer',
                fontSize: '15px',
                border: '1px solid ' + c.line,
                background: dark ? 'rgba(255,194,26,.14)' : 'rgba(47,109,240,.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {dark ? '☀️' : '🌙'}
            </button>
          </div>
        </header>

        {/* USER CARD */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '12px', padding: '0 2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                flex: 'none',
                background: 'linear-gradient(135deg,#FF7A1A,#EC1C7D)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '15px',
                fontFamily: "'Archivo'",
                fontWeight: 900,
                color: '#fff',
              }}
            >
              {initial}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: c.text, lineHeight: 1 }}>{name}</div>
              {enabled && user ? (
                <button
                  onClick={() => signOut()}
                  style={{ fontSize: '10.5px', color: c.muted, fontWeight: 700, marginTop: '2px', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                >
                  {t('Salir', 'Sign out')}
                </button>
              ) : (
                <div style={{ fontSize: '10.5px', color: c.muted, fontWeight: 700, marginTop: '2px' }}>
                  {t('Modo local', 'Local mode')}
                </div>
              )}
            </div>
          </div>
          <HowToPlay />
        </div>

        {/* BODY */}
        <div style={bodyWrapStyle}>
          <div style={sidebarStyle}>
            <TabBar />
            <div style={sectionNavStyle} className="mdl-noscroll">
              {NAV.map((n) => (
                <button key={n.id} onClick={() => setView(n.id)} style={sectionBtn(view === n.id)}>
                  {lang === 'en' ? n.en : n.es}
                </button>
              ))}
            </div>
          </div>

          <main style={mainStyle} key={view}>
            {view === 'calendario' && <CalendarView ctx={ctx} onEdit={setEditingMatch} />}
            {view === 'grupos' && <GroupsView ctx={ctx} />}
            {view === 'llaves' && <BracketView ctx={ctx} onEdit={setEditingMatch} />}
            {view === 'precision' && <AccuracyView />}
            {view === 'ranking' && <RankingView />}

            {ctx.scenario.type === 'real' && (
              <div style={{ marginTop: '14px' }}>
                <LiveSyncBar />
              </div>
            )}
          </main>
        </div>

        <div style={{ textAlign: 'center', marginTop: '22px', fontSize: '10px', color: c.faint, fontWeight: 600, letterSpacing: '.3px' }}>
          Mundialiten · {t('hecho por', 'made by')} Octavio Boggiano ·{' '}
          {ctx.resolution.bestThirds
            ? t('fase de grupos completa', 'group stage complete')
            : t('fase de grupos en curso', 'group stage in progress')}{' '}
          · v1.0.0
        </div>
      </div>

      <Band offset={5} dark={dark} />

      {editingMatch != null && (
        <ResultEditor matchId={editingMatch} ctx={ctx} onClose={() => setEditingMatch(null)} />
      )}
    </div>
  )
}
