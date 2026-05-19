/**
 * Referencia global al NavigationContainer.
 * Permite navegar desde fuera de componentes React (e.g., push notification tap).
 */
import { createNavigationContainerRef, NavigationContainerRef } from '@react-navigation/native';

export type RootParamList = {
  MainTabs: { screen?: string } | undefined;
  CredencialesHome: undefined;
  SolicitudAutorizacionRoot: undefined;
  MisAutorizacionesRoot: undefined;
  AutorizacionDetalleRoot: { solicitudId?: string } | undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export const navigationRef = createNavigationContainerRef<RootParamList>();

/**
 * Navega a una pantalla desde cualquier lugar (incluso fuera del árbol React).
 * Si el NavigationContainer aún no está listo, espera hasta 2 segundos.
 */
export function navigateTo(screen: keyof RootParamList, params?: object): void {
  if (navigationRef.isReady()) {
    navigationRef.navigate(screen as never, params as never);
  } else {
    // Reintentar cuando el Container esté listo
    const interval = setInterval(() => {
      if (navigationRef.isReady()) {
        clearInterval(interval);
        navigationRef.navigate(screen as never, params as never);
      }
    }, 100);
    // Timeout de seguridad
    setTimeout(() => clearInterval(interval), 2000);
  }
}

/**
 * Determina la pantalla de destino según el tipo de notificación push.
 */
export function getNavigationTargetFromPushData(data: {
  tipo?: string;
  screen?: string;
  solicitudId?: string;
}): { screen: keyof RootParamList; params?: object } {
  // Ruta explícita desde la notificación
  if (data.screen && data.screen in ({} as RootParamList)) {
    return { screen: data.screen as keyof RootParamList };
  }

  switch (data.tipo) {
    case 'autorizacion':
      if (data.solicitudId) {
        return { screen: 'AutorizacionDetalleRoot', params: { solicitudId: data.solicitudId } };
      }
      return { screen: 'MisAutorizacionesRoot' };
    case 'credencial':
      return { screen: 'MainTabs', params: { screen: 'Home' } };
    default:
      // general, info, warning, etc. → pantalla de notificaciones
      return { screen: 'MainTabs', params: { screen: 'Notifications' } };
  }
}
