# Historial de Atención - Detalle de Prácticas

## Resumen

Funcionalidad que permite consultar el detalle de prácticas médicas realizadas en una atención específica. Al tocar cualquier registro del historial de atención, se abre un modal full-screen mostrando todas las prácticas asociadas a esa autorización.

**Estado**: ✅ COMPLETADO (Diciembre 2025)

---

## Arquitectura

### Backend

**Endpoint**: `GET /sia/detalle-consumo`

**Autenticación**: NO requiere (público)

**Parámetros Query**:
- `NumeroDelegacion` (required): Número de delegación (5 dígitos)
- `NumeroAutorizacion` (required): Número de autorización (resto de dígitos)

**Servicio SOAP**: `AUDETALLE_CONSUMO_APP`

**Respuesta**:
```json
{
  "success": true,
  "data": {
    "Resultado": "[{\"NombrePractica\":\"CONSULTA MEDICA\",\"Cantidad\":1,\"ImporteCoseguro\":\"0.00\",\"Cobertura\":0,\"Precio\":\"0.00\"}]"
  }
}
```

**Implementación** (`backend/server-soap.js` líneas 3960-3994):
```javascript
app.get('/sia/detalle-consumo', async (req, res) => {
  try {
    const { NumeroDelegacion, NumeroAutorizacion } = req.query

    if (!NumeroDelegacion || !NumeroAutorizacion) {
      return res.status(400).json({
        success: false,
        message: 'NumeroDelegacion y NumeroAutorizacion son requeridos'
      })
    }

    const parametros = {
      NumeroDelegacion: parseInt(NumeroDelegacion),
      NumeroAutorizacion: parseInt(NumeroAutorizacion)
    }

    console.log('📊 Consultando detalle consumo:', parametros)

    const response = await callSoapExecuteSIA('AUDETALLE_CONSUMO_APP', parametros)
    const result = parseSoapResult(response)

    res.json(result)
  } catch (error) {
    console.error('❌ Error en detalle-consumo:', error.message)
    res.status(500).json({
      success: false,
      message: 'Error al consultar detalle de consumo',
      error: error.message
    })
  }
})
```

---

### Frontend

**Screen**: `mobile/src/screens/HistorialAtencionScreen.tsx`

**Componentes Principales**:

#### 1. Interfaces
```typescript
interface HistorialItem {
  AtencionId: string         // 30 dígitos: 5 (delegación) + 25 (autorización)
  AfiliadoId: string
  AtencionFecha: string      // YYYY-MM-DD
  EntidadId: number
  EntidadNombre: string
  AtencionCantidad: number
}

interface DetallePractica {
  [key: string]: any         // Campos dinámicos del servicio
}
```

#### 2. Estados
```typescript
const [modalVisible, setModalVisible] = useState(false)
const [detalleLoading, setDetalleLoading] = useState(false)
const [detallePracticas, setDetallePracticas] = useState<DetallePractica[]>([])
const [selectedAtencion, setSelectedAtencion] = useState<HistorialItem | null>(null)
```

#### 3. Función de Particionamiento
```typescript
const parseAtencionId = (atencionId: string): { delegacion: string; autorizacion: string } => {
  // AtencionId tiene 30 dígitos
  // Primeros 5 = NumeroDelegacion
  // Resto = NumeroAutorizacion
  const delegacion = atencionId.substring(0, 5)
  const autorizacion = atencionId.substring(5)
  
  console.log(`🔢 Particionando AtencionId ${atencionId}:`)
  console.log(`   - NumeroDelegacion: ${delegacion}`)
  console.log(`   - NumeroAutorizacion: ${autorizacion}`)
  
  return { delegacion, autorizacion }
}
```

**Ejemplo**:
- Input: `"00001000012658795"`
- Output: `{ delegacion: "00001", autorizacion: "000012658795" }`

#### 4. Función de Consulta de Detalle
```typescript
const fetchDetallePracticas = async (atencion: HistorialItem) => {
  try {
    console.log('📤 Consultando detalle de prácticas...')
    setSelectedAtencion(atencion)
    setModalVisible(true)
    setDetalleLoading(true)
    setDetallePracticas([])

    // Partir el AtencionId
    const { delegacion, autorizacion } = parseAtencionId(atencion.AtencionId)

    // Construir URL con parámetros
    const params = new URLSearchParams({
      NumeroDelegacion: delegacion,
      NumeroAutorizacion: autorizacion,
    })

    const response = await apiGet(`/sia/detalle-consumo?${params.toString()}`)

    if (response.success && response.data?.Resultado) {
      // Parsear JSON string en array
      let practicas = []
      if (typeof response.data.Resultado === 'string') {
        practicas = JSON.parse(response.data.Resultado)
      } else if (Array.isArray(response.data.Resultado)) {
        practicas = response.data.Resultado
      }

      console.log(`✅ ${practicas.length} prácticas cargadas`)
      setDetallePracticas(practicas)
    }
  } catch (error) {
    console.error('❌ Error al cargar detalle:', error)
    Alert.alert('Error', 'No se pudo cargar el detalle de prácticas')
  } finally {
    setDetalleLoading(false)
  }
}
```

#### 5. Renderizado de Tarjetas Interactivas
```typescript
const renderHistorialItem = ({ item }: { item: HistorialItem }) => (
  <TouchableOpacity
    style={styles.card}
    onPress={() => fetchDetallePracticas(item)}
    activeOpacity={0.7}
  >
    {/* Contenido del card con chevron-forward */}
    <View style={styles.cardContent}>
      {/* ... datos del historial ... */}
      <View style={styles.tapHintContainer}>
        <Ionicons name="chevron-forward" size={20} color="#4CAF50" />
        <Text style={styles.tapHint}>Toca para ver detalle</Text>
      </View>
    </View>
  </TouchableOpacity>
)
```

#### 6. Modal Full-Screen
```typescript
<Modal
  visible={modalVisible}
  animationType="slide"
  transparent={false}
  onRequestClose={closeModal}
>
  <SafeAreaView style={styles.modalContainer}>
    {/* Header con botón atrás */}
    <View style={styles.modalHeader}>
      <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>
      <Text style={styles.modalTitle}>Detalle de Prácticas</Text>
    </View>

    {/* Info card con datos de la atención */}
    {selectedAtencion && (
      <View style={styles.modalInfoCard}>
        <View style={styles.modalInfoRow}>
          <Ionicons name="calendar-outline" size={20} color="#4CAF50" />
          <Text style={styles.modalInfoText}>
            {formatFecha(selectedAtencion.AtencionFecha)}
          </Text>
        </View>
        <View style={styles.modalInfoRow}>
          <Ionicons name="business-outline" size={20} color="#4CAF50" />
          <Text style={styles.modalInfoText}>
            {selectedAtencion.EntidadNombre}
          </Text>
        </View>
        <View style={styles.modalInfoRow}>
          <Ionicons name="card-outline" size={20} color="#666" />
          <Text style={styles.modalInfoTextSmall}>
            ID: {selectedAtencion.AtencionId}
          </Text>
        </View>
      </View>
    )}

    {/* Loading state */}
    {detalleLoading && (
      <View style={styles.modalLoadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.modalLoadingText}>Cargando detalles...</Text>
      </View>
    )}

    {/* Lista de prácticas */}
    {!detalleLoading && (
      <ScrollView style={styles.modalScrollView}>
        {detallePracticas.length > 0 ? (
          detallePracticas.map((practica, index) => (
            <View key={index} style={styles.practicaCard}>
              {Object.keys(practica).map((key) => (
                <View key={key} style={styles.practicaRow}>
                  <Text style={styles.practicaLabel}>{key}:</Text>
                  <Text style={styles.practicaValue}>
                    {String(practica[key]).trim()}
                  </Text>
                </View>
              ))}
            </View>
          ))
        ) : (
          <View style={styles.modalEmptyContainer}>
            <Ionicons name="document-outline" size={60} color="#ccc" />
            <Text style={styles.modalEmptyText}>
              No hay prácticas registradas
            </Text>
          </View>
        )}
      </ScrollView>
    )}
  </SafeAreaView>
</Modal>
```

---

## Flujo de Uso

### Flujo Completo

1. **Usuario accede al Historial**:
   - Navega: Perfil → Historial de Atención
   - Se cargan 14 registros de atenciones médicas

2. **Usuario selecciona una atención**:
   - Toca cualquier tarjeta del historial
   - Trigger: `onPress={() => fetchDetallePracticas(item)}`

3. **Particionamiento del AtencionId**:
   ```
   Input:  "00001000012658795"
           └─┬─┘└──────┬──────┘
       Deleg.   Autor.
   
   Output: NumeroDelegacion = "00001"
           NumeroAutorizacion = "000012658795"
   ```

4. **Llamada al servicio**:
   ```
   GET /sia/detalle-consumo?NumeroDelegacion=00001&NumeroAutorizacion=000012658795
   ```

5. **Procesamiento de respuesta**:
   ```javascript
   // Response cruda
   {
     "success": true,
     "data": {
       "Resultado": "[{\"NombrePractica\":\"CONSULTA MEDICA\",\"Cantidad\":1,...}]"
     }
   }
   
   // Parseo
   const practicas = JSON.parse(response.data.Resultado)
   // [{NombrePractica: "CONSULTA MEDICA", Cantidad: 1, ...}]
   ```

6. **Renderizado del modal**:
   - Se abre modal con animación slide
   - Muestra header verde con título y botón atrás
   - Info card con fecha, prestador, ID
   - Lista scrollable con tarjetas de prácticas
   - Cada práctica muestra todos sus campos dinámicamente

7. **Cierre del modal**:
   - Usuario toca botón atrás o gestor de Android back
   - Trigger: `closeModal()`
   - Se resetea estado y vuelve al listado

---

## Campos de Respuesta

### Campos Comunes en Prácticas

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| `NombrePractica` | string | Nombre descriptivo de la práctica | "CONSULTA MEDICA" |
| `Cantidad` | number | Cantidad de veces realizada | 1 |
| `ImporteCoseguro` | string | Monto de coseguro | "0.00" |
| `Cobertura` | number | Porcentaje de cobertura | 0 |
| `Precio` | string | Precio total | "0.00" |

**Nota**: El modal renderiza campos dinámicamente con `Object.keys()`, por lo que acepta cualquier estructura de respuesta.

---

## Estilos CSS

### Estilos del Modal

```typescript
const styles = StyleSheet.create({
  // Modal container
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  
  // Header
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 16,
    elevation: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  
  // Info card
  modalInfoCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    elevation: 2,
    gap: 8,
  },
  
  // Práctica card
  practicaCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 2,
  },
  practicaRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  practicaLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
    width: 140,
  },
  practicaValue: {
    fontSize: 13,
    color: '#333',
    flex: 1,
  },
})
```

---

## Logs de Depuración

### Logs Backend
```
📊 Consultando detalle consumo: { NumeroDelegacion: 1, NumeroAutorizacion: 12658795 }
```

### Logs Frontend
```
📤 Consultando detalle de prácticas...
🔢 Particionando AtencionId 00001000012658795:
   - NumeroDelegacion: 00001
   - NumeroAutorizacion: 000012658795
📊 Datos parseados: [{"NombrePractica":"CONSULTA MEDICA","Cantidad":1,...}]
✅ 1 prácticas cargadas
```

---

## Testing

### Caso de Prueba 1: Consulta Exitosa
```powershell
# 1. Backend funcionando
cd backend
.\restart-backend.ps1

# 2. Test directo al endpoint
Invoke-RestMethod -Uri 'http://localhost:3000/sia/detalle-consumo?NumeroDelegacion=1&NumeroAutorizacion=12658795' -Method Get

# 3. Verificar respuesta
# Esperado: {success: true, data: {Resultado: "[...]"}}
```

### Caso de Prueba 2: Flujo Mobile
```
1. Abrir app → Perfil → Historial de Atención
2. Verificar que cargan 14 atenciones
3. Tocar primera tarjeta "INST. CARDIOLOGIA INTERVENCIONISTA"
4. Verificar que abre modal con animación
5. Verificar header verde con título "Detalle de Prácticas"
6. Verificar info card con fecha, prestador, ID
7. Verificar lista de prácticas con todos los campos
8. Tocar botón atrás
9. Verificar que cierra modal y vuelve al historial
```

### Caso de Prueba 3: Parámetros Inválidos
```powershell
# Sin parámetros
Invoke-RestMethod -Uri 'http://localhost:3000/sia/detalle-consumo' -Method Get
# Esperado: 400 Bad Request

# Solo un parámetro
Invoke-RestMethod -Uri 'http://localhost:3000/sia/detalle-consumo?NumeroDelegacion=1' -Method Get
# Esperado: 400 Bad Request
```

---

## Errores Conocidos y Soluciones

### Error 1: Modal no aparece
**Síntoma**: Estado `modalVisible=true` pero modal no se renderiza

**Causa**: Modal JSX faltante o fuera del return

**Solución**: Verificar que Modal esté dentro del return principal, después del ScrollView de historial

### Error 2: Campos no se muestran
**Síntoma**: Modal abre pero no muestra datos de prácticas

**Causa**: 
- Respuesta es JSON string en lugar de array
- Parsing incorrecto del Resultado

**Solución**: 
```typescript
// Manejo robusto de respuesta
let practicas = []
if (typeof response.data.Resultado === 'string') {
  practicas = JSON.parse(response.data.Resultado)
} else if (Array.isArray(response.data.Resultado)) {
  practicas = response.data.Resultado
} else if (response.data.Resultado?.Practicas) {
  practicas = response.data.Resultado.Practicas
}
```

### Error 3: Particionamiento incorrecto
**Síntoma**: Error 400 o datos incorrectos en servicio

**Causa**: AtencionId con formato diferente a 30 dígitos

**Solución**: Validar longitud antes de particionar
```typescript
if (atencionId.length !== 30) {
  console.warn('⚠️ AtencionId con formato inesperado:', atencionId)
}
```

---

## Mejoras Futuras

### Propuestas de Mejora

1. **Formato de moneda**:
   ```typescript
   const formatCurrency = (value: string) => {
     return `$${parseFloat(value).toFixed(2)}`
   }
   ```

2. **Contador de prácticas en header**:
   ```tsx
   <Text style={styles.modalTitle}>
     Detalle de Prácticas ({detallePracticas.length})
   </Text>
   ```

3. **Pull-to-refresh en modal**:
   ```tsx
   <ScrollView
     refreshControl={
       <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
     }
   >
   ```

4. **Compartir detalle**:
   ```typescript
   const shareDetalle = async () => {
     const text = detallePracticas.map(p => 
       `${p.NombrePractica} - Cantidad: ${p.Cantidad}`
     ).join('\n')
     await Share.share({ message: text })
   }
   ```

5. **Filtros por tipo de práctica**:
   ```typescript
   const [filtroTipo, setFiltroTipo] = useState('todos')
   const practicasFiltradas = detallePracticas.filter(p => 
     filtroTipo === 'todos' || p.TipoPractica === filtroTipo
   )
   ```

---

## Referencias

### Archivos Relacionados

- **Backend**: `backend/server-soap.js` (líneas 3960-3994)
- **Frontend**: `mobile/src/screens/HistorialAtencionScreen.tsx` (610 líneas)
- **Documentación**: 
  - `HISTORIAL_ATENCION.md` - Feature principal
  - `SIA_SERVICES.md` - Servicios SIA
  - `SIA_SOAP_EXAMPLES.md` - Ejemplos SOAP

### Servicios SOAP

- **Sistema**: WSSIATK (Sistema Integral de Autorizaciones)
- **Servicio**: `AUDETALLE_CONSUMO_APP`
- **URL**: `http://tkqa.tekhne.com.ar:8700/PRODUCTO_SIA_QA/com.tekhne.asia_ws`
- **Namespace**: `com.tekhne.sia`
- **Headers**: `USUARIO: mariar`, `PASSWORD: ignacio11`

### Dependencias

- `@react-navigation/native` - Navegación
- `react-native-vector-icons` / `@expo/vector-icons` - Iconos
- `apiGet` - Wrapper HTTP (mobile/src/services/api.ts)
- `formatFecha` - Utilidad de fechas (mobile/src/utils/dateUtils.ts)

---

## Changelog

### v1.0.0 - Diciembre 2025
- ✅ Implementación inicial de modal de detalle
- ✅ Integración con AUDETALLE_CONSUMO_APP
- ✅ Particionamiento de AtencionId (5 + 25 dígitos)
- ✅ Renderizado dinámico de campos con Object.keys()
- ✅ TouchableOpacity en cards del historial
- ✅ Estados: loading, vacío, con datos
- ✅ Navegación: abrir/cerrar modal
- ✅ Documentación completa

---

**Última actualización**: 19 de Diciembre de 2025  
**Autor**: GitHub Copilot  
**Estado**: ✅ PRODUCCIÓN
