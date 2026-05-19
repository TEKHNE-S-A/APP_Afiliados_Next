# Integración SOAP - Obra Social

## 🔗 Conexión con el servicio WSDL

La aplicación ahora se conecta al servicio real de la obra social:

**WSDL:** `http://tkqa.tekhne.com.ar:8700/PRODUCTO_BENEF_QA/com.tekhne.abe_ws?WSDL`

### Servicios SOAP disponibles:

1. **APPDATOSCREDENCIALES** - Obtener datos de credencial del afiliado
2. **APPBUSCACUIL** - Buscar CUIL por DNI y sexo
3. **REGISTRACION** - Registrar nuevo usuario
4. **VALIDAAFIREG** - Validar afiliado registrado (login)

## 🚀 Inicio Rápido

### Backend

```powershell
cd backend
npm install
node server-soap.js
```

El backend escuchará en `http://0.0.0.0:3000` y se conectará automáticamente al servicio SOAP.

### Mobile

```powershell
cd mobile
npx expo start
# Presiona 'a' para Android
```

## 📱 Flujo de Usuario

### 1. Registro (POST /register)

El usuario puede registrarse proporcionando:

**Requerido:**
- `email` (válido, con `@`) — obligatorio tanto con GAM habilitado como deshabilitado
- `password` (mínimo 6 caracteres)
- Al menos uno de: `cuil`, `dni`, o `nroAfiliado`
- `fechaNacimiento` (formato: YYYY-MM-DD)
- `sexo` (M/F)
- `cantidadIntegrantes` (número)

**Ejemplo:**
```json
POST /register
{
  "dni": "12345678",
  "fechaNacimiento": "1985-05-15",
  "sexo": "M",
  "cantidadIntegrantes": 3,
  "email": "ejemplo@email.com",
  "password": "miClave123"
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Usuario registrado exitosamente",
  "data": { ... }
}
```

### 2. Login (POST /auth/login)

Después del registro, el usuario puede iniciar sesión:

```json
POST /auth/login
{
  "username": "cuil o dni o nroAfiliado",
  "password": "contraseña"
}
```

**Respuesta:**
```json
{
  "token": "base64token...",
  "user": { "username": "..." },
  "message": "Login exitoso"
}
```

### 3. Recuperar Contraseña (POST /auth/recover-password)

```json
POST /auth/recover-password
{
  "email": "ejemplo@email.com"
}
```

### 4. Buscar CUIL (GET /buscar-cuil)

```
GET /buscar-cuil?dni=12345678&sexo=M
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "cuil": "20-12345678-9"
  }
}
```

### 5. Obtener Credencial (GET /credencial)

```
GET /credencial
Authorization: Bearer <token>
```

**Respuesta:**
```json
{
  "data": {
    "numeroAfiliado": "123456789",
    "nombre": "Juan",
    "apellido": "Pérez",
    "dni": "12345678",
    "fechaNacimiento": "1985-05-15",
    "parentesco": "Titular",
    "plan": "Plan 210",
    "vigenciaDesde": "2020-01-01",
    "imagenFondo": "url...",
    "fotoPerfil": "url..."
  }
}
```

## 🔧 Configuración

### Backend (`backend/server-soap.js`)

- **Puerto:** 3000
- **WSDL URL:** Configurado en la constante `WSDL_URL`
- **Modo fallback:** Si el servicio SOAP no está disponible, el backend funciona en modo mock

### Mobile (`mobile/src/config.ts`)

```typescript
export const USE_MOCK = false
export const API_BASE_URL = 'http://10.0.2.2:3000' // Para AVD Android
// Para dispositivo físico con USB: usar IP del host (ej: http://192.168.1.100:3000)
```

## 📋 Nuevas Pantallas

### RegisterScreen (`mobile/src/screens/RegisterScreen.tsx`)

Formulario completo de registro con:
- Campos de identificación (CUIL/DNI/N° Afiliado)
- Fecha de nacimiento
- Sexo (selector)
- Cantidad de integrantes del grupo familiar
- Email opcional
- Validación de campos requeridos
- Navegación a Login después del registro exitoso

### LoginScreen (actualizado)

- Diseño mejorado con header
- Botón "¿Olvidaste tu contraseña?" → recuperación por email
- Botón "Registrarse" → navegación a pantalla de registro

## 🧪 Testing

### Probar registro desde la app:

1. Abrir app en emulador/dispositivo
2. Presionar "Registrarse"
3. Completar formulario (usar datos de prueba válidos)
4. Presionar "Registrarse"
5. Si es exitoso, ir a Login

### Probar desde navegador (interfaz web):

Abrir `http://localhost:3000` y usar la interfaz HTML para probar endpoints.

### Probar con Postman/cURL:

```powershell
# Registro
Invoke-RestMethod -Uri http://localhost:3000/register -Method POST -ContentType "application/json" -Body '{"dni":"12345678","fechaNacimiento":"1985-05-15","sexo":"M","cantidadIntegrantes":3}'

# Login
Invoke-RestMethod -Uri http://localhost:3000/auth/login -Method POST -ContentType "application/json" -Body '{"username":"12345678","password":"test123"}'

# Buscar CUIL
Invoke-RestMethod -Uri "http://localhost:3000/buscar-cuil?dni=12345678&sexo=M"
```

## ⚠️ Notas Importantes

1. **Conexión SOAP:** El backend intenta conectarse al servicio SOAP al iniciar. Si falla, continúa en modo mock.

2. **Métodos SOAP reales:** Los métodos exactos del SOAP (nombres de parámetros, estructura de respuesta) pueden variar. Verifica los logs del backend para ver la respuesta real del servicio.

3. **Seguridad:** Este es un backend de desarrollo. En producción:
   - Usar HTTPS
   - Implementar hash de contraseñas (bcrypt)
   - Usar base de datos persistente
   - Implementar rate limiting
   - Validar y sanitizar inputs

4. **Almacenamiento:** Actualmente usa `Map` en memoria. Los datos se pierden al reiniciar el servidor.

## 📝 Próximos Pasos

- [ ] Mapear respuestas reales del SOAP a la estructura esperada
- [ ] Implementar envío de emails para recuperación de contraseña
- [ ] Persistir datos en base de datos (MongoDB/PostgreSQL)
- [ ] Agregar validación de DNI/CUIL argentino
- [ ] Implementar refresh tokens
- [ ] Tests unitarios para endpoints SOAP

## 🐛 Troubleshooting

**Error: "Unable to connect to WSDL"**
- Verificar conectividad de red al servidor `tkqa.tekhne.com.ar:8700`
- El backend continuará en modo mock

**Error: "SOAP method not found"**
- Verificar nombres exactos de métodos en logs del backend
- Ajustar llamadas en `server-soap.js` según estructura real

**App no se conecta al backend**
- Para AVD: usar `http://10.0.2.2:3000`
- Para dispositivo físico: usar IP del host en la misma red
- Verificar que el backend esté corriendo (`netstat -ano | findstr :3000`)
