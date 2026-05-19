import { useEffect, useRef, useState } from 'react';
import * as Device from 'expo-device';
import { Platform, LogBox } from 'react-native';
import Constants from 'expo-constants';
import { apiPost } from '../services/api';

// Suprimir advertencias/errores de expo-notifications en Expo Go (SDK 53+)
// LogBox es el canal correcto para el panel rojo/amarillo de Expo Go
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  '`expo-notifications` functionality is not fully supported in Expo Go',
]);

// Detectar si la app corre en Expo Go (no soporta push remotas en Android SDK 53+)
// SDK 54+: usar executionEnvironment === 'storeClient' (appOwnership deprecated)
// Fallback a appOwnership para compatibilidad con SDK anteriores
const isExpoGo =
  Constants.executionEnvironment === 'storeClient' ||
  (Constants as unknown as { appOwnership?: string }).appOwnership === 'expo';

if (__DEV__) {
  console.log(`[PushNotif] executionEnvironment="${Constants.executionEnvironment}", isExpoGo=${isExpoGo}`)
}

// En Expo Go NO importamos expo-notifications a nivel de módulo para evitar el
// error "Android Push notifications removed from Expo Go" (SDK 53+).
// Usamos require() condicional para que el módulo solo se cargue en dev/prod builds.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NotificationsModule = typeof import('expo-notifications');
const Notifications: NotificationsModule = isExpoGo
  ? ({
      setNotificationHandler: () => {},
      addNotificationReceivedListener: () => ({ remove: () => {} }),
      addNotificationResponseReceivedListener: () => ({ remove: () => {} }),
      getLastNotificationResponseAsync: async () => null,
      getPermissionsAsync: async () => ({ status: 'denied' }),
      requestPermissionsAsync: async () => ({ status: 'denied' }),
      setNotificationChannelAsync: async () => {},
      getExpoPushTokenAsync: async () => ({ data: '' }),
      AndroidImportance: { MAX: 5 },
    } as unknown as NotificationsModule)
  : (require('expo-notifications') as NotificationsModule);

// Configurar comportamiento de notificaciones en primer plano (solo en dev/prod builds)
if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export interface PushNotificationData {
  tipo?: string;
  notificationId?: string;
  solicitudId?: string;
  screen?: string;
  [key: string]: unknown;
}

interface UsePushNotificationsOptions {
  /** Callback invocado cuando el usuario toca una notificación push */
  onNotificationTap?: (data: PushNotificationData) => void;
}

export function usePushNotifications(options: UsePushNotificationsOptions = {}) {
  const { onNotificationTap } = options;
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<import('expo-notifications').Notification | null>(null);
  const notificationListener = useRef<{ remove: () => void } | undefined>(undefined);
  const responseListener = useRef<{ remove: () => void } | undefined>(undefined);
  // Ref para acceder siempre al callback más reciente sin re-subscribir
  const onTapRef = useRef(onNotificationTap);
  useEffect(() => { onTapRef.current = onNotificationTap; }, [onNotificationTap]);

  useEffect(() => {
    // En Expo Go (SDK 53+) las push remotas no están disponibles: solo registrar token
    registerForPushNotificationsAsync().then(token => setExpoPushToken(token));

    if (isExpoGo) {
      // En Expo Go no intentar suscribir listeners de notificaciones remotas
      return;
    }

    // Manejar notificación que abrió la app desde estado killed/background
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (response) {
        const data = (response.notification.request.content.data ?? {}) as PushNotificationData;
        console.log('🚀 App abierta desde notificación push:', data);
        onTapRef.current?.(data);
      }
    });

    // Listener: notificación recibida mientras la app está abierta (foreground)
    notificationListener.current = Notifications.addNotificationReceivedListener(notif => {
      setNotification(notif);
      console.log('📬 Notificación recibida en foreground:', notif.request.content.title);
    });

    // Listener: usuario toca la notificación (foreground / background)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = (response.notification.request.content.data ?? {}) as PushNotificationData;
      console.log('👆 Notificación tocada:', data);
      onTapRef.current?.(data);
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return {
    expoPushToken,
    notification,
  };
}

async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Expo Go en SDK 53+ no soporta push notifications remotas en Android
  if (isExpoGo) {
    console.log('ℹ️  Push notifications remotas no disponibles en Expo Go (SDK 53+). Usar development build.');
    return null;
  }

  let token: string | null = null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('⚠️ Permiso de notificaciones denegado');
      return null;
    }
    
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    })).data;
    console.log('✅ Push token obtenido:', token);
  } else {
    console.log('⚠️ Usar dispositivo físico para push notifications');
  }

  return token;
}

// Función para registrar token en el backend
export async function registerPushToken(token: string): Promise<boolean> {
  try {
    const platform = Platform.OS; // 'ios' | 'android' | 'web'
    
    await apiPost('/notifications/register-token', {
      pushToken: token,
      plataforma: platform,
    });
    
    console.log('✅ Push token registrado en backend');
    return true;
  } catch (error) {
    console.error('❌ Error registrando push token:', error);
    return false;
  }
}
