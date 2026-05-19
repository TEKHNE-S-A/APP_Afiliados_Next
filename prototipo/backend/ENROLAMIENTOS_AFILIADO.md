# Enrolamientos por Afiliado

## Descripción
Servicio para obtener los enrolamientos de un afiliado específico. Los enrolamientos son las coberturas activas que tiene un afiliado en el sistema SIA.

## Endpoint Backend
```
GET /sia/enrolamientos-afiliado?AfiliadoId={AfiliadoId}
```

### Parámetros Query String
- `AfiliadoId` (string, 30 caracteres): Número de afiliado (9 dígitos titular + 12 org + 9 familiar)

### Respuesta Exitosa
```json
{
  "success": true,
  "data": {
    "Enrolamientos": [
      {
        "EnrolId": "123",
        "EnrolNombre": "Prestación Básica",
        "EnrolDescripcion": "Cobertura básica de salud"
      },
      {
        "EnrolId": "456",
        "EnrolNombre": "Especialidades",
        "EnrolDescripcion": "Consultas con especialistas"
      }
    ]
  }
}
```

### Respuesta Sin Enrolamientos
```json
{
  "success": true,
  "data": {
    "Enrolamientos": []
  }
}
```

## Lógica Interna

### Extracción de NroInternoPersona
El endpoint obtiene el `NroInternoPersona` consultando la tabla `nuusuari` y extrayendo los **últimos 9 dígitos** del campo `nuusuafili`:

```javascript
// Consultar nuusuafili desde la tabla nuusuari
const userQuery = `
  SELECT u.nuusuafili 
  FROM nuusuari u
  WHERE EXISTS (
    SELECT 1 FROM crcreden c 
    WHERE c.crcreid = $1 
    AND c.crcreafili = u.nuusuafili
  )
  LIMIT 1
`

// nuusuafili ejemplo: "288787655000110620120000288787655"
// NroInternoPersona: "288787655" (últimos 9 dígitos)
const nuusuafili = userResult.rows[0].nuusuafili.replace(/[^0-9]/g, '')
const nroInternoPersona = nuusuafili.slice(-9) // ⚠️ ÚLTIMOS 9 dígitos
```

**IMPORTANTE**: Se usan los **últimos 9 dígitos** del campo `nuusuafili`, NO los primeros.

### Llamada SOAP
El endpoint llama al servicio SOAP `ENROLAMIENTOS` con los siguientes parámetros:

```json
{
  "NroInternoPersona": "288787655",
  "Fecha": "19/12/2025"
}
```

La fecha se genera automáticamente en formato `DD/MM/YYYY` con la fecha actual.

### SOAP Request XML
```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:com="com.tekhne.sia">
   <soapenv:Header/>
   <soapenv:Body>
      <com:SIA_WS.Execute>
         <com:Servicio>ENROLAMIENTOS</com:Servicio>
         <com:Parametros>{"NroInternoPersona":"288787655","Fecha":"19/12/2025"}</com:Parametros>
      </com:SIA_WS.Execute>
   </soapenv:Body>
</soapenv:Envelope>
```

## Manejo de Errores

El endpoint está diseñado para **nunca fallar** con error 500. En caso de:
- Error de conexión SOAP
- Respuesta vacía del servicio
- Error de parsing

**Siempre devuelve**: `{ success: true, data: { Enrolamientos: [] } }`

Esto permite que el frontend muestre un mensaje amigable en lugar de un error crítico.

## Integración Mobile

### Ubicación
Pantalla: `mobile/src/screens/SolicitudAutorizacionScreen.tsx`

### Flujo de Carga
1. Usuario selecciona un afiliado del grupo familiar
2. Automáticamente se llama a `cargarCoberturas(afiliadoId)`
3. Se consulta `/sia/enrolamientos-afiliado?AfiliadoId=${afiliadoId}`
4. Los enrolamientos se muestran como opciones seleccionables

### Código Mobile
```typescript
const cargarCoberturas = async (afiliadoId: string) => {
  try {
    setLoadingCoberturas(true)
    setCoberturas([])
    
    const response = await apiGet(`/sia/enrolamientos-afiliado?AfiliadoId=${afiliadoId}`)
    
    if (response.success && response.data?.Enrolamientos) {
      const enrolamientos = response.data.Enrolamientos
      
      if (Array.isArray(enrolamientos) && enrolamientos.length > 0) {
        const coberturasArray = enrolamientos.map((enrol: any, index: number) => ({
          codigo: enrol.EnrolId || enrol.Id || `ENROL${index + 1}`,
          nombre: enrol.EnrolNombre || enrol.Nombre || `Enrolamiento ${index + 1}`,
          descripcion: enrol.EnrolDescripcion || enrol.Detalle || ''
        }))
        
        setCoberturas(coberturasArray)
      } else {
        // Sin enrolamientos
        setCoberturas([{
          codigo: 'ENROL01',
          nombre: 'Sin enrolamientos activos',
          descripcion: 'No hay enrolamientos disponibles para este afiliado'
        }])
      }
    }
  } catch (error) {
    console.error('Error cargando enrolamientos:', error)
  } finally {
    setLoadingCoberturas(false)
  }
}
```

### UX en Pantalla
- **Sin afiliado seleccionado**: Muestra mensaje "Primero seleccione un afiliado para ver sus enrolamientos"
- **Cargando**: Muestra spinner con `ActivityIndicator`
- **Sin enrolamientos**: Muestra "Sin enrolamientos activos"
- **Con enrolamientos**: Lista de botones seleccionables con cada enrolamiento

## Testing

### PowerShell
```powershell
# Login primero
$loginResponse = Invoke-RestMethod -Uri 'http://localhost:3000/auth/login' `
  -Method Post `
  -ContentType 'application/json' `
  -Body '{"username":"hj@gmail.com","password":"12345678"}' `
  -SessionVariable session

# Obtener enrolamientos
$afiliadoId = "288787655000110620120000288787655"
$response = Invoke-RestMethod -Uri "http://localhost:3000/sia/enrolamientos-afiliado?AfiliadoId=$afiliadoId" `
  -Method Get `
  -WebSession $session

$response | ConvertTo-Json -Depth 10
```

### cURL
```bash
# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"hj@gmail.com","password":"12345678"}' \
  -c cookies.txt

# Obtener enrolamientos
curl -X GET "http://localhost:3000/sia/enrolamientos-afiliado?AfiliadoId=288787655000110620120000288787655" \
  -b cookies.txt
```

## Logs Backend

### Ejemplo de logs exitosos
```
📥 GET /sia/enrolamientos-afiliado
   AfiliadoId: 288787655000110620120000288787655
   NroInternoPersona: 288787655
   Parámetros SOAP: { NroInternoPersona: '288787655', Fecha: '19/12/2025' }
✅ 3 enrolamientos encontrados
```

### Ejemplo sin enrolamientos
```
📥 GET /sia/enrolamientos-afiliado
   AfiliadoId: 288787655000110620120000288787655
   NroInternoPersona: 288787655
   Parámetros SOAP: { NroInternoPersona: '288787655', Fecha: '19/12/2025' }
⚠️ Servicio SIA retornó error, devolviendo lista vacía
```

## Diferencias con REC_PRESTACIONES_APP

| Aspecto | ENROLAMIENTOS | REC_PRESTACIONES_APP |
|---------|---------------|----------------------|
| **Propósito** | Consultar enrolamientos de un afiliado | Consultar prestaciones genéricas |
| **Parámetros** | NroInternoPersona + Fecha | Ninguno o AfiliadoId + fechas |
| **Resultado** | Enrolamientos específicos del afiliado | Lista genérica de prestaciones |
| **Cuándo usar** | Al crear solicitudes de autorización | Para catálogo general |
| **Personalizado** | ✅ Sí, por afiliado | ❌ No, es genérico |

## Notas Importantes

1. **NroInternoPersona**: Se extrae automáticamente del AfiliadoId (primeros 9 dígitos)
2. **Fecha Actual**: El endpoint genera automáticamente la fecha actual en formato DD/MM/YYYY
3. **Resiliente**: Nunca falla con error 500, siempre devuelve lista (vacía si es necesario)
4. **Carga Dinámica**: Los enrolamientos se cargan al seleccionar un afiliado, no al inicio
5. **UI Contextual**: La interfaz adapta los mensajes según si hay afiliado seleccionado o no

## Estado
✅ **IMPLEMENTADO Y FUNCIONANDO**
- Backend: endpoint GET `/sia/enrolamientos-afiliado` operativo
- Frontend: integrado en `SolicitudAutorizacionScreen.tsx`
- Documentación completa
- Fecha: 19 de diciembre de 2025
