import React, { useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TouchableOpacity,
  Modal,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { apiGet } from '../services/api'
import { OfflineBanner } from '../components/OfflineBanner'
import { formatFecha } from '../utils/dateUtils'
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import { OnlineRequiredNotice } from '../components/OnlineRequiredNotice'
import { useTheme } from '../theme'
import { useAuth } from '../contexts/AuthContext'
import { getErrorMessage } from '../utils/errorUtils'
import CurvedHeroHeader from '../components/CurvedHeroHeader'

type GenericItem = Record<string, any>

function parseSoapArray(data: any): GenericItem[] {
  if (!data) return []

  if (Array.isArray(data)) {
    return data
  }

  if (typeof data.Resultado === 'string') {
    try {
      const parsed = JSON.parse(data.Resultado)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  if (Array.isArray(data.Resultado)) {
    return data.Resultado
  }

  if (typeof data.Resultado === 'object' && data.Resultado) {
    if (Array.isArray(data.Resultado.items)) return data.Resultado.items
    if (Array.isArray(data.Resultado.data)) return data.Resultado.data
  }

  const knownArrays = ['items', 'data', 'list', 'resultado', 'Resultados', 'Coseguros', 'Pendientes']
  for (const key of knownArrays) {
    if (Array.isArray(data[key])) return data[key]
  }

  return []
}

function firstValue(item: GenericItem, keys: string[]): any {
  for (const key of keys) {
    const value = item?.[key]
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value
    }
  }
  return ''
}

function extractNumeros(item: GenericItem): { numeroDelegacion: string; numeroAutorizacion: string } {
  const numeroDelegacion = String(
    firstValue(item, [
      'NumeroDelegacion',
      'NroDelegacion',
      'Delegacion',
      'AUNroDelegacion',
    ])
  ).trim()

  const numeroAutorizacion = String(
    firstValue(item, [
      'NumeroAutorizacion',
      'NroAutorizacion',
      'AutorizacionId',
      'AUNroAutorizacion',
      'AtencionNro',
    ])
  ).trim()

  if (numeroDelegacion && numeroAutorizacion) {
    return { numeroDelegacion, numeroAutorizacion }
  }

  const atencionId = String(firstValue(item, ['AtencionId', 'AtenId', 'AtencionNroCompleto'])).trim()
  if (atencionId.length > 6) {
    return {
      numeroDelegacion: atencionId.substring(0, 5),
      numeroAutorizacion: atencionId.substring(5),
    }
  }

  return { numeroDelegacion: '', numeroAutorizacion: '' }
}

function formatMonto(value: any): string {
  if (value === undefined || value === null || String(value).trim() === '') return '-'

  const asNumber = Number(String(value).replace(',', '.'))
  if (Number.isFinite(asNumber)) {
    return `$ ${asNumber.toFixed(2)}`
  }

  return `$ ${String(value)}`
}

export default function CosegurosPendientesScreen({ navigation }: any) {
  const { colors } = useTheme()
  const { isOfflineMode } = useAuth() as any
  const { isConnected, isInternetReachable, type } = useNetworkStatus()

  const isAirplaneMode = type === 'none'
  const isOnline = isConnected && isInternetReachable !== false && !isAirplaneMode
  const isBlocked = !!isOfflineMode || !isOnline

  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [coseguros, setCoseguros] = useState<GenericItem[]>([])
  const [modalVisible, setModalVisible] = useState(false)
  const [detalleLoading, setDetalleLoading] = useState(false)
  const [detallePracticas, setDetallePracticas] = useState<GenericItem[]>([])
  const [selectedItem, setSelectedItem] = useState<GenericItem | null>(null)

  const pendientes = useMemo(() => {
    return coseguros.filter((item) => {
      const estado = String(firstValue(item, ['Estado', 'AUEstado', 'status'])).toUpperCase()
      if (!estado) return true
      return ['PEN', 'PENDIENTE', 'PEND', 'DEUDA'].includes(estado)
    })
  }, [coseguros])

  const fetchCoseguros = async () => {
    if (isBlocked) {
      setLoading(false)
      setRefreshing(false)
      return
    }

    setLoading(true)
    try {
      const response = await apiGet('/sia/coseguros-pendientes')
      const parsed = parseSoapArray(response?.data)
      setCoseguros(parsed)
    } catch (error: unknown) {
      setCoseguros([])
      Alert.alert('Error', getErrorMessage(error, 'No se pudieron cargar los coseguros pendientes'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchCoseguros()
  }, [isBlocked])

  const onRefresh = () => {
    setRefreshing(true)
    fetchCoseguros()
  }

  const closeModal = () => {
    setModalVisible(false)
    setSelectedItem(null)
    setDetallePracticas([])
  }

  const handleOpenDetalle = async (item: GenericItem) => {
    if (isBlocked) {
      Alert.alert('Función disponible solo online', 'Necesitás conexión a Internet y sesión online para ver el detalle de consumo.')
      return
    }

    const { numeroDelegacion, numeroAutorizacion } = extractNumeros(item)

    if (!numeroDelegacion || !numeroAutorizacion) {
      Alert.alert('Datos incompletos', 'No se encontró número de delegación/autorización para consultar el detalle.')
      return
    }

    setSelectedItem(item)
    setModalVisible(true)
    setDetalleLoading(true)

    try {
      const queryParams = new URLSearchParams({
        NumeroDelegacion: numeroDelegacion,
        NumeroAutorizacion: numeroAutorizacion,
      }).toString()

      const response = await apiGet(`/sia/detalle-consumo?${queryParams}`)
      const parsed = parseSoapArray(response?.data)
      setDetallePracticas(parsed)
    } catch (error: unknown) {
      setDetallePracticas([])
      Alert.alert('Error', getErrorMessage(error, 'No se pudo obtener el detalle de consumo'))
    } finally {
      setDetalleLoading(false)
    }
  }

  const renderItem = (item: GenericItem, index: number) => {
    const fecha = String(firstValue(item, ['Fecha', 'AtencionFecha', 'AUSolFecha'])).trim()
    const prestacion = String(firstValue(item, ['Prestacion', 'NombrePractica', 'Descripcion', 'Detalle'])).trim() || 'Prestación'
    const profesional = String(firstValue(item, ['Profesional', 'Prestador', 'EntidadNombre', 'Medico'])).trim() || 'Sin dato'
    const estado = String(firstValue(item, ['Estado', 'AUEstado', 'status'])).trim() || 'PENDIENTE'
    const monto = firstValue(item, ['ImporteCoseguro', 'Monto', 'Importe'])
    const { numeroDelegacion, numeroAutorizacion } = extractNumeros(item)

    return (
      <TouchableOpacity
        key={`${index}-${prestacion}`}
        style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadow }, isBlocked && { opacity: 0.6 }]}
        activeOpacity={0.7}
        onPress={() => handleOpenDetalle(item)}
        disabled={isBlocked}
      >
        <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}> 
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{prestacion}</Text>
          <Text style={[styles.badge, { color: colors.warning, borderColor: colors.warning }]}>{estado}</Text>
        </View>

        <View style={styles.row}>
          <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.rowText, { color: colors.textSecondary }]}>
            {fecha ? formatFecha(fecha) : '-'}
          </Text>
        </View>

        <View style={styles.row}>
          <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.rowText, { color: colors.textSecondary }]} numberOfLines={1}>
            {profesional}
          </Text>
        </View>

        {!!numeroAutorizacion && (
          <View style={styles.row}>
            <Ionicons name="document-text-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.rowText, { color: colors.textSecondary }]} numberOfLines={1}>
              N° autorización: {numeroAutorizacion}
            </Text>
          </View>
        )}

        {!!numeroDelegacion && (
          <View style={styles.row}>
            <Ionicons name="business-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.rowText, { color: colors.textSecondary }]} numberOfLines={1}>
              N° delegación: {numeroDelegacion}
            </Text>
          </View>
        )}

        <View style={styles.row}>
          <Ionicons name="cash-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.rowText, { color: colors.textPrimary, fontWeight: '700' }]}>{formatMonto(monto)}</Text>
        </View>

        <View style={[styles.hintContainer, { borderTopColor: colors.border }]}>
          <Text style={[styles.hintText, { color: colors.primary }]}>Ver detalle de consumo</Text>
        </View>
      </TouchableOpacity>
    )
  }

  const selectedHeader = selectedItem || {}
  const selectedPrestacion = String(firstValue(selectedHeader, ['Prestacion', 'NombrePractica', 'Descripcion', 'Detalle'])).trim() || 'Detalle de consumo'

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
      <CurvedHeroHeader
        icon={<Ionicons name="wallet-outline" size={30} color="#FFFFFF" />}
        title="Coseguros Pendientes"
        subtitle="Saldos y consumos con detalle"
        backgroundColor={colors.headerBackground}
        waveBackgroundColor={colors.background}
        subtitleStyle={styles.heroSubtitleCustom}
      >
        <View style={styles.heroActions}>
          <TouchableOpacity style={styles.heroActionButton} onPress={() => navigation.navigate('PerfilMenu' as never)}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.heroActionButton} onPress={onRefresh} disabled={isBlocked}>
            <Ionicons name="refresh" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </CurvedHeroHeader>

      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {loading
          ? 'Consultando saldos pendientes...'
          : pendientes.length > 0
            ? `${pendientes.length} coseguro${pendientes.length !== 1 ? 's' : ''} pendiente${pendientes.length !== 1 ? 's' : ''}`
            : 'Tus consumos pendientes aparecerán aquí'}
      </Text>

      <OfflineBanner />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing && !isBlocked} onRefresh={onRefresh} enabled={!isBlocked} />
        }
      >
        <OnlineRequiredNotice
          visible={isBlocked}
          message="Necesitás conexión a Internet y sesión online para ver coseguros pendientes."
        />

        {!isBlocked && loading && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loaderText, { color: colors.textSecondary }]}>Cargando coseguros...</Text>
          </View>
        )}

        {!loading && !isBlocked && pendientes.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={52} color={colors.success} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No tenés coseguros pendientes</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Si aparece alguno, lo vas a ver aquí.</Text>
          </View>
        )}

        {!loading && !isBlocked && pendientes.length > 0 && (
          <View style={styles.listContainer}>
            {pendientes.map((item, index) => renderItem(item, index))}
          </View>
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}> 
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}> 
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]} numberOfLines={2}>{selectedPrestacion}</Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={26} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {detalleLoading ? (
              <View style={styles.modalLoader}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loaderText, { color: colors.textSecondary }]}>Consultando detalle...</Text>
              </View>
            ) : detallePracticas.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Sin detalle disponible.</Text>
              </View>
            ) : (
              <ScrollView style={styles.modalScroll}>
                {detallePracticas.map((detalle, idx) => {
                  const nombre = String(firstValue(detalle, ['NombrePractica', 'Prestacion', 'Descripcion'])).trim() || `Práctica #${idx + 1}`
                  const cantidad = firstValue(detalle, ['Cantidad', 'Cant', 'AUCantidad']) || '-'
                  const cobertura = firstValue(detalle, ['Cobertura', 'ImporteCobertura', 'CoberturaPct']) || '-'
                  const importe = firstValue(detalle, ['ImporteCoseguro', 'Importe', 'Monto'])

                  return (
                    <View key={`detalle-${idx}`} style={[styles.detalleCard, { borderColor: colors.border }]}> 
                      <Text style={[styles.detalleTitle, { color: colors.textPrimary }]}>{nombre}</Text>
                      <Text style={[styles.detalleText, { color: colors.textSecondary }]}>Cantidad: {String(cantidad)}</Text>
                      <Text style={[styles.detalleText, { color: colors.textSecondary }]}>Cobertura: {String(cobertura)}</Text>
                      <Text style={[styles.detalleText, { color: colors.textPrimary, fontWeight: '700' }]}>Coseguro: {formatMonto(importe)}</Text>
                    </View>
                  )
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  heroSubtitleCustom: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.84)',
  },
  heroActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  heroActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  loaderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  subtitle: {
    fontSize: 14,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
  },
  loaderText: {
    marginTop: 10,
    fontSize: 14,
  },
  listContainer: {
    padding: 16,
    gap: 12,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.14,
    shadowRadius: 5,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    paddingBottom: 10,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  rowText: {
    fontSize: 14,
    flex: 1,
  },
  hintContainer: {
    borderTopWidth: 1,
    marginTop: 2,
    paddingTop: 10,
  },
  hintText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '700',
  },
  emptyText: {
    marginTop: 6,
    fontSize: 14,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '78%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },
  modalLoader: {
    paddingVertical: 36,
    alignItems: 'center',
  },
  modalEmpty: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  modalScroll: {
    padding: 16,
  },
  detalleCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  detalleTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  detalleText: {
    fontSize: 13,
    marginBottom: 4,
  },
})


