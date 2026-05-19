/**
 * HomeScreen — OSEP
 *
 * TODO: Implementar el diseño visual de OSEP.
 *       Toda la lógica de datos ya está lista: credenciales, usuario, notificaciones.
 */
import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Modal,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../theme'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import type { NavigationProp } from '@react-navigation/native'
import { useNotifications } from '../../hooks/useNotifications'
import { OfflineBanner } from '../../components/OfflineBanner'
import CredencialCard from '../../components/CredencialCard'
import { captureRef } from 'react-native-view-shot'
import * as Sharing from 'expo-sharing'
import QRCode from 'react-native-qrcode-svg'
import { Credencial } from '../../types/credencial'
import { formatFecha } from '../../utils/dateUtils'

export default function HomeScreen() {
  const { user, credenciales, syncCredenciales, isOfflineMode } = useAuth()
  const { colors } = useTheme()
  const { unreadCount } = useNotifications()
  const navigation = useNavigation<NavigationProp<Record<string, object | undefined>>>()
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedCredencial, setSelectedCredencial] = useState<Credencial | null>(null)
  const [sharing, setSharing] = useState(false)
  const credencialModalRef = useRef<View>(null)

  const credencialTitular = credenciales?.find(c => c.crcrepropi === 'S') || credenciales?.[0]
  const totalMiembros = credenciales?.length || 0

  const getNombreCompleto = (): string => {
    if (credencialTitular?.crcreapeno) return credencialTitular.crcreapeno
    return (
      (typeof user?.name === 'string' && user.name) ||
      (typeof user?.nombre === 'string' && user.nombre) ||
      (typeof user?.username === 'string' && user.username) ||
      'Usuario'
    )
  }

  const onRefresh = async () => {
    setLoading(true)
    try { await syncCredenciales() } catch {}
    setLoading(false)
  }

  const handleOpenCredencial = (cred: Credencial) => {
    setSelectedCredencial(cred)
    setModalVisible(true)
  }

  const handleShare = async () => {
    if (!credencialModalRef.current) return
    setSharing(true)
    try {
      const uri = await captureRef(credencialModalRef, { format: 'png', quality: 1 })
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri)
    } catch (e) {
      Alert.alert('Error', 'No se pudo compartir la credencial')
    }
    setSharing(false)
  }

  const getQrData = (cred: Credencial): string => {
    return JSON.stringify({
      afiliadoId: cred.crcreafid,
      cuil: cred.crcrednucu,
      token: cred.tokenTemporal || '',
      vence: cred.crcrefven,
    })
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ----------------------------------------------------------------
          TODO OSEP: Rediseñar el header principal según el design system OSEP.
          Variables disponibles: getNombreCompleto(), unreadCount, isOfflineMode
      ---------------------------------------------------------------- */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.welcome, { color: colors.textOnPrimaryMuted }]}>Bienvenido/a</Text>
            <Text style={[styles.userName, { color: colors.textOnPrimary }]} numberOfLines={1}>
              {getNombreCompleto()}
            </Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
            <View>
              <Ionicons name="notifications-outline" size={26} color={colors.textOnPrimary} />
              {unreadCount > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.tabBadge }]}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
        {isOfflineMode && <OfflineBanner compact />}
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.scroll}
      >
        {/* ----------------------------------------------------------------
            TODO OSEP: Rediseñar la tarjeta de credencial del titular.
            Datos disponibles: credencialTitular, totalMiembros
        ---------------------------------------------------------------- */}
        {credencialTitular ? (
          <TouchableOpacity onPress={() => handleOpenCredencial(credencialTitular)} activeOpacity={0.85}>
            <View style={[styles.section, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Mi credencial</Text>
              <CredencialCard credencial={credencialTitular} />
              <Text style={[styles.hint, { color: colors.textMuted }]}>
                Tocá para ver el QR y opciones
              </Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No hay credenciales disponibles
            </Text>
          </View>
        )}

        {/* ----------------------------------------------------------------
            TODO OSEP: Rediseñar el acceso rápido al grupo familiar.
        ---------------------------------------------------------------- */}
        <TouchableOpacity
          style={[styles.familyRow, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
          onPress={() => navigation.navigate('Credenciales')}
        >
          <Ionicons name="people-outline" size={22} color={colors.primary} />
          <Text style={[styles.familyText, { color: colors.textPrimary }]}>
            Ver grupo familiar ({totalMiembros} miembro{totalMiembros !== 1 ? 's' : ''})
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        {/* ----------------------------------------------------------------
            TODO OSEP: Agregar accesos rápidos, noticias, banners OSEP, etc.
        ---------------------------------------------------------------- */}
      </ScrollView>

      {/* Modal credencial con QR */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            {selectedCredencial && (
              <View ref={credencialModalRef} collapsable={false}>
                <CredencialCard credencial={selectedCredencial} />
                <View style={[styles.qrFrame, { borderColor: colors.border }]}>
                  <QRCode value={getQrData(selectedCredencial)} size={180} />
                  <Text style={[styles.qrName, { color: colors.textPrimary }]}>
                    {selectedCredencial.crcreapeno}
                  </Text>
                  {selectedCredencial.tokenTemporalVenceEn && (
                    <Text style={[styles.qrExpiry, { color: colors.textMuted }]}>
                      Vence: {formatFecha(selectedCredencial.tokenTemporalVenceEn)}
                    </Text>
                  )}
                </View>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                onPress={handleShare}
                disabled={sharing}
              >
                <Ionicons name="share-outline" size={18} color={colors.textOnPrimary} />
                <Text style={[styles.actionBtnText, { color: colors.textOnPrimary }]}>Compartir</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.surfaceVariant }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.actionBtnText, { color: colors.textPrimary }]}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  welcome: { fontSize: 13 },
  userName: { fontSize: 18, fontWeight: '700', maxWidth: 240 },
  badge: {
    position: 'absolute', top: -4, right: -4,
    borderRadius: 8, minWidth: 16, height: 16,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  scroll: { padding: 16, paddingBottom: 40 },
  section: { borderRadius: 16, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8 },
  sectionTitle: { fontSize: 12, fontWeight: '600', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  hint: { fontSize: 12, textAlign: 'center', marginTop: 8 },
  emptyText: { textAlign: 'center', padding: 24, fontSize: 14 },
  familyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 12,
  },
  familyText: { flex: 1, fontSize: 14, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 20, padding: 20 },
  qrFrame: { borderWidth: 1, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 12 },
  qrName: { fontSize: 15, fontWeight: '600', marginTop: 10, textAlign: 'center' },
  qrExpiry: { fontSize: 12, marginTop: 4 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10, paddingVertical: 12 },
  actionBtnText: { fontSize: 14, fontWeight: '600' },
})
