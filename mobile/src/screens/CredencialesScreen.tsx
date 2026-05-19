import React, { useState, useRef } from 'react'
import { 
  View, 
  Text, 
  StyleSheet, 
  RefreshControl,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal
} from 'react-native'
import { useAuth } from '../contexts/AuthContext'
import CredencialCard from '../components/CredencialCard'
import CredencialesCarousel from '../components/CredencialesCarousel'
import { OfflineBanner } from '../components/OfflineBanner'
import { useTheme } from '../theme'
import { Credencial } from '../types/credencial'
import * as Sharing from 'expo-sharing'
import * as FileSystem from 'expo-file-system/legacy'
import { captureRef } from 'react-native-view-shot'
import { Ionicons } from '@expo/vector-icons'
import QRCode from 'react-native-qrcode-svg'
import { getErrorMessage } from '../utils/errorUtils'
import { API_BASE_URL } from '../config'
import { usePlanesImagenes } from '../hooks/usePlanesImagenes'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import CurvedHeroHeader from '../components/CurvedHeroHeader'

export default function CredencialesScreen() {
  const { credenciales, syncCredenciales, syncStats, isOfflineMode, token } = useAuth()
  const { colors } = useTheme()
  const navigation = useNavigation<any>()
  const { getPlanImageUrl, refreshPlanes } = usePlanesImagenes()
  const [refreshing, setRefreshing] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [sharing, setSharing] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedCredencial, setSelectedCredencial] = useState<Credencial | null>(null)
  const credencialModalRef = useRef<View>(null)
  const lastAutoRefreshAtRef = useRef(0)

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack()
      return
    }

    navigation.navigate('PerfilMenu')
  }

  // Ordenar credenciales: titular primero
  const credencialesOrdenadas = [...credenciales].sort((a, b) => {
    if (a.crcrepropi === 'S') return -1
    if (b.crcrepropi === 'S') return 1
    return 0
  })

  const onRefresh = async () => {
    // Solo online: si offline y la credencial está vencida, no permitir actualizar
    if (isOfflineMode && currentCredencial && !isCredencialVigente(currentCredencial.crcrefecvi)) {
      Alert.alert('Sin conexión', 'En modo offline no se puede actualizar una credencial vencida. Conectate a internet e intentá nuevamente.')
      return
    }
    setRefreshing(true)
    try {
      await Promise.all([
        syncCredenciales(),
        refreshPlanes(),
      ])
      Alert.alert('✅ Actualizado', 'Credenciales sincronizadas correctamente')
    } catch (error: unknown) {
      Alert.alert('Error', getErrorMessage(error, 'No se pudieron actualizar las credenciales'))
    } finally {
      setRefreshing(false)
    }
  }

  const refreshSilencioso = async () => {
    if (isOfflineMode || !token || token.startsWith('offline_')) {
      return
    }

    try {
      await Promise.all([
        syncCredenciales(),
        refreshPlanes(),
      ])
    } catch (error) {
      console.log('⚠️ No se pudo refrescar credenciales en foco:', getErrorMessage(error, 'error desconocido'))
    }
  }

  useFocusEffect(
    React.useCallback(() => {
      const now = Date.now()
      const cooldownMs = 15000
      if (now - lastAutoRefreshAtRef.current < cooldownMs) {
        return
      }

      lastAutoRefreshAtRef.current = now
      refreshSilencioso()
    }, [isOfflineMode, token, credenciales.length])
  )

  const handleShare = async (credencial: Credencial) => {
    try {
      if (isOfflineMode && !isCredencialVigente(credencial.crcrefecvi)) {
        Alert.alert('Credencial vencida', 'En modo offline no se puede generar token ni compartir si la credencial no está vigente. Conectate a internet y presioná Actualizar.')
        return
      }
      setSharing(true)
      
      // Capturar la credencial actual como imagen desde el modal
      const uri = await captureRef(credencialModalRef, {
        format: 'png',
        quality: 1,
      })

      // Compartir la imagen
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: `Credencial de ${credencial.crcreapeno}`,
        })
      } else {
        Alert.alert('Error', 'Compartir no está disponible en este dispositivo')
      }
    } catch (error) {
      console.error('Error compartiendo credencial:', error)
      Alert.alert('Error', 'No se pudo compartir la credencial')
    } finally {
      setSharing(false)
    }
  }

  const handleShareFromCarousel = async (credencial: Credencial) => {
    if (isOfflineMode && !isCredencialVigente(credencial.crcrefecvi)) {
      Alert.alert('Credencial vencida', 'En modo offline no se puede generar token ni compartir si la credencial no está vigente. Conectate a internet y presioná Actualizar.')
      return
    }
    // Abrir modal para compartir
    setSelectedCredencial(credencial)
    setModalVisible(true)
    // Esperar un momento para que el modal se renderice
    setTimeout(async () => {
      try {
        setSharing(true)
        const uri = await captureRef(credencialModalRef, {
          format: 'png',
          quality: 1,
        })
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: 'image/png',
            dialogTitle: `Credencial de ${credencial.crcreapeno}`,
          })
        }
        setModalVisible(false)
      } catch (error) {
        console.error('Error compartiendo:', error)
        Alert.alert('Error', 'No se pudo compartir la credencial')
      } finally {
        setSharing(false)
      }
    }, 500)
  }

  const handleCredencialPress = (credencial: Credencial) => {
    setSelectedCredencial(credencial)
    setModalVisible(true)
  }

  const handleDownloadConstanciaPdf = async (credencial: Credencial) => {
    try {
      if (!token || token.startsWith('offline_')) {
        Alert.alert('Sesión requerida', 'Necesitás iniciar sesión online para descargar la constancia PDF.')
        return
      }

      if (isOfflineMode) {
        Alert.alert('Sin conexión', 'Conectate a internet para descargar la constancia PDF.')
        return
      }

      setDownloadingPdf(true)

      const afiliadoId = encodeURIComponent(String(credencial.crcreid || ''))
      const remoteUrl = `${API_BASE_URL}/credencial/constancia.pdf${afiliadoId ? `?afiliadoId=${afiliadoId}` : ''}`
      const fileName = `constancia-${String(credencial.crcreid || credencial.crcrenroaf || Date.now()).replace(/[^a-zA-Z0-9._-]/g, '_')}.pdf`
      const localUri = `${FileSystem.cacheDirectory}${fileName}`

      const downloadResult = await FileSystem.downloadAsync(remoteUrl, localUri, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (downloadResult.status !== 200) {
        throw new Error(`No se pudo descargar la constancia (HTTP ${downloadResult.status})`)
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadResult.uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Constancia de credencial',
          UTI: 'com.adobe.pdf',
        })
      } else {
        Alert.alert('Descarga completa', `Constancia guardada en: ${downloadResult.uri}`)
      }
    } catch (error: unknown) {
      Alert.alert('Error', getErrorMessage(error, 'No se pudo descargar la constancia PDF'))
    } finally {
      setDownloadingPdf(false)
    }
  }

  const isCredencialVigente = (crcrefecvi?: string) => {
    if (!crcrefecvi) return false
    const s = String(crcrefecvi).slice(0, 10)
    const todayStr = new Date().toISOString().slice(0, 10)
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s >= todayStr
    const d = new Date(String(crcrefecvi))
    return !isNaN(d.getTime()) && d.getTime() >= Date.now()
  }

  if (!credencialesOrdenadas || credencialesOrdenadas.length === 0) {
    return (
      <ScrollView
        contentContainerStyle={styles.emptyContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.emptyText}>📋</Text>
        <Text style={styles.emptyTitle}>No hay credenciales</Text>
        <Text style={styles.emptySubtitle}>
          Desliza hacia abajo para sincronizar
        </Text>
        {syncStats && (
          <View style={styles.statsContainer}>
            <Text style={styles.statsText}>
              Última sincronización: {syncStats.total} credenciales
            </Text>
          </View>
        )}
      </ScrollView>
    )
  }

  const currentCredencial = credencialesOrdenadas[currentIndex] || credencialesOrdenadas[0]

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <OfflineBanner />
      
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        <CurvedHeroHeader
          icon={<Ionicons name="card-outline" size={30} color="#FFFFFF" />}
          title="Credenciales del Grupo"
          subtitle={`${credencialesOrdenadas.length} ${credencialesOrdenadas.length === 1 ? 'miembro' : 'miembros'}`}
          backgroundColor={colors.headerBackground}
          waveBackgroundColor={colors.background}
          subtitleStyle={styles.heroSubtitleCustom}
        >
          <View style={styles.heroActions}>
            <TouchableOpacity style={styles.heroActionButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.heroActionButton}
              onPress={onRefresh}
              disabled={refreshing || (isOfflineMode && currentCredencial ? !isCredencialVigente(currentCredencial.crcrefecvi) : false)}
            >
              <Ionicons name="refresh" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.heroActionButton}
              onPress={() => currentCredencial && handleShareFromCarousel(currentCredencial)}
              disabled={sharing || !currentCredencial || (isOfflineMode && currentCredencial ? !isCredencialVigente(currentCredencial.crcrefecvi) : false)}
            >
              <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </CurvedHeroHeader>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Deslizá entre credenciales, compartí la activa o descargá su constancia.
        </Text>

        {/* Carrusel */}
        <View style={styles.carouselSection}>
          <CredencialesCarousel
            credenciales={credencialesOrdenadas}
            currentIndex={currentIndex}
            onIndexChange={setCurrentIndex}
            renderItem={(credencial) => (
              <TouchableOpacity 
                key={credencial.crcreid}
                onPress={() => handleCredencialPress(credencial)}
                activeOpacity={0.9}
              >
                <CredencialCard
                  credencial={credencial}
                  isTitular={credencial.crcrepropi === 'S'}
                  showQR={false}
                  showToken={false}
                  planImageUrl={getPlanImageUrl(credencial.crcreplaid)}
                  onShare={() => handleShare(credencial)}
                  onRefresh={onRefresh}
                />
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Botones de acción */}
        <View style={[styles.actionsCard, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}> 
          <View style={styles.actionsHeader}>
            <Ionicons name="flash-outline" size={18} color={colors.primary} />
            <Text style={[styles.actionsTitle, { color: colors.textPrimary }]}>Acciones rápidas</Text>
          </View>

        <View style={styles.actions}>
          <TouchableOpacity 
            style={[
              styles.actionButton,
              styles.buttonPrimary,
              { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary },
            ]}
            onPress={() => currentCredencial && handleShareFromCarousel(currentCredencial)}
            disabled={sharing || !currentCredencial || (isOfflineMode && currentCredencial ? !isCredencialVigente(currentCredencial.crcrefecvi) : false)}
          >
            {sharing ? (
              <ActivityIndicator color={colors.buttonPrimaryText} />
            ) : (
              <>
                <Ionicons name="share-social-outline" size={18} color={colors.buttonPrimaryText} style={styles.actionButtonVectorIcon} />
                <Text style={[styles.actionButtonText, { color: colors.buttonPrimaryText }]}>Compartir</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.actionButton,
              styles.buttonSecondary,
              {
                backgroundColor: colors.surfaceVariant,
                borderColor: colors.border,
              },
            ]}
            onPress={onRefresh}
            disabled={refreshing || (isOfflineMode && currentCredencial ? !isCredencialVigente(currentCredencial.crcrefecvi) : false)}
          >
            {refreshing ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Ionicons name="refresh-outline" size={18} color={colors.textPrimary} style={styles.actionButtonVectorIcon} />
                <Text style={[styles.actionButtonText, styles.buttonSecondaryText, { color: colors.textPrimary }]}>
                  Actualizar
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.pdfQuickButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => currentCredencial && handleDownloadConstanciaPdf(currentCredencial)}
          disabled={downloadingPdf || !currentCredencial}
        >
          {downloadingPdf ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <Ionicons name="document-text-outline" size={18} color={colors.textSecondary} style={styles.actionButtonVectorIcon} />
              <Text style={[styles.pdfQuickButtonText, { color: colors.textPrimary }]}>Descargar constancia PDF</Text>
            </>
          )}
        </TouchableOpacity>
        </View>

        {/* Stats */}
        {syncStats && (
          <View style={[styles.statsContainer, { backgroundColor: colors.surface, shadowColor: colors.shadow, borderColor: colors.border }]}>
            <Text style={[styles.statsTitle, { color: colors.textSecondary }]}>Última sincronización</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.primary }]}>{syncStats.inserted}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Nuevas</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.primary }]}>{syncStats.updated}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Actualizadas</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.primary }]}>{syncStats.unchanged}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Sin cambios</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Modal con credencial completa y QR separado */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.modalBackground }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header del modal */}
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Credencial Digital</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Text style={[styles.modalClose, { color: colors.textSecondary }]}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Credencial SIN QR + QR en frame separado */}
              {selectedCredencial && (
                <View ref={credencialModalRef} collapsable={false}>
                  <CredencialCard
                    credencial={selectedCredencial}
                    isTitular={selectedCredencial.crcrepropi === 'S'}
                    showQR={false}
                    compact={false}
                    showToken={true}
                    planImageUrl={getPlanImageUrl(selectedCredencial.crcreplaid)}
                    onShare={undefined}
                    onRefresh={undefined}
                  />
                  
                  {/* QR en frame separado */}
                  {(!isOfflineMode || isCredencialVigente(selectedCredencial.crcrefecvi)) && (
                    <View style={[styles.qrFrame, { backgroundColor: colors.card }]}>
                      <Text style={[styles.qrTitle, { color: colors.textPrimary }]}>Código QR de Credencial</Text>
                      <View style={[styles.qrContainer, { borderColor: colors.border }]}>
                        <QRCode
                          value={JSON.stringify({
                            afiliadoId: selectedCredencial.crcreid,
                            cuil: selectedCredencial.crcrecuil || selectedCredencial.crcrenroaf,
                            token: selectedCredencial.tokenTemporal,
                            vence: selectedCredencial.tokenTemporalVenceEn
                          })}
                          size={180}
                          backgroundColor="white"
                          color="black"
                        />
                      </View>
                      <Text style={styles.qrSubtitle}>
                        {selectedCredencial.crcreapeno}
                      </Text>
                      <Text style={styles.qrInfo}>
                        N° Afiliado: {selectedCredencial.crcrenroaf}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Opciones */}
              <View style={[styles.modalActionsCard, { backgroundColor: colors.surface, shadowColor: colors.shadow, borderColor: colors.border }]}> 
              <View style={styles.modalActionsHeader}>
                <Ionicons name="flash-outline" size={18} color={colors.primary} />
                <Text style={[styles.actionsTitle, { color: colors.textPrimary }]}>Acciones</Text>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={[
                    styles.modalActionButton,
                    { backgroundColor: colors.surfaceVariant, borderColor: colors.border },
                  ]}
                  onPress={onRefresh}
                  disabled={refreshing || (isOfflineMode && selectedCredencial ? !isCredencialVigente(selectedCredencial.crcrefecvi) : false)}
                >
                  <Ionicons name="refresh-outline" size={18} color={colors.textPrimary} style={styles.actionButtonVectorIcon} />
                  <Text style={[styles.modalActionText, { color: colors.textPrimary }]}>
                    {refreshing ? 'Actualizando...' : 'Actualizar credencial'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[
                    styles.modalActionButton,
                    { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary },
                  ]}
                  onPress={() => selectedCredencial && handleShare(selectedCredencial)}
                  disabled={sharing || (isOfflineMode && selectedCredencial ? !isCredencialVigente(selectedCredencial.crcrefecvi) : false)}
                >
                  <Ionicons name="share-social-outline" size={18} color={colors.buttonPrimaryText} style={styles.actionButtonVectorIcon} />
                  <Text style={[styles.modalActionText, { color: colors.buttonPrimaryText }]}> 
                    {sharing ? 'Compartiendo...' : 'Compartir credencial'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[
                    styles.modalActionButton,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                  onPress={() => selectedCredencial && handleDownloadConstanciaPdf(selectedCredencial)}
                  disabled={downloadingPdf}
                >
                  <Ionicons name="document-text-outline" size={18} color={colors.textSecondary} style={styles.actionButtonVectorIcon} />
                  <Text style={[styles.modalActionText, { color: colors.textPrimary }]}> 
                    {downloadingPdf ? 'Descargando PDF...' : 'Descargar constancia PDF'}
                  </Text>
                </TouchableOpacity>
              </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 28,
  },
  heroSubtitleCustom: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.84)',
  },
  subtitle: {
    fontSize: 14,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    textAlign: 'center',
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
  carouselSection: {
    marginHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 2,
  },
  actionsCard: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  actionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  actionsTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  buttonPrimary: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  buttonSecondary: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#667eea',
  },
  actionButtonVectorIcon: {
    marginRight: 8,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
  },
  buttonSecondaryText: {
    color: '#667eea',
  },
  statsContainer: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  pdfQuickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  pdfQuickButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#667eea',
  },
  statLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  statsText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  
  // Estilos del modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#f5f5f5',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  modalClose: {
    fontSize: 28,
    color: '#6B7280',
    fontWeight: '300',
  },
  modalActions: {
    gap: 12,
  },
  modalActionsCard: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  modalActionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  modalActionText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  
  // Estilos QR Frame
  qrFrame: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  qrContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  qrSubtitle: {
    width: '100%',
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
    marginBottom: 4,
    textAlign: 'center',
    lineHeight: 22,
    alignSelf: 'center',
  },
  qrInfo: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
})


