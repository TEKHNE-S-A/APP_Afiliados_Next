import React, { useState, useEffect, useMemo } from 'react'
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
  TextInput,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import ModalPicker from '../components/ModalPicker'
import { useAuth } from '../contexts/AuthContext'
import { apiGet, apiPost } from '../services/api'
import { OfflineBanner } from '../components/OfflineBanner'
import { formatFecha } from '../utils/dateUtils'
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import { OnlineRequiredNotice } from '../components/OnlineRequiredNotice'
import { useTheme } from '../theme'
import CurvedHeroHeader from '../components/CurvedHeroHeader'

interface HistorialItem {
  AtencionId: string
  AfiliadoId: string
  AtencionFecha: string
  EntidadId: string
  EntidadNombre: string
  AtencionCantidad: number
}

interface DetallePractica {
  [key: string]: any
}

export default function HistorialAtencionScreen({ navigation, route }: any) {
  const authContext = useAuth()
  const { user, isOfflineMode, credenciales, requiresRelogin } = authContext
  const { isConnected, isInternetReachable, type } = useNetworkStatus()
  const isAirplaneMode = type === 'none'
  const isOnline = isConnected && isInternetReachable !== false && !isAirplaneMode
  // isBlocked solo cuando no hay red real — requiresRelogin se muestra como aviso separado
  const isBlocked = (!isOnline && !isConnected) || (!!isOfflineMode && !isOnline)
  const { colors } = useTheme()
  const [historial, setHistorial] = useState<HistorialItem[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [pagina, setPagina] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)

  // Estado selector grupo familiar
  const [selectedAfiliadoId, setSelectedAfiliadoId] = useState<string>('')

  // Estados de filtros
  const [filterVisible, setFilterVisible] = useState(false)
  const [filterPrestador, setFilterPrestador] = useState('')
  const [filterTextoGeneral, setFilterTextoGeneral] = useState('')
  const [filterFechaDesde, setFilterFechaDesde] = useState<Date | null>(null)
  const [filterFechaHasta, setFilterFechaHasta] = useState<Date | null>(null)
  const [showPickerDesde, setShowPickerDesde] = useState(false)
  const [showPickerHasta, setShowPickerHasta] = useState(false)

  // Estados para el modal de detalle
  const [modalVisible, setModalVisible] = useState(false)
  const [detalleLoading, setDetalleLoading] = useState(false)
  const [detallePracticas, setDetallePracticas] = useState<DetallePractica[]>([])
  const [selectedAtencion, setSelectedAtencion] = useState<HistorialItem | null>(null)

  // Estados para desconocimiento
  const [desconVisible, setDesconVisible] = useState(false)
  const [desconMotivo, setDesconMotivo] = useState<'no_reconozco'|'incorrecto'|'duplicado'|'otro'>('no_reconozco')
  const [desconDescripcion, setDesconDescripcion] = useState('')
  const [desconLoading, setDesconLoading] = useState(false)

  // Estados para calificación
  const [califVisible, setCalifVisible] = useState(false)
  const [califPuntuacion, setCalifPuntuacion] = useState(0)
  const [califComentario, setCalifComentario] = useState('')
  const [califLoading, setCalifLoading] = useState(false)

  // Auto-seleccionar titular al cargar
  useEffect(() => {
    if (credenciales && credenciales.length > 0 && !selectedAfiliadoId) {
      const titular = credenciales.find((c: any) => c.crcrepropi === 'S') || credenciales[0]
      const id = String(titular.crcreid || titular.crcreafili || titular.crcrenroaf || '').trim()
      if (id) setSelectedAfiliadoId(id)
    }
  }, [credenciales])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchHistorial(1, selectedAfiliadoId)
    }, 300)

    return () => clearTimeout(timer)
  }, [selectedAfiliadoId, filterPrestador, filterTextoGeneral, filterFechaDesde, filterFechaHasta])

  const formatDateForApi = (date: Date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const fetchHistorial = async (paginaNum = 1, afiliadoIdOverride?: string) => {
    if (isBlocked) {
      setLoading(false)
      setRefreshing(false)
      return
    }

    setLoading(true)
    try {
      const afiliadoIdToUse = afiliadoIdOverride ?? selectedAfiliadoId
      console.log('📤 Consultando historial de atención, página:', paginaNum, '| AfiliadoId:', afiliadoIdToUse || '(sesión)')

      // Construir URL con query params
      const params: Record<string, string> = {
        Pagina: String(paginaNum),
        RegistrosXPagina: '20',
      }
      if (afiliadoIdToUse) params.AfiliadoId = afiliadoIdToUse
      if (filterPrestador.trim()) params.Prestador = filterPrestador.trim()
      if (filterTextoGeneral.trim()) params.SearchText = filterTextoGeneral.trim()
      if (filterFechaDesde) params.DesdeFecha = formatDateForApi(filterFechaDesde)
      if (filterFechaHasta) params.HastaFecha = formatDateForApi(filterFechaHasta)
      const queryParams = new URLSearchParams(params).toString()
      
      const response = await apiGet(`/sia/historial-atencion?${queryParams}`)

      console.log('📥 Respuesta historial:', response)

      if (response.success && response.data) {
        // Similar a ENROLAMIENTOS: el Resultado es un string JSON que contiene el array directamente
        let atenciones = []
        
        if (typeof response.data.Resultado === 'string') {
          try {
            const parsedData = JSON.parse(response.data.Resultado)
            console.log('📊 Datos parseados:', parsedData)
            // El parsedData ES el array directamente
            atenciones = Array.isArray(parsedData) ? parsedData : []
          } catch (e) {
            console.error('❌ Error parseando Resultado:', e)
            atenciones = []
          }
        } else if (Array.isArray(response.data.Resultado)) {
          atenciones = response.data.Resultado
        }
        
        setHistorial(atenciones)
        setPagina(paginaNum)
        if (typeof response.data.TotalPaginas === 'number') {
          setTotalPaginas(response.data.TotalPaginas)
        } else {
          setTotalPaginas(1)
        }
        
        console.log(`✅ ${atenciones.length} atenciones cargadas`)
      } else {
        setHistorial([])
      }
    } catch (error: any) {
      console.error('❌ Error obteniendo historial:', error)
      Alert.alert(
        'Error',
        error.message || 'No se pudo obtener el historial de atención'
      )
      setHistorial([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Filtrado local
  const filteredHistorial = useMemo(() => {
    return historial.filter(item => {
      if (filterPrestador.trim()) {
        const search = filterPrestador.trim().toLowerCase()
        const entidad = String(item.EntidadNombre || '').toLowerCase()
        if (!entidad.includes(search)) return false
      }
      if (filterTextoGeneral.trim()) {
        const search = filterTextoGeneral.trim().toLowerCase()
        const textoItem = Object.values(item as any)
          .filter((value) => value !== undefined && value !== null)
          .map((value) => String(value).toLowerCase())
          .join(' ')
        if (!textoItem.includes(search)) return false
      }
      if (filterFechaDesde) {
        const d = new Date(item.AtencionFecha)
        if (d < filterFechaDesde) return false
      }
      if (filterFechaHasta) {
        const d = new Date(item.AtencionFecha)
        const hasta = new Date(filterFechaHasta)
        hasta.setHours(23, 59, 59, 999)
        if (d > hasta) return false
      }
      return true
    })
  }, [historial, filterPrestador, filterTextoGeneral, filterFechaDesde, filterFechaHasta])

  const activeFilterCount = [
    filterPrestador.trim() !== '',
    filterTextoGeneral.trim() !== '',
    filterFechaDesde !== null,
    filterFechaHasta !== null,
  ].filter(Boolean).length

  const clearFilters = () => {
    setFilterPrestador('')
    setFilterTextoGeneral('')
    setFilterFechaDesde(null)
    setFilterFechaHasta(null)
    setFilterVisible(false)
  }

  const onRefresh = () => {
    setRefreshing(true)
    if (isBlocked) {
      setRefreshing(false)
      return
    }
    fetchHistorial(1, selectedAfiliadoId)
  }

  const handleSelectAfiliado = (afiliadoId: string) => {
    if (afiliadoId === selectedAfiliadoId) return
    setSelectedAfiliadoId(afiliadoId)
    setHistorial([])
    // fetchHistorial se dispara por el useEffect de selectedAfiliadoId
  }

  // Función para particionar AtencionId
  const parseAtencionId = (atencionId: string) => {
    const numeroDelegacion = atencionId.substring(0, 5)
    const numeroAutorizacion = atencionId.substring(5)
    return { numeroDelegacion, numeroAutorizacion }
  }

  // Función para cargar el detalle de prácticas
  const fetchDetallePracticas = async (atencion: HistorialItem) => {
    if (isBlocked) {
      Alert.alert('Función disponible solo online', 'Para ver el detalle necesitás conexión a Internet y sesión online.')
      return
    }

    setDetalleLoading(true)
    setSelectedAtencion(atencion)
    setModalVisible(true)
    
    try {
      const { numeroDelegacion, numeroAutorizacion } = parseAtencionId(atencion.AtencionId)
      
      console.log('📤 Consultando detalle de prácticas')
      console.log('   AtencionId:', atencion.AtencionId)
      console.log('   NumeroDelegacion:', numeroDelegacion)
      console.log('   NumeroAutorizacion:', numeroAutorizacion)

      const queryParams = new URLSearchParams({
        NumeroDelegacion: numeroDelegacion,
        NumeroAutorizacion: numeroAutorizacion,
      }).toString()
      
      const response = await apiGet(`/sia/detalle-consumo?${queryParams}`)

      console.log('📥 Respuesta detalle:', response)

      if (response.success && response.data) {
        // Parsear respuesta si viene como string JSON
        let parsedData = response.data
        if (typeof response.data.Resultado === 'string') {
          try {
            parsedData = JSON.parse(response.data.Resultado)
            console.log('📊 Datos parseados:', parsedData)
          } catch (e) {
            console.error('❌ Error parseando Resultado:', e)
          }
        }

        // El parsedData puede ser array directamente o tener una propiedad con el array
        const practicas = Array.isArray(parsedData) 
          ? parsedData 
          : (parsedData.Practicas || parsedData.Detalles || [])
        
        setDetallePracticas(practicas)
        console.log(`✅ ${practicas.length} prácticas cargadas`)
      } else {
        setDetallePracticas([])
      }
    } catch (error: any) {
      console.error('❌ Error obteniendo detalle:', error)
      Alert.alert(
        'Error',
        error.message || 'No se pudo obtener el detalle de prácticas'
      )
      setDetallePracticas([])
    } finally {
      setDetalleLoading(false)
    }
  }

  // Función para cerrar el modal
  const closeModal = () => {
    setModalVisible(false)
    setSelectedAtencion(null)
    setDetallePracticas([])
    setDesconVisible(false)
    setCalifVisible(false)
    setDesconDescripcion('')
    setCalifComentario('')
    setCalifPuntuacion(0)
    setDesconMotivo('no_reconozco')
  }

  // Enviar desconocimiento
  const handleDesconocer = async () => {
    if (!selectedAtencion) return
    if (requiresRelogin) {
      Alert.alert('Sesión expirada', 'Tu sesión expiró. Cerrá sesión e iniciá nuevamente para enviar el reclamo.')
      return
    }
    setDesconLoading(true)
    try {
      const { numeroDelegacion, numeroAutorizacion } = parseAtencionId(selectedAtencion.AtencionId)
      await apiPost('/desconocimientos', {
        afiliado_id: selectedAfiliadoId,
        atencion_id: selectedAtencion.AtencionId,
        nro_delegacion: numeroDelegacion,
        nro_autorizacion: numeroAutorizacion,
        prestador_nombre: selectedAtencion.EntidadNombre.trim(),
        motivo: desconMotivo,
        descripcion: desconDescripcion.trim() || undefined,
      })
      Alert.alert('Desconocimiento registrado', 'Tu reclamo fue enviado correctamente. Sera revisado por nuestro equipo.')
      setDesconVisible(false)
      setDesconDescripcion('')
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo registrar el desconocimiento')
    } finally {
      setDesconLoading(false)
    }
  }

  // Enviar calificacion
  const handleCalificar = async () => {
    if (!selectedAtencion || califPuntuacion < 1) {
      Alert.alert('Seleccioná una puntuación', 'Toca las estrellas para calificar esta atención.')
      return
    }
    if (requiresRelogin) {
      Alert.alert('Sesión expirada', 'Tu sesión expiró. Cerrá sesión e iniciá nuevamente para enviar la calificación.')
      return
    }
    setCalifLoading(true)
    try {
      await apiPost('/calificaciones', {
        afiliado_id: selectedAfiliadoId,
        atencion_id: selectedAtencion.AtencionId,
        entidad_id: selectedAtencion.EntidadId,
        entidad_nombre: selectedAtencion.EntidadNombre.trim(),
        puntuacion: califPuntuacion,
        comentario: califComentario.trim() || undefined,
      })
      Alert.alert('¡Gracias!', 'Tu calificación fue enviada.')
      setCalifVisible(false)
      setCalifComentario('')
      setCalifPuntuacion(0)
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo enviar la calificación')
    } finally {
      setCalifLoading(false)
    }
  }

  const renderHistorialItem = (item: HistorialItem, index: number) => {
    return (
      <TouchableOpacity 
        key={index} 
        style={[styles.historialCard, { backgroundColor: colors.surface, shadowColor: colors.shadow }, isBlocked && { opacity: 0.6 }]}
        onPress={() => fetchDetallePracticas(item)}
        activeOpacity={0.7}
        disabled={isBlocked}
      >
        <View style={[styles.historialHeader, { borderBottomColor: colors.border }]}>
          <View style={styles.headerLeft}>
            <Ionicons name="medical" size={24} color={colors.success} />
            <Text style={[styles.fecha, { color: colors.textPrimary }]}>
              {formatFecha(item.AtencionFecha)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.success} />
        </View>

        <View style={styles.historialBody}>
          <View style={styles.historialRow}>
            <Ionicons name="business" size={16} color={colors.textSecondary} style={styles.icon} />
            <View style={styles.textContainer}>
              <Text style={[styles.historialLabel, { color: colors.textMuted }]}>Prestador:</Text>
              <Text style={[styles.historialValue, { color: colors.textPrimary }]}>
                {item.EntidadNombre.trim()}
              </Text>
            </View>
          </View>

          <View style={styles.historialRow}>
            <Ionicons name="clipboard" size={16} color={colors.textSecondary} style={styles.icon} />
            <View style={styles.textContainer}>
              <Text style={[styles.historialLabel, { color: colors.textMuted }]}>Cantidad de atenciones:</Text>
              <Text style={[styles.historialValue, { color: colors.textPrimary }]}>
                {item.AtencionCantidad}
              </Text>
            </View>
          </View>

          <View style={styles.historialRow}>
            <Ionicons name="finger-print" size={16} color={colors.textSecondary} style={styles.icon} />
            <View style={styles.textContainer}>
              <Text style={[styles.historialLabel, { color: colors.textMuted }]}>ID Atención:</Text>
              <Text style={[styles.idText, { color: colors.textSecondary }]}>{item.AtencionId}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.tapHint, { borderTopColor: colors.border }]}>
          <Text style={[styles.tapHintText, { color: colors.success }]}>Toca para ver detalle de prácticas</Text>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <CurvedHeroHeader
        icon={<Ionicons name="time-outline" size={30} color="#FFFFFF" />}
        title="Historial de Atención"
        subtitle="Tus atenciones médicas registradas"
        backgroundColor={colors.headerBackground}
        waveBackgroundColor={colors.background}
        subtitleStyle={styles.heroSubtitleCustom}
      >
        <View style={styles.heroActions}>
          <TouchableOpacity
            style={styles.heroActionButton}
            onPress={() => {
              const from = route?.params?.from
              if (from === 'Home') {
                navigation.navigate('Home' as never)
              } else {
                navigation.navigate('PerfilMenu' as never)
              }
            }}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setFilterVisible(v => !v)} style={styles.heroActionButton}>
            <View>
              <Ionicons name="filter" size={20} color="#FFFFFF" />
              {activeFilterCount > 0 && (
                <View style={[styles.filterBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </CurvedHeroHeader>

      {/* Panel de filtros */}
      {filterVisible && (
        <View style={[styles.filterPanel, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          {/* Prestador */}
          <View style={styles.filterRow}>
            <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Prestador:</Text>
            <TextInput
              style={[styles.filterInput, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.background }]}
              placeholder="Buscar prestador..."
              placeholderTextColor={colors.textMuted}
              value={filterPrestador}
              onChangeText={setFilterPrestador}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.filterRow}>
            <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Texto general:</Text>
            <TextInput
              style={[styles.filterInput, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.background }]}
              placeholder="Buscar práctica, entidad o ID..."
              placeholderTextColor={colors.textMuted}
              value={filterTextoGeneral}
              onChangeText={setFilterTextoGeneral}
              autoCapitalize="none"
            />
          </View>

          {/* Fecha desde/hasta */}
          <View style={styles.filterRow}>
            <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Desde:</Text>
            <TouchableOpacity
              style={[styles.datePill, { borderColor: filterFechaDesde ? colors.primary : colors.border }]}
              onPress={() => setShowPickerDesde(true)}
            >
              <Ionicons name="calendar-outline" size={14} color={filterFechaDesde ? colors.primary : colors.textMuted} />
              <Text style={[styles.datePillText, { color: filterFechaDesde ? colors.primary : colors.textMuted }]}>
                {filterFechaDesde ? filterFechaDesde.toLocaleDateString('es-AR') : 'Seleccionar'}
              </Text>
            </TouchableOpacity>

            <Text style={[styles.filterLabel, { color: colors.textSecondary, marginLeft: 8 }]}>Hasta:</Text>
            <TouchableOpacity
              style={[styles.datePill, { borderColor: filterFechaHasta ? colors.primary : colors.border }]}
              onPress={() => setShowPickerHasta(true)}
            >
              <Ionicons name="calendar-outline" size={14} color={filterFechaHasta ? colors.primary : colors.textMuted} />
              <Text style={[styles.datePillText, { color: filterFechaHasta ? colors.primary : colors.textMuted }]}>
                {filterFechaHasta ? filterFechaHasta.toLocaleDateString('es-AR') : 'Seleccionar'}
              </Text>
            </TouchableOpacity>
          </View>

          {activeFilterCount > 0 && (
            <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
              <Ionicons name="close-circle" size={14} color="#F44336" />
              <Text style={[styles.clearBtnText, { color: '#F44336' }]}>Limpiar filtros</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* DateTimePickers */}
      {showPickerDesde && (
        <DateTimePicker
          value={filterFechaDesde || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(_, date) => { setShowPickerDesde(false); if (date) setFilterFechaDesde(date) }}
          maximumDate={filterFechaHasta || new Date()}
        />
      )}
      {showPickerHasta && (
        <DateTimePicker
          value={filterFechaHasta || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(_, date) => { setShowPickerHasta(false); if (date) setFilterFechaHasta(date) }}
          minimumDate={filterFechaDesde || undefined}
          maximumDate={new Date()}
        />
      )}

      <OfflineBanner />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing && !isBlocked}
            onRefresh={onRefresh}
            enabled={!isBlocked}
          />
        }
      >
        <OnlineRequiredNotice
          visible={isBlocked}
          message="Necesitás conexión a Internet para ver el Historial de Atención."
        />
        {requiresRelogin && !isBlocked && (
          <OnlineRequiredNotice
            visible={true}
            message="Tu sesión expiró. Cerrá sesión e iniciá nuevamente para usar esta función."
          />
        )}

        {/* Selector Grupo Familiar */}
        {credenciales && credenciales.length > 0 && (
          <View style={[styles.selectorContainer, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}>
            <View style={styles.selectorHeader}>
              <Ionicons name="people-outline" size={18} color={colors.primary} />
              <Text style={[styles.selectorLabel, { color: colors.textPrimary }]}>Seleccionar miembro del grupo</Text>
            </View>
            <ModalPicker
              selectedValue={selectedAfiliadoId}
              onValueChange={(itemValue) => handleSelectAfiliado(String(itemValue))}
              items={credenciales.map((cred: any) => {
                const id = String(cred.crcreid || cred.crcreafili || cred.crcrenroaf || '').trim()
                const nombre = String(cred.crcreapeno || '').trim()
                const esTitular = cred.crcrepropi === 'S'
                return { label: `${nombre}${esTitular ? ' (TITULAR)' : ''}`, value: id }
              })}
            />
          </View>
        )}

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {activeFilterCount > 0
            ? `${filteredHistorial.length} de ${historial.length} atenciones`
            : 'Últimas atenciones médicas registradas'}
        </Text>

        {/* Loading */}
        {loading && !refreshing && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.success} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Consultando historial...</Text>
          </View>
        )}

        {/* Lista de Historial */}
        {!loading && filteredHistorial.length > 0 && (
          <View style={styles.historialContainer}>
            {filteredHistorial.map((item, index) => renderHistorialItem(item, index))}
          </View>
        )}

        {/* Sin Datos */}
        {!loading && historial.length > 0 && filteredHistorial.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="filter-outline" size={64} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Sin resultados</Text>
            <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>Ninguna atención coincide con los filtros activos.</Text>
            <TouchableOpacity style={[styles.clearBtnFull, { backgroundColor: colors.primary }]} onPress={clearFilters}>
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Limpiar filtros</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && historial.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No se encontraron atenciones médicas
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
              El historial muestra las últimas atenciones registradas
            </Text>
          </View>
        )}

        {/* Paginación */}
        {historial.length > 0 && totalPaginas > 1 && (
          <View style={styles.paginacionContainer}>
            <Text style={[styles.paginacionText, { color: colors.textSecondary }]}>
              Página {pagina} de {totalPaginas}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Modal Detalle de Prácticas */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={closeModal}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Header Modal */}
          <View style={[styles.modalHeader, { backgroundColor: colors.headerBackground }]}> 
            <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Detalle de Prácticas</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Info Atención */}
          {selectedAtencion && (
            <View style={[styles.modalInfoCard, { backgroundColor: colors.surface }]}>
              <View style={styles.modalInfoRow}>
                <Ionicons name="calendar" size={18} color={colors.success} />
                <Text style={[styles.modalInfoText, { color: colors.textPrimary }]}>
                  {formatFecha(selectedAtencion.AtencionFecha)}
                </Text>
              </View>
              <View style={styles.modalInfoRow}>
                <Ionicons name="business" size={18} color={colors.success} />
                <Text style={[styles.modalInfoText, { color: colors.textPrimary }]}>
                  {selectedAtencion.EntidadNombre.trim()}
                </Text>
              </View>
              <View style={styles.modalInfoRow}>
                <Ionicons name="finger-print" size={18} color={colors.success} />
                <Text style={[styles.modalInfoTextSmall, { color: colors.textSecondary }]}>
                  {selectedAtencion.AtencionId}
                </Text>
              </View>
            </View>
          )}

          {/* Loading Detalle */}
          {detalleLoading && (
            <View style={styles.modalLoadingContainer}>
              <ActivityIndicator size="large" color={colors.success} />
              <Text style={[styles.modalLoadingText, { color: colors.textSecondary }]}>Cargando prácticas...</Text>
            </View>
          )}

          {/* Lista de Prácticas */}
          {!detalleLoading && (
            <ScrollView style={styles.modalScrollView}>
              {detallePracticas.length > 0 ? (
                detallePracticas.map((practica, index) => (
                  <View key={index} style={[styles.practicaCard, { backgroundColor: colors.surface }]}>
                    {Object.keys(practica).map((key) => (
                      <View key={key} style={[styles.practicaRow, { borderBottomColor: colors.borderLight }]}>
                        <Text style={[styles.practicaLabel, { color: colors.textSecondary }]}>{key}:</Text>
                        <Text style={[styles.practicaValue, { color: colors.textPrimary }]}>
                          {String(practica[key]).trim()}
                        </Text>
                      </View>
                    ))}
                  </View>
                ))
              ) : (
                <View style={styles.modalEmptyContainer}>
                  <Ionicons name="document-outline" size={60} color={colors.textMuted} />
                  <Text style={[styles.modalEmptyText, { color: colors.textMuted }]}>
                    No hay prácticas registradas
                  </Text>
                </View>
              )}

              {/* ── Acciones: Desconocer y Calificar ── */}
              <View style={[styles.accionesContainer, { borderTopColor: colors.border }]}>
                <Text style={[styles.accionesTitle, { color: colors.textSecondary }]}>Acciones sobre esta atención</Text>
                <View style={styles.accionesBtns}>

                  {/* Botón Desconocer */}
                  <TouchableOpacity
                    style={[styles.accionBtn, { backgroundColor: '#FFF3E0', borderColor: '#FF9800' }]}
                    onPress={() => { setDesconVisible(true); setCalifVisible(false) }}
                  >
                    <Ionicons name="alert-circle-outline" size={20} color="#FF9800" />
                    <Text style={[styles.accionBtnText, { color: '#FF9800' }]}>Desconocer</Text>
                  </TouchableOpacity>

                  {/* Botón Calificar */}
                  <TouchableOpacity
                    style={[styles.accionBtn, { backgroundColor: '#E8F5E9', borderColor: '#4CAF50' }]}
                    onPress={() => { setCalifVisible(true); setDesconVisible(false) }}
                  >
                    <Ionicons name="star-outline" size={20} color="#4CAF50" />
                    <Text style={[styles.accionBtnText, { color: '#4CAF50' }]}>Calificar</Text>
                  </TouchableOpacity>

                </View>

                {/* Panel de Desconocimiento */}
                {desconVisible && (
                  <View style={[styles.accionPanel, { backgroundColor: colors.surface, borderColor: '#FF9800' }]}>
                    <Text style={[styles.accionPanelTitle, { color: '#E65100' }]}>⚠️ Desconocer práctica</Text>
                    <Text style={[styles.accionPanelSub, { color: colors.textSecondary }]}>
                      Indicá el motivo y una descripción opcional.
                    </Text>

                    <Text style={[styles.pickerLabel, { color: colors.textPrimary }]}>Motivo:</Text>
                    <View style={[styles.microPickerWrap, { borderColor: colors.border }]}>
                      <Picker
                        selectedValue={desconMotivo}
                        onValueChange={(v) => setDesconMotivo(v as any)}
                        style={{ height: 44 }}
                      >
                        <Picker.Item label="No lo reconozco" value="no_reconozco" />
                        <Picker.Item label="Datos incorrectos" value="incorrecto" />
                        <Picker.Item label="Atención duplicada" value="duplicado" />
                        <Picker.Item label="Otro motivo" value="otro" />
                      </Picker>
                    </View>

                    <TextInput
                      style={[styles.accionInput, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.background }]}
                      placeholder="Comentario (opcional)..."
                      placeholderTextColor={colors.textMuted}
                      value={desconDescripcion}
                      onChangeText={setDesconDescripcion}
                      multiline
                      numberOfLines={2}
                    />

                    <View style={styles.accionPanelBtns}>
                      <TouchableOpacity style={styles.accionCancelBtn} onPress={() => setDesconVisible(false)}>
                        <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.accionConfirmBtn, { backgroundColor: '#E65100' }]}
                        onPress={handleDesconocer}
                        disabled={desconLoading}
                      >
                        {desconLoading
                          ? <ActivityIndicator color="#fff" size="small" />
                          : <Text style={{ color: '#fff', fontWeight: '600' }}>Enviar reclamo</Text>
                        }
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Panel de Calificación */}
                {califVisible && (
                  <View style={[styles.accionPanel, { backgroundColor: colors.surface, borderColor: '#4CAF50' }]}>
                    <Text style={[styles.accionPanelTitle, { color: '#2E7D32' }]}>⭐ Calificar atención</Text>
                    <Text style={[styles.accionPanelSub, { color: colors.textSecondary }]}>
                      {selectedAtencion?.EntidadNombre.trim()}
                    </Text>

                    {/* Estrellas */}
                    <View style={styles.starsRow}>
                      {[1,2,3,4,5].map(n => (
                        <TouchableOpacity key={n} onPress={() => setCalifPuntuacion(n)}>
                          <Ionicons
                            name={n <= califPuntuacion ? 'star' : 'star-outline'}
                            size={36}
                            color={n <= califPuntuacion ? '#FFC107' : '#ccc'}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>

                    <TextInput
                      style={[styles.accionInput, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.background }]}
                      placeholder="Comentario (opcional)..."
                      placeholderTextColor={colors.textMuted}
                      value={califComentario}
                      onChangeText={setCalifComentario}
                      multiline
                      numberOfLines={2}
                    />

                    <View style={styles.accionPanelBtns}>
                      <TouchableOpacity style={styles.accionCancelBtn} onPress={() => setCalifVisible(false)}>
                        <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.accionConfirmBtn, { backgroundColor: '#2E7D32' }]}
                        onPress={handleCalificar}
                        disabled={califLoading || califPuntuacion < 1}
                      >
                        {califLoading
                          ? <ActivityIndicator color="#fff" size="small" />
                          : <Text style={{ color: '#fff', fontWeight: '600' }}>Enviar calificación</Text>
                        }
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  subtitle: {
    fontSize: 14,
    color: '#666',
    padding: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  historialContainer: {
    padding: 16,
  },
  historialCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  historialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fecha: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  historialBody: {
    gap: 12,
  },
  historialRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    marginRight: 8,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  historialLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  historialValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  idText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  tapHint: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  tapHintText: {
    fontSize: 12,
    color: '#4CAF50',
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
    textAlign: 'center',
  },
  paginacionContainer: {
    alignItems: 'center',
    padding: 16,
  },
  paginacionText: {
    fontSize: 14,
    color: '#666',
  },
  // Selector grupo familiar
  selectorContainer: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  selectorLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  // Estilos del Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 16,
    elevation: 4,
  },
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalInfoCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 2,
    gap: 8,
  },
  modalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalInfoText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  modalInfoTextSmall: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
    flex: 1,
  },
  modalLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  modalLoadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  modalScrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  practicaCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
    elevation: 2,
  },
  practicaRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  practicaLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
    width: 140,
  },
  practicaValue: {
    fontSize: 13,
    color: '#333',
    flex: 1,
  },
  modalEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  modalEmptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  // ── Filtros ──
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  filterPanel: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    minWidth: 56,
  },
  filterInput: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  datePillText: {
    fontSize: 12,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
    paddingVertical: 4,
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  clearBtnFull: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  // ── Acciones Desconocimiento / Calificación ──
  accionesContainer: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    marginTop: 8,
  },
  accionesTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  accionesBtns: {
    flexDirection: 'row',
    gap: 10,
  },
  accionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  accionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  accionPanel: {
    marginTop: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  accionPanelTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  accionPanelSub: {
    fontSize: 13,
  },
  pickerLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  microPickerWrap: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  accionInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  accionPanelBtns: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  accionCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  accionConfirmBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
})


