/**
 * DelegacionesScreen
 *
 * Pantalla específica para delegaciones que muestra:
 * - Mapa con ubicación actual del usuario
 * - Markers de delegaciones cercanas
 * - Lista scrollable debajo del mapa
 * - Filtros de búsqueda (texto, radio)
 *
 * Conecta con API /api/cartilla?rubroId=000000009 (DELEGACIONES)
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapViewComponent, { MapMarker } from '../components/MapViewComponent';
import {
  getCurrentLocation,
  formatDistance,
  LocationCoords,
} from '../services/locationService';
import { apiGet } from '../services/api';
import { getCartillaSugerencias, CartillaSugerencia } from '../services/searchService';
import { useTheme } from '../theme';
import CurvedHeroHeader from '../components/CurvedHeroHeader';
import { USE_CARTILLA_NO_GPS_FALLBACK } from '../config';

interface Entidad {
  caentid: string;
  caentapeno: string;
  carubdescr?: string;
  caespecial?: string;
  caendirecc?: string;
  nulocalnombre?: string;
  lat?: string;
  lng?: string;
  distancia_km?: string;
}

interface DelegacionesScreenProps {
  navigation: any;
}

export default function DelegacionesScreen({ navigation }: DelegacionesScreenProps) {
  const { colors } = useTheme();

  // Estado de ubicación
  const [userLocation, setUserLocation] = useState<LocationCoords | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Estado de datos
  const [entidades, setEntidades] = useState<Entidad[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [searchText, setSearchText] = useState('');
  const [radioKm, setRadioKm] = useState(10);
  const [ignorarRadio, setIgnorarRadio] = useState(false); // true = búsqueda por texto sin filtro de cercanía
  const [showFilters, setShowFilters] = useState(false);

  // rubroId fijo para delegaciones
  const RUBRO_ID_DELEGACIONES = '000000009';

  // Sugerencias autocomplete
  const [sugerencias, setSugerencias] = useState<CartillaSugerencia[]>([]);
  const [showSugerencias, setShowSugerencias] = useState(false);
  const sugerenciasTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchVersionRef = useRef(0);
  const skipEffectOnceRef = useRef(false);

  // Paginación
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Selección individual en mapa
  const [selectedEntidad, setSelectedEntidad] = useState<Entidad | null>(null);
  const [focusCoordinate, setFocusCoordinate] = useState<{ latitude: number; longitude: number } | null>(null);
  const listRef = useRef<FlatList<Entidad>>(null);

  useEffect(() => {
    initializeLocation();
  }, []);

  useEffect(() => {
    if (skipEffectOnceRef.current) {
      skipEffectOnceRef.current = false;
      return;
    }
    loadEntidades(true, {
      ignoreRadius: USE_CARTILLA_NO_GPS_FALLBACK && !userLocation ? true : undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation, searchText, radioKm, ignorarRadio]);

  // Autocomplete: debounce 350ms sobre searchText
  useEffect(() => {
    if (sugerenciasTimerRef.current) clearTimeout(sugerenciasTimerRef.current);
    if (searchText.length < 2) {
      setSugerencias([]);
      setShowSugerencias(false);
      setIgnorarRadio(false);
      return;
    }
    sugerenciasTimerRef.current = setTimeout(async () => {
      const results = await getCartillaSugerencias(searchText, { rubroId: RUBRO_ID_DELEGACIONES, limit: 5 });
      setSugerencias(results);
      setShowSugerencias(results.length > 0);
    }, 350);
    return () => { if (sugerenciasTimerRef.current) clearTimeout(sugerenciasTimerRef.current); };
  }, [searchText]);

  const initializeLocation = async () => {
    try {
      setLocationLoading(true);
      setLocationError(null);

      const location = await getCurrentLocation();

      if (location) {
        setUserLocation(location.coords);
        setLocationLoading(false);
      } else {
        setLocationError('No se pudo obtener la ubicación');
        Alert.alert(
          'Ubicación no disponible',
          'No se pudo acceder a tu ubicación. Verifica permisos y servicios de ubicación.',
          [{ text: 'OK' }]
        );
        setLocationLoading(false);
      }
    } catch (err) {
      setLocationError('Error al obtener ubicación');
      setLocationLoading(false);
    }
  };

  const loadEntidades = async (reset: boolean = false, opts?: { q?: string; ignoreRadius?: boolean }) => {
    const effectiveIgnorarRadio = opts?.ignoreRadius ?? ignorarRadio;
    const effectiveSearchText = opts?.q ?? searchText;
    const shouldIgnoreRadius = effectiveIgnorarRadio || (USE_CARTILLA_NO_GPS_FALLBACK && !userLocation);
    const shouldFallbackToGlobal =
      reset &&
      currentPageSafe(reset, page) === 1 &&
      !shouldIgnoreRadius &&
      !effectiveSearchText.trim();
    if (!userLocation && !effectiveIgnorarRadio && USE_CARTILLA_NO_GPS_FALLBACK) {
      console.log('🏢 Sin ubicación, buscando delegaciones sin filtro de cercanía');
    }
    if (!userLocation && !shouldIgnoreRadius) return;
    if (loading && !reset) return;
    const myVersion = ++searchVersionRef.current;

    try {
      if (reset) {
        setPage(1);
        setEntidades([]);
        setHasMore(true);
      }

      setLoading(true);
      setError(null);

      const currentPage = reset ? 1 : page;

      const buildParams = (ignoreRadius: boolean) => new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(!ignoreRadius && userLocation ? {
          lat: userLocation.latitude.toString(),
          lng: userLocation.longitude.toString(),
          radioKm: radioKm.toString(),
          orderBy: 'distancia',
        } : {}),
        rubroId: RUBRO_ID_DELEGACIONES,
        ...(effectiveSearchText && { q: effectiveSearchText }),
      });

      const params = buildParams(shouldIgnoreRadius);

      let response = await apiGet(`/api/cartilla?${params.toString()}`);
      if (searchVersionRef.current !== myVersion) return;

      if (response.data) {
        let newEntidades = response.data as Entidad[];

        if (shouldFallbackToGlobal && newEntidades.length === 0) {
          console.log('🏢 Sin resultados cercanos al ingresar, reintentando búsqueda general...');
          skipEffectOnceRef.current = true;
          setIgnorarRadio(true);
          response = await apiGet(`/api/cartilla?${buildParams(true).toString()}`);
          if (searchVersionRef.current !== myVersion) return;
          newEntidades = response.data as Entidad[];
        }

        if (reset) {
          setEntidades(newEntidades);
        } else {
          setEntidades((prev) => [...prev, ...newEntidades]);
        }

        const totalPages = response.pagination?.totalPages || 1;
        setHasMore(currentPage < totalPages);
      }
    } catch (err: any) {
      if (searchVersionRef.current !== myVersion) return;
      setError(err.message || 'Error al cargar delegaciones');
    } finally {
      if (searchVersionRef.current === myVersion) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  function currentPageSafe(resetValue: boolean, currentPage: number) {
    return resetValue ? 1 : currentPage;
  }

  const handleRefresh = () => {
    setRefreshing(true);
    loadEntidades(true);
  };

  const handleReloadLocation = async () => {
    await initializeLocation();
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      setPage((prev) => prev + 1);
      loadEntidades(false);
    }
  };

  const selectEntidad = useCallback((entidad: Entidad) => {
    setSelectedEntidad(entidad);
    if (entidad.lat && entidad.lng) {
      setFocusCoordinate({
        latitude: parseFloat(entidad.lat),
        longitude: parseFloat(entidad.lng),
      });
    }
  }, []);

  const handleMarkerPress = (marker: MapMarker) => {
    const entidad = entidades.find((e) => e.caentid === marker.id);
    if (entidad) {
      selectEntidad(entidad);
      const index = entidades.findIndex((e) => e.caentid === entidad.caentid);
      if (index >= 0) {
        listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0 });
      }
    }
  };

  const mapMarkers = useMemo((): MapMarker[] => {
    return entidades
      .filter((e) => e.lat && e.lng)
      .map((e) => ({
        id: e.caentid,
        coordinate: {
          latitude: parseFloat(e.lat!),
          longitude: parseFloat(e.lng!),
        },
        title: e.caentapeno,
        description: `${e.carubdescr || ''} - ${e.distancia_km || ''} km`,
        color: '#34C759',
      }));
  }, [entidades]);

  const handleEntidadPress = (entidad: Entidad) => {
    if (selectedEntidad?.caentid === entidad.caentid) {
      navigation.navigate('DelegacionDetalle', { entidadId: entidad.caentid });
    } else {
      selectEntidad(entidad);
    }
  };

  const renderEntidad = ({ item }: { item: Entidad }) => {
    const isSelected = selectedEntidad?.caentid === item.caentid;
    return (
    <TouchableOpacity
      style={[
        styles.entidadCard,
        { backgroundColor: colors.surface, shadowColor: colors.shadow },
        isSelected && styles.entidadCardSelected,
      ]}
      activeOpacity={0.7}
      onPress={() => handleEntidadPress(item)}
    >
      <View style={styles.entidadHeader}>
        <Ionicons name="business-outline" size={20} color="#007AFF" />
        <Text style={[styles.entidadNombre, { color: colors.textPrimary }]} numberOfLines={2}>
          {item.caentapeno}
        </Text>
      </View>

      {item.carubdescr && <Text style={styles.entidadRubro}>{item.carubdescr}</Text>}

      {item.caendirecc && (
        <View style={styles.entidadRow}>
          <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.entidadDireccion, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.caendirecc}
            {item.nulocalnombre && ` - ${item.nulocalnombre}`}
          </Text>
        </View>
      )}

      {item.distancia_km && (
        <View style={styles.distanciaContainer}>
          <Ionicons name="navigate-outline" size={14} color="#007AFF" />
          <Text style={styles.distanciaText}>
            {formatDistance(parseFloat(item.distancia_km))}
          </Text>
        </View>
      )}
    </TouchableOpacity>
    );
  };

  if (locationError && !userLocation && !USE_CARTILLA_NO_GPS_FALLBACK) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="location-outline" size={64} color={colors.textMuted} />
          <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>Ubicación no disponible</Text>
          <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>{locationError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleReloadLocation}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <CurvedHeroHeader
        icon={<Ionicons name="business-outline" size={30} color="#FFFFFF" />}
        title="Delegaciones Cercanas"
        subtitle="Busqueda y ubicacion cercana"
        backgroundColor={colors.headerBackground}
        waveBackgroundColor={colors.background}
        subtitleStyle={styles.heroSubtitleCustom}
      >
        <View style={styles.heroActions}>
          <TouchableOpacity style={styles.heroActionButton} onPress={() => navigation.navigate('CartillaHub')}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.heroActionButton,
              showFilters && { backgroundColor: 'rgba(255,255,255,0.24)' },
            ]}
            onPress={() => setShowFilters((value) => !value)}
          >
            <Ionicons name="options-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </CurvedHeroHeader>

      <View style={[styles.controlsCard, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadow }]}> 
      {/* Barra de búsqueda */}
      <View style={[styles.searchWrapper]}>
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Buscar delegaciones..."
            placeholderTextColor={colors.inputPlaceholder}
            value={searchText}
            onChangeText={(text) => { setSearchText(text); if (text.length === 0) setShowSugerencias(false); }}
            onFocus={() => { if (sugerencias.length > 0) setShowSugerencias(true); }}
            onBlur={() => setTimeout(() => setShowSugerencias(false), 350)}
            returnKeyType="search"
            onSubmitEditing={() => setShowSugerencias(false)}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchText(''); setSugerencias([]); setShowSugerencias(false); }}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        {showSugerencias && sugerencias.length > 0 && (
          <View style={[styles.sugerenciasDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {sugerencias.map((s, idx) => (
              <TouchableOpacity
                key={`${s.caentid}-${idx}`}
                style={[styles.sugerenciaItem, idx < sugerencias.length - 1 && { borderBottomWidth: 1, borderBottomColor: '#E0E0E0' }]}
                onPress={() => { const n = s.caentapeno.trim(); setShowSugerencias(false); setSugerencias([]); setSearchText(n); setIgnorarRadio(true); skipEffectOnceRef.current = true; loadEntidades(true, { q: n, ignoreRadius: true }); }}
              >
                <Ionicons name="search-outline" size={14} color={colors.primary} style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sugerenciaNombre, { color: colors.textPrimary }]} numberOfLines={1}>{s.caentapeno}</Text>
                  {(s.carubdescr || s.caendirecc) && (
                    <Text style={[styles.sugerenciaSubtitulo, { color: colors.textSecondary }]} numberOfLines={1}>
                      {[s.carubdescr, s.caendirecc].filter(Boolean).join(' · ')}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.filterButton, { borderColor: colors.buttonPrimary, backgroundColor: colors.buttonPrimary }]}
          onPress={handleReloadLocation}
        >
          <Ionicons name="locate-outline" size={20} color={colors.buttonPrimaryText} />
          <Text style={[styles.filterButtonText, { color: colors.buttonPrimaryText }]}>Usar mi ubicación</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            { borderColor: colors.primary, backgroundColor: colors.surfaceVariant },
            showFilters && { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary },
          ]}
          onPress={() => setShowFilters((value) => !value)}
        >
          <Ionicons name="options-outline" size={20} color={showFilters ? colors.buttonPrimaryText : colors.primary} />
          <Text style={[styles.filterButtonText, { color: colors.primary }, showFilters && { color: colors.buttonPrimaryText }]}>
            Radio: {radioKm} km
          </Text>
          <Ionicons
            name={showFilters ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={showFilters ? colors.buttonPrimaryText : colors.primary}
            style={{ marginLeft: 2 }}
          />
        </TouchableOpacity>
      </View>

      {/* Filtros */}
      {showFilters && (
        <View style={[styles.filtersContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.filterLabel, { color: colors.textPrimary }]}>Radio de búsqueda</Text>
          <View style={styles.radioButtons}>
            {[5, 10, 20, 50].map((radio) => (
              <TouchableOpacity
                key={radio}
                style={[
                  styles.radioButton,
                  { backgroundColor: colors.surfaceVariant, borderColor: colors.border },
                  radioKm === radio && { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary },
                ]}
                onPress={() => { setIgnorarRadio(false); setRadioKm(radio); }}
              >
                <Text
                  style={[
                    styles.radioButtonText,
                    { color: colors.textSecondary },
                    radioKm === radio && { color: colors.buttonPrimaryText },
                  ]}
                >
                  {radio} km
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
      </View>

      {USE_CARTILLA_NO_GPS_FALLBACK && locationError && !userLocation && (
        <View style={styles.locationFallbackBanner}>
          <Ionicons name="alert-circle-outline" size={16} color="#9A3412" />
          <Text style={styles.locationFallbackText}>
            Ubicación no disponible. Mostrando resultados sin filtro de cercanía.
          </Text>
        </View>
      )}

      {/* Mapa */}
      <View style={[styles.mapContainer, { backgroundColor: colors.border }]}>
        {locationLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#34C759" />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Obteniendo ubicación...</Text>
          </View>
        ) : userLocation ? (
          <MapViewComponent
            userLocation={userLocation}
            markers={mapMarkers}
            onMarkerPress={handleMarkerPress}
            followsUserLocation={false}
            focusCoordinate={focusCoordinate}
            selectedMarkerId={selectedEntidad?.caentid ?? null}
          />
        ) : null}
      </View>

      {/* Tarjeta de delegación seleccionada */}
      {selectedEntidad && (
        <View style={[styles.selectedCard, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}>
          <View style={styles.selectedCardContent}>
            <View style={styles.selectedCardInfo}>
              <Text style={[styles.selectedCardNombre, { color: colors.textPrimary }]} numberOfLines={1}>
                {selectedEntidad.caentapeno}
              </Text>
              {selectedEntidad.caendirecc && (
                <Text style={[styles.selectedCardDireccion, { color: colors.textSecondary }]} numberOfLines={1}>
                  {selectedEntidad.caendirecc}
                  {selectedEntidad.nulocalnombre ? ` - ${selectedEntidad.nulocalnombre}` : ''}
                </Text>
              )}
              {selectedEntidad.distancia_km && (
                <Text style={styles.selectedCardDistancia}>
                  {formatDistance(parseFloat(selectedEntidad.distancia_km))}
                </Text>
              )}
            </View>
            <View style={styles.selectedCardActions}>
              <TouchableOpacity
                style={styles.selectedCardButton}
                onPress={() => navigation.navigate('DelegacionDetalle', { entidadId: selectedEntidad.caentid })}
              >
                <Text style={styles.selectedCardButtonText}>Ver detalle</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.selectedCardClose}
                onPress={() => { setSelectedEntidad(null); setFocusCoordinate(null); }}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Lista */}
      <View style={[styles.listContainer, { backgroundColor: colors.background }]}>
        {error ? (
          <View style={styles.errorContainerList}>
            <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
            <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>Error</Text>
            <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => loadEntidades(true)}>
              <Text style={styles.retryButtonText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={entidades}
            renderItem={renderEntidad}
            keyExtractor={(item) => item.caentid}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            onScrollToIndexFailed={() => {}}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            ListHeaderComponent={() => (
              <View style={styles.listHeader}>
                <Text style={[styles.listTitle, { color: colors.textPrimary }]}>
                  {entidades.length} delegaciones encontradas
                </Text>
                {loading && entidades.length === 0 && (
                  <Text style={[styles.loadingListText, { color: colors.textSecondary }]}>Cargando delegaciones...</Text>
                )}
              </View>
            )}
            ListEmptyComponent={() =>
              !loading ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="business-outline" size={64} color={colors.textMuted} />
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No se encontraron delegaciones</Text>
                  <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
                    Intenta ampliar el radio o cambiar el texto de búsqueda.
                  </Text>
                </View>
              ) : null
            }
            ListFooterComponent={() =>
              loading && entidades.length > 0 ? (
                <View style={styles.footerLoading}>
                  <ActivityIndicator size="small" color="#34C759" />
                  <Text style={[styles.footerText, { color: colors.textSecondary }]}>Cargando más...</Text>
                </View>
              ) : null
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  heroSubtitleCustom: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.84)',
  },
  heroActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  heroActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  controlsCard: {
    marginHorizontal: 16,
    marginTop: -4,
    marginBottom: 8,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 38,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  filterButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  filtersContainer: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  radioButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  radioButton: {
    flex: 1,
    minHeight: 36,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  mapContainer: {
    height: 220,
    backgroundColor: '#eee',
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
  listContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  loadingListText: {
    marginTop: 4,
    fontSize: 14,
    color: '#666',
  },
  entidadCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  entidadCardSelected: {
    borderColor: '#34C759',
    backgroundColor: '#F0FFF4',
  },
  selectedCard: {
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#34C759',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
  },
  selectedCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  selectedCardInfo: {
    flex: 1,
    marginRight: 8,
  },
  selectedCardNombre: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  locationFallbackBanner: {
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationFallbackText: {
    flex: 1,
    fontSize: 12,
    color: '#9A3412',
    fontWeight: '600',
  },
  selectedCardDireccion: {
    fontSize: 12,
    marginBottom: 2,
  },
  selectedCardDistancia: {
    fontSize: 13,
    color: '#34C759',
    fontWeight: '600',
  },
  selectedCardActions: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  selectedCardButton: {
    backgroundColor: '#34C759',
    minWidth: 116,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  selectedCardButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  selectedCardClose: {
    padding: 4,
  },
  entidadHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  entidadNombre: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
    lineHeight: 22,
  },
  entidadRubro: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginBottom: 8,
  },
  entidadEspecialidad: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  entidadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  entidadDireccion: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  distanciaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanciaText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginLeft: 6,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  footerLoading: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorContainerList: {
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
    backgroundColor: '#007AFF',
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
  searchWrapper: {
    position: 'relative',
    zIndex: 100,
    overflow: 'visible',
  },
  sugerenciasDropdown: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : 40,
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 10,
    borderWidth: 1,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  sugerenciaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  sugerenciaNombre: {
    fontSize: 14,
    fontWeight: '500',
  },
  sugerenciaSubtitulo: {
    fontSize: 12,
    marginTop: 2,
  },
});


