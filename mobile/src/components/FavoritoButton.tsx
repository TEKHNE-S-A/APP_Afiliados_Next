import React, { useEffect, useState } from 'react'
import { TouchableOpacity, StyleSheet, Animated } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface FavoritoButtonProps {
  caentid: string
  isFavorito: boolean
  onToggle: (isFav: boolean) => Promise<void | boolean>
  size?: number
  color?: string
  favoriteColor?: string
}

/**
 * Botón de favorito con animación
 * 
 * Muestra estrella llena si es favorito, vacía si no
 * Anima la transición
 */
export function FavoritoButton({
  isFavorito: isInitialFavorito,
  onToggle,
  size = 28,
  color = '#666',
  favoriteColor = '#FF9800'
}: FavoritoButtonProps) {
  const [isFavorito, setIsFavorito] = useState(isInitialFavorito)
  const [loading, setLoading] = useState(false)
  const scaleAnim = React.useRef(new Animated.Value(1)).current

  useEffect(() => {
    setIsFavorito(isInitialFavorito)
  }, [isInitialFavorito])

  const handlePress = async () => {
    if (loading) return

    try {
      setLoading(true)

      // Animar
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.3,
          duration: 100,
          useNativeDriver: true
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true
        })
      ]).start()

      // Cambiar estado localmente primero (optimistic update)
      const nuevoFavorito = !isFavorito
      setIsFavorito(nuevoFavorito)

      // Llamar el callback
      await onToggle(nuevoFavorito)
    } catch (error) {
      console.error('Error en FavoritoButton:', error)
      // Revertir en caso de error
      setIsFavorito(!isFavorito)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={handlePress}
        disabled={loading}
        style={styles.button}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isFavorito ? 'star' : 'star-outline'}
          size={size}
          color={isFavorito ? favoriteColor : color}
        />
      </TouchableOpacity>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  button: {
    padding: 8,
    borderRadius: 20
  }
})


