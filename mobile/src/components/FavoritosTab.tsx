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

interface FavoritosTabProps {
  onSelectPrestador: (caentid: string) => void
  onNavigateToDetalle: (caentid: string) => void
}

/**
 * Tab de Favoritos - Muestra lista de prestadores favoritos
 * 
 * Características:
 * - Lista con scroll
 * - Pull-to-refresh
 * - Botón para quitar de favoritos
 * - Acceso rápido al detalle
 */
export function FavoritosTab({
  onNavigateToDetalle
}: FavoritosTabProps) {
  const { favoritos, loading, error, toggleFavorito, refresh, isOffline } =
    useFavoritosPrestadores()
  const [refreshing, setRefreshing] = React.useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await refresh()
    setRefreshing(false)
  }

  const handleRemoveFavorito = async (caentid: string) => {
    Alert.alert(
      'Quitar de Favoritos',
      '¿Estás seguro de que quieres remover este prestador?',
      [
        { text: 'Cancelar', onPress: () => {}, style: 'cancel' },
        {
          text: 'Quitar',
          onPress: async () => {
            try {
              await toggleFavorito(caentid)
            } catch (err) {
              Alert.alert('Error', 'No se pudo remover el favorito')
            }
          },
          style: 'destructive'
        }
      ]
    )
  }

  if (loading && favoritos.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF9800" />
        <Text style={styles.loadingText}>Cargando favoritos...</Text>
      </View>
    )
  }

  if (favoritos.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Feather name="heart" size={48} color="#ccc" />
        <Text style={styles.emptyTitle}>Sin Favoritos</Text>
        <Text style={styles.emptySubtitle}>
          Agrega prestadores a favoritos para acceso rápido
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

      <FlatList
        data={favoritos}
        keyExtractor={(item) => `${item.caentid}-${item.nufavid || 0}`}
        renderItem={({ item }) => <FavoritoCard
          favorito={item}
          onPress={() => onNavigateToDetalle(item.caentid)}
          onRemove={() => handleRemoveFavorito(item.caentid)}
        />}
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

interface FavoritoCardProps {
  favorito: Favorito
  onPress: () => void
  onRemove: () => void
}

function FavoritoCard({ favorito, onPress, onRemove }: FavoritoCardProps) {
  const fecha = new Date(favorito.nufeccrea)
  const fechaFormato = fecha.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short'
  })

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{favorito.nombre || favorito.caentid}</Text>
          {favorito.direccion ? (
            <Text style={styles.cardAddress} numberOfLines={1}>{favorito.direccion}</Text>
          ) : null}
          <Text style={styles.cardDate}>Agregado: {fechaFormato}</Text>
        </View>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={onRemove}
          activeOpacity={0.6}
        >
          <Feather name="x" size={20} color="#999" />
        </TouchableOpacity>
      </View>
      <View style={styles.cardFooter}>
        <Feather name="map-pin" size={14} color="#FF9800" />
        <Text style={styles.cardMeta}>Ver detalle</Text>
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
    backgroundColor: '#FF9800',
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
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  cardInfo: {
    flex: 1
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  cardDate: {
    fontSize: 12,
    color: '#999'
  },
  cardAddress: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 6
  },
  cardMeta: {
    fontSize: 12,
    color: '#666'
  },
  removeButton: {
    padding: 8,
    marginLeft: 8
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
