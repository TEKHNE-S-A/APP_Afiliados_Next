# Store Assets Checklist (Android/iOS)

## Estructura de capturas

### Android
- `screenshots/android/phone/es-AR/`
- `screenshots/android/tablet-7/es-AR/`
- `screenshots/android/tablet-10/es-AR/`

### iOS
- `screenshots/ios/iphone-6.7/es-AR/`
- `screenshots/ios/iphone-6.5/es-AR/`
- `screenshots/ios/ipad-12.9/es-AR/`

## Secuencia recomendada de capturas
1. Login
2. Home con credencial titular
3. Modal de credencial con QR
4. Grupo familiar / carrusel
5. Perfil
6. Prestadores
7. Solicitud de autorización
8. Notificaciones o trámites

## Recomendaciones
- Mantener mismo idioma (es-AR) en todas las capturas.
- Evitar datos personales reales en pantalla.
- Usar misma cuenta de prueba para consistencia visual.
- Exportar PNG sin compresión adicional.

## Script Android (semi-automático)

Desde `mobile/store-assets`:

```powershell
.\capture-android-screenshots.ps1
```

Opcional (dispositivo específico):

```powershell
.\capture-android-screenshots.ps1 -Serial <DEVICE_ID> -DeviceType phone -Locale es-AR
```

Opcional (si `adb` no está en PATH):

```powershell
.\capture-android-screenshots.ps1 -AdbPath "C:\Android-SDK18U12\platform-tools\adb.exe"
```

El script guía 8 pantallas y guarda los PNG en:

- `screenshots/android/phone/es-AR/`

## Tamaños recomendados de tienda

### Android (Google Play)
- Teléfono: relación 16:9 a 9:16 (mínimo 320 px, máximo 3840 px por lado)
- Tablet 7": recomendado set separado
- Tablet 10": recomendado set separado

### iOS (App Store Connect)
- iPhone 6.7": `1290 x 2796`
- iPhone 6.5": `1242 x 2688`
- iPad 12.9": `2048 x 2732`

En Windows, las capturas iOS suelen generarse desde simulador/macOS o desde App Store Connect con export manual.
