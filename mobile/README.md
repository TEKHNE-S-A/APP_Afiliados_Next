# APP Afiliados - Mobile

Aplicación móvil React Native + Expo para afiliados, conectada al backend local en puerto `3000`.

## Requisitos

- Node.js 18+
- npm
- Android SDK/JDK (para APK release)

## Desarrollo local

```powershell
cd mobile
npm install --legacy-peer-deps
npx expo start
```

## Configuración API y ubicación

Se configura desde `mobile/.env`:

- `USE_MOCK=false`
- `API_BASE_URL_ANDROID=http://10.0.2.2:3000` (AVD)
- `USE_MOCK_LOCATION=false`

Notas importantes:

- En **dispositivo físico Android por USB**, la app usa `adb reverse tcp:3000 tcp:3000` y resuelve backend local.
- En build **release**, la ubicación mock no se usa; siempre toma ubicación real del dispositivo.
- Los módulos de `Prestadores`, `Farmacias` y `Delegaciones` incluyen botón **Usar mi ubicación** para recalcular resultados por distancia.

## Build APK (release)

Desde la raíz del repo:

```powershell
cd ..
.\build-apk.ps1
```

Perfiles soportados:

```powershell
# Usa mobile/.env y mobile/.env.production tal como están
.\build-apk.ps1 -Profile default

# Fuerza build QA/Test usando mobile/.env.test sin tocar manualmente .env
.\build-apk.ps1 -Profile test

# Fuerza build Production usando mobile/.env.production
.\build-apk.ps1 -Profile production
```

Notas:

- El script reemplaza temporalmente los archivos de entorno usados por Expo durante el build y los restaura al finalizar.
- El perfil de QA/Test se define en [mobile/.env.test](mobile/.env.test).

Salida:

- `dist/apk/app-release-latest.apk`
- `dist/apk/app-release-YYYYMMDD-HHmmss.apk`

Instalación por USB:

```powershell
$adb = "C:\Android-SDK18U12\platform-tools\adb.exe"
& $adb -s <SERIAL> reverse tcp:3000 tcp:3000
& $adb -s <SERIAL> install -r "E:\MisProyectos\appmovil\APP_Afiliados\dist\apk\app-release-latest.apk"
```

## Publicación Android/iOS (assets + metadata)

- Configuración de ícono/splash y metadata técnica: `mobile/app.json`
- Plantilla Google Play: `mobile/store-metadata/android-google-play.es-AR.md`
- Plantilla App Store: `mobile/store-metadata/ios-app-store.es-AR.md`
- Estructura de capturas: `mobile/store-assets/README.md`
