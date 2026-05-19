import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { useAuth } from '../contexts/AuthContext'
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useTheme } from '../theme'

type OfflineBannerProps = {
  onSyncPress?: () => void
}

/**
 * Banner que muestra el estado offline/online de la app
 * Aparece en la parte superior de las pantallas principales
 */
export function OfflineBanner({ onSyncPress }: OfflineBannerProps) {
  const { isOfflineMode, requiresRelogin, syncCredenciales, signOut, loading: authLoading } = useAuth()
  const { isConnected, isInternetReachable } = useNetworkStatus()
  const [syncing, setSyncing] = React.useState(false)
  const { colors } = useTheme()
  useNavigation<NativeStackNavigationProp<any>>()

  // Mostrar banner solo cuando hay un problema real de conectividad o la sesión requiere re-login.
  // Nota: isOfflineMode puede estar activo por sesión desde cache aun con internet; eso no debería “ensuciar” la UI.
  // IMPORTANTE: isInternetReachable puede ser null durante inicialización, no considerarlo como problema de red
  const hasNetworkProblem = isConnected === false || isInternetReachable === false

  // Debug: loguear estado actual
  React.useEffect(() => {
    const shouldShow = !authLoading && (requiresRelogin || hasNetworkProblem)
    console.log('📊 OfflineBanner - Estado:', { 
      authLoading,
      isOfflineMode, 
      requiresRelogin,
      isConnected, 
      isInternetReachable, 
      hasNetworkProblem,
      shouldShow 
    })
  }, [authLoading, isOfflineMode, requiresRelogin, isConnected, isInternetReachable, hasNetworkProblem])

  // Mostrar banner solo si hay un problema real de conectividad o la sesión requiere re-login.
  const shouldShowBanner = !authLoading && (requiresRelogin || hasNetworkProblem)
  
  if (!shouldShowBanner) {
    return null
  }

  const handleSync = async () => {
    if (!isConnected || isInternetReachable === false) {
      return // No intentar sincronizar sin conexión
    }

    if (requiresRelogin) {
      // No es un problema de red: se requiere login
      await signOut()
      return
    }

    if (onSyncPress) {
      onSyncPress()
      return
    }

    try {
      setSyncing(true)
      await syncCredenciales()
      console.log('✅ Sincronización manual completada')
    } catch (error) {
      // Error capturado - puede ser error de red o token inválido
      const errMsg = (error && typeof error === 'object' && 'message' in error) ? String(error.message) : ''
      const errData = (error && typeof error === 'object' && 'data' in error) ? (error as any).data : null
      
      if (errMsg.includes('401') || errData?.code === 'TOKEN_EXPIRED') {
        // Token rechazado por GAM - requiere re-login
        Alert.alert(
          'Sesión Expirada',
          'Tu sesión ha expirado. Necesitás iniciar sesión nuevamente para sincronizar datos actualizados.',
          [
            {
              text: 'Continuar sin sincronizar',
              style: 'cancel'
            },
            {
              text: 'Iniciar Sesión',
              onPress: () => {
                signOut()
              }
            }
          ]
        )
      } else {
        // Otro tipo de error
        console.warn('⚠️  Error al sincronizar:', error)
        Alert.alert(
          'Error de Sincronización',
          'No se pudo sincronizar con el servidor. Verificá tu conexión.',
          [{ text: 'OK' }]
        )
      }
    } finally {
      setSyncing(false)
    }
  }

  const handleGoToLogin = async () => {
    // RootNavigator renderiza Login cuando user=null; no navegamos manualmente.
    await signOut()
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.offline, borderBottomColor: colors.warningDark }]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>📡</Text>
        </View>
        
        <View style={styles.textContainer}>
          <Text style={styles.title}>
            {requiresRelogin
              ? 'Sesión expirada'
              : isConnected && isInternetReachable === false
                ? 'Sin Internet'
                : 'Sin Conexión'}
          </Text>
          <Text style={styles.subtitle}>
            {requiresRelogin
              ? 'Necesitás iniciar sesión nuevamente para sincronizar.'
              : isConnected && isInternetReachable === false
                ? 'WiFi conectado pero sin acceso a internet'
                : (isOfflineMode
                    ? 'Usando datos guardados. Algunas funciones pueden estar limitadas.'
                    : 'Algunos servicios no están disponibles')}
          </Text>
        </View>

        {requiresRelogin ? (
          // Sesión expirada: ofrecer ir al login
          <TouchableOpacity
            style={styles.syncButton}
            onPress={handleSync}
            disabled={syncing}
          >
            <Text style={styles.syncButtonText}>Iniciar sesión</Text>
          </TouchableOpacity>
        ) : isConnected && isInternetReachable !== false ? (
          // Hay conexión: puede intentar sincronizar (ej. backend caído pero hay red)
          <TouchableOpacity
            style={styles.syncButton}
            onPress={handleSync}
            disabled={syncing}
          >
            {syncing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.syncButtonText}>🔄 Sincronizar</Text>
            )}
          </TouchableOpacity>
        ) : null}
        {/* Sin conectividad (modo avión): banner informativo sin botón de acción */}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 16,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
  },
  syncButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
})
