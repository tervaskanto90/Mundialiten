import { useT, type Lang } from '../i18n'

const OPTIONS: { lang: Lang; flag: string; label: string }[] = [
  { lang: 'es', flag: '🇪🇸', label: 'Español' },
  { lang: 'en', flag: '🇬🇧', label: 'English' },
]

export function LangToggle() {
  const { lang, setLang } = useT()
  return (
    <div className="flex items-center gap-0.5 bg-slate-800/70 rounded-lg p-0.5">
      {OPTIONS.map((o) => (
        <button
          key={o.lang}
          onClick={() => setLang(o.lang)}
          title={o.label}
          aria-label={o.label}
          className={`text-base leading-none px-1.5 py-1 rounded-md transition ${
            lang === o.lang ? 'bg-pitch-500/90 shadow' : 'opacity-50 hover:opacity-100'
          }`}
        >
          {o.flag}
        </button>
      ))}
    </div>
  )
}
