# 📧 Tekhne Mail Service - Módulo Exportable

Módulo de envío de emails usando la API de Tekhne Mail Service.  
Listo para integrar en cualquier proyecto Node.js/Express.

## 📁 Contenido del Paquete

```
exportable/
├── README.md              # Esta guía
├── mailService.js         # Servicio principal
├── test-mail-service.js   # Script de prueba
├── .env.example           # Variables de entorno requeridas
└── package.json           # Dependencias necesarias
```

## 🚀 Instalación Rápida

### 1. Copiar archivos

```bash
# Copiar el servicio a tu proyecto
cp mailService.js /tu-proyecto/utils/
cp test-mail-service.js /tu-proyecto/scripts/
```

### 2. Instalar dependencias

```bash
npm install axios form-data dotenv
```

### 3. Configurar variables de entorno

Agregar al archivo `.env` de tu proyecto:

```env
MAIL_API_URL=http://tkqa.tekhne.com.ar:8081/api/mail/send
MAIL_API_KEY=TU_API_KEY_AQUI
MAIL_FROM_ADDRESS=noreply@tu-dominio.com
MAIL_FROM_NAME=Tu Sistema
APP_URL=http://localhost:3000
```

### 4. Probar

```bash
node scripts/test-mail-service.js tu-email@ejemplo.com
```

## 📖 Uso Básico

### Importar el servicio

```javascript
const mailService = require('./utils/mailService');
```

### Enviar email simple

```javascript
const result = await mailService.sendSimpleEmail({
  to: ['destinatario@ejemplo.com'],
  subject: 'Asunto del correo',
  body: 'Contenido del mensaje',
  isHtml: false
});

if (result.success) {
  console.log('Email enviado:', result.messageId);
} else {
  console.error('Error:', result.error);
}
```

### Enviar email HTML

```javascript
const result = await mailService.sendSimpleEmail({
  to: ['destinatario@ejemplo.com'],
  subject: 'Bienvenido',
  body: '<h1>Hola!</h1><p>Este es un email HTML.</p>',
  isHtml: true
});
```

### Enviar a múltiples destinatarios

```javascript
const result = await mailService.sendSimpleEmail({
  to: ['user1@ejemplo.com', 'user2@ejemplo.com', 'user3@ejemplo.com'],
  subject: 'Notificación grupal',
  body: 'Mensaje para todos',
  isHtml: false
});
```

### Verificar si el servicio está configurado

```javascript
if (mailService.isConfigured()) {
  // Enviar email
} else {
  console.warn('Servicio de email no configurado');
}
```

### Validar emails antes de enviar

```javascript
const emails = ['valid@email.com', 'invalid-email', 'otro@valido.com'];
const validation = mailService.validateEmailList(emails);

if (validation.valid) {
  // Todos los emails son válidos
} else {
  console.log('Emails inválidos:', validation.invalid);
}
```

## 📋 API Reference

### `sendSimpleEmail(options)`

Envía un email simple.

**Parámetros:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `to` | `string[]` | ✅ | Array de emails destino |
| `subject` | `string` | ✅ | Asunto del email |
| `body` | `string` | ✅ | Contenido (texto o HTML) |
| `isHtml` | `boolean` | ❌ | `true` = HTML, `false` = texto (default) |
| `from` | `string` | ❌ | Remitente (usa MAIL_FROM_ADDRESS por defecto) |

**Retorna:**
```javascript
{
  success: true,
  messageId: 'abc-123',
  to: ['email@ejemplo.com']
}
// o en caso de error:
{
  success: false,
  error: 'Mensaje de error',
  details: { /* detalles del error */ }
}
```

### `isConfigured()`

Verifica si el servicio tiene todas las variables configuradas.

**Retorna:** `boolean`

### `validateEmail(email)`

Valida formato de un email.

**Retorna:** `boolean`

### `validateEmailList(emails)`

Valida una lista de emails.

**Retorna:**
```javascript
{
  valid: true/false,
  invalid: ['emails', 'invalidos']
}
```

### `sendTestEmail(toEmail)`

Envía un email de prueba para verificar la configuración.

**Retorna:**
```javascript
{
  sent: true,
  messageId: 'abc-123'
}
```

## ⚙️ Formato del Payload (Tekhne API)

La API de Tekhne requiere este formato:

```json
{
  "from": "remitente@dominio.com",
  "to": ["destino1@email.com", "destino2@email.com"],
  "subject": "Asunto del correo",
  "bodyText": "Versión texto plano del mensaje",
  "bodyHtml": "<html>Versión HTML del mensaje</html>"
}
```

**Headers requeridos:**
```
Content-Type: application/json
X-API-Key: TU_API_KEY
```

## 🔧 Variables de Entorno

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `MAIL_API_URL` | ✅ | URL del endpoint de Tekhne |
| `MAIL_API_KEY` | ✅ | API Key de autenticación |
| `MAIL_FROM_ADDRESS` | ✅ | Email del remitente |
| `MAIL_FROM_NAME` | ❌ | Nombre del remitente (para logs) |
| `APP_URL` | ❌ | URL de tu app (para links en emails) |

## 🔒 Seguridad

- **API Key:** Nunca exponer en frontend o repositorio público
- **Validación:** Siempre validar emails antes de enviar
- **.gitignore:** Asegurar que `.env` esté excluido

## 📝 Extensiones Opcionales

El servicio incluye métodos adicionales que puedes usar o eliminar según tu necesidad:

- `sendAuditorNotification()` - Notificaciones específicas de auditoría
- `sendOrderCreationConfirmation()` - Confirmación de creación de orden
- `sendOrderApprovalNotification()` - Notificación de aprobación
- `sendOrderRejectionNotification()` - Notificación de rechazo
- `formatEmailHTML()` - Templates HTML predefinidos

Si no necesitas estas funcionalidades, puedes eliminarlas del archivo `mailService.js`.

## 🐛 Troubleshooting

| Error | Solución |
|-------|----------|
| `VALIDATION_ERROR: From address is required` | Configurar `MAIL_FROM_ADDRESS` en .env |
| `VALIDATION_ERROR: Message body is required` | El servicio ya maneja esto automáticamente |
| `401 Unauthorized` | API Key incorrecta o no configurada |
| `503 Service Unavailable` | Servidor Tekhne no disponible |
| `ECONNREFUSED` | Verificar conectividad de red |

## 📞 Soporte

- **API Tekhne QA:** http://tkqa.tekhne.com.ar:8081
- **Contacto:** portal@tekhne.com.ar

---

**Versión:** 1.0.0  
**Fecha:** Enero 2026  
**Licencia:** Propietaria - Tekhne S.A.
