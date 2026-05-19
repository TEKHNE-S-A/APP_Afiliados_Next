# 🧪 Prueba de Migración Automática con App Móvil

Fecha: 18 de febrero de 2026

## 📊 Estado Actual de Usuarios

### ✅ Usuarios ya migrados a GAM (2):
- `nuevo@test.com` → GUID: `5e9535f4...`
- `nuevo3@test.com` → GUID: `24025437...`

### 🔄 Usuarios LEGACY pendientes de migración (6):
- `admin@osep.gob.ar` (password: admin123)
- `admin@test.local` (password: admin123)
- `nuevo1@test.com` (password: 12345678)
- `nuevo2@test.com` (password: 12345678)
- `superadmin@osep.gob.ar` (password: admin123)
- `ybañez@gmail.com` (password: 12345678)

---

## 🚀 Pasos para Probar

### 1. Iniciar App Móvil

#### Opción A: Emulador Android (AVD)
```powershell
cd E:\MisProyectos\appmovil\APP_Afiliados\mobile
npx expo start
# Presionar 'a' para Android
```

#### Opción B: Dispositivo físico
```powershell
cd E:\MisProyectos\appmovil\APP_Afiliados\mobile
npx expo start
# Escanear QR con Expo Go
```

### 2. Configurar API Base URL

Verificar que `mobile/src/config.ts` tenga:
```typescript
// Para AVD (emulador Android):
export const API_BASE_URL = 'http://10.0.2.2:3000';

// Para dispositivo físico (misma red WiFi):
export const API_BASE_URL = 'http://TU_IP_LOCAL:3000';
```

### 3. Hacer Login con Usuario LEGACY

En la pantalla de login de la app:

**Prueba 1: nuevo1@test.com (LEGACY)**
- Email: `nuevo1@test.com`
- Password: `12345678`
- **Resultado esperado**: 
  - Login exitoso ✅
  - Migración automática LEGACY → GAM ✅
  - Credenciales sincronizadas ✅

**Prueba 2: nuevo2@test.com (LEGACY)**
- Email: `nuevo2@test.com`
- Password: `12345678`
- **Resultado esperado**: Similar a Prueba 1

**Prueba 3: nuevo@test.com (YA MIGRADO)**
- Email: `nuevo@test.com`
- Password: `12345678`
- **Resultado esperado**: 
  - Login exitoso ✅
  - SIN migración (ya está en GAM) ✅
  - Credenciales cargadas ✅

### 4. Verificar en Backend (Logs)

Mientras haces login, observa los logs del backend para ver:
```
🔍 Buscando usuario por GUID: nuevo1@test.com...
ℹ️  No encontrado por GUID. Buscando por email...
✅ Usuario encontrado por email
🔄 Usuario LEGACY detectado: 0000000000000000000000000000000000000024
🎯 Iniciando migración automática a GAM...
✅ Migración completada: 0000000000000000000000000000000000000024 → ca87f1be-ac8c-46b8-9652-7cc2e6e58eda
```

### 5. Verificar Migración Exitosa

Después del login, ejecuta:
```powershell
cd E:\MisProyectos\appmovil\APP_Afiliados\backend
node list-users-migration-status.js
```

Deberías ver:
- Usuarios LEGACY: 5 (uno menos)
- Usuarios GAM: 3 (uno más)

---

## 🎯 Qué Observar en la App

### ✅ Indicadores de Éxito:
1. **Login exitoso** sin errores
2. **Pantalla Home** muestra nombre del usuario
3. **Credenciales** del grupo familiar visibles
4. **QR** de credencial se genera correctamente
5. **Token temporal** visible en credencial

### ⚠️ Si algo falla:
- Verificar logs del backend
- Verificar conectividad (AVD usa `10.0.2.2:3000`)
- Verificar que GAM esté disponible
- Revisar contraseña (debe ser la correcta)

---

## 📝 Registro de Pruebas

### Prueba #1
- Usuario: ___________________
- Fecha/Hora: ___________________
- Resultado: ☐ Éxito ☐ Fallo
- Notas: ___________________

### Prueba #2
- Usuario: ___________________
- Fecha/Hora: ___________________
- Resultado: ☐ Éxito ☐ Fallo
- Notas: ___________________

### Prueba #3
- Usuario: ___________________
- Fecha/Hora: ___________________
- Resultado: ☐ Éxito ☐ Fallo
- Notas: ___________________

---

## 🔧 Comandos Útiles

### Ver backend logs en tiempo real
```powershell
# Si backend está en terminal separada, cambia a esa ventana
```

### Listar usuarios actuales
```powershell
cd E:\MisProyectos\appmovil\APP_Afiliados\backend
node list-users-migration-status.js
```

### Revertir un usuario a LEGACY (para re-probar)
```powershell
cd E:\MisProyectos\appmovil\APP_Afiliados\backend
node revert-user-to-legacy.js nuevo1@test.com
```

### Test de login desde línea de comandos
```powershell
cd E:\MisProyectos\appmovil\APP_Afiliados\backend
node test-login-user.js nuevo1@test.com 12345678
```

---

## ✅ Checklist Pre-Prueba

- [ ] Backend corriendo en puerto 3000
- [ ] PostgreSQL corriendo
- [ ] GAM credentials configuradas (clientId: c26AzH82...)
- [ ] FK constraints DEFERRABLE aplicadas
- [ ] App móvil iniciada (Expo)
- [ ] Configuración API_BASE_URL correcta

---

## 🎉 Resultado Esperado Final

Después de probar con todos los usuarios LEGACY:
- **6 usuarios migrados automáticamente** de LEGACY → GAM
- **8 usuarios totales en GAM** (2 previos + 6 nuevos)
- **0 usuarios LEGACY** restantes
- **Migración 100% exitosa** sin intervención manual
- **Sin necesidad de conocer contraseñas** (migración transparente en login)
