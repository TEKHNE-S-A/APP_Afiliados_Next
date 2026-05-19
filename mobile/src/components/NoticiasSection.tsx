import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  StyleSheet,
  Dimensions,
  AppState,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { apiGet } from '../services/api'
import { useTheme } from '../theme'
import { API_BASE_URL } from '../config'

const { width: SCREEN_W } = Dimensions.get('window')
const CARD_W = SCREEN_W * 0.75
const CARD_H = 230

export interface Noticia {
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

interface Props {
  /** Si es true la sección no intenta cargar datos (sin conexión) */
  offline?: boolean
}

export default function NoticiasSection({ offline = false }: Props) {
  const { colors } = useTheme()
  const [noticias, setNoticias] = useState<Noticia[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Noticia | null>(null)

  const load = useCallback(async () => {
    if (offline) return
    setLoading(true)
    try {
      const res = await apiGet('/noticias')
      if (res?.success && Array.isArray(res.noticias)) {
        setNoticias(res.noticias)
      }
    } catch {
      // silencioso — noticias son opcionales
    } finally {
      setLoading(false)
    }
  }, [offline])

  useEffect(() => { load() }, [load])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  useEffect(() => {
    if (offline) return
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        load()
      }
    })
    return () => subscription.remove()
  }, [load, offline])

  if (offline || (noticias.length === 0 && !loading)) return null

  return (
    <View style={styles.wrapper}>
      {/* Encabezado de sección */}
      <View style={styles.header}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>📰 Novedades</Text>
        {loading && <ActivityIndicator size="small" color={colors.primary} />}
      </View>

      {/* Carrusel horizontal */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        decelerationRate="fast"
        snapToInterval={CARD_W + 12}
        snapToAlignment="start"
      >
        {noticias.map(n => (
          <TouchableOpacity
            key={n.id}
            style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadow, width: CARD_W, height: CARD_H }]}
            activeOpacity={0.85}
            onPress={() => setSelected(n)}
          >
            {/* Imagen si existe */}
            {n.imagen_url ? (
              <Image
            source={{ uri: n.imagen_url.startsWith('http') ? n.imagen_url : `${API_BASE_URL}${n.imagen_url}` }}
                style={styles.cardImg}
                resizeMode="cover"
              />
            ) : null}

            {/* Texto */}
            <View style={styles.cardBody}>
              <Text style={[styles.cardTitulo, { color: colors.textPrimary }]} numberOfLines={1}>
                {n.titulo}
              </Text>
              <Text style={[styles.cardVerMas, { color: colors.primary }]}>Ver más →</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Modal detalle */}
      <Modal
        visible={!!selected}
        animationType="slide"
        transparent
        onRequestClose={() => setSelected(null)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.modalBackground }]}>
            <TouchableOpacity style={styles.modalClose} onPress={() => setSelected(null)}>
              <Text style={{ fontSize: 22, color: colors.textSecondary }}>✕</Text>
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false}>
              {selected?.imagen_url ? (
                <Image
                source={{ uri: selected.imagen_url.startsWith('http') ? selected.imagen_url : `${API_BASE_URL}${selected.imagen_url}` }}
                  style={styles.modalImg}
                  resizeMode="contain"
                />
              ) : null}

              <Text style={[styles.modalTitulo, { color: colors.textPrimary }]}>{selected?.titulo}</Text>

              {selected?.contenido ? (
                <Text style={[styles.modalContenido, { color: colors.textSecondary }]}>
                  {selected.contenido}
                </Text>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 8,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  scroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardImg: {
    width: '100%',
    height: 160,
  },
  cardBody: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
    flex: 1,
  },
  cardTitulo: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardContenido: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  cardVerMas: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalClose: {
    alignSelf: 'flex-end',
    marginBottom: 8,
    padding: 4,
  },
  modalImg: {
    width: '100%',
    height: 260,
    borderRadius: 10,
    marginBottom: 16,
  },
  modalTitulo: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  modalContenido: {
    fontSize: 15,
    lineHeight: 22,
  },
})
