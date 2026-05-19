# Solicitudes de Autorización SIA

## Resumen

Funcionalidad completa para **crear solicitudes de autorizaciones médicas** en el sistema SIA. Permite al usuario seleccionar el afiliado del grupo familiar, elegir el tipo de cobertura, adjuntar hasta 5 fotos con órdenes médicas (según parámetro configurable), especificar una referencia identificatoria y opcionalmente indicar un profesional preferente.

**Estado**: ✅ COMPLETADO (Diciembre 2025)

Actualización 25/03/2026:
- `GET /mis-autorizaciones` ahora puede enriquecer registros con `prestacion_descripcion` y `numero_delegacion` usando `AUDETALLE_CONSUMO_APP`.
- `AutorizacionDetalleScreen` prioriza `GET /sia/detalle-consumo` para mostrar la lista completa de prácticas de una autorización.
- El detalle mobile renderiza una tabla full width con columnas `Práctica`, `Cant.` y `Coseguro`, suma totales y permite expandir nombres largos con `Ver más / Ver menos`.

Actualización 27/03/2026:
- Nuevo endpoint backend `GET /mis-autorizaciones/:ausolicid/fotos` para recuperar imágenes adjuntas de la solicitud autenticada.
- El backend valida pertenencia por `nuusuid`, devuelve todas las imágenes adjuntas de la solicitud (hasta 5 por validación de alta) y responde cada foto como `dataUrl` base64 (`image/jpeg`).
- `AutorizacionDetalleScreen` muestra sección `Imágenes adjuntas` para solicitudes tipo `P` y permite ampliar cada imagen.
- Se habilitó zoom por gesto (pinch/pan) y cierre con swipe down en el modal de imagen ampliada.
- `SolicitudAutorizacionScreen` vuelve a incluir `Tomar foto` además de elegir desde galería.

---

## Timeline de Autorizaciones y Detalle de Prácticas

Además del alta de solicitudes, la funcionalidad de autorizaciones SIA quedó extendida para que el detalle de una autorización existente se resuelva desde `AUDETALLE_CONSUMO_APP` cuando el backend o la lista local no traen toda la información descriptiva.

### Origen de datos priorizado

1. `GET /sia/detalle-consumo` (`AUDETALLE_CONSUMO_APP`) para prácticas, cantidades e importe de coseguro.
2. `GET /mis-autorizaciones` enriquecido por backend cuando faltan `prestacion_descripcion` o `numero_delegacion`.
3. `GET /sia/coseguros-pendientes` como fuente de match/fallback para obtener delegación o autorización cuando hace falta completar datos.

### Comportamiento implementado en mobile

- Pantalla: `mobile/src/screens/AutorizacionDetalleScreen.tsx`
- La fila simple de `Prestación` se eliminó para evitar redundancia con el detalle de prácticas.
- La sección `Prácticas` ocupa todo el ancho disponible de la tarjeta.
- Se renderiza como tabla con columnas:
  - `Práctica`
  - `Cant.`
  - `Coseguro`
- Se agrega una fila `Totales` con la suma de cantidad e importe.
- Los nombres largos se muestran truncados por defecto y se expanden al tocar la celda con indicador `Ver más / Ver menos`.

### Comportamiento implementado en backend

- Endpoint: `GET /mis-autorizaciones`
- Cuando una autorización no trae descripción suficiente, el backend intenta completar:
  - `prestacion_descripcion`
  - `numero_delegacion`
- Ese enriquecimiento permite que la pantalla de detalle pueda consultar `GET /sia/detalle-consumo` en forma determinística sin depender solo del dato crudo local.

### Resultado funcional

- El usuario puede abrir una autorización y ver todas sus prácticas asociadas.
- Si una autorización tiene múltiples prácticas, ya no se muestra una sola descripción resumida.
- El detalle expone cantidades e importes de coseguro por práctica, más el total consolidado.

---

## Fotos Adjuntas en Detalle de Autorizaciones

### Endpoint de consulta de fotos

- Endpoint: `GET /mis-autorizaciones/:ausolicid/fotos`
- Autenticación: requerida (Bearer token)
- Validaciones:
  - La autorización debe existir.
  - Debe pertenecer al usuario autenticado (`nuusuid`).
  - Se devuelven todas las fotos adjuntas de la solicitud (hasta 5 por validación de alta).

Respuesta exitosa (ejemplo):

```json
{
  "success": true,
  "ausolicid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "cantidad": 3,
  "fotos": [
    {
      "id": "f1",
      "mimeType": "image/jpeg",
      "dataUrl": "data:image/jpeg;base64,/9j/4AAQSk..."
    },
    {
      "id": "f2",
      "mimeType": "image/jpeg",
      "dataUrl": "data:image/jpeg;base64,/9j/4AAQSk..."
    }
  ]
}
```

Respuesta cuando no existe o no pertenece al usuario:

```json
{
  "error": "Solicitud no encontrada",
  "message": "La autorización no existe o no pertenece al usuario autenticado"
}
```

### Comportamiento en mobile

- Pantalla: `mobile/src/screens/AutorizacionDetalleScreen.tsx`
- Para tipo `P`, la app consulta el endpoint de fotos y renderiza miniaturas en carrusel horizontal.
- Al tocar una miniatura, se abre un modal fullscreen con zoom por gesto:
  - pinch para ampliar/reducir,
  - pan para desplazar,
  - swipe down o botón `X` para cerrar.
- Dependencia incorporada en mobile: `react-native-image-pan-zoom`.

---

## Arquitectura

### Backend

**Endpoint**: `POST /sia/crear-solicitud`

**Autenticación**: REQUERIDA (Bearer token)

**Base de Datos**: Guarda en tablas `ausolici` (solicitud principal) y `ausoaufo` (fotos adjuntas)

**Body JSON**:
```json
{
  "afiliadoId": "000193582000000000001000193582",
  "cobertura": "COB01",
  "referencia": "Consulta cardiología - Dr. Pérez",
  "texto": "Paciente requiere consulta con cardiólogo",
  "profesional": "Dr. Juan Pérez",
  "fotosBase64": [
    "iVBORw0KGgoAAAANS...",
    "iVBORw0KGgoAAAANS...",
    "iVBORw0KGgoAAAANS..."
  ]
}
```

**Parámetros**:

| Campo | Tipo | Required | Descripción |
|-------|------|----------|-------------|
| `afiliadoId` | string | ✅ Sí | ID del afiliado del grupo familiar (30 caracteres) |
| `cobertura` | string | ✅ Sí | Código de la cobertura médica solicitada (autippreid) |
| `referencia` | string | ✅ Sí | Descripción corta de la solicitud (ausoldescr, máx 40 caracteres) |
| `texto` | string | ❌ No | Texto descriptivo detallado (ausoltexto, tipo TEXT) |
| `profesional` | string | ❌ No | Nombre del profesional preferente (ausolpsoco, máx 40 caracteres) |
| `fotosBase64` | string[] | ❌ No | Array de fotos en formato base64 para tipo `P` (máximo configurable entre 1 y 5) |

**Respuesta Exitosa**:
```json
{
  "success": true,
  "message": "Solicitud de autorización creada correctamente",
  "data": {
    "solicitudId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "fechaSolicitud": "2025-12-19",
    "estado": "PENDIENTE",
    "fotosAdjuntas": 3
  }
}
```

**Respuesta Error**:
```json
{
  "error": "Datos incompletos",
  "message": "afiliadoId, cobertura y referencia son requeridos"
}
```

**Implementación** (`backend/server-soap.js`):

**Estructura de Tablas**:

**Tabla `ausolici`** (Solicitudes):
```sql
CREATE TABLE public.ausolici (
  ausolicid bpchar(36) NOT NULL,      -- ID único UUID
  nuusuid bpchar(40) NOT NULL,        -- ID usuario autenticado
  ausoldescr bpchar(40) NOT NULL,     -- Descripción corta (referencia)
  ausolfecal date NOT NULL,           -- Fecha alta
  ausolfecor date NOT NULL,           -- Fecha origen
  autippreid bpchar(30) NULL,         -- Tipo prestación (cobertura)
  ausolnroaf bpchar(20) NOT NULL,     -- Número afiliado
  ausoltexto text NOT NULL,           -- Texto descriptivo
  ausolentid bpchar(30) NOT NULL,     -- ID entidad
  ausolfecve date NOT NULL,           -- Fecha vencimiento
  ausolextid bpchar(30) NOT NULL,     -- ID externo
  ausolrechd bpchar(1) NOT NULL,      -- Rechazado (S/N)
  ausolestad bpchar(3) NOT NULL,      -- Estado (PEN/APR/REC)
  ausolentno bpchar(50) NOT NULL,     -- Nombre entidad
  ausolautnu bpchar(40) NOT NULL,     -- Número autorización
  ausoltipo bpchar(1) NOT NULL,       -- Tipo (A=APP)
  ausolpsoco bpchar(40) NOT NULL,     -- Profesional coordinador
  ausolcantp int2 NOT NULL,           -- Cantidad prácticas
  ausolobspr bpchar(40) NOT NULL,     -- Observaciones previas
  ausolgravc int2 NOT NULL,           -- Gravedad
  CONSTRAINT ausolici_pkey PRIMARY KEY (ausolicid)
);
```

**Tabla `ausoaufo`** (Fotos):
```sql
CREATE TABLE public.ausoaufo (
  ausolicid bpchar(36) NOT NULL,      -- FK a ausolici
  ausolfotid bpchar(36) NOT NULL,     -- ID único foto UUID
  ausolf bytea NOT NULL,              -- Contenido binario foto
  ausolf_gxi varchar(2048) NULL,      -- URL externa (opcional)
  CONSTRAINT ausoaufo_pkey PRIMARY KEY (ausolicid, ausolfotid)
);
```

**Lógica de Guardado**:
```javascript
// 1. Generar ID único para solicitud
const ausolicid = crypto.randomUUID()

// 2. Insertar en ausolici con transacción
await client.query('BEGIN')
await client.query(`INSERT INTO ausolici (...) VALUES (...)`, [...])

// 3. Si hay fotos, insertarlas en ausoaufo
for (const [index, fotoBase64] of fotosBase64.entries()) {
  const fotoId = `00000000-0000-0000-0000-${String(index + 1).padStart(12, '0')}`
  const fotoBuffer = Buffer.from(fotoBase64, 'base64')
  await client.query(
    'INSERT INTO ausoaufo (ausolicid, ausolfotid, ausolf) VALUES ($1, $2, $3)',
    [ausolicid, fotoId, fotoBuffer]
  )
}

// 4. Commit transacción
await client.query('COMMIT')

// 5. Enviar al SIA usando REC_SOLICITUDES_APP con estructura completa
const fotosSIA = []
for (const [index, fotoBase64] of fotosBase64.entries()) {
  const fotoIndex = index + 1
  fotosSIA.push({
    AUSoFId: fotoIndex,
    AUSoFIdExt: fotoIndex.toString(),
    AUSoFFileName: `f${fotoIndex}.jpg`,
    AUSoFFotoBase64: fotoBase64
  })
}

const parametrosSIA = {
  Mode: 'INS',                                    // INS = Insertar
  AUSolId: 0,                                     // 0 para nuevas
  AUSolTipo: 'P',                                 // P = Prestación
  AUSolUsuAfiliadoId: req.user.nuusuid,           // Usuario autenticado
  AUSolIdExt: ausolicid,                          // UUID generado
  AUSolNroAfiliado: afiliadoId.substring(0, 20),  // Número afiliado
  AUSolFecha: fechaActual,                        // YYYY-MM-DD
  AUSolPresTipo: cobertura.substring(0, 30),      // Cobertura
  AUSolGravCodigo: 0,                             // Gravedad normal
  AUSolRefAfiliado: referencia.substring(0, 40),  // Referencia
  AUSolPresId: cobertura.substring(0, 40),        // ID prestación
  AUSolPresCant: 1,                               // Cantidad
  AUSolObsPref: profesional?.substring(0, 40) || '' // Profesional
}

// Agregar fotos si existen
if (fotosSIA.length > 0) {
  parametrosSIA.Foto = { FotoItem: fotosSIA }
}

await callSoapExecuteSIA('REC_SOLICITUDES_APP', parametrosSIA)
```

**Flujo Dual (BD Local + SIA)**:
1. **Guardado en PostgreSQL**: Solicitud y fotos se guardan primero en BD local (transaccional)
2. **Envío a SIA**: Se construye payload completo con 13 campos + estructura Foto y se envía a `REC_SOLICITUDES_APP`
3. **Resiliencia**: Si SIA falla, la solicitud queda en BD local (no bloquea al usuario)
4. **Sincronización**: El campo `AUSolIdExt` (UUID) vincula el registro local con el registro en SIA

**Implementación Completa**:
```javascript
app.post('/sia/crear-solicitud', requireAuth, async (req, res) => {
  try {
    const { 
      afiliadoId,
      cobertura,
      referencia,
      texto,
      profesional,
      fotosBase64 = []
    } = req.body

    // Validar datos requeridos
    if (!afiliadoId || !cobertura || !referencia) {
      return res.status(400).json({ 
        error: 'Datos incompletos',
        message: 'afiliadoId, cobertura y referencia son requeridos'
      })
    }

    // Generar ID único y fecha
    const ausolicid = crypto.randomUUID()
    const fechaActual = new Date().toISOString().split('T')[0]
    
    // Transacción para insertar solicitud y fotos
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      
      // Insertar solicitud
      await client.query(`
        INSERT INTO ausolici (
          ausolicid, nuusuid, ausoldescr, ausolfecal, ausolfecor,
          autippreid, ausolnroaf, ausoltexto, ausolentid, ausolfecve,
          ausolextid, ausolrechd, ausolestad, ausolentno, ausolautnu,
          ausoltipo, ausolpsoco, ausolcantp, ausolobspr, ausolgravc
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
        )
      `, [
        ausolicid,                          // ID único
        req.user.nuusuid,                   // Usuario autenticado
        referencia.substring(0, 40),        // Descripción
        fechaActual,                        // Fecha alta
        fechaActual,                        // Fecha origen
        cobertura.substring(0, 30),         // Tipo prestación
        afiliadoId.substring(0, 20),        // Nro afiliado
        texto || referencia,                // Texto descriptivo
        '',                                 // Entidad ID
        fechaActual,                        // Fecha vencimiento
        '',                                 // Externo ID
        'N',                                // No rechazado
        'PEN',                              // Estado: Pendiente
        '',                                 // Nombre entidad
        '',                                 // Número autorización
        'A',                                // Tipo: APP
        profesional?.substring(0, 40) || '', // Profesional
        1,                                  // Cantidad prácticas
        '',                                 // Observaciones
        0                                   // Gravedad: Normal
      ])
      
      // Insertar fotos si existen
      let fotosInsertadas = 0
      
      for (const [index, fotoBase64] of fotosBase64.entries()) {
        const fotoId = `00000000-0000-0000-0000-${String(index + 1).padStart(12, '0')}`
        const fotoBuffer = Buffer.from(fotoBase64, 'base64')
        await client.query(
          'INSERT INTO ausoaufo (ausolicid, ausolfotid, ausolf) VALUES ($1, $2, $3)',
          [ausolicid, fotoId, fotoBuffer]
        )
        fotosInsertadas++
      }
      
      await client.query('COMMIT')
      
      res.json({ 
        success: true, 
        message: 'Solicitud de autorización creada correctamente',
        data: {
          solicitudId: ausolicid,
          fechaSolicitud: fechaActual,
          estado: 'PENDIENTE',
          fotosAdjuntas: fotosInsertadas
        }
      })
      
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
    
  } catch (error) {
    res.status(500).json({ 
      error: 'Error al crear solicitud',
      message: error.message 
    })
  }
})
```

**Estados de Solicitud**:
- `PEN` - Pendiente (inicial)
- `APR` - Aprobada
- `REC` - Rechazada

**Valores Predeterminados**:
- `ausoltipo`: 'A' (APP - solicitud desde aplicación móvil)
- `ausolrechd`: 'N' (No rechazada inicialmente)
- `ausolestad`: 'PEN' (Pendiente de aprobación)
- `ausolcantp`: 1 (Una práctica por defecto)
- `ausolgravc`: 0 (Gravedad normal)

**Servicio SOAP**: `REC_SOLICITUDES_APP` con estructura completa de parámetros:

**Parámetros Principales:**
- `Mode` (string): Operación a realizar
  - `'INS'` = Insertar nueva solicitud
  - `'UPD'` = Actualizar solicitud existente
  - `'DLT'` = Eliminar solicitud
  - `'DSP'` = Consultar/Desplegar solicitudes
- `AUSolId` (number, 12): ID numérico de la solicitud (0 para nuevas, SIA genera el ID)
- `AUSolTipo` (char, 1): Tipo de solicitud
  - `'P'` = Prestación
  - `'S'` = Servicio
- `AUSolUsuAfiliadoId` (varchar, 40): ID del usuario autenticado (nuusuid)
- `AUSolIdExt` (char, 40): UUID de la solicitud generada localmente
- `AUSolNroAfiliado` (char, 20): Número de afiliado (afiliadoId substring 20)
- `AUSolFecha` (date): Fecha de la solicitud (YYYY-MM-DD)
- `AUSolPresTipo` (char, 30): Tipo de prestación/cobertura
- `AUSolGravCodigo` (number, 2): Código de gravedad (0 = Normal)
- `AUSolRefAfiliado` (char, 40): Referencia del afiliado
- `AUSolPresId` (varchar, 40): ID de la prestación
- `AUSolPresCant` (number, 4): Cantidad de prestaciones (por defecto: 1)
- `AUSolObsPref` (char, 40): Profesional preferente/Observaciones

**Estructura de Fotos (opcional):**
```json
{
  "Foto": {
    "FotoItem": [
      {
        "AUSoFId": 1,                                    // ID secuencial de la foto
        "AUSoFIdExt": "uuid-foto-1",                     // UUID de la foto
        "AUSoFFileName": "solicitud_uuid_foto1.jpg",     // Nombre del archivo
        "AUSoFFotoBase64": "base64..."                   // Foto en base64 (max 2MB)
      },
      {
        "AUSoFId": 2,
        "AUSoFIdExt": "uuid-foto-2",
        "AUSoFFileName": "solicitud_uuid_foto2.jpg",
        "AUSoFFotoBase64": "base64..."
      }
    ]
  }
}
```

**Ejemplo Payload Completo:**
```json
{
  "Mode": "INS",
  "AUSolId": 0,
  "AUSolTipo": "P",
  "AUSolUsuAfiliadoId": "02f2e08e-c185-4846-992a-8baa2a23afbe",
  "AUSolIdExt": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "AUSolNroAfiliado": "000193582000000000",
  "AUSolFecha": "2025-12-19",
  "AUSolPresTipo": "Consulta médica",
  "AUSolGravCodigo": 0,
  "AUSolRefAfiliado": "Consulta cardiología Dr. Pérez",
  "AUSolPresId": "COB01",
  "AUSolPresCant": 1,
  "AUSolObsPref": "Dr. Juan Pérez",
  "Foto": {
    "FotoItem": [
      {
        "AUSoFId": 1,
        "AUSoFIdExt": "f1a2b3c4-d5e6-7890-abcd-ef1234567890",
        "AUSoFFileName": "solicitud_a1b2c3d4_foto1.jpg",
        "AUSoFFotoBase64": "/9j/4AAQSkZJRgABAQEA..."
      }
    ]
  }
}
```

**Sistema SOAP**: WSSIATK (Sistema Integral de Autorizaciones)
- **URL**: `http://tkqa.tekhne.com.ar:8700/PRODUCTO_SIA_QA/com.tekhne.asia_ws`
- **Headers**: `USUARIO: mariar`, `PASSWORD: ignacio11`

**Estrategia de Resiliencia**:
- Si el guardado en BD falla → Error 500, rollback completo
- Si el guardado en BD tiene éxito pero SIA falla → Success 200 (solicitud queda en BD local)
- Warning en logs si SIA falla, pero no bloquea al usuario

**Logs Backend**:
```
📝 POST /sia/crear-solicitud
   Usuario autenticado (nuusuid): 02f2e08e-c185-4846-992a-8baa2a23afbe
   AfiliadoId: 000193582000000000001000193582
   Cobertura: COB01
   Referencia: Consulta cardiología - Dr. Pérez
   Profesional: Dr. Juan Pérez
   Fotos adjuntas: 1 + 1
✅ Solicitud insertada en ausolici: a1b2c3d4-e5f6-7890-abcd-ef1234567890
✅ Foto 1 insertada: f1a2b3c4-d5e6-7890-abcd-ef1234567890 (234KB)
✅ Foto 2 insertada: g2b3c4d5-e6f7-8901-bcde-f12345678901 (156KB)
✅ Solicitud guardada en BD: a1b2c3d4-e5f6-7890-abcd-ef1234567890
   📸 Fotos adjuntas: 2
📤 Enviando solicitud al SIA...
   📋 Payload SIA:
      Mode: INS
      AUSolIdExt: a1b2c3d4-e5f6-7890-abcd-ef1234567890
      AUSolNroAfiliado: 000193582000000000
      AUSolPresTipo: Consulta médica
      Fotos: 2
✅ Solicitud enviada a SIA exitosamente
```

---

### Frontend

**Screen**: `mobile/src/screens/SolicitudAutorizacionScreen.tsx` (520 líneas)

**Ubicación**: Perfil → Nueva Solicitud

**Componentes Principales**:

#### 1. Interfaces
```typescript
interface Afiliado {
  AfiliadoId: string
  AfiliadoApellido: string
  AfiliadoNombres: string
  AfiliadoParentesco: string
}

interface Cobertura {
  codigo: string
  nombre: string
  descripcion: string
}
```

#### 2. Estados
```typescript
const [afiliadoSeleccionado, setAfiliadoSeleccionado] = useState<string>('')
const [coberturaSeleccionada, setCoberturaSeleccionada] = useState<string>('')
const [referencia, setReferencia] = useState<string>('')
const [profesional, setProfesional] = useState<string>('')
const [foto1, setFoto1] = useState<string | null>(null)
const [foto2, setFoto2] = useState<string | null>(null)
const [loading, setLoading] = useState(false)
const [coberturas, setCoberturas] = useState<Cobertura[]>([])
const [loadingCoberturas, setLoadingCoberturas] = useState(false)
```

#### 3. Funciones Clave

**cargarCoberturas()** - Obtiene lista de coberturas disponibles
```typescript
const cargarCoberturas = async () => {
  try {
    setLoadingCoberturas(true)
    const response = await apiPost('/sia/prestaciones', {})
    
    // Procesar respuesta (JSON string o array)
    let prestaciones = []
    if (typeof response.data.Resultado === 'string') {
      prestaciones = JSON.parse(response.data.Resultado)
    } else if (Array.isArray(response.data.Resultado)) {
      prestaciones = response.data.Resultado
    }

    // Transformar en coberturas
    const coberturasArray = prestaciones.map((p, index) => ({
      codigo: p.PrestacionId || `COB${index + 1}`,
      nombre: p.PrestacionNombre || `Cobertura ${index + 1}`,
      descripcion: p.PrestacionDescripcion || ''
    }))

    setCoberturas(coberturasArray)
  } catch (error) {
    // Fallback: coberturas por defecto
    setCoberturas([
      { codigo: 'COB01', nombre: 'Consulta Médica', descripcion: '...' },
      { codigo: 'COB02', nombre: 'Estudios', descripcion: '...' },
      // ...
    ])
  } finally {
    setLoadingCoberturas(false)
  }
}
```

**seleccionarFoto()** - Abre galería y obtiene imagen en base64
```typescript
const seleccionarFoto = async (fotoNumero: 1 | 2) => {
  // 1. Solicitar permisos
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (status !== 'granted') {
    Alert.alert('Permisos necesarios', 'Se necesitan permisos...')
    return
  }

  // 2. Abrir galería
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,      // Comprimir imagen
    base64: true,      // Obtener base64
  })

  // 3. Guardar base64
  if (!result.canceled && result.assets[0].base64) {
    const base64 = result.assets[0].base64
    console.log(`📸 Foto ${fotoNumero} seleccionada (${Math.round(base64.length / 1024)}KB)`)
    
    if (fotoNumero === 1) {
      setFoto1(base64)
    } else {
      setFoto2(base64)
    }
  }
}
```

**validarFormulario()** - Validar campos requeridos
```typescript
const validarFormulario = (): boolean => {
  if (!afiliadoSeleccionado) {
    Alert.alert('Error', 'Debe seleccionar un afiliado')
    return false
  }
  if (!coberturaSeleccionada) {
    Alert.alert('Error', 'Debe seleccionar una cobertura')
    return false
  }
  if (!referencia.trim()) {
    Alert.alert('Error', 'Debe ingresar una referencia')
    return false
  }
  return true
}
```

**enviarSolicitud()** - Enviar al backend
```typescript
const enviarSolicitud = async () => {
  if (!validarFormulario()) return

  try {
    setLoading(true)
    
    const payload = {
      afiliadoId: afiliadoSeleccionado,
      cobertura: coberturaSeleccionada,
      referencia: referencia.trim(),
      profesional: profesional.trim() || '',
      fotosBase64: fotos.filter(Boolean),
    }

    const response = await apiPost('/sia/crear-solicitud', payload)

    if (response.success) {
      Alert.alert('Éxito', 'Solicitud enviada correctamente', [
        {
          text: 'OK',
          onPress: () => {
            // Limpiar formulario y navegar atrás
            setAfiliadoSeleccionado('')
            setCoberturaSeleccionada('')
            setReferencia('')
            setProfesional('')
            setFoto1(null)
            setFoto2(null)
            navigation.goBack()
          }
        }
      ])
    }
  } catch (error) {
    Alert.alert('Error', 'No se pudo enviar la solicitud')
  } finally {
    setLoading(false)
  }
}
```

#### 4. Secciones UI

**Selección de Afiliado**:
- Lista de botones con nombre completo y parentesco
- Botón seleccionado: fondo verde (#E8F5E9), borde verde, check verde
- Usa `credenciales` del contexto AuthContext

**Selección de Cobertura**:
- Lista de botones con nombre y descripción
- Carga automática desde `/sia/prestaciones`
- Fallback a 5 coberturas por defecto si falla
- Loading indicator durante carga

**Campo Referencia**:
- TextInput multiline (3 líneas)
- Máximo 200 caracteres
- Contador de caracteres en tiempo real

**Campo Profesional**:
- TextInput single line
- Máximo 100 caracteres
- Opcional

**Adjuntar Fotos**:
- Hasta 5 cajas en grilla, según parámetro `FUNCIONES_APP.MaxFotosAutorizacion`
- Placeholder con ícono de cámara
- Tap para abrir cámara o galería con `expo-image-picker`
- Preview de imagen seleccionada
- Botón X para eliminar foto
- Quality 0.3 para comprimir

**Botón Enviar**:
- Fondo verde (#4CAF50)
- Deshabilitado y gris cuando loading
- ActivityIndicator cuando procesando

---

## Flujo de Uso

### Flujo Completo

1. **Usuario accede a la pantalla**:
   - Navega: Perfil → Nueva Solicitud
   - Se cargan automáticamente las coberturas disponibles desde `/sia/prestaciones`
   - Se muestran los afiliados del grupo familiar desde `credenciales`

2. **Usuario completa el formulario**:
   - **Paso 1**: Selecciona el afiliado del grupo familiar (ej: "CENTENO, SILVIA ALEJANDRA - TITULAR")
   - **Paso 2**: Selecciona la cobertura (ej: "Consulta Médica")
   - **Paso 3**: Ingresa referencia (ej: "Consulta cardiología - Dr. Pérez")
   - **Paso 4** (opcional): Ingresa profesional preferente (ej: "Dr. Juan Pérez")
   - **Paso 5** (opcional): Adjunta entre 1 y 5 fotos según parámetro (órdenes, estudios, respaldos)

3. **Usuario toca "Enviar Solicitud"**:
   - Validación de campos requeridos
   - Si falta algo: Alert con mensaje específico
   - Si todo OK: Loading en botón

4. **Envío al backend**:
   ```
   POST /sia/crear-solicitud
   Authorization: Bearer <token>
    {
      "afiliadoId": "000193582000000000001000193582",
      "cobertura": "COB01",
      "referencia": "Consulta cardiología - Dr. Pérez",
      "profesional": "Dr. Juan Pérez",
      "fotosBase64": [
        "iVBORw0KGgoAAAA...",
        "iVBORw0KGgoAAAA..."
      ]
    }
   ```

5. **Backend procesa**:
   - Valida autenticación (requiere`Auth)
   - Valida campos requeridos
   - Construye parámetros SOAP con:
     * `NUUsuAfiliadoID`: nuusuid del usuario autenticado
     * `AfiliadoId`: del body
     * `FechaSolicitud`: fecha actual YYYY-MM-DD
     * Resto de campos del body
   - Llama `callSoapExecuteSIA('CREAR_SOLICITUD_APP', parametros)`
   - Parsea respuesta SOAP

6. **Respuesta al usuario**:
   - **Éxito**: Alert "Solicitud enviada correctamente" → Limpiar formulario → Navegar atrás
   - **Error**: Alert con mensaje de error específico

---

## Navegación

### Integración en App

**Archivo**: `mobile/src/App.tsx`

**Import**:
```typescript
import SolicitudAutorizacionScreen from './screens/SolicitudAutorizacionScreen'
```

**Stack Navigator** (PerfilStack):
```typescript
<Stack.Screen
  name="SolicitudAutorizacion"
  component={SolicitudAutorizacionScreen}
  options={{ title: 'Nueva Solicitud', headerShown: false }}
/>
```

### Menú de Perfil

**Archivo**: `mobile/src/screens/PerfilMenuScreen.tsx`

**Item de menú**:
```typescript
{
  id: 'solicitud-autorizacion',
  title: 'Nueva Solicitud',
  description: 'Solicitar autorización médica',
  icon: 'add-circle',
  screen: 'SolicitudAutorizacion',
  color: '#FF5722',
}
```

**Posición**: Primera opción del menú (antes de Enrolamientos)

---

## Dependencias

### Backend
- **express**: Framework HTTP
- **soap**: Cliente SOAP para integración SIA
- **pool (pg)**: Cliente PostgreSQL para autenticación

### Frontend
- **expo-image-picker**: Selección de imágenes de galería
  ```bash
  npm install expo-image-picker --legacy-peer-deps
  ```
- **@react-navigation/native**: Navegación entre pantallas
- **react-native-vector-icons**: Iconos (Ionicons)
- **apiPost**: Wrapper HTTP del proyecto

---

## Testing

### Prueba Backend (PowerShell)

**Test directo al endpoint**:
```powershell
# 1. Obtener token de autenticación
$loginResponse = Invoke-RestMethod -Uri 'http://localhost:3000/auth/login' -Method Post -ContentType 'application/json' -Body '{"username":"hj@gmail.com","password":"123456"}'
$token = $loginResponse.token

# 2. Crear solicitud
$headers = @{
  "Authorization" = "Bearer $token"
  "Content-Type" = "application/json"
}

$body = @{
  afiliadoId = "000193582000000000001000193582"
  cobertura = "COB01"
  referencia = "Consulta cardiología - Dr. Pérez"
  profesional = "Dr. Juan Pérez"
  fotosBase64 = @()
} | ConvertTo-Json

Invoke-RestMethod -Uri 'http://localhost:3000/sia/crear-solicitud' -Method Post -Headers $headers -Body $body
```

**Respuesta esperada**:
```json
{
  "success": true,
  "message": "Solicitud de autorización creada correctamente",
  "data": { ... }
}
```

### Prueba Mobile (Flujo Completo)

```
1. Abrir app → Login con usuario válido
2. Tab Perfil → "Nueva Solicitud"
3. Verificar que cargan coberturas (loading → lista)
4. Verificar que aparecen afiliados del grupo familiar
5. Seleccionar afiliado titular
6. Seleccionar cobertura "Consulta Médica"
7. Ingresar referencia: "Test solicitud"
8. Tocar "Enviar Solicitud"
9. Verificar loading en botón
10. Verificar Alert "Éxito"
11. Verificar que limpia formulario y vuelve al menú
```

### Prueba con Fotos

```
1. Seguir flujo anterior hasta paso 7
2. Tocar primera caja de foto
3. Otorgar permisos de galería
4. Seleccionar imagen
5. Editar/recortar imagen
6. Confirmar
7. Verificar preview de imagen en caja
8. Tocar botón X para eliminar
9. Verificar que se borra la imagen
10. Repetir con segunda foto
11. Enviar solicitud con ambas fotos
12. Verificar que envía correctamente (logs backend muestran tamaño KB)
```

### Casos de Prueba

| # | Caso | Input | Output Esperado |
|---|------|-------|-----------------|
| 1 | Envío completo con todo | Todos los campos + 2 fotos | success: true, Alert "Éxito" |
| 2 | Solo campos requeridos | afiliado + cobertura + referencia | success: true |
| 3 | Sin afiliado | cobertura + referencia | Alert "Debe seleccionar afiliado" |
| 4 | Sin cobertura | afiliado + referencia | Alert "Debe seleccionar cobertura" |
| 5 | Sin referencia | afiliado + cobertura | Alert "Debe ingresar referencia" |
| 6 | Referencia vacía (espacios) | "   " | Alert "Debe ingresar referencia" |
| 7 | Solo 1 foto | campos + foto1 | success: true, foto2="" |
| 8 | Sin fotos | solo campos | success: true, ambas fotos="" |
| 9 | Sin permisos galería | intentar seleccionar foto | Alert "Permisos necesarios" |
| 10 | Error backend | datos válidos | Alert "Error...", sin limpiar formulario |

---

## Características Técnicas

### Compresión de Imágenes

- **Quality**: 0.8 (80% calidad JPEG)
- **Aspect ratio**: 4:3 (recorte automático)
- **Edit**: Habilitado (usuario puede recortar/rotar)
- **Format**: Base64 string para envío HTTP

### Validaciones

**Frontend**:
- Afiliado seleccionado (no vacío)
- Cobertura seleccionada (no vacía)
- Referencia con contenido (.trim())
- Máximo 200 caracteres en referencia
- Máximo 100 caracteres en profesional

**Backend**:
- Autenticación requerida (req.user.nuusuid)
- `afiliadoId` requerido (400 si falta)
- `cobertura` requerida (400 si falta)
- `referencia` requerida (400 si falta)
- Fotos opcionales (string vacío si no hay)

### Manejo de Estados

**Loading states**:
- `loading`: Mientras envía solicitud
- `loadingCoberturas`: Mientras carga lista de coberturas

**Disable button**: `submitButton` deshabilitado cuando `loading === true`

**Clear form**: Resetea todos los campos después de envío exitoso

### Logs de Depuración

**Backend**:
```
📝 POST /sia/crear-solicitud - CREAR_SOLICITUD_APP
   Usuario autenticado (nuusuid): ...
   AfiliadoId: ...
   Cobertura: ...
   Referencia: ...
   Profesional: ... o "No especificado"
   Fotos adjuntas: 1 + 0
✅ Solicitud creada exitosamente
```

**Frontend**:
```
✅ 5 coberturas cargadas
📸 Foto 1 seleccionada (234KB)
🗑️  Foto 2 eliminada
📤 Enviando solicitud de autorización...
✅ Solicitud creada exitosamente
```

---

## Errores Conocidos y Soluciones

### Error 1: expo-image-picker no encontrado
**Síntoma**: `Unable to resolve module expo-image-picker`

**Causa**: Dependencia no instalada

**Solución**:
```bash
cd mobile
npm install expo-image-picker --legacy-peer-deps
npx expo start --clear
```

### Error 2: Permisos de galería denegados
**Síntoma**: No se abre galería, Alert "Permisos necesarios"

**Causa**: Usuario no otorgó permisos

**Solución**:
- Android: Configuración → Apps → App → Permisos → Almacenamiento
- iOS: Configuración → Privacidad → Fotos → App → Permitir

### Error 3: Token inválido o expirado
**Síntoma**: Error 401 al enviar solicitud

**Causa**: Token de autenticación expirado

**Solución**: Hacer logout y login nuevamente

### Error 4: Credenciales no cargadas
**Síntoma**: "No hay afiliados disponibles"

**Causa**: Usuario sin credenciales sincronizadas

**Solución**: Ir a Home → Sync automático ejecuta, o hacer logout/login

### Error 5: Coberturas no cargan
**Síntoma**: Lista vacía o "No hay coberturas disponibles"

**Causa**: Servicio `/sia/prestaciones` falló

**Solución**: Se usan coberturas por defecto (5 opciones genéricas)

---

## Mejoras Futuras

### Propuestas

1. **Preview de PDF**:
   ```typescript
   import * as DocumentPicker from 'expo-document-picker'
   
   const seleccionarDocumento = async () => {
     const result = await DocumentPicker.getDocumentAsync({
       type: 'application/pdf',
     })
     // Convertir PDF a base64 y adjuntar
   }
   ```

2. **Tomar foto con cámara**:
   ```typescript
   const tomarFoto = async (fotoNumero: 1 | 2) => {
     const result = await ImagePicker.launchCameraAsync({
       allowsEditing: true,
       aspect: [4, 3],
       quality: 0.8,
       base64: true,
     })
     // Procesar como selección de galería
   }
   ```

3. **Historial de solicitudes**:
   - Nueva pantalla: `MisSolicitudesScreen.tsx`
   - Endpoint: `GET /sia/mis-solicitudes`
   - Lista con estado (PENDIENTE, APROBADA, RECHAZADA)
   - Detalle al tocar

4. **Notificaciones push**:
   - Cuando solicitud cambia de estado
   - Usar `expo-notifications`

5. **Validación de fecha de orden**:
   - Agregar campo: `fechaOrden` (DatePicker)
   - Validar que no sea mayor a hoy
   - Validar que no sea muy antigua (ej: máx 6 meses)

6. **Búsqueda de coberturas**:
   ```typescript
   const [searchQuery, setSearchQuery] = useState('')
   const coberturasFiltradas = coberturas.filter(c =>
     c.nombre.toLowerCase().includes(searchQuery.toLowerCase())
   )
   ```

7. **Guardar borrador**:
   - Guardar estado en `AsyncStorage`
   - Recuperar al volver a abrir
   - Botón "Limpiar borrador"

---

## Referencias

### Archivos del Proyecto

- **Backend**: `backend/server-soap.js` (líneas 3995-4065)
- **Frontend**: `mobile/src/screens/SolicitudAutorizacionScreen.tsx` (520 líneas)
- **Navegación**: `mobile/src/App.tsx`, `mobile/src/screens/PerfilMenuScreen.tsx`
- **Documentación**: `backend/SIA_SERVICES.md`, `backend/SIA_SOAP_EXAMPLES.md`

### Servicios SOAP

- **Sistema**: WSSIATK (Sistema Integral de Autorizaciones)
- **Servicio**: `CREAR_SOLICITUD_APP` (nombre tentativo, ajustar según proveedor)
- **URL**: `http://tkqa.tekhne.com.ar:8700/PRODUCTO_SIA_QA/com.tekhne.asia_ws`
- **Namespace**: `com.tekhne.sia`
- **Headers**: `USUARIO: mariar`, `PASSWORD: ignacio11`

### APIs Relacionadas

- `POST /sia/prestaciones` — Obtener lista de coberturas/prestaciones
- `GET /credenciales` — Obtener grupo familiar (usado para listar afiliados)
- `POST /auth/login` — Autenticación (obtener token)
- `GET /auth/me` — Perfil del usuario autenticado

### Dependencias npm

```json
{
  "expo-image-picker": "^15.0.0",
  "@react-navigation/native": "^6.0.0",
  "react-native-vector-icons": "^10.0.0"
}
```

---

## Changelog

### v1.0.0 - Diciembre 2025
- ✅ Endpoint backend `/sia/crear-solicitud`
- ✅ Pantalla `SolicitudAutorizacionScreen.tsx`
- ✅ Selección de afiliado del grupo familiar
- ✅ Selección de cobertura (carga dinámica desde SIA)
- ✅ Campo de referencia (200 caracteres)
- ✅ Campo de profesional preferente (100 caracteres, opcional)
- ✅ Adjuntar hasta 5 fotos desde cámara o galería (base64, comprimidas)
- ✅ Preview y eliminación de fotos
- ✅ Validaciones frontend y backend
- ✅ Integración SOAP con SIA
- ✅ Navegación desde menú de perfil
- ✅ Manejo de permisos de galería
- ✅ Loading states y feedback al usuario
- ✅ Logs de depuración completos
- ✅ Documentación completa

---

**Última actualización**: 19 de Diciembre de 2025  
**Autor**: GitHub Copilot  
**Estado**: ✅ PRODUCCIÓN
