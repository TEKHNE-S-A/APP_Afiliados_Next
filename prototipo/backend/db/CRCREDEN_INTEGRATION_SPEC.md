# Especificación de Integración - Tabla CRCREDEN (Credenciales Grupo Familiar)

**Fecha**: 4 de diciembre de 2025  
**Estado**: 📝 EN DISEÑO  
**Base de Datos**: PostgreSQL 10.23 (`app_afiliados_genexus`)  
**Tabla**: `crcreden` + `crcredus` (relación usuario-credencial)

---

## Resumen Ejecutivo

La tabla `crcreden` almacenará las **credenciales de todo el grupo familiar** del usuario autenticado. Cada vez que se inicie sesión (`POST /auth/login`), el sistema:

1. **Obtiene el grupo familiar** del usuario desde el servicio SOAP `CONSULTA_DATOS_CREDENCIAL`
2. **Verifica si hay cambios** comparando datos SOAP con registros existentes en `crcreden`
3. **Actualiza la tabla** si detecta diferencias (nuevos miembros, datos modificados, vencimientos actualizados)
4. **Retorna al cliente** las credenciales completas del grupo familiar para visualización

---

## Estructura de Tablas

### Tabla `crcreden` - Datos de Credencial

```sql
CREATE TABLE public.crcreden (
    crcreid      bpchar(30)   NOT NULL,  -- PK: ID único de credencial (AfiliadoId)
    crcrefecvi   date         NOT NULL,  -- Fecha de vencimiento de la credencial
    crcrelin     text         NOT NULL,  -- URL/enlace de la imagen de credencial
    crcrenroaf   bpchar(20)   NOT NULL,  -- Número de afiliado
    crcreapeno   bpchar(62)   NOT NULL,  -- Apellido y Nombre completo
    crcreafili   varchar(40)  NOT NULL,  -- AfiliadoId relacionado (clave foránea lógica)
    crcrecuil    int8         NOT NULL,  -- CUIL del afiliado
    crcreplaid   bpchar(30)   NULL,      -- Plan ID de salud
    crcrei       bytea        NULL,      -- Imagen binaria de credencial (opcional)
    crcrei_gxi   varchar(2048) NULL,     -- Metadata de imagen (opcional)
    crcredocum   bpchar(20)   NOT NULL,  -- Documento (DNI)
    crcresexo    bpchar(1)    NOT NULL,  -- Sexo (M/F)
    crcrefecha   date         NOT NULL,  -- Fecha de nacimiento
    crcrehash    varchar(256) NOT NULL,  -- Hash de verificación de cambios
    crcreifech   timestamp    NOT NULL,  -- Timestamp de última inserción/actualización
    CONSTRAINT crcreden_pkey PRIMARY KEY (crcreid)
);
```

**Índices**:
- `icrcred3`: `btree (crcreplaid)` - Búsqueda por plan
- `ucrcrede`: `btree (crcreafili, crcreid)` - Búsqueda por afiliado

### Tabla `crcredus` - Relación Usuario-Credencial

```sql
CREATE TABLE public.crcredus (
    nuusuid     bpchar(40)  NOT NULL,  -- FK: ID del usuario (nuusuari.nuusuid)
    crcreid     bpchar(30)  NOT NULL,  -- FK: ID de credencial (crcreden.crcreid)
    crcrepropi  bpchar(1)   NOT NULL,  -- Indicador: 'S' = credencial propia, 'N' = familiar
    CONSTRAINT crcredus_pkey PRIMARY KEY (nuusuid, crcreid)
);
```

**Índices**:
- `icrcred1`: `btree (crcreid)` - Búsqueda por credencial
- `ucrcredu`: `btree (nuusuid, crcrepropi DESC, crcreid)` - Ordenar por propietario primero

---

## Flujo de Sincronización en Login

### 1. Petición de Login

**Endpoint**: `POST /auth/login`

**Payload**:
```json
{
  "username": "user@example.com",
  "password": "password123"
}
```

### 2. Consulta SOAP - Datos de Credencial

Después de autenticar, el backend llama al servicio SOAP:

**Servicio**: `CONSULTA_DATOS_CREDENCIAL`

**Parámetros de entrada**:
```javascript
{
  USUARIO: 'mariar',           // Usuario SOAP fijo
  CONTRASENIA: 'ignacio11',    // Password SOAP fijo
  AFILIADOID: '<nuusuafili>'   // AfiliadoId del usuario autenticado (desde nuusuari)
}
```

**Respuesta SOAP esperada**:
```xml
<CONSULTA_DATOS_CREDENCIALResponse>
  <DATOS_CREDENCIAL>
    <CREDENCIAL>
      <AFILIADOID>123456789000000000012345678901</AFILIADOID>
      <FECHAVENCIMIENTO>2025-12-31</FECHAVENCIMIENTO>
      <ENLACEIMAGENCREDENCIAL>https://credencial.tekhne.com.ar/img/123.png</ENLACEIMAGENCREDENCIAL>
      <NUMERODEAFILIADO>0000123456</NUMERODEAFILIADO>
      <APELLIDO>PEREZ</APELLIDO>
      <NOMBRE>JUAN CARLOS</NOMBRE>
      <CUIL>20123456789</CUIL>
      <PLANID>PLAN001</PLANID>
      <DOCUMENTO>12345678</DOCUMENTO>
      <SEXO>M</SEXO>
      <FECHANACIMIENTO>1985-05-15</FECHANACIMIENTO>
    </CREDENCIAL>
    <CREDENCIAL>
      <AFILIADOID>123456789000000000012345678902</AFILIADOID>
      <FECHAVENCIMIENTO>2025-12-31</FECHAVENCIMIENTO>
      <ENLACEIMAGENCREDENCIAL>https://credencial.tekhne.com.ar/img/124.png</ENLACEIMAGENCREDENCIAL>
      <NUMERODEAFILIADO>0000123457</NUMERODEAFILIADO>
      <APELLIDO>PEREZ</APELLIDO>
      <NOMBRE>MARIA LAURA</NOMBRE>
      <CUIL>27987654321</CUIL>
      <PLANID>PLAN001</PLANID>
      <DOCUMENTO>98765432</DOCUMENTO>
      <SEXO>F</SEXO>
      <FECHANACIMIENTO>1987-08-20</FECHANACIMIENTO>
    </CREDENCIAL>
    <!-- Más credenciales del grupo familiar... -->
  </DATOS_CREDENCIAL>
</CONSULTA_DATOS_CREDENCIALResponse>
```

### 3. Comparación y Detección de Cambios

Para cada credencial en la respuesta SOAP:

1. **Calcular hash de verificación**:
   ```javascript
   const dataString = `${AFILIADOID}|${FECHAVENCIMIENTO}|${NUMERODEAFILIADO}|${CUIL}|${APELLIDO}|${NOMBRE}|${DOCUMENTO}|${SEXO}|${FECHANACIMIENTO}|${PLANID}|${ENLACEIMAGENCREDENCIAL}`
   const hash = crypto.createHash('sha256').update(dataString).digest('hex')
   ```

2. **Consultar BD**:
   ```sql
   SELECT crcrehash FROM crcreden WHERE crcreid = $1
   ```

3. **Decidir acción**:
   - Si **no existe** → `INSERT`
   - Si **hash diferente** → `UPDATE`
   - Si **hash igual** → No hacer nada (datos sin cambios)

### 4. Actualización de Base de Datos

#### INSERT (nueva credencial)

```sql
INSERT INTO crcreden (
  crcreid,
  crcrefecvi,
  crcrelin,
  crcrenroaf,
  crcreapeno,
  crcreafili,
  crcrecuil,
  crcreplaid,
  crcredocum,
  crcresexo,
  crcrefecha,
  crcrehash,
  crcreifech
) VALUES (
  $1,  -- AFILIADOID
  $2,  -- FECHAVENCIMIENTO
  $3,  -- ENLACEIMAGENCREDENCIAL
  $4,  -- NUMERODEAFILIADO
  $5,  -- APELLIDO + ', ' + NOMBRE
  $6,  -- AFILIADOID (mismo que crcreid para relacionar)
  $7,  -- CUIL
  $8,  -- PLANID
  $9,  -- DOCUMENTO
  $10, -- SEXO
  $11, -- FECHANACIMIENTO
  $12, -- hash
  NOW() -- crcreifech
)
```

#### UPDATE (credencial existente con cambios)

```sql
UPDATE crcreden SET
  crcrefecvi = $2,
  crcrelin = $3,
  crcrenroaf = $4,
  crcreapeno = $5,
  crcreafili = $6,
  crcrecuil = $7,
  crcreplaid = $8,
  crcredocum = $9,
  crcresexo = $10,
  crcrefecha = $11,
  crcrehash = $12,
  crcreifech = NOW()
WHERE crcreid = $1
```

#### Relación Usuario-Credencial

Después de INSERT/UPDATE de cada credencial, asegurar relación en `crcredus`:

```sql
INSERT INTO crcredus (nuusuid, crcreid, crcrepropi)
VALUES ($1, $2, $3)
ON CONFLICT (nuusuid, crcreid) DO NOTHING
```

**Parámetros**:
- `$1`: `nuusuid` del usuario autenticado (desde `nuusuari`)
- `$2`: `crcreid` (AfiliadoId de la credencial)
- `$3`: `'S'` si `crcreid == nuusuafili` del usuario, `'N'` si es familiar

---

## Implementación Backend

### Función: `syncCredencialesGrupoFamiliar(nuusuid, afiliadoId)`

**Ubicación**: `backend/server-soap.js`

**Parámetros**:
- `nuusuid`: ID del usuario autenticado (desde tabla `nuusuari`)
- `afiliadoId`: AfiliadoId del usuario (campo `nuusuafili` de `nuusuari`)

**Retorna**: Array de credenciales con estado de sincronización

**Proceso**:

```javascript
async function syncCredencialesGrupoFamiliar(nuusuid, afiliadoId) {
  try {
    // 1. Consultar SOAP
    const soapResult = await soapClient.CONSULTA_DATOS_CREDENCIALAsync({
      USUARIO: SOAP_USER,
      CONTRASENIA: SOAP_PASSWORD,
      AFILIADOID: afiliadoId
    })
    
    const credenciales = parseDatosCredencial(soapResult)
    const syncResults = []
    
    // 2. Para cada credencial del grupo familiar
    for (const cred of credenciales) {
      const hash = calculateCredencialHash(cred)
      
      // 3. Verificar si existe
      const existing = await db.query(
        'SELECT crcrehash FROM crcreden WHERE crcreid = $1',
        [cred.AFILIADOID]
      )
      
      let action = 'UNCHANGED'
      
      if (existing.rows.length === 0) {
        // INSERT nueva credencial
        await insertCredencial(cred, hash)
        action = 'INSERTED'
      } else if (existing.rows[0].crcrehash !== hash) {
        // UPDATE credencial con cambios
        await updateCredencial(cred, hash)
        action = 'UPDATED'
      }
      
      // 4. Asegurar relación usuario-credencial
      const esPropia = cred.AFILIADOID === afiliadoId ? 'S' : 'N'
      await db.query(
        `INSERT INTO crcredus (nuusuid, crcreid, crcrepropi)
         VALUES ($1, $2, $3)
         ON CONFLICT (nuusuid, crcreid) DO NOTHING`,
        [nuusuid, cred.AFILIADOID, esPropia]
      )
      
      syncResults.push({
        afiliadoId: cred.AFILIADOID,
        nombre: `${cred.APELLIDO}, ${cred.NOMBRE}`,
        action
      })
    }
    
    return syncResults
    
  } catch (error) {
    console.error('❌ Error sincronizando credenciales:', error)
    throw error
  }
}
```

### Helpers

```javascript
// Calcular hash de verificación
function calculateCredencialHash(cred) {
  const dataString = [
    cred.AFILIADOID,
    cred.FECHAVENCIMIENTO,
    cred.NUMERODEAFILIADO,
    cred.CUIL,
    cred.APELLIDO,
    cred.NOMBRE,
    cred.DOCUMENTO,
    cred.SEXO,
    cred.FECHANACIMIENTO,
    cred.PLANID,
    cred.ENLACEIMAGENCREDENCIAL
  ].join('|')
  
  return crypto.createHash('sha256').update(dataString).digest('hex')
}

// Parsear respuesta SOAP
function parseDatosCredencial(soapResult) {
  const data = soapResult?.[0]?.DATOS_CREDENCIAL?.CREDENCIAL
  if (!data) return []
  return Array.isArray(data) ? data : [data]
}

// INSERT credencial
async function insertCredencial(cred, hash) {
  const query = `
    INSERT INTO crcreden (
      crcreid, crcrefecvi, crcrelin, crcrenroaf, crcreapeno,
      crcreafili, crcrecuil, crcreplaid, crcredocum, crcresexo,
      crcrefecha, crcrehash, crcreifech
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
  `
  
  await db.query(query, [
    cred.AFILIADOID,
    cred.FECHAVENCIMIENTO,
    cred.ENLACEIMAGENCREDENCIAL || '',
    cred.NUMERODEAFILIADO,
    `${cred.APELLIDO}, ${cred.NOMBRE}`,
    cred.AFILIADOID, // crcreafili = mismo que crcreid
    parseInt(cred.CUIL || '0'),
    cred.PLANID,
    cred.DOCUMENTO,
    cred.SEXO,
    cred.FECHANACIMIENTO,
    hash
  ])
}

// UPDATE credencial
async function updateCredencial(cred, hash) {
  const query = `
    UPDATE crcreden SET
      crcrefecvi = $2, crcrelin = $3, crcrenroaf = $4, crcreapeno = $5,
      crcreafili = $6, crcrecuil = $7, crcreplaid = $8, crcredocum = $9,
      crcresexo = $10, crcrefecha = $11, crcrehash = $12, crcreifech = NOW()
    WHERE crcreid = $1
  `
  
  await db.query(query, [
    cred.AFILIADOID,
    cred.FECHAVENCIMIENTO,
    cred.ENLACEIMAGENCREDENCIAL || '',
    cred.NUMERODEAFILIADO,
    `${cred.APELLIDO}, ${cred.NOMBRE}`,
    cred.AFILIADOID,
    parseInt(cred.CUIL || '0'),
    cred.PLANID,
    cred.DOCUMENTO,
    cred.SEXO,
    cred.FECHANACIMIENTO,
    hash
  ])
}
```

---

## Integración en `/auth/login`

**Modificar**: `POST /auth/login` en `backend/server-soap.js`

```javascript
app.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body
    
    // 1. Autenticar usuario (verificar password, etc.)
    // ... código existente ...
    
    // 2. Obtener datos del usuario desde nuusuari
    const userQuery = await db.query(
      'SELECT nuusuid, nuusuafili, nuusuapell, nuusumail FROM nuusuari WHERE nuusumailf = $1',
      [username]
    )
    
    if (userQuery.rows.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado' })
    }
    
    const user = userQuery.rows[0]
    
    // 3. Sincronizar credenciales del grupo familiar
    const syncResults = await syncCredencialesGrupoFamiliar(
      user.nuusuid,
      user.nuusuafili
    )
    
    console.log(`✅ Credenciales sincronizadas: ${syncResults.length} total`)
    syncResults.forEach(r => {
      console.log(`   - ${r.nombre}: ${r.action}`)
    })
    
    // 4. Obtener credenciales actualizadas para retornar al cliente
    const credsQuery = await db.query(`
      SELECT c.*, cu.crcrepropi
      FROM crcreden c
      INNER JOIN crcredus cu ON c.crcreid = cu.crcreid
      WHERE cu.nuusuid = $1
      ORDER BY cu.crcrepropi DESC, c.crcreapeno
    `, [user.nuusuid])
    
    // 5. Generar token y retornar con credenciales
    const token = generateToken(user)
    
    res.json({
      token,
      user: {
        id: user.nuusuid,
        email: user.nuusumail,
        nombre: user.nuusuapell
      },
      credenciales: credsQuery.rows,
      sync: {
        total: syncResults.length,
        inserted: syncResults.filter(r => r.action === 'INSERTED').length,
        updated: syncResults.filter(r => r.action === 'UPDATED').length,
        unchanged: syncResults.filter(r => r.action === 'UNCHANGED').length
      }
    })
    
  } catch (error) {
    console.error('❌ Error en login:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})
```

---

## Endpoint para Refrescar Credenciales

**Nuevo endpoint**: `GET /credenciales/refresh`

Permite al cliente solicitar sincronización de credenciales sin hacer login completo.

```javascript
app.get('/credenciales/refresh', authenticateToken, async (req, res) => {
  try {
    const { nuusuid, nuusuafili } = req.user // desde token JWT
    
    // Sincronizar
    const syncResults = await syncCredencialesGrupoFamiliar(nuusuid, nuusuafili)
    
    // Obtener credenciales actualizadas
    const credsQuery = await db.query(`
      SELECT c.*, cu.crcrepropi
      FROM crcreden c
      INNER JOIN crcredus cu ON c.crcreid = cu.crcreid
      WHERE cu.nuusuid = $1
      ORDER BY cu.crcrepropi DESC, c.crcreapeno
    `, [nuusuid])
    
    res.json({
      credenciales: credsQuery.rows,
      sync: {
        total: syncResults.length,
        inserted: syncResults.filter(r => r.action === 'INSERTED').length,
        updated: syncResults.filter(r => r.action === 'UPDATED').length,
        unchanged: syncResults.filter(r => r.action === 'UNCHANGED').length
      }
    })
    
  } catch (error) {
    console.error('❌ Error refrescando credenciales:', error)
    res.status(500).json({ error: 'Error al refrescar credenciales' })
  }
})
```

---

## Esquema de Respuesta al Cliente

### Login exitoso con credenciales

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "0000000000000000000000000000000000000001",
    "email": "juan.perez@example.com",
    "nombre": "PEREZ, JUAN CARLOS"
  },
  "credenciales": [
    {
      "crcreid": "123456789000000000012345678901",
      "crcrefecvi": "2025-12-31",
      "crcrelin": "https://credencial.tekhne.com.ar/img/123.png",
      "crcrenroaf": "0000123456",
      "crcreapeno": "PEREZ, JUAN CARLOS",
      "crcreafili": "123456789000000000012345678901",
      "crcrecuil": "20123456789",
      "crcreplaid": "PLAN001",
      "crcredocum": "12345678",
      "crcresexo": "M",
      "crcrefecha": "1985-05-15",
      "crcrepropi": "S"
    },
    {
      "crcreid": "123456789000000000012345678902",
      "crcrefecvi": "2025-12-31",
      "crcrelin": "https://credencial.tekhne.com.ar/img/124.png",
      "crcrenroaf": "0000123457",
      "crcreapeno": "PEREZ, MARIA LAURA",
      "crcreafili": "123456789000000000012345678902",
      "crcrecuil": "27987654321",
      "crcreplaid": "PLAN001",
      "crcredocum": "98765432",
      "crcresexo": "F",
      "crcrefecha": "1987-08-20",
      "crcrepropi": "N"
    }
  ],
  "sync": {
    "total": 2,
    "inserted": 2,
    "updated": 0,
    "unchanged": 0
  }
}
```

---

## Integración en App Móvil

### AuthContext - Modificaciones

**Archivo**: `mobile/src/contexts/AuthContext.tsx`

```typescript
type Credencial = {
  crcreid: string
  crcrefecvi: string
  crcrelin: string
  crcrenroaf: string
  crcreapeno: string
  crcrepropi: 'S' | 'N'
  // ... otros campos
}

type AuthContextData = {
  // ... campos existentes
  credenciales: Credencial[]
  refreshCredenciales: () => Promise<void>
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ... estados existentes
  const [credenciales, setCredenciales] = useState<Credencial[]>([])

  const signIn = async (username: string, password: string) => {
    setLoading(true)
    try {
      const res = await apiPost('/auth/login', { username, password })
      
      // ... código existente de token y user
      
      // Guardar credenciales del grupo familiar
      if (res.credenciales && Array.isArray(res.credenciales)) {
        setCredenciales(res.credenciales)
        console.log(`✅ ${res.credenciales.length} credenciales cargadas`)
        if (res.sync) {
          console.log(`📊 Sync: +${res.sync.inserted} ↻${res.sync.updated} =${res.sync.unchanged}`)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const refreshCredenciales = async () => {
    if (!token) return
    try {
      const res = await apiGet('/credenciales/refresh')
      if (res.credenciales) {
        setCredenciales(res.credenciales)
        console.log(`🔄 Credenciales actualizadas: ${res.credenciales.length}`)
      }
    } catch (e) {
      console.warn('Error refrescando credenciales:', e)
    }
  }

  const signOut = async () => {
    // ... código existente
    setCredenciales([])
  }

  return (
    <AuthContext.Provider value={{ 
      user, token, credenciales, loading, 
      signIn, signOut, refreshCredenciales 
    }}>
      {children}
    </AuthContext.Provider>
  )
}
```

### Pantalla de Credenciales

**Nuevo componente**: `mobile/src/screens/CredencialesScreen.tsx`

```typescript
import React, { useEffect } from 'react'
import { View, Text, FlatList, Image, TouchableOpacity, RefreshControl } from 'react-native'
import { useAuth } from '../contexts/AuthContext'

export default function CredencialesScreen() {
  const { credenciales, refreshCredenciales } = useAuth()
  const [refreshing, setRefreshing] = React.useState(false)

  const onRefresh = async () => {
    setRefreshing(true)
    await refreshCredenciales()
    setRefreshing(false)
  }

  const renderCredencial = ({ item }) => (
    <View style={{ padding: 16, borderBottomWidth: 1, borderColor: '#eee' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {item.crcrelin && (
          <Image 
            source={{ uri: item.crcrelin }} 
            style={{ width: 80, height: 50, marginRight: 12, borderRadius: 4 }}
          />
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold' }}>
            {item.crcreapeno}
            {item.crcrepropi === 'S' && ' ⭐'}
          </Text>
          <Text style={{ color: '#666', fontSize: 12 }}>
            Nro: {item.crcrenroaf} • Doc: {item.crcredocum}
          </Text>
          <Text style={{ color: '#666', fontSize: 12 }}>
            Vence: {item.crcrefecvi}
          </Text>
        </View>
      </View>
    </View>
  )

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <FlatList
        data={credenciales}
        keyExtractor={(item) => item.crcreid}
        renderItem={renderCredencial}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={{ padding: 32, alignItems: 'center' }}>
            <Text style={{ color: '#999' }}>No hay credenciales cargadas</Text>
          </View>
        }
      />
    </View>
  )
}
```

---

## Casos de Uso

### Caso 1: Primer Login (Credenciales Nuevas)

1. Usuario ingresa email/password
2. Backend autentica y obtiene `nuusuid` y `nuusuafili`
3. Llama SOAP `CONSULTA_DATOS_CREDENCIAL` con `nuusuafili`
4. SOAP retorna 3 credenciales (titular + 2 familiares)
5. Backend verifica: ninguna existe en `crcreden`
6. INSERT de 3 registros en `crcreden`
7. INSERT de 3 relaciones en `crcredus`
8. Retorna al cliente las 3 credenciales

**Log esperado**:
```
✅ Credenciales sincronizadas: 3 total
   - PEREZ, JUAN CARLOS: INSERTED
   - PEREZ, MARIA LAURA: INSERTED
   - PEREZ, LUCAS MARTIN: INSERTED
```

### Caso 2: Login con Datos Sin Cambios

1. Usuario hace login nuevamente
2. Backend consulta SOAP
3. Calcula hash de cada credencial
4. Compara con `crcrehash` en BD
5. Todos los hash coinciden → No hace UPDATE
6. Retorna credenciales existentes

**Log esperado**:
```
✅ Credenciales sincronizadas: 3 total
   - PEREZ, JUAN CARLOS: UNCHANGED
   - PEREZ, MARIA LAURA: UNCHANGED
   - PEREZ, LUCAS MARTIN: UNCHANGED
```

### Caso 3: Login con Vencimiento Actualizado

1. Usuario hace login después de renovación de plan
2. SOAP retorna nuevas fechas de vencimiento
3. Backend detecta hash diferente en 3 credenciales
4. UPDATE de `crcrefecvi` y `crcrehash` en las 3
5. Retorna credenciales actualizadas

**Log esperado**:
```
✅ Credenciales sincronizadas: 3 total
   - PEREZ, JUAN CARLOS: UPDATED
   - PEREZ, MARIA LAURA: UPDATED
   - PEREZ, LUCAS MARTIN: UPDATED
```

### Caso 4: Nueva Credencial en Grupo Familiar

1. Usuario agrega un hijo al grupo familiar en el sistema
2. En próximo login, SOAP retorna 4 credenciales
3. Backend detecta 3 existentes (UNCHANGED) + 1 nueva
4. INSERT de la nueva credencial
5. Retorna 4 credenciales

**Log esperado**:
```
✅ Credenciales sincronizadas: 4 total
   - PEREZ, JUAN CARLOS: UNCHANGED
   - PEREZ, MARIA LAURA: UNCHANGED
   - PEREZ, LUCAS MARTIN: UNCHANGED
   - PEREZ, ANA SOFIA: INSERTED
```

---

## Seguridad y Performance

### Optimizaciones

1. **Batch Processing**: Procesar todas las credenciales en una transacción única
2. **Índices**: Usar índices en `crcreid` y `(crcreafili, crcreid)` para búsquedas rápidas
3. **Hash Comparison**: Evitar UPDATE innecesario comparando hashes primero
4. **ON CONFLICT**: Usar `ON CONFLICT DO NOTHING` en `crcredus` para idempotencia

### Manejo de Errores

```javascript
// Envolver sincronización en transacción
async function syncCredencialesGrupoFamiliar(nuusuid, afiliadoId) {
  const client = await db.getClient()
  try {
    await client.query('BEGIN')
    
    // ... lógica de sincronización ...
    
    await client.query('COMMIT')
    return syncResults
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ Error en sincronización, rollback aplicado:', error)
    throw error
  } finally {
    client.release()
  }
}
```

### Logs de Auditoría

Cada INSERT/UPDATE registra `crcreifech = NOW()` para auditoría.

Query para ver última sincronización:
```sql
SELECT 
  c.crcreid,
  c.crcreapeno,
  c.crcreifech,
  NOW() - c.crcreifech AS tiempo_desde_ultima_sync
FROM crcreden c
INNER JOIN crcredus cu ON c.crcreid = cu.crcreid
WHERE cu.nuusuid = '<nuusuid>'
ORDER BY c.crcreifech DESC
```

---

## Testing

### Test Manual

1. **Crear usuario de prueba** en `nuusuari` con `nuusuafili` válido
2. **Ejecutar login** y verificar respuesta con `credenciales`
3. **Verificar BD**:
   ```sql
   SELECT * FROM crcreden WHERE crcreafili = '<afiliadoId>';
   SELECT * FROM crcredus WHERE nuusuid = '<nuusuid>';
   ```
4. **Modificar datos en SOAP** (simulado) y hacer login nuevamente
5. **Verificar UPDATE** comparando `crcrehash` antes/después

### Queries de Verificación

```sql
-- Contar credenciales por usuario
SELECT 
  u.nuusumail,
  COUNT(cu.crcreid) AS total_credenciales,
  SUM(CASE WHEN cu.crcrepropi = 'S' THEN 1 ELSE 0 END) AS propias,
  SUM(CASE WHEN cu.crcrepropi = 'N' THEN 1 ELSE 0 END) AS familiares
FROM nuusuari u
LEFT JOIN crcredus cu ON u.nuusuid = cu.nuusuid
GROUP BY u.nuusumail;

-- Ver última sincronización de credenciales
SELECT 
  crcreid,
  crcreapeno,
  crcrefecvi,
  crcreifech,
  EXTRACT(EPOCH FROM (NOW() - crcreifech))/60 AS minutos_desde_sync
FROM crcreden
ORDER BY crcreifech DESC
LIMIT 10;
```

---

## Próximos Pasos

1. ✅ **Documentación completa** - Este documento
2. ⏳ **Implementar funciones helper** en `server-soap.js`
3. ⏳ **Modificar `/auth/login`** para incluir sincronización
4. ⏳ **Crear endpoint** `/credenciales/refresh`
5. ⏳ **Actualizar AuthContext** en app móvil
6. ⏳ **Crear pantalla** `CredencialesScreen.tsx`
7. ⏳ **Testing end-to-end** con usuario real
8. ⏳ **Performance tuning** si hay muchas credenciales

---

**Fin de Especificación CRCREDEN**
