import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { setLabelLang } from './utils/labels'

export type Lang = 'es' | 'en'

interface I18n {
  lang: Lang
  setLang: (l: Lang) => void
  /** Devuelve el texto en el idioma activo. */
  t: (es: string, en: string) => string
}

const I18nContext = createContext<I18n | null>(null)
const STORAGE_KEY = 'mundialiten-lang'

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'es' || saved === 'en') return saved
    // Por defecto: inglés si el navegador no es español.
    return navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'es'
  } catch {
    return 'es'
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)

  // Sincrónico para que las etiquetas fuera de React tomen el idioma al instante.
  setLabelLang(lang)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setLang = (l: Lang) => {
    setLabelLang(l)
    setLangState(l)
    try {
      localStorage.setItem(STORAGE_KEY, l)
    } catch {
      /* noop */
    }
  }

  const t = (es: string, en: string) => (lang === 'en' ? en : es)

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>
}

export function useT(): I18n {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useT fuera de I18nProvider')
  return ctx
}
