import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  ActivityIndicator,
  AppState,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { apiGet } from '../services/api'
import { useTheme } from '../theme'
import { ds } from '../theme/ds'
import { API_BASE_URL } from '../config'
import { BannerAnuncios } from './BannerAnuncios'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface Novedad {
  id: number
  titulo: string
  contenido: string | null
  imagen_url: string | null
  tipo: 'texto' | 'imagen' | 'mixta'
  orden: number
  fecha_inicio: string | null
  fecha_fin: string | null
  created_at: string
}

interface NovedadesCarouselProps {
  /** Si es true no intenta cargar datos del backend */
  offline?: boolean
  /** Callback al presionar un banner */
  onNovedadPress?: (novedad: Novedad) => void
  /** Si se muestra el modal de detalle interno (default: true) */
  showDetailModal?: boolean
}

const { width: SCREEN_W } = Dimensions.get('window')
const SLIDE_WIDTH = SCREEN_W - ds.space.lg * 2

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function resolveImageUri(url: string | null, cacheKey?: number | string): string | null {
  if (!url) return null
  const base = url.startsWith('http') ? url : `${API_BASE_URL}${url}`
  if (cacheKey === undefined || cacheKey === null) return base
  // Cache-buster: el backend legado puede sobreescribir la imagen sin cambiar imagen_url,
  // y <Image> de RN cachea por URI. Renovamos la query en cada load() para forzar refresh.
  const sep = base.includes('?') ? '&' : '?'
  return `${base}${sep}cb=${cacheKey}`
}

// ---------------------------------------------------------------------------
// NovedadesCarousel
// ---------------------------------------------------------------------------
export default function NovedadesCarousel({
  offline = false,
  onNovedadPress,
  showDetailModal = true,
}: NovedadesCarouselProps) {
  const { colors } = useTheme()
  const [novedades, setNovedades] = useState<Novedad[]>([])
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [selected, setSelected] = useState<Novedad | null>(null)
  const [imgCacheKey, setImgCacheKey] = useState<number>(() => Date.now())

  const scrollViewRef = useRef<ScrollView>(null)

  // ── Fetch ──────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (offline) return
    setLoading(true)
    try {
      const res = await apiGet('/noticias')
      if (res?.success && Array.isArray(res.noticias)) {
        setNovedades(res.noticias)
        setActiveIndex(0)
        setImgCacheKey(Date.now())
      }
    } catch {
      // silencioso — novedades son opcionales
    } finally {
      setLoading(false)
    }
  }, [offline])

  useEffect(() => { load() }, [load])

  useFocusEffect(useCallback(() => { load() }, [load]))

  useEffect(() => {
    if (offline) return
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') load()
    })
    return () => sub.remove()
  }, [load, offline])

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / SLIDE_WIDTH)
    setActiveIndex(Math.max(0, Math.min(nextIndex, novedades.length - 1)))
  }

  // ── Render ──────────────────────────────────────────────────────────────
  if (offline || (novedades.length === 0 && !loading)) return null

  const handlePress = (novedad: Novedad) => {
    if (onNovedadPress) {
      onNovedadPress(novedad)
    } else if (showDetailModal) {
      setSelected(novedad)
    }
  }

  return (
    <View style={styles.wrapper}>
      {/* Encabezado */}
      <View style={styles.header}>
        <Text style={[styles.sectionTitle, { color: '#FFFFFF' }]}>
          Novedades
        </Text>
        {loading && (
          <ActivityIndicator size="small" color={colors.primary} />
        )}
      </View>

      {/* Carrusel */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        disableIntervalMomentum
        onMomentumScrollEnd={handleMomentumScrollEnd}
        contentContainerStyle={styles.listContent}
      >
        {novedades.map((item) => (
          <View key={item.id} style={styles.slide}>
            <BannerAnuncios
              titulo={item.titulo}
              subtitulo={item.contenido ?? undefined}
              imageUri={resolveImageUri(item.imagen_url, imgCacheKey)}
              onPress={() => handlePress(item)}
            />
          </View>
        ))}
      </ScrollView>

      {/* Dots de paginación */}
      {novedades.length > 1 && (
        <View style={styles.dots}>
          {novedades.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => {
                scrollViewRef.current?.scrollTo({ x: i * SLIDE_WIDTH, animated: true })
                setActiveIndex(i)
              }}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              <View
                style={[
                  styles.dot,
                  i === activeIndex
                    ? [styles.dotActive, { backgroundColor: colors.primary }]
                    : { backgroundColor: colors.border },
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Modal detalle */}
      {showDetailModal && (
        <Modal
          visible={!!selected}
          animationType="slide"
          transparent
          onRequestClose={() => setSelected(null)}
        >
          <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
            <View style={[styles.modalContent, { backgroundColor: colors.modalBackground }]}>
              {/* Cerrar */}
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setSelected(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.modalCloseText, { color: colors.textSecondary }]}>✕</Text>
              </TouchableOpacity>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Banner compacto en el modal */}
                <BannerAnuncios
                  titulo={selected?.titulo ?? ''}
                  imageUri={resolveImageUri(selected?.imagen_url ?? null, imgCacheKey)}
                  style={styles.modalBanner}
                />

                {/* Contenido */}
                {selected?.contenido ? (
                  <Text style={[styles.modalContenido, { color: colors.textSecondary }]}>
                    {selected.contenido}
                  </Text>
                ) : null}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  wrapper: {
    marginVertical: ds.space.sm,   // 8
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: ds.space.md,        // 12
  },

  sectionTitle: {
    ...ds.text.h5,                    // fontSize 16, semibold
  },

  // ── Lista / slides ────────────────────────────────────────────────────
  listContent: {
    // sin paddingHorizontal: pagingEnabled snappea al ancho del FlatList
    // y padding rompería la alineación
  },

  slide: {
    width: SLIDE_WIDTH,   // ancho total menos márgenes del glass (16×2)
    // sin marginRight para que pagingEnabled funcione exacto
  },

  // ── Dots ──────────────────────────────────────────────────────────────
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: ds.space.md,       // 12
    gap: ds.space.xs,             // 4
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: ds.radius.full,
    transition: 'width 200ms',
  } as any,

  dotActive: {
    width: 18,
    borderRadius: ds.radius.full,
  },

  // ── Modal ─────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  modalContent: {
    borderTopLeftRadius: ds.radius['2xl'],
    borderTopRightRadius: ds.radius['2xl'],
    padding: ds.space.lg,
    maxHeight: '80%',
    ...ds.shadow.xl,
  },

  modalClose: {
    alignSelf: 'flex-end',
    padding: ds.space.xs,
    marginBottom: ds.space.sm,
  },

  modalCloseText: {
    ...ds.text.h5,
  },

  modalBanner: {
    marginBottom: ds.space.lg,
  },

  modalContenido: {
    ...ds.text.body,
    lineHeight: 24,
  },
})
