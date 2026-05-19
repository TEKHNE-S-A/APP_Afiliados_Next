import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useColorScheme } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { ThemeColors, LightColors, DarkColors } from './colors'
import { OsepLightColors, OsepDarkColors } from './osepColors'
import { CLIENT_ID } from '../config'

const THEME_STORAGE_KEY = '@app_theme_preference'

export type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeContextType {
  colors: ThemeColors
  mode: ThemeMode
  isDark: boolean
  setMode: (mode: ThemeMode) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType>({
  colors: LightColors,
  mode: 'system',
  isDark: false,
  setMode: () => {},
  toggleTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme()
  const [mode, setModeState] = useState<ThemeMode>('system')
  const [loaded, setLoaded] = useState(false)

  // Cargar preferencia guardada
  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setModeState(stored)
      }
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [])

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode)
    AsyncStorage.setItem(THEME_STORAGE_KEY, newMode).catch(console.warn)
  }, [])

  const toggleTheme = useCallback(() => {
    setMode(mode === 'dark' ? 'light' : mode === 'light' ? 'dark' : 'light')
  }, [mode, setMode])

  // Decidir si es dark basado en mode + preferencia del sistema
  const isDark = mode === 'dark' || (mode === 'system' && systemColorScheme === 'dark')

  // Seleccionar paleta según cliente activo
  let colors: ThemeColors
  if (CLIENT_ID === 'osep') {
    colors = isDark ? OsepDarkColors : OsepLightColors
  } else {
    colors = isDark ? DarkColors : LightColors
  }

  // No renderizar hasta cargar la preferencia para evitar flash
  if (!loaded) return null

  return (
    <ThemeContext.Provider value={{ colors, mode, isDark, setMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme debe usarse dentro de ThemeProvider')
  }
  return context
}
