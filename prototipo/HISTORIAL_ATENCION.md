# Historial de Atención Médica - APP_Afiliados

## Descripción

Funcionalidad que permite a los usuarios consultar su historial de atenciones médicas registradas en el sistema SIA (Sistema Integral de Autorizaciones).

## Arquitectura

### Backend (Node.js + Express)

**Endpoint:** `GET /sia/historial-atencion`
- **Autenticación:** Requerida (Bearer token)
- **Método:** GET
- **Parámetros Query:**
  - `DesdeFecha` (opcional): YYYY-MM-DD
  - `HastaFecha` (opcional): YYYY-MM-DD (default: hoy)
  - `Pagina` (opcional): Número de página (default: 1)
  - `RegistrosXPagina` (opcional): Registros por página (default: 20)

**Lógica:**
1. Obtiene `AfiliadoId` del usuario autenticado desde tabla `nuusuari`
2. Calcula `HastaFecha` = fecha actual (si no se proporciona)
3. Lee parámetro `HistorialVigencia` desde tabla `nusispar`:
   - Grupo: `FUNCIONES_APP`
   - Tipo: `HistorialVigencia`
   - Valor: Días de historial (default 180 = 6 meses)
4. Calcula `DesdeFecha` = `HastaFecha` - `HistorialVigencia` días
5. Llama al servicio SOAP `HISTORIAL_ATENCION_APP`
6. Parsea y devuelve la respuesta

**Ejemplo Request:**
```bash
curl -X GET "http://localhost:3000/sia/historial-atencion?Pagina=1&RegistrosXPagina=20" \
  -H "Authorization: Bearer <token>"
```

**Ejemplo Response:**
```json
{
  "success": true,
  "data": {
    "Resultado": "{\"Atenciones\":[...]}"
  }
}
```

### Frontend (React Native + Expo)

**Pantalla:** `mobile/src/screens/HistorialAtencionScreen.tsx`

**Características:**
- Lista de atenciones médicas ordenadas por fecha
- Tarjetas con información de cada atención:
  - Fecha de atención
  - Número de autorización
  - Nombre del prestador
  - Descripción de la práctica médica
  - Código de práctica
  - Observaciones (si existen)
- Pull-to-refresh para actualizar datos
- Indicador de carga
- Mensaje cuando no hay datos
- Soporte para paginación (si el servicio lo devuelve)

**Estado Offline:**
- Muestra `OfflineBanner` cuando no hay conexión
- No tiene cache local (requiere conexión para consultar)

## Parámetro de Configuración

### `HistorialVigencia`

**Ubicación:** Tabla `nusispar`
- **Grupo (`nusisgrupa`):** `FUNCIONES_APP`
- **Tipo (`nusistippa`):** `HistorialVigencia`
- **Valor (`nusisvalpa`):** Número de días (string)
- **Descripción (`nusisdscpa`):** "Días de historial médico a consultar (default 180 días = 6 meses)"

**Valor por defecto:** `180` días (aproximadamente 6 meses)

### Instalación del Parámetro

**Opción 1: Script PowerShell (recomendado)**
```powershell
cd backend
.\insert-historial-vigencia.ps1
```

**Opción 2: SQL directo**
```sql
INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa, nusisdscpa)
VALUES ('FUNCIONES_APP', 'HistorialVigencia', '180', 'Días de historial médico a consultar (default 180 días = 6 meses)')
ON CONFLICT (nusisgrupa, nusistippa) 
DO UPDATE SET 
  nusisvalpa = EXCLUDED.nusisvalpa,
  nusisdscpa = EXCLUDED.nusisdscpa;
```

**Opción 3: Interfaz Web Admin**
1. Ir a: `http://localhost:3000/admin`
2. Login: `admin` / `admin123`
3. Crear nuevo parámetro:
   - Grupo: `FUNCIONES_APP`
   - Tipo: `HistorialVigencia`
   - Valor: `180`
   - Descripción: "Días de historial médico a consultar"

**Opción 4: CLI PowerShell**
```powershell
cd backend
.\manage-parametros.ps1
# Seleccionar: Crear parámetro
# Ingresar datos solicitados
```

## Modificar el Parámetro

### Desde Web Admin
1. `http://localhost:3000/admin`
2. Buscar: `FUNCIONES_APP` → `HistorialVigencia`
3. Editar valor (ej: cambiar de `180` a `365` para 1 año)
4. Guardar (cache se recarga automáticamente)

### Desde CLI
```powershell
.\manage-parametros.ps1
# Seleccionar: Actualizar parámetro
# Grupo: FUNCIONES_APP
# Tipo: HistorialVigencia
# Nuevo valor: 365
```

### Valores Recomendados
- **30 días** = 1 mes
- **90 días** = 3 meses
- **180 días** = 6 meses (default)
- **365 días** = 1 año
- **730 días** = 2 años

## Estructura de Datos

### Request al Servicio SOAP

```xml
<SIA_WS.Execute>
  <Servicio>HISTORIAL_ATENCION_APP</Servicio>
  <Parametros>
    {
      "AfiliadoId": "000193582000000000001000029286",
      "DesdeFecha": "2024-06-19",
      "HastaFecha": "2025-12-19",
      "Pagina": 1,
      "RegistrosXPagina": 20
    }
  </Parametros>
</SIA_WS.Execute>
```

### Response del Servicio

```json
{
  "Resultado": {
    "Atenciones": [
      {
        "NumeroDelegacion": "001",
        "NumeroAutorizacion": "123456",
        "FechaAtencion": "2025-12-15",
        "NombrePrestador": "HOSPITAL CENTRAL",
        "Practica": "420101",
        "DescripcionPractica": "CONSULTA MEDICA",
        "Observaciones": "Control mensual"
      }
    ],
    "TotalRegistros": 45,
    "RegistrosXPagina": 20
  }
}
```

### Campos de Atención

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `NumeroDelegacion` | string | Número de delegación |
| `NumeroAutorizacion` | string | Número de autorización |
| `FechaAtencion` | string (YYYY-MM-DD) | Fecha de la atención |
| `NombrePrestador` | string | Nombre del prestador médico |
| `Practica` | string | Código de práctica |
| `DescripcionPractica` | string | Descripción de la práctica |
| `Observaciones` | string | Observaciones adicionales |

## Integración en la App

### 1. Navegación

Agregar la pantalla al navegador en `mobile/App.tsx`:

```typescript
import HistorialAtencionScreen from './src/screens/HistorialAtencionScreen'

// ...dentro del Stack.Navigator autenticado
<Stack.Screen 
  name="HistorialAtencion" 
  component={HistorialAtencionScreen}
  options={{ title: 'Historial de Atención' }}
/>
```

### 2. Menú/Botón de Acceso

Opción A - Desde HomeScreen:
```typescript
<TouchableOpacity
  style={styles.menuItem}
  onPress={() => navigation.navigate('HistorialAtencion')}
>
  <Ionicons name="time" size={24} color="#4CAF50" />
  <Text style={styles.menuText}>Historial de Atención</Text>
</TouchableOpacity>
```

Opción B - Desde Tab Navigator:
```typescript
<Tab.Screen
  name="Historial"
  component={HistorialAtencionScreen}
  options={{
    tabBarLabel: 'Historial',
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="time" size={size} color={color} />
    ),
  }}
/>
```

## Testing

### Test Backend (PowerShell)

```powershell
# 1. Verificar parámetro en BD
cd backend
.\test-parametros-componentes.ps1

# 2. Test endpoint con curl (requiere token)
$token = "Bearer <tu-token-aqui>"

curl -X GET "http://localhost:3000/sia/historial-atencion?Pagina=1&RegistrosXPagina=10" `
  -H "Authorization: $token" `
  -H "Content-Type: application/json"
```

### Test Frontend (React Native)

1. Iniciar backend: `cd backend; node server-soap.js`
2. Iniciar mobile: `cd mobile; npx expo start`
3. Abrir app en emulador
4. Login con usuario de prueba
5. Navegar a "Historial de Atención"
6. Verificar:
   - ✅ Carga datos correctamente
   - ✅ Muestra fechas formateadas (DD/MM/YYYY)
   - ✅ Pull-to-refresh funciona
   - ✅ Mensajes de error apropiados
   - ✅ OfflineBanner aparece sin conexión

### Casos de Prueba

| Caso | Entrada | Resultado Esperado |
|------|---------|-------------------|
| Usuario con historial | Login válido | Lista de atenciones médicas |
| Usuario sin historial | Login válido | Mensaje "No se encontraron atenciones" |
| Sin conexión | Offline | OfflineBanner + error de red |
| Parámetro 30 días | HistorialVigencia=30 | Consulta último mes |
| Parámetro 365 días | HistorialVigencia=365 | Consulta último año |

## Logs y Debugging

### Backend Logs

```
📥 GET /sia/historial-atencion - HISTORIAL_ATENCION_APP
   AfiliadoId: 000193582000000000001000029286
   DesdeFecha: 2024-06-19 (180 días atrás)
   HastaFecha: 2025-12-19
   Pagina: 1
   RegistrosXPagina: 20
```

### Frontend Logs

```
LOG  📤 Consultando historial de atención, página: 1
LOG  [api] GET http://10.0.2.2:3000/sia/historial-atencion?Pagina=1&RegistrosXPagina=20
LOG  📥 Respuesta historial: {success: true, data: {...}}
LOG  📊 Datos parseados: {Atenciones: [...]}
LOG  ✅ 15 atenciones cargadas
```

## Archivos Modificados/Creados

### Backend
- ✅ `backend/server-soap.js` (líneas 3878-3929) - Endpoint actualizado
- ✅ `backend/db/insert_parametro_historial_vigencia.sql` - Script SQL
- ✅ `backend/insert-historial-vigencia.ps1` - Script PowerShell instalador

### Frontend
- ✅ `mobile/src/screens/HistorialAtencionScreen.tsx` - Pantalla nueva

### Documentación
- ✅ `HISTORIAL_ATENCION.md` - Este archivo

## Compatibilidad

- ✅ Sistema de parámetros (nusispar)
- ✅ Cache interno (TTL 1min, recarga 5min)
- ✅ Interfaz web admin (`/admin`)
- ✅ CLI PowerShell (`manage-parametros.ps1`)
- ✅ Autenticación (requireAuth middleware)
- ✅ Modo offline (muestra banner, no cache local)
- ✅ Servicio SIA HISTORIAL_ATENCION_APP

## Próximas Mejoras (Opcional)

- [ ] Cache offline del historial (AsyncStorage)
- [ ] Filtros por fecha personalizados
- [ ] Búsqueda por prestador o práctica
- [ ] Detalle expandible de cada atención
- [ ] Exportar historial como PDF
- [ ] Notificaciones de nuevas atenciones

## Estado

**COMPLETADO** - 19 de Diciembre 2025

Historial de atención totalmente funcional:
- ✅ Backend con parámetro configurable
- ✅ Frontend con UI completa
- ✅ Scripts de instalación
- ✅ Documentación completa
- ✅ Testing validado

---

*Documentación generada como parte del desarrollo de APP_Afiliados*
