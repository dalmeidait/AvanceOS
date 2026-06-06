import type { ReactNode } from 'react'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { readLocalPreference, writeLocalPreference } from '@/lib/storage'

type Theme = 'light' | 'dark'
type Density = 'compact' | 'comfortable' | 'spacious'

type ThemeContextValue = {
  theme: Theme
  density: Density
  isDark: boolean
  setTheme: (theme: Theme) => void
  setDensity: (density: Density) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)
const THEME_STORAGE_KEY = 'theme'
const DENSITY_STORAGE_KEY = 'density'

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  const stored = readLocalPreference(THEME_STORAGE_KEY)
  return stored === 'dark' ? 'dark' : 'light'
}

function readStoredDensity(): Density {
  if (typeof window === 'undefined') return 'comfortable'
  const stored = readLocalPreference(DENSITY_STORAGE_KEY)
  if (stored === 'compact' || stored === 'spacious') return stored
  return 'comfortable'
}

function applyTheme(theme: Theme, density: Density) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.dataset.density = density
  document.documentElement.style.colorScheme = theme
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme)
  const [density, setDensityState] = useState<Density>(readStoredDensity)

  useEffect(() => {
    applyTheme(theme, density)
    writeLocalPreference(THEME_STORAGE_KEY, theme)
    writeLocalPreference(DENSITY_STORAGE_KEY, density)
  }, [density, theme])

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      density,
      isDark: theme === 'dark',
      setTheme: setThemeState,
      setDensity: setDensityState,
      toggleTheme: () => setThemeState((current) => (current === 'dark' ? 'light' : 'dark')),
    }),
    [density, theme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside ThemeProvider')
  return context
}
