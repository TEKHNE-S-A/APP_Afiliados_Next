/**
 * Pantallas del cliente OSEP.
 *
 * - Las pantallas marcadas con "OSEP" tienen su propio diseño en esta carpeta.
 * - Las pantallas marcadas con "BASE" re-exportan la implementación base
 *   hasta que se rediseñen para OSEP.
 *
 * Para rediseñar una pantalla:
 *   1. Crear el archivo en esta misma carpeta (ej: RegisterScreen.tsx)
 *   2. Cambiar el import de "BASE" a "OSEP" en este índice.
 */

// ── OSEP (diseño propio) ──────────────────────────────────────────────────────
export { default as LoginScreen }          from './LoginScreen'
export { default as HomeScreen }           from './HomeScreen'
export { default as CredencialesScreen }   from './CredencialesScreen'

// ── BASE (aún no rediseñadas para OSEP) ───────────────────────────────────────
export { default as RegisterScreen }              from '../RegisterScreen'
export { default as ForgotPasswordScreen }        from '../ForgotPasswordScreen'
export { default as OnboardingScreen }            from '../OnboardingScreen'
export { default as NotificationsScreen }         from '../NotificationsScreen'
export { default as PerfilMenuScreen }            from '../PerfilMenuScreen'
export { default as EnrolamientosScreen }         from '../EnrolamientosScreen'
export { default as HistorialAtencionScreen }     from '../HistorialAtencionScreen'
export { default as CosegurosPendientesScreen }   from '../CosegurosPendientesScreen'
export { default as SolicitudAutorizacionScreen } from '../SolicitudAutorizacionScreen'
export { default as MisAutorizacionesScreen }     from '../MisAutorizacionesScreen'
export { default as AutorizacionDetalleScreen }   from '../AutorizacionDetalleScreen'
export { default as CartillaHubScreen }           from '../CartillaHubScreen'
export { default as CartillaMapScreen }           from '../CartillaMapScreen'
export { default as PrestadorDetalleScreen }      from '../PrestadorDetalleScreen'
export { default as FarmaciasScreen }             from '../FarmaciasScreen'
export { default as FarmaciaDetalleScreen }       from '../FarmaciaDetalleScreen'
export { default as DelegacionesScreen }          from '../DelegacionesScreen'
export { default as DelegacionDetalleScreen }     from '../DelegacionDetalleScreen'
export { default as InfoUtilScreen }              from '../InfoUtilScreen'
export { default as AyudaScreen }                 from '../AyudaScreen'
export { default as NotificationPreferencesScreen } from '../NotificationPreferencesScreen'
export { default as ProfileScreen }               from '../ProfileScreen'
export { default as TransactionsScreen }          from '../TransactionsScreen'
