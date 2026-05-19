import React, { useState, useEffect, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Linking,
  Alert,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { apiGet } from '../services/api'
import { InfoUtilService, InfoUtilItem } from '../services/infoUtilService'
import { filterInfoUtil, normalizeQuery } from '../services/searchService'
import { useTheme } from '../theme'
import CurvedHeroHeader from '../components/CurvedHeroHeader'

export default function InfoUtilScreen() {
  const { colors } = useTheme()
  const [items, setItems] = useState<InfoUtilItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Filtrado local por relevancia (#28)
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items
    const q = normalizeQuery(searchQuery)
    const tokens = q.split(/\s+/).filter(Boolean)
    const ranked: Array<{ item: InfoUtilItem; score: number }> = []
    for (const item of items) {
      const titulo = normalizeQuery(item.titulo || '')
      const descripcion = normalizeQuery((item as any).descripcion || '')
      const direccion = normalizeQuery((item as any).direccion || '')
      const texto = `${titulo} ${descripcion} ${direccion}`
      let score = 0
      for (const token of tokens) {
        if (titulo === q) { score += 100; continue }
        if (titulo.startsWith(token)) { score += 80; continue }
        if (titulo.includes(token)) { score += 60; continue }
        if (texto.includes(token)) { score += 30 }
      }
      if (score > 0) ranked.push({ item, score })
    }
    return ranked.sort((a, b) => b.score - a.score).map(r => r.item)
  }, [items, searchQuery])

  useEffect(() => {
    loadData(false)
  }, [])

  const loadData = async (isRefresh: boolean) => {
    try {
      if (!isRefresh) setLoading(true)
      
      // Estrategia cache-first: mostrar cache inmediatamente
      const cached = await InfoUtilService.getFromCache()
      if (cached) {
        setItems(cached.items)
        setLastSync(cached.lastSync)
        setIsOffline(false)
        if (!isRefresh) setLoading(false)
      }

      // Intentar refresh online en background
      try {
        const response = await apiGet('/api/info-util')
        setItems(response.items || [])
        setIsOffline(false)
        
        // Guardar en cache
        await InfoUtilService.saveToCache(response.items || [])
        const now = new Date().toISOString()
        setLastSync(now)
      } catch (error) {
        console.warn('⚠️  Error cargando info útil desde API:', error)
        
        // Si no hay cache, mostrar error
        if (!cached) {
          setIsOffline(true)
        } else {
          // Si hay cache, modo offline silencioso
          setIsOffline(true)
        }
      }
    } catch (error) {
      console.error('❌ Error cargando info útil:', error)
      setIsOffline(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = () => {
    setRefreshing(true)
    loadData(true)
  }

  const handleTelPress = (telefono: string) => {
    const tel = telefono.trim()
    Linking.openURL(`tel:${tel}`).catch(() => {
      Alert.alert('Error', 'No se pudo abrir el marcador telefónico')
    })
  }

  const handleLinkPress = (url: string) => {
    let finalUrl = url.trim()
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl
    }
    Linking.openURL(finalUrl).catch(() => {
      Alert.alert('Error', 'No se pudo abrir el enlace')
    })
  }

  const handleDireccionPress = (direccion: string, geo?: string) => {
    if (geo) {
      // Abrir en mapas con coordenadas
      const [lat, lng] = geo.split(',').map((s) => s.trim())
      const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      Linking.openURL(url).catch(() => {
        Alert.alert('Error', 'No se pudo abrir Google Maps')
      })
    } else if (direccion) {
      // Abrir en mapas con dirección
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`
      Linking.openURL(url).catch(() => {
        Alert.alert('Error', 'No se pudo abrir Google Maps')
      })
    }
  }

  const renderTopHeader = (showOfflineBadge = false) => (
    <CurvedHeroHeader
      icon={<Ionicons name="information-circle-outline" size={30} color="#FFFFFF" />}
      title="Info útil"
      subtitle="Contactos, enlaces y direcciones"
      backgroundColor={colors.headerBackground}
      waveBackgroundColor={colors.background}
      subtitleStyle={styles.heroSubtitleSpacing}
    >
      {showOfflineBadge && isOffline && (
        <View style={styles.offlineBadgeHeader}>
          <Ionicons name="cloud-offline" size={14} color="#FFF" />
          <Text style={styles.offlineBadgeText}>Offline</Text>
        </View>
      )}
    </CurvedHeroHeader>
  )

  const renderItem = ({ item }: { item: InfoUtilItem }) => {
    const tipo = item.tipo.toLowerCase()

    return (
      <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}>
        <View style={styles.cardHeader}>
          {tipo === 'tel' && <Ionicons name="call" size={24} color="#4A90E2" />}
          {tipo === 'link' && <Ionicons name="link" size={24} color="#9B59B6" />}
          {tipo === 'direccion' && <Ionicons name="location" size={24} color="#E74C3C" />}
          {tipo === 'text' && <Ionicons name="document-text" size={24} color="#95A5A6" />}
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{item.titulo}</Text>
        </View>

        <View style={styles.cardBody}>
          {tipo === 'tel' && item.telefono && (
            <TouchableOpacity style={styles.actionButton} onPress={() => handleTelPress(item.telefono!)}>
              <Ionicons name="call-outline" size={20} color="#FFF" />
              <Text style={styles.actionButtonText}>{item.telefono}</Text>
            </TouchableOpacity>
          )}

          {tipo === 'link' && item.link && (
            <TouchableOpacity style={[styles.actionButton, styles.linkButton]} onPress={() => handleLinkPress(item.link!)}>
              <Ionicons name="open-outline" size={20} color="#FFF" />
              <Text style={styles.actionButtonText} numberOfLines={1}>
                {item.link}
              </Text>
            </TouchableOpacity>
          )}

          {tipo === 'direccion' && (item.direccion || item.geo) && (
            <>
              {item.direccion && <Text style={[styles.textContent, { color: colors.textPrimary }]}>{item.direccion}</Text>}
              <TouchableOpacity
                style={[styles.actionButton, styles.direccionButton]}
                onPress={() => handleDireccionPress(item.direccion || '', item.geo)}
              >
                <Ionicons name="map-outline" size={20} color="#FFF" />
                <Text style={styles.actionButtonText}>Ver en mapa</Text>
              </TouchableOpacity>
            </>
          )}

          {tipo === 'text' && item.link && (
            <Text style={[styles.textContent, { color: colors.textPrimary }]}>{item.link}</Text>
          )}
        </View>
      </View>
    )
  }

  if (loading && items.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.headerBackground }]} edges={['top']}>
        {renderTopHeader()}
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Cargando...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!loading && items.length === 0 && !isOffline) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.headerBackground }]} edges={['top']}>
        {renderTopHeader()}
        <View style={styles.centerContainer}>
          <Ionicons name="information-circle-outline" size={80} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textPrimary }]}>No hay información útil disponible</Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={() => loadData(false)}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  if (!loading && items.length === 0 && isOffline) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.headerBackground }]} edges={['top']}>
        {renderTopHeader(true)}
        <View style={styles.centerContainer}>
          <Ionicons name="cloud-offline-outline" size={80} color="#E74C3C" />
          <Text style={[styles.emptyText, { color: colors.textPrimary }]}>Sin conexión</Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>No hay datos guardados en modo offline</Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={() => loadData(false)}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.headerBackground }]} edges={['top']}>
      {renderTopHeader(true)}

      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.searchInputContainer, { backgroundColor: colors.inputBackground }]}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInputField, { color: colors.textPrimary }]}
            placeholder="Buscar en info útil..."
            placeholderTextColor={colors.inputPlaceholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && Platform.OS !== 'ios' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {searchQuery.length > 0 && (
          <Text style={[styles.searchResultCount, { color: colors.textMuted }]}>
            {filteredItems.length} resultado{filteredItems.length === 1 ? '' : 's'}
          </Text>
        )}
      </View>

      {lastSync && (
        <View style={[styles.syncInfo, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Text style={[styles.syncInfoText, { color: colors.textSecondary }]}>Última actualización: {new Date(lastSync).toLocaleString('es-AR')}</Text>
        </View>
      )}

      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item, idx) => String(item.id || idx)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      />
    </SafeAreaView>
  )

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  heroSubtitleSpacing: {
    marginBottom: 10,
  },
  offlineBadgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    backgroundColor: 'rgba(0,0,0,0.16)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  offlineBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  syncInfo: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  searchBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    marginTop: -2,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
  },
  searchInputField: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: '#333',
  },
  searchResultCount: {
    marginTop: 6,
    fontSize: 12,
    color: '#888',
    textAlign: 'right',
  },
  syncInfoText: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  cardTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
  },
  cardBody: {
    gap: 10,
  },
  textContent: {
    fontSize: 15,
    color: '#34495E',
    lineHeight: 22,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 10,
  },
  linkButton: {
    backgroundColor: '#9B59B6',
  },
  direccionButton: {
    backgroundColor: '#E74C3C',
  },
  actionButtonText: {
    flex: 1,
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7F8C8D',
  },
  emptyText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '600',
    color: '#34495E',
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
})
