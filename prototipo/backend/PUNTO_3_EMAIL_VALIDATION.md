# ✅ PUNTO 3: Validación Email Duplicado Cross-User

**Status:** ✅ IMPLEMENTADO (Diciembre 2024)

**Referencia:** REGLAS_GAM_BDD.md - Sección 5: Registration Validations

---

## Resumen

Sistema de validación de email duplicado que previene el registro de usuarios con emails ya existentes, diferenciando entre el mismo usuario (ofrece password recovery) y usuarios diferentes (bloquea registro).

---

## Implementación

### Función Principal

**Archivo:** `backend/server-soap.js`  
**Función:** `validateEmailDuplication(email, nroAfiliado)`  
**Líneas:** ~3520-3600

```javascript
async function validateEmailDuplication(email, nroAfiliado) {
  // Busca usuarios con ese email en BD local
  const result = await db.pool.query(
    `SELECT nuusuid, nuusumail, nuusunroaf, nuusuapell 
     FROM nuusuari 
     WHERE LOWER(nuusumail) = LOWER($1)`,
    [email]
  )

  if (result.rows.length === 0) {
    // Email NO existe → permitir registro
    return { exists: false, sameUser: false, canRecover: false }
  }

  // Email existe → verificar si es el mismo usuario
  const existingUser = result.rows[0]
  const normalizeId = (id) => String(id || '').replace(/[-\s]/g, '').toLowerCase()
  const isSameUser = normalizeId(nroAfiliado) === normalizeId(existingUser.nuusunroaf)

  if (isSameUser) {
    // Mismo usuario → ofrecer recuperación
    return {
      exists: true,
      sameUser: true,
      canRecover: true,
      maskedEmail: emailService.maskEmail(email),
      message: 'Ya existe una cuenta registrada con este email. ¿Desea recuperar su contraseña?'
    }
  } else {
    // Diferente usuario → bloquear registro
    return {
      exists: true,
      sameUser: false,
      canRecover: false,
      message: 'Este email ya está en uso por otro usuario. Por favor, use un email diferente.'
    }
  }
}
```

### Integración en Endpoints

**Endpoint:** `POST /gam/register`  
**Líneas:** ~3590-3660

```javascript
app.post('/gam/register', async (req, res) => {
  // ... validaciones de campos requeridos ...

  // PUNTO 3: Validar email duplicado cross-user
  const userIdentifier = nroAfiliado || cuil || documento
  const emailValidation = await validateEmailDuplication(email, userIdentifier)

  if (emailValidation.exists) {
    if (emailValidation.sameUser) {
      // Email existe para el MISMO usuario → ofrecer recovery
      return res.status(409).json({
        error: 'Ya existe una cuenta registrada',
        code: 'EMAIL_EXISTS_SAME_USER',
        sameUser: true,
        canRecover: true,
        maskedEmail: emailValidation.maskedEmail,
        message: emailValidation.message,
        suggestion: 'Puede recuperar su contraseña usando el enlace "¿Olvidó su contraseña?"'
      })
    } else {
      // Email existe para OTRO usuario → bloquear
      return res.status(409).json({
        error: 'Email ya está en uso',
        code: 'EMAIL_EXISTS_DIFFERENT_USER',
        sameUser: false,
        canRecover: false,
        message: emailValidation.message
      })
    }
  }

  // Email disponible → continuar con registro GAM
  // ...
})
```

---

## Características

### 1. Búsqueda Case-Insensitive
- Usa `LOWER()` en SQL para comparación sin distinción de mayúsculas/minúsculas
- `marianr@tekhne.com.ar` === `MARIANR@TEKHNE.COM.AR`

### 2. Normalización de Identificadores
- Función `normalizeId()` elimina guiones y espacios
- Comparación flexible: `20-28878765-5` === `2028878765` === `20 288 787 65`
- Soporta nroAfiliado, CUIL, DNI indistintamente

### 3. Email Masking
- Integrado con `emailService.maskEmail()`
- Formato: primeros 3 caracteres + `***` + dominio
- Ejemplo: `marianr@tekhne.com.ar` → `mar***@tekhne.com.ar`

### 4. Códigos de Error Estructurados
- `EMAIL_EXISTS_SAME_USER`: Email duplicado, mismo usuario (409 Conflict)
- `EMAIL_EXISTS_DIFFERENT_USER`: Email duplicado, otro usuario (409 Conflict)
- Campos en respuesta JSON:
  ```json
  {
    "error": "string",
    "code": "EMAIL_EXISTS_SAME_USER | EMAIL_EXISTS_DIFFERENT_USER",
    "sameUser": boolean,
    "canRecover": boolean,
    "maskedEmail": "string (opcional)",
    "message": "string",
    "suggestion": "string (opcional)"
  }
  ```

---

## Flujos de Usuario

### Caso 1: Email NO Existe (Registro Normal)
```
Usuario → POST /gam/register con email nuevo
         ↓
validateEmailDuplication() → { exists: false }
         ↓
Registro en GAM → Inserción en nuusuari
         ↓
200 OK: Usuario registrado
```

### Caso 2: Email Existe - Mismo Usuario (Recovery)
```
Usuario → POST /gam/register con email existente + mismo nroAfiliado
         ↓
validateEmailDuplication() → { exists: true, sameUser: true }
         ↓
409 Conflict:
  - code: EMAIL_EXISTS_SAME_USER
  - canRecover: true
  - maskedEmail: "mar***@domain.com"
  - suggestion: "Puede recuperar su contraseña..."
```

### Caso 3: Email Existe - Otro Usuario (Bloqueado)
```
Usuario → POST /gam/register con email existente + otro nroAfiliado
         ↓
validateEmailDuplication() → { exists: true, sameUser: false }
         ↓
409 Conflict:
  - code: EMAIL_EXISTS_DIFFERENT_USER
  - canRecover: false
  - message: "Email ya está en uso por otro usuario"
```

---

## Testing

### Script de Prueba
**Archivo:** `backend/test-punto-3-email-duplicado.ps1`

#### Tests Implementados
1. ✅ **TEST 1**: Email nuevo permite registro
2. ✅ **TEST 2**: Email duplicado mismo usuario → ofrece recovery
3. ✅ **TEST 3**: Email duplicado otro usuario → bloqueado

#### Ejecución
```powershell
cd backend
.\test-punto-3-email-duplicado.ps1
```

#### Salida Esperada
```
================================================================
TEST 1: Email NO existe - Permitir registro
================================================================
✅ TEST 1 PASADO: Email nuevo permitido

================================================================
TEST 2: Email existe para EL MISMO usuario - Ofrecer recovery
================================================================
✅ TEST 2 PASADO: Email duplicado detectado (mismo usuario)
  Código: EMAIL_EXISTS_SAME_USER
  Mismo usuario: True
  Puede recuperar: True
  Email maskeado: tes***@example.com

================================================================
TEST 3: Email existe para OTRO usuario - Bloquear registro
================================================================
✅ TEST 3 PASADO: Email duplicado bloqueado (otro usuario)
  Código: EMAIL_EXISTS_DIFFERENT_USER
  Mismo usuario: False
  Puede recuperar: False
```

---

## Requisitos Cumplidos (REGLAS_GAM_BDD.md Sección 5)

| Requisito | Status | Implementación |
|-----------|--------|----------------|
| No permitir mismo email para diferentes usuarios | ✅ | `validateEmailDuplication()` compara nroAfiliado normalizado |
| Si email existe para mismo usuario: informar + ofrecer recovery | ✅ | Status 409, code: `EMAIL_EXISTS_SAME_USER`, `canRecover: true` |
| Si email existe para otro usuario: bloquear + error | ✅ | Status 409, code: `EMAIL_EXISTS_DIFFERENT_USER`, `canRecover: false` |
| Enmascaramiento de email para privacidad | ✅ | `emailService.maskEmail()` → `mar***@domain.com` |

---

## Consideraciones Técnicas

### 1. Base de Datos
- **Tabla:** `nuusuari`
- **Columnas consultadas:** `nuusuid`, `nuusumail`, `nuusunroaf`, `nuusuapell`
- **Índice recomendado:** `CREATE INDEX idx_nuusuari_email ON nuusuari(LOWER(nuusumail));`

### 2. Migración GAM
- **Archivo:** `backend/db/migrate_gam_integration.sql`
- **Columna nuusuid:** Debe ser VARCHAR(100) para soportar GUIDs de GAM
- **Estado actual:** CHAR(40) (requiere migración)
- **Comando:** `psql -U user -d db -f migrate_gam_integration.sql`

### 3. Limitaciones Conocidas
- La validación solo busca en BD local (tabla `nuusuari`)
- Si un usuario se registró solo en GAM (sin guardarse en BD local), no se detectará como duplicado
- **Solución futura:** Agregar consulta a GAM `/rest/Nucleo/NUGetUserInfo` si no se encuentra en BD local

### 4. Seguridad
- Email masking previene exposición de datos personales en mensajes de error
- Comparación case-insensitive previene bypass con emails en mayúsculas
- Normalización de identificadores previene registro de duplicados con diferentes formatos

---

## Integración con Frontend Mobile

### AuthContext (React Native)
La respuesta 409 con código `EMAIL_EXISTS_SAME_USER` debe ser capturada en el frontend para:
1. Mostrar mensaje de error apropiado
2. Ofrecer botón "Recuperar Contraseña"
3. Redirigir a pantalla de password recovery con email pre-llenado

### Ejemplo de Manejo en Mobile
```typescript
try {
  await apiPost('/gam/register', formData);
  // Registro exitoso
} catch (error) {
  if (error.response?.status === 409) {
    const { code, maskedEmail, canRecover, suggestion } = error.response.data;
    
    if (code === 'EMAIL_EXISTS_SAME_USER' && canRecover) {
      // Mostrar alerta con opción de recovery
      Alert.alert(
        'Cuenta existente',
        `Ya existe una cuenta registrada con ${maskedEmail}. ${suggestion}`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Recuperar Contraseña', 
            onPress: () => navigation.navigate('PasswordRecovery', { email: formData.email })
          }
        ]
      );
    } else if (code === 'EMAIL_EXISTS_DIFFERENT_USER') {
      // Bloquear sin opción de recovery
      Alert.alert(
        'Email no disponible',
        'Este email ya está en uso por otro usuario. Por favor, use un email diferente.'
      );
    }
  }
}
```

---

## Próximos Pasos

1. ✅ Aplicar migración `migrate_gam_integration.sql` para soportar GUIDs largos de GAM
2. ⏳ Agregar validación de email también en endpoint `/register` (SOAP legacy)
3. ⏳ Implementar consulta a GAM si usuario no se encuentra en BD local
4. ⏳ Agregar índice en `nuusuari(nuusumail)` para optimizar búsquedas
5. ⏳ Implementar rate limiting en endpoint de registro (prevenir spam)

---

## Referencias

- **Documento principal:** [REGLAS_GAM_BDD.md](../REGLAS_GAM_BDD.md)
- **Script de test:** [test-punto-3-email-duplicado.ps1](test-punto-3-email-duplicado.ps1)
- **Migración BD:** [migrate_gam_integration.sql](db/migrate_gam_integration.sql)
- **Email Service:** [emailService.js](emailService.js)
- **GAM Service:** [gamService.js](gamService.js)

---

**Última actualización:** Diciembre 2024  
**Desarrollado por:** GitHub Copilot (Claude Sonnet 4.5)  
**Status:** ✅ FUNCIONAL - Requiere migración BD para soporte completo de GAM
