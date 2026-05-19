import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import ModalPicker from '../components/ModalPicker'
import * as ImagePicker from 'expo-image-picker'
import { useAuth } from '../contexts/AuthContext'
import { apiPost, getParametroMaxFotosAutorizacion } from '../services/api'
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import { OnlineRequiredNotice } from '../components/OnlineRequiredNotice'
import { useTheme } from '../theme'

interface Cobertura {
  codigo: string
  nombre: string
  descripcion: string
}

interface Prestacion {
  AULPresID: string
  AULPresDescripcion: string
}

const MAX_FOTOS_HARD_LIMIT = 5

function createEmptyFotos() {
  return Array.from({ length: MAX_FOTOS_HARD_LIMIT }, () => null as string | null)
}

function normalizeMaxFotos(value: number | null | undefined) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return MAX_FOTOS_HARD_LIMIT
  return Math.min(MAX_FOTOS_HARD_LIMIT, Math.max(1, Math.trunc(parsed)))
}

export default function SolicitudAutorizacionScreen({ navigation, route }: any) {
  const authContext = useAuth()
  const { colors } = useTheme()
  const credenciales = authContext?.credenciales || []
  const isOfflineMode = authContext?.isOfflineMode
  const { isConnected, isInternetReachable, type } = useNetworkStatus()
  const isAirplaneMode = type === 'none'
  const isOnline = isConnected && isInternetReachable !== false && !isAirplaneMode
  const isBlocked = !isOnline

  console.log('🎯 SolicitudAutorizacionScreen cargada')
  console.log('📋 Credenciales disponibles:', credenciales.length)

  // Datos pre-rellenados al reintentar una solicitud rechazada
  const datosReintentar = route?.params?.reintentar ? route.params : null

  // Estados
  const [tipoAutorizacion, setTipoAutorizacion] = useState<'P' | 'S' | ''>(datosReintentar?.tipo || '')
  const [afiliadoSeleccionado, setAfiliadoSeleccionado] = useState<string>('')
  const [coberturaSeleccionada, setCoberturaSeleccionada] = useState<string>('')
  const [prestacionSeleccionada, setPrestacionSeleccionada] = useState<string>('')
  const [cantidad, setCantidad] = useState<string>('1')
  const [referencia, setReferencia] = useState<string>(datosReintentar?.referencia || '')
  const [refreshingCreds, setRefreshingCreds] = useState(false)
  const [maxFotosPermitidas, setMaxFotosPermitidas] = useState<number>(MAX_FOTOS_HARD_LIMIT)

  // Pre-rellenar profesional si viene de Reintentar
  useEffect(() => {
    if (datosReintentar?.profesional) {
      setProfesional(datosReintentar.profesional)
    }
  }, [])

  // Auto-refresh de credenciales si el contexto las tiene vacías y hay conexión
  useEffect(() => {
    if (credenciales.length === 0 && isOnline && !isOfflineMode && authContext?.refreshCredenciales) {
      console.log('🔄 Sin credenciales al cargar pantalla — intentando refresh SOAP...')
      setRefreshingCreds(true)
      authContext.refreshCredenciales().finally(() => setRefreshingCreds(false))
    }
  }, [])
  const [profesional, setProfesional] = useState<string>('')
  const [fotos, setFotos] = useState<Array<string | null>>(createEmptyFotos)
  const [loading, setLoading] = useState(false)
  const [coberturas, setCoberturas] = useState<Cobertura[]>([])
  const [loadingCoberturas, setLoadingCoberturas] = useState(false)
  const [prestaciones, setPrestaciones] = useState<Prestacion[]>([])
  const [loadingPrestaciones, setLoadingPrestaciones] = useState(false)

  useEffect(() => {
    if (!credenciales || credenciales.length === 0 || afiliadoSeleccionado) return

    const titular = credenciales.find((cred: any) => cred.crcrepropi === 'S')
    const afiliadoInicial = String(titular?.crcreid || titular?.crcreafili || titular?.crcrenroaf || credenciales[0]?.crcreid || credenciales[0]?.crcreafili || credenciales[0]?.crcrenroaf || '').trim()

    if (afiliadoInicial) {
      setAfiliadoSeleccionado(afiliadoInicial)
      setCoberturaSeleccionada('')
      cargarCoberturas(afiliadoInicial)
    }
  }, [credenciales, afiliadoSeleccionado])

  // NOTA: Las coberturas (enrolamientos) se cargan al seleccionar un afiliado
  // useEffect eliminado - ahora se carga dinámicamente por afiliado
  // Usa la misma lógica que EnrolamientosScreen (menú Perfil)

  // Cargar prestaciones al montar o cambiar a tipo "S"
  useEffect(() => {
    if (tipoAutorizacion === 'S') {
      cargarPrestaciones()
    }
  }, [tipoAutorizacion])

  useEffect(() => {
    let cancelled = false

    const cargarMaxFotos = async () => {
      try {
        const response = await getParametroMaxFotosAutorizacion()
        const maxFotos = normalizeMaxFotos(response?.maxFotos)

        if (cancelled) return

        setMaxFotosPermitidas(maxFotos)
        setFotos((prev) => prev.map((foto, index) => (index < maxFotos ? foto : null)))
      } catch (error) {
        console.warn('⚠️ No se pudo cargar MaxFotosAutorizacion, usando fallback 5:', error)
        if (!cancelled) {
          setMaxFotosPermitidas(MAX_FOTOS_HARD_LIMIT)
        }
      }
    }

    cargarMaxFotos()

    return () => {
      cancelled = true
    }
  }, [])

  const cargarPrestaciones = async () => {
    if (isBlocked) {
      setPrestaciones([])
      return
    }
    try {
      setLoadingPrestaciones(true)
      console.log('🔄 Cargando prestaciones...')
      
      // Nota: REC_PRESTACIONES_APP no requiere parámetros, enviar objeto vacío
      const response = await apiPost('/sia/prestaciones', {})
      
      console.log('📥 Respuesta prestaciones:', response)
      
      if (response.success && Array.isArray(response.prestaciones)) {
        setPrestaciones(response.prestaciones)
        console.log(`✅ ${response.prestaciones.length} prestaciones cargadas`)
      } else {
        console.warn('⚠️ Respuesta sin prestaciones:', response)
        setPrestaciones([])
      }
    } catch (error: any) {
      console.error('❌ Error cargando prestaciones:', error)
      Alert.alert('Error', 'No se pudieron cargar las prestaciones. Intente nuevamente.')
      setPrestaciones([])
    } finally {
      setLoadingPrestaciones(false)
    }
  }

  const cargarCoberturas = async (afiliadoId: string) => {
    try {
      setLoadingCoberturas(true)
      setCoberturas([]) // Limpiar coberturas previas
      console.log(`🔄 Cargando enrolamientos para afiliado: ${afiliadoId}`)
      
      // Buscar el afiliado en credenciales para obtener el AfiliadoId completo
      const afiliado = credenciales?.find((c: any) => 
        c.crcreafili === afiliadoId || 
        c.crcrenroaf === afiliadoId ||
        c.crcreid === afiliadoId
      )
      
      if (!afiliado) {
        console.log('⚠️ Afiliado no encontrado en credenciales, usando solo COBERTURA GENERAL')
        const coberturaGeneral: Cobertura = {
          codigo: '1',
          nombre: 'COBERTURA GENERAL',
          descripcion: 'Cobertura general para todas las prestaciones'
        }
        setCoberturas([coberturaGeneral])
        return
      }

      // Extraer NroInternoPersona (últimos 9 dígitos del AfiliadoId/crcreid)
      const afiliadoIdCompleto = afiliado.crcreid || afiliado.crcreafili || ''
      const nroInternoPersona = afiliadoIdCompleto.replace(/[^0-9]/g, '').slice(-9)
      
      // Fecha en formato YYYY-MM-DD
      const now = new Date()
      const fechaActual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

      console.log('📤 Parámetros enrolamientos:', {
        afiliado: afiliado.crcreapeno,
        crcreid: afiliado.crcreid,
        NroInternoPersona: nroInternoPersona,
        Fecha: fechaActual,
      })

      const response = await apiPost('/sia/enrolamientos', {
        NroInternoPersona: nroInternoPersona,
        Fecha: fechaActual,
      })

      console.log('📥 Respuesta enrolamientos:', response)

      if (response.success && response.data) {
        // El Resultado puede venir como string JSON, parsearlo si es necesario
        let parsedData = response.data
        if (typeof response.data.Resultado === 'string') {
          try {
            parsedData = JSON.parse(response.data.Resultado)
            console.log('📊 Datos parseados:', parsedData)
          } catch (e) {
            console.error('❌ Error parseando Resultado:', e)
          }
        }

        // Crear COBERTURA GENERAL que siempre está disponible
        const coberturaGeneral: Cobertura = {
          codigo: '1',
          nombre: 'COBERTURA GENERAL',
          descripcion: 'Cobertura general para todas las prestaciones'
        }

        // La respuesta SOAP trae "Coberturas" (no "Enrolamientos")
        const enrolamientos = parsedData.Coberturas || parsedData.Enrolamientos || []
        console.log('📋 Coberturas/Enrolamientos encontrados:', enrolamientos.length)
        
        if (Array.isArray(enrolamientos) && enrolamientos.length > 0) {
          // Transformar enrolamientos en coberturas
          const coberturasArray = enrolamientos.map((enrol: any, index: number) => ({
            codigo: enrol.CodigoCobertura?.toString() || `ENROL${index + 2}`,
            nombre: enrol.DescripcionCobertura?.trim() || `Enrolamiento ${index + 2}`,
            descripcion: enrol.DescripcionCaracteristica?.trim() || ''
          }))

          // COBERTURA GENERAL siempre va primero
          setCoberturas([coberturaGeneral, ...coberturasArray])
          console.log(`✅ ${coberturasArray.length + 1} coberturas cargadas (incluye COBERTURA GENERAL)`)
        } else {
          // Si no hay coberturas del SOAP, solo COBERTURA GENERAL
          console.log('⚠️ No se encontraron coberturas adicionales, solo COBERTURA GENERAL disponible')
          setCoberturas([coberturaGeneral])
        }
      } else {
        // Si la respuesta no es exitosa, solo COBERTURA GENERAL
        console.log('⚠️ Respuesta sin datos, solo COBERTURA GENERAL disponible')
        const coberturaGeneral: Cobertura = {
          codigo: '1',
          nombre: 'COBERTURA GENERAL',
          descripcion: 'Cobertura general para todas las prestaciones'
        }
        setCoberturas([coberturaGeneral])
      }
    } catch (error) {
      console.error('❌ Error cargando enrolamientos:', error)
      // Si hay error, solo mostrar COBERTURA GENERAL
      const coberturaGeneral: Cobertura = {
        codigo: '1',
        nombre: 'COBERTURA GENERAL',
        descripcion: 'Cobertura general para todas las prestaciones'
      }
      setCoberturas([coberturaGeneral])
    } finally {
      setLoadingCoberturas(false)
    }
  }

  const seleccionarFoto = async (fotoNumero: number) => {
    if (fotoNumero < 1 || fotoNumero > maxFotosPermitidas) {
      return
    }

    // Mostrar opciones de origen de imagen
    Alert.alert(
      'Seleccionar imagen',
      'Elige una opción',
      [
        {
          text: 'Tomar foto',
          onPress: () => tomarFotoConCamara(fotoNumero)
        },
        {
          text: 'Galería',
          onPress: () => seleccionarDeGaleria(fotoNumero)
        },
        {
          text: 'Cancelar',
          style: 'cancel'
        }
      ]
    )
  }

  const tomarFotoConCamara = async (fotoNumero: number) => {
    try {
      // Verificar primero el estado actual de los permisos
      const permissionResult = await ImagePicker.getCameraPermissionsAsync()
      console.log('📋 Estado permisos cámara:', permissionResult.status)
      
      let finalStatus = permissionResult.status
      
      // Si no está granted, solicitar permisos
      if (finalStatus !== 'granted') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync()
        finalStatus = status
        console.log('📋 Resultado solicitud permisos:', finalStatus)
      }
      
      if (finalStatus !== 'granted') {
        Alert.alert(
          'Permisos necesarios',
          'Se necesitan permisos para acceder a la cámara'
        )
        return
      }

      console.log('📸 Abriendo cámara...')
      
      // Abrir cámara
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.3, // Reducido para cumplir límite del servidor (5MB)
        base64: true,
      })

      if (!result.canceled && result.assets[0].base64) {
        const base64 = result.assets[0].base64
        console.log(`📸 Foto ${fotoNumero} tomada con cámara (${Math.round(base64.length / 1024)}KB)`)

        setFotos((prev) => prev.map((foto, index) => (index === fotoNumero - 1 ? base64 : foto)))
      }
    } catch (error) {
      console.error(`❌ Error tomando foto ${fotoNumero}:`, error)
      Alert.alert('Error', 'No se pudo tomar la foto. Intenta usar la galería.')
    }
  }

  const seleccionarDeGaleria = async (fotoNumero: number) => {
    try {
      // Solicitar permisos
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      
      if (status !== 'granted') {
        Alert.alert(
          'Permisos necesarios',
          'Se necesitan permisos para acceder a la galería'
        )
        return
      }

      // Abrir galería
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.3, // Reducido para cumplir límite del servidor (5MB)
        base64: true, // Obtener base64 para enviar al backend
      })

      if (!result.canceled && result.assets[0].base64) {
        const base64 = result.assets[0].base64
        console.log(`📸 Foto ${fotoNumero} seleccionada (${Math.round(base64.length / 1024)}KB)`)

        setFotos((prev) => prev.map((foto, index) => (index === fotoNumero - 1 ? base64 : foto)))
      }
    } catch (error) {
      console.error(`❌ Error seleccionando foto ${fotoNumero}:`, error)
      Alert.alert('Error', 'No se pudo seleccionar la imagen')
    }
  }

  const eliminarFoto = (fotoNumero: number) => {
    setFotos((prev) => prev.map((foto, index) => (index === fotoNumero - 1 ? null : foto)))
    console.log(`🗑️  Foto ${fotoNumero} eliminada`)
  }

  const validarFormulario = (): boolean => {
    if (!tipoAutorizacion) {
      Alert.alert('Error', 'Debe seleccionar tipo de autorización: Con Prescripción o Sin Prescripción')
      return false
    }
    if (!afiliadoSeleccionado) {
      Alert.alert('Error', 'Debe seleccionar un afiliado')
      return false
    }
    if (!coberturaSeleccionada) {
      Alert.alert('Error', 'Debe seleccionar una cobertura')
      return false
    }
    if (tipoAutorizacion === 'S' && !prestacionSeleccionada) {
      Alert.alert('Error', 'Debe seleccionar una prestación')
      return false
    }
    if (!referencia.trim()) {
      Alert.alert('Error', 'Debe ingresar una referencia')
      return false
    }
    return true
  }

  const enviarSolicitud = async () => {
    if (isBlocked) {
      Alert.alert(
        'Función disponible solo online',
        'Para enviar una nueva solicitud necesitás conexión a Internet y una sesión online (no modo offline).'
      )
      return
    }

    if (!validarFormulario()) {
      return
    }

    if (!authContext?.token) {
      Alert.alert(
        'Iniciar sesión requerido',
        'Para enviar una nueva solicitud necesitás iniciar sesión (token válido).',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Iniciar sesión', onPress: () => authContext?.signOut?.() },
        ]
      )
      return
    }

    try {
      setLoading(true)
      console.log('📤 Enviando solicitud de autorización...')

      const tipoSeleccionado = tipoAutorizacion as 'P' | 'S'

      const credencialSeleccionada = (credenciales || []).find((cred: any) => {
        const credId = String(cred?.crcreid || cred?.crcreafili || cred?.crcrenroaf || '').trim()
        return credId === String(afiliadoSeleccionado || '').trim()
      })

      const coberturaSeleccionadaObj = (coberturas || []).find((cob) =>
        String(cob?.codigo || '').trim() === String(coberturaSeleccionada || '').trim()
      )

      const coberturaDescripcionPayload = String(
        coberturaSeleccionadaObj?.nombre || coberturaSeleccionadaObj?.descripcion || ''
      ).trim()
      const fotosPayload = tipoSeleccionado === 'P'
        ? fotos.filter((foto): foto is string => !!foto && foto.trim().length > 0)
        : []

      const payload = {
        AUSolTipo: tipoSeleccionado,
        afiliadoId: String(afiliadoSeleccionado || '').trim(),
        afiliadoNro: String(credencialSeleccionada?.crcrenroaf || '').trim(),
        cobertura: String(coberturaSeleccionada || '').trim(),
        coberturaDescripcion: coberturaDescripcionPayload,
        prestacionId: String(prestacionSeleccionada || '').trim(),
        AUSolPresCant: tipoSeleccionado === 'S' ? parseInt(cantidad) || 1 : 1,
        referencia: referencia.trim(),
        texto: referencia.trim(), // Texto descriptivo (mismo que referencia por ahora)
        profesional: profesional.trim() || '',
        fotosBase64: fotosPayload,
      }

      const response = await apiPost('/sia/crear-solicitud', payload)

      if (response.success) {
        console.log('✅ Solicitud creada exitosamente')
        Alert.alert(
          'Éxito',
          'Solicitud de autorización enviada correctamente',
          [
            {
              text: 'OK',
              onPress: () => {
                // Limpiar formulario
                setAfiliadoSeleccionado('')
                setCoberturaSeleccionada('')
                setReferencia('')
                setProfesional('')
                setFotos(createEmptyFotos())
                
                // Opcional: navegar atrás
                navigation.goBack()
              }
            }
          ]
        )
      } else {
        throw new Error(response.message || 'Error al crear solicitud')
      }
    } catch (error: any) {
      console.error('❌ Error enviando solicitud:', error)
      Alert.alert(
        'Error',
        error.message || 'No se pudo enviar la solicitud. Intente nuevamente.'
      )
    } finally {
      setLoading(false)
    }
  }

  const submitDisabled = loading || isBlocked || !tipoAutorizacion

  const renderCoberturaButton = (cobertura: Cobertura, index: number) => {
    const isSelected = coberturaSeleccionada === cobertura.codigo
    
    return (
      <TouchableOpacity
        key={`cob-${index}-${cobertura.codigo}`}
        style={[styles.coberturaButton, { backgroundColor: colors.inputBackground, borderColor: colors.border }, isSelected && { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}
        onPress={() => setCoberturaSeleccionada(cobertura.codigo)}
        activeOpacity={0.7}
      >
        <View style={styles.coberturaInfo}>
          <Text style={[styles.coberturaNombre, { color: colors.textPrimary }, isSelected && styles.textSelected]}>
            {cobertura.nombre}
          </Text>
          {cobertura.descripcion && (
            <Text style={[styles.coberturaDescripcion, { color: colors.textSecondary }, isSelected && styles.textSelected]}>
              {cobertura.descripcion}
            </Text>
          )}
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
        )}
      </TouchableOpacity>
    )
  }

  const fotosAdjuntasCount = fotos.filter((foto) => !!foto).length

  const renderFotoBox = (fotoNumero: number) => {
    const foto = fotos[fotoNumero - 1]
    
    return (
      <View key={`foto-slot-${fotoNumero}`} style={styles.fotoBox}>
        {foto ? (
          <View style={styles.fotoContainer}>
            <Image
              source={{ uri: `data:image/jpeg;base64,${foto}` }}
              style={styles.fotoPreview}
              resizeMode="cover"
            />
            <TouchableOpacity
              style={styles.fotoEliminarButton}
              onPress={() => eliminarFoto(fotoNumero)}
            >
              <Ionicons name="close-circle" size={28} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.fotoPlaceholder}
            onPress={() => seleccionarFoto(fotoNumero)}
            activeOpacity={0.7}
          >
            <Ionicons name="camera-outline" size={40} color={colors.textMuted} />
            <Text style={[styles.fotoPlaceholderText, { color: colors.textMuted }]}>
              Foto {fotoNumero} (opcional)
            </Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Nueva Solicitud</Text>
          <View style={{ width: 24 }} />
        </View>

        <OnlineRequiredNotice
          visible={isBlocked}
          message="Necesitás conexión a Internet y sesión online para crear una nueva solicitud. Si estás en modo offline, volvé a iniciar sesión con Internet."
        />

        {/* Seleccionar Afiliado */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>AFILIADO</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Seleccione el integrante del grupo familiar
          </Text>
          {credenciales && credenciales.length > 0 ? (
            <ModalPicker
              placeholder="-- Seleccione un afiliado --"
              selectedValue={afiliadoSeleccionado}
              onValueChange={(itemValue) => {
                const nextValue = String(itemValue || '').trim()
                setAfiliadoSeleccionado(nextValue)
                setCoberturaSeleccionada('')
                if (nextValue) {
                  cargarCoberturas(nextValue)
                }
              }}
              items={credenciales.map((cred, idx) => {
                const afiliadoId = String(cred.crcreid || cred.crcreafili || cred.crcrenroaf || '').trim()
                const parentesco = cred.crcrepropi === 'S' ? 'TITULAR' : 'FAMILIAR'
                return { label: `${cred.crcreapeno} (${parentesco})`, value: afiliadoId }
              })}
            />
          ) : refreshingCreds ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 12 }} />
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No hay afiliados disponibles</Text>
              {isOnline && (
                <TouchableOpacity
                  onPress={async () => {
                    if (!authContext?.refreshCredenciales) return
                    setRefreshingCreds(true)
                    try {
                      await authContext.refreshCredenciales()
                    } catch (e) {
                      Alert.alert('Sin datos', 'No se encontraron credenciales en el sistema SOAP para su usuario.')
                    } finally {
                      setRefreshingCreds(false)
                    }
                  }}
                  style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center' }}
                >
                  <Ionicons name="refresh-outline" size={16} color={colors.primary} />
                  <Text style={{ color: colors.primary, marginLeft: 4, fontSize: 14 }}>Reintentar sincronización</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Tipo de Autorización */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>TIPO DE AUTORIZACIÓN</Text>
          {!tipoAutorizacion && (
            <Text style={[styles.sectionSubtitle, { color: colors.error }]}>
              Debe seleccionar una opción para continuar.
            </Text>
          )}
          <View style={styles.tipoButtonsContainer}>
            <TouchableOpacity
              style={[styles.tipoButton, { backgroundColor: colors.surface, borderColor: colors.primary }, tipoAutorizacion === 'P' && styles.tipoButtonSelected]}
              onPress={() => {
                setTipoAutorizacion('P')
                setPrestacionSeleccionada('')
                setCantidad('1')
              }}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="camera" 
                size={24} 
                color={tipoAutorizacion === 'P' ? colors.textOnPrimary : colors.primary} 
              />
              <Text style={[styles.tipoButtonText, { color: colors.primary }, tipoAutorizacion === 'P' && styles.tipoButtonTextSelected]}>
                Con Prescripción
              </Text>
              <Text style={[styles.tipoButtonSubtext, { color: colors.primary }, tipoAutorizacion === 'P' && styles.tipoButtonTextSelected]}>
                Con fotos
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.tipoButton, { backgroundColor: colors.surface, borderColor: colors.primary }, tipoAutorizacion === 'S' && styles.tipoButtonSelected]}
              onPress={() => {
                setTipoAutorizacion('S')
                setFotos(createEmptyFotos())
              }}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="list" 
                size={24} 
                color={tipoAutorizacion === 'S' ? colors.textOnPrimary : colors.primary} 
              />
              <Text style={[styles.tipoButtonText, { color: colors.primary }, tipoAutorizacion === 'S' && styles.tipoButtonTextSelected]}>
                Sin Prescripción
              </Text>
              <Text style={[styles.tipoButtonSubtext, { color: colors.primary }, tipoAutorizacion === 'S' && styles.tipoButtonTextSelected]}>
                Sin fotos
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Seleccionar Enrolamiento */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ENROLAMIENTO</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            {afiliadoSeleccionado 
              ? 'Seleccione el enrolamiento del afiliado' 
              : 'Primero seleccione un afiliado para ver sus enrolamientos'}
          </Text>
          {loadingCoberturas ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
          ) : coberturas.length > 0 ? (
            coberturas.map((cob, idx) => renderCoberturaButton(cob, idx))
          ) : (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {afiliadoSeleccionado 
                ? 'No hay enrolamientos disponibles para este afiliado' 
                : 'Seleccione un afiliado para ver sus enrolamientos'}
            </Text>
          )}
        </View>

        {/* Seleccionar Prestación (solo tipo S) */}
        {tipoAutorizacion === 'S' && (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>PRESTACIÓN</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Seleccione la prestación médica
            </Text>
            {loadingPrestaciones ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
            ) : prestaciones.length > 0 ? (
              <ModalPicker
                placeholder="-- Seleccione una prestación --"
                selectedValue={prestacionSeleccionada}
                onValueChange={(itemValue) => setPrestacionSeleccionada(itemValue)}
                items={prestaciones.map((prest) => ({
                  label: prest.AULPresDescripcion,
                  value: prest.AULPresID,
                }))}
              />
            ) : (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No hay prestaciones disponibles</Text>
            )}
          </View>
        )}

        {/* Cantidad (solo tipo S) */}
        {tipoAutorizacion === 'S' && (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>CANTIDAD</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.inputText }]}
              placeholder="Cantidad de prestaciones"
              placeholderTextColor={colors.inputPlaceholder}
              value={cantidad}
              onChangeText={setCantidad}
              keyboardType="numeric"
            />
          </View>
        )}

        {/* Referencia */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>REFERENCIA</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Ingrese un texto que identifique esta solicitud
          </Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.inputText }]}
            value={referencia}
            onChangeText={setReferencia}
            placeholder="Ej: Consulta cardiología - Dr. Pérez"
            placeholderTextColor={colors.inputPlaceholder}
            multiline
            numberOfLines={3}
            maxLength={200}
          />
          <Text style={[styles.caracteresRestantes, { color: colors.textMuted }]}>
            {referencia.length}/200 caracteres
          </Text>
        </View>

        {/* Profesional Preferente */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>PROFESIONAL PREFERENTE</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Ingrese el nombre del profesional (opcional)
          </Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.inputText }]}
            value={profesional}
            onChangeText={setProfesional}
            placeholder="Ej: Dr. Juan Pérez"
            placeholderTextColor={colors.inputPlaceholder}
            maxLength={100}
          />
        </View>

        {/* Fotos (solo tipo P) */}
        {tipoAutorizacion === 'P' && (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>DOCUMENTACIÓN</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Adjunte hasta {maxFotosPermitidas} foto{maxFotosPermitidas === 1 ? '' : 's'} con órdenes o estudios (opcional)
            </Text>
            <Text style={[styles.caracteresRestantes, { color: colors.textMuted, textAlign: 'left', marginTop: -8, marginBottom: 12 }]}>
              {fotosAdjuntasCount}/{maxFotosPermitidas} adjunta{fotosAdjuntasCount === 1 ? '' : 's'}
            </Text>
            <View style={styles.fotosRow}>
              {Array.from({ length: maxFotosPermitidas }, (_, index) => renderFotoBox(index + 1))}
            </View>
          </View>
        )}

        {/* Botón Enviar */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: colors.primary },
            submitDisabled && { backgroundColor: colors.disabledBackground },
          ]}
          onPress={enviarSolicitud}
          disabled={submitDisabled}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.textOnPrimary} />
          ) : isBlocked ? (
            <>
              <Ionicons name="wifi" size={20} color={colors.textOnPrimary} />
              <Text style={[styles.submitButtonText, { color: colors.textOnPrimary }]}>Conexión requerida</Text>
            </>
          ) : !tipoAutorizacion ? (
            <>
              <Ionicons name="alert-circle-outline" size={20} color={colors.textOnPrimary} />
              <Text style={[styles.submitButtonText, { color: colors.textOnPrimary }]}>Seleccione tipo de autorización</Text>
            </>
          ) : (
            <>
              <Ionicons name="send" size={20} color={colors.textOnPrimary} />
              <Text style={[styles.submitButtonText, { color: colors.textOnPrimary }]}>Enviar Solicitud</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Espacio inferior */}
        <View style={{ height: 40 }} />
      </ScrollView>
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
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    padding: 16,
    borderRadius: 14,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#6B7280',
    marginBottom: 10,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  textSelected: {
    color: '#2196F3',
  },
  coberturaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: '#f9f9f9',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  coberturaButtonSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2196F3',
  },
  coberturaInfo: {
    flex: 1,
  },
  coberturaNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  coberturaDescripcion: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  textInput: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 12,
    fontSize: 16,
    color: '#333',
    textAlignVertical: 'top',
  },
  caracteresRestantes: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  fotosRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  fotoBox: {
    width: '31%',
    aspectRatio: 1,
  },
  fotoPlaceholder: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fotoPlaceholderText: {
    marginTop: 8,
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },
  fotoContainer: {
    flex: 1,
    position: 'relative',
  },
  fotoPreview: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  fotoEliminarButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 14,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 24,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    padding: 20,
  },
  tipoButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  tipoButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#2196F3',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipoButtonSelected: {
    backgroundColor: '#2196F3',
  },
  tipoButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2196F3',
    marginTop: 8,
    textAlign: 'center',
  },
  tipoButtonTextSelected: {
    color: '#fff',
  },
  tipoButtonSubtext: {
    fontSize: 12,
    color: '#2196F3',
    marginTop: 4,
    textAlign: 'center',
  },
})
