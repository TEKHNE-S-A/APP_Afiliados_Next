// Configuración central del cliente.
// Todas las variables se leen desde .env en la raíz de mobile/
// Ver .env.example para referencia de variables disponibles.

import { Platform } from 'react-native'
import * as Device from 'expo-device'
import {
  USE_MOCK as ENV_USE_MOCK,
  API_BASE_URL_ANDROID,
  API_BASE_URL_IOS,
  TIMEOUT_TOKEN_CREDENCIAL,
  USE_CARTILLA_NO_GPS_FALLBACK as ENV_USE_CARTILLA_NO_GPS_FALLBACK,
  USE_MOCK_LOCATION as ENV_USE_MOCK_LOCATION,
  MOCK_LOCATION_LAT,
  MOCK_LOCATION_LNG,
  CLIENT_ID as ENV_CLIENT_ID,
} from '@env'

// Modo mock: se lee desde .env (USE_MOCK=true/false)
export const USE_MOCK = ENV_USE_MOCK === 'true'

// ID del cliente/tenant: controla qué frontend se carga
// Valores: 'base' (default) | 'osep'
export const CLIENT_ID: 'base' | 'osep' = (ENV_CLIENT_ID as 'base' | 'osep') || 'base'

// URL del backend: se lee desde .env, con fallback hardcodeado por si no existe
// - Emulador Android (AVD): 10.0.2.2
// - Dispositivo físico por WiFi: IP LAN del backend
// - Dispositivo físico por USB: localhost + `adb reverse tcp:3000 tcp:3000`
const FALLBACK_ANDROID = Device.isDevice
  ? 'http://192.168.100.56:3000'
  : 'http://10.0.2.2:3000'
const FALLBACK_IOS = 'http://192.168.100.56:3000'

const normalizeAndroidBaseUrl = (urlFromEnv?: string) => {
  const raw = (urlFromEnv || '').trim()
  if (!raw) return FALLBACK_ANDROID

  if (!Device.isDevice) return raw

  try {
    const parsed = new URL(raw)
    if (parsed.hostname === '10.0.2.2' || parsed.hostname === '10.0.3.2') {
      return FALLBACK_ANDROID
    }
    return raw
  } catch {
    return FALLBACK_ANDROID
  }
}

export const API_BASE_URL =
  Platform.OS === 'android'
    ? normalizeAndroidBaseUrl(API_BASE_URL_ANDROID)
    : (API_BASE_URL_IOS || FALLBACK_IOS)

export const TimeoutTokenCredencial = Number(TIMEOUT_TOKEN_CREDENCIAL) || 10 // minutos por defecto

// Fallback temporal para pruebas en emulador sin GPS.
// Debe usarse solo en desarrollo y cuando se habilita explícitamente por .env.
export const USE_CARTILLA_NO_GPS_FALLBACK =
  __DEV__ && ENV_USE_CARTILLA_NO_GPS_FALLBACK === 'true'

// MOCK DE UBICACIÓN PARA TESTING
// Configurado desde .env (USE_MOCK_LOCATION=true/false)
// En APK release SIEMPRE usar ubicación real del dispositivo.
// El mock de ubicación queda habilitado solo en desarrollo (__DEV__).
export const USE_MOCK_LOCATION = __DEV__ && ENV_USE_MOCK_LOCATION === 'true'
export const MOCK_LOCATION = {
  latitude: Number(MOCK_LOCATION_LAT) || -28.4696,
  longitude: Number(MOCK_LOCATION_LNG) || -65.7795,
  accuracy: 10,
}

export default {
  USE_MOCK,
  API_BASE_URL,
  TimeoutTokenCredencial,
  USE_CARTILLA_NO_GPS_FALLBACK,
  USE_MOCK_LOCATION,
  MOCK_LOCATION,
}
