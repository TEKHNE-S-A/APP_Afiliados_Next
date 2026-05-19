/**
 * CartillaMapScreen
 * 
 * Pantalla base reutilizable que muestra:
 * - Mapa con ubicación actual del usuario
 * - Markers de prestadores/farmacias cercanos
 * - Lista scrollable debajo del mapa
 * - Filtros de búsqueda (especialidad, texto, radio)
 * 
 * Conecta con API /api/cartilla con filtros geográficos (lat/lng/radioKm)
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
import ModalPicker from '../components/ModalPicker';
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
import { FavoritosTab } from '../components/FavoritosTab';
import { RecientesTab } from '../components/RecientesTab';
import { FavoritoButton } from '../components/FavoritoButton';
import { useFavoritosPrestadores } from '../hooks/useFavoritosPrestadores';
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

interface CartillaMapScreenProps {
  navigation: any;
}

export default function CartillaMapScreen({ navigation }: CartillaMapScreenProps) {
  const { colors } = useTheme();

  // Constantes - Rubros a EXCLUIR de la cartilla general
  const RUBRO_ID_FARMACIAS = '000000008'; // Excluir farmacias (tienen su propia pantalla)
  const RUBRO_ID_DELEGACIONES = '000000009'; // Excluir delegaciones (tienen su propia pantalla)

  const isExcludedRubro = useCallback((entidad: Entidad) => {
    const rubro = (entidad.carubdescr || '').trim().toUpperCase();
    return rubro === 'FARMACIA' || rubro === 'DELEGACION';
  }, []);

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
  const [especialidadId, setEspecialidadId] = useState<string>(''); // Filtro especialidad
  const [especialidades, setEspecialidades] = useState<Array<{ caespecial: string; caespeciald: string }>>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Sugerencias autocomplete (#28)
  const [sugerencias, setSugerencias] = useState<CartillaSugerencia[]>([]);
  const [showSugerencias, setShowSugerencias] = useState(false);
  const sugerenciasTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchVersionRef = useRef(0);
  const skipEffectOnceRef = useRef(false);

  // Favoritos
  const { isFavorito, toggleFavorito } = useFavoritosPrestadores();

  // Paginación
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeTab, setActiveTab] = useState<'todos' | 'favoritos' | 'recientes'>('todos');

  // Selección individual en mapa
  const [selectedEntidad, setSelectedEntidad] = useState<Entidad | null>(null);
  const [focusCoordinate, setFocusCoordinate] = useState<{ latitude: number; longitude: number } | null>(null);
  const listRef = useRef<FlatList<Entidad>>(null);

  /**
   * Solicitar ubicación al montar el componente
   */
  useEffect(() => {
    initializeLocation();
    
    // Cargar especialidades disponibles
    const fetchEspecialidades = async () => {
      try {
        console.log('📋 Cargando especialidades...');
        const response = await apiGet('/api/cartilla/especialidades');
        console.log('📦 Respuesta especialidades:', response);
        
        if (response && Array.isArray(response)) {
          // Mapear campos del backend (caespid, caespdescr) a los esperados por el frontend
          const especialidadesMapeadas = response.map((esp: any) => ({
            caespecial: esp.caespid,
            caespeciald: esp.caespdescr
          }));
          setEspecialidades(especialidadesMapeadas);
          console.log(`✅ ${especialidadesMapeadas.length} especialidades cargadas`);
        }
      } catch (err) {
        console.error('❌ Error al cargar especialidades:', err);
        // No es crítico, el filtro simplemente no estará disponible
      }
    };
    
    fetchEspecialidades();
  }, []);

  /**
   * Cargar entidades cuando cambia ubicación o filtros (debounced 400ms para searchText)
   */
  const debouncedLoadRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (activeTab !== 'todos') return;
    if (debouncedLoadRef.current) clearTimeout(debouncedLoadRef.current);
    debouncedLoadRef.current = setTimeout(() => {
      if (skipEffectOnceRef.current) {
        skipEffectOnceRef.current = false;
        return;
      }
      console.log('🔄 useEffect disparado: cargando entidades...');
      loadEntidades(true, {
        ignoreRadius: USE_CARTILLA_NO_GPS_FALLBACK && !userLocation ? true : undefined,
      });
    }, searchText.length > 0 ? 400 : 0);
    return () => { if (debouncedLoadRef.current) clearTimeout(debouncedLoadRef.current); };
  }, [userLocation, searchText, radioKm, especialidadId, activeTab, ignorarRadio]);

  /**
   * Sugerencias autocomplete: debounce 350ms sobre searchText (#28)
   */
  useEffect(() => {
    if (sugerenciasTimerRef.current) clearTimeout(sugerenciasTimerRef.current);
    if (searchText.length < 2) {
      setSugerencias([]);
      setShowSugerencias(false);
      setIgnorarRadio(false);
      return;
    }
    sugerenciasTimerRef.current = setTimeout(async () => {
      const results = await getCartillaSugerencias(searchText, {
        excludeRubroIds: [RUBRO_ID_FARMACIAS, RUBRO_ID_DELEGACIONES],
        limit: 5,
      });
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
      !effectiveSearchText.trim() &&
      !especialidadId;
    if (!userLocation && !effectiveIgnorarRadio && USE_CARTILLA_NO_GPS_FALLBACK) {
      console.log('📡 loadEntidades: sin ubicación, usando fallback sin filtro de cercanía');
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

      const buildParams = (ignoreRadius: boolean) => {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: '20',
          ...(!ignoreRadius && userLocation ? {
            lat: userLocation.latitude.toString(),
            lng: userLocation.longitude.toString(),
            radioKm: radioKm.toString(),
            orderBy: 'distancia',
          } : {}),
          ...(effectiveSearchText && { q: effectiveSearchText }),
          ...(especialidadId && { especialidadId }),
        });

        params.append('excludeRubroId', RUBRO_ID_FARMACIAS);
        params.append('excludeRubroId', RUBRO_ID_DELEGACIONES);

        return params;
      };

      // Llamar a API con filtros geográficos
      // NOTA: Excluimos Farmacias y Delegaciones (tienen pantallas dedicadas)
      const params = buildParams(shouldIgnoreRadius);

      console.log(`📡 Cargando entidades (página ${currentPage}, radio ${radioKm}km)...`);
      let response = await apiGet(`/api/cartilla?${params.toString()}`);
      if (searchVersionRef.current !== myVersion) return;

      if (response.data) {
        let rawEntidades = response.data as Entidad[];
        let newEntidades = rawEntidades.filter((e) => !isExcludedRubro(e));
        let filteredOut = rawEntidades.length - newEntidades.length;

        if (shouldFallbackToGlobal && newEntidades.length === 0) {
          console.log('📡 Sin resultados cercanos al ingresar, reintentando búsqueda general...');
          skipEffectOnceRef.current = true;
          setIgnorarRadio(true);
          response = await apiGet(`/api/cartilla?${buildParams(true).toString()}`);
          if (searchVersionRef.current !== myVersion) return;
          rawEntidades = response.data as Entidad[];
          newEntidades = rawEntidades.filter((e) => !isExcludedRubro(e));
          filteredOut = rawEntidades.length - newEntidades.length;
        }

        if (filteredOut > 0) {
          console.log(`🧹 Cartilla: filtradas ${filteredOut} entidades excluidas (farmacias/delegaciones)`);
        }
        
        if (reset) {
          setEntidades(newEntidades);
        } else {
          setEntidades((prev) => [...prev, ...newEntidades]);
        }

        // Verificar si hay más páginas
        const totalPages = response.pagination?.totalPages || 1;
        setHasMore(currentPage < totalPages);
        
        console.log(`✅ ${newEntidades.length} entidades cargadas (total: ${reset ? newEntidades.length : entidades.length + newEntidades.length})`);
      }
    } catch (err: any) {
      if (searchVersionRef.current !== myVersion) return;
      console.error('❌ Error al cargar entidades:', err);
      setError(err.message || 'Error al cargar prestadores');
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
    const markers = entidades
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
    console.log(`📍 mapMarkers: ${markers.length} markers de ${entidades.length} entidades`);
    return markers;
  }, [entidades]);

  /**
   * Renderizar item de lista
   */
  const handleEntidadPress = (entidad: Entidad) => {
    if (selectedEntidad?.caentid === entidad.caentid) {
      // Segundo toque sobre el mismo item → navegar al detalle
      navigation.navigate('PrestadorDetalle', { entidadId: entidad.caentid });
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
        <FavoritoButton
          caentid={item.caentid}
          isFavorito={isFavorito(item.caentid)}
          onToggle={async (isFav) => { await toggleFavorito(item.caentid) }}
          size={20}
          color={colors.textSecondary}
        />
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
      {isSelected && !item.lat && (
        <Text style={styles.selectedNoMapText}>Sin coordenadas en mapa</Text>
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
        icon={<Ionicons name="business-outline" size={30} color="#FFFFFF" />}
        title="Prestadores Cercanos"
        subtitle="Busqueda, favoritos y ubicacion cercana"
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

      <View style={[styles.controlsCard, { backgroundColor: colors.surface, shadowColor: colors.shadow, borderColor: colors.border }]}>
        <View style={styles.searchWrapper}>
          <View style={[styles.searchContainer, { backgroundColor: colors.inputBackground }]}>
            <Ionicons name="search-outline" size={20} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Escribir para buscar prestadores..."
              placeholderTextColor={colors.inputPlaceholder}
              value={searchText}
              onChangeText={(text) => {
                setSearchText(text);
                if (text.length === 0) setShowSugerencias(false);
              }}
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
          {/* Dropdown de sugerencias */}
          {showSugerencias && sugerencias.length > 0 && (
            <View style={[styles.sugerenciasDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {sugerencias.map((s, idx) => (
                <TouchableOpacity
                  key={`${s.caentid}-${idx}`}
                  style={[
                    styles.sugerenciaItem,
                    idx < sugerencias.length - 1 && { borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
                  ]}
                  onPress={() => {
                    const n = s.caentapeno.trim();
                    setShowSugerencias(false);
                    setSugerencias([]);
                    setSearchText(n);
                    setIgnorarRadio(true);
                    skipEffectOnceRef.current = true;
                    if (debouncedLoadRef.current) clearTimeout(debouncedLoadRef.current);
                    loadEntidades(true, { q: n, ignoreRadius: true });
                  }}
                >
                  <Ionicons name="search-outline" size={14} color={colors.primary} style={{ marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sugerenciaNombre, { color: colors.textPrimary }]} numberOfLines={1}>
                      {s.caentapeno}
                    </Text>
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

        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              { borderColor: colors.primary, backgroundColor: colors.surface },
              activeTab === 'todos' && { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary },
            ]}
            onPress={() => setActiveTab('todos')}
          >
            <Text style={[styles.tabButtonText, { color: colors.primary }, activeTab === 'todos' && { color: colors.buttonPrimaryText }]}>Todos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabButton,
              { borderColor: colors.primary, backgroundColor: colors.surface },
              activeTab === 'favoritos' && { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary },
            ]}
            onPress={() => setActiveTab('favoritos')}
          >
            <Text style={[styles.tabButtonText, { color: colors.primary }, activeTab === 'favoritos' && { color: colors.buttonPrimaryText }]}>Favoritos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabButton,
              { borderColor: colors.primary, backgroundColor: colors.surface },
              activeTab === 'recientes' && { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary },
            ]}
            onPress={() => setActiveTab('recientes')}
          >
            <Text style={[styles.tabButtonText, { color: colors.primary }, activeTab === 'recientes' && { color: colors.buttonPrimaryText }]}>Recientes</Text>
          </TouchableOpacity>
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

            {/* Filtro de especialidad */}
            {especialidades.length > 0 && (
              <>
                <Text style={[styles.filterLabel, { marginTop: 16, color: colors.textSecondary }]}>Especialidad</Text>
                <ModalPicker
                  placeholder="Todas las especialidades"
                  selectedValue={especialidadId}
                  onValueChange={(value) => setEspecialidadId(value)}
                  items={[
                    { label: 'Todas las especialidades', value: '' },
                    ...especialidades.map((esp) => ({ label: esp.caespeciald, value: esp.caespecial })),
                  ]}
                />
              </>
            )}
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

      {activeTab === 'todos' && (
      <>
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

      {/* Tarjeta de entidad seleccionada */}
      {selectedEntidad && (
        <View style={[styles.selectedCard, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}>
          <View style={styles.selectedCardContent}>
            <View style={styles.selectedCardInfo}>
              <Text style={[styles.selectedCardNombre, { color: colors.textPrimary }]} numberOfLines={1}>
                {selectedEntidad.caentapeno}
              </Text>
              {selectedEntidad.caespecial && (
                <Text style={[styles.selectedCardEspecialidad, { color: colors.textSecondary }]} numberOfLines={1}>
                  {selectedEntidad.caespecial}
                </Text>
              )}
              {selectedEntidad.caendirecc && (
                <Text style={[styles.selectedCardDireccion, { color: colors.textSecondary }]} numberOfLines={1}>
                  {selectedEntidad.caendirecc}
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
                onPress={() => navigation.navigate('PrestadorDetalle', { entidadId: selectedEntidad.caentid })}
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

      </>
      )}

      {/* Lista de entidades */}
      <View style={styles.listContainer}>
        {activeTab === 'favoritos' ? (
          <FavoritosTab
            onSelectPrestador={() => {}}
            onNavigateToDetalle={(caentid) => navigation.navigate('PrestadorDetalle', { entidadId: caentid })}
          />
        ) : activeTab === 'recientes' ? (
          <RecientesTab
            onNavigateToDetalle={(caentid) => navigation.navigate('PrestadorDetalle', { entidadId: caentid })}
          />
        ) : (locationLoading || (loading && entidades.length === 0)) ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              {locationLoading ? 'Obteniendo ubicación...' : 'Cargando prestadores...'}
            </Text>
          </View>
        ) : entidades.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="business-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No se encontraron prestadores en esta área
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
          <Text style={[styles.errorBannerText, { color: colors.textOnPrimary }]}>{error}</Text>
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
    zIndex: 50,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  searchWrapper: {
    position: 'relative',
    zIndex: 100,
    overflow: 'visible',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D5DCE8',
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    marginBottom: 10,
  },
  sugerenciasDropdown: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : 40,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 12,
    zIndex: 9999,
    maxHeight: 280,
  },
  sugerenciaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sugerenciaNombre: {
    fontSize: 14,
    fontWeight: '500',
  },
  sugerenciaSubtitulo: {
    fontSize: 12,
    marginTop: 1,
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
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#007AFF',
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#007AFF',
  },
  tabButtonText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
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
  selectedNoMapText: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 4,
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
  selectedCardEspecialidad: {
    fontSize: 12,
    marginBottom: 1,
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


