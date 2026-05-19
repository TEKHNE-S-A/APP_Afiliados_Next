import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image, Modal, Dimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import ImageZoom from 'react-native-image-pan-zoom'
import { formatFecha } from '../utils/dateUtils'
import { apiGet, getPrestaciones } from '../services/api'
import { useTheme } from '../theme'

const { width: screenWidth, height: screenHeight } = Dimensions.get('window')

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
  afiliado_nombre?: string
  numero_afiliado?: string
}

interface DetallePractica {
  nombre: string
  cantidad: number
  importeCoseguro: number
}

function labelTipo(tipo: string): string {
  return tipo === 'P' ? 'Con Prescripción' : 'Sin Prescripción'
}

function estadoColor(estado: string): string {
  switch ((estado || '').toUpperCase()) {
    case 'AUD':
      return '#3B82F6'
    case 'AUT':
    case 'APR':
      return '#4CAF50'
    case 'ENV':
      return '#FF9800'
    case 'REC':
      return '#EF4444'
    case 'CON':
      return '#0EA5A4'
    case 'ERR':
      return '#B71C1C'
    case 'PEN':
      return '#FF9800'
    default:
      return '#999'
  }
}

function isAutorizada(estado: string): boolean {
  const code = safeTextOrEmpty(estado).toUpperCase()
  return code === 'AUT' || code === 'APR'
}

function isCoseguroPendiente(item: Autorizacion | undefined): boolean {
  if (!item) return false

  const estado = safeTextOrEmpty(item.estado).toUpperCase()
  const descripcion = safeTextOrEmpty(item.descripcion).toUpperCase()
  const texto = safeTextOrEmpty(item.texto).toUpperCase()
  const gravamenDesc = safeTextOrEmpty(item.gravamen_descripcion).toUpperCase()
  const gravamenCode = safeTextOrEmpty(item.gravamen_codigo)
  const tieneAutorizacion = !!safeTextOrEmpty(item.autorizacion_numero)

  const mencionaCoseguro =
    descripcion.includes('COSEGURO') ||
    texto.includes('COSEGURO') ||
    gravamenDesc.includes('COSEGURO') ||
    gravamenDesc.includes('PAGO')

  if (mencionaCoseguro) return true

  return estado === 'PEN' && tieneAutorizacion && (!!gravamenCode || !!gravamenDesc)
}

function safeText(value: unknown): string {
  const text = typeof value === 'string' ? value : value == null ? '' : String(value)
  return text.trim() ? text.trim() : '-'
}

function safeTextOrEmpty(value: unknown): string {
  const text = typeof value === 'string' ? value : value == null ? '' : String(value)
  return text.trim()
}

function normalizeAuthNumber(value: unknown): string {
  const raw = value == null ? '' : String(value).trim()
  if (!raw) return ''

  const onlyDigits = raw.replace(/\D/g, '')
  if (!onlyDigits) return raw.toUpperCase()

  const withoutLeadingZero = onlyDigits.replace(/^0+/, '')
  return withoutLeadingZero || '0'
}

function normalizePrestacionId(value: unknown): string {
  const raw = value == null ? '' : String(value).trim()
  if (!raw) return ''
  const onlyDigits = raw.replace(/\D/g, '')
  if (!onlyDigits) return raw.toUpperCase()
  const withoutLeadingZero = onlyDigits.replace(/^0+/, '')
  return withoutLeadingZero || '0'
}

function parseSoapArray(data: any): any[] {
  if (!data) return []

  if (Array.isArray(data)) return data

  if (typeof data.Resultado === 'string') {
    try {
      const parsed = JSON.parse(data.Resultado)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  if (Array.isArray(data.Resultado)) return data.Resultado

  const knownArrays = ['items', 'data', 'list', 'resultado', 'Resultados', 'Coseguros', 'Pendientes']
  for (const key of knownArrays) {
    if (Array.isArray(data[key])) return data[key]
  }

  return []
}

function getNumeroAutorizacionFromCoseguro(item: Record<string, any>): string {
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

function getNumeroDelegacionFromCoseguro(item: Record<string, any>): string {
  const keys = ['NumeroDelegacion', 'NroDelegacion', 'Delegacion', 'AUNroDelegacion']
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

function getPrestacionDescripcionFromCoseguro(item: Record<string, any>): string {
  const keys = ['Prestacion', 'NombrePractica', 'Descripcion', 'Detalle']
  for (const key of keys) {
    const value = item?.[key]
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim()
    }
  }
  return ''
}

function getPrestacionDescripcionFromDetalle(item: Record<string, any>): string {
  const keys = ['Prestacion', 'NombrePractica', 'Descripcion', 'Detalle']
  for (const key of keys) {
    const value = item?.[key]
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim()
    }
  }
  return ''
}

function formatMoney(value: unknown): string {
  const parsed = toNumber(value)
  return `$ ${parsed.toFixed(2)}`
}

function formatCantidad(value: number): string {
  if (Number.isInteger(value)) return String(value)
  return value.toFixed(2)
}

function toNumber(value: unknown): number {
  const text = value == null ? '' : String(value).trim()
  if (!text) return 0
  const normalized = text.replace(',', '.')
  const parsed = Number(normalized)
  return Number.isNaN(parsed) ? 0 : parsed
}

function getPrestacionesFromDetalle(items: Record<string, any>[]): DetallePractica[] {
  const result: DetallePractica[] = []
  const seen = new Set<string>()

  for (const item of items || []) {
    const nombre = getPrestacionDescripcionFromDetalle(item)
    if (!nombre) continue

    const cantidadRaw = item?.Cantidad ?? item?.Cant ?? item?.AUCant
    const importeRaw =
      item?.ImporteCoseguro ??
      item?.Importe ??
      item?.Monto ??
      item?.AUCoseguroImporte

    const cantidad = toNumber(cantidadRaw)
    const importeCoseguro = toNumber(importeRaw)
    const dedupeKey = `${nombre}|${cantidad}|${importeCoseguro}`

    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)
    result.push({ nombre, cantidad, importeCoseguro })
  }

  return result
}

export default function AutorizacionDetalleScreen({ navigation, route }: any) {
  const { colors } = useTheme()
  const autorizacion: Autorizacion | undefined = route?.params?.autorizacion
  const [prestacionesDetalle, setPrestacionesDetalle] = useState<DetallePractica[]>([])
  const [expandedPracticaIndex, setExpandedPracticaIndex] = useState<number | null>(null)
  const [gravamenDescripcion, setGravamenDescripcion] = useState<string>('')
  const [fotosAdjuntas, setFotosAdjuntas] = useState<string[]>([])
  const [loadingFotos, setLoadingFotos] = useState(false)
  const [fotoSeleccionada, setFotoSeleccionada] = useState<string | null>(null)

  const descripcion = safeTextOrEmpty(autorizacion?.descripcion)
  const texto = safeTextOrEmpty(autorizacion?.texto)

  useEffect(() => {
    let cancelled = false

    const resolveDescripciones = async () => {
      if (!autorizacion) return

      const prestacionId = safeTextOrEmpty(autorizacion.tipo_prestacion_id)
      const prestacionIdNormalizado = normalizePrestacionId(prestacionId)
      const gravamenCodigo = safeTextOrEmpty(autorizacion.gravamen_codigo)
      const afiliadoId = safeTextOrEmpty(autorizacion.numero_afiliado)
      const prestacionInicial = safeTextOrEmpty(autorizacion.prestacion_descripcion)
      const numeroAutorizacionNormalizado = normalizeAuthNumber(autorizacion.autorizacion_numero)
      const numeroDelegacionDirecto = safeTextOrEmpty(autorizacion.numero_delegacion)
      const numeroAutorizacionDirecto = safeTextOrEmpty(autorizacion.autorizacion_numero)

      setPrestacionesDetalle([])
      setExpandedPracticaIndex(null)
      setGravamenDescripcion(safeTextOrEmpty(autorizacion.gravamen_descripcion))

      try {
        let resolvedPrestacion = prestacionInicial

        if (numeroDelegacionDirecto && numeroAutorizacionDirecto) {
          const queryParams = new URLSearchParams({
            NumeroDelegacion: numeroDelegacionDirecto,
            NumeroAutorizacion: numeroAutorizacionDirecto,
          }).toString()
          const detalleResp = await apiGet(`/sia/detalle-consumo?${queryParams}`)
          const detalleItems = parseSoapArray(detalleResp?.data)
          const practicas = getPrestacionesFromDetalle(detalleItems)
          if (!cancelled) {
            setPrestacionesDetalle(practicas)
          }
          const firstItem = Array.isArray(detalleItems) && detalleItems.length > 0 ? detalleItems[0] : null
          const detalleDescripcion = firstItem ? getPrestacionDescripcionFromDetalle(firstItem) : ''
          if (!resolvedPrestacion && detalleDescripcion) {
            resolvedPrestacion = detalleDescripcion
          }
        }

        let matchCoseguro: Record<string, any> | null = null
        if (numeroAutorizacionNormalizado) {
          const cosegurosResp = await apiGet('/sia/coseguros-pendientes')
          const parsed = parseSoapArray(cosegurosResp?.data)

          matchCoseguro = parsed.find((item: Record<string, any>) => {
            const numero = normalizeAuthNumber(getNumeroAutorizacionFromCoseguro(item))
            return numero && numero === numeroAutorizacionNormalizado
          }) || null

          if (!resolvedPrestacion && matchCoseguro) {
            const numeroDelegacion = getNumeroDelegacionFromCoseguro(matchCoseguro)
            const numeroAutorizacion = getNumeroAutorizacionFromCoseguro(matchCoseguro)
            if (numeroDelegacion && numeroAutorizacion) {
              const queryParams = new URLSearchParams({
                NumeroDelegacion: numeroDelegacion,
                NumeroAutorizacion: numeroAutorizacion,
              }).toString()
              const detalleResp = await apiGet(`/sia/detalle-consumo?${queryParams}`)
              const detalleItems = parseSoapArray(detalleResp?.data)
              const practicas = getPrestacionesFromDetalle(detalleItems)
              if (!cancelled && practicas.length > 0) {
                setPrestacionesDetalle(practicas)
              }
              const firstItem = Array.isArray(detalleItems) && detalleItems.length > 0 ? detalleItems[0] : null
              const detalleDescripcion = firstItem ? getPrestacionDescripcionFromDetalle(firstItem) : ''
              if (detalleDescripcion) {
                resolvedPrestacion = detalleDescripcion
              }
            }
          }

          if (!resolvedPrestacion && matchCoseguro) {
            const descripcionCoseguro = getPrestacionDescripcionFromCoseguro(matchCoseguro)
            if (descripcionCoseguro) {
              resolvedPrestacion = descripcionCoseguro
            }
          }
        }

        if (!resolvedPrestacion && (prestacionId || prestacionIdNormalizado)) {
          const prestacionesResp = await getPrestaciones()
          if (!cancelled && prestacionesResp?.success && Array.isArray(prestacionesResp.prestaciones)) {
            const match = prestacionesResp.prestaciones.find((item: any) => {
              const itemId = String(item.AULPresID || '').trim()
              const itemIdNormalizado = normalizePrestacionId(itemId)
              return (prestacionId && itemId === prestacionId) ||
                (prestacionIdNormalizado && itemIdNormalizado === prestacionIdNormalizado)
            })
            if (match?.AULPresDescripcion) {
              resolvedPrestacion = String(match.AULPresDescripcion).trim()
            }
          }
        }

        if (gravamenCodigo && afiliadoId) {
          const enrolResp = await apiGet(`/sia/enrolamientos-afiliado?AfiliadoId=${encodeURIComponent(afiliadoId)}`)
          const enrolamientos = enrolResp?.data?.Enrolamientos
          if (!cancelled && Array.isArray(enrolamientos)) {
            const match = enrolamientos.find((item: any) => String(item.CodigoCobertura || '').trim() === gravamenCodigo)
            if (match?.DescripcionCobertura) {
              setGravamenDescripcion(String(match.DescripcionCobertura).trim())
            }
          }
        }
      } catch (error) {
        console.log('⚠️ No se pudieron resolver descripciones de gravamen/prestación:', error)
      }
    }

    resolveDescripciones()

    return () => {
      cancelled = true
    }
  }, [autorizacion])

  useEffect(() => {
    let cancelled = false

    const cargarFotosAdjuntas = async () => {
      const ausolicid = safeTextOrEmpty(autorizacion?.ausolicid)
      const tipo = safeTextOrEmpty(autorizacion?.tipo).toUpperCase()

      setFotosAdjuntas([])

      if (!ausolicid || tipo !== 'P') return

      try {
        setLoadingFotos(true)
        const resp = await apiGet(`/mis-autorizaciones/${encodeURIComponent(ausolicid)}/fotos`)
        const fotos = Array.isArray(resp?.fotos)
          ? resp.fotos
              .map((item: any) => safeTextOrEmpty(item?.dataUrl))
              .filter((url: string) => url.length > 0)
          : []

        if (!cancelled) {
          setFotosAdjuntas(fotos)
        }
      } catch (error) {
        console.log('⚠️ No se pudieron cargar fotos adjuntas:', error)
      } finally {
        if (!cancelled) {
          setLoadingFotos(false)
        }
      }
    }

    cargarFotosAdjuntas()

    return () => {
      cancelled = true
    }
  }, [autorizacion])

  if (!autorizacion) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Detalle</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Sin datos</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No se recibió la autorización para mostrar.</Text>
        </View>
      </SafeAreaView>
    )
  }

  const isEnvioFallido = ['ERR'].includes((autorizacion?.estado || '').toUpperCase())
  const totalCantidadPracticas = prestacionesDetalle.reduce((acc, item) => acc + item.cantidad, 0)
  const totalImportePracticas = prestacionesDetalle.reduce((acc, item) => acc + item.importeCoseguro, 0)

  const handleReintentar = () => {
    Alert.alert(
      'Reintentar envío',
      'La solicitud no pudo enviarse a SIA por un error de conexión. ¿Deseas intentar enviarla nuevamente?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reintentar',
          onPress: () => {
            navigation.navigate('SolicitudAutorizacion', {
              reintentar: true,
              tipo: autorizacion!.tipo,
              referencia: autorizacion!.descripcion,
              profesional: autorizacion!.profesional,
            })
          },
        },
      ]
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Detalle</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}>
          <View style={styles.rowBetween}>
            <View style={styles.tipoContainer}>
              <Ionicons name={autorizacion.tipo === 'P' ? 'camera' : 'list'} size={20} color="#4CAF50" />
              <Text style={styles.tipoText}>{labelTipo(autorizacion.tipo)}</Text>
            </View>
            <View style={[styles.estadoBadge, { backgroundColor: estadoColor(autorizacion.estado) }]}>
              <Text style={styles.estadoText}>{safeText(autorizacion.estado)}</Text>
            </View>
          </View>

          <Text style={[styles.descripcion, { color: colors.textPrimary }]}>{descripcion || 'Sin referencia'}</Text>

          {!!texto && texto !== descripcion && <Text style={[styles.texto, { color: colors.textSecondary }]}>{texto}</Text>}

          <View style={styles.marcaContainer}>
            {isCoseguroPendiente(autorizacion) ? (
              <View style={[styles.marcaBadge, { backgroundColor: colors.warning + '22', borderColor: colors.warning }]}>
                <Ionicons name="wallet-outline" size={14} color={colors.warning} />
                <Text style={[styles.marcaText, { color: colors.warning }]}>Coseguro pendiente</Text>
              </View>
            ) : isAutorizada(autorizacion.estado) ? (
              <View style={[styles.marcaBadge, { backgroundColor: colors.success + '22', borderColor: colors.success }]}>
                <Ionicons name="checkmark-circle-outline" size={14} color={colors.success} />
                <Text style={[styles.marcaText, { color: colors.success }]}>Autorizada</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>DATOS</Text>

            {!!safeTextOrEmpty(autorizacion.afiliado_nombre) && (
              <View style={[styles.detailRow, { borderBottomColor: colors.borderLight }]}>
                <Ionicons name="id-card-outline" size={18} color={colors.textSecondary} />
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Afiliado</Text>
                <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                  {safeText(autorizacion.afiliado_nombre)}
                  {safeTextOrEmpty(autorizacion.numero_afiliado) ? ` (${safeText(autorizacion.numero_afiliado)})` : ''}
                </Text>
              </View>
            )}

            <View style={[styles.detailRow, { borderBottomColor: colors.borderLight }]}>
              <Ionicons name="barcode-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>N° autorización</Text>
              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{safeText(autorizacion.autorizacion_numero)}</Text>
            </View>

            <View style={[styles.detailRow, { borderBottomColor: colors.borderLight }]}>
              <Ionicons name="key-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>ID solicitud</Text>
              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{safeText(autorizacion.ausolicid)}</Text>
            </View>

            <View style={[styles.detailRow, { borderBottomColor: colors.borderLight }]}>
              <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Fecha alta</Text>
              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                {autorizacion.fecha_alta || autorizacion.fecha_orden
                  ? formatFecha(autorizacion.fecha_alta || autorizacion.fecha_orden)
                  : '-'}
              </Text>
            </View>

            <View style={[styles.detailRow, { borderBottomColor: colors.borderLight }]}>
              <Ionicons name="calendar-clear-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Fecha orden</Text>
              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{autorizacion.fecha_orden ? formatFecha(autorizacion.fecha_orden) : '-'}</Text>
            </View>

            <View style={[styles.detailRow, { borderBottomColor: colors.borderLight }]}>
              <Ionicons name="calculator-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Cantidad</Text>
              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{safeText(autorizacion.cantidad)}</Text>
            </View>

            {prestacionesDetalle.length > 0 && (
              <View style={[styles.practicasSection, { borderBottomColor: colors.borderLight }]}>
                <View style={styles.practicasSectionHeader}>
                  <Ionicons name="list-outline" size={18} color={colors.textSecondary} />
                  <Text style={[styles.practicasSectionTitle, { color: colors.textSecondary }]}>Prácticas</Text>
                  <Text style={[styles.practicasSectionHint, { color: colors.textSecondary }]}>Tocar nombre para expandir</Text>
                </View>

                <View style={[styles.practicasTableContainer, styles.practicasTableContainerFull, { borderColor: colors.borderLight, backgroundColor: colors.background }]}>
                  <View style={[styles.practicasTableHeader, { borderBottomColor: colors.borderLight, backgroundColor: colors.surface }]}>
                    <Text style={[styles.colPracticaHeader, { color: colors.textSecondary }]}>Práctica</Text>
                    <Text style={[styles.colCantidadHeader, { color: colors.textSecondary }]}>Cant.</Text>
                    <Text style={[styles.colImporteHeader, { color: colors.textSecondary }]}>Coseguro</Text>
                  </View>

                  {prestacionesDetalle.map((practica, index) => {
                    const isExpanded = expandedPracticaIndex === index

                    return (
                      <View
                        key={`${index}-${practica.nombre}-${practica.cantidad}-${practica.importeCoseguro}`}
                        style={[
                          styles.practicasTableRow,
                          { borderBottomColor: colors.borderLight },
                          isExpanded ? { backgroundColor: colors.primary + '12' } : null,
                        ]}
                      >
                        <TouchableOpacity
                          style={styles.colPracticaTouchable}
                          onPress={() => setExpandedPracticaIndex(isExpanded ? null : index)}
                          activeOpacity={0.75}
                        >
                          <Text style={[styles.colPracticaValue, { color: colors.textPrimary }]} numberOfLines={isExpanded ? undefined : 2}>
                            {practica.nombre}
                          </Text>
                          <View style={styles.expandHintRow}>
                            <Ionicons
                              name={isExpanded ? 'chevron-up-outline' : 'chevron-down-outline'}
                              size={12}
                              color={isExpanded ? colors.primary : colors.textSecondary}
                            />
                            <Text style={[styles.expandHintText, { color: isExpanded ? colors.primary : colors.textSecondary }]}>
                              {isExpanded ? 'Ver menos' : 'Ver más'}
                            </Text>
                          </View>
                        </TouchableOpacity>
                        <Text style={[styles.colCantidadValue, { color: colors.textPrimary }]}>
                          {formatCantidad(practica.cantidad)}
                        </Text>
                        <Text style={[styles.colImporteValue, { color: colors.textPrimary }]}>
                          {formatMoney(practica.importeCoseguro)}
                        </Text>
                      </View>
                    )
                  })}

                  <View style={[styles.practicasTableTotalRow, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.colPracticaTotal, { color: colors.textPrimary }]}>Totales</Text>
                    <Text style={[styles.colCantidadTotal, { color: colors.textPrimary }]}>
                      {formatCantidad(totalCantidadPracticas)}
                    </Text>
                    <Text style={[styles.colImporteTotal, { color: colors.textPrimary }]}>
                      {formatMoney(totalImportePracticas)}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <View style={[styles.detailRow, { borderBottomColor: colors.borderLight }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Gravamen</Text>
              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{safeText(gravamenDescripcion || autorizacion.gravamen_descripcion || 'Sin descripción')}</Text>
            </View>

            <View style={[styles.detailRow, { borderBottomColor: colors.borderLight }]}>
              <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Profesional</Text>
              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{safeText(autorizacion.profesional)}</Text>
            </View>

            {safeTextOrEmpty(autorizacion.tipo).toUpperCase() === 'P' && (
              <View style={styles.fotosSection}>
                <View style={styles.fotosHeader}>
                  <Ionicons name="images-outline" size={18} color={colors.textSecondary} />
                  <Text style={[styles.fotosTitle, { color: colors.textSecondary }]}>
                    Imágenes adjuntas{fotosAdjuntas.length > 0 ? ` (${fotosAdjuntas.length})` : ''}
                  </Text>
                </View>

                {loadingFotos ? (
                  <View style={styles.fotosLoadingContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[styles.fotosHint, { color: colors.textSecondary }]}>Cargando imágenes...</Text>
                  </View>
                ) : fotosAdjuntas.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fotosRow}>
                    {fotosAdjuntas.map((foto, index) => (
                      <TouchableOpacity
                        key={`foto-${index}`}
                        style={[styles.fotoCard, { borderColor: colors.borderLight, backgroundColor: colors.surfaceVariant }]}
                        activeOpacity={0.85}
                        onPress={() => setFotoSeleccionada(foto)}
                      >
                        <Image source={{ uri: foto }} style={styles.fotoImage} resizeMode="cover" />
                        <Text style={[styles.fotoLabel, { color: colors.textSecondary }]}>Foto {index + 1} · Tocar para ampliar</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : (
                  <Text style={[styles.fotosHint, { color: colors.textSecondary }]}>No hay imágenes adjuntas para esta solicitud.</Text>
                )}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {isEnvioFallido && (
        <View style={[styles.footerContainer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.reintentarBtn, { backgroundColor: colors.primary || '#2196F3' }]}
            onPress={handleReintentar}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.reintentarBtnText}>Reintentar solicitud</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={!!fotoSeleccionada}
        transparent
        animationType="fade"
        onRequestClose={() => setFotoSeleccionada(null)}
      >
        <View style={[styles.fotoModalOverlay, { backgroundColor: colors.modalOverlay || 'rgba(0,0,0,0.92)' }]}>
          <TouchableOpacity style={styles.fotoModalClose} onPress={() => setFotoSeleccionada(null)}>
            <Ionicons name="close-circle" size={34} color="#fff" />
          </TouchableOpacity>

          {fotoSeleccionada ? (
            <ImageZoom
              cropWidth={screenWidth}
              cropHeight={screenHeight}
              imageWidth={screenWidth - 24}
              imageHeight={screenHeight * 0.78}
              enableSwipeDown
              onSwipeDown={() => setFotoSeleccionada(null)}
              minScale={1}
              maxScale={4}
            >
              <Image
                source={{ uri: fotoSeleccionada }}
                style={styles.fotoModalImage}
                resizeMode="contain"
              />
            </ImageZoom>
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  texto: {
    fontSize: 13,
    color: '#666',
    marginTop: -6,
    marginBottom: 12,
    lineHeight: 18,
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
  section: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#6B7280',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailRowTop: {
    alignItems: 'flex-start',
  },
  practicasSection: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  practicasSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  practicasSectionTitle: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  practicasSectionHint: {
    marginLeft: 'auto',
    fontSize: 11,
  },
  detailLabel: {
    marginLeft: 10,
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    maxWidth: '50%',
    textAlign: 'right',
  },
  detailListValueContainer: {
    maxWidth: '74%',
    alignItems: 'flex-end',
  },
  practicasTableContainer: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  practicasTableContainerFull: {
    width: '100%',
  },
  practicasTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  practicasTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  practicasTableTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  colPracticaHeader: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    paddingRight: 8,
  },
  colCantidadHeader: {
    width: 60,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  colImporteHeader: {
    width: 112,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  colPracticaValue: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    paddingRight: 6,
  },
  colPracticaTouchable: {
    flex: 1,
    paddingRight: 8,
  },
  expandHintRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expandHintText: {
    fontSize: 11,
    fontWeight: '600',
  },
  colCantidadValue: {
    width: 60,
    fontSize: 13,
    textAlign: 'right',
  },
  colImporteValue: {
    width: 112,
    fontSize: 13,
    textAlign: 'right',
  },
  colPracticaTotal: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  colCantidadTotal: {
    width: 60,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
  colImporteTotal: {
    width: 112,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
  footerContainer: {
    padding: 16,
    borderTopWidth: 1,
  },
  reintentarBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 10,
  },
  reintentarBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  fotosSection: {
    marginTop: 12,
    paddingTop: 10,
  },
  fotosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fotosTitle: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  fotosLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  fotosHint: {
    fontSize: 12,
    lineHeight: 16,
  },
  fotosRow: {
    gap: 10,
    paddingVertical: 2,
  },
  fotoCard: {
    width: 160,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  fotoImage: {
    width: '100%',
    height: 120,
  },
  fotoLabel: {
    fontSize: 12,
    paddingVertical: 6,
    textAlign: 'center',
    fontWeight: '600',
  },
  fotoModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fotoModalClose: {
    position: 'absolute',
    top: 44,
    right: 16,
    zIndex: 10,
  },
  fotoModalImageWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  fotoModalImage: {
    width: screenWidth - 24,
    height: screenHeight * 0.78,
  },
})
