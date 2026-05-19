/**
 * NotificationsScreen - Pantalla de notificaciones (Semana 28)
 * 
 * Funcionalidades:
 * - Lista paginada con pull-to-refresh
 * - Filtros (tipo, leída, fechas)
 * - Marcar individual como leída (swipe)
 * - Marcar todas como leídas
 * - Badge unread count en header
 * - Modal con detalle completo
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import FilterModal from '../components/FilterModal';
import CurvedHeroHeader from '../components/CurvedHeroHeader';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  type Notification,
  type NotificationFilters,
  getNotificationIcon,
  getNotificationColor,
  formatRelativeDate,
} from '../services/notificationService';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../theme';
import { useNavigation } from '@react-navigation/native';

export default function NotificationsScreen() {
  const { user, token, loading: authLoading, requiresRelogin, isOfflineMode } = useAuth();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const hasOnlineSession = !!user && !!token && !token.startsWith('offline_') && !authLoading && !requiresRelogin && !isOfflineMode;
  
  // Estado de notificaciones
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Paginación
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Badge unread count
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Filtros
  const [filters, setFilters] = useState<NotificationFilters>({
    page: 1,
    limit: 20,
    orderBy: 'fecha_creacion',
    orderDir: 'desc',
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Modal detalle
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Evita quedarse indefinidamente en "Cargando..." cuando el backend está degradado.
  useEffect(() => {
    if (!loading) return;

    const timer = setTimeout(() => {
      setLoading(false);
      setRefreshing(false);
      setError((prev) => prev || 'Tiempo de espera agotado al cargar notificaciones');
    }, 15000);

    return () => clearTimeout(timer);
  }, [loading]);

  // ============================================================================
  // CARGA INICIAL Y REFRESH
  // ============================================================================

  const fetchNotifications = useCallback(async (pageNumber: number = 1, append: boolean = false) => {
    // Validar autenticación antes de hacer la petición
    if (!hasOnlineSession) {
      console.log('🔕 No se pueden cargar notificaciones: sin sesión válida');
      setNotifications([]);
      setLoading(false);
      return;
    }
    
    try {
      if (!append) setLoading(true);
      setError(null);
      
      const response = await getNotifications({
        ...filters,
        page: pageNumber,
      });
      
      // Validar respuesta del backend
      if (!response || !response.notifications || !response.pagination) {
        console.warn('⚠️ Respuesta de notificaciones inválida:', response);
        setNotifications([]);
        setTotalPages(1);
        return;
      }
      
      if (append) {
        setNotifications(prev => [...prev, ...response.notifications]);
      } else {
        setNotifications(response.notifications);
      }
      
      setPage(pageNumber);
      setTotalPages(response.pagination.totalPages);
    } catch (err: any) {
      console.error('Error cargando notificaciones:', err);
      setError(err.message || 'Error al cargar notificaciones');
      setNotifications([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters, hasOnlineSession]);

  const fetchUnreadCount = useCallback(async () => {
    // Validar autenticación antes de hacer la petición
    if (!hasOnlineSession) {
      setUnreadCount(0);
      return;
    }
    
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      console.error('Error obteniendo unread count:', err);
    }
  }, [hasOnlineSession]);

  useEffect(() => {
    // Solo cargar si hay sesión válida
    if (hasOnlineSession) {
      fetchNotifications(1, false);
      fetchUnreadCount();
    }
  }, [filters, hasOnlineSession]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications(1, false);
    await fetchUnreadCount();
    setRefreshing(false);
  }, [fetchNotifications, fetchUnreadCount]);

  // ============================================================================
  // PAGINACIÓN
  // ============================================================================

  const loadMore = () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    fetchNotifications(page + 1, true);
  };

  // ============================================================================
  // MARCAR COMO LEÍDA
  // ============================================================================

  const handleMarkAsRead = async (notification: Notification) => {
    if (notification.leida) return; // Ya está leída

    try {
      // Actualización optimista
      setNotifications(prev =>
        prev.map(n =>
          n.id === notification.id
            ? { ...n, leida: true, fecha_leida: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      // Llamar al backend
      await markAsRead(notification.id);
    } catch (err: any) {
      console.error('Error marcando como leída:', err);
      // Revertir en caso de error
      setNotifications(prev =>
        prev.map(n => (n.id === notification.id ? notification : n))
      );
      setUnreadCount(prev => prev + 1);
      Alert.alert('Error', 'No se pudo marcar la notificación como leída');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) {
      Alert.alert('Info', 'No hay notificaciones sin leer');
      return;
    }

    Alert.alert(
      'Marcar todas como leídas',
      `¿Deseas marcar ${unreadCount} notificaciones como leídas?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              // Actualización optimista
              setNotifications(prev =>
                prev.map(n => ({
                  ...n,
                  leida: true,
                  fecha_leida: n.leida ? n.fecha_leida : new Date().toISOString(),
                }))
              );
              const previousUnreadCount = unreadCount;
              setUnreadCount(0);

              // Llamar al backend
              const response = await markAllAsRead();
              Alert.alert('Éxito', response.message);
            } catch (err: any) {
              console.error('Error marcando todas como leídas:', err);
              // Recargar en caso de error
              await onRefresh();
              Alert.alert('Error', 'No se pudieron marcar todas las notificaciones');
            }
          },
        },
      ]
    );
  };

  // ============================================================================
  // RENDERIZADO
  // ============================================================================

  const renderNotificationItem = ({ item }: { item: Notification }) => {
    const color = getNotificationColor(item.tipo);
    const iconName = getNotificationIcon(item.tipo);

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          { backgroundColor: colors.surface, shadowColor: colors.shadow, borderColor: colors.border },
          !item.leida && { backgroundColor: colors.surfaceHighlight },
        ]}
        onPress={() => {
          setSelectedNotification(item);
          setShowDetailModal(true);
          handleMarkAsRead(item);
        }}
      >
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <Ionicons name={iconName as any} size={24} color={color} />
        </View>

        <View style={styles.contentContainer}>
          <Text style={[styles.titulo, { color: colors.textPrimary }]} numberOfLines={1}>
            {item.titulo}
          </Text>
          <Text style={[styles.mensaje, { color: colors.textSecondary }]} numberOfLines={2}>
            {item.mensaje}
          </Text>
          <Text style={[styles.fecha, { color: colors.textMuted }]}>{formatRelativeDate(item.fecha_creacion)}</Text>
        </View>

        {!item.leida && <View style={styles.unreadBadge} />}
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="notifications-off-outline" size={80} color={colors.textMuted} />
        <Text style={[styles.emptyText, { color: colors.textPrimary }]}>No hay notificaciones</Text>
        <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
          Cuando recibas notificaciones aparecerán aquí
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  const renderTopHeader = (showActions = false) => (
    <CurvedHeroHeader
      icon={<Ionicons name="notifications-outline" size={30} color="#FFFFFF" />}
      title="Notificaciones"
      subtitle={unreadCount > 0 ? `${unreadCount} sin leer` : 'Todo al día'}
      backgroundColor={colors.headerBackground}
      waveBackgroundColor={colors.background}
      subtitleStyle={styles.headerSubtitleCustom}
    >
      {showActions && (
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: 'rgba(255,255,255,0.14)' }]}
            onPress={() => (navigation as any).navigate('Profile', { screen: 'NotificationPreferences' })}
          >
            <Ionicons name="settings-outline" size={20} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: 'rgba(255,255,255,0.14)' }]}
            onPress={() => setShowFilters(true)}
          >
            <Ionicons name="filter" size={20} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: unreadCount > 0 ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.1)' }]}
            onPress={handleMarkAllAsRead}
            disabled={unreadCount === 0}
          >
            <Ionicons name="checkmark-done" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </CurvedHeroHeader>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.headerBackground }]} edges={['top']}>
        {renderTopHeader()}
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Cargando notificaciones...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.headerBackground }]} edges={['top']}>
        {renderTopHeader()}
        <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={80} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={onRefresh}>
          <Text style={[styles.retryButtonText, { color: colors.textOnPrimary }]}>Reintentar</Text>
        </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.headerBackground }]} edges={['top']}>
      {renderTopHeader(true)}

      {/* Lista de notificaciones */}
      <FlatList
        data={notifications || []}
        renderItem={renderNotificationItem}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          (notifications || []).length === 0 ? styles.emptyListContainer : undefined,
        ]}
      />

      {/* Modal detalle de notificación */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Detalle</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={28} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedNotification && (
                <>
                  <View style={styles.modalSection}>
                    <View
                      style={[
                        styles.modalIconContainer,
                        {
                          backgroundColor:
                            getNotificationColor(selectedNotification.tipo) + '20',
                        },
                      ]}
                    >
                      <Ionicons
                        name={getNotificationIcon(selectedNotification.tipo) as any}
                        size={40}
                        color={getNotificationColor(selectedNotification.tipo)}
                      />
                    </View>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Título</Text>
                    <Text style={[styles.modalValue, { color: colors.textPrimary }]}>{selectedNotification.titulo}</Text>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Mensaje</Text>
                    <Text style={[styles.modalValue, { color: colors.textPrimary }]}>{selectedNotification.mensaje}</Text>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Fecha</Text>
                    <Text style={[styles.modalValue, { color: colors.textPrimary }]}>
                      {formatRelativeDate(selectedNotification.fecha_creacion)}
                    </Text>
                    <Text style={[styles.modalValueSecondary, { color: colors.textSecondary }]}>
                      {new Date(selectedNotification.fecha_creacion).toLocaleString('es-AR')}
                    </Text>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Estado</Text>
                    <Text style={[styles.modalValue, { color: colors.textPrimary }]}>
                      {selectedNotification.leida ? '✓ Leída' : '○ No leída'}
                    </Text>
                    {selectedNotification.fecha_leida && (
                      <Text style={[styles.modalValueSecondary, { color: colors.textSecondary }]}>
                        Leída el{' '}
                        {new Date(selectedNotification.fecha_leida).toLocaleString('es-AR')}
                      </Text>
                    )}
                  </View>

                </>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalCloseButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowDetailModal(false)}
            >
              <Text style={[styles.modalCloseButtonText, { color: colors.textOnPrimary }]}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de filtros */}
      <FilterModal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onApplyFilters={(newFilters) => {
          setFilters(newFilters);
          setShowFilters(false);
        }}
      />
    </SafeAreaView>
  );
}

// ============================================================================
// ESTILOS
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  
  // Header
  headerSubtitleCustom: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.8)',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Lista
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  notificationUnread: {
    backgroundColor: '#EFF6FF',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
  },
  titulo: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  mensaje: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  fecha: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  unreadBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    marginLeft: 8,
    marginTop: 4,
  },
  
  // Estados
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#F9FAFB',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#0066FF',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Modal detalle
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalBody: {
    padding: 20,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  modalValue: {
    fontSize: 16,
    color: '#111827',
    lineHeight: 24,
  },
  modalValueSecondary: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  modalCloseButton: {
    margin: 20,
    paddingVertical: 14,
    backgroundColor: '#0066FF',
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
