# SMTP Backend Implementation - Quick Start Guide

## ⚡ Resumen Ejecutivo

✅ **IMPLEMENTADO:** Sistema de envío de emails desde backend con configuración SMTP en base de datos.

---

## 🎯 Qué se implementó

- ✅ Servicio de emails con nodemailer (`backend/emailService.js`)
- ✅ Configuración SMTP desde BD (tabla `nusispar`, grupo `SMTP`)
- ✅ Email masking para privacidad (`mar***@domain.com`)
- ✅ Templates HTML para emails profesionales
- ✅ Scripts automatizados de setup y testing
- ✅ Actualización de funciones GAM para usar backend
- ✅ Endpoint REST `/gam/password-recovery` mejorado

---

## 🚀 Instalación Rápida (3 pasos)

### 1. Instalar y configurar

```powershell
cd backend
.\setup-smtp-backend.ps1
```

### 2. Actualizar credenciales SMTP en BD

```sql
-- Conectarse a PostgreSQL
psql -h localhost -U postgres -d app_afiliados_genexus

-- Actualizar con credenciales reales
UPDATE nusispar SET nusisvalpa = 'smtp.gmail.com' 
  WHERE nusisgrupa = 'SMTP' AND nusistippa = 'Host';

UPDATE nusispar SET nusisvalpa = 'tu-email@osep.gob.ar' 
  WHERE nusisgrupa = 'SMTP' AND nusistippa = 'User';

UPDATE nusispar SET nusisvalpa = 'tu-password-smtp' 
  WHERE nusisgrupa = 'SMTP' AND nusistippa = 'Password';
```

### 3. Verificar y probar

```powershell
cd backend
.\test-smtp-emails.ps1
```

---

## 📝 Ejemplo de Uso

```powershell
# Enviar email de recuperación de contraseña
$body = @{
  email = "usuario@osep.gob.ar"
  userName = "Juan Pérez"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "http://localhost:3000/gam/password-recovery" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Email de recuperación enviado a usu***@osep.gob.ar",
  "emailSent": true,
  "maskedEmail": "usu***@osep.gob.ar"
}
```

---

## 📚 Documentación Completa

Ver: [`backend/SMTP_IMPLEMENTATION.md`](./SMTP_IMPLEMENTATION.md)

---

## ⚠️ Importante

- **SIEMPRE** actualizar credenciales SMTP reales después del setup
- Para Gmail con 2FA: generar App Password en https://myaccount.google.com/apppasswords
- Verificar configuración antes de producción: `.\test-smtp-emails.ps1`

---

## 🔗 Archivos Clave

- `backend/emailService.js` - Servicio principal
- `backend/gamService.js` - Funciones actualizadas
- `backend/db/insert_smtp_parameters.sql` - Script SQL inicial
- `backend/setup-smtp-backend.ps1` - Setup automatizado
- `backend/test-smtp-emails.ps1` - Tests

---

**Estado:** ✅ LISTO PARA USAR (requiere configurar credenciales SMTP)
