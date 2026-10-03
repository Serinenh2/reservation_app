/**
 * Light / dark / system theme.
 * Adds or removes the "dark" class on <html>; tokens.css does the rest.
 */
import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)
const media = () => window.matchMedia('(prefers-color-scheme: dark)')

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'system')

  useEffect(() => {
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media().matches)
      document.documentElement.classList.toggle('dark', dark)
    }
    apply()
    localStorage.setItem('theme', theme)
    if (theme !== 'system') return
    const mq = media()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
