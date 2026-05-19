import React, { useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Animated,
  StatusBar,
  Platform,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Ionicons } from '@expo/vector-icons'
import { APP_VERSION_LABEL } from '../utils/version'

const { width, height } = Dimensions.get('window')

export const ONBOARDING_KEY = 'has_seen_onboarding'

type Slide = {
  id: string
  icon: string
  iconColor: string
  bgGradientTop: string
  bgGradientBottom: string
  title: string
  subtitle: string
}

const slides: Slide[] = [
  {
    id: '1',
    icon: 'shield-checkmark',
    iconColor: '#FFFFFF',
    bgGradientTop: '#2196F3',
    bgGradientBottom: '#1976D2',
    title: 'Bienvenido a APP Afiliados',
    subtitle: 'Tu obra social siempre disponible en la palma de tu mano, donde y cuando lo necesites.',
  },
  {
    id: '2',
    icon: 'card',
    iconColor: '#FFFFFF',
    bgGradientTop: '#667EEA',
    bgGradientBottom: '#4C51BF',
    title: 'Credencial Digital',
    subtitle: 'Accedé a tu credencial y la de tu grupo familiar en cualquier momento, sin necesidad de llevar la tarjeta física.',
  },
  {
    id: '3',
    icon: 'document-text',
    iconColor: '#FFFFFF',
    bgGradientTop: '#10B981',
    bgGradientBottom: '#059669',
    title: 'Trámites en Línea',
    subtitle: 'Gestioná autorizaciones médicas, consultá tu historial de atención y mucho más sin moverte de tu hogar.',
  },
  {
    id: '4',
    icon: 'location',
    iconColor: '#FFFFFF',
    bgGradientTop: '#F59E0B',
    bgGradientBottom: '#D97706',
    title: 'Cartilla Médica',
    subtitle: 'Encontrá prestadores, farmacias y delegaciones cercanas a tu ubicación en tiempo real.',
  },
  {
    id: '5',
    icon: 'cloud-offline',
    iconColor: '#FFFFFF',
    bgGradientTop: '#8B5CF6',
    bgGradientBottom: '#6D28D9',
    title: 'Funciona Offline',
    subtitle: 'Accedé a tu credencial e información incluso sin conexión a internet. Tus datos se guardan de forma segura en tu dispositivo.',
  },
]

type Props = {
  onDone: () => void
}

export default function OnboardingScreen({ onDone }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const flatListRef = useRef<FlatList>(null)
  const scrollX = useRef(new Animated.Value(0)).current

  const handleSkip = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true')
    onDone()
  }

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true })
    } else {
      handleSkip()
    }
  }

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setCurrentIndex(viewableItems[0].index)
    }
  }).current

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current

  const isLast = currentIndex === slides.length - 1

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Botón saltar */}
      {!isLast && (
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip} activeOpacity={0.7}>
          <Text style={styles.skipText}>Saltar</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <Animated.FlatList
        ref={flatListRef}
        data={slides}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item, index }) => {
          const inputRange = [
            (index - 1) * width,
            index * width,
            (index + 1) * width,
          ]
          const iconScale = scrollX.interpolate({
            inputRange,
            outputRange: [0.6, 1, 0.6],
            extrapolate: 'clamp',
          })
          const iconOpacity = scrollX.interpolate({
            inputRange,
            outputRange: [0, 1, 0],
            extrapolate: 'clamp',
          })
          const textTranslateY = scrollX.interpolate({
            inputRange,
            outputRange: [30, 0, 30],
            extrapolate: 'clamp',
          })

          return (
            <View style={[styles.slide, { backgroundColor: item.bgGradientTop, width }]}>
              {/* Círculo de fondo decorativo */}
              <View style={[styles.bgCircleLarge, { backgroundColor: item.bgGradientBottom }]} />
              <View style={[styles.bgCircleSmall, { backgroundColor: item.bgGradientBottom }]} />

              {/* Ícono central */}
              <Animated.View style={[styles.iconContainer, { transform: [{ scale: iconScale }], opacity: iconOpacity }]}>
                <View style={[styles.iconInner, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <Ionicons name={item.icon} size={80} color={item.iconColor} />
                </View>
              </Animated.View>

              {/* Texto */}
              <Animated.View style={[styles.textContainer, { transform: [{ translateY: textTranslateY }], opacity: iconOpacity }]}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.subtitle}>{item.subtitle}</Text>
              </Animated.View>
            </View>
          )
        }}
      />

      {/* Área inferior: dots + botón */}
      <View style={[styles.bottomArea, { backgroundColor: slides[currentIndex].bgGradientTop }]}>
        {/* Indicadores de posición */}
        <View style={styles.dotsRow}>
          {slides.map((_, i) => {
            const dotWidth = scrollX.interpolate({
              inputRange: [(i - 1) * width, i * width, (i + 1) * width],
              outputRange: [8, 24, 8],
              extrapolate: 'clamp',
            })
            const dotOpacity = scrollX.interpolate({
              inputRange: [(i - 1) * width, i * width, (i + 1) * width],
              outputRange: [0.4, 1, 0.4],
              extrapolate: 'clamp',
            })
            return (
              <Animated.View
                key={i}
                style={[styles.dot, { width: dotWidth, opacity: dotOpacity }]}
              />
            )
          })}
        </View>

        {/* Botón principal */}
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          {isLast ? (
            <Text style={styles.nextButtonText}>Comenzar</Text>
          ) : (
            <View style={styles.nextButtonInner}>
              <Text style={styles.nextButtonText}>Siguiente</Text>
              <Ionicons name="arrow-forward" size={18} color="#2196F3" style={{ marginLeft: 6 }} />
            </View>
          )}
        </TouchableOpacity>

        {/* Versión de la app */}
        <Text style={styles.versionText}>{APP_VERSION_LABEL}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 44 : 56,
    right: 20,
    zIndex: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  skipText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bgCircleLarge: {
    position: 'absolute',
    width: width * 1.4,
    height: width * 1.4,
    borderRadius: width * 0.7,
    top: -width * 0.6,
    left: -width * 0.2,
    opacity: 0.35,
  },
  bgCircleSmall: {
    position: 'absolute',
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
    bottom: 120,
    right: -width * 0.2,
    opacity: 0.25,
  },
  iconContainer: {
    marginBottom: 40,
  },
  iconInner: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  textContainer: {
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 14,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '400',
  },
  bottomArea: {
    paddingBottom: Platform.OS === 'android' ? 28 : 40,
    paddingTop: 16,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    height: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 4,
  },
  nextButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 48,
    minWidth: 200,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  nextButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#2196F3',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  versionText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 16,
    letterSpacing: 0.5,
  },
})


