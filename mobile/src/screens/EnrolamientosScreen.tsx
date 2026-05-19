import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TouchableOpacity,
} from 'react-native'
import ModalPicker from '../components/ModalPicker'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../contexts/AuthContext'
import { apiPost } from '../services/api'
import { OfflineBanner } from '../components/OfflineBanner'
import { formatFecha } from '../utils/dateUtils'
import { getErrorMessage } from '../utils/errorUtils'
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import { OnlineRequiredNotice } from '../components/OnlineRequiredNotice'
import { useTheme } from '../theme'
import CurvedHeroHeader from '../components/CurvedHeroHeader'
import { useNavigation } from '@react-navigation/native'

interface Enrolamiento {
  CodigoCobertura?: number
  DescripcionCobertura?: string
  CodigoCaracteristica?: string
  DescripcionCaracteristica?: string
  CodigoSubcaracteristica?: string
  DescripcionSubcaracteristica?: string
  FechaVigenciaDesde?: string
  FechaVigenciaHasta?: string
  [key: string]: any
}

export default function EnrolamientosScreen() {
  const { user, credenciales, isOfflineMode } = useAuth()
  const { isConnected, isInternetReachable, type } = useNetworkStatus()
  const { colors } = useTheme()
  const navigation = useNavigation<any>()
  const isAirplaneMode = type === 'none'
  const isOnline = isConnected && isInternetReachable !== false && !isAirplaneMode
  const isBlocked = !!isOfflineMode || !isOnline
  const [selectedMiembro, setSelectedMiembro] = useState<string>('')
  const [enrolamientos, setEnrolamientos] = useState<Enrolamiento[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Obtener miembros del grupo familiar
  const miembrosGrupo = credenciales || []

  useEffect(() => {
    // Seleccionar el titular por defecto
    if (miembrosGrupo.length > 0 && !selectedMiembro) {
      const titular = miembrosGrupo.find((c: any) => c.crcrepropi === 'S')
      setSelectedMiembro(titular?.crcreid || (miembrosGrupo[0] as any).crcreid)
    }
  }, [miembrosGrupo])

  useEffect(() => {
    if (selectedMiembro) {
      fetchEnrolamientos()
    }
  }, [selectedMiembro])

  const fetchEnrolamientos = async () => {
    if (!selectedMiembro) return

    if (isBlocked) {
      setLoading(false)
      setRefreshing(false)
      return
    }

    setLoading(true)
    try {
      // Buscar el miembro seleccionado por crcreid
      const miembro = miembrosGrupo.find((c: any) => c.crcreid === selectedMiembro)
      
      if (!miembro) {
        Alert.alert('Error', 'Miembro no encontrado')
        return
      }

      // Obtener NroInternoPersona (último segmento del AfiliadoId)
      // AfiliadoId tiene formato: 9 (titular) + 12 (org) + 9 (familiar)
      const afiliadoId = miembro.crcreafili || ''
      const nroInternoPersona = afiliadoId.slice(-9)
      
      // Fecha en formato YYYY-MM-DD (requerido por servicio SIA ENROLAMIENTOS)
      const now = new Date()
      const fechaActual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

      console.log('📤 Consultando enrolamientos:', {
        miembro: miembro.crcreapeno,
        AfiliadoId: afiliadoId,
        NroInternoPersona: nroInternoPersona,
        Fecha: fechaActual,
      })

      const response = await apiPost('/sia/enrolamientos', {
        NroInternoPersona: nroInternoPersona,
        Fecha: fechaActual,
      })

      console.log('📥 Respuesta enrolamientos:', response)

      if (response.success && response.data) {
        // El Resultado viene como string JSON, hay que parsearlo
        let parsedData = response.data
        if (typeof response.data.Resultado === 'string') {
          try {
            parsedData = JSON.parse(response.data.Resultado)
            console.log('📊 Datos parseados:', parsedData)
          } catch (e) {
            console.error('❌ Error parseando Resultado:', e)
          }
        }

        // Extraer Coberturas del objeto parseado
        const coberturas = parsedData.Coberturas || []
        
        setEnrolamientos(coberturas)
        console.log(`✅ ${coberturas.length} enrolamientos cargados`)
      } else {
        setEnrolamientos([])
      }
    } catch (error: any) {
      console.error('❌ Error obteniendo enrolamientos:', error?.message)
      Alert.alert(
        'Error',
        getErrorMessage(error, 'No se pudieron obtener los enrolamientos')
      )
      setEnrolamientos([])
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
    fetchEnrolamientos()
  }

  const renderEnrolamiento = (enrolamiento: Enrolamiento, index: number) => {
    return (
      <View key={index} style={[styles.enrolamientoCard, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}>
        <View style={[styles.enrolamientoHeader, { borderBottomColor: colors.border }]}>
          <Ionicons name="finger-print" size={24} color={colors.primary} />
          <Text style={[styles.enrolamientoTitulo, { color: colors.textPrimary }]}>
            Enrolamiento {index + 1}
          </Text>
        </View>

        <View style={styles.enrolamientoBody}>
          {enrolamiento.DescripcionCobertura && (
            <View style={styles.enrolamientoRow}>
              <Text style={[styles.enrolamientoLabel, { color: colors.textSecondary }]}>Cobertura:</Text>
              <Text style={[styles.enrolamientoValue, { color: colors.textPrimary }]}>
                {enrolamiento.DescripcionCobertura.trim()}
              </Text>
            </View>
          )}

          {enrolamiento.DescripcionCaracteristica && (
            <View style={styles.enrolamientoRow}>
              <Text style={[styles.enrolamientoLabel, { color: colors.textSecondary }]}>Característica:</Text>
              <Text style={[styles.enrolamientoValue, { color: colors.textPrimary }]}>
                {enrolamiento.DescripcionCaracteristica.trim()}
              </Text>
            </View>
          )}

          {enrolamiento.DescripcionSubcaracteristica && (
            <View style={styles.enrolamientoRow}>
              <Text style={[styles.enrolamientoLabel, { color: colors.textSecondary }]}>Tipo:</Text>
              <Text style={[styles.enrolamientoValue, { color: colors.textPrimary }]}>
                {enrolamiento.DescripcionSubcaracteristica.trim()}
              </Text>
            </View>
          )}

          {enrolamiento.FechaVigenciaDesde && (
            <View style={styles.enrolamientoRow}>
              <Text style={[styles.enrolamientoLabel, { color: colors.textSecondary }]}>Vigente desde:</Text>
              <Text style={[styles.enrolamientoValue, styles.vigenciaText, { color: colors.success }]}>
                {formatFecha(enrolamiento.FechaVigenciaDesde)}
              </Text>
            </View>
          )}

          {enrolamiento.FechaVigenciaHasta && enrolamiento.FechaVigenciaHasta !== '0000-00-00' && (
            <View style={styles.enrolamientoRow}>
              <Text style={[styles.enrolamientoLabel, { color: colors.textSecondary }]}>Vigente hasta:</Text>
              <Text style={[styles.enrolamientoValue, styles.vigenciaText, { color: colors.success }]}>
                {formatFecha(enrolamiento.FechaVigenciaHasta)}
              </Text>
            </View>
          )}
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
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
        <CurvedHeroHeader
          icon={<Ionicons name="finger-print" size={30} color="#FFFFFF" />}
          title="Enrolamientos"
          subtitle={selectedMiembro ? 'Coberturas y vigencias del grupo familiar' : 'Selecciona un miembro para consultar'}
          backgroundColor={colors.headerBackground}
          waveBackgroundColor={colors.background}
          subtitleStyle={styles.heroSubtitleCustom}
        >
          <View style={styles.heroActions}>
            <TouchableOpacity style={styles.heroActionButton} onPress={() => navigation.navigate('PerfilMenu')}>
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.heroActionButton} onPress={onRefresh} disabled={isBlocked}>
              <Ionicons name="refresh" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </CurvedHeroHeader>

        <OnlineRequiredNotice
          visible={isBlocked}
          message="Necesitás conexión a Internet y sesión online para consultar Enrolamientos."
        />

        {/* Selector de Miembro */}
          <View style={[styles.selectorContainer, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}>
          <View style={styles.selectorHeader}>
            <Ionicons name="people-outline" size={18} color={colors.primary} />
            <Text style={[styles.selectorLabel, { color: colors.textPrimary }]}>Seleccionar miembro del grupo</Text>
          </View>
          <ModalPicker
            selectedValue={selectedMiembro}
            onValueChange={(itemValue) => setSelectedMiembro(itemValue)}
            items={miembrosGrupo.map((miembro: any) => ({
              label: `${miembro.crcreapeno}${miembro.crcrepropi === 'S' ? ' (TITULAR)' : ''}`,
              value: miembro.crcreid,
            }))}
          />
        </View>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {loading
            ? 'Consultando coberturas vigentes...'
            : enrolamientos.length > 0
              ? `${enrolamientos.length} enrolamiento${enrolamientos.length !== 1 ? 's' : ''} encontrado${enrolamientos.length !== 1 ? 's' : ''}`
              : 'Coberturas, características y vigencias disponibles'}
        </Text>

        {/* Loading */}
        {loading && !refreshing && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Consultando enrolamientos...</Text>
          </View>
        )}

        {/* Enrolamientos List */}
        {!loading && enrolamientos.length > 0 && (
          <View style={styles.enrolamientosContainer}>
            {enrolamientos.map((enr, idx) => renderEnrolamiento(enr, idx))}
          </View>
        )}

        {/* Empty State */}
        {!loading && enrolamientos.length === 0 && selectedMiembro && (
          <View style={styles.emptyContainer}>
            <Ionicons name="finger-print-outline" size={64} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No se encontraron enrolamientos con datos válidos
            </Text>

          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
  selectorContainer: {
    backgroundColor: 'white',
    margin: 16,
    marginBottom: 10,
    padding: 18,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
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
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 10,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  enrolamientosContainer: {
    padding: 16,
  },
  resultadosText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontWeight: '500',
  },
  enrolamientoCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    overflow: 'hidden',
  },
  enrolamientoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#EEF4FF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  enrolamientoTitulo: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    marginLeft: 12,
  },
  enrolamientoBody: {
    padding: 16,
  },
  enrolamientoRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'center',
  },
  enrolamientoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    width: 120,
  },
  enrolamientoValue: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
  },
  vigenciaText: {
    fontWeight: '600',
    color: '#4CAF50',
  },
  estadoBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  estadoActivo: {
    backgroundColor: '#E8F5E9',
  },
  estadoInactivo: {
    backgroundColor: '#FFEBEE',
  },
  estadoText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
  },

})


