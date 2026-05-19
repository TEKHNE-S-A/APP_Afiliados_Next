import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  SafeAreaView,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../theme'

export interface ModalPickerItem {
  label: string
  value: string
}

interface ModalPickerProps {
  items: ModalPickerItem[]
  selectedValue: string
  onValueChange: (value: string) => void
  placeholder?: string
  style?: object
  disabled?: boolean
}

/**
 * Reemplaza @react-native-picker/picker con un modal nativo compatible con iOS y Android.
 * En iOS, el Picker nativo no renderiza un dropdown sino un "drum/wheel" inline que queda
 * visualmente cortado. Este componente muestra un TouchableOpacity que abre un Modal
 * con lista de opciones, dando la misma UX en ambas plataformas.
 */
export default function ModalPicker({
  items,
  selectedValue,
  onValueChange,
  placeholder = '-- Seleccione una opción --',
  style,
  disabled = false,
}: ModalPickerProps) {
  const { colors } = useTheme()
  const [visible, setVisible] = useState(false)

  const selectedItem = items.find((i) => i.value === selectedValue)
  const displayLabel = selectedItem ? selectedItem.label : placeholder
  const isPlaceholder = !selectedItem

  return (
    <>
      <TouchableOpacity
        style={[
          styles.trigger,
          {
            borderColor: colors.border,
            backgroundColor: colors.inputBackground ?? colors.surface,
          },
          disabled && styles.triggerDisabled,
          style,
        ]}
        onPress={() => !disabled && setVisible(true)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.triggerText,
            { color: isPlaceholder ? (colors.inputPlaceholder ?? '#9CA3AF') : colors.textPrimary },
          ]}
          numberOfLines={1}
        >
          {displayLabel}
        </Text>
        <Ionicons
          name="chevron-down"
          size={18}
          color={disabled ? colors.textMuted : colors.textSecondary}
        />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        />
        <SafeAreaView
          style={[styles.sheet, { backgroundColor: colors.surface }]}
        >
          {/* Handle bar */}
          <View style={styles.handleBar}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          {/* Botón Cancelar */}
          <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setVisible(false)} style={styles.cancelButton}>
              <Text style={[styles.cancelText, { color: colors.primary }]}>Cancelar</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={items}
            keyExtractor={(item, index) => `${item.value}-${index}`}
            renderItem={({ item }) => {
              const isSelected = item.value === selectedValue
              return (
                <TouchableOpacity
                  style={[
                    styles.option,
                    { borderBottomColor: colors.border },
                    isSelected && { backgroundColor: (colors.primary ?? '#2196F3') + '12' },
                  ]}
                  onPress={() => {
                    onValueChange(item.value)
                    setVisible(false)
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { color: isSelected ? colors.primary : colors.textPrimary },
                      isSelected && styles.optionTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )
            }}
            style={styles.list}
            showsVerticalScrollIndicator={false}
          />
        </SafeAreaView>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    marginTop: 8,
    minHeight: 48,
  },
  triggerDisabled: {
    opacity: 0.5,
  },
  triggerText: {
    flex: 1,
    fontSize: 16,
    marginRight: 8,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    maxHeight: '60%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 12,
  },
  handleBar: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.4,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  cancelButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
  list: {
    paddingBottom: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: {
    fontSize: 16,
    flex: 1,
  },
  optionTextSelected: {
    fontWeight: '600',
  },
})
