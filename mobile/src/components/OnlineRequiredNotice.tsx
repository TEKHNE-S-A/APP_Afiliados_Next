import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../theme'

type OnlineRequiredNoticeProps = {
  visible: boolean
  message?: string
}

export function OnlineRequiredNotice({ visible, message }: OnlineRequiredNoticeProps) {
  const { colors } = useTheme()
  if (!visible) return null

  return (
    <View style={[styles.container, { backgroundColor: colors.warning + '20', borderColor: colors.warning }]}>
      <Ionicons name="wifi" size={18} color={colors.warningDark} />
      <Text style={[styles.text, { color: colors.warningDark }]}>
        {message ||
          'Necesitás conexión a Internet para usar esta función. Desactivá el modo avión e intentá nuevamente.'}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFEDD5',
    borderColor: '#FDBA74',
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  text: {
    flex: 1,
    color: '#7C2D12',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
})
