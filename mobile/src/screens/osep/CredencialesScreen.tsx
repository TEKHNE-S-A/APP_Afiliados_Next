/**
 * CredencialesScreen — OSEP
 *
 * TODO: Implementar el diseño visual de OSEP.
 *       La lógica de credenciales del grupo familiar ya está disponible via useAuth().
 */
import React, { useState, useRef } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  RefreshControl,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../theme'
import { captureRef } from 'react-native-view-shot'
import * as Sharing from 'expo-sharing'
import QRCode from 'react-native-qrcode-svg'
import CredencialCard from '../../components/CredencialCard'
import { OfflineBanner } from '../../components/OfflineBanner'
import { Credencial } from '../../types/credencial'
import { formatFecha } from '../../utils/dateUtils'

export default function CredencialesScreen() {
  const { credenciales, syncCredenciales, isOfflineMode } = useAuth()
  const { colors } = useTheme()
  const [refreshing, setRefreshing] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedCredencial, setSelectedCredencial] = useState<Credencial | null>(null)
  const [sharing, setSharing] = useState(false)
  const credencialRef = useRef<View>(null)

  const onRefresh = async () => {
    setRefreshing(true)
    try { await syncCredenciales() } catch {}
    setRefreshing(false)
  }

  const handleOpen = (cred: Credencial) => {
    setSelectedCredencial(cred)
    setModalVisible(true)
  }

  const handleShare = async () => {
    if (!credencialRef.current) return
    setSharing(true)
    try {
      const uri = await captureRef(credencialRef, { format: 'png', quality: 1 })
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri)
    } catch {
      Alert.alert('Error', 'No se pudo compartir la credencial')
    }
    setSharing(false)
  }

  const getQrData = (cred: Credencial) => JSON.stringify({
    afiliadoId: cred.crcreafid,
    cuil: cred.crcrednucu,
    token: cred.tokenTemporal || '',
    vence: cred.crcrefven,
  })

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ----------------------------------------------------------------
          TODO OSEP: Rediseñar el header de credenciales según el design system OSEP.
      ---------------------------------------------------------------- */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={[styles.title, { color: colors.textOnPrimary }]}>Credenciales</Text>
        <Text style={[styles.subtitle, { color: colors.textOnPrimaryMuted }]}>
          Grupo familiar · {credenciales?.length || 0} miembro{(credenciales?.length || 0) !== 1 ? 's' : ''}
        </Text>
        {isOfflineMode && <OfflineBanner compact />}
      </View>

      {/* ----------------------------------------------------------------
          TODO OSEP: Rediseñar la lista de credenciales del grupo familiar.
      ---------------------------------------------------------------- */}
      <FlatList
        data={credenciales || []}
        keyExtractor={(item) => item.crcreafid || item.crcrednucu || Math.random().toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="id-card-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No hay credenciales disponibles
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handleOpen(item)} activeOpacity={0.85}>
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <CredencialCard credencial={item} />
              <Text style={[styles.cardHint, { color: colors.textMuted }]}>
                Tocá para ver el QR
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Modal QR */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.overlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            {selectedCredencial && (
              <View ref={credencialRef} collapsable={false}>
                <CredencialCard credencial={selectedCredencial} />
                <View style={[styles.qrFrame, { borderColor: colors.border }]}>
                  <QRCode value={getQrData(selectedCredencial)} size={180} />
                  <Text style={[styles.qrName, { color: colors.textPrimary }]}>
                    {selectedCredencial.crcreapeno}
                  </Text>
                </View>
              </View>
            )}
            <View style={styles.actions}>
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
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 4 },
  list: { padding: 16, paddingBottom: 40 },
  card: { borderRadius: 16, padding: 12, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8 },
  cardHint: { fontSize: 12, textAlign: 'center', marginTop: 6 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 20, padding: 20 },
  qrFrame: { borderWidth: 1, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 12 },
  qrName: { fontSize: 15, fontWeight: '600', marginTop: 10, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10, paddingVertical: 12 },
  actionBtnText: { fontSize: 14, fontWeight: '600' },
})
