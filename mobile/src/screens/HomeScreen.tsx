import React, { useEffect, useState, useRef } from 'react'
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Modal, Alert, Dimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const SCREEN_W = Dimensions.get('window').width
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../theme'
import { apiGet } from '../services/api'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import type { NavigationProp } from '@react-navigation/native'
import CredencialCard from '../components/CredencialCard'
import { OfflineBanner } from '../components/OfflineBanner'
import { captureRef } from 'react-native-view-shot'
import * as Sharing from 'expo-sharing'
import QRCode from 'react-native-qrcode-svg'
import { Credencial } from '../types/credencial'
import { useNotifications } from '../hooks/useNotifications'
import { useFavoritosPrestadores } from '../hooks/useFavoritosPrestadores'
import { usePlanesImagenes } from '../hooks/usePlanesImagenes'
import NovedadesCarousel from '../components/NovedadesCarousel'
import BotoneraSection from '../components/BotoneraSection'
import CredencialReducida, { CredencialReducidaEmpty } from '../components/CredencialReducida'
import BannerPrestadores from '../components/BannerPrestadores'
import HomeFondoGlass from '../components/HomeFondoGlass'
import SaludoHeader from '../components/SaludoHeader'
import { formatFecha } from '../utils/dateUtils'

interface DashboardData {
  saldo: number
  plan: string
  estado: string
  proximoTurno: string
  tramitesPendientes: number
}

export default function HomeScreen() {
  const { user, token, credenciales, signOut, syncCredenciales, isOfflineMode } = useAuth()
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const { unreadCount } = useNotifications()
  const { getPlanImageUrl, refreshPlanes } = usePlanesImagenes()
  const navigation = useNavigation<NavigationProp<Record<string, object | undefined>>>()
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedCredencial, setSelectedCredencial] = useState<Credencial | null>(null)
  const [sharing, setSharing] = useState(false)
  const credencialModalRef = useRef<View>(null)
  const lastAutoRefreshAtRef = useRef(0)
  const [botoneraRefreshTrigger, setBotoneraRefreshTrigger] = useState(0)
  const [activeCredIndex, setActiveCredIndex] = useState(0)

  // Obtener credencial del titular (crcrepropi === 'S')
  const credencialTitular = credenciales?.find(c => c.crcrepropi === 'S') || credenciales?.[0]
  
  // Total de miembros del grupo familiar
  const totalMiembros = credenciales?.length || 0
  const miembrosFamiliares = credenciales?.filter(c => c.crcrepropi === 'N').length || 0

  const getNombreCompleto = (): string => {
    // Primero intenta obtener de la credencial titular
    if (credencialTitular?.crcreapeno) {
      return credencialTitular.crcreapeno
    }
    // Fallback a datos del usuario
    const fallbackName =
      (typeof user?.name === 'string' && user.name) ||
      (typeof user?.nombre === 'string' && user.nombre) ||
      (typeof user?.fullName === 'string' && user.fullName) ||
      (typeof user?.username === 'string' && user.username) ||
      'Usuario'
    return fallbackName
  }

  const formatCredencialName = (name?: string): string => {
    const normalized = String(name || '')
      .replace(/^[^A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ]+/, '')
      .trim()
    return normalized || 'Sin nombre'
  }

  const fetchDashboard = async () => {
    // En modo offline (o con token offline_*), no pedir dashboard.
    if (isOfflineMode || !token || token.startsWith('offline_')) {
      setDashboard(null)
      return
    }

    setLoading(true)
    try {
      const response = await apiGet('/dashboard')
      setDashboard(response.data)
    } catch (error) {
      const emsg = (typeof error === 'object' && error !== null && 'message' in error) ? String((error as Record<string, unknown>)['message']) : String(error)
      console.error('Error al cargar dashboard:', emsg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [token, isOfflineMode])

  const refreshHomeData = async (opts?: { forceSync?: boolean }) => {
    const forceSync = Boolean(opts?.forceSync)

    await fetchDashboard()

    // Siempre refrescar la botonera (fuerza re-fetch desde backend, ignora cache)
    setBotoneraRefreshTrigger((prev) => prev + 1)

    // Si estamos offline o con token offline_ no forzar sync de credenciales.
    if (isOfflineMode || !token || token.startsWith('offline_')) {
      return
    }

    try {
      await Promise.all([
        syncCredenciales(),
        refreshPlanes(),
      ])
    } catch (error) {
      if (forceSync) {
        const emsg = (typeof error === 'object' && error !== null && 'message' in error)
          ? String((error as Record<string, unknown>)['message'])
          : String(error)
        console.error('Error al refrescar Home:', emsg)
      }
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
      refreshHomeData()
    }, [isOfflineMode, token, credenciales.length])
  )

  const onLogout = async () => {
    await signOut()
  }

  const handleVerTodasCredenciales = () => {
    navigation.navigate('CredencialesHome' as any)
  }

  const handleRefreshCredencial = async () => {
    try {
      setLoading(true)
      await syncCredenciales()
    } catch (error) {
      const emsg = (typeof error === 'object' && error !== null && 'message' in error) ? String((error as Record<string, unknown>)['message']) : String(error)
      console.error('Error al actualizar credencial:', emsg)
    } finally {
      setLoading(false)
    }
  }

  const handleCredencialPress = (credencial: Credencial) => {
    setSelectedCredencial(credencial)
    setModalVisible(true)
  }

  const isCredencialVigente = (crcrefecvi?: string) => {
    if (!crcrefecvi) return false
    const s = String(crcrefecvi).slice(0, 10)
    const todayStr = new Date().toISOString().slice(0, 10)
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s >= todayStr
    const d = new Date(String(crcrefecvi))
    return !isNaN(d.getTime()) && d.getTime() >= Date.now()
  }

  const handleCompartirCredencial = async () => {
    try {
      if (!selectedCredencial) {
        Alert.alert('Error', 'No hay una credencial seleccionada para compartir')
        return
      }

      if (isOfflineMode && selectedCredencial && !isCredencialVigente(selectedCredencial.crcrefecvi)) {
        Alert.alert('Credencial vencida', 'En modo offline no se puede generar token ni compartir si la credencial no está vigente. Conectate a internet y presioná Actualizar.')
        return
      }

      setSharing(true)
      
      if (!credencialModalRef.current) {
        Alert.alert('Error', 'No se pudo capturar la credencial')
        return
      }

      // Capturar la credencial como imagen
      const uri = await captureRef(credencialModalRef, {
        format: 'png',
        quality: 1,
      })

      // Compartir la imagen
      const isAvailable = await Sharing.isAvailableAsync()
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: `Credencial de ${selectedCredencial.crcreapeno}`,
        })
      } else {
        Alert.alert('Error', 'Compartir no está disponible en este dispositivo')
      }
    } catch (error) {
      console.error('Error al compartir:', error)
      Alert.alert('Error', 'No se pudo compartir la credencial')
    } finally {
      setSharing(false)
    }
  }

  const handleActualizarCredencial = async () => {
    if (isOfflineMode && selectedCredencial && !isCredencialVigente(selectedCredencial.crcrefecvi)) {
      Alert.alert('Sin conexión', 'En modo offline no se puede actualizar una credencial vencida. Conectate a internet e intentá nuevamente.')
      return
    }
    setModalVisible(false)
    await handleRefreshCredencial()
    Alert.alert('✅ Actualizado', 'Credencial actualizada correctamente')
  }

  const handleVerGrupoFamiliar = () => {
    setModalVisible(false)
    navigation.navigate('CredencialesHome' as any)
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => refreshHomeData({ forceSync: true })} />}
    >
      <OfflineBanner />

      {/* ── Header — Figma node 12229-2357 ──────────────────── */}
      <View style={[styles.header, { backgroundColor: colors.headerBackground }]}>
        <SaludoHeader
          nombre={getNombreCompleto()}
          unreadCount={unreadCount}
          onAvatarPress={() => navigation.navigate('Profile' as any)}
          onNotificationsPress={() => navigation.navigate('Notifications' as any)}
        />
        <TouchableOpacity
          style={styles.bellButton}
          onPress={() => navigation.navigate('Notifications' as any)}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={26} color="#fff" />
          {unreadCount > 0 && (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Carrusel Credenciales — Figma 12156-3215 ─────────── */}
      <View style={styles.carouselWrap}>
        {credenciales.length > 0 ? (
          <>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              onScroll={(e) =>
                setActiveCredIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))
              }
            >
              {credenciales.map((cred, idx) => (
                <View key={(cred.crcreid ?? '') + idx} style={styles.carouselPage}>
                  <CredencialReducida
                    credencial={cred}
                    onPress={() => handleCredencialPress(cred)}
                  />
                </View>
              ))}
            </ScrollView>
            {credenciales.length > 1 && (
              <View style={styles.dotsRow}>
                {credenciales.map((_, i) => (
                  <View key={i} style={[styles.dot, i === activeCredIndex && styles.dotActive]} />
                ))}
              </View>
            )}
          </>
        ) : (
          <View style={styles.carouselPage}>
            <CredencialReducidaEmpty />
          </View>
        )}
      </View>

      {/* ── Bloque glass: Botonera + Banners ──────────────────────────────── */}
      <HomeFondoGlass
        autoHeight
        style={[styles.glassBlock, { marginBottom: 78 + 10 + insets.bottom + 8 }]}
      >
        {/* ── Botonera Principal ─────────────────────────────────────────── */}
        <BotoneraSection refreshTrigger={botoneraRefreshTrigger} />

        {/* ── Banner Prestadores — Figma 12156-3029 ─────────────────────── */}
        <View style={[styles.bannerWrap, styles.bannerLast]}>
          <BannerPrestadores
            onPress={() => navigation.navigate('Buscar' as any, { screen: 'CartillaHub' } as never)}
          />
        </View>

        {/* ── Novedades (última sección) ─────────────────────────────────── */}
        <NovedadesCarousel offline={isOfflineMode} autoAdvanceMs={0} />
      </HomeFondoGlass>



      {/* Modal con credencial completa, QR y opciones */}
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
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Tu Credencial</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Text style={[styles.modalClose, { color: colors.textSecondary }]}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Credencial SIN QR */}
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
                      <View style={styles.qrTextBlock}>
                        <Text style={styles.qrSubtitle}>
                          {formatCredencialName(selectedCredencial.crcreapeno)}
                        </Text>
                        <Text style={styles.qrInfo}>
                          N° Afiliado: {selectedCredencial.crcrenroaf}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* Opciones */}
              <View style={[styles.modalActionsCard, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadow }]}> 
                <View style={styles.modalActionsHeader}>
                  <Ionicons name="flash-outline" size={18} color={colors.primary} />
                  <Text style={[styles.actionsTitle, { color: colors.textPrimary }]}>Acciones</Text>
                </View>

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
                  onPress={handleActualizarCredencial}
                  disabled={isOfflineMode && selectedCredencial ? !isCredencialVigente(selectedCredencial.crcrefecvi) : false}
                >
                  <View style={[styles.actionIconWrap, { backgroundColor: '#E6F2FF' }]}>
                    <Ionicons name="refresh-outline" size={18} color="#2C8FE6" />
                  </View>
                  <Text style={[styles.actionText, { color: colors.textPrimary }]}>Actualizar credencial</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
                  onPress={handleCompartirCredencial}
                  disabled={sharing}
                >
                  <View style={[styles.actionIconWrap, { backgroundColor: '#FFF1E8' }]}>
                    <Ionicons name="share-social-outline" size={18} color="#F97316" />
                  </View>
                  <Text style={[styles.actionText, { color: colors.textPrimary }]}>
                    {sharing ? 'Compartiendo...' : 'Compartir credencial'}
                  </Text>
                </TouchableOpacity>

                {totalMiembros > 1 && (
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.actionButtonPrimary, { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary }]}
                    onPress={handleVerGrupoFamiliar}
                  >
                    <View style={[styles.actionIconWrap, styles.actionIconWrapPrimary]}>
                      <Ionicons name="people-outline" size={18} color="#FFFFFF" />
                    </View>
                    <View style={styles.actionTextContainer}>
                      <Text style={styles.actionTextPrimary}>Abrir credenciales</Text>
                      <Text style={styles.actionSubtext}>
                        {totalMiembros} {totalMiembros === 1 ? 'credencial' : 'credenciales'}
                      </Text>
                    </View>
                    <Text style={styles.actionArrow}>→</Text>
                  </TouchableOpacity>
                )}
              </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 12,
  },
  title: { 
    fontSize: 14, 
    fontWeight: 'bold', 
    color: '#fff', 
    textAlign: 'center',
    flexWrap: 'wrap',
    lineHeight: 20,
    width: '100%',
  },
  titleWelcome: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'left',
    opacity: 0.9,
  },
  titleName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'left',
    marginTop: 2,
    width: '100%',
  },
  credencialSection: {
    marginHorizontal: 16,
    marginTop: -2,
  },
  /** Carrusel horizontal de CredencialReducida (todas las del grupo familiar) */
  carouselWrap: {
    marginTop: 16,
    paddingBottom: 8,
  },
  carouselPage: {
    width: SCREEN_W,
    paddingHorizontal: 16,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  dotActive: {
    width: 18,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2B76B9',
  },
  /** Wrapper glass — contiene botonera + banners sobre fondo glass */
  glassBlock: {
    marginLeft: 16,
    marginRight: 16,
    marginTop: 8,
  },
  /** Padding horizontal de cada banner dentro del glass */
  bannerWrap: {
    paddingTop: 8,
  },
  bannerLast: {
    paddingBottom: 16,
  },
  credencialPreviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  credencialPreviewLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  credencialVigenteBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  credencialVigenteBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  credencialPreviewName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  credencialPreviewBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  credencialPreviewField: {
    fontSize: 11,
    marginBottom: 2,
  },
  credencialPreviewValue: {
    fontWeight: '700',
    fontSize: 13,
  },
  credencialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  verTodasLink: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
  },
  verGrupoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  verGrupoIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  verGrupoTextContainer: {
    flex: 1,
  },
  verGrupoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 2,
  },
  verGrupoSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  verGrupoArrow: {
    fontSize: 24,
    color: '#667eea',
    fontWeight: 'bold',
  },
  noCredencialContainer: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noCredencialIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  noCredencialTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  noCredencialText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginHorizontal: 16, marginTop: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  planCard: { backgroundColor: '#1976d2', marginTop: -10 },
  cardLabel: { fontSize: 12, color: '#e3f2fd', textTransform: 'uppercase', marginBottom: 4 },
  planName: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  statsGrid: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 12, gap: 12 },
  statCard: { flex: 1, backgroundColor: '#fff', padding: 16, borderRadius: 8, alignItems: 'center', elevation: 2 },
  statValue: { fontSize: 28, fontWeight: 'bold', color: '#2196f3' },
  statLabel: { fontSize: 11, color: '#666', marginTop: 4 },
  saldo: { fontSize: 30, fontWeight: 'bold', marginTop: 4 },
  turno: { fontSize: 16, color: '#333', marginTop: 4 },
  
  // Estilos de Cartilla
  cartillaSection: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  cartillaButton: {
    backgroundColor: '#4c51bf', // Morado más intenso
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#4c51bf',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  cartillaIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cartillaIconText: {
    fontSize: 28,
  },
  cartillaContent: {
    flex: 1,
  },
  cartillaTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  cartillaSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
  },
  cartillaArrow: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },
  quickCartillaSection: {
    marginTop: 12,
    gap: 12,
  },
  quickCartillaGroup: {
    gap: 6,
  },
  quickCartillaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  quickCartillaLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  quickCartillaVerTodos: {
    fontSize: 12,
    color: '#007AFF',
  },
  quickCartillaItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  quickCartillaItemName: {
    fontSize: 14,
    fontWeight: '500',
  },
  quickCartillaItemSub: {
    fontSize: 12,
    marginTop: 2,
  },
  
  section: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginHorizontal: 16, marginTop: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  hint: { fontSize: 13, color: '#555', marginBottom: 6, lineHeight: 20 },
  // Acceso Rápido - nueva grilla
  quickAccessSection: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
  },
  quickAccessSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#6B7280',
    marginBottom: 12,
  },
  quickAccessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickAccessCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  quickAccessCardIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickAccessCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    lineHeight: 20,
    marginBottom: 4,
  },
  quickAccessCardDesc: {
    fontSize: 12,
    color: '#6B7280',
  },
  // Estilos legacy (no usados, se mantienen por compatibilidad)
  quickAccessButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  quickAccessIcon: { fontSize: 28, marginRight: 12 },
  quickAccessTextContainer: { flex: 1 },
  quickAccessTitle: { fontSize: 15, fontWeight: '600', color: '#212529' },
  quickAccessDesc: { fontSize: 12, color: '#6c757d', marginTop: 2 },
  quickAccessArrow: { fontSize: 24, color: '#adb5bd', fontWeight: '300' },
  footer: { padding: 16, paddingBottom: 24 },

  // Sección Trámites
  tramitesSection: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  tramitesSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#6B7280',
    marginBottom: 12,
  },
  tramitesItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  tramitesItemIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  tramitesItemContent: {
    flex: 1,
  },
  tramitesItemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tramitesItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  tramitesItemSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  tramitesBadge: {
    backgroundColor: '#F97316',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tramitesBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
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
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
    gap: 12,
  },
  modalActionsCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  modalActionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  actionsTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonPrimary: {
    backgroundColor: '#667eea',
  },
  actionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionIconWrapPrimary: {
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTextPrimary: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 2,
  },
  actionSubtext: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  actionArrow: {
    fontSize: 20,
    color: 'white',
    fontWeight: 'bold',
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
  qrTextBlock: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
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
  },
  qrInfo: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
})
