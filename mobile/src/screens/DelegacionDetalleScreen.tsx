/**
 * DelegacionDetalleScreen
 *
 * Pantalla de detalle de una delegación.
 * Consume `GET /api/cartilla/:id`.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiGet } from '../services/api';
import { formatDistance } from '../services/locationService';
import { useTheme } from '../theme';
import CurvedHeroHeader from '../components/CurvedHeroHeader';

interface DelegacionDetalleScreenProps {
  route: {
    params: {
      entidadId: string;
    };
  };
  navigation: any;
}

interface DelegacionDetalle {
  caentid: string;
  caentapeno: string;
  carubdescr?: string;
  caendirecc?: string;
  nulocalnombre?: string;
  nuprovnombre?: string;
  caentelefo?: string;
  caentweb?: string;
  lat?: string;
  lng?: string;
  distancia_km?: string;
}

const THEME = {
  primary: '#34C759',
  danger: '#FF3B30',
};

export default function DelegacionDetalleScreen({ route, navigation }: DelegacionDetalleScreenProps) {
  const { colors } = useTheme();
  const { entidadId } = route.params;
  const [delegacion, setDelegacion] = useState<DelegacionDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const goToCartillaHub = () => {
    navigation.navigate('CartillaHub');
  };

  useEffect(() => {
    loadDelegacionDetalle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entidadId]);

  const loadDelegacionDetalle = async () => {
    try {
      setLoading(true);
      setError(null);

      const cleanId = entidadId.trim();

      const response = await apiGet(`/api/cartilla/${cleanId}`);
      const data = response.data || response;

      if (data && data.caentid) {
        setDelegacion(data as DelegacionDetalle);
      } else {
        setError('No se encontró la información de la delegación');
      }
    } catch (err) {
      setError('Error al cargar la información');
    } finally {
      setLoading(false);
    }
  };

  const handleCall = (telefono: string | undefined) => {
    if (!telefono) {
      Alert.alert('Sin teléfono', 'Esta delegación no tiene un número de contacto registrado');
      return;
    }

    const phoneNumber = telefono.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleOpenWeb = (url: string | undefined) => {
    if (!url) {
      Alert.alert('Sin página web', 'Esta delegación no tiene una página web registrada');
      return;
    }

    let fullUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      fullUrl = `https://${url}`;
    }

    Linking.openURL(fullUrl).catch(() => {
      Alert.alert('Error', 'No se pudo abrir la página web');
    });
  };

  const handleNavigate = () => {
    if (!delegacion?.lat || !delegacion?.lng) {
      Alert.alert('Sin ubicación', 'Esta delegación no tiene coordenadas registradas');
      return;
    }

    const url =
      Platform.OS === 'ios'
        ? `maps:0,0?q=${delegacion.lat},${delegacion.lng}`
        : `geo:0,0?q=${delegacion.lat},${delegacion.lng}`;

    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'No se pudo abrir la aplicación de mapas');
    });
  };

  const handleShare = () => {
    if (!delegacion) return;

    const message = `${delegacion.caentapeno}\n${delegacion.caendirecc || ''}\n${
      delegacion.caentelefo ? `Tel: ${delegacion.caentelefo}` : ''
    }`;

    Alert.alert('Compartir', message);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !delegacion) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={THEME.danger} />
          <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>Error</Text>
          <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>{error || 'Delegación no encontrada'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadDelegacionDetalle}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.backButton, { borderColor: colors.border }]} onPress={goToCartillaHub}>
            <Text style={[styles.backButtonText, { color: colors.textPrimary }]}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.headerBackground }]} edges={['top']}>
      <CurvedHeroHeader
        icon={<Ionicons name="business-outline" size={30} color="#fff" />}
        title="Detalle de Delegación"
        subtitle={delegacion.caentapeno}
        backgroundColor={colors.headerBackground}
        waveBackgroundColor={colors.background}
      >
        <View style={styles.heroActions}>
          <TouchableOpacity onPress={goToCartillaHub} style={styles.heroBackButton}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
            <Text style={styles.heroBackText}>Volver a Cartilla</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} style={styles.heroActionButton}>
            <Ionicons name="share-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </CurvedHeroHeader>

      <ScrollView style={[styles.content, { backgroundColor: colors.background }]}>
        {/* Nombre */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.nombreHeader}>
            <Ionicons name="business" size={28} color={THEME.primary} />
            <Text style={[styles.nombreDelegacion, { color: colors.textPrimary }]}>{delegacion.caentapeno}</Text>
          </View>
          {delegacion.carubdescr ? (
            <Text style={styles.rubroText}>{delegacion.carubdescr}</Text>
          ) : null}
        </View>

        {/* Dirección */}
        {delegacion.caendirecc ? (
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="location-outline" size={20} color={THEME.primary} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Dirección</Text>
            </View>
            <Text style={[styles.direccionText, { color: colors.textPrimary }]}>{delegacion.caendirecc}</Text>
            {delegacion.nulocalnombre ? (
              <Text style={[styles.localidadText, { color: colors.textSecondary }]}>{delegacion.nulocalnombre}</Text>
            ) : null}
            {delegacion.nuprovnombre ? (
              <Text style={[styles.localidadText, { color: colors.textSecondary }]}>{delegacion.nuprovnombre}</Text>
            ) : null}
            {delegacion.distancia_km ? (
              <Text style={styles.distanciaText}>
                <Ionicons name="navigate-outline" size={14} color={THEME.primary} />{' '}
                {formatDistance(parseFloat(delegacion.distancia_km))}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* Acciones */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Acciones</Text>

          <TouchableOpacity
            style={[styles.actionButton, styles.actionPrimary]}
            onPress={() => handleCall(delegacion.caentelefo)}
          >
            <Ionicons name="call-outline" size={20} color="white" />
            <Text style={styles.actionTextPrimary}>Llamar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.actionSecondary, { backgroundColor: colors.surface }]}
            onPress={() => handleNavigate()}
          >
            <Ionicons name="navigate-outline" size={20} color={THEME.primary} />
            <Text style={styles.actionTextSecondary}>Cómo llegar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.actionSecondary, { backgroundColor: colors.surface }]}
            onPress={() => handleOpenWeb(delegacion.caentweb)}
          >
            <Ionicons name="globe-outline" size={20} color={THEME.primary} />
            <Text style={styles.actionTextSecondary}>Ver web</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  heroBackButton: {
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 14,
    flexDirection: 'row',
    gap: 6,
  },
  heroBackText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  heroActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  nombreHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  nombreDelegacion: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginLeft: 10,
    lineHeight: 24,
  },
  rubroText: {
    marginTop: 8,
    color: THEME.primary,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginLeft: 8,
  },
  direccionText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  localidadText: {
    marginTop: 4,
    fontSize: 14,
    color: '#666',
  },
  distanciaText: {
    marginTop: 8,
    fontSize: 14,
    color: THEME.primary,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 12,
  },
  actionPrimary: {
    backgroundColor: THEME.primary,
  },
  actionSecondary: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: THEME.primary,
  },
  actionTextPrimary: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  actionTextSecondary: {
    color: THEME.primary,
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  backButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
});


