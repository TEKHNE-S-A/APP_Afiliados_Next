// Polyfill TextEncoder para react-native-qrcode-svg
import { TextEncoder as TextEncoderPolyfill } from 'text-encoding'
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoderPolyfill
}

import React from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { View, Text, StatusBar, StyleSheet, Animated, Easing } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import OnboardingScreen, { ONBOARDING_KEY } from './screens/OnboardingScreen'
import {
  LoginScreen,
  RegisterScreen,
  ForgotPasswordScreen,
  HomeScreen,
  CredencialesScreen,
  NotificationsScreen,
  PerfilMenuScreen,
  EnrolamientosScreen,
  HistorialAtencionScreen,
  CosegurosPendientesScreen,
  SolicitudAutorizacionScreen,
  MisAutorizacionesScreen,
  AutorizacionDetalleScreen,
  CartillaHubScreen,
  CartillaMapScreen,
  PrestadorDetalleScreen,
  FarmaciasScreen,
  FarmaciaDetalleScreen,
  DelegacionesScreen,
  DelegacionDetalleScreen,
  InfoUtilScreen,
  AyudaScreen,
  NotificationPreferencesScreen,
} from './clients/screens'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider, useTheme } from './theme'
import { setBaseUrl } from './services/api'
import { API_BASE_URL } from './config'
import { useNotifications } from './hooks/useNotifications'
import { NotificationsProvider } from './contexts/NotificationsContext'
import { usePushNotifications, registerPushToken } from './hooks/usePushNotifications'
import { navigationRef, navigateTo, getNavigationTargetFromPushData } from './navigation/navigationRef'
import { CLIENT_ID } from './config'
import OsepSplashScreen from './screens/osep/SplashScreen'
import BottomTabBarFigma from './components/BottomTabBarFigma'
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter'

// Configure API base URL early so the api wrapper uses it
setBaseUrl(API_BASE_URL)

const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()

// Stack Navigator para el menú Perfil
function PerfilStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="PerfilMenu"
        component={PerfilMenuScreen}
        options={{ title: 'Perfil', headerShown: false }}
      />
      <Stack.Screen
        name="SolicitudAutorizacion"
        component={SolicitudAutorizacionScreen}
        options={{ title: 'Nueva Solicitud', headerShown: false }}
      />
      <Stack.Screen
        name="MisAutorizaciones"
        component={MisAutorizacionesScreen}
        options={{ title: 'Mis Autorizaciones', headerShown: false }}
      />
      <Stack.Screen
        name="AutorizacionDetalle"
        component={AutorizacionDetalleScreen}
        options={{ title: 'Detalle', headerShown: false }}
      />
      <Stack.Screen
        name="Enrolamientos"
        component={EnrolamientosScreen}
        options={{ title: 'Enrolamientos', headerShown: false }}
      />
      <Stack.Screen
        name="HistorialAtencion"
        component={HistorialAtencionScreen}
        options={{ title: 'Historial de Atención', headerShown: false }}
      />
      <Stack.Screen
        name="CosegurosPendientes"
        component={CosegurosPendientesScreen}
        options={{ title: 'Coseguros Pendientes', headerShown: false }}
      />
      <Stack.Screen
        name="Credenciales"
        component={CredencialesScreen}
        options={{ title: 'Credenciales', headerShown: false }}
      />
      <Stack.Screen
        name="NotificationPreferences"
        component={NotificationPreferencesScreen}
        options={{ title: 'Notificaciones', headerShown: false }}
      />
      {/* Cartilla (Prestadores, Farmacias, Delegaciones) — accesible desde Menú */}
      <Stack.Screen
        name="CartillaHub"
        component={CartillaHubScreen}
        options={{ title: 'Cartilla', headerShown: false }}
      />
      <Stack.Screen
        name="CartillaMap"
        component={CartillaMapScreen}
        options={{ title: 'Prestadores Cercanos', headerShown: false }}
      />
      <Stack.Screen
        name="PrestadorDetalle"
        component={PrestadorDetalleScreen}
        options={{ title: 'Detalle', headerShown: false }}
      />
      <Stack.Screen
        name="FarmaciasMain"
        component={FarmaciasScreen}
        options={{ title: 'Farmacias Cercanas', headerShown: false }}
      />
      <Stack.Screen
        name="FarmaciaDetalle"
        component={FarmaciaDetalleScreen}
        options={{ title: 'Detalle', headerShown: false }}
      />
      <Stack.Screen
        name="DelegacionesMain"
        component={DelegacionesScreen}
        options={{ title: 'Delegaciones Cercanas', headerShown: false }}
      />
      <Stack.Screen
        name="DelegacionDetalle"
        component={DelegacionDetalleScreen}
        options={{ title: 'Detalle', headerShown: false }}
      />
    </Stack.Navigator>
  )
}

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
    </Stack.Navigator>
  )
}

// Stack Navigator para el tab central Credencial (Figma: tab destacado con círculo)
function CredencialStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CredencialesMain" component={CredencialesScreen} />
    </Stack.Navigator>
  )
}

// Stack Navigator para Info Útil — tab 4 en el diseño Figma
function InfoUtilStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="InfoUtilMain"
        component={InfoUtilScreen}
        options={{ title: 'Info Útil', headerShown: false }}
      />
      <Stack.Screen
        name="Ayuda"
        component={AyudaScreen}
        options={{ title: 'Centro de Ayuda', headerShown: false }}
      />
    </Stack.Navigator>
  )
}

function HomeTabs() {
  const { user, token } = useAuth()
  const { unreadCount } = useNotifications()

  const tabBarBackgroundImageUri = React.useMemo(() => {
    if (!user || typeof user !== 'object') return null

    const u = user as Record<string, unknown>
    const directCandidates = [
      u.tabbar_background_image_url,
      u.tabbarBackgroundImageUrl,
      u.botonera_background_image_url,
      u.botoneraBackgroundImageUrl,
    ]

    for (const value of directCandidates) {
      if (typeof value === 'string' && value.trim()) return value
    }

    const nestedContainers = [u.ui, u.tabbar, u.botonera]
    for (const container of nestedContainers) {
      if (!container || typeof container !== 'object') continue
      const obj = container as Record<string, unknown>
      const nestedCandidates = [
        obj.tabbar_background_image_url,
        obj.tabbarBackgroundImageUrl,
        obj.botonera_background_image_url,
        obj.botoneraBackgroundImageUrl,
      ]
      for (const value of nestedCandidates) {
        if (typeof value === 'string' && value.trim()) return value
      }
    }

    return null
  }, [user])

  // Callback de navegación al tocar notificación push
  const handlePushTap = React.useCallback((data: Record<string, unknown>) => {
    const { screen, params } = getNavigationTargetFromPushData(data as never)
    console.log('🔔 Push tap → navegar a:', screen, params)
    navigateTo(screen, params)
  }, [])

  const { expoPushToken, notification } = usePushNotifications({ onNotificationTap: handlePushTap })

  // Registrar push token en backend al obtenerlo (solo si hay sesión online activa)
  React.useEffect(() => {
    if (expoPushToken && user && token && !token.startsWith('offline_')) {
      registerPushToken(expoPushToken)
        .then(ok => ok && console.log('✅ Push token sincronizado con backend'))
        .catch(() => {/* silencioso — no bloquear la app */})
    }
  }, [expoPushToken, user, token])

  React.useEffect(() => {
    if (notification) {
      console.log('📬 Notificación recibida en foreground:', notification.request.content.title)
    }
  }, [notification])
  
  return (
    <Tab.Navigator
      tabBar={(props) => <BottomTabBarFigma {...props} backgroundImageUri={tabBarBackgroundImageUri} />}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarBadge:
          route.name === 'Notifications' && user && unreadCount > 0 ? unreadCount : undefined,
      })}
    >
      {/* 1. Inicio */}
      <Tab.Screen name="Home" component={HomeStack} options={{ title: 'Inicio' }} />

      {/* 2. Avisos — notificaciones (Figma: tab 2) */}
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Avisos' }}
      />

      {/* 3. Credencial — tab central destacado (Figma: círculo azul) */}
      <Tab.Screen name="CredencialTab" component={CredencialStack} options={{ title: 'Credencial' }} />

      {/* 4. Info útil — información y ayuda (Figma: tab 4) */}
      <Tab.Screen name="InfoUtil" component={InfoUtilStack} options={{ title: 'Info útil' }} />

      {/* 5. Más — menú de perfil, trámites, cartilla */}
      <Tab.Screen
        name="Profile"
        component={PerfilStack}
        options={{ title: 'Más' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault()
            navigation.navigate('Profile', { screen: 'PerfilMenu' } as never)
          },
        })}
      />
    </Tab.Navigator>
  )
}

function RootNavigator() {
  const { user, loading } = useAuth()
  const { colors, isDark } = useTheme()
  const [onboardingChecked, setOnboardingChecked] = React.useState(false)
  const [showOnboarding, setShowOnboarding] = React.useState(false)
  const [minimumSplashElapsed, setMinimumSplashElapsed] = React.useState(false)

  React.useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((val) => {
      setShowOnboarding(val !== 'true')
      setOnboardingChecked(true)
    })
  }, [])

  React.useEffect(() => {
    const timer = setTimeout(() => setMinimumSplashElapsed(true), 1400)
    return () => clearTimeout(timer)
  }, [])

  const navigationTheme = {
    dark: isDark,
    colors: {
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.border,
      notification: colors.tabBadge,
    },
  }

  const shouldShowLaunchScreen = !minimumSplashElapsed || loading || !onboardingChecked

  if (shouldShowLaunchScreen) {
    return CLIENT_ID === 'osep' ? <OsepSplashScreen /> : <AnimatedLaunchScreen />
  }

  if (showOnboarding) {
    return <OnboardingScreen onDone={() => setShowOnboarding(false)} />
  }

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme}>
      {user ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="MainTabs" component={HomeTabs} />
          <Stack.Screen name="CredencialesHome" component={CredencialesScreen} options={{ headerShown: false }} />
          <Stack.Screen name="SolicitudAutorizacionRoot" component={SolicitudAutorizacionScreen} options={{ headerShown: false }} />
          <Stack.Screen name="MisAutorizacionesRoot" component={MisAutorizacionesScreen} options={{ headerShown: false }} />
          <Stack.Screen name="AutorizacionDetalleRoot" component={AutorizacionDetalleScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  )
}

function AnimatedLaunchScreen() {
  const opacity = React.useRef(new Animated.Value(0)).current
  const translateY = React.useRef(new Animated.Value(18)).current
  const pulse = React.useRef(new Animated.Value(0.98)).current

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start()

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.04,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.98,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    )

    pulseAnimation.start()

    return () => pulseAnimation.stop()
  }, [opacity, pulse, translateY])

  return (
    <View style={styles.launchContainer}>
      <View style={styles.launchOrbLarge} />
      <View style={styles.launchOrbSmall} />

      <Animated.Text
        style={[
          styles.launchTitle,
          {
            opacity,
            transform: [{ translateY }, { scale: pulse }],
          },
        ]}
      >
        APP AFILIADOS
      </Animated.Text>

      <Animated.View style={[styles.launchUnderline, { opacity }]} />
      <Animated.Text style={[styles.launchSubtitle, { opacity }]}>OBRA SOCIAL</Animated.Text>
    </View>
  )
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  })

  // Mientras las fuentes cargan, React Native usa la fuente del sistema.
  // No bloqueamos el render para no retrasar el splash screen.
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <NotificationsProvider>
            <AppContent />
          </NotificationsProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}

function AppContent() {
  const { colors, isDark } = useTheme()
  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <RootNavigator />
    </>
  )
}

const styles = StyleSheet.create({
  launchContainer: {
    flex: 1,
    backgroundColor: '#0D47A1',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  launchOrbLarge: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(90, 190, 255, 0.18)',
    top: '20%',
    left: '-10%',
  },
  launchOrbSmall: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: 'rgba(23, 181, 208, 0.22)',
    bottom: '18%',
    right: '-8%',
  },
  launchTitle: {
    fontSize: 38,
    lineHeight: 42,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  launchUnderline: {
    marginTop: 14,
    width: 160,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3DD5F3',
  },
  launchSubtitle: {
    marginTop: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 4,
  },
})
