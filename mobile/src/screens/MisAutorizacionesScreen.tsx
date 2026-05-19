import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  TextInput,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import { apiGet, getPrestaciones } from '../services/api'
import { formatFecha } from '../utils/dateUtils'
import { useAuth } from '../contexts/AuthContext'
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import { OnlineRequiredNotice } from '../components/OnlineRequiredNotice'
import { useTheme } from '../theme'
import CurvedHeroHeader from '../components/CurvedHeroHeader'

interface Autorizacion {
  ausolicid: string
  descripcion: string
  texto?: string
  fecha_alta: string
  fecha_orden: string
  tipo: string
  estado: string
  cantidad: number
  profesional: string
  autorizacion_numero: string
  numero_delegacion?: string
  tipo_prestacion_id: string
  gravamen_codigo?: string
  prestacion_descripcion?: string
  gravamen_descripcion?: string
  orden_local?: number
  afiliado_nombre?: string
  numero_afiliado?: string
}

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

function normalizeAuthNumber(value: unknown): string {
  const raw = value == null ? '' : String(value).trim()
  if (!raw) return ''

  const onlyDigits = raw.replace(/\D/g, '')
  if (!onlyDigits) return raw.toUpperCase()

  const withoutLeadingZero = onlyDigits.replace(/^0+/, '')
  return withoutLeadingZero || '0'
}

function getNumeroAutorizacionFromCoseguro(item: GenericItem): string {
  const keys = [
    'NumeroAutorizacion',
    'NroAutorizacion',
    'Autorizacion',
    'AutorizacionId',
    'AUNroAutorizacion',
    'AUAutNumero',
    'AtencionNro',
  ]

  for (const key of keys) {
    const value = item?.[key]
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim()
    }
  }

  const atencionId = String(item?.AtencionId || item?.AtenId || item?.AtencionNroCompleto || '').trim()
  if (atencionId.length > 6) {
    return atencionId.substring(5)
  }

  return ''
}

function getNumeroDelegacionFromCoseguro(item: GenericItem): string {
  const keys = [
    'NumeroDelegacion',
    'NroDelegacion',
    'Delegacion',
    'AUNroDelegacion',
  ]

  for (const key of keys) {
    const value = item?.[key]
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim()
    }
  }

  const atencionId = String(item?.AtencionId || item?.AtenId || item?.AtencionNroCompleto || '').trim()
  if (atencionId.length > 6) {
    return atencionId.substring(0, 5)
  }

  return ''
}

function getPrestacionDescripcionFromCoseguro(item: GenericItem): string {
  const keys = ['Prestacion', 'NombrePractica', 'Descripcion', 'Detalle']
  for (const key of keys) {
    const value = item?.[key]
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim()
    }
  }
  return ''
}

function getPrestacionDescripcionFromDetalle(item: GenericItem): string {
  const keys = ['Prestacion', 'NombrePractica', 'Descripcion', 'Detalle']
  for (const key of keys) {
    const value = item?.[key]
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim()
    }
  }
  return ''
}

function normalizePrestacionId(value: unknown): string {
  const raw = value == null ? '' : String(value).trim()
  if (!raw) return ''
  const onlyDigits = raw.replace(/\D/g, '')
  if (!onlyDigits) return raw.toUpperCase()
  const withoutLeadingZero = onlyDigits.replace(/^0+/, '')
  return withoutLeadingZero || '0'
}

export default function MisAutorizacionesScreen({ navigation, route }: any) {
  const { token, isOfflineMode, signOut } = useAuth()
  const isFromRoot = route?.params?.fromRoot === true
  const { isConnected, isInternetReachable, type } = useNetworkStatus()
  const isAirplaneMode = type === 'none'
  const isOnline = isConnected && isInternetReachable !== false && !isAirplaneMode
  const isBlocked = !!isOfflineMode || !isOnline
  const { colors } = useTheme()
  const [autorizaciones, setAutorizaciones] = useState<Autorizacion[]>([])
  const [cosegurosPendientesSet, setCosegurosPendientesSet] = useState<Set<string>>(new Set())
  const [prestacionesById, setPrestacionesById] = useState<Record<string, string>>({})
  const [prestacionesByAuth, setPrestacionesByAuth] = useState<Record<string, string>>({})
  const [prestacionesByDetalleAuth, setPrestacionesByDetalleAuth] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Filtros
  const [filterVisible, setFilterVisible] = useState(false)
  const [filterTipo, setFilterTipo] = useState<'todos' | 'P' | 'S'>('todos')
  const [filterEstado, setFilterEstado] = useState<'todos' | 'ENV' | 'AUD' | 'AUT' | 'REC' | 'PEN' | 'CON'>('todos')
  const [filterFechaDesde, setFilterFechaDesde] = useState<Date | null>(null)
  const [filterFechaHasta, setFilterFechaHasta] = useState<Date | null>(null)
  const [filterSearch, setFilterSearch] = useState('')
  const [showPickerDesde, setShowPickerDesde] = useState(false)
  const [showPickerHasta, setShowPickerHasta] = useState(false)

  const lastLoadedKeyRef = useRef<string | null>(null)

  const toApiDate = (date: Date | null): string => {
    if (!date) return ''
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  useEffect(() => {
    if (isOfflineMode) return
    if (!token) return
    if (isBlocked) return

    const currentLoadKey = [
      token,
      filterTipo,
      filterEstado,
      toApiDate(filterFechaDesde),
      toApiDate(filterFechaHasta),
      filterSearch,
    ].join('|')

    // Si ya cargó para este token y hay datos/estado válido, evitar recarga redundante.
    if (lastLoadedKeyRef.current === currentLoadKey && (autorizaciones.length > 0 || (!loading && !loadError))) {
      return
    }

    lastLoadedKeyRef.current = currentLoadKey
    cargarAutorizaciones()
  }, [isOfflineMode, token, isBlocked, filterTipo, filterEstado, filterFechaDesde, filterFechaHasta, filterSearch])

  const cargarAutorizaciones = async () => {
    try {
      setLoading(true)
      setLoadError(null)
      console.log('🔄 Cargando autorizaciones...')

      // Bloqueo explícito por modo avión/sin internet.
      if (isBlocked) {
        // Evitar mostrar error prematuro mientras NetInfo termina de resolver estado.
        setLoadError(null)
        return
      }

      if (isOfflineMode) {
        console.log('🟠 Modo offline: Mis Autorizaciones no se muestra (solo online)')
        setLoadError(null)
        setAutorizaciones([])
        return
      }

      if (!token) {
        console.log('🔒 Sin token: no se puede consultar /mis-autorizaciones (modo cache)')
        setLoadError(null)
        setAutorizaciones([])
        return
      }
      
      const queryParams = new URLSearchParams()
      if (filterTipo !== 'todos') queryParams.set('tipo', filterTipo)
      if (filterEstado !== 'todos') queryParams.set('estado', filterEstado)
      if (filterFechaDesde) queryParams.set('fechaDesde', toApiDate(filterFechaDesde))
      if (filterFechaHasta) queryParams.set('fechaHasta', toApiDate(filterFechaHasta))
      if (filterSearch.trim()) queryParams.set('search', filterSearch.trim())

      const misAutorizacionesPath = `/mis-autorizaciones${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
      console.log('📤 Cargando autorizaciones con filtros:', misAutorizacionesPath)

      const [misAutorizacionesResponse, cosegurosResponse, prestacionesResponse] = await Promise.allSettled([
        apiGet(misAutorizacionesPath),
        apiGet('/sia/coseguros-pendientes'),
        getPrestaciones(),
      ])

      const response = misAutorizacionesResponse.status === 'fulfilled' ? misAutorizacionesResponse.value : null
      const cosegurosData = cosegurosResponse.status === 'fulfilled' ? cosegurosResponse.value : null
      const prestacionesData = prestacionesResponse.status === 'fulfilled' ? prestacionesResponse.value : null

      const prestacionesMap: Record<string, string> = {}
      if (prestacionesData?.success && Array.isArray(prestacionesData.prestaciones)) {
        for (const item of prestacionesData.prestaciones) {
          const id = String(item?.AULPresID ?? '').trim()
          const desc = String(item?.AULPresDescripcion ?? '').trim()
          if (id && desc) {
            prestacionesMap[id] = desc

            const normalizedId = normalizePrestacionId(id)
            if (normalizedId) {
              prestacionesMap[normalizedId] = desc
            }
          }
        }
      }
      setPrestacionesById(prestacionesMap)

      const pendings = new Set<string>()
      const prestacionesPorAutorizacion: Record<string, string> = {}
      const numerosPorAutorizacion: Record<string, { numeroDelegacion: string; numeroAutorizacion: string }> = {}

      const autorizacionesDesdeBackend = Array.isArray(response?.autorizaciones) ? response.autorizaciones : []
      for (const item of autorizacionesDesdeBackend) {
        const numeroNormalizado = normalizeAuthNumber(item?.autorizacion_numero)
        const numeroDelegacion = String(item?.numero_delegacion || '').trim()
        const numeroAutorizacion = String(item?.autorizacion_numero || '').trim()
        if (numeroNormalizado && numeroDelegacion && numeroAutorizacion && !numerosPorAutorizacion[numeroNormalizado]) {
          numerosPorAutorizacion[numeroNormalizado] = { numeroDelegacion, numeroAutorizacion }
        }
      }

      const parsedCoseguros = parseSoapArray(cosegurosData?.data)
      for (const item of parsedCoseguros) {
        const numero = normalizeAuthNumber(getNumeroAutorizacionFromCoseguro(item))
        if (numero) {
          pendings.add(numero)

          const numeroDelegacion = getNumeroDelegacionFromCoseguro(item)
          const numeroAutorizacion = getNumeroAutorizacionFromCoseguro(item)
          if (numeroDelegacion && numeroAutorizacion && !numerosPorAutorizacion[numero]) {
            numerosPorAutorizacion[numero] = { numeroDelegacion, numeroAutorizacion }
          }

          const prestacion = getPrestacionDescripcionFromCoseguro(item)
          if (prestacion && !prestacionesPorAutorizacion[numero]) {
            prestacionesPorAutorizacion[numero] = prestacion
          }
        }
      }
      setCosegurosPendientesSet(pendings)
      setPrestacionesByAuth(prestacionesPorAutorizacion)

      const prestacionesPorDetalle: Record<string, string> = {}
      const detalleRequests = Object.entries(numerosPorAutorizacion).map(async ([numeroNormalizado, numeros]) => {
        try {
          const queryParams = new URLSearchParams({
            NumeroDelegacion: numeros.numeroDelegacion,
            NumeroAutorizacion: numeros.numeroAutorizacion,
          }).toString()
          const detalleResponse = await apiGet(`/sia/detalle-consumo?${queryParams}`)
          const detalleItems = parseSoapArray(detalleResponse?.data)
          const firstItem = Array.isArray(detalleItems) && detalleItems.length > 0 ? detalleItems[0] : null
          const descripcion = firstItem ? getPrestacionDescripcionFromDetalle(firstItem) : ''
          if (descripcion) {
            prestacionesPorDetalle[numeroNormalizado] = descripcion
          }
        } catch {
          // fallback automático a otras fuentes
        }
      })
      await Promise.allSettled(detalleRequests)
      setPrestacionesByDetalleAuth(prestacionesPorDetalle)

      if (response?.success && response?.autorizaciones) {
        const autorizacionesOrdenadas = sortAutorizacionesByFechaRealizacionDesc(response.autorizaciones)
        setAutorizaciones(autorizacionesOrdenadas)
        setLoadError(null)
        console.log(`✅ ${autorizacionesOrdenadas.length} autorizaciones cargadas (ordenadas por fecha desc)`)
      } else {
        setAutorizaciones([])
        setLoadError('Respuesta inválida del servidor')
      }
    } catch (error: any) {
      console.error('❌ Error cargando autorizaciones:', error)
      const msg = error?.message ? String(error.message) : String(error)
      setLoadError(msg || 'Error desconocido')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = () => {
    setRefreshing(true)

    if (isBlocked) {
      setRefreshing(false)
      return
    }

    if (isOfflineMode) {
      setRefreshing(false)
      return
    }
    if (!token) {
      setRefreshing(false)
      return
    }
    cargarAutorizaciones()
  }

  const getTipoLabel = (tipo: string): string => {
    return tipo === 'P' ? 'Con Prescripción' : 'Sin Prescripción'
  }

  const getTipoIcon = (tipo: string): string => {
    return tipo === 'P' ? 'camera' : 'list'
  }

  const getEstadoColor = (estado: string): string => {
    // Estados de Mis Autorizaciones: ENV, AUD, AUT, REC, PEN, CON
    switch (estado.toUpperCase()) {
      case 'ENV':
        return '#FF9800'
      case 'AUD':
        return '#3B82F6'
      case 'AUT':
        return '#4CAF50'
      case 'REC':
        return '#EF4444'
      case 'PEN':
        return '#FF9800'
      case 'CON':
        return '#0EA5A4'
      default:
        return '#999'
    }
  }

  const isAutorizada = (estado: string): boolean => {
    const code = safeText(estado).toUpperCase()
    return code === 'AUT'
  }

  const isCoseguroPendiente = (item: Autorizacion): boolean => {
    const numeroAutorizacionNormalizado = normalizeAuthNumber(item.autorizacion_numero)
    if (numeroAutorizacionNormalizado && cosegurosPendientesSet.has(numeroAutorizacionNormalizado)) {
      return true
    }

    const estado = safeText(item.estado).toUpperCase()
    const descripcion = safeText(item.descripcion).toUpperCase()
    const texto = safeText(item.texto).toUpperCase()
    const gravamenDesc = safeText(item.gravamen_descripcion).toUpperCase()
    const gravamenCode = safeText(item.gravamen_codigo)
    const tieneAutorizacion = !!safeText(item.autorizacion_numero)

    const mencionaCoseguro =
      descripcion.includes('COSEGURO') ||
      texto.includes('COSEGURO') ||
      gravamenDesc.includes('COSEGURO') ||
      gravamenDesc.includes('PAGO')

    if (mencionaCoseguro) return true

    // Heurística fallback: autorización emitida + estado pendiente + dato de gravamen.
    return estado === 'PEN' && tieneAutorizacion && (!!gravamenCode || !!gravamenDesc)
  }

  const safeText = (value: unknown) => (value == null ? '' : String(value)).trim()

  const toTimestamp = (value?: string): number => {
    const dateValue = safeText(value)
    if (!dateValue) return 0

    const onlyDate = /^\d{4}-\d{2}-\d{2}/.exec(dateValue)?.[0] || dateValue
    const parsed = Date.parse(`${onlyDate}T00:00:00`)
    return Number.isNaN(parsed) ? 0 : parsed
  }

  const sortAutorizacionesByFechaRealizacionDesc = (items: Autorizacion[]): Autorizacion[] => {
    return [...items].sort((a, b) => {
      const fechaRealizacionA = toTimestamp(a.fecha_orden) || toTimestamp(a.fecha_alta)
      const fechaRealizacionB = toTimestamp(b.fecha_orden) || toTimestamp(b.fecha_alta)

      if (fechaRealizacionA !== fechaRealizacionB) {
        return fechaRealizacionB - fechaRealizacionA
      }

      const fechaAltaA = toTimestamp(a.fecha_alta)
      const fechaAltaB = toTimestamp(b.fecha_alta)
      if (fechaAltaA !== fechaAltaB) {
        return fechaAltaB - fechaAltaA
      }

      const ordenLocalA = Number(a.orden_local || 0)
      const ordenLocalB = Number(b.orden_local || 0)
      if (ordenLocalA !== ordenLocalB) {
        return ordenLocalB - ordenLocalA
      }

      return safeText(b.ausolicid).localeCompare(safeText(a.ausolicid))
    })
  }

  const getPrestacionLabel = (item: Autorizacion): string => {
    const numero = normalizeAuthNumber(item.autorizacion_numero)
    const porDetalle = numero ? prestacionesByDetalleAuth[numero] : ''
    if (porDetalle) return porDetalle

    const porAutorizacion = numero ? prestacionesByAuth[numero] : ''
    if (porAutorizacion) return porAutorizacion

    const directa = safeTextOrEmpty(item.prestacion_descripcion)
    if (directa) return directa

    const id = safeTextOrEmpty(item.tipo_prestacion_id)
    const porId = id ? (prestacionesById[id] || prestacionesById[normalizePrestacionId(id)]) : ''
    if (porId) return porId

    return '-'
  }

  const safeTextOrEmpty = (value: unknown) => (value == null ? '' : String(value)).trim()

  // Lista filtrada
  const filteredAutorizaciones = autorizaciones.filter(item => {
    if (filterTipo !== 'todos' && safeText(item.tipo).toUpperCase() !== filterTipo) return false
    if (filterEstado !== 'todos' && safeText(item.estado).toUpperCase() !== filterEstado) return false
    if (filterFechaDesde) {
      const ts = toTimestamp(item.fecha_orden || item.fecha_alta)
      if (ts && ts < filterFechaDesde.getTime()) return false
    }
    if (filterFechaHasta) {
      const ts = toTimestamp(item.fecha_orden || item.fecha_alta)
      const hastaFin = new Date(filterFechaHasta)
      hastaFin.setHours(23, 59, 59, 999)
      if (ts && ts > hastaFin.getTime()) return false
    }
    return true
  })

  const activeFilterCount =
    (filterTipo !== 'todos' ? 1 : 0) +
    (filterEstado !== 'todos' ? 1 : 0) +
    (filterFechaDesde ? 1 : 0) +
    (filterFechaHasta ? 1 : 0) +
    (filterSearch.trim() ? 1 : 0)

  const clearFilters = () => {
    setFilterTipo('todos')
    setFilterEstado('todos')
    setFilterFechaDesde(null)
    setFilterFechaHasta(null)
    setFilterSearch('')
  }

  const renderAutorizacion = ({ item }: { item: Autorizacion }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}
      activeOpacity={0.85}
      onPress={() => navigation.navigate(isFromRoot ? 'AutorizacionDetalleRoot' : 'AutorizacionDetalle', { autorizacion: item })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.tipoContainer}>
          <Ionicons name={getTipoIcon(item.tipo)} size={20} color={colors.primary} />
          <Text style={[styles.tipoText, { color: colors.primary }]}>{getTipoLabel(item.tipo)}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.estadoBadge, { backgroundColor: getEstadoColor(item.estado) }]}>
            <Text style={styles.estadoText}>{item.estado}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
      </View>

      <Text style={[styles.descripcion, { color: colors.textPrimary }]} numberOfLines={2}>
        {safeText(item.descripcion) || 'Sin referencia'}
      </Text>

      {!!safeText(item.afiliado_nombre) && (
        <View style={styles.afiliadoRow}>
          <Ionicons name="id-card-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.afiliadoText, { color: colors.textPrimary }]} numberOfLines={1}>
            {safeText(item.afiliado_nombre)}
            {safeText(item.numero_afiliado) ? ` (${safeText(item.numero_afiliado)})` : ''}
          </Text>
        </View>
      )}

      {!!safeText(item.texto) && safeText(item.texto) !== safeText(item.descripcion) && (
        <Text style={[styles.texto, { color: colors.textSecondary }]} numberOfLines={2}>
          {safeText(item.texto)}
        </Text>
      )}

      <View style={styles.marcaContainer}>
        {isCoseguroPendiente(item) ? (
          <View style={[styles.marcaBadge, { backgroundColor: colors.warning + '22', borderColor: colors.warning }]}> 
            <Ionicons name="wallet-outline" size={14} color={colors.warning} />
            <Text style={[styles.marcaText, { color: colors.warning }]}>Coseguro pendiente</Text>
          </View>
        ) : isAutorizada(item.estado) ? (
          <View style={[styles.marcaBadge, { backgroundColor: colors.success + '22', borderColor: colors.success }]}> 
            <Ionicons name="checkmark-circle-outline" size={14} color={colors.success} />
            <Text style={[styles.marcaText, { color: colors.success }]}>Autorizada</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.detallesContainer}>
        <View style={styles.detalleRow}>
          <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.detalleText, { color: colors.textSecondary }]}>{formatFecha(item.fecha_alta || item.fecha_orden)}</Text>
        </View>

        <View style={styles.detalleRow}>
          <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.detalleText, { color: colors.textSecondary }]}>{safeText(item.profesional) || 'Profesional: -'}</Text>
        </View>

        <View style={styles.detalleRow}>
          <Ionicons name="calculator-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.detalleText, { color: colors.textSecondary }]}>Cantidad: {item.cantidad}</Text>
        </View>

        <View style={styles.detalleRow}>
          <Ionicons name="medkit-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.detalleText, { color: colors.textSecondary }]}>Prestación: {getPrestacionLabel(item)}</Text>
        </View>

        {item.autorizacion_numero && item.autorizacion_numero.trim() && (
          <View style={styles.detalleRow}>
            <Ionicons name="barcode-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.detalleText, { color: colors.textSecondary }]}>#{item.autorizacion_numero.trim()}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <CurvedHeroHeader
        icon={<Ionicons name="document-text-outline" size={30} color="#FFFFFF" />}
        title="Mis Autorizaciones"
        subtitle="Consulta, filtros y estado de tus solicitudes"
        backgroundColor={colors.headerBackground}
        waveBackgroundColor={colors.background}
        subtitleStyle={styles.heroSubtitleCustom}
      >
        <View style={styles.heroActions}>
          <TouchableOpacity style={styles.heroActionButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.heroActionButton} onPress={() => setFilterVisible(v => !v)} disabled={isBlocked}>
            <View>
              <Ionicons name="filter" size={20} color="#FFFFFF" />
              {activeFilterCount > 0 && (
                <View style={[styles.filterBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.heroActionButton} onPress={onRefresh} disabled={isBlocked}>
            <Ionicons name="refresh" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </CurvedHeroHeader>

      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {loading
          ? 'Consultando solicitudes...'
          : activeFilterCount > 0
            ? `${filteredAutorizaciones.length} de ${autorizaciones.length} autorizaciones`
            : 'Revisá estados, prestaciones y solicitudes recientes'}
      </Text>

      {/* Panel de filtros */}
      {filterVisible && (
        <View style={[styles.filterPanel, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          {/* Búsqueda */}
          <View style={styles.filterRow}>
            <TextInput
              style={[styles.searchInput, { borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="Buscar prestación o prestador..."
              placeholderTextColor={colors.textMuted}
              value={filterSearch}
              onChangeText={setFilterSearch}
            />
          </View>

          {/* Fila tipo + estado */}
          <View style={styles.filterRow}>
            <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Tipo:</Text>
            <View style={styles.filterChips}>
              {(['todos', 'P', 'S'] as const).map(v => (
                <TouchableOpacity
                  key={v}
                  style={[styles.chip, filterTipo === v && { backgroundColor: colors.primary }]}
                  onPress={() => setFilterTipo(v)}
                >
                  <Text style={[styles.chipText, filterTipo === v && { color: '#fff' }]}>
                    {v === 'todos' ? 'Todos' : v === 'P' ? 'Con Prescripción' : 'Sin Prescripción'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.filterRow}>
            <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Estado:</Text>
            <View style={styles.filterChips}>
              {(['todos', 'ENV', 'AUD', 'AUT', 'REC', 'PEN', 'CON'] as const).map(v => (
                <TouchableOpacity
                  key={v}
                  style={[styles.chip, filterEstado === v && { backgroundColor: colors.primary }]}
                  onPress={() => setFilterEstado(v)}
                >
                  <Text style={[styles.chipText, filterEstado === v && { color: '#fff' }]}>
                    {v === 'todos' ? 'Todos' : v}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Fechas */}
          <View style={styles.filterRow}>
            <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Desde:</Text>
            <TouchableOpacity
              style={[styles.datePill, { borderColor: colors.border }]}
              onPress={() => setShowPickerDesde(true)}
            >
              <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.datePillText, { color: filterFechaDesde ? colors.textPrimary : colors.textMuted }]}>
                {filterFechaDesde ? filterFechaDesde.toLocaleDateString('es-AR') : 'Sin límite'}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.filterLabel, { color: colors.textSecondary, marginLeft: 8 }]}>Hasta:</Text>
            <TouchableOpacity
              style={[styles.datePill, { borderColor: colors.border }]}
              onPress={() => setShowPickerHasta(true)}
            >
              <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.datePillText, { color: filterFechaHasta ? colors.textPrimary : colors.textMuted }]}>
                {filterFechaHasta ? filterFechaHasta.toLocaleDateString('es-AR') : 'Sin límite'}
              </Text>
            </TouchableOpacity>
          </View>

          {activeFilterCount > 0 && (
            <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
              <Ionicons name="close-circle-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.clearBtnText, { color: colors.textSecondary }]}>Limpiar filtros</Text>
            </TouchableOpacity>
          )}

          {showPickerDesde && (
            <DateTimePicker
              value={filterFechaDesde || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, d) => { setShowPickerDesde(false); if (d) setFilterFechaDesde(d) }}
              maximumDate={filterFechaHasta || new Date()}
            />
          )}
          {showPickerHasta && (
            <DateTimePicker
              value={filterFechaHasta || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, d) => { setShowPickerHasta(false); if (d) setFilterFechaHasta(d) }}
              minimumDate={filterFechaDesde || undefined}
              maximumDate={new Date()}
            />
          )}
        </View>
      )}

      <OnlineRequiredNotice
        visible={isBlocked}
        message="Necesitás conexión a Internet y sesión online para ver Mis Autorizaciones."
      />

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Cargando autorizaciones...</Text>
        </View>
      ) : isOfflineMode ? (
        <View style={styles.centerContainer}>
          <Ionicons name="cloud-offline-outline" size={72} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Disponible solo online</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Para ver tus autorizaciones necesitás estar en modo online y sincronizar con el servidor.
          </Text>
          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: colors.primary }]}
            onPress={onRefresh}
            activeOpacity={0.85}
            disabled={isBlocked}
          >
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.loginButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : !token ? (
        <View style={styles.centerContainer}>
          <Ionicons name="lock-closed-outline" size={72} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Necesitás iniciar sesión</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {isOfflineMode
              ? 'Estás en modo offline (cache). Para ver tus autorizaciones tenés que iniciar sesión para obtener un token válido.'
              : 'Para ver tus autorizaciones tenés que iniciar sesión.'}
          </Text>
          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: colors.primary }]}
            onPress={() => signOut()}
            activeOpacity={0.85}
          >
            <Ionicons name="log-in-outline" size={18} color="#fff" />
            <Text style={styles.loginButtonText}>Iniciar sesión</Text>
          </TouchableOpacity>
        </View>
      ) : loadError ? (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={72} color="#EF4444" />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No se pudo cargar</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {String(loadError).includes('Network') || String(loadError).includes('conectar')
              ? 'No se pudo conectar al servidor. Verificá que el backend esté iniciado y que la API_BASE_URL sea correcta.'
              : String(loadError)}
          </Text>
          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: colors.primary }]}
            onPress={onRefresh}
            activeOpacity={0.85}
            disabled={isBlocked}
          >
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.loginButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : autorizaciones.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="document-text-outline" size={80} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Sin autorizaciones</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Aún no has realizado solicitudes de autorización
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredAutorizaciones}
          renderItem={renderAutorizacion}
          keyExtractor={(item) => item.ausolicid}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Ionicons name="filter-outline" size={64} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Sin resultados</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Ninguna autorización coincide con los filtros activos.</Text>
              <TouchableOpacity style={[styles.loginButton, { backgroundColor: colors.primary }]} onPress={clearFilters}>
                <Ionicons name="close-circle-outline" size={16} color="#fff" />
                <Text style={styles.loginButtonText}>Limpiar filtros</Text>
              </TouchableOpacity>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          }
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  subtitle: {
    fontSize: 14,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  loginButton: {
    marginTop: 16,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
    minWidth: 48,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
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
  },
  listContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  afiliadoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    marginBottom: 4,
  },
  afiliadoText: {
    flex: 1,
    fontSize: 13,
    color: '#444',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tipoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tipoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  estadoBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  estadoText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  descripcion: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  texto: {
    fontSize: 13,
    color: '#666',
    marginTop: -6,
    marginBottom: 12,
  },
  marcaContainer: {
    marginBottom: 10,
  },
  marcaBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  marcaText: {
    fontSize: 12,
    fontWeight: '700',
  },
  detallesContainer: {
    gap: 8,
  },
  detalleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detalleText: {
    fontSize: 14,
    color: '#666',
  },
})
