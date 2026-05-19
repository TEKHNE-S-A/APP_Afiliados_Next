# Build APK de Desarrollo - Instrucciones

## ✅ Método recomendado actual (script raíz)

### APK (para QA interno / instalación por USB)

```powershell
cd E:\MisProyectos\appmovil\APP_Afiliados
.\build-apk.ps1
```

Genera:
- `dist\apk\app-release-latest.apk`
- `dist\apk\app-release-YYYYMMDD-HHmmss.apk`

### AAB (para Play Store — formato requerido)

```powershell
cd E:\MisProyectos\appmovil\APP_Afiliados
.\build-aab.ps1
```

Genera:
- `dist\aab\app-release-latest.aab`
- `dist\aab\app-release-YYYYMMDD-HHmmss.aab`

> **Antes del primer AAB para Play Store:** generar keystore de producción siguiendo `mobile/keystores/README.md` y configurar `mobile/android/gradle.properties`.

Instalar en dispositivo físico por USB:

```powershell
$adb = "C:\Android-SDK18U12\platform-tools\adb.exe"
& $adb -s <SERIAL> reverse tcp:3000 tcp:3000
& $adb -s <SERIAL> install -r "E:\MisProyectos\appmovil\APP_Afiliados\dist\apk\app-release-latest.apk"
```

Nota: para Android release se habilitó tráfico HTTP local (backend en `http://127.0.0.1:3000` vía `adb reverse`).

## Opción 1: Build Local con Android Studio (RECOMENDADO)

### Requisitos:
- Android Studio instalado
- Android SDK configurado
- JDK 11 o superior

### Pasos:

1. **Generar proyecto nativo:**
```powershell
cd E:\MisProyectos\appmovil\APP_Afiliados\mobile
npx expo run:android
```

Este comando:
- Genera carpetas `android/` e `ios/` automáticamente
- Compila el APK de desarrollo
- Lo instala en el dispositivo conectado por USB

2. **Conectar celular por USB:**
- Habilitar "Opciones de desarrollador" en el celular
- Habilitar "Depuración USB"
- Conectar cable USB
- Ejecutar: `adb devices` (debe aparecer tu dispositivo)

3. **Build e instalar:**
```powershell
npx expo run:android --device
```

El APK se instalará automáticamente en tu celular.

---

## Opción 2: Expo Application Services (EAS) - Cloud Build

### Requisitos:
- Cuenta Expo (gratis)
- Configurar EAS CLI

### Pasos:

1. **Instalar EAS CLI:**
```powershell
npm install -g eas-cli
```

2. **Login en Expo:**
```powershell
eas login
```

3. **Configurar proyecto:**
```powershell
eas build:configure
```

4. **Build APK de desarrollo:**
```powershell
eas build --profile development --platform android
```

5. **Esperar ~10 minutos**
6. **Descargar APK** desde el link que te da EAS
7. **Instalar en celular** (habilitar "Instalar apps desconocidas")

---

## Opción 3: Expo Export + Manual Build (Más complejo)

Si las opciones anteriores fallan, se puede hacer export manual del bundle JS y empaquetarlo.

