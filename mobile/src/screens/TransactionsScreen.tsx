import React from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native'
import { useTheme } from '../theme'

const sample = [
  { id: 't1', title: 'Solicitud de afiliación', status: 'En progreso', date: '2025-11-20' },
  { id: 't2', title: 'Actualización de datos', status: 'Finalizado', date: '2025-11-15' },
  { id: 't3', title: 'Consulta de beneficios', status: 'Pendiente', date: '2025-11-25' },
  { id: 't4', title: 'Cambio de domicilio', status: 'En progreso', date: '2025-11-22' },
]

function getStatusColor(status: string) {
  if (status === 'Finalizado') return '#4CAF50'
  if (status === 'En progreso') return '#FF9800'
  return '#9C27B0'
}

export default function TransactionsScreen() {
  const { colors } = useTheme()

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Mis Trámites</Text>
      <FlatList
        data={sample}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.item, { backgroundColor: colors.card }]} onPress={() => alert(`Detalle: ${item.title}`)}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{item.status}</Text>
            </View>
            <View style={styles.itemContent}>
              <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{item.title}</Text>
              <Text style={[styles.itemDate, { color: colors.textMuted }]}>{item.date}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f5f5f5' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  item: { flexDirection: 'row', backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 12, alignItems: 'flex-start' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginRight: 12 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  itemContent: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  itemDate: { fontSize: 12, color: '#999' }
})
