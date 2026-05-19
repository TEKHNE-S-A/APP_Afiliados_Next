import React, { useRef, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../theme'
import { OfflineBanner } from '../components/OfflineBanner'
import QRCode from 'react-native-qrcode-svg'
import { captureRef } from 'react-native-view-shot'
import * as Sharing from 'expo-sharing'
import * as FileSystem from 'expo-file-system/legacy'
import { formatFecha } from '../utils/dateUtils'
import { getErrorMessage } from '../utils/errorUtils'
import { API_BASE_URL } from '../config'

export default function ProfileScreen() {
  const navigation = useNavigation<any>()
  const { user, credencial, signOut, refreshCredencial, token, isOfflineMode } = useAuth() as any
  const { colors } = useTheme()
  const credencialRef = useRef<View>(null)
  const [selectedMemberIndex, setSelectedMemberIndex] = useState<number | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  // Log para diagnóstico
  console.log('👤 ProfileScreen credencial:', credencial ? Object.keys(credencial) : 'null')
  console.log('📊 credencialDatos:', credencial?.credencialDatos?.length || 0)
  console.log('👨‍👩‍👧 GrupoFamiliar:', credencial?.GrupoFamiliar?.length || 0)
  
  // Log del miembro seleccionado
  if (selectedMemberIndex !== null && credencial?.GrupoFamiliar?.[selectedMemberIndex]) {
    const selectedMember = credencial.GrupoFamiliar[selectedMemberIndex]
    console.log('👉 Miembro seleccionado [' + selectedMemberIndex + ']:', {
      nombre: selectedMember.nombreCompleto,
      campos: selectedMember.credencialDatos?.length || 0,
      keys: Object.keys(selectedMember)
    })
  }

  const nombre = user?.name || user?.nombre || user?.fullName || user?.username || 'Sin nombre'
  const email = user?.email || 'N/D'

  const onLogout = async () => {
    await signOut()
  }

  const handleRefreshCredencial = async () => {
    setRefreshing(true)
    try {
      await refreshCredencial()
      Alert.alert('Éxito', 'Credencial actualizada')
    } catch (e: unknown) {
      Alert.alert('Error', getErrorMessage(e, 'No se pudo actualizar la credencial'))
    } finally {
      setRefreshing(false)
    }
  }

  // Obtener datos a mostrar según integrante seleccionado o credencial principal
  const getDisplayedField = (fieldName: string): string => {
    const upper = fieldName.toUpperCase()
    const family = credencial?.GrupoFamiliar
    
    // Si hay un familiar seleccionado, usar sus datos
    if (family && Array.isArray(family) && selectedMemberIndex !== null && family[selectedMemberIndex]) {
      const m = family[selectedMemberIndex]
      
      // Si el familiar tiene su propio array credencialDatos, usarlo
        if (m.credencialDatos && Array.isArray(m.credencialDatos)) {
        const field = m.credencialDatos.find((item: Record<string, unknown>) => {
          const name = item.Nombre as string | undefined
          return !!name && name.toUpperCase().includes(upper)
        })
        if (field) {
          return String(field.Valor ?? field.Value ?? field.valor ?? 'N/D')
        }
      }
      
      // Fallback: mapear campos conocidos del objeto familiar
      switch (upper) {
        case 'NOMBRE Y APELLIDO':
        case 'NOMBRE': 
          return m.nombreCompleto || `${m.nombre || ''} ${m.apellido || ''}`.trim() || 'N/D'
        case 'NUMERO DE AFILIADO':
        case 'AFILIADO':
          return m.numero || 'N/D'
        case 'DOCUMENTO':
        case 'DNI':
          return m.documento || m.dni || 'N/D'
        case 'CUIL':
          return m.cuil || 'N/D'
        case 'FECHA DE NACIMIENTO':
        case 'NACIMIENTO':
          return formatFecha(m.fechaNacimiento)
        case 'PLAN':
          return m.planDescripcion || m.plan || 'N/D'
        case 'PARENTESCO':
          return selectedMemberIndex === 0 ? 'TITULAR' : (m.parentesco || 'FAMILIAR')
        case 'VIGENCIA DESDE':
        case 'VIGENCIA':
          return formatFecha(m.vigenciaDesde)
        default: 
          return 'N/D'
      }
    }
    
    // Modo original: usar credencialDatos del titular
    if (!credencial?.credencialDatos || !Array.isArray(credencial.credencialDatos)) {
      // Fallback para CUIL si no hay credencialDatos
      if (upper === 'CUIL') {
        return user?.cuil || 'N/D'
      }
      return 'N/D'
    }
    const field = credencial.credencialDatos.find((item: Record<string, unknown>) => {
      const name = item.Nombre as string | undefined
      return !!name && name.toUpperCase().includes(upper)
    })
    const valor = String(field?.Valor ?? field?.Value ?? field?.valor ?? '')
    
    // Si no se encontró en credencialDatos y es CUIL, usar user.cuil como fallback
    if (!valor && upper === 'CUIL') {
      return user?.cuil || 'N/D'
    }
    
    return valor || 'N/D'
  }

  const handleShareCredencial = async () => {
    try {
      if (!credencialRef.current) {
        Alert.alert('Error', 'No se pudo capturar la credencial')
        return
      }

      const uri = await captureRef(credencialRef, {
        format: 'png',
        quality: 1,
      })

      const isAvailable = await Sharing.isAvailableAsync()
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Compartir Credencial',
        })
      } else {
        Alert.alert('Error', 'Compartir no está disponible en este dispositivo')
      }
    } catch (error) {
      console.error('Error compartiendo credencial:', error)
      Alert.alert('Error', 'No se pudo compartir la credencial')
    }
  }

  const getSelectedAfiliadoId = (): string => {
    const family = credencial?.GrupoFamiliar
    if (family && Array.isArray(family) && selectedMemberIndex !== null && family[selectedMemberIndex]) {
      const m = family[selectedMemberIndex]
      return String(m.crcreafili || m.afiliadoId || m.AfiliadoId || '').trim()
    }
    return String(user?.afiliadoId || '').trim()
  }

  const handleDownloadConstanciaPdf = async () => {
    try {
      if (!token || String(token).startsWith('offline_')) {
        Alert.alert('Sesión requerida', 'Necesitás iniciar sesión online para descargar la constancia PDF.')
        return
      }

      if (isOfflineMode) {
        Alert.alert('Sin conexión', 'Conectate a internet para descargar la constancia PDF.')
        return
      }

      setDownloadingPdf(true)

      const afiliadoId = encodeURIComponent(getSelectedAfiliadoId())
      const remoteUrl = `${API_BASE_URL}/credencial/constancia.pdf${afiliadoId ? `?afiliadoId=${afiliadoId}` : ''}`
      const fileKey = afiliadoId || String(user?.afiliadoId || Date.now())
      const localUri = `${FileSystem.cacheDirectory}constancia-${fileKey}.pdf`

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

  // Construir data para QR (AfiliadoId + Token Temporal)
  const qrData = (() => {
    const family = credencial?.GrupoFamiliar
    if (family && Array.isArray(family) && selectedMemberIndex !== null && family[selectedMemberIndex]) {
      const m = family[selectedMemberIndex]
      const qrObj = {
        afiliadoId: m.crcreafili || m.afiliadoId || m.AfiliadoId,
        cuil: m.crcrecuil || m.cuil || m.documento || m.numero,
        token: m.tokenTemporal,
        vence: m.tokenTemporalVenceEn
      }
      console.log('📱 QR generado para familiar [' + selectedMemberIndex + ']: token=' + qrObj.token)
      return JSON.stringify(qrObj)
    }
    const qrObj = {
      afiliadoId: user?.afiliadoId,
      cuil: user?.cuil || user?.dni || user?.nroAfiliado,
      token: credencial?.tokenTemporal,
      vence: credencial?.tokenTemporalVenceEn
    }
    console.log('📱 QR generado para titular: token=' + qrObj.token)
    return JSON.stringify(qrObj)
  })()

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.headerBackground }} edges={['top']}>
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <OfflineBanner />

      {/* Header Banner */}
      <View style={[styles.profileHeader, { backgroundColor: colors.headerBackground }]}>
        <View style={styles.profileAvatarRow}>
          <View style={styles.profileAvatarCircle}>
            <Ionicons name="person" size={38} color="#fff" />
          </View>
          <View style={styles.profileHeaderText}>
            <Text style={styles.profileHeaderName} numberOfLines={1}>{nombre}</Text>
            <Text style={styles.profileHeaderEmail}>{email}</Text>
          </View>
        </View>
      </View>
      <View style={[styles.headerWave, { backgroundColor: colors.background }]} />
      
      {credencial && credencial.credencialDatos ? (
        <View>
          {/* Indicador de credencial mostrada */}
          {selectedMemberIndex !== null && credencial.GrupoFamiliar?.[selectedMemberIndex] && (
            <View style={[styles.selectedBanner, { backgroundColor: colors.surfaceHighlight }]}>
              <Text style={[styles.selectedBannerText, { color: colors.textPrimary }]}>
                📋 Mostrando credencial de: {credencial.GrupoFamiliar[selectedMemberIndex].nombreCompleto}
              </Text>
              <TouchableOpacity onPress={() => setSelectedMemberIndex(null)}>
                <Text style={[styles.selectedBannerClose, { color: colors.primary }]}>✕ Ver titular</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Credencial Digital - Vista para compartir */}
          <View ref={credencialRef} style={[styles.credencialCard, { backgroundColor: colors.card }]}>
            <View style={[styles.credencialHeader, { backgroundColor: colors.headerBackground }]}>
              <Text style={styles.credencialTitle}>CREDENCIAL DIGITAL</Text>
              <Text style={styles.credencialSubtitle}>
                {selectedMemberIndex !== null && credencial.GrupoFamiliar?.[selectedMemberIndex]
                  ? credencial.GrupoFamiliar[selectedMemberIndex].nombreCompleto
                  : 'Obra Social - Afiliados'}
              </Text>
            </View>

            <View style={[styles.credencialBody, { backgroundColor: colors.card }]}>
              {/* QR Code - key fuerza re-render cuando cambia la selección */}
              <View style={[styles.qrContainer, { backgroundColor: colors.surfaceVariant }]}>
                <QRCode
                  key={`qr-${selectedMemberIndex ?? 'titular'}-${qrData}`}
                  value={qrData}
                  size={120}
                  backgroundColor="white"
                  color={colors.primary}
                />
                <Text style={[styles.qrLabel, { color: colors.textSecondary }]}>
                  {selectedMemberIndex !== null ? 'QR del Familiar' : 'QR del Titular'}
                </Text>
              </View>

              {/* Datos principales */}
              <View style={styles.credencialData}>
                <View style={styles.dataRow}>
                  <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>Nombre y Apellido</Text>
                  <Text style={[styles.dataValue, { color: colors.textPrimary }]}>{getDisplayedField('NOMBRE Y APELLIDO')}</Text>
                </View>

                <View style={styles.dataRow}>
                  <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>N° de Afiliado</Text>
                  <Text style={[styles.dataValue, { color: colors.textPrimary }]}>{getDisplayedField('NUMERO DE AFILIADO')}</Text>
                </View>

                <View style={styles.dataRow}>
                  <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>Documento</Text>
                  <Text style={[styles.dataValue, { color: colors.textPrimary }]}>{getDisplayedField('DOCUMENTO')}</Text>
                </View>

                <View style={styles.dataRow}>
                  <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>CUIL</Text>
                  <Text style={[styles.dataValue, { color: colors.textPrimary }]}>{getDisplayedField('CUIL')}</Text>
                </View>

                <View style={styles.dataRow}>
                  <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>Fecha de Nacimiento</Text>
                  <Text style={[styles.dataValue, { color: colors.textPrimary }]}>{getDisplayedField('FECHA DE NACIMIENTO')}</Text>
                </View>

                <View style={styles.dataRow}>
                  <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>Parentesco</Text>
                  <Text style={[styles.dataValue, { color: colors.textPrimary }]}>{getDisplayedField('PARENTESCO')}</Text>
                </View>

                <View style={styles.dataRow}>
                  <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>Plan</Text>
                  <Text style={[styles.dataValue, { color: colors.textPrimary }]}>{getDisplayedField('PLAN')}</Text>
                </View>

                <View style={styles.dataRow}>
                  <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>Vigencia Desde</Text>
                  <Text style={[styles.dataValue, { color: colors.textPrimary }]}>{getDisplayedField('VIGENCIA DESDE')}</Text>
                </View>

                {/* Campos adicionales si hay familiar seleccionado con credencialDatos */}
                {selectedMemberIndex !== null && 
                 credencial.GrupoFamiliar?.[selectedMemberIndex]?.credencialDatos && 
                 Array.isArray(credencial.GrupoFamiliar[selectedMemberIndex].credencialDatos) && (
                  <>
                    <View style={[styles.dataDivider, { backgroundColor: colors.primary }]} />
                    <Text style={[styles.dataSection, { color: colors.primary }]}>Información Adicional</Text>
                    {credencial.GrupoFamiliar[selectedMemberIndex].credencialDatos
                      .filter((item: Record<string, unknown>) => {
                        // Filtrar campos ya mostrados arriba
                        const nombre = String(item.Nombre ?? '').toUpperCase()
                        return !nombre.includes('NOMBRE Y APELLIDO') &&
                               !nombre.includes('NUMERO DE AFILIADO') &&
                               !nombre.includes('DOCUMENTO') &&
                               !nombre.includes('CUIL') &&
                               !nombre.includes('FECHA DE NACIMIENTO') &&
                               !nombre.includes('PARENTESCO') &&
                               !nombre.includes('PLAN') &&
                               !nombre.includes('VIGENCIA')
                      })
                      .map((item: Record<string, unknown>, idx: number) => (
                        <View key={idx} style={styles.dataRow}>
                          <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>
                            {String(item.Nombre ?? '').replace(/\|/g, '').trim()}
                          </Text>
                          <Text style={[styles.dataValue, { color: colors.textPrimary }]}>
                            {String(item.Valor ?? item.Value ?? item.valor ?? 'N/D')}
                          </Text>
                        </View>
                      ))
                    }
                  </>
                )}
              </View>
            </View>

            <View style={[styles.credencialFooter, { backgroundColor: colors.surfaceVariant }]}>
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>Credencial válida para atención médica</Text>
            </View>
          </View>

          {/* Acciones — lista estilo HomeScreen tramites */}
          <View style={[styles.actionsCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.actionsSectionTitle, { color: colors.textSecondary }]}>ACCIONES</Text>

            <TouchableOpacity
              style={[styles.actionRow, { borderBottomColor: colors.border }]}
              onPress={handleShareCredencial}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="share-social-outline" size={22} color="#4CAF50" />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>Compartir credencial</Text>
                <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>
                  {selectedMemberIndex !== null && credencial.GrupoFamiliar?.[selectedMemberIndex]
                    ? `de ${credencial.GrupoFamiliar[selectedMemberIndex].nombreCompleto.split(' ')[0]}`
                    : 'Exportar como imagen PNG'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionRow, { borderBottomColor: colors.border }]}
              onPress={handleDownloadConstanciaPdf}
              disabled={downloadingPdf}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="document-text-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>
                  {downloadingPdf ? 'Descargando...' : 'Constancia PDF'}
                </Text>
                <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>Descargar y compartir</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionRow, { borderBottomColor: colors.border }]}
              onPress={handleRefreshCredencial}
              disabled={refreshing}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="refresh-outline" size={22} color={colors.warning} />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>
                  {refreshing ? 'Actualizando...' : 'Actualizar credencial'}
                </Text>
                <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>Sincronizar con servidor</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionRow, styles.actionRowLast]}
              onPress={() => navigation.navigate('HistorialAtencion')}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="time-outline" size={22} color={colors.success} />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>Historial de atención</Text>
                <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>Consumo de prestaciones</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Grupo Familiar */}
          {Array.isArray(credencial.GrupoFamiliar) && credencial.GrupoFamiliar.length > 0 && (
            <View style={[styles.familyCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.familyTitle, { color: colors.primary }]}>Grupo Familiar ({credencial.GrupoFamiliar.length})</Text>
              {credencial.GrupoFamiliar.map((m: Record<string, unknown>, idx: number) => {
                if (!m) return null // Protección contra elementos undefined
                const active = selectedMemberIndex === idx
                const key = String(m['afiliadoId'] ?? m['AfiliadoId'] ?? idx)
                const nombreMiembro = String((m['nombreCompleto'] ?? `${m['nombre'] ?? ''} ${m['apellido'] ?? ''}`.trim()) || 'Sin nombre')
                const documentoMiembro = String(m['documento'] ?? 'N/D')
                const fechaNac = String(m['fechaNacimiento'] ?? '')
                const planMiembro = String(m['planDescripcion'] ?? m['plan'] ?? 'N/D')
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => {
                      console.log('🔘 Seleccionando miembro:', idx, nombreMiembro)
                      setSelectedMemberIndex(idx === selectedMemberIndex ? null : idx)
                    }}
                    style={[styles.familyRow, active && { backgroundColor: colors.surfaceHighlight, borderRadius: 8 }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.familyName, active && { color: colors.primary }]}>
                        {nombreMiembro}
                      </Text>
                      <Text style={[styles.familyDetail, { color: colors.textSecondary }]}>Documento: {documentoMiembro}</Text>
                      <Text style={[styles.familyDetail, { color: colors.textSecondary }]}>Fecha Nac.: {formatFecha(fechaNac)}</Text>
                      <Text style={[styles.familyDetail, { color: colors.textSecondary }]}>Plan: {planMiembro}</Text>
                    </View>
                    <View style={styles.familyBadgeWrapper}>
                      <Text style={[styles.familyBadge, idx === 0 ? styles.familyBadgeTitular : null, active && styles.familyBadgeActive]}>
                        {idx === 0 ? 'Titular' : 'Miembro'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )
              })}
              <Text style={[styles.familyHint, { color: colors.textMuted }]}>Toca un integrante para ver su credencial individual arriba.</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.primary }]}>Credencial Obra Social</Text>
          <Text style={[styles.noCredencial, { color: colors.textMuted }]}>
            No se pudo obtener la credencial. Intenta cerrar sesión y volver a iniciar sesión.
          </Text>
        </View>
      )}

      {/* Datos de usuario */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.primary }]}>Datos de Usuario</Text>
        <Text style={[styles.item, { color: colors.textPrimary }]}>Usuario: {nombre}</Text>
        <Text style={[styles.item, { color: colors.textPrimary }]}>Email: {email}</Text>
      </View>

      <TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.error }]} onPress={onLogout}>
        <Text style={[styles.logoutButtonText, { color: '#fff' }]}>Cerrar Sesión</Text>
      </TouchableOpacity>
      
      <View style={{ height: 40 }} />
    </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
  },

  // Profile Header
  profileHeader: {
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 60,
  },
  profileAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatarCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  profileHeaderText: {
    flex: 1,
  },
  profileHeaderName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  profileHeaderEmail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 3,
  },
  headerWave: {
    height: 60,
    marginTop: -60,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
  },

  // Actions Card (tramites-style)
  actionsCard: {
    borderRadius: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  actionsSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  actionRowLast: {
    borderBottomWidth: 0,
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 12,
  },

  // Banner de selección
  selectedBanner: {
    backgroundColor: '#FFF3CD',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    padding: 12,
    marginBottom: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedBannerText: {
    fontSize: 13,
    color: '#856404',
    fontWeight: '600',
    flex: 1,
  },
  selectedBannerClose: {
    fontSize: 12,
    color: '#2196f3',
    fontWeight: 'bold',
    paddingLeft: 12,
  },
  
  // Credencial Card Styles
  credencialCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  credencialHeader: {
    backgroundColor: '#2196f3',
    padding: 16,
    alignItems: 'center',
  },
  credencialTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
  },
  credencialSubtitle: {
    fontSize: 12,
    color: '#e3f2fd',
    marginTop: 4,
  },
  credencialBody: {
    padding: 20,
    backgroundColor: '#fff',
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
  },
  qrLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 8,
    fontWeight: '600',
  },
  credencialData: {
    gap: 12,
  },
  dataRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 10,
  },
  dataLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dataValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  dataDivider: {
    height: 1,
    backgroundColor: '#2196f3',
    marginVertical: 12,
  },
  dataSection: {
    fontSize: 14,
    color: '#2196f3',
    fontWeight: 'bold',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  credencialFooter: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
  },
  
  // Share Button
  shareButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pdfButton: {
    backgroundColor: '#1565C0',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
  },
  pdfButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  refreshButton: {
    backgroundColor: '#FF9800',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Historial Button
  historialButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
  },
  historialButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 8,
  },
  
  // User Card
  card: { 
    backgroundColor: '#fff', 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 16, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 4, 
    elevation: 3 
  },
  cardTitle: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    marginBottom: 12, 
    color: '#2196f3' 
  },
  item: { 
    fontSize: 14, 
    marginBottom: 8, 
    color: '#333' 
  },
  noCredencial: { 
    fontSize: 14, 
    color: '#999', 
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  
  // Logout Button
  logoutButton: {
    backgroundColor: '#f44336',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Family Group Styles
  familyCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  familyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196f3',
    marginBottom: 12,
  },
  familyRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  familyRowActive: {
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
  },
  familyName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  familyNameActive: {
    color: '#0d47a1',
  },
  familyDetail: {
    fontSize: 12,
    color: '#555',
    marginBottom: 2,
  },
  familyBadgeWrapper: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingLeft: 8,
  },
  familyBadge: {
    backgroundColor: '#ddd',
    color: '#333',
    fontSize: 11,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  familyBadgeTitular: {
    backgroundColor: '#2196f3',
    color: '#fff',
  },
  familyBadgeActive: {
    backgroundColor: '#1565c0',
    color: '#fff',
  },
  familyHint: {
    marginTop: 10,
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic'
  },
})


