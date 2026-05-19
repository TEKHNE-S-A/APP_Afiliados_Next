# Keystores — APP Afiliados IA

Este directorio contiene la keystore de producción para firmar releases Android.
**No comittear archivos `.keystore` ni `.jks` al repositorio.**

## Prerequisito

JDK instalado (incluye `keytool`). Verificar:

```powershell
keytool -version
```

## Generar keystore de producción (una sola vez)

```powershell
cd E:\MisProyectos\appmovil\APP_Afiliados\mobile\keystores

keytool -genkeypair -v `
  -storetype PKCS12 `
  -keystore app-release.keystore `
  -alias app-key `
  -keyalg RSA `
  -keysize 2048 `
  -validity 10000 `
  -dname "CN=APP Afiliados, OU=Sistemas, O=Afiliados, L=Argentina, ST=Argentina, C=AR" `
  -storepass TU_CONTRASEÑA_STORE `
  -keypass TU_CONTRASEÑA_KEY `
  -noprompt
```

**Guardar las contraseñas en un gestor de contraseñas seguro.**

## Configurar Gradle para usar la keystore

Descomentar y completar en `mobile/android/gradle.properties`:

```properties
APP_RELEASE_STORE_FILE=../../keystores/app-release.keystore
APP_RELEASE_STORE_PASSWORD=TU_CONTRASEÑA_STORE
APP_RELEASE_KEY_ALIAS=app-key
APP_RELEASE_KEY_PASSWORD=TU_CONTRASEÑA_KEY
```

> El path es relativo a `mobile/android/app/`.

## Verificar la keystore

```powershell
keytool -list -v -keystore app-release.keystore
```

## Backup obligatorio

Hacer una copia de `app-release.keystore` **fuera del repositorio** (OneDrive, gestor secretos del equipo).
Si se pierde la keystore, no se puede actualizar la app en Play Store para ese applicationId.
