import React from 'react'
import { View, ScrollView, Dimensions, StyleSheet, Text, NativeSyntheticEvent, NativeScrollEvent } from 'react-native'
import { Credencial } from '../types/credencial'
import { useTheme } from '../theme'

const { width } = Dimensions.get('window')

interface CredencialesCarouselProps {
  credenciales: Credencial[]
  currentIndex: number
  onIndexChange: (index: number) => void
  renderItem: (credencial: Credencial, index: number) => React.ReactNode
}

const CredencialesCarousel: React.FC<CredencialesCarouselProps> = ({
  credenciales,
  currentIndex,
  onIndexChange,
  renderItem
}) => {
  const scrollViewRef = React.useRef<ScrollView>(null)
  const { colors } = useTheme()
  
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x
    const index = Math.round(contentOffsetX / width)
    if (index !== currentIndex && index >= 0 && index < credenciales.length) {
      onIndexChange(index)
    }
  }
  
  if (!credenciales || credenciales.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>No hay credenciales disponibles</Text>
      </View>
    )
  }
  
  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={width}
        snapToAlignment="center"
        contentContainerStyle={styles.scrollContent}
      >
        {credenciales.map((credencial, index) => (
          <View key={credencial.crcreid} style={styles.page}>
            {renderItem(credencial, index)}
          </View>
        ))}
      </ScrollView>
      
      {/* Indicadores de paginación */}
      <View style={styles.pagination}>
        {credenciales.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === currentIndex ? [styles.dotActive, { backgroundColor: colors.primary }] : { backgroundColor: colors.borderLight }
            ]}
          />
        ))}
      </View>
      
      {/* Contador */}
      <View style={styles.counter}>
        <Text style={[styles.counterText, { color: colors.textSecondary }]}>
          {currentIndex + 1} / {credenciales.length}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
  },
  page: {
    width: width,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: '#667eea',
    width: 24,
  },
  dotInactive: {
    backgroundColor: '#D1D5DB',
  },
  counter: {
    alignItems: 'center',
    marginBottom: 16,
  },
  counterText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
  },
})

export default CredencialesCarousel
