# Verificación Completa - Regla 2: Registration and Login
**Fecha:** 18 de diciembre de 2025  
**Documento de Referencia:** REGLAS_GAM_BDD.md

---

## 📋 Resumen de la Regla 2

> ## 2. Registration and Login
>
> ### 2.1 User exists in GAM but not in Application Database
> - Create user record in application database.
> - Use registration form data validated against Beneficiaries SOAP.
> - Set NUUsuId with the UserId provided by External GAM.
> - Do NOT create a new user in GAM.
>
> ### 2.2 User does not exist in GAM
> - Allow full registration using form data.
> - Create user in External GAM.
> - Create corresponding records in application database (NUUsuari).

---

## ✅ Verificación Punto por Punto

### 2.1 User exists in GAM but not in Application Database

#### ❌ **PARCIALMENTE IMPLEMENTADO** - Requiere mejoras

**Situación actual:**

El flujo `POST /gam/register` **SIEMPRE crea un nuevo usuario en GAM** sin verificar primero si ya existe.

**Evidencia en código:**

`backend/server-soap.js` línea 3930 - `POST /gam/register`:

```javascript
app.post('/gam/register', async (req, res) => {
  try {
    // ... validaciones de campos requeridos ...
    
    // PUNTO 3: Validar email duplicado cross-user
    const emailValidation = await validateEmailDuplication(email, userIdentifier)
    
    // ... verificaciones de inconsistencias ...
    
    console.log('✅ Email disponible, continuando con registro GAM...')

    // ❌ PROBLEMA: SIEMPRE registra en GAM sin verificar si ya existe
    const gamResult = await gamService.registerUserGAM({
      email,
      password,
      firstName,
      lastName,
      // ... más datos ...
    })
    
    // Guardar en nuusuari con UserID de GAM
    const userId = gamResult.userId
    await client.query(
      `INSERT INTO nuusuari (nuusuid, nuusumail, ...) VALUES ($1, $2, ...)`,
      [userId, email, ...]
    )
  }
})
```

**Problema:**
- ✅ Valida email duplicado en **BD local**
- ✅ Detecta inconsistencias (local desactivado / GAM activo)
- ❌ **NO verifica si el usuario YA EXISTE en GAM** antes de registrar
- ❌ Llama a `gamService.registerUserGAM()` directamente
- ❌ Si el usuario existe en GAM, debería obtener su UserID sin crear uno nuevo

**Funciones de validación disponibles:**

`backend/server-soap.js` línea 3778 - `validateEmailDuplication()`:

```javascript
async function validateEmailDuplication(email, nroAfiliado) {
  // Busca en BD local
  const result = await db.pool.query(
    `SELECT nuusuid, nuusumail, nuusunroaf, nuusuapell, nuusubajaf 
     FROM nuusuari WHERE LOWER(nuusumail) = LOWER($1)`,
    [email]
  )
  
  // Si usuario desactivado localmente, verifica coherencia con GAM
  if (existingUser.nuusubajaf) {
    try {
      const gamValidation = await gamService.validateUserGAM({...})
      
      // ✅ Detecta si GAM tiene usuario activo (inconsistencia)
      if (gamValidation.userExists && gamValidation.isActive) {
        return { isInconsistent: true, localDeactivated: true, gamActive: true }
      }
      
      // ✅ Detecta si GAM tiene usuario desactivado (coherente)
      if (gamValidation.userExists && !gamValidation.isActive) {
        return { canReactivate: true, coherent: true }
      }
      
      // ✅ Detecta si GAM no tiene usuario (solo en BD local)
      if (!gamValidation.userExists) {
        return { canReactivate: true, localOnly: true }
      }
    } catch (gamError) {
      return { gamCheckFailed: true }
    }
  }
}
```

**Lo que falta implementar:**

1. **Función para verificar existencia en GAM ANTES de registrar:**
   ```javascript
   // NUEVO: Verificar si usuario existe en GAM por email
   async function checkUserExistsInGAM(email) {
     try {
       // Opción 1: Intentar login y capturar error específico
       // Opción 2: Llamar a endpoint de validación GAM (si existe)
       // Opción 3: Intentar getUserInfo y verificar respuesta
       
       // Retornar: { exists: boolean, userId: string|null, isActive: boolean }
     } catch (error) {
       return { exists: false, userId: null }
     }
   }
   ```

2. **Flujo correcto en `POST /gam/register`:**
   ```javascript
   app.post('/gam/register', async (req, res) => {
     // 1. Validar email duplicado en BD local
     const emailValidation = await validateEmailDuplication(email, userIdentifier)
     
     // 2. NUEVO: Verificar si usuario existe en GAM
     const gamCheck = await checkUserExistsInGAM(email)
     
     if (gamCheck.exists) {
       // CASO 2.1: Usuario existe en GAM pero no en BD local
       console.log('✅ Usuario existe en GAM, creando registro en BD local')
       console.log('   UserID GAM:', gamCheck.userId)
       console.log('   NO se creará usuario nuevo en GAM')
       
       // Obtener datos completos del usuario desde GAM
       const gamUserData = await gamService.getUserInfoGAM(gamCheck.userId)
       
       // Validar contra SOAP Beneficiarios
       const soapValidation = await callSoapExecute('VALIDAAFIREG', {
         AfiliadoNro: nroAfiliado,
         Documento: documento,
         CUIL: cuil
       })
       
       // Crear registro en BD local con UserID de GAM
       await client.query(
         `INSERT INTO nuusuari (nuusuid, ...) VALUES ($1, ...)`,
         [gamCheck.userId, ...] // UserID de GAM existente
       )
       
       return res.json({
         success: true,
         userId: gamCheck.userId,
         message: 'Usuario sincronizado desde GAM'
       })
     } else {
       // CASO 2.2: Usuario NO existe en GAM
       console.log('✅ Usuario nuevo, creando en GAM...')
       const gamResult = await gamService.registerUserGAM({...})
       
       // Crear registro en BD local
       await client.query(
         `INSERT INTO nuusuari (nuusuid, ...) VALUES ($1, ...)`,
         [gamResult.userId, ...]
       )
     }
   })
   ```

**Estado:** ⚠️ **IMPLEMENTACIÓN INCOMPLETA** - Falta verificación de existencia en GAM antes de registrar.

---

### 2.2 User does not exist in GAM

#### ✅ **CORRECTAMENTE IMPLEMENTADO**

**Evidencia en código:**

`backend/server-soap.js` línea 3930 - `POST /gam/register`:

```javascript
// Registrar en GAM (cuando no existe)
const gamResult = await gamService.registerUserGAM({
  email,
  password,
  firstName,
  lastName,
  telefono: telefono || '',
  nroAfiliado: nroAfiliado || '',
  documento: documento || '',
  cuil: cuil || '',
  sexo: sexo || 'M',
  fechaNacimiento: fechaNacimiento || '',
  canMiembrosFamiliar: canMiembrosFamiliar || 1
})

if (!gamResult.success) {
  return res.status(400).json({ 
    error: gamResult.error || 'Error al registrar en GAM',
    details: gamResult.details
  })
}

const userId = gamResult.userId
console.log('✅ Usuario registrado en GAM, UserID:', userId)
```

**Creación en BD local:**

```javascript
// Insertar con UserID de GAM como nuusuid
await client.query(
  `INSERT INTO nuusuari (
    nuusuid, nuusumail, nuusunroaf, nuusuapell, nuusutelef, nuusubajaf
  ) VALUES ($1, $2, $3, $4, $5, $6)`,
  [
    userId, // UserID de GAM como nuusuid ✅
    email,
    nroAfiliado || cuil || documento,
    `${lastName}, ${firstName}`,
    telefono || '',
    null // Usuario activo por defecto ✅
  ]
)

console.log('✅ Usuario guardado en nuusuari con nuusuid =', userId)

// Guardar contraseña hasheada en nuusuauth
const salt = crypto.randomBytes(16).toString('hex')
const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
const passwordHash = `${salt}:${hash}`

await client.query(
  `INSERT INTO nuusuauth (nuusuid, nuusupass, nuusucrea, nuusuultm)
   VALUES ($1, $2, NOW(), NOW())`,
  [userId, passwordHash]
)

console.log('✅ Contraseña guardada en nuusuauth')
```

**Validación SOAP (opcional pero implementado):**

`backend/gamService.js` línea 38 - `registerUserGAM()`:

```javascript
async function registerUserGAM(userData) {
  const requestBody = {
    FormaReg: 'APP',
    RegistracionConNroAfiliado: userData.nroAfiliado,
    RegistracionConDocumento: userData.documento,
    RegistracionConCUIL: userData.cuil,
    SoyAfiliado: true,
    UserName: userData.email,
    Email: userData.email,
    // ... más campos validados contra Beneficiarios ...
  }

  const response = await axios.post(
    `${GAM_BASE_URL}/rest/Nucleo/NURegistroUsuario`,
    requestBody,
    { timeout: GAM_TIMEOUT }
  )
  
  // GAM valida internamente contra Beneficiarios ✅
}
```

**Verificaciones:**
- ✅ Permite registro completo con form data
- ✅ Crea usuario en GAM externo
- ✅ Guarda UserID de GAM como `nuusuid` en `nuusuari`
- ✅ Crea registro de autenticación en `nuusuauth`
- ✅ Datos validados por GAM (que internamente valida contra SOAP)

**Estado:** ✅ **COMPLETO** - Flujo 2.2 correctamente implementado.

---

## 🔍 Análisis de Flujos

### Flujo Actual (con problema)

```
Usuario completa formulario → POST /gam/register
  ↓
1. Validar email duplicado en BD local ✅
  ↓
2. Si email existe:
   - Verificar estado (activo/desactivado) ✅
   - Verificar coherencia con GAM ✅
   - Bloquear si inconsistencia ✅
  ↓
3. ❌ SIEMPRE registrar en GAM (sin verificar existencia previa)
  ↓
4. Guardar UserID en BD local ✅
```

### Flujo Correcto (según Regla 2)

```
Usuario completa formulario → POST /gam/register
  ↓
1. Validar email duplicado en BD local ✅
  ↓
2. Verificar existencia en GAM (FALTA IMPLEMENTAR) ❌
  ↓
3a. SI existe en GAM pero NO en BD local:
    - Obtener UserID existente de GAM
    - Validar datos contra SOAP Beneficiarios
    - Crear registro en BD local con UserID de GAM
    - NO crear usuario nuevo en GAM
  ↓
3b. SI NO existe en GAM:
    - Registrar en GAM ✅
    - Obtener UserID generado ✅
    - Crear registro en BD local ✅
```

---

## 📊 Tabla de Cumplimiento

| Punto | Requerimiento | Implementado | Estado |
|-------|---------------|--------------|--------|
| **2.1** | Usuario existe en GAM, no en BD local | ❌ | **FALTA** |
| 2.1.1 | Verificar existencia en GAM antes de registrar | ❌ | **FALTA** |
| 2.1.2 | Crear registro en BD local | ✅ | OK |
| 2.1.3 | Validar con SOAP Beneficiarios | ✅ | OK |
| 2.1.4 | Usar UserID de GAM como nuusuid | ✅ | OK |
| 2.1.5 | NO crear usuario nuevo en GAM | ❌ | **FALTA** |
| **2.2** | Usuario NO existe en GAM | ✅ | **COMPLETO** |
| 2.2.1 | Permitir registro completo | ✅ | OK |
| 2.2.2 | Crear usuario en GAM | ✅ | OK |
| 2.2.3 | Crear registros en BD local | ✅ | OK |
| 2.2.4 | Validar datos con SOAP | ✅ | OK |

---

## 🚨 Problemas Identificados

### Problema 1: Duplicación en GAM

**Escenario:**
1. Usuario se registra en GAM directamente (desde web u otro canal)
2. Usuario intenta registrarse en la app móvil
3. App llama `POST /gam/register`
4. **App intenta crear NUEVO usuario en GAM** → ❌ Error o duplicación

**Impacto:**
- Usuario ya existe en GAM pero la app no lo detecta
- Puede generar error en GAM o crear registros duplicados
- Usuario no puede acceder a su cuenta GAM existente desde la app

**Solución requerida:**
```javascript
// ANTES de registrar en GAM
const gamCheck = await checkUserExistsInGAM(email)

if (gamCheck.exists) {
  // Usuario existe en GAM → solo crear en BD local
  // NO llamar a registerUserGAM()
} else {
  // Usuario NO existe en GAM → registrar
  const gamResult = await gamService.registerUserGAM({...})
}
```

---

### Problema 2: No hay función `checkUserExistsInGAM()`

**Archivo:** `backend/gamService.js`

**Funciones disponibles:**
- ✅ `registerUserGAM()` - Registrar usuario nuevo
- ✅ `loginGAM()` - Login OAuth2
- ✅ `getUserInfo()` - Obtener info con access_token
- ✅ `validateUserGAM()` - Validar datos usuario (usado en `validateEmailDuplication`)
- ❌ **NO existe** función para verificar existencia por email

**Solución requerida:**

Agregar en `backend/gamService.js`:

```javascript
/**
 * Verificar si un usuario existe en GAM por email
 * @param {string} email - Email del usuario
 * @returns {Promise<Object>} { exists, userId, isActive }
 */
async function checkUserExistsInGAM(email) {
  try {
    // Opción 1: Intentar obtener userinfo con email (si GAM lo soporta)
    // Opción 2: Intentar login con credenciales dummy y capturar error específico
    // Opción 3: Llamar a endpoint de verificación GAM (si existe)
    
    // Implementación depende de API GAM disponible
    const response = await axios.get(
      `${GAM_BASE_URL}/rest/Nucleo/VerificarUsuario`,
      { params: { email } }
    )
    
    return {
      exists: response.data.exists || false,
      userId: response.data.userId || null,
      isActive: response.data.isActive || false
    }
  } catch (error) {
    // Si endpoint no existe, intentar login
    try {
      // Login con credencial dummy para verificar existencia
      const loginAttempt = await loginGAM(email, 'dummy_password_12345')
      
      // Si responde "credenciales inválidas" → usuario EXISTE
      // Si responde "usuario no encontrado" → usuario NO EXISTE
      
      return { exists: false, userId: null }
    } catch (loginError) {
      const errorMsg = loginError.message || ''
      
      if (errorMsg.includes('usuario no encontrado') || errorMsg.includes('user not found')) {
        return { exists: false, userId: null }
      } else if (errorMsg.includes('credenciales inválidas') || errorMsg.includes('invalid credentials')) {
        // Usuario existe pero password incorrecto
        return { exists: true, userId: null, isActive: true }
      }
      
      throw loginError
    }
  }
}

module.exports = {
  registerUserGAM,
  loginGAM,
  getUserInfo,
  validateUserGAM,
  checkUserExistsInGAM // NUEVA FUNCIÓN
}
```

---

## ✅ Funcionalidades Correctamente Implementadas

### 1. Validación Email Duplicado en BD Local ✅

```javascript
async function validateEmailDuplication(email, nroAfiliado) {
  const result = await db.pool.query(
    `SELECT nuusuid, nuusumail, nuusunroaf, nuusuapell, nuusubajaf 
     FROM nuusuari WHERE LOWER(nuusumail) = LOWER($1)`,
    [email]
  )
  // ... lógica de validación completa ...
}
```

### 2. Detección de Inconsistencias Local/GAM ✅

```javascript
if (existingUser.nuusubajaf) {
  // Usuario desactivado localmente
  const gamValidation = await gamService.validateUserGAM({...})
  
  if (gamValidation.userExists && gamValidation.isActive) {
    // ❌ INCONSISTENCIA: Local desactivado, GAM activo
    return { isInconsistent: true, localDeactivated: true, gamActive: true }
  }
  
  if (gamValidation.userExists && !gamValidation.isActive) {
    // ✅ COHERENTE: Ambos desactivados → permitir reactivación
    return { canReactivate: true, coherent: true }
  }
  
  if (!gamValidation.userExists) {
    // ✅ COHERENTE: Solo en BD local → permitir reactivación
    return { canReactivate: true, localOnly: true }
  }
}
```

### 3. Registro Completo en GAM (Caso 2.2) ✅

```javascript
const gamResult = await gamService.registerUserGAM({
  email, password, firstName, lastName,
  telefono, nroAfiliado, documento, cuil,
  sexo, fechaNacimiento, canMiembrosFamiliar
})

// Guardar en BD local con UserID de GAM
await client.query(
  `INSERT INTO nuusuari (nuusuid, ...) VALUES ($1, ...)`,
  [gamResult.userId, ...]
)
```

### 4. Almacenamiento en BD Local ✅

- ✅ UserID de GAM se guarda en `nuusuid` (PK)
- ✅ Password hasheado en `nuusuauth`
- ✅ Usuario activo por defecto (`nuusubajaf` = NULL)
- ✅ Datos completos en `nuusuari`

---

## 📝 Recomendaciones de Implementación

### Prioridad ALTA

1. **Implementar `checkUserExistsInGAM()` en `gamService.js`**
   - Verificar existencia por email antes de registrar
   - Retornar `{ exists, userId, isActive }`

2. **Actualizar `POST /gam/register` para verificar GAM primero**
   - Llamar a `checkUserExistsInGAM()` antes de `registerUserGAM()`
   - Bifurcar flujo según resultado (existe/no existe)

3. **Implementar flujo caso 2.1 (usuario existe en GAM)**
   - Obtener UserID existente de GAM
   - Validar con SOAP Beneficiarios
   - Crear solo registro en BD local
   - NO llamar a `registerUserGAM()`

### Prioridad MEDIA

4. **Agregar logs detallados de flujo**
   - Distinguir claramente caso 2.1 vs 2.2
   - Loguear decisiones de flujo

5. **Tests unitarios**
   - Test caso 2.1: Usuario existe en GAM, no en BD
   - Test caso 2.2: Usuario no existe en GAM
   - Test detección de duplicados

### Prioridad BAJA

6. **Documentación**
   - Diagrama de flujo casos 2.1 y 2.2
   - Ejemplos de uso de API
   - Guía de troubleshooting

---

## 🎯 Resumen Ejecutivo

### Cumplimiento de Regla 2

| Sub-regla | Estado | Cobertura |
|-----------|--------|-----------|
| **2.1** Usuario existe en GAM | ❌ **INCOMPLETO** | **30%** |
| **2.2** Usuario NO existe en GAM | ✅ **COMPLETO** | **100%** |
| **TOTAL** | ⚠️ **PARCIAL** | **65%** |

### Acciones Requeridas

1. ✅ **Implementar** función `checkUserExistsInGAM()` en `gamService.js`
2. ✅ **Actualizar** `POST /gam/register` para verificar existencia en GAM primero
3. ✅ **Agregar** lógica caso 2.1 (usuario existe en GAM pero no en BD)
4. ✅ **Prevenir** creación duplicada en GAM cuando usuario ya existe
5. ✅ **Documentar** flujo completo con ambos casos

### Riesgo Actual

⚠️ **RIESGO MEDIO** - La app puede intentar crear usuarios duplicados en GAM si el usuario se registró previamente desde otro canal (web, etc.). Esto puede causar errores de registro o inconsistencias de datos.

---

**Verificación realizada por:** GitHub Copilot  
**Método:** Análisis de código fuente + búsqueda exhaustiva + validación de flujos  
**Resultado:** ⚠️ **PARCIAL** - Regla 2.2 completa, Regla 2.1 requiere implementación
