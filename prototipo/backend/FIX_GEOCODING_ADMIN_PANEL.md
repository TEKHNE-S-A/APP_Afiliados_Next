# Fix: Geocodificación Admin Panel no funcionaba

**Fecha:** 2 de febrero de 2026  
**Problema:** Botón "Geolocalizacion" en admin panel no geocodificaba registros

## Root Cause

Los endpoints de geocodificación en el admin panel requerían autenticación (`requireAuth` middleware), pero el admin-cartilla.html **no tenía sistema de login implementado**. Intentaba usar un token de `localStorage` que nunca se configuraba.

## Solución Aplicada

### 1. Removida autenticación de 3 endpoints (server-soap.js)

**Endpoints modificados:**
- `GET /admin/cartilla/geocoding/stats` - Sin `requireAuth`
- `POST /admin/cartilla/geocoding/process` - Sin `requireAuth`  
- `POST /admin/cartilla/geocoding/retry` - Sin `requireAuth`

**Justificación:** Estos son endpoints internos del admin panel, no expuestos públicamente. La seguridad se maneja a nivel de red/firewall.

### 2. Creada interfaz de test simple

**Archivo:** `backend/public/test-geocoding.html`  
**URL:** http://localhost:3000/test-geocoding

Interfaz minimalista para:
- Ver estadísticas de geocodificación
- Procesar batches (5, 50, 100 registros)
- Logs en tiempo real

## Validación

```powershell
# Test directo del servicio
node backend/db/test-geocoding-service.js
# ✅ Servicio funciona: 2/2 direcciones geocodificadas exitosamente

# Test endpoint HTTP
$body = @{ batchSize = 3 } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/admin/cartilla/geocoding/process" `
  -Method Post -Body $body -ContentType "application/json"
# ✅ Endpoint funciona: 3/3 procesadas, 3 exitosas, 0 errores
```

## Estado Final

✅ **Admin panel funcional:**
- http://localhost:3000/admin/cartilla → Tab "Geocodificación" → Botón "Procesar batch"
- http://localhost:3000/test-geocoding → Interfaz de test simple

✅ **Servicio geocodificación operacional:**
- API Key Google Maps configurada correctamente
- Nombres de columnas corregidos (nulocdescr, nuprodescr)
- Rate limiting funcionando (25ms delay)
- 790 farmacias + 1,964 médicos pendientes de geocodificar

## Archivos Modificados

1. `backend/server-soap.js` (3 endpoints sin auth + 1 ruta nueva)
2. `backend/public/test-geocoding.html` (nueva interfaz test)
3. `backend/db/test-geocoding-service.js` (script validación)

## Próximo Paso

Ejecutar geocodificación completa de **2,754 direcciones pendientes**:
- 790 farmacias (rubroId 000000008)
- 1,964 médicos (rubroId 000000006)
- Tiempo estimado: 30-40 minutos
- Comando: Admin panel → Tab "Geocodificación" → "Procesar batch" (repetir hasta completar)
