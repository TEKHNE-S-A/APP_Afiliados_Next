# Implementación SMTP desde Backend - Sistema de Emails con Parámetros BD

## 📋 Resumen

Se implementó el **Punto 1 de REGLAS_GAM_BDD.md**: Sistema de envío de emails desde backend usando configuración SMTP almacenada en la base de datos (tabla `nusispar`, grupo `SMTP`).

**Fecha implementación:** 17 de diciembre de 2025

---

## ✅ Cambios Implementados

### 1. **Nuevo Servicio: `backend/emailService.js`**

Servicio centralizado para envío de emails con las siguientes características:

- **Configuración desde BD**: Lee 7 parámetros del grupo `SMTP` en tabla `nusispar`
  - `Host`: Servidor SMTP (ej: smtp.gmail.com)
  - `Port`: Puerto SMTP (587 o 465)
  - `Secure`: S/N para SSL/TLS
  - `User`: Usuario autenticación SMTP
  - `Password`: Contraseña SMTP
  - `FromEmail`: Email remitente
  - `FromName`: Nombre remitente

- **Cache de configuración**: TTL 5 minutos para evitar queries repetitivas

- **Funciones principales**:
  - `sendPasswordRecoveryEmail(toEmail, recoveryLink, userName)` - Email de recuperación de contraseña
  - `sendValidationCodeEmail(toEmail, codigo, userName)` - Email con código de validación
  - `maskEmail(email)` - Oculta email (primeros 3 caracteres + *** + dominio)
  - `verifySMTPConfig()` - Verifica conexión SMTP
  - `clearSMTPCache()` - Limpia cache de configuración

- **Templates HTML**: Emails con diseño responsive y profesional

---

### 2. **Modificaciones en `backend/gamService.js`**

#### ✏️ Cambios realizados:

- **Import nuevo**: `const emailService = require('./emailService')`

- **Función `passwordRecoveryGAM()` actualizada**:
  - ANTES: Delegaba envío de email a endpoint GAM
  - AHORA: Envía email directamente desde backend usando `emailService`
  - Retorna `maskedEmail` en respuesta JSON
  - Acepta parámetro opcional `userName` para personalización

- **Función `sendValidationCodeEmail()` actualizada**:
  - ANTES: Llamaba a endpoint GAM para envío
  - AHORA: Usa `emailService.sendValidationCodeEmail()`
  - Retorna `maskedEmail` en respuesta JSON
  - Acepta parámetro opcional `userName`

---

### 3. **Endpoint `/gam/password-recovery` actualizado**

**Archivo:** `backend/server-soap.js` (línea ~3798)

#### Cambios:

- Acepta parámetro opcional `userName` en body
- Valida formato de email con regex
- Retorna `maskedEmail` en respuesta JSON

**Request:**
```json
POST /gam/password-recovery
Content-Type: application/json

{
  "email": "usuario@osep.gob.ar",
  "userName": "Juan Pérez"  // opcional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email de recuperación enviado a jua***@osep.gob.ar",
  "emailSent": true,
  "maskedEmail": "jua***@osep.gob.ar"
}
```

---

### 4. **Script SQL: `backend/db/insert_smtp_parameters.sql`**

Script para crear los 7 parámetros SMTP en tabla `nusispar`:

- Elimina parámetros SMTP existentes (si los hay)
- Inserta parámetros con valores de ejemplo
- Incluye comentarios y ejemplos de configuración para:
  - Gmail con App Password
  - Office 365
  - SMTP Relay sin autenticación

**⚠️ IMPORTANTE:** Los valores insertados son placeholders. Deben actualizarse con credenciales reales.

---

### 5. **Dependencias actualizadas: `backend/package.json`**

Nuevas dependencias agregadas:

- `nodemailer`: ^6.9.7 - Librería de envío de emails
- `axios`: ^1.6.0 - Ya existía en gamService pero faltaba en package.json

---

### 6. **Scripts PowerShell de configuración y testing**

#### `backend/setup-smtp-backend.ps1`

Script automatizado para:
1. Instalar dependencias npm (nodemailer incluido)
2. Ejecutar script SQL de parámetros SMTP
3. Solicitar credenciales PostgreSQL interactivamente
4. Mostrar instrucciones post-instalación

**Uso:**
```powershell
cd backend
.\setup-smtp-backend.ps1
```

#### `backend/test-smtp-emails.ps1`

Suite de tests para verificar:
1. Configuración SMTP desde BD (lectura de parámetros)
2. Función `maskEmail()` con múltiples casos
3. Envío de email de prueba (opcional e interactivo)

**Uso:**
```powershell
cd backend
.\test-smtp-emails.ps1
```

---

## 🚀 Instalación y Configuración

### Paso 1: Instalar dependencias y ejecutar SQL

```powershell
cd backend
.\setup-smtp-backend.ps1
```

Esto instalará `nodemailer`, `axios` y ejecutará el script SQL.

### Paso 2: Configurar credenciales SMTP reales

Conectarse a PostgreSQL y actualizar los parámetros:

```sql
-- Ejemplo para Gmail con App Password
UPDATE nusispar SET nusisvalpa = 'smtp.gmail.com' 
  WHERE nusisgrupa = 'SMTP' AND nusistippa = 'Host';

UPDATE nusispar SET nusisvalpa = 'noreply@osep.gob.ar' 
  WHERE nusisgrupa = 'SMTP' AND nusistippa = 'User';

UPDATE nusispar SET nusisvalpa = 'xxxx xxxx xxxx xxxx' 
  WHERE nusisgrupa = 'SMTP' AND nusistippa = 'Password';

UPDATE nusispar SET nusisvalpa = 'noreply@osep.gob.ar' 
  WHERE nusisgrupa = 'SMTP' AND nusistippa = 'FromEmail';

UPDATE nusispar SET nusisvalpa = 'OSEP App Afiliados' 
  WHERE nusisgrupa = 'SMTP' AND nusistippa = 'FromName';

-- Verificar
SELECT * FROM nusispar WHERE nusisgrupa = 'SMTP' ORDER BY nusistippa;
```

### Paso 3: Verificar configuración

```powershell
cd backend
.\test-smtp-emails.ps1
```

O directamente con Node:

```bash
node -e "require('./emailService').verifySMTPConfig().then(console.log)"
```

### Paso 4: Reiniciar backend

```powershell
cd backend
.\restart-backend.ps1
```

---

## 📝 Reglas Implementadas (REGLAS_GAM_BDD.md)

### ✅ Sección 4.1 - Email Sending

- **✅ Emails desde Backend**: `emailService.js` con nodemailer
- **✅ Configuración desde BD**: Lee grupo `SMTP` de `nusispar`
- **✅ Sin hardcoding**: No hay credenciales SMTP en código
- **✅ Sin config en mobile**: App solo consume endpoints REST

### ✅ Sección 4.2 - Masked Email Display

- **✅ Función `maskEmail()`**: Implementada en `emailService.js`
- **✅ Formato correcto**: `mar***@domain.com` (primeros 3 + *** + dominio)
- **✅ Retornado en API**: Campo `maskedEmail` en respuesta JSON

---

## 🧪 Testing Manual

### Test 1: Email de recuperación de contraseña

```powershell
$body = @{
  email = "marianr@tekhne.com.ar"
  userName = "Mariana Rodriguez"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "http://localhost:3000/gam/password-recovery" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

**Respuesta esperada:**
```json
{
  "success": true,
  "message": "Email de recuperación enviado a mar***@tekhne.com.ar",
  "emailSent": true,
  "maskedEmail": "mar***@tekhne.com.ar"
}
```

### Test 2: Verificar parámetros en BD

```sql
SELECT nusistippa, nusisvalpa 
FROM nusispar 
WHERE nusisgrupa = 'SMTP' 
ORDER BY nusistippa;
```

**Resultado esperado:** 7 filas (Host, Port, Secure, User, Password, FromEmail, FromName)

---

## 📊 Comparación Antes/Después

| Aspecto | ANTES | AHORA |
|---------|-------|-------|
| **Envío emails** | Delegado a GAM | Desde backend con nodemailer |
| **Config SMTP** | En GAM (no controlable) | En BD (`nusispar` grupo SMTP) |
| **Credenciales** | Hardcoded en GAM | Dinámicas desde BD |
| **Email masking** | No implementado | Función `maskEmail()` |
| **Templates** | GAM templates | Templates HTML personalizables |
| **Cache config** | N/A | TTL 5 minutos |
| **Ambientes** | Un solo config GAM | DEV/QA/PROD independientes |
| **Testing** | Dependía de GAM | Scripts PowerShell locales |

---

## 🔒 Seguridad

### Consideraciones implementadas:

1. **Contraseñas no expuestas**: 
   - No se loguean contraseñas SMTP
   - Masking en logs: `Password: ***OCULTO***`

2. **Validación de emails**:
   - Regex en endpoint para formato válido
   - Previene inyección de headers SMTP

3. **Cache limitado**:
   - TTL 5 minutos evita config obsoleta
   - Recarga automática en cada request

4. **Separación de ambientes**:
   - Parámetros por ambiente en BD
   - Sin config compartida entre DEV/PROD

---

## 📚 Archivos Creados/Modificados

### Nuevos archivos:

1. `backend/emailService.js` - Servicio de emails
2. `backend/db/insert_smtp_parameters.sql` - Script SQL
3. `backend/setup-smtp-backend.ps1` - Setup automatizado
4. `backend/test-smtp-emails.ps1` - Suite de tests
5. `backend/SMTP_IMPLEMENTATION.md` - Esta documentación

### Archivos modificados:

1. `backend/gamService.js` - Funciones actualizadas para usar emailService
2. `backend/server-soap.js` - Endpoint `/gam/password-recovery` mejorado
3. `backend/package.json` - Dependencias `nodemailer` y `axios`

---

## 🎯 Próximos Pasos (Puntos 2-7 de REGLAS_GAM_BDD.md)

### Punto 2: Sesión Persistente Mobile

- [ ] Modificar `AuthContext.tsx` para no cerrar sesión al cerrar app
- [ ] Implementar check de sesión válida al startup
- [ ] Agregar logout explícito en ProfileScreen

### Punto 3: Validación Email Duplicado Cross-User

- [ ] Reforzar checks en endpoint `/register` y `/gam/register`
- [ ] Query BD para verificar email único entre usuarios
- [ ] Error descriptivo si email ya existe

### Punto 4: Eliminación Lógica

- [ ] Agregar campo `nuusufechabaja` en tabla `nuusuari`
- [ ] Crear endpoint `POST /users/deactivate`
- [ ] Middleware para bloquear login de usuarios desactivados
- [ ] Sincronizar con GAM (llamar a endpoint de desactivación GAM)

---

## 📞 Soporte

Para problemas o dudas sobre la implementación:

1. Verificar logs de backend: `backend/server-soap.js`
2. Ejecutar tests: `.\test-smtp-emails.ps1`
3. Revisar parámetros BD: `SELECT * FROM nusispar WHERE nusisgrupa = 'SMTP'`
4. Verificar conexión SMTP: `node -e "require('./emailService').verifySMTPConfig()"`

---

## 🔗 Referencias

- **Reglas GAM**: [`REGLAS_GAM_BDD.md`](../REGLAS_GAM_BDD.md)
- **Servicio Email**: [`backend/emailService.js`](./emailService.js)
- **Servicio GAM**: [`backend/gamService.js`](./gamService.js)
- **Script SQL**: [`backend/db/insert_smtp_parameters.sql`](./db/insert_smtp_parameters.sql)
- **Nodemailer Docs**: https://nodemailer.com/

---

**Estado:** ✅ IMPLEMENTACIÓN COMPLETA - Punto 1 de REGLAS_GAM_BDD.md

**Autor:** GitHub Copilot + Validación Manual  
**Fecha:** 17 de diciembre de 2025
