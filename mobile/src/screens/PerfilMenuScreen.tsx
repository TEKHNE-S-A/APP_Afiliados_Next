import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native'

// URLs legales — completar con sitios públicos antes de submit a App Store
const PRIVACY_POLICY_URL = 'https://tekhne.com.ar/legal/app-afiliados/privacidad'
const TERMS_URL = 'https://tekhne.com.ar/legal/app-afiliados/terminos'

async function openLegalUrl(url: string, label: string) {
  try {
    const supported = await Linking.canOpenURL(url)
    if (supported) {
      await Linking.openURL(url)
    } else {
      Alert.alert(label, 'No se pudo abrir el enlace. Visite tekhne.com.ar')
    }
  } catch {
    Alert.alert(label, 'No se pudo abrir el enlace. Visite tekhne.com.ar')
  }
}
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../theme'
import { OfflineBanner } from '../components/OfflineBanner'
import { apiPost } from '../services/api'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import { API_BASE_URL } from '../config'
import { getErrorMessage } from '../utils/errorUtils'
import CurvedHeroHeader from '../components/CurvedHeroHeader'

export default function PerfilMenuScreen() {
  const navigation = useNavigation<any>()
  const { user, signOut, token, isOfflineMode } = useAuth() as any
  const { colors, mode, setMode, isDark } = useTheme()
  const [loading, setLoading] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  const toTitleCase = (value: string) =>
    value
      .split(' ')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')

  const getDisplayName = (): string => {
    const rawName = String((user as any)?.nombre || (user as any)?.nuusuapell || '').trim()

    if (rawName) {
      // Limpia prefijos inválidos y espacios repetidos que llegan desde datos legacy.
      const cleaned = rawName
        .replace(/^[^A-Za-zÁÉÍÓÚáéíóúÑñ]+/, '')
        .replace(/\s+/g, ' ')
        .trim()

      const parts = cleaned
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)

      if (parts.length >= 2) {
        return parts.map((part) => toTitleCase(part)).join(', ')
      }

      if (cleaned.length > 0) {
        return toTitleCase(cleaned)
      }
    }

    const email = String((user as any)?.email || '').trim()
    if (email.includes('@')) {
      return email.split('@')[0]
    }

    return String((user as any)?.username || '').trim()
  }

  const displayName = getDisplayName()
  const displayEmail = String((user as any)?.email || '').trim()

  const menuItems = [
    {
      id: 'solicitud-autorizacion',
      title: 'Nueva Solicitud',
      description: 'Solicitar autorización médica',
      icon: 'add-circle',
      screen: 'SolicitudAutorizacion',
      color: '#FF5722',
      iconBg: '#FFF3EF',
    },
    {
      id: 'mis-autorizaciones',
      title: 'Mis Autorizaciones',
      description: 'Ver historial de solicitudes realizadas',
      icon: 'document-text',
      screen: 'MisAutorizaciones',
      color: '#3F51B5',
      iconBg: '#ECEEF9',
    },
    {
      id: 'enrolamientos',
      title: 'Enrolamientos',
      description: 'Consultar enrolamientos del grupo familiar',
      icon: 'finger-print',
      screen: 'Enrolamientos',
      color: '#4CAF50',
      iconBg: '#F0FBF1',
    },
    {
      id: 'historial-atencion',
      title: 'Historial de Atención',
      description: 'Ver historial de atenciones médicas',
      icon: 'time',
      screen: 'HistorialAtencion',
      color: '#009688',
      iconBg: '#E5F5F4',
    },
    {
      id: 'coseguros-pendientes',
      title: 'Coseguros pendientes',
      description: 'Ver coseguros y detalle de consumo',
      icon: 'wallet',
      screen: 'CosegurosPendientes',
      color: '#3F51B5',
      iconBg: '#ECEEF9',
    },
    {
      id: 'credenciales',
      title: 'Credenciales',
      description: 'Ver credenciales del grupo familiar',
      icon: 'card',
      screen: 'Credenciales',
      color: '#2196F3',
      iconBg: '#EBF6FE',
    },
    {
      id: 'datos-personales',
      title: 'Datos Personales',
      description: 'Ver y editar información personal',
      icon: 'person',
      screen: null, // Por implementar
      color: '#FF9800',
      iconBg: '#FFF4E5',
      disabled: true,
    },
    {
      id: 'notificaciones',
      title: 'Notificaciones',
      description: 'Configurar qué avisos recibir',
      icon: 'notifications',
      screen: 'NotificationPreferences',
      color: '#FF9800',
      iconBg: '#FFF4E5',
    },
  ]

  const handleMenuPress = (item: any) => {
    if (item.disabled) return
    if (item.screen) {
      if (item.screen === 'HistorialAtencion') {
        navigation.navigate(item.screen, { from: 'Perfil' })
      } else {
        navigation.navigate(item.screen)
      }
    }
  }

  const handleCancelRegistration = () => {
    Alert.alert(
      'Anular Registración',
      '⚠️ ADVERTENCIA: Esta acción es IRREVERSIBLE.\n\n' +
      'Al anular su registración:\n' +
      '• Su cuenta será desactivada permanentemente\n' +
      '• Perderá acceso a la aplicación\n' +
      '• No podrá volver a iniciar sesión\n' +
      '• Deberá registrarse nuevamente para usar la app\n\n' +
      '¿Está seguro que desea continuar?',
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Anular Registración',
          style: 'destructive',
          onPress: async () => {
            setLoading(true)
            try {
              await apiPost('/gam/cancel-registration', {})
              
              Alert.alert(
                'Registración Anulada',
                'Su cuenta ha sido desactivada exitosamente. Será redirigido al inicio de sesión.',
                [
                  {
                    text: 'Entendido',
                    onPress: () => signOut()
                  }
                ]
              )
            } catch (error: any) {
              console.error('Error al anular registración:', error)
              
              // Manejar sesión expirada
              if (error.message?.includes('401') || error.message?.includes('SESSION_EXPIRED')) {
                Alert.alert(
                  'Sesión Expirada',
                  'Su sesión ha expirado. Por favor, inicie sesión nuevamente.',
                  [
                    {
                      text: 'Iniciar Sesión',
                      onPress: () => signOut()
                    }
                  ]
                )
              }
              // Manejar falta de token GAM
              else if (error.message?.includes('GAM_TOKEN_REQUIRED') || error.message?.includes('400')) {
                Alert.alert(
                  'Sincronización Requerida',
                  'Su cuenta requiere sincronización con el sistema de autenticación. Por favor, cierre sesión y vuelva a iniciar sesión.',
                  [
                    {
                      text: 'Cerrar Sesión',
                      onPress: () => signOut()
                    }
                  ]
                )
              }
              else {
                Alert.alert(
                  'Error',
                  error.message || 'No se pudo anular la registración. Intente nuevamente.'
                )
              }
            } finally {
              setLoading(false)
            }
          }
        }
      ]
    )
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

      const afiliadoId = encodeURIComponent(String((user as any)?.afiliadoId || ''))
      const remoteUrl = `${API_BASE_URL}/credencial/constancia.pdf${afiliadoId ? `?afiliadoId=${afiliadoId}` : ''}`
      const fileKey = afiliadoId || String((user as any)?.nuusuid || Date.now())
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.headerBackground }]}>
      <OfflineBanner />
      
      <ScrollView style={[styles.scrollView, { backgroundColor: colors.background }]}>
        <CurvedHeroHeader
          icon={<Ionicons name="person" size={40} color="#fff" />}
          title={displayName}
          subtitle={displayEmail}
          backgroundColor={colors.headerBackground}
          waveBackgroundColor={colors.background}
          titleStyle={styles.userName}
          subtitleStyle={styles.userEmail}
          headerStyle={styles.headerOverride}
          waveStyle={styles.headerWaveOverride}
        />

        {/* Tema claro/oscuro */}
        <View style={[styles.themeSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Apariencia</Text>
          <View style={styles.themeRow}>
            {(['light', 'system', 'dark'] as const).map((m) => (
              <TouchableOpacity
                key={m}
                style={[
                  styles.themeOption,
                  { backgroundColor: mode === m ? colors.primary : colors.surfaceVariant },
                ]}
                onPress={() => setMode(m)}
              >
                <Ionicons
                  name={m === 'light' ? 'sunny' : m === 'dark' ? 'moon' : 'phone-portrait'}
                  size={20}
                  color={mode === m ? colors.textOnPrimary : colors.textSecondary}
                />
                <Text style={[
                  styles.themeOptionText,
                  { color: mode === m ? colors.textOnPrimary : colors.textSecondary },
                ]}>
                  {m === 'light' ? 'Claro' : m === 'dark' ? 'Oscuro' : 'Sistema'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>OPCIONES</Text>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.menuItem,
                { backgroundColor: colors.surface },
                item.disabled && styles.menuItemDisabled,
              ]}
              onPress={() => handleMenuPress(item)}
              disabled={item.disabled}
              activeOpacity={0.75}
            >
              <View style={[styles.iconContainer, { backgroundColor: (item as any).iconBg }]}>
                <Ionicons name={item.icon as any} size={24} color={item.color} />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={[styles.menuItemTitle, { color: colors.textPrimary }, item.disabled && { color: colors.textMuted }]}>
                  {item.title}
                </Text>
                <Text style={[styles.menuItemDescription, { color: colors.textSecondary }]}>{item.description}</Text>
              </View>
              {!item.disabled && (
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              )}
              {item.disabled && (
                <Text style={[styles.comingSoon, { color: colors.textMuted }]}>Próximamente</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.pdfButton, { backgroundColor: colors.surface }]}
          onPress={handleDownloadConstanciaPdf}
          disabled={downloadingPdf}
        >
          {downloadingPdf ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <Ionicons name="document-text-outline" size={24} color={colors.primary} />
              <Text style={[styles.pdfButtonText, { color: colors.primary }]}>Descargar constancia PDF</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Logout Button */}
        <TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.surface }]} onPress={signOut}>
          <Ionicons name="log-out-outline" size={24} color={colors.error} />
          <Text style={[styles.logoutText, { color: colors.error }]}>Cerrar Sesión</Text>
        </TouchableOpacity>

        {/* Cancel Registration Button */}
        <TouchableOpacity 
          style={[styles.cancelButton, { backgroundColor: isDark ? colors.surfaceVariant : '#FFF5F5', borderColor: colors.borderError }]} 
          onPress={handleCancelRegistration}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.error} />
          ) : (
            <>
              <Ionicons name="trash-outline" size={24} color={colors.error} />
              <Text style={[styles.cancelText, { color: colors.error }]}>Anular Registración</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Sección Legal — requerido por App Store / Play Store */}
        <View style={styles.legalSection}>
          <TouchableOpacity
            style={[styles.legalRow, { backgroundColor: colors.surface }]}
            onPress={() => openLegalUrl(PRIVACY_POLICY_URL, 'Política de Privacidad')}
            accessibilityRole="link"
            accessibilityLabel="Abrir política de privacidad"
          >
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.legalText, { color: colors.textSecondary }]}>Política de Privacidad</Text>
            <Ionicons name="open-outline" size={16} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.legalRow, { backgroundColor: colors.surface }]}
            onPress={() => openLegalUrl(TERMS_URL, 'Términos de Uso')}
            accessibilityRole="link"
            accessibilityLabel="Abrir términos de uso"
          >
            <Ionicons name="document-text-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.legalText, { color: colors.textSecondary }]}>Términos de Uso</Text>
            <Ionicons name="open-outline" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Disclaimer médico — requerido para apps categoría Medicina (Apple 1.4) */}
        <Text style={[styles.disclaimerText, { color: colors.textMuted }]}>
          Esta aplicación brinda información referencial sobre cobertura y prestadores. No reemplaza la consulta médica profesional. Ante una emergencia, comuníquese con su servicio de emergencias.
        </Text>

        {/* Version Info */}
        <Text style={[styles.versionText, { color: colors.textMuted }]}>Versión 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a2b5e',
  },
  scrollView: {
    flex: 1,
  },
  headerOverride: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
  },
  headerWaveOverride: {
    height: 42,
    marginTop: -42,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    marginBottom: -2,
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
    marginTop: 0,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 10,
  },
  menuSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  themeSection: {
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginTop: -4,
    marginBottom: 16,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 6,
  },
  themeOptionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#6B7280',
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  menuItemTitleDisabled: {
    color: '#999',
  },
  menuItemDescription: {
    fontSize: 13,
    color: '#666',
  },
  comingSoon: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
    marginLeft: 8,
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  pdfButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F5',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FFE5E5',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
    marginLeft: 8,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#999',
    marginBottom: 32,
  },
  legalSection: {
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 10,
  },
  legalText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  disclaimerText: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    paddingHorizontal: 24,
    marginBottom: 12,
    fontStyle: 'italic',
  },
})


