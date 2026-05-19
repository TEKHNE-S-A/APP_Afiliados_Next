/**
 * Servicio de Ubicación
 * 
 * Maneja permisos y obtención de ubicación actual del dispositivo.
 * Usa expo-location para geolocalización.
 */

import * as Location from 'expo-location';
import { USE_MOCK_LOCATION, MOCK_LOCATION } from '../config';

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export interface LocationResult {
  coords: LocationCoords;
  accuracy: number | null;
  timestamp: number;
}

/**
 * Solicita permisos de ubicación al usuario
 * @returns true si se otorgaron permisos, false si fueron denegados
 */
export async function requestLocationPermission(): Promise<boolean> {
  try {
    console.log('📍 Solicitando permisos de ubicación...');
    
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status === 'granted') {
      console.log('✅ Permisos de ubicación otorgados');
      return true;
    }
    
    console.warn('❌ Permisos de ubicación denegados');
    return false;
  } catch (error) {
    console.error('❌ Error al solicitar permisos de ubicación:', error);
    return false;
  }
}

/**
 * Verifica si ya se tienen permisos de ubicación
 * @returns true si ya se tienen permisos, false si no
 */
export async function hasLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('❌ Error al verificar permisos de ubicación:', error);
    return false;
  }
}

/**
 * Obtiene la ubicación actual del dispositivo
 * @param options Opciones de precisión y timeout
 * @returns Ubicación actual o null si falla
 */
export async function getCurrentLocation(
  options?: Location.LocationOptions
): Promise<LocationResult | null> {
  try {
    // 🧪 MODO TESTING: Usar ubicación mock de Catamarca
    if (USE_MOCK_LOCATION) {
      console.log('🧪 Usando ubicación MOCK de Catamarca, Argentina');
      console.log('✅ Ubicación mock:', {
        lat: MOCK_LOCATION.latitude.toFixed(6),
        lng: MOCK_LOCATION.longitude.toFixed(6),
        accuracy: MOCK_LOCATION.accuracy,
      });
      
      return {
        coords: {
          latitude: MOCK_LOCATION.latitude,
          longitude: MOCK_LOCATION.longitude,
        },
        accuracy: MOCK_LOCATION.accuracy,
        timestamp: Date.now(),
      };
    }
    
    // Verificar permisos primero
    const hasPermission = await hasLocationPermission();
    
    if (!hasPermission) {
      const granted = await requestLocationPermission();
      if (!granted) {
        console.warn('⚠️ No se puede obtener ubicación sin permisos');
        return null;
      }
    }
    
    console.log('📍 Obteniendo ubicación actual...');
    
    // Configuración por defecto: alta precisión
    const defaultOptions: Location.LocationOptions = {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000, // 5 segundos
      distanceInterval: 0,
    };
    
    const location = await Location.getCurrentPositionAsync(
      options || defaultOptions
    );
    
    console.log('✅ Ubicación obtenida:', {
      lat: location.coords.latitude.toFixed(6),
      lng: location.coords.longitude.toFixed(6),
      accuracy: location.coords.accuracy,
    });
    
    return {
      coords: {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      },
      accuracy: location.coords.accuracy,
      timestamp: location.timestamp,
    };
  } catch (error) {
    console.error('❌ Error al obtener ubicación:', error);
    return null;
  }
}

/**
 * Obtiene la última ubicación conocida (más rápido pero puede ser antigua)
 * @returns Última ubicación conocida o null
 */
export async function getLastKnownLocation(): Promise<LocationResult | null> {
  try {
    const hasPermission = await hasLocationPermission();
    if (!hasPermission) {
      console.warn('⚠️ Sin permisos para obtener última ubicación');
      return null;
    }
    
    const location = await Location.getLastKnownPositionAsync();
    
    if (!location) {
      console.log('ℹ️ No hay última ubicación conocida');
      return null;
    }
    
    return {
      coords: {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      },
      accuracy: location.coords.accuracy,
      timestamp: location.timestamp,
    };
  } catch (error) {
    console.error('❌ Error al obtener última ubicación:', error);
    return null;
  }
}

/**
 * Verifica si los servicios de ubicación están habilitados en el dispositivo
 * @returns true si están habilitados, false si no
 */
export async function isLocationEnabled(): Promise<boolean> {
  try {
    return await Location.hasServicesEnabledAsync();
  } catch (error) {
    console.error('❌ Error al verificar servicios de ubicación:', error);
    return false;
  }
}

/**
 * Calcula la distancia entre dos coordenadas usando la fórmula de Haversine
 * @param from Coordenadas de origen
 * @param to Coordenadas de destino
 * @returns Distancia en kilómetros
 */
export function calculateDistance(
  from: LocationCoords,
  to: LocationCoords
): number {
  const R = 6371; // Radio de la Tierra en km
  
  const dLat = toRadians(to.latitude - from.latitude);
  const dLng = toRadians(to.longitude - from.longitude);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

/**
 * Convierte grados a radianes
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Formatea la distancia en km con 2 decimales
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(2)} km`;
}
