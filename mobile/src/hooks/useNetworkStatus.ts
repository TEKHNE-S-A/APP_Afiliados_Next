import { useEffect, useState } from 'react'
import NetInfo from '@react-native-community/netinfo'

export type NetworkStatus = {
  isConnected: boolean
  isInternetReachable: boolean | null
  type: string | null
}

/**
 * Hook para detectar estado de conexión a internet en tiempo real
 * Retorna: { isConnected, isInternetReachable, type }
 * 
 * @example
 * const { isConnected, isInternetReachable } = useNetworkStatus()
 * if (!isConnected) {
 *   // Mostrar UI offline
 * }
 */
export function useNetworkStatus(): NetworkStatus {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    // Arrancar en false evita suposiciones optimistas que disparan llamadas online
    // en modo avión durante el boot.
    isConnected: false,
    isInternetReachable: null,
    type: null,
  })

  useEffect(() => {
    // Estado inicial
    NetInfo.fetch().then(state => {
      // NetInfo puede devolver isConnected=null al inicio.
      // En ese caso, tratamos como offline para evitar llamadas de red innecesarias.
      const connected = state.isConnected ?? false
      const hasConnection = connected && (state.isInternetReachable !== false)
      
      setNetworkStatus({
        isConnected: hasConnection,
        isInternetReachable: state.isInternetReachable ?? null,
        type: state.type,
      })
      console.log(`📡 Network initial state: ${hasConnection ? 'ONLINE' : 'OFFLINE'} (${state.type}, internet: ${state.isInternetReachable})`)
    })

    // Suscripción a cambios de red
    const unsubscribe = NetInfo.addEventListener(state => {
      const connected = state.isConnected ?? false
      const hasConnection = connected && (state.isInternetReachable !== false)
      
      setNetworkStatus({
        isConnected: hasConnection,
        isInternetReachable: state.isInternetReachable ?? null,
        type: state.type,
      })
      
      console.log(`📡 Network status changed: ${hasConnection ? 'ONLINE' : 'OFFLINE'} (${state.type}, internet: ${state.isInternetReachable})`)
    })

    return () => unsubscribe()
  }, [])

  return networkStatus
}
