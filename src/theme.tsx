import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// TEMA (claro / oscuro) — tokens del handoff de diseño "Mundialiten WC26".
// La identidad es cálida (crema en claro, marrón muy oscuro en oscuro) con una
// paleta de acentos multicolor. La regla de oro del proyecto: ante diseño vs
// funcionalidad, gana la funcionalidad — por eso esto es sólo presentación.
// ─────────────────────────────────────────────────────────────────────────────

export interface ThemeTokens {
  page: string
  canvas: string
  surface: string
  surface2: string
  text: string
  muted: string
  faint: string
  line: string
  cardGrad: string
  goldText: string
  shadow: string
}

const LIGHT: ThemeTokens = {
  page: '#E8DCC2',
  canvas: '#FBF6EA',
  surface: '#FFFDF6',
  surface2: '#F3EAD4',
  text: '#1C160C',
  muted: '#897B58',
  faint: '#B6A57E',
  line: '#E7DBC0',
  cardGrad: 'linear-gradient(160deg, #FFFDF6, #F6EEDA)',
  goldText: '#B07D08',
  shadow: '0 12px 30px -18px rgba(120,90,30,.45)',
}

const DARK: ThemeTokens = {
  page: '#0C0904',
  canvas: '#191309',
  surface: '#241B0E',
  surface2: '#2E2312',
  text: '#F5ECD8',
  muted: '#A8997C',
  faint: '#776A52',
  line: 'rgba(255,236,200,.12)',
  cardGrad: 'linear-gradient(160deg, rgba(46,35,18,.85), rgba(25,19,9,.9))',
  goldText: '#FFCF45',
  shadow: '0 14px 34px -18px rgba(0,0,0,.8)',
}

/** Acentos multicolor del diseño (constantes, no dependen del tema). */
export const ACCENT = {
  blue: '#2F6DF0',
  purple: '#7B3FF2',
  pink: '#EC1C7D',
  hotpink: '#FF4DA6',
  orange: '#FF7A1A',
  gold: '#FFC21A',
  green: '#1FA85C',
  greenSoft: '#34d27a',
  red: '#E5322B',
  teal: '#16A8E0',
} as const

/** Paleta del mosaico de las bandas laterales. */
export const PAL = [
  '#FFC21A',
  '#FF7A1A',
  '#EC1C7D',
  '#FF4DA6',
  '#2F6DF0',
  '#16A8E0',
  '#10B6A8',
  '#1FA85C',
  '#7B3FF2',
  '#E5322B',
]

interface ThemeCtx {
  dark: boolean
  toggle: () => void
  setDark: (v: boolean) => void
  c: ThemeTokens
}

const ThemeContext = createContext<ThemeCtx | null>(null)
const STORAGE_KEY = 'mundialiten-theme'

function initialDark(): boolean {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'dark') return true
    if (saved === 'light') return false
  } catch {
    /* noop */
  }
  return false // claro por defecto (identidad crema del diseño)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDarkState] = useState<boolean>(initialDark)
  const c = dark ? DARK : LIGHT

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
    // Sin transición en el fondo de página al cambiar de tema (regla del handoff).
    document.body.style.background = c.page
    document.body.style.color = c.text
  }, [dark, c.page, c.text])

  const setDark = (v: boolean) => {
    setDarkState(v)
    try {
      localStorage.setItem(STORAGE_KEY, v ? 'dark' : 'light')
    } catch {
      /* noop */
    }
  }
  const toggle = () => setDark(!dark)

  return <ThemeContext.Provider value={{ dark, toggle, setDark, c }}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme fuera de ThemeProvider')
  return ctx
}
