# Backend — APP_Afiliados (SOAP + Demo)

Este backend ofrece dos modos:

- SOAP (real): `server-soap.js` con Express + `node-soap` integrado al WSDL de Tekhne (Execute).
- Demo (mock): `server.js` sin dependencias externas para pruebas rápidas.

## Endpoints disponibles

### Autenticación y Usuario
- `POST /auth/login` — Login (en modo SOAP valida en el servicio; en modo demo usa `demo/demo123`)
- `GET /auth/me` — Perfil del usuario (requiere `Authorization: Bearer <token>`)
- `POST /register` — Registrar nuevo usuario
- `POST /auth/recover-password` — Recuperar contraseña

### Credenciales
- `GET /credenciales` — Lista de credenciales del grupo familiar
- `GET /credenciales/refresh` — Forzar sincronización con SOAP
- `GET /credencial` — Datos de credencial individual

### Sistema de Configuración
El backend utiliza un **sistema interno de parámetros** basado en la tabla `nusispar`:
- ⚙️ Parámetros cargados en memoria al iniciar (cache con TTL de 1 minuto)
- 🔄 Recarga automática cada 5 minutos
- 📊 Configura comportamientos de la aplicación (vigencia credenciales, timeouts, etc.)
- 🔧 Gestión directa en PostgreSQL o script PowerShell `manage-parametros.ps1`
- 🌐 Interfaz web ABM: `http://localhost:3000/admin` (login: admin/admin123)

### Endpoints Administrativos
- `GET /admin/parametros` — Listar todos los parámetros (requiere autenticación)
- `GET /admin/parametros/:grupo` — Filtrar por grupo
- `GET /admin/parametros/:grupo/:tipo` — Obtener parámetro específico
- `PUT /admin/parametros/:grupo/:tipo` — Actualizar parámetro
- `POST /admin/parametros` — Crear nuevo parámetro
- `DELETE /admin/parametros/:grupo/:tipo` — Eliminar parámetro

### Endpoints SIA (Sistema Integral de Autorizaciones)
- `POST /sia/solicitudes` — REC_SOLICITUDES_APP (requiere auth, usa nuusuid)
- `POST /sia/autorizacion-imprimir` — AUTORIZACION_IMPRIMIR (requiere auth)
- `POST /sia/prestaciones` — REC_PRESTACIONES_APP (sin parámetros)
- `POST /sia/pago-coseguro` — PAGO_COSEGURO_APP (por definir)
- `GET /sia/coseguros-pendientes` — COSEGUROS_PENDIENTES_APP (requiere auth)
- `POST /sia/enrolamientos` — ENROLAMIENTOS
- `GET /sia/historial-atencion` — HISTORIAL_ATENCION_APP (requiere auth, paginación)
- `GET /sia/detalle-consumo` — AUDETALLE_CONSUMO_APP

📖 **Documentación completa**: Ver `SIA_SERVICES.md` y `SIA_SOAP_EXAMPLES.md`

### Otros
- `GET /health` — Health check
- `GET /buscar-cuil?dni=X&sexo=M` — Buscar CUIL
- `GET /transactions` — Transacciones de ejemplo
- `GET /notifications` — Notificaciones de ejemplo
- `GET /profile` — Perfil demo

## Inicio rápido

```powershell
cd backend
# Modo SOAP (real)
npm start
# o
npm run dev

# Modo demo (mock)
npm run start:mock
```

Comprobar estado SOAP:

```powershell
Invoke-RestMethod http://localhost:3000/debug/soap
# Debe mostrar: useSoapFlag=true, soapConnected=true y endpoint=https://...
```

El servidor escucha en `0.0.0.0:3000` para aceptar conexiones desde cualquier interfaz.

## Docker y uploads en Test

La imagen runtime del backend ejecuta como usuario no root. Si en Docker/Linux montás `./backend/uploads:/app/uploads` y el directorio del host no tiene permisos de escritura para ese usuario, los endpoints de subida fallan con errores tipo `EACCES: permission denied, open '/app/uploads/planes/...'`.

El backend ahora soporta `UPLOADS_DIR` para fijar una ruta de uploads y, si esa ruta no es escribible, intenta un fallback temporal. Aun así, en Test conviene corregir el despliegue para que los archivos queden persistidos y servibles desde la misma ruta.

Configuración recomendada para Test:

```yaml
services:
   backend:
      environment:
         PORT: 3000
         NODE_ENV: production
         UPLOADS_DIR: /app/uploads
      volumes:
         - ./backend/uploads:/app/uploads
```

En el host Linux, crear y ajustar permisos antes de levantar el contenedor:

```bash
mkdir -p backend/uploads/planes backend/uploads/noticias backend/uploads/tmp
chown -R 1000:1000 backend/uploads
chmod -R 775 backend/uploads
```

Si no querés depender del UID/GID del contenedor, una alternativa más estable es usar un volumen administrado por Docker en vez de un bind mount del host.

## Configurar la app móvil

Edita `mobile/src/config.ts` según tu entorno:

1. **Web (Expo)**: `http://localhost:3000`
2. **AVD (emulador Android)**: `http://10.0.2.2:3000`
3. **Dispositivo físico (USB + adb reverse)**:
   ```powershell
   adb reverse tcp:3000 tcp:3000
   # Luego en config.ts: http://localhost:3000
   ```
4. **Dispositivo físico (WiFi/LAN)**: `http://<IP_DE_TU_PC>:3000`
   - Obtén tu IP: `ipconfig` (Windows) o `ifconfig` (Mac/Linux)
   - Asegúrate de que el firewall permita conexiones en el puerto 3000

## Probar el backend

```powershell
# Health check
Invoke-RestMethod http://localhost:3000/health

# Login (SOAP: valida contra servicio; Demo: demo/demo123)
$body = @{ username = 'usuario'; password = 'secreto' } | ConvertTo-Json
$response = Invoke-RestMethod -Uri http://localhost:3000/auth/login -Method POST -Body $body -ContentType 'application/json'
$response | Format-List

# Obtener perfil (usa el token del login)
$token = $response.token
$headers = @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Uri http://localhost:3000/auth/me -Headers $headers
```

## Payload recomendado para `/auth/login` (SOAP VALIDAAFIREG)

Para evitar los errores de "no informado" del servicio VALIDAAFIREG, incluye además del `username` y `password` los siguientes datos si los tienes:

```json
{
   "username": "20282939180",
   "password": "123456",
   "dni": "20282939180",              // opcional; o usa "cuil"
   "cuil": "20282939180",            // opcional; alternativamente al dni
   "fechaNacimiento": "1990-01-01",  // formato YYYY-MM-DD
   "sexo": "M",                      // 'M' o 'F'
   "cantidadIntegrantes": 2           // entero
}
```

El backend los mapeará a los nombres esperados por el servicio:
- `Documento` (desde `dni`) o `CUIL` (desde `cuil`)
- `FechaNacimiento` (desde `fechaNacimiento`)
- `Sexo` (desde `sexo`)
- `CantidadIntegrantes` (desde `cantidadIntegrantes`)

Respuesta típica exitosa:

```json
{
   "token": "<token>",
   "user": { "username": "20282939180" },
   "resultado": { /* datos del SOAP si disponibles */ },
   "mensajes": [ /* mensajes del SOAP si disponibles */ ]
}
```

## Notas

- Usuario demo (modo mock): `username: 'demo'`, `password: 'demo123'`
- Los tokens se almacenan en memoria (se pierden al reiniciar el servidor)
- CORS habilitado para desarrollo local
 - Endpoint diagnóstico: `GET /debug/soap` (estado SOAP, endpoint, flags)
