/**
 * FarmaciaDetalleScreen
 * 
 * Pantalla de detalle de una farmacia
 * Muestra información completa: nombre, dirección, teléfono, etc.
 * (Sin rubro, especialidad ni matrícula)
 */

import React, { useState, useEffect } from 'react';
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

interface FarmaciaDetalleScreenProps {
  route: {
    params: {
      entidadId: string;
    };
  };
  navigation: any;
}

interface FarmaciaDetalle {
  caentid: string;
  caentapeno: string;
  caendirecc?: string;
  nulocalnombre?: string;
  nuprovnombre?: string;
  caentelefo?: string;
  caentweb?: string;
  lat?: string;
  lng?: string;
  distancia_km?: string;
}

export default function FarmaciaDetalleScreen({ route, navigation }: FarmaciaDetalleScreenProps) {
  const { colors } = useTheme();
  const { entidadId } = route.params;
  const [farmacia, setFarmacia] = useState<FarmaciaDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const goToCartillaHub = () => {
    navigation.navigate('CartillaHub');
  };

  useEffect(() => {
    loadFarmaciaDetalle();
  }, [entidadId]);

  const loadFarmaciaDetalle = async () => {
    try {
      setLoading(true);
      setError(null);

      // Limpiar espacios del ID
      const cleanId = entidadId.trim();
      console.log('💊 Cargando detalle de farmacia:', cleanId);

      const response = await apiGet(`/api/cartilla/${cleanId}`);
      console.log('📦 Respuesta recibida:', response);
      
      // La respuesta puede venir directamente o en response.data
      const data = response.data || response;
      
      if (data && data.caentid) {
        setFarmacia(data as FarmaciaDetalle);
        console.log('✅ Farmacia cargada:', data.caentapeno);
      } else {
        console.error('❌ Respuesta sin datos válidos:', response);
        setError('No se encontró la información de la farmacia');
      }
    } catch (err) {
      console.error('❌ Error al cargar detalle:', err);
      setError('Error al cargar la información');
    } finally {
      setLoading(false);
    }
  };

  const handleCall = (telefono: string) => {
    if (!telefono) {
      Alert.alert('Sin teléfono', 'Esta farmacia no tiene un número de contacto registrado');
      return;
    }

    const phoneNumber = telefono.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleOpenWeb = (url: string) => {
    if (!url) {
      Alert.alert('Sin página web', 'Esta farmacia no tiene una página web registrada');
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
    if (!farmacia?.lat || !farmacia?.lng) {
      Alert.alert('Sin ubicación', 'Esta farmacia no tiene coordenadas registradas');
      return;
    }

    const url = Platform.OS === 'ios'
      ? `maps:0,0?q=${farmacia.lat},${farmacia.lng}`
      : `geo:0,0?q=${farmacia.lat},${farmacia.lng}`;

    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'No se pudo abrir la aplicación de mapas');
    });
  };

  const handleShare = () => {
    if (!farmacia) return;

    const message = `${farmacia.caentapeno}\n${farmacia.caendirecc || ''}\n${
      farmacia.caentelefo ? `Tel: ${farmacia.caentelefo}` : ''
    }`;

    // Aquí se puede implementar Share API de React Native
    Alert.alert('Compartir', message);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF9500" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !farmacia) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
          <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>Error</Text>
          <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>{error || 'Farmacia no encontrada'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadFarmaciaDetalle}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={goToCartillaHub}>
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.headerBackground }]} edges={['top']}>
      <CurvedHeroHeader
        icon={<Ionicons name="medkit-outline" size={30} color="#fff" />}
        title="Detalle de Farmacia"
        subtitle={farmacia.caentapeno}
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
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.nombreHeader}>
            <Ionicons name="medkit" size={28} color="#FF9500" />
            <Text style={[styles.nombreFarmacia, { color: colors.textPrimary }]}>{farmacia.caentapeno}</Text>
          </View>
        </View>

        {/* Dirección */}
        {farmacia.caendirecc && (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="location-outline" size={20} color="#FF9500" />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Dirección</Text>
            </View>
            <Text style={[styles.direccionText, { color: colors.textPrimary }]}>{farmacia.caendirecc}</Text>
            {farmacia.nulocalnombre && (
              <Text style={[styles.localidadText, { color: colors.textSecondary }]}>{farmacia.nulocalnombre}</Text>
            )}
            {farmacia.nuprovnombre && (
              <Text style={[styles.localidadText, { color: colors.textSecondary }]}>{farmacia.nuprovnombre}</Text>
            )}
            {farmacia.distancia_km && (
              <Text style={styles.distanciaText}>
                <Ionicons name="navigate-outline" size={14} color="#FF9500" />
                {' '}{formatDistance(parseFloat(farmacia.distancia_km))}
              </Text>
            )}
          </View>
        )}

        {/* Acciones */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Acciones</Text>
          
          {farmacia.caentelefo && (
            <TouchableOpacity
              style={[styles.actionButton, { borderBottomColor: colors.border }]}
              onPress={() => handleCall(farmacia.caentelefo!)}
            >
              <Ionicons name="call-outline" size={24} color="#34C759" />
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>Llamar</Text>
                <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>{farmacia.caentelefo}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}

          {farmacia.caentweb && (
            <TouchableOpacity
              style={[styles.actionButton, { borderBottomColor: colors.border }]}
              onPress={() => handleOpenWeb(farmacia.caentweb!)}
            >
              <Ionicons name="globe-outline" size={24} color="#007AFF" />
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>Visitar sitio web</Text>
                <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>{farmacia.caentweb}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}

          {farmacia.lat && farmacia.lng && (
            <TouchableOpacity
              style={[styles.actionButton, { borderBottomColor: colors.border }]}
              onPress={handleNavigate}
            >
              <Ionicons name="navigate-outline" size={24} color="#FF9500" />
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>Cómo llegar</Text>
                <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>Abrir en Mapas</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
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
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#FF9500',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backButtonText: {
    color: '#FF9500',
    fontSize: 16,
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFF',
    padding: 16,
    marginBottom: 12,
  },
  nombreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  nombreFarmacia: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginLeft: 8,
  },
  direccionText: {
    fontSize: 16,
    color: '#000',
    marginBottom: 4,
  },
  localidadText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  distanciaText: {
    fontSize: 14,
    color: '#FF9500',
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  actionContent: {
    flex: 1,
    marginLeft: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
});


