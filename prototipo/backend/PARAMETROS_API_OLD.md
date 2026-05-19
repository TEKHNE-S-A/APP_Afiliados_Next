# API de Gestión de Parámetros (nusispar)

Sistema completo de gestión de parámetros configurables de la aplicación a través de endpoints REST.

---

## Tabla: nusispar

### Estructura
```sql
CREATE TABLE nusispar (
    nusisgrupa bpchar(30) NOT NULL,  -- Grupo del parámetro
    nusistippa bpchar(30) NOT NULL,  -- Tipo/nombre del parámetro
    nusisvalpa text,                 -- Valor del parámetro
    CONSTRAINT nusispar_pkey PRIMARY KEY (nusisgrupa, nusistippa)
);
```

### Parámetros Actuales

| Grupo | Tipo | Valor | Descripción |
|-------|------|-------|-------------|
| GENERALES | VigenciaCred | 10 | Días hábiles de vigencia para credenciales |

---

## Endpoints Disponibles

### 1. Listar Todos los Parámetros

**GET** `/parametros`

Obtiene todos los parámetros del sistema ordenados por grupo y tipo.

#### Request
```http
GET /parametros HTTP/1.1
Host: localhost:3000
```

#### Response (200 OK)
```json
{
  "success": true,
  "total": 1,
  "parametros": [
    {
      "nusisgrupa": "GENERALES",
      "nusistippa": "VigenciaCred",
      "nusisvalpa": "10"
    }
  ]
}
```

#### Ejemplo PowerShell
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/parametros" -Method GET
```

#### Ejemplo cURL
```bash
curl -X GET http://localhost:3000/parametros
```

---

### 2. Listar Parámetros de un Grupo

**GET** `/parametros/:grupo`

Obtiene todos los parámetros de un grupo específico.

#### Request
```http
GET /parametros/GENERALES HTTP/1.1
Host: localhost:3000
```

#### Response (200 OK)
```json
{
  "success": true,
  "grupo": "GENERALES",
  "total": 1,
  "parametros": [
    {
      "nusisgrupa": "GENERALES",
      "nusistippa": "VigenciaCred",
      "nusisvalpa": "10"
    }
  ]
}
```

#### Response (404 Not Found)
```json
{
  "error": "Grupo no encontrado",
  "grupo": "INEXISTENTE"
}
```

#### Ejemplo PowerShell
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/parametros/GENERALES" -Method GET
```

---

### 3. Obtener Parámetro Específico

**GET** `/parametros/:grupo/:tipo`

Obtiene un parámetro específico por grupo y tipo.

#### Request
```http
GET /parametros/GENERALES/VigenciaCred HTTP/1.1
Host: localhost:3000
```

#### Response (200 OK)
```json
{
  "success": true,
  "parametro": {
    "nusisgrupa": "GENERALES",
    "nusistippa": "VigenciaCred",
    "nusisvalpa": "10"
  }
}
```

#### Response (404 Not Found)
```json
{
  "error": "Parámetro no encontrado",
  "grupo": "GENERALES",
  "tipo": "NoExiste"
}
```

#### Ejemplo PowerShell
```powershell
$parametro = Invoke-RestMethod -Uri "http://localhost:3000/parametros/GENERALES/VigenciaCred" -Method GET
Write-Host "Días de vigencia: $($parametro.parametro.nusisvalpa)"
```

---

### 4. Actualizar Parámetro

**PUT** `/parametros/:grupo/:tipo`

Actualiza el valor de un parámetro existente.

#### Request
```http
PUT /parametros/GENERALES/VigenciaCred HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "valor": "15"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Parámetro actualizado correctamente",
  "parametro": {
    "nusisgrupa": "GENERALES",
    "nusistippa": "VigenciaCred",
    "nusisvalpa": "15"
  }
}
```

#### Response (400 Bad Request)
```json
{
  "error": "El campo \"valor\" es requerido"
}
```

#### Response (404 Not Found)
```json
{
  "error": "Parámetro no encontrado",
  "grupo": "GENERALES",
  "tipo": "NoExiste"
}
```

#### Ejemplo PowerShell
```powershell
$body = @{ valor = "15" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/parametros/GENERALES/VigenciaCred" `
  -Method PUT `
  -ContentType "application/json" `
  -Body $body
```

#### Ejemplo cURL
```bash
curl -X PUT http://localhost:3000/parametros/GENERALES/VigenciaCred \
  -H "Content-Type: application/json" \
  -d '{"valor":"15"}'
```

---

### 5. Crear Nuevo Parámetro

**POST** `/parametros`

Crea un nuevo parámetro en el sistema.

#### Request
```http
POST /parametros HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "grupo": "GENERALES",
  "tipo": "TimeoutSOAP",
  "valor": "30000"
}
```

#### Response (201 Created)
```json
{
  "success": true,
  "message": "Parámetro creado correctamente",
  "parametro": {
    "nusisgrupa": "GENERALES",
    "nusistippa": "TimeoutSOAP",
    "nusisvalpa": "30000"
  }
}
```

#### Response (400 Bad Request)
```json
{
  "error": "Los campos \"grupo\", \"tipo\" y \"valor\" son requeridos"
}
```

#### Response (409 Conflict)
```json
{
  "error": "El parámetro ya existe. Use PUT para actualizar.",
  "grupo": "GENERALES",
  "tipo": "VigenciaCred"
}
```

#### Ejemplo PowerShell
```powershell
$body = @{
  grupo = "GENERALES"
  tipo = "TimeoutSOAP"
  valor = "30000"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/parametros" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

---

### 6. Eliminar Parámetro

**DELETE** `/parametros/:grupo/:tipo`

Elimina un parámetro del sistema.

⚠️ **Precaución**: Eliminar parámetros en uso puede causar que el sistema use valores por defecto (fallback).

#### Request
```http
DELETE /parametros/GENERALES/TimeoutSOAP HTTP/1.1
Host: localhost:3000
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Parámetro eliminado correctamente",
  "parametroEliminado": {
    "nusisgrupa": "GENERALES",
    "nusistippa": "TimeoutSOAP",
    "nusisvalpa": "30000"
  }
}
```

#### Response (404 Not Found)
```json
{
  "error": "Parámetro no encontrado",
  "grupo": "GENERALES",
  "tipo": "NoExiste"
}
```

#### Ejemplo PowerShell
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/parametros/GENERALES/TimeoutSOAP" -Method DELETE
```

---

## Casos de Uso

### Caso 1: Cambiar Vigencia de Credenciales

**Problema**: Las credenciales deben tener 15 días de vigencia en lugar de 10.

**Solución**:
```powershell
# 1. Verificar valor actual
$actual = Invoke-RestMethod -Uri "http://localhost:3000/parametros/GENERALES/VigenciaCred"
Write-Host "Vigencia actual: $($actual.parametro.nusisvalpa) días"

# 2. Actualizar a 15 días
$body = @{ valor = "15" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/parametros/GENERALES/VigenciaCred" `
  -Method PUT `
  -ContentType "application/json" `
  -Body $body

# 3. Verificar cambio
$nuevo = Invoke-RestMethod -Uri "http://localhost:3000/parametros/GENERALES/VigenciaCred"
Write-Host "Nueva vigencia: $($nuevo.parametro.nusisvalpa) días"

# 4. Reiniciar backend para aplicar (opcional si hay caché)
# El backend lee el parámetro cada vez, no es necesario reiniciar
```

---

### Caso 2: Agregar Nuevo Parámetro de Configuración

**Problema**: Se necesita configurar el timeout de las llamadas SOAP.

**Solución**:
```powershell
# Crear parámetro TimeoutSOAP (en milisegundos)
$body = @{
  grupo = "GENERALES"
  tipo = "TimeoutSOAP"
  valor = "30000"  # 30 segundos
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/parametros" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body

# Modificar código para usar este parámetro
# En server-soap.js, agregar función:
# async function getSoapTimeout() {
#   const result = await db.query(
#     'SELECT nusisvalpa FROM nusispar WHERE nusisgrupa=$1 AND nusistippa=$2',
#     ['GENERALES', 'TimeoutSOAP']
#   )
#   return result.rows.length > 0 ? parseInt(result.rows[0].nusisvalpa) : 30000
# }
```

---

### Caso 3: Listar Todos los Parámetros para Auditoría

```powershell
# Obtener todos los parámetros
$parametros = Invoke-RestMethod -Uri "http://localhost:3000/parametros"

# Mostrar tabla formateada
$parametros.parametros | Format-Table -Property nusisgrupa, nusistippa, nusisvalpa -AutoSize

# Exportar a CSV para auditoría
$parametros.parametros | Export-Csv -Path "parametros_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').csv" -NoTypeInformation
Write-Host "Backup de parámetros creado"
```

---

### Caso 4: Restaurar Parámetro desde Backup

```powershell
# Leer backup CSV
$backup = Import-Csv -Path "parametros_backup_20250120_153000.csv"

# Restaurar cada parámetro
foreach ($param in $backup) {
  $body = @{ valor = $param.nusisvalpa } | ConvertTo-Json
  
  try {
    Invoke-RestMethod -Uri "http://localhost:3000/parametros/$($param.nusisgrupa)/$($param.nusistippa)" `
      -Method PUT `
      -ContentType "application/json" `
      -Body $body `
      -ErrorAction Stop
    Write-Host "✅ Restaurado: $($param.nusisgrupa).$($param.nusistippa)"
  } catch {
    Write-Host "❌ Error: $($param.nusisgrupa).$($param.nusistippa) - $_"
  }
}
```

---

## Integración con Frontend

### Ejemplo React Native (Expo)

```typescript
// src/services/parametros.ts
import { apiGet, apiPut, apiPost, apiDelete } from './api'

export interface Parametro {
  nusisgrupa: string
  nusistippa: string
  nusisvalpa: string
}

export async function listarParametros(): Promise<Parametro[]> {
  const response = await apiGet('/parametros')
  return response.parametros
}

export async function obtenerParametro(grupo: string, tipo: string): Promise<Parametro> {
  const response = await apiGet(`/parametros/${grupo}/${tipo}`)
  return response.parametro
}

export async function actualizarParametro(
  grupo: string, 
  tipo: string, 
  valor: string
): Promise<Parametro> {
  const response = await apiPut(`/parametros/${grupo}/${tipo}`, { valor })
  return response.parametro
}

export async function crearParametro(
  grupo: string, 
  tipo: string, 
  valor: string
): Promise<Parametro> {
  const response = await apiPost('/parametros', { grupo, tipo, valor })
  return response.parametro
}

export async function eliminarParametro(grupo: string, tipo: string): Promise<void> {
  await apiDelete(`/parametros/${grupo}/${tipo}`)
}
```

### Pantalla Admin de Parámetros (React Native)

```typescript
// src/screens/AdminParametrosScreen.tsx
import React, { useEffect, useState } from 'react'
import { View, Text, FlatList, TextInput, Button, Alert } from 'react-native'
import { listarParametros, actualizarParametro, Parametro } from '../services/parametros'

export default function AdminParametrosScreen() {
  const [parametros, setParametros] = useState<Parametro[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarParametros()
  }, [])

  async function cargarParametros() {
    try {
      const data = await listarParametros()
      setParametros(data)
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los parámetros')
    } finally {
      setLoading(false)
    }
  }

  async function handleActualizar(grupo: string, tipo: string, nuevoValor: string) {
    try {
      await actualizarParametro(grupo, tipo, nuevoValor)
      Alert.alert('Éxito', 'Parámetro actualizado')
      cargarParametros() // Recargar lista
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el parámetro')
    }
  }

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        Parámetros del Sistema
      </Text>
      
      <FlatList
        data={parametros}
        keyExtractor={(item) => `${item.nusisgrupa}_${item.nusistippa}`}
        renderItem={({ item }) => (
          <ParametroItem 
            parametro={item} 
            onActualizar={handleActualizar}
          />
        )}
      />
    </View>
  )
}
```

---

## Seguridad

⚠️ **IMPORTANTE**: Los endpoints de gestión de parámetros NO tienen autenticación en la versión actual.

### Recomendaciones de Producción

1. **Agregar middleware de autenticación admin**:
```javascript
// Middleware para validar rol admin
function requireAdmin(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    return res.status(401).json({ error: 'No autorizado' })
  }
  
  // Validar token y verificar rol admin
  // ... lógica de validación ...
  
  next()
}

// Aplicar a endpoints de parámetros
app.get('/parametros', requireAdmin, async (req, res) => { /* ... */ })
app.put('/parametros/:grupo/:tipo', requireAdmin, async (req, res) => { /* ... */ })
app.post('/parametros', requireAdmin, async (req, res) => { /* ... */ })
app.delete('/parametros/:grupo/:tipo', requireAdmin, async (req, res) => { /* ... */ })
```

2. **Logging de cambios**: Registrar quién modifica qué parámetro
3. **Validación de valores**: Agregar validaciones específicas por tipo de parámetro
4. **Rate limiting**: Limitar llamadas para prevenir abusos

---

## Testing

### Test Manual con PowerShell

```powershell
# Script completo de testing
Write-Host "=== Testing API Parámetros ===" -ForegroundColor Cyan

# 1. Listar todos
Write-Host "`n1. Listar todos los parámetros" -ForegroundColor Yellow
$todos = Invoke-RestMethod -Uri "http://localhost:3000/parametros"
$todos.parametros | Format-Table

# 2. Obtener parámetro específico
Write-Host "`n2. Obtener VigenciaCred" -ForegroundColor Yellow
$vigencia = Invoke-RestMethod -Uri "http://localhost:3000/parametros/GENERALES/VigenciaCred"
Write-Host "Valor actual: $($vigencia.parametro.nusisvalpa) días"

# 3. Crear nuevo parámetro
Write-Host "`n3. Crear parámetro de prueba" -ForegroundColor Yellow
$bodyCreate = @{ grupo = "TEST"; tipo = "Prueba"; valor = "123" } | ConvertTo-Json
$nuevo = Invoke-RestMethod -Uri "http://localhost:3000/parametros" `
  -Method POST -ContentType "application/json" -Body $bodyCreate
Write-Host "Creado: $($nuevo.parametro.nusisgrupa).$($nuevo.parametro.nusistippa) = $($nuevo.parametro.nusisvalpa)"

# 4. Actualizar parámetro
Write-Host "`n4. Actualizar parámetro de prueba" -ForegroundColor Yellow
$bodyUpdate = @{ valor = "456" } | ConvertTo-Json
$actualizado = Invoke-RestMethod -Uri "http://localhost:3000/parametros/TEST/Prueba" `
  -Method PUT -ContentType "application/json" -Body $bodyUpdate
Write-Host "Actualizado a: $($actualizado.parametro.nusisvalpa)"

# 5. Eliminar parámetro
Write-Host "`n5. Eliminar parámetro de prueba" -ForegroundColor Yellow
$eliminado = Invoke-RestMethod -Uri "http://localhost:3000/parametros/TEST/Prueba" -Method DELETE
Write-Host "Eliminado: $($eliminado.parametroEliminado.nusisgrupa).$($eliminado.parametroEliminado.nusistippa)"

Write-Host "`n=== Testing Completado ===" -ForegroundColor Green
```

---

## Referencia Rápida

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/parametros` | Listar todos |
| GET | `/parametros/:grupo` | Listar por grupo |
| GET | `/parametros/:grupo/:tipo` | Obtener uno |
| PUT | `/parametros/:grupo/:tipo` | Actualizar |
| POST | `/parametros` | Crear |
| DELETE | `/parametros/:grupo/:tipo` | Eliminar |

---

**Versión**: 1.0  
**Fecha**: 4 de diciembre de 2025  
**Autor**: Sistema Backend APP_Afiliados
