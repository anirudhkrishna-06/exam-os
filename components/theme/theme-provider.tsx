'use client'

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

export type ThemePreference = 'system' | 'light' | 'dark'

type ThemeContextValue = {
  preference: ThemePreference
  resolvedTheme: 'light' | 'dark'
  setPreference: (preference: ThemePreference) => void
}

const STORAGE_KEY = 'examos:theme'
const ThemeContext = createContext<ThemeContextValue | null>(null)

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(preference: ThemePreference, resolvedTheme?: 'light' | 'dark') {
  const theme = resolvedTheme ?? (preference === 'system' ? getSystemTheme() : preference)
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.dataset.theme = theme
  root.style.colorScheme = theme
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light'
    const saved = window.localStorage.getItem(STORAGE_KEY)
    const nextPreference: ThemePreference = saved === 'light' || saved === 'dark' ? saved : 'system'
    return nextPreference === 'system' ? getSystemTheme() : nextPreference
  })
  const preferenceRef = useRef(preference)

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    const nextPreference: ThemePreference = saved === 'light' || saved === 'dark' ? saved : 'system'
    preferenceRef.current = nextPreference
    // The persisted preference is external state; hydrate it once after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreferenceState(nextPreference)
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const sync = () => {
      const activePreference = preferenceRef.current
      const nextTheme = activePreference === 'system' ? (media.matches ? 'dark' : 'light') : activePreference
      setResolvedTheme(nextTheme)
      applyTheme(activePreference, nextTheme)
    }
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  function setPreference(nextPreference: ThemePreference) {
    const nextTheme = nextPreference === 'system' ? getSystemTheme() : nextPreference
    window.localStorage.setItem(STORAGE_KEY, nextPreference)
    preferenceRef.current = nextPreference
    setPreferenceState(nextPreference)
    setResolvedTheme(nextTheme)
    applyTheme(nextPreference, nextTheme)
  }

  const value = useMemo(() => ({ preference, resolvedTheme, setPreference }), [preference, resolvedTheme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside ThemeProvider')
  return context
}
