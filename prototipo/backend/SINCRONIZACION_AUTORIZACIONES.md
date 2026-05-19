# Documentación: Sincronización BD con Refresh en Mis Autorizaciones

## Cambio Implementado

### Descripción
El endpoint `GET /mis-autorizaciones` ahora realiza sincronización automática con el servicio SOAP SIA al hacer refresh desde el frontend móvil.

### Flujo de Sincronización

1. **Llamada SOAP**: El endpoint llama a `REC_SOLICITUDES_APP` con parámetros:
   ```json
   {
     "Mode": "DSP",
     "AUSolIdExt": "{nuusuid del usuario}"
   }
   ```

2. **Sincronización BD**: Los datos recibidos del SOAP se guardan/actualizan en la tabla `ausolici`:
   - Si ya existe el registro (por `ausolicid` o `ausolautnu`): se **actualiza**
   - Si no existe: se **inserta** nuevo registro
   
3. **Mapeo de Campos**: Los campos SOAP se mapean al formato esperado por el frontend:
   - `AUSolicId` → `ausolicid`
   - `AUSolRefAfiliado` / `AUSolDescripcion` → `descripcion`
   - `AUSolFecha` → `fecha_alta`
   - `AUSolFechaOrden` → `fecha_orden`
   - `AUSolTipo` → `tipo`
   - `AUSolEstado` → `estado`
   - `AUSolPresCant` → `cantidad`
   - `AUSolObsPref` → `profesional`
   - `AUAutNumero` → `autorizacion_numero`
   - `AUSolPresId` → `tipo_prestacion_id`

### Respuesta JSON

```json
{
  "success": true,
  "autorizaciones": [ /* array de autorizaciones mapeadas */ ],
  "total": 10,
  "sincronizado": true
}
```

### Manejo de Errores

- **Error SOAP**: Devuelve status 400 con mensaje de error del servicio
- **Error sincronización individual**: Log de warning pero continúa con siguiente registro
- **Error general**: Status 500 con detalles del error

### Logs

El endpoint genera logs detallados:
```
📋 ========== GET /mis-autorizaciones (SOAP + BD SYNC) ==========
   Usuario (nuusuid): {nuusuid}
   Servicio: REC_SOLICITUDES_APP
   Acción: Obtener desde SOAP y sincronizar con BD local
   Parámetros SOAP: {"Mode":"DSP","AUSolIdExt":"{nuusuid}"}
   📡 Llamando a callSoapExecuteSIA...
✅ {N} autorizaciones obtenidas desde SIA
   💾 Sincronizando con BD local...
   ✅ Sincronización completada
   ====================================================
```

### Tabla BD: ausolici

Campos sincronizados:
- `nuusuid` (FK a nuusuari)
- `ausolicid` (ID del SOAP)
- `ausoldescr` (descripción)
- `ausolfecal` (fecha alta)
- `ausolfecor` (fecha orden)
- `ausoltipo` (P/S)
- `ausolestad` (estado)
- `ausolcantp` (cantidad)
- `ausolpsoco` (profesional)
- `ausolautnu` (número autorización)
- `autippreid` (ID prestación)

### Frontend (Mobile)

**MisAutorizacionesScreen** usa pull-to-refresh que automáticamente:
1. Llama a `apiGet('/mis-autorizaciones')`
2. El backend sincroniza con SOAP
3. Devuelve datos actualizados
4. Frontend actualiza la lista

**Código relevante**:
```tsx
const onRefresh = async () => {
  setRefreshing(true);
  await fetchAutorizaciones(); // Llama a /mis-autorizaciones
  setRefreshing(false);
};
```

### Archivos Modificados

- `backend/server-soap.js` (líneas 3805-3939): Endpoint completo reescrito
- `backend/fix-mis-autorizaciones.ps1`: Script de aplicación del cambio
- `backend/test-mis-autorizaciones-simple.ps1`: Script de testing

### Pruebas

Para probar manualmente:

```powershell
# 1. Login
$body = '{"username":"usuario@email.com","password":"123456"}'
$resp = Invoke-RestMethod -Uri "http://localhost:3000/auth/login" -Method POST -Body $body -ContentType "application/json"
$token = $resp.token

# 2. Obtener autorizaciones (dispara sincronización)
$headers = @{"Authorization"="Bearer $token"}
Invoke-RestMethod -Uri "http://localhost:3000/mis-autorizaciones" -Method GET -Headers $headers

# 3. Verificar en BD
# SELECT * FROM ausolici WHERE nuusuid = '{nuusuid}';
```

### Notas

- La sincronización es **automática** en cada refresh desde el móvil
- Los datos locales se usan como caché pero siempre se actualizan desde SOAP
- Errores de sincronización individual no bloquean el proceso completo
- Campo `sincronizado: true` en respuesta confirma sincronización exitosa

### Fecha de Implementación

22 de diciembre de 2025
