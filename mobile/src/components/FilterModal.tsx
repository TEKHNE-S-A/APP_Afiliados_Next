/**
 * FilterModal - Modal de filtros para notificaciones (Semana 28)
 * 
 * Filtros disponibles:
 * - Tipo: info, warning, success, error
 * - Leída: switch sí/no
 * - Fecha desde: date picker
 * - Fecha hasta: date picker
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { NotificationFilters, NotificationType } from '../services/notificationService';
import { useTheme } from '../theme';

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: NotificationFilters;
  onApplyFilters: (filters: NotificationFilters) => void;
}

export default function FilterModal({
  visible,
  onClose,
  filters,
  onApplyFilters,
}: FilterModalProps) {
  // Estado local de filtros (editables)
  const [localFilters, setLocalFilters] = useState<NotificationFilters>(filters);
  const { colors } = useTheme();
  
  // Estado para date pickers
  const [showFechaDesde, setShowFechaDesde] = useState(false);
  const [showFechaHasta, setShowFechaHasta] = useState(false);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleTipoSelect = (tipo: NotificationType | undefined) => {
    setLocalFilters(prev => ({ ...prev, tipo }));
  };

  const handleLeidaToggle = (enabled: boolean) => {
    setLocalFilters(prev => ({
      ...prev,
      leida: enabled ? undefined : false, // Toggle: undefined (todos) → false (no leídas)
    }));
  };

  const handleFechaDesdeChange = (event: any, date?: Date) => {
    setShowFechaDesde(Platform.OS === 'ios');
    if (date) {
      setLocalFilters(prev => ({
        ...prev,
        fecha_desde: date.toISOString().split('T')[0], // YYYY-MM-DD
      }));
    }
  };

  const handleFechaHastaChange = (event: any, date?: Date) => {
    setShowFechaHasta(Platform.OS === 'ios');
    if (date) {
      setLocalFilters(prev => ({
        ...prev,
        fecha_hasta: date.toISOString().split('T')[0], // YYYY-MM-DD
      }));
    }
  };

  const handleClearFilters = () => {
    const clearedFilters: NotificationFilters = {
      page: 1,
      limit: 20,
      orderBy: 'fecha_creacion',
      orderDir: 'desc',
    };
    setLocalFilters(clearedFilters);
  };

  const handleApply = () => {
    onApplyFilters(localFilters);
    onClose();
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const tiposDisponibles: Array<{ value: NotificationType; label: string; color: string; icon: string }> = [
    { value: 'info', label: 'Información', color: '#3B82F6', icon: 'information-circle' },
    { value: 'warning', label: 'Advertencia', color: '#F59E0B', icon: 'warning' },
    { value: 'success', label: 'Éxito', color: '#10B981', icon: 'checkmark-circle' },
    { value: 'error', label: 'Error', color: '#EF4444', icon: 'close-circle' },
  ];

  const formatDate = (isoDate?: string) => {
    if (!isoDate) return 'Seleccionar';
    return new Date(isoDate).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: colors.modalOverlay }]}>
        <View style={[styles.container, { backgroundColor: colors.modalBackground }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Filtros</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Filtro Tipo */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Tipo de notificación</Text>
              <View style={styles.tiposContainer}>
                <TouchableOpacity
                  style={[
                    styles.tipoButton,
                    { backgroundColor: colors.inputBackground, borderColor: colors.border },
                    !localFilters.tipo && [styles.tipoButtonActive, { borderColor: colors.primary, backgroundColor: colors.primary + '10' }],
                  ]}
                  onPress={() => handleTipoSelect(undefined)}
                >
                  <Text
                    style={[
                      styles.tipoButtonText,
                      { color: colors.textSecondary },
                      !localFilters.tipo && { color: colors.primary, fontWeight: '600' as const },
                    ]}
                  >
                    Todos
                  </Text>
                </TouchableOpacity>

                {tiposDisponibles.map(tipo => (
                  <TouchableOpacity
                    key={tipo.value}
                    style={[
                      styles.tipoButton,
                      { backgroundColor: colors.inputBackground, borderColor: colors.border },
                      localFilters.tipo === tipo.value && [styles.tipoButtonActive, { borderColor: tipo.color, backgroundColor: tipo.color + '10' }],
                    ]}
                    onPress={() => handleTipoSelect(tipo.value)}
                  >
                    <Ionicons
                      name={tipo.icon as any}
                      size={18}
                      color={localFilters.tipo === tipo.value ? tipo.color : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.tipoButtonText,
                        { color: colors.textSecondary },
                        localFilters.tipo === tipo.value && { color: tipo.color, fontWeight: '600' as const },
                      ]}
                    >
                      {tipo.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Filtro Leída */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Solo no leídas</Text>
                <Switch
                  value={localFilters.leida === false}
                  onValueChange={handleLeidaToggle}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>
              <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
                Mostrar únicamente las notificaciones sin leer
              </Text>
            </View>

            {/* Filtro Fecha Desde */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Fecha desde</Text>
              <TouchableOpacity
                style={[styles.dateButton, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                onPress={() => setShowFechaDesde(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.dateButtonText, { color: colors.textPrimary }]}>
                  {formatDate(localFilters.fecha_desde)}
                </Text>
                {localFilters.fecha_desde && (
                  <TouchableOpacity
                    onPress={() =>
                      setLocalFilters(prev => ({ ...prev, fecha_desde: undefined }))
                    }
                  >
                    <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
              {showFechaDesde && (
                <DateTimePicker
                  value={
                    localFilters.fecha_desde
                      ? new Date(localFilters.fecha_desde)
                      : new Date()
                  }
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleFechaDesdeChange}
                  maximumDate={new Date()}
                />
              )}
            </View>

            {/* Filtro Fecha Hasta */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Fecha hasta</Text>
              <TouchableOpacity
                style={[styles.dateButton, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                onPress={() => setShowFechaHasta(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                <Text style={[styles.dateButtonText, { color: colors.textPrimary }]}>
                  {formatDate(localFilters.fecha_hasta)}
                </Text>
                {localFilters.fecha_hasta && (
                  <TouchableOpacity
                    onPress={() =>
                      setLocalFilters(prev => ({ ...prev, fecha_hasta: undefined }))
                    }
                  >
                    <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
              {showFechaHasta && (
                <DateTimePicker
                  value={
                    localFilters.fecha_hasta
                      ? new Date(localFilters.fecha_hasta)
                      : new Date()
                  }
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleFechaHastaChange}
                  maximumDate={new Date()}
                  minimumDate={
                    localFilters.fecha_desde
                      ? new Date(localFilters.fecha_desde)
                      : undefined
                  }
                />
              )}
            </View>
          </ScrollView>

          {/* Footer con botones */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.clearButton, { backgroundColor: colors.buttonSecondary, borderColor: colors.buttonSecondaryBorder }]}
              onPress={handleClearFilters}
            >
              <Text style={[styles.clearButtonText, { color: colors.buttonSecondaryText }]}>Limpiar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.applyButton, { backgroundColor: colors.buttonPrimary }]} onPress={handleApply}>
              <Text style={[styles.applyButtonText, { color: colors.buttonPrimaryText }]}>Aplicar filtros</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================================
// ESTILOS
// ============================================================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  tiposContainer: {
    gap: 8,
  },
  tipoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  tipoButtonActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  tipoButtonText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  tipoButtonTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  dateButtonText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  clearButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  clearButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  applyButton: {
    flex: 2,
    paddingVertical: 14,
    backgroundColor: '#0066FF',
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
