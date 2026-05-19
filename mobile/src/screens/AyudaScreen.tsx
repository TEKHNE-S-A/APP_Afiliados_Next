import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  ScrollView,
  Animated,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../theme'
import { apiGet } from '../services/api'
import { InfoUtilItem, InfoUtilService } from '../services/infoUtilService'

// Categorías predefinidas para filtrado contextual
const CATEGORIAS = [
  { key: 'all',           label: 'Todo',          icon: 'grid-outline' },
  { key: 'faq',           label: 'Preguntas',     icon: 'help-circle-outline' },
  { key: 'contacto',      label: 'Contacto',      icon: 'call-outline' },
  { key: 'credencial',    label: 'Credencial',    icon: 'card-outline' },
  { key: 'cartilla',      label: 'Cartilla',      icon: 'map-outline' },
  { key: 'autorizaciones',label: 'Autorizaciones',icon: 'document-text-outline' },
  { key: 'general',       label: 'General',       icon: 'information-circle-outline' },
]

function getFaqIcon(tipo: string): string {
  switch (tipo) {
    case 'tel':       return 'call-outline'
    case 'link':      return 'globe-outline'
    case 'direccion': return 'location-outline'
    default:          return 'help-circle-outline'
  }
}

type AccordionItemProps = {
  item: InfoUtilItem
  colors: Record<string, string>
}

function AccordionItem({ item, colors }: AccordionItemProps) {
  const [expanded, setExpanded] = useState(false)
  const animHeight = useRef(new Animated.Value(0)).current

  const toggle = () => {
    const toValue = expanded ? 0 : 1
    Animated.timing(animHeight, {
      toValue,
      duration: 200,
      useNativeDriver: false,
    }).start()
    setExpanded(!expanded)
  }

  const handleAction = () => {
    if (item.tipo === 'tel' && item.telefono) {
      Linking.openURL(`tel:${item.telefono.replace(/\s/g, '')}`)
    } else if (item.tipo === 'link' && item.link) {
      const url = item.link.startsWith('http') ? item.link : `https://${item.link}`
      Linking.openURL(url)
    } else if (item.tipo === 'direccion') {
      const query = item.geo || item.direccion || ''
      if (item.geo) {
        Linking.openURL(`geo:${item.geo}`)
      } else if (query) {
        Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(query)}`)
      }
    }
  }

  const hasAction = item.tipo !== 'text' && (item.telefono || item.link || item.geo || item.direccion)
  const hasBody = hasAction || (item.tipo === 'text' && item.link)
  const bodyText = item.tipo === 'text' ? item.link : (item.telefono || item.direccion || item.link)

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <TouchableOpacity style={styles.cardHeader} onPress={toggle} activeOpacity={0.7}>
        <View style={[styles.cardIcon, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name={getFaqIcon(item.tipo) as never} size={18} color={colors.primary} />
        </View>
        <Text style={[styles.cardTitle, { color: colors.text, flex: 1 }]}>{item.titulo}</Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={[styles.cardBody, { borderTopColor: colors.border }]}>
          {bodyText ? (
            <Text style={[styles.cardBodyText, { color: colors.textSecondary }]}>{bodyText}</Text>
          ) : null}
          {hasAction && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}
              onPress={handleAction}
            >
              <Ionicons
                name={getFaqIcon(item.tipo) as never}
                size={16}
                color="#FFF"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.actionBtnText}>
                {item.tipo === 'tel' ? 'Llamar' : item.tipo === 'link' ? 'Abrir enlace' : 'Ver en mapa'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  )
}

type AyudaScreenProps = {
  route?: { params?: { categoria?: string; titulo?: string } }
  navigation?: { goBack: () => void }
}

export default function AyudaScreen({ route, navigation }: AyudaScreenProps) {
  const { colors } = useTheme()
  const initialCategoria = route?.params?.categoria ?? 'all'
  const screenTitle = route?.params?.titulo ?? 'Centro de Ayuda'

  const [items, setItems] = useState<InfoUtilItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [query, setQuery] = useState('')
  const [categoriaActiva, setCategoriaActiva] = useState<string>(initialCategoria)

  const loadItems = useCallback(async (force = false) => {
    try {
      // Cache-first: mostrar cache inmediatamente
      if (!force) {
        const cached = await InfoUtilService.getFromCache()
        if (cached?.items?.length) {
          setItems(cached.items)
          setLoading(false)
        }
      }

      const resp = await apiGet('/api/info-util') as { items: InfoUtilItem[] }
      const fetched = resp?.items ?? []
      setItems(fetched)
      await InfoUtilService.saveToCache(fetched)
    } catch {
      // Ya se mostrará cache o lista vacía
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { loadItems() }, [loadItems])

  const filtered = items.filter((it) => {
    const matchCat = categoriaActiva === 'all' || (it.categoria ?? 'general') === categoriaActiva
    const matchQ = !query || it.titulo.toLowerCase().includes(query.toLowerCase())
    return matchCat && matchQ
  })

  const categoriesWithData = new Set(['all', ...items.map((it) => it.categoria ?? 'general')])
  const visibleCats = CATEGORIAS.filter((c) => categoriesWithData.has(c.key))

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {navigation && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
        )}
        <Text style={[styles.headerTitle, { color: colors.text }]}>{screenTitle}</Text>
        <View style={styles.backBtn} />
      </View>

      {/* Buscador */}
      <View style={[styles.searchContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Ionicons name="search-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Buscar en ayuda..."
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={setQuery}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs de categoría */}
      {visibleCats.length > 1 && (
        <View style={[styles.tabsContainer, { borderBottomColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 12, alignItems: 'center', flexGrow: 1 }}
        >
          {visibleCats.map((cat) => {
            const active = categoriaActiva === cat.key
            return (
              <TouchableOpacity
                key={cat.key}
                onPress={() => setCategoriaActiva(cat.key)}
                style={[
                  styles.tab,
                  {
                    backgroundColor: active ? colors.primary : colors.background,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name={cat.icon as never}
                  size={14}
                  color={active ? '#FFF' : colors.textSecondary}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.tabText, { color: active ? '#FFF' : colors.textSecondary }]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
        </View>
      )}

      {/* Lista */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="search-outline" size={48} color={colors.textSecondary} style={{ marginBottom: 12 }} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {query ? 'Sin resultados para esa búsqueda' : 'No hay contenido en esta categoría'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(it) => it.id}
          renderItem={({ item }) => <AccordionItem item={item} colors={colors} />}
          contentContainerStyle={{ padding: 12 }}
          onRefresh={() => { setRefreshing(true); loadItems(true) }}
          refreshing={refreshing}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 36 },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  tabsContainer: { borderBottomWidth: 1, height: 48, justifyContent: 'center' },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  tabText: { fontSize: 13, fontWeight: '500' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 15, textAlign: 'center' },
  card: {
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: '500' },
  cardBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
  },
  cardBodyText: { fontSize: 14, lineHeight: 20, marginTop: 10, marginBottom: 8 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  actionBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
})
