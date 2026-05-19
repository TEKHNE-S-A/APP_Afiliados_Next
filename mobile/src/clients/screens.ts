/**
 * Selector de pantallas por cliente.
 *
 * App.tsx importa desde aquí en lugar de hacerlo directamente desde screens/.
 * Agregar un nuevo cliente:
 *   1. Crear carpeta  src/screens/<cliente>/
 *   2. Crear su index.ts con las exportaciones
 *   3. Agregar el case aquí
 *   4. Poner CLIENT_ID=<cliente> en .env
 */
import { CLIENT_ID } from '../config'

// Pantallas base
import * as BaseScreens from '../screens/BaseScreens'

// Pantallas por cliente
import * as OsepScreens from '../screens/osep'

// Re-exportar el conjunto correcto según CLIENT_ID
const Screens = CLIENT_ID === 'osep' ? OsepScreens : BaseScreens

export const {
  LoginScreen,
  RegisterScreen,
  ForgotPasswordScreen,
  OnboardingScreen,
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
  ProfileScreen,
  TransactionsScreen,
} = Screens
