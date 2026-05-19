/**
 * NotificationPreferencesScreen â€” Tarea 17: Preferencias de notificaciÃ³n
 *
 * Permite al usuario controlar quÃ© tipos de notificaciones desea recibir
 * (push y/o in-app) por categorÃ­a.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Switch,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import CurvedHeroHeader from '../components/CurvedHeroHeader';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  CATEGORIAS_INFO,
  type NotifPref,
  type NotifCategoria,
} from '../services/notificationPreferencesService';

// ============================================================================
// TIPOS LOCALES
// ============================================================================

type LocalPrefs = Record<NotifCategoria, { push: boolean; in_app: boolean }>;

const DEFAULT_PREFS: LocalPrefs = {
  credencial: { push: true, in_app: true },
  autorizaciones: { push: true, in_app: true },
  tramites: { push: true, in_app: true },
  noticias: { push: true, in_app: true },
  sistema: { push: true, in_app: true },
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function NotificationPreferencesScreen() {
  const { colors } = useTheme();
  const { token, isOfflineMode } = useAuth();
  const navigation = useNavigation();

  const [prefs, setPrefs] = useState<LocalPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasSession = !!token && !token.startsWith('offline_');

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // CARGA INICIAL
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const loadPrefs = useCallback(async () => {
    if (!hasSession) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const data: NotifPref[] = await getNotificationPreferences();
      const map = { ...DEFAULT_PREFS };
      for (const p of data) {
        if (p.categoria in map) {
          map[p.categoria as NotifCategoria] = { push: p.push, in_app: p.in_app };
        }
      }
      setPrefs(map);
    } catch {
      setError('No se pudieron cargar las preferencias. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }, [hasSession]);

  useEffect(() => { loadPrefs(); }, [loadPrefs]);

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // GUARDADO
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const savePrefs = async () => {
    if (!hasSession) {
      Alert.alert('Sin conexion', 'Necesitas conexion para guardar preferencias.');
      return;
    }
    setSaving(true);
    try {
      const items = Object.entries(prefs).map(([cat, val]) => ({
        categoria: cat as NotifCategoria,
        push: val.push,
        in_app: val.in_app,
      }));
      await updateNotificationPreferences(items);
      setDirty(false);
      Alert.alert('Guardado', 'Tus preferencias fueron actualizadas.');
    } catch {
      Alert.alert('Error', 'No se pudieron guardar las preferencias. Intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // TOGGLES
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const togglePush = (cat: NotifCategoria) => {
    setPrefs((prev) => ({
      ...prev,
      [cat]: { ...prev[cat], push: !prev[cat].push },
    }));
    setDirty(true);
  };

  const toggleInApp = (cat: NotifCategoria) => {
    setPrefs((prev) => ({
      ...prev,
      [cat]: { ...prev[cat], in_app: !prev[cat].in_app },
    }));
    setDirty(true);
  };

  const toggleAllPush = (value: boolean) => {
    setPrefs((prev) => {
      const next = { ...prev };
      for (const cat of Object.keys(next) as NotifCategoria[]) {
        next[cat] = { ...next[cat], push: value };
      }
      return next;
    });
    setDirty(true);
  };

  const toggleAllInApp = (value: boolean) => {
    setPrefs((prev) => {
      const next = { ...prev };
      for (const cat of Object.keys(next) as NotifCategoria[]) {
        next[cat] = { ...next[cat], in_app: value };
      }
      return next;
    });
    setDirty(true);
  };

  const allPushOn = Object.values(prefs).every((p) => p.push);
  const allInAppOn = Object.values(prefs).every((p) => p.in_app);

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // RENDER
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const styles = makeStyles(colors);

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando preferencias...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <CurvedHeroHeader
        icon={<Ionicons name="notifications-outline" size={30} color="#FFFFFF" />}
        title="Preferencias de Notificaciones"
        subtitle={dirty ? 'Tienes cambios pendientes por guardar' : 'Configura alertas push e in-app'}
        backgroundColor={colors.headerBackground}
        waveBackgroundColor={colors.background}
        subtitleStyle={styles.headerSubtitleCustom}
      >
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          {saving ? (
            <View style={styles.headerButton}>
              <ActivityIndicator size="small" color="#FFFFFF" />
            </View>
          ) : (
            <TouchableOpacity
              onPress={savePrefs}
              disabled={!dirty}
              style={[styles.headerButton, !dirty && styles.headerButtonDisabled]}
            >
              <Ionicons name="save-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </CurvedHeroHeader>

      {/* Offline banner */}
      {isOfflineMode && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color="#fff" />
          <Text style={styles.offlineBannerText}>Modo offline - Las preferencias se guardan al reconectar</Text>
        </View>
      )}

      {/* Error */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadPrefs}>
            <Text style={[styles.retryText, { color: colors.primary }]}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* DescripciÃ³n */}
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          Controla que notificaciones quieres recibir. Los cambios se guardan en el servidor.
        </Text>

        {/* Master toggles */}
        <View style={[styles.masterCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.masterTitle, { color: colors.textPrimary }]}>Control global</Text>
          <View style={styles.masterRow}>
            <View style={styles.masterLabel}>
              <Ionicons name="notifications-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.masterLabelText, { color: colors.textPrimary }]}>Push</Text>
            </View>
            <Switch
              value={allPushOn}
              onValueChange={toggleAllPush}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
          <View style={[styles.masterRow, { borderTopWidth: 0 }]}>
            <View style={styles.masterLabel}>
              <Ionicons name="phone-portrait-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.masterLabelText, { color: colors.textPrimary }]}>En la app</Text>
            </View>
            <Switch
              value={allInAppOn}
              onValueChange={toggleAllInApp}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Categorías */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Por categoría</Text>
        {CATEGORIAS_INFO.map((info) => {
          const { categoria, label, description, icon } = info;
          const p = prefs[categoria];
          return (
            <View
              key={categoria}
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              {/* Cabecera de la categoria */}
              <View style={styles.cardHeader}>
                <View style={[styles.iconBadge, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name={icon} size={20} color={colors.primary} />
                </View>
                <View style={styles.cardHeaderText}>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{label}</Text>
                  <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>{description}</Text>
                </View>
              </View>

              {/* Fila push */}
              <View style={[styles.toggleRow, { borderTopColor: colors.border }]}>
                <View style={styles.toggleLabel}>
                  <Ionicons name="notifications-outline" size={16} color={colors.textSecondary} />
                  <Text style={[styles.toggleText, { color: colors.textPrimary }]}>Notificaciones push</Text>
                </View>
                <Switch
                  value={p.push}
                  onValueChange={() => togglePush(categoria)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#fff"
                />
              </View>

              {/* Fila in_app */}
              <View style={[styles.toggleRow, { borderTopColor: colors.border }]}>
                <View style={styles.toggleLabel}>
                  <Ionicons name="phone-portrait-outline" size={16} color={colors.textSecondary} />
                  <Text style={[styles.toggleText, { color: colors.textPrimary }]}>En la app</Text>
                </View>
                <Switch
                  value={p.in_app}
                  onValueChange={() => toggleInApp(categoria)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#fff"
                />
              </View>
            </View>
          );
        })}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// ESTILOS
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { color: '#888', fontSize: 14 },
    headerSubtitleCustom: { marginTop: 4, color: 'rgba(255,255,255,0.84)' },
    headerActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
    headerButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.14)',
    },
    headerButtonDisabled: { opacity: 0.35 },

    offlineBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: '#F59E0B',
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    offlineBannerText: { color: '#fff', fontSize: 12, flex: 1 },

    errorBanner: {
      backgroundColor: '#FEE2E2',
      padding: 12,
      margin: 16,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    errorText: { color: '#B91C1C', fontSize: 13, flex: 1 },
    retryText: { fontSize: 13, fontWeight: '600', marginLeft: 8 },

    scroll: { padding: 16, gap: 12, paddingTop: 8 },
    description: { fontSize: 13, lineHeight: 20, marginBottom: 4 },

    masterCard: {
      borderRadius: 16,
      borderWidth: 1,
      overflow: 'hidden',
      marginBottom: 8,
    },
    masterTitle: { fontSize: 13, fontWeight: '600', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, opacity: 0.7 },
    masterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    masterLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    masterLabelText: { fontSize: 15 },

    sectionTitle: { fontSize: 13, fontWeight: '600', opacity: 0.7, marginTop: 8, marginBottom: 4 },

    card: {
      borderRadius: 16,
      borderWidth: 1,
      overflow: 'hidden',
      marginBottom: 8,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: 14,
      gap: 12,
    },
    iconBadge: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardHeaderText: { flex: 1 },
    cardTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
    cardDesc: { fontSize: 12, lineHeight: 18 },

    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    toggleLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    toggleText: { fontSize: 14 },
  });
}


