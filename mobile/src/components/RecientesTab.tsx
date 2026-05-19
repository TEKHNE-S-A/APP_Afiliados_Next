import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useFavoritosPrestadores, Favorito } from '../hooks/useFavoritosPrestadores'
import { formatFecha } from '../utils/dateUtils'

interface RecientesTabProps {
  onNavigateToDetalle: (caentid: string) => void
}

/**
 * Tab de Recientes - Muestra últimos prestadores accedidos
 * 
 * Características:
 * - Lista ordenada por fecha (más reciente primero)
 * - Pull-to-refresh
 * - Botón para limpiar todo
 * - Timestamp relativo (ej: "hace 2 horas")
 */
export function RecientesTab({
  onNavigateToDetalle
}: RecientesTabProps) {
  const { recientes, loading, error, refresh, limpiarRecientes, isOffline } =
    useFavoritosPrestadores()
  const [refreshing, setRefreshing] = React.useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await refresh()
    setRefreshing(false)
  }

  const handleLimpiarTodos = () => {
    Alert.alert(
      'Limpiar Histórico',
      '¿Estás seguro de que quieres borrar todos los recientes?',
      [
        { text: 'Cancelar', onPress: () => {}, style: 'cancel' },
        {
          text: 'Limpiar',
          onPress: async () => {
            try {
              await limpiarRecientes()
            } catch (err) {
              Alert.alert('Error', 'No se pudo limpiar el histórico')
            }
          },
          style: 'destructive'
        }
      ]
    )
  }

  if (loading && recientes.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Cargando histórico...</Text>
      </View>
    )
  }

  if (recientes.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Feather name="clock" size={48} color="#ccc" />
        <Text style={styles.emptyTitle}>Sin Histórico</Text>
        <Text style={styles.emptySubtitle}>
          Aquí aparecerán los prestadores que consultes
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Feather name="wifi-off" size={14} color="#fff" />
          <Text style={styles.offlineText}>Modo offline - datos en caché</Text>
        </View>
      )}

      {recientes.length > 0 && (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {recientes.length} reciente{recientes.length !== 1 ? 's' : ''}
          </Text>
          <TouchableOpacity
            onPress={handleLimpiarTodos}
            style={styles.limpiarButton}
          >
            <Feather name="trash-2" size={16} color="#d32f2f" />
            <Text style={styles.limpiarText}>Limpiar</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={recientes}
        keyExtractor={(item, idx) => `${item.caentid}-${idx}`}
        renderItem={({ item }) => (
          <RecienteCard
            reciente={item}
            onPress={() => onNavigateToDetalle(item.caentid)}
          />
        )}
        scrollEnabled={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />

      {error && (
        <View style={styles.errorBanner}>
          <Feather name="alert-circle" size={16} color="#d32f2f" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  )
}

interface RecienteCardProps {
  reciente: Favorito
  onPress: () => void
}

function RecienteCard({ reciente, onPress }: RecienteCardProps) {
  const fecha = new Date(reciente.nufeccrea)
  const ahora = new Date()
  const diffMs = ahora.getTime() - fecha.getTime()
  const diffMinutos = Math.floor(diffMs / 60000)
  const diffHoras = Math.floor(diffMs / 3600000)
  const diffDias = Math.floor(diffMs / 86400000)

  let tiempoRelativo = ''
  if (diffMinutos < 1) {
    tiempoRelativo = 'hace unos segundos'
  } else if (diffMinutos < 60) {
    tiempoRelativo = `hace ${diffMinutos}m`
  } else if (diffHoras < 24) {
    tiempoRelativo = `hace ${diffHoras}h`
  } else if (diffDias < 7) {
    tiempoRelativo = `hace ${diffDias}d`
  } else {
    tiempoRelativo = formatFecha(fecha)
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        <View style={styles.iconContainer}>
          <Feather name="clock" size={20} color="#0066CC" />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{reciente.nombre || reciente.caentid}</Text>
          {reciente.direccion ? (
            <Text style={styles.cardAddress} numberOfLines={1}>{reciente.direccion}</Text>
          ) : null}
          <Text style={styles.cardTime}>{tiempoRelativo}</Text>
        </View>
        <Feather name="chevron-right" size={20} color="#ccc" />
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666'
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center'
  },
  offlineBanner: {
    backgroundColor: '#0066CC',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8
  },
  offlineText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff'
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  limpiarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    borderRadius: 4
  },
  limpiarText: {
    fontSize: 12,
    color: '#d32f2f',
    fontWeight: '500'
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center'
  },
  cardInfo: {
    flex: 1
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2
  },
  cardTime: {
    fontSize: 12,
    color: '#999'
  },
  cardAddress: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2
  },
  errorBanner: {
    backgroundColor: '#ffebee',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 4,
    gap: 8
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 12
  }
})
