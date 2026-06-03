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
import { useT } from './i18n'
import { LangToggle } from './components/LangToggle'
import { HowToPlay } from './components/HowToPlay'

type View = 'calendario' | 'grupos' | 'llaves' | 'precision' | 'ranking'

const NAV: { id: View; es: string; en: string; icon: string }[] = [
  { id: 'calendario', es: 'Calendario', en: 'Calendar', icon: '📅' },
  { id: 'grupos', es: 'Grupos', en: 'Groups', icon: '📊' },
  { id: 'llaves', es: 'Llaves', en: 'Bracket', icon: '🏆' },
  { id: 'precision', es: 'Precisión', en: 'Accuracy', icon: '🎯' },
  { id: 'ranking', es: 'Ranking', en: 'Ranking', icon: '🏅' },
]

export default function App() {
  const [view, setView] = useState<View>('calendario')
  const [editingMatch, setEditingMatch] = useState<number | null>(null)
  const ctx = useActiveContext()
  const { enabled, user, displayName, signOut } = useAuth()
  const { t, lang } = useT()
  useLiveSyncPolling()
  useSupabaseSync()

  return (
    <div className="min-h-full flex flex-col">
      <header className="bg-pitch-900/80 border-b border-white/10 sticky top-0 z-20 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <span className="text-2xl">⚽</span>
          <div className="leading-tight">
            <h1 className="font-bold text-lg">Mundialiten</h1>
            <p className="text-xs text-slate-400">
              {t('Mundial 2026 · calendario y predicciones', 'World Cup 2026 · calendar & predictions')}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs">
            <HowToPlay />
            <LangToggle />
            {enabled && user && (
              <>
                <span className="text-slate-300 hidden sm:inline">👤 {displayName}</span>
                <button
                  onClick={() => signOut()}
                  className="text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10"
                >
                  {t('Salir', 'Sign out')}
                </button>
              </>
            )}
          </div>
        </div>
        <TabBar />
      </header>

      <nav className="max-w-5xl w-full mx-auto px-2 sm:px-4 mt-3">
        <div className="flex gap-1 bg-slate-800/60 rounded-xl p-1">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setView(n.id)}
              className={`flex-1 px-2 py-2 rounded-lg text-sm font-medium transition ${
                view === n.id
                  ? 'bg-pitch-500 text-white shadow'
                  : 'text-slate-300 hover:bg-slate-700/60'
              }`}
            >
              <span className="mr-1">{n.icon}</span>
              <span className="hidden xs:inline sm:inline">{lang === 'en' ? n.en : n.es}</span>
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-5xl w-full mx-auto px-2 sm:px-4 py-4 flex-1">
        {view === 'calendario' && <CalendarView ctx={ctx} onEdit={setEditingMatch} />}
        {view === 'grupos' && <GroupsView ctx={ctx} />}
        {view === 'llaves' && <BracketView ctx={ctx} onEdit={setEditingMatch} />}
        {view === 'precision' && <AccuracyView />}
        {view === 'ranking' && <RankingView />}
      </main>

      {ctx.scenario.type === 'real' && (
        <div className="max-w-5xl w-full mx-auto px-2 sm:px-4 mt-2">
          <LiveSyncBar />
        </div>
      )}

      <footer className="max-w-5xl w-full mx-auto px-4 py-6 text-center text-xs text-slate-500">
        <div>
          {t('Datos guardados en este navegador', 'Data saved in this browser')} ·{' '}
          {ctx.resolution.bestThirds
            ? t('fase de grupos completa', 'group stage complete')
            : t('fase de grupos en curso', 'group stage in progress')}{' '}
          · v2.6
        </div>
        <div className="mt-1 text-slate-600">{t('hecho por', 'made by')} Octavio Boggiano</div>
      </footer>

      {editingMatch != null && (
        <ResultEditor matchId={editingMatch} ctx={ctx} onClose={() => setEditingMatch(null)} />
      )}
    </div>
  )
}
