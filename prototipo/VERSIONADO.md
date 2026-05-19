# Control de Versiones — APP Afiliados

## Fuente única de verdad

`mobile/app.json` es el único archivo que define la versión visible al usuario.
La utilidad `mobile/src/utils/version.ts` lo importa y lo expone al resto de la app.

```
mobile/app.json
    └── mobile/src/utils/version.ts (APP_VERSION, APP_VERSION_LABEL)
            ├── OnboardingScreen.tsx  → "v1.0.0" al pie de cada slide
            └── LoginScreen.tsx      → "v1.0.0" al pie del formulario
```

---

## Campos de versión

| Archivo | Campo | Descripción |
|---|---|---|
| `mobile/app.json` | `version` | Versión semántica visible al usuario (ej. `"1.0.0"`) |
| `mobile/app.json` | `android.versionCode` | Entero incremental para Google Play (ej. `1`, `2`, `3`…) |
| `mobile/app.json` | `ios.buildNumber` | String incremental para App Store (ej. `"1"`, `"2"`…) |
| `mobile/package.json` | `version` | Debe coincidir con `app.json` (referencia interna JS) |
| `backend/package.json` | `version` | Debe coincidir con `app.json` (referencia interna Node) |

---

## Cuándo incrementar cada campo

| Tipo de cambio | `version` | `versionCode` / `buildNumber` |
|---|---|---|
| Bug fix menor | `1.0.X` | +1 |
| Feature nueva | `1.X.0` | +1 |
| Cambio de arquitectura mayor | `X.0.0` | +1 |
| Nuevo build sin cambios visibles | sin cambio | +1 |

> `versionCode` y `buildNumber` **siempre deben incrementarse** en cada build enviado a las tiendas, incluso si la versión semántica no cambia.

---

## Cómo actualizar la versión

1. Editar `mobile/app.json`:
   ```json
   {
     "expo": {
       "version": "1.1.0",
       "android": { "versionCode": 2 },
       "ios":     { "buildNumber": "2" }
     }
   }
   ```

2. Editar `mobile/package.json` y `backend/package.json`:
   ```json
   { "version": "1.1.0" }
   ```

3. Crear tag en git:
   ```powershell
   git tag v1.1.0
   git push origin v1.1.0
   ```

---

## Historial de versiones

| Versión | versionCode | Fecha | Descripción |
|---|---|---|---|
| 1.0.0 | 1 | 2026-04-21 | Primera versión unificada. Versionado visible en Onboarding y Login. |
