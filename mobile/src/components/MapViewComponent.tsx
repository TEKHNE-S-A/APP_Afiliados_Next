/**
 * Componente MapView Reutilizable
 * 
 * Wrapper de react-native-maps para mostrar mapas con markers personalizables.
 * Soporta ubicación actual del usuario y markers de entidades de cartilla.
 */

import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, Platform, Text } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT, Region, Callout } from 'react-native-maps';

// En Android usa Google Maps (requiere API key en AndroidManifest).
// En iOS usa Apple Maps por defecto para evitar requerir API key.
const MAP_PROVIDER = Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;
import { LocationCoords } from '../services/locationService';
import { useTheme } from '../theme';

export interface MapMarker {
  id: string;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  title: string;
  description?: string;
  color?: string;
}

interface MapViewComponentProps {
  /** Ubicación actual del usuario (muestra marker azul) */
  userLocation?: LocationCoords | null;
  
  /** Array de markers a mostrar en el mapa */
  markers?: MapMarker[];
  
  /** Región inicial del mapa (si no se proporciona, usa userLocation o default) */
  initialRegion?: Region;
  
  /** Callback cuando se presiona un marker */
  onMarkerPress?: (marker: MapMarker) => void;
  
  /** Callback cuando cambia la región visible */
  onRegionChange?: (region: Region) => void;
  
  /** Mostrar botón de ubicación actual */
  showsUserLocation?: boolean;
  
  /** Seguir ubicación del usuario */
  followsUserLocation?: boolean;
  
  /** Altura del mapa (default: 100%) */
  height?: number | string;
  
  /** Mostrar loading mientras carga */
  loading?: boolean;

  /** Coordenada a la que animar el mapa (centra y hace zoom al seleccionar un elemento) */
  focusCoordinate?: { latitude: number; longitude: number } | null;

  /** ID del marker seleccionado (se resalta con color diferente) */
  selectedMarkerId?: string | null;
}

const DEFAULT_REGION: Region = {
  latitude: -28.4696, // San Fernando del Valle de Catamarca
  longitude: -65.7795,
  latitudeDelta: 0.05, // zoom ~5km de radio
  longitudeDelta: 0.05,
};

export default function MapViewComponent({
  userLocation,
  markers = [],
  initialRegion,
  onMarkerPress,
  onRegionChange,
  showsUserLocation = true,
  followsUserLocation = false,
  height = '100%',
  loading = false,
  focusCoordinate = null,
  selectedMarkerId = null,
}: MapViewComponentProps) {
  const mapRef = useRef<MapView>(null);
  const { colors } = useTheme();

  // Calcular región inicial
  const getInitialRegion = (): Region => {
    if (initialRegion) {
      return initialRegion;
    }
    
    if (userLocation) {
      return {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }
    
    return DEFAULT_REGION;
  };

  // Centrar mapa en ubicación del usuario cuando cambia
  useEffect(() => {
    if (followsUserLocation && userLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        },
        500
      );
    }
  }, [userLocation, followsUserLocation]);

  // Animar al elemento seleccionado cuando cambia focusCoordinate
  useEffect(() => {
    if (focusCoordinate && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: focusCoordinate.latitude,
          longitude: focusCoordinate.longitude,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        },
        600
      );
    }
  }, [focusCoordinate]);

  // Ajustar mapa para mostrar todos los markers (solo cuando NO hay selección activa)
  useEffect(() => {
    if (markers.length > 0 && mapRef.current && !followsUserLocation && !focusCoordinate) {
      // Pequeño delay para asegurar que el mapa esté listo
      setTimeout(() => {
        const coordinates = [
          ...(userLocation
            ? [{ latitude: userLocation.latitude, longitude: userLocation.longitude }]
            : []),
          ...markers.map((m) => m.coordinate),
        ];

        mapRef.current?.fitToCoordinates(
          coordinates,
          {
            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
            animated: true,
          }
        );
      }, 500);
    }
  }, [markers, userLocation, followsUserLocation, focusCoordinate]);

  console.log('🗺️ MapViewComponent render - loading:', loading, 'userLocation:', userLocation, 'markers:', markers.length);

  if (loading) {
    console.log('🔄 MapViewComponent: Mostrando spinner de loading');
    return (
      <View style={[styles.container, { height, backgroundColor: colors.surface }]}>
        <View style={[styles.loadingContainer, { backgroundColor: colors.surface }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  console.log('🗺️ MapViewComponent: Renderizando mapa con región:', getInitialRegion());

  // TEMPORAL: Mostrar info de markers si el mapa no renderiza
  if (markers.length > 0) {
    console.log('📍 Primeros 3 markers:', markers.slice(0, 3).map(m => ({
      id: m.id,
      lat: m.coordinate.latitude,
      lng: m.coordinate.longitude,
      title: m.title
    })));
  }

  return (
    <View style={[styles.container, { height, backgroundColor: colors.surface }]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={MAP_PROVIDER}
        initialRegion={getInitialRegion()}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        showsScale={true}
        onRegionChangeComplete={onRegionChange}
        loadingEnabled={false}
        onMapReady={() => console.log('✅ MapView: Mapa listo')}
        onLayout={() => console.log('📐 MapView: Layout completado')}
      >
        {/* Marker de ubicación del usuario (personalizado) */}
        {userLocation && (
          <Marker
            coordinate={{
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            }}
            title="Mi ubicación"
            description="Estás aquí"
            pinColor="#007AFF"
          />
        )}

        {/* Markers de entidades */}
        {markers.map((marker) => {
          const isSelected = marker.id === selectedMarkerId;
          return (
            <Marker
              key={marker.id}
              coordinate={marker.coordinate}
              title={marker.title}
              description={marker.description}
              pinColor={isSelected ? '#FF9500' : (marker.color || '#FF3B30')}
              zIndex={isSelected ? 999 : 1}
              onPress={() => onMarkerPress?.(marker)}
            >
              <Callout>
                <View style={styles.callout}>
                  <View style={styles.calloutTitle}>
                    {/* Aquí se puede personalizar el callout */}
                  </View>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  callout: {
    padding: 8,
    maxWidth: 200,
  },
  calloutTitle: {
    fontWeight: '600',
    fontSize: 14,
  },
});
