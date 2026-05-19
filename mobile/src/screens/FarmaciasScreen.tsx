/**
 * FarmaciasScreen
 * 
 * Pantalla específica para farmacias que muestra:
 * - Mapa con ubicación actual del usuario
 * - Markers de farmacias cercanas
 * - Lista scrollable debajo del mapa
 * - Filtros de búsqueda (texto, radio) - sin especialidad
 * 
 * Conecta con API /api/cartilla?rubroId=000000008 (FARMACIAS)
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
  lat?: string;  // Coordenadas desde API
  lng?: string;
  distancia_km?: string;
}

interface FarmaciasScreenProps {
  navigation: any;
}

export default function FarmaciasScreen({ navigation }: FarmaciasScreenProps) {
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
  const [radioKm, setRadioKm] = useState(10); // Default 10km
  const [ignorarRadio, setIgnorarRadio] = useState(false); // true = búsqueda por texto sin filtro de cercanía
  const [showFilters, setShowFilters] = useState(false);
  
  // rubroId fijo para farmacias
  const RUBRO_ID_FARMACIAS = '000000008';

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

  /**
   * Solicitar ubicación al montar el componente
   */
  useEffect(() => {
    initializeLocation();
  }, []);

  /**
   * Cargar farmacias cuando cambia ubicación o filtros
   */
  useEffect(() => {
    if (skipEffectOnceRef.current) {
      skipEffectOnceRef.current = false;
      return;
    }
    console.log('🏥 useEffect disparado: cargando farmacias...');
    loadEntidades(true, {
      ignoreRadius: USE_CARTILLA_NO_GPS_FALLBACK && !userLocation ? true : undefined,
    });
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
      const results = await getCartillaSugerencias(searchText, { rubroId: RUBRO_ID_FARMACIAS, limit: 5 });
      setSugerencias(results);
      setShowSugerencias(results.length > 0);
    }, 350);
    return () => { if (sugerenciasTimerRef.current) clearTimeout(sugerenciasTimerRef.current); };
  }, [searchText]);

  /**
   * Inicializar ubicación del usuario
   */
  const initializeLocation = async () => {
    console.log('🚀 initializeLocation: INICIO');
    try {
      console.log('🔄 Seteando locationLoading = true');
      setLocationLoading(true);
      setLocationError(null);

      console.log('📍 Llamando a getCurrentLocation()...');
      // Obtener ubicación actual (getCurrentLocation maneja MOCK internamente)
      const location = await getCurrentLocation();
      console.log('📍 getCurrentLocation() retornó:', location);
      
      if (location) {
        console.log('✅ Ubicación válida, seteando userLocation');
        setUserLocation(location.coords);
        console.log('✅ Ubicación obtenida:', location.coords);
        console.log('🔄 Seteando locationLoading = false (success path)');
        setLocationLoading(false);
      } else {
        console.warn('⚠️ getCurrentLocation retornó null');
        // Solo si getCurrentLocation falla (no hay MOCK y no hay permisos)
        setLocationError('No se pudo obtener la ubicación');
        Alert.alert(
          'Ubicación no disponible',
          'No se pudo acceder a tu ubicación. Verifica permisos y servicios de ubicación.',
          [{ text: 'OK' }]
        );
        console.log('🔄 Seteando locationLoading = false (null path)');
        setLocationLoading(false);
      }
    } catch (err) {
      console.error('❌ Error al inicializar ubicación:', err);
      setLocationError('Error al obtener ubicación');
      console.log('🔄 Seteando locationLoading = false (error path)');
      setLocationLoading(false);
    }
    console.log('🏁 initializeLocation: FIN');
  };

  /**
   * Cargar entidades de cartilla desde API
   */
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
      console.log('🏥 Sin ubicación, buscando farmacias sin filtro de cercanía');
    }
    if (!userLocation && !shouldIgnoreRadius) {
      console.log('⏭️  Skip loadEntidades: sin ubicación');
      return;
    }
    if (loading && !reset) {
      console.log('⏭️  Skip loadEntidades: ya está cargando (paginación)');
      return;
    }
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
        rubroId: RUBRO_ID_FARMACIAS,
        ...(effectiveSearchText && { q: effectiveSearchText }),
      });

      // Llamar a API con filtros geográficos + rubroId fijo de farmacias
      const params = buildParams(shouldIgnoreRadius);

      console.log(`🏥 Cargando farmacias (página ${currentPage}, radio ${radioKm}km)...`);
      let response = await apiGet(`/api/cartilla?${params.toString()}`);
      if (searchVersionRef.current !== myVersion) return;

      if (response.data) {
        let newEntidades = response.data as Entidad[];

        if (shouldFallbackToGlobal && newEntidades.length === 0) {
          console.log('🏥 Sin resultados cercanos al ingresar, reintentando búsqueda general...');
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

        // Verificar si hay más páginas
        const totalPages = response.pagination?.totalPages || 1;
        setHasMore(currentPage < totalPages);
        
        console.log(`✅ ${newEntidades.length} farmacias cargadas (total: ${reset ? newEntidades.length : entidades.length + newEntidades.length})`);
      }
    } catch (err: any) {
      if (searchVersionRef.current !== myVersion) return;
      console.error('❌ Error al cargar farmacias:', err);
      setError(err.message || 'Error al cargar farmacias');
    } finally {
      if (searchVersionRef.current === myVersion) {
        console.log('🔄 loadEntidades finalizado - setLoading(false)');
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  function currentPageSafe(resetValue: boolean, currentPage: number) {
    return resetValue ? 1 : currentPage;
  }

  /**
   * Refrescar datos
   */
  const handleRefresh = () => {
    setRefreshing(true);
    loadEntidades(true);
  };

  /**
   * Recargar ubicación
   */
  const handleReloadLocation = async () => {
    await initializeLocation();
  };

  /**
   * Cargar más entidades (scroll infinito)
   */
  const loadMore = () => {
    if (!loading && hasMore) {
      setPage((prev) => prev + 1);
      loadEntidades(false);
    }
  };

  /**
   * Seleccionar entidad: centra el mapa y resalta el marker
   */
  const selectEntidad = useCallback((entidad: Entidad) => {
    setSelectedEntidad(entidad);
    if (entidad.lat && entidad.lng) {
      setFocusCoordinate({
        latitude: parseFloat(entidad.lat),
        longitude: parseFloat(entidad.lng),
      });
    }
  }, []);

  /**
   * Handler para marker press (desde el mapa)
   */
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

  /**
   * Convertir entidades a markers para el mapa (memoizado para evitar re-renders)
   */
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
        color: '#FF3B30',
      }));
  }, [entidades]);

  /**
   * Renderizar item de lista
   */
  const handleEntidadPress = (entidad: Entidad) => {
    if (selectedEntidad?.caentid === entidad.caentid) {
      navigation.navigate('FarmaciaDetalle', { entidadId: entidad.caentid });
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

      {item.carubdescr && (
        <Text style={styles.entidadRubro}>{item.carubdescr}</Text>
      )}

      {item.caespecial && (
          <Text style={[styles.entidadEspecialidad, { color: colors.textSecondary }]}>{item.caespecial}</Text>
      )}

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
        <View style={[styles.distanciaContainer, { borderTopColor: colors.borderLight }]}>
          <Ionicons name="navigate-outline" size={14} color="#007AFF" />
          <Text style={styles.distanciaText}>
            {formatDistance(parseFloat(item.distancia_km))}
          </Text>
        </View>
      )}
    </TouchableOpacity>
    );
  };

  console.log('📊 RENDER - locationLoading:', locationLoading, 'userLocation:', userLocation ? 'SET' : 'NULL', 'entidades:', entidades.length);

  if (locationError && !userLocation && !USE_CARTILLA_NO_GPS_FALLBACK) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="location-outline" size={64} color={colors.textMuted} />
          <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>Ubicación no disponible</Text>
          <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>{locationError}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleReloadLocation}
          >
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <CurvedHeroHeader
        icon={<Ionicons name="medkit-outline" size={30} color="#FFFFFF" />}
        title="Farmacias Cercanas"
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
        <View style={[styles.searchWrapper]}>
          <View style={[styles.searchContainer, { backgroundColor: colors.inputBackground }]}>
            <Ionicons name="search-outline" size={20} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Escribir para buscar farmacias..."
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
                <Ionicons name="close-circle" size={20} color={colors.textMuted} />
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

        {/* Toggle de filtros */}
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
            onPress={() => setShowFilters(!showFilters)}
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

        {/* Panel de filtros */}
        {showFilters && (
          <View style={[styles.filtersPanel, { borderTopColor: colors.border }]}>
            <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Radio de búsqueda</Text>
            <View style={styles.radioButtons}>
              {[5, 10, 20, 50].map((km) => (
                <TouchableOpacity
                  key={km}
                  style={[
                    styles.radioButton,
                    { backgroundColor: colors.surfaceVariant, borderColor: colors.border },
                    radioKm === km && { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary },
                  ]}
                  onPress={() => { setIgnorarRadio(false); setRadioKm(km); }}
                >
                  <Text
                    style={[
                      styles.radioButtonText,
                      { color: colors.textSecondary },
                      radioKm === km && { color: colors.buttonPrimaryText },
                    ]}
                  >
                    {km} km
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
        <MapViewComponent
          userLocation={userLocation}
          markers={mapMarkers}
          showsUserLocation={true}
          followsUserLocation={false}
          loading={locationLoading}
          height={220}
          onMarkerPress={handleMarkerPress}
          focusCoordinate={focusCoordinate}
          selectedMarkerId={selectedEntidad?.caentid ?? null}
        />
      </View>

      {/* Tarjeta de farmacia seleccionada */}
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
                onPress={() => navigation.navigate('FarmaciaDetalle', { entidadId: selectedEntidad.caentid })}
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

      {/* Lista de entidades */}
      <View style={styles.listContainer}>
        {(locationLoading || (loading && entidades.length === 0)) ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              {locationLoading ? 'Obteniendo ubicación...' : 'Cargando farmacias...'}
            </Text>
          </View>
        ) : entidades.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="medkit-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No se encontraron farmacias en esta área
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => loadEntidades(true)}
            >
              <Text style={styles.retryButtonText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={entidades}
            renderItem={renderEntidad}
            keyExtractor={(item) => item.caentid}
            contentContainerStyle={styles.listContent}
            onScrollToIndexFailed={() => {}}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={['#007AFF']}
                tintColor="#007AFF"
              />
            }
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              loading && entidades.length > 0 ? (
                <View style={styles.footerLoading}>
                  <ActivityIndicator size="small" color="#007AFF" />
                </View>
              ) : null
            }
          />
        )}
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
  backToHubButton: {
    marginBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D5DCE8',
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    minHeight: 22,
    fontSize: 15,
    color: '#333',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#007AFF',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  filtersPanel: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
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
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    backgroundColor: '#FFF',
    marginTop: 8,
  },
  picker: {
    height: 50,
  },
  mapContainer: {
    height: 220,
    backgroundColor: '#E0E0E0',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 120,
  },
  entidadCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  entidadCardSelected: {
    borderColor: '#FF9500',
    backgroundColor: '#FFFBF0',
  },
  selectedCard: {
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF9500',
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
  selectedCardDireccion: {
    fontSize: 12,
    marginBottom: 2,
  },
  selectedCardDistancia: {
    fontSize: 13,
    color: '#FF9500',
    fontWeight: '600',
  },
  selectedCardActions: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  selectedCardButton: {
    backgroundColor: '#FF9500',
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
    fontWeight: '700',
    color: '#333',
    marginLeft: 8,
  },
  entidadRubro: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
    marginBottom: 4,
  },
  entidadEspecialidad: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
  entidadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  entidadDireccion: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
  distanciaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  distanciaText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  footerLoading: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
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
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
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
    left: 0,
    right: 0,
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
  errorBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FF3B30',
    padding: 12,
    alignItems: 'center',
  },
  errorBannerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});


