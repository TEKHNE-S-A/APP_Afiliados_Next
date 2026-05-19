/**
 * Email Service
 * Sistema de envío de emails con dual-provider: SMTP + Tekhne Mail API
 * 
 * Proveedores (configurables en nusispar):
 * 
 * 1) SMTP (grupo SMTP):
 *    - Host, Port, Secure, User, Password, AddressSender, NameSender
 * 
 * 2) Tekhne Mail API (grupo MAIL_API):
 *    - Url:       URL del endpoint (ej: http://tkqa.tekhne.com.ar:8081/api/mail/send)
 *    - ApiKey:    X-API-Key de autenticación
 *    - FromEmail: Email remitente
 *    - FromName:  Nombre remitente
 *    - Habilitado: S/N — habilita/deshabilita este proveedor
 * 
 * Parámetro de proveedor activo (grupo EMAIL):
 *    - Provider: 'SMTP' | 'API' | 'DUAL'
 *      SMTP  → solo SMTP
 *      API   → solo Tekhne API
 *      DUAL  → intenta SMTP primero, si falla usa Tekhne API como fallback
 * 
 * @version 2.0.0
 */

const nodemailer = require('nodemailer');
const axios = require('axios');
const db = require('./db/connection');

// Cache de configuración SMTP
let smtpConfigCache = null;
let smtpCacheTimestamp = 0;
const SMTP_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Obtener parámetro SMTP desde BD
 */
async function getParametroSMTP(tipo) {
  try {
    const result = await db.query(
      'SELECT nusisvalpa FROM nusispar WHERE nusisgrupa = $1 AND nusistippa = $2',
      ['SMTP', tipo]
    );
    
    if (result.rows.length > 0) {
      return result.rows[0].nusisvalpa;
    }
    
    return null;
  } catch (error) {
    console.error(`❌ Error obteniendo parámetro SMTP.${tipo}:`, error.message);
    return null;
  }
}

/**
 * Cargar configuración SMTP desde BD con cache
 * NOTA: Usa nombres de parámetros existentes en nusispar:
 * - Host, Port, Secure, User, Password (estándar)
 * - AddressSender (FromEmail), NameSender (FromName)
 */
async function loadSMTPConfig() {
  // Verificar cache
  if (smtpConfigCache && (Date.now() - smtpCacheTimestamp < SMTP_CACHE_TTL)) {
    return smtpConfigCache;
  }

  console.log('🔄 Cargando configuración SMTP desde BD...');

  try {
    const [host, port, secure, user, password, fromEmail, fromName] = await Promise.all([
      getParametroSMTP('Host'),
      getParametroSMTP('Port'),
      getParametroSMTP('Secure'),
      getParametroSMTP('User'),
      getParametroSMTP('Password'),
      getParametroSMTP('AddressSender'),  // Nombre real en BD
      getParametroSMTP('NameSender')       // Nombre real en BD
    ]);

    // Validar parámetros obligatorios
    if (!host || !port || !secure || !user || !password || !fromEmail) {
      throw new Error('Configuración SMTP incompleta en nusispar (grupo SMTP). Faltan: Host, Port, Secure, User, Password o AddressSender');
    }

    // Convertir Secure: "1" = true (SSL), "0" o "N" = false (STARTTLS)
    const isSecure = (secure === '1' || secure === 'S' || secure === 'true');

    const config = {
      host,
      port: parseInt(port),
      secure: isSecure, // true para SSL/TLS (puerto 465), false para STARTTLS (587)
      auth: {
        user,
        pass: password
      },
      from: {
        email: fromEmail,
        name: fromName || 'Aplicación Móvil IA'
      }
    };

    // Guardar en cache
    smtpConfigCache = config;
    smtpCacheTimestamp = Date.now();

    console.log('✅ Configuración SMTP cargada:', {
      host: config.host,
      port: config.port,
      secure: config.secure,
      user: config.auth.user,
      from: config.from
    });

    return config;

  } catch (error) {
    console.error('❌ Error cargando configuración SMTP:', error.message);
    throw error;
  }
}

/**
 * Crear transporter de nodemailer con configuración desde BD
 */
async function createTransporter() {
  const config = await loadSMTPConfig();
  
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth
  });

  return { transporter, from: config.from };
}

// ============================================================================
// TEKHNE MAIL API — Proveedor alternativo
// ============================================================================

let apiConfigCache = null;
let apiCacheTimestamp = 0;
const API_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Cargar configuración Tekhne Mail API desde BD (grupo MAIL_API)
 */
async function loadMailApiConfig() {
  if (apiConfigCache && (Date.now() - apiCacheTimestamp < API_CACHE_TTL)) {
    return apiConfigCache;
  }

  console.log('🔄 Cargando configuración Tekhne Mail API desde BD...');

  const [url, apiKey, fromEmail, fromName, habilitado] = await Promise.all([
    getParametroMailApi('Url'),
    getParametroMailApi('ApiKey'),
    getParametroMailApi('FromEmail'),
    getParametroMailApi('FromName'),
    getParametroMailApi('Habilitado'),
  ]);

  if (!url || !apiKey || !fromEmail) {
    console.warn('⚠️  Tekhne Mail API NO configurada. Faltan parámetros en MAIL_API (Url, ApiKey, FromEmail)');
    return null;
  }

  const config = {
    url,
    apiKey,
    fromEmail,
    fromName: fromName || 'Aplicación Móvil IA',
    enabled: habilitado === 'S' || habilitado === '1' || habilitado === 'true',
  };

  apiConfigCache = config;
  apiCacheTimestamp = Date.now();

  console.log('✅ Tekhne Mail API configurada:', { url: config.url, from: `${config.fromName} <${config.fromEmail}>`, enabled: config.enabled });
  return config;
}

/**
 * Obtener parámetro del grupo MAIL_API desde BD
 */
async function getParametroMailApi(tipo) {
  try {
    const result = await db.query(
      'SELECT nusisvalpa FROM nusispar WHERE nusisgrupa = $1 AND nusistippa = $2',
      ['MAIL_API', tipo]
    );
    return result.rows.length > 0 ? result.rows[0].nusisvalpa : null;
  } catch (error) {
    console.error(`❌ Error obteniendo parámetro MAIL_API.${tipo}:`, error.message);
    return null;
  }
}

/**
 * Obtener proveedor de email preferido (SMTP | API | DUAL)
 */
async function getEmailProvider() {
  try {
    const result = await db.query(
      'SELECT nusisvalpa FROM nusispar WHERE nusisgrupa = $1 AND nusistippa = $2',
      ['EMAIL', 'Provider']
    );
    if (result.rows.length > 0) {
      return (result.rows[0].nusisvalpa || 'SMTP').trim().toUpperCase();
    }
  } catch (e) { /* ignore */ }
  return 'SMTP'; // default
}

/**
 * Enviar email vía Tekhne Mail API
 * @param {object} options - { to: string[], subject, htmlBody, textBody, from? }
 * @returns {Promise<{ success, messageId?, error? }>}
 */
async function sendViaTekhneApi(options) {
  const config = await loadMailApiConfig();
  if (!config || !config.enabled) {
    return { success: false, error: 'Tekhne Mail API no configurada o deshabilitada' };
  }

  const { to, subject, htmlBody, textBody, from } = options;

  const payload = {
    from: from || config.fromEmail,
    to: Array.isArray(to) ? to : [to],
    subject,
    bodyText: textBody || stripHtml(htmlBody || ''),
    bodyHtml: htmlBody || `<p>${escapeHtml(textBody || '').replace(/\n/g, '<br>')}</p>`,
  };

  try {
    console.log(`📧 [Tekhne API] Enviando a: ${payload.to.join(', ')} — ${subject}`);

    const response = await axios.post(config.url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.apiKey,
      },
      timeout: 30000,
    });

    console.log('✅ [Tekhne API] Email enviado exitosamente');
    return { success: true, messageId: response.data?.messageId, provider: 'tekhne-api' };
  } catch (error) {
    console.error('❌ [Tekhne API] Error:', error.response?.status, error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message,
      details: error.response?.data,
      provider: 'tekhne-api',
    };
  }
}

/**
 * Enviar email vía SMTP (nodemailer)
 * @param {object} options - { to: string|string[], subject, htmlBody, textBody, from? }
 * @returns {Promise<{ success, messageId?, error? }>}
 */
async function sendViaSMTP(options) {
  const { to, subject, htmlBody, textBody, from: fromOverride } = options;

  try {
    const { transporter, from } = await createTransporter();

    const mailOptions = {
      from: fromOverride || `"${from.name}" <${from.email}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      text: textBody || stripHtml(htmlBody || ''),
      html: htmlBody || `<p>${escapeHtml(textBody || '').replace(/\n/g, '<br>')}</p>`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ [SMTP] Email enviado:', info.messageId);
    return { success: true, messageId: info.messageId, provider: 'smtp' };
  } catch (error) {
    console.error('❌ [SMTP] Error:', error.message);
    return { success: false, error: error.message, code: error.code, provider: 'smtp' };
  }
}

/**
 * Enviar email con soporte dual-provider y fallback automático.
 * Lee EMAIL.Provider de nusispar para decidir el flujo.
 *
 * @param {object} options
 * @param {string|string[]} options.to        - Destinatarios
 * @param {string}          options.subject   - Asunto
 * @param {string}          [options.htmlBody] - HTML del cuerpo
 * @param {string}          [options.textBody] - Texto plano del cuerpo
 * @param {string}          [options.from]     - Remitente override
 * @returns {Promise<{ success, messageId?, provider?, error? }>}
 */
async function sendEmail(options) {
  const provider = await getEmailProvider();
  console.log(`📨 Proveedor de email activo: ${provider}`);

  if (provider === 'API') {
    return sendViaTekhneApi(options);
  }

  if (provider === 'DUAL') {
    // Intenta SMTP primero
    const smtpResult = await sendViaSMTP(options);
    if (smtpResult.success) return smtpResult;

    console.warn('⚠️  SMTP falló, intentando fallback Tekhne API...');
    const apiResult = await sendViaTekhneApi(options);
    if (apiResult.success) return apiResult;

    // Ambos fallaron
    return { success: false, error: `SMTP: ${smtpResult.error} | API: ${apiResult.error}`, provider: 'dual-failed' };
  }

  // Default: SMTP
  return sendViaSMTP(options);
}

// ============================================================================
// HELPERS HTML
// ============================================================================

/**
 * Elimina tags HTML de un string
 */
function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Escapa caracteres HTML
 */
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Verifica si la Tekhne Mail API está configurada y habilitada
 * @returns {Promise<boolean>}
 */
async function isTekhneApiConfigured() {
  const config = await loadMailApiConfig();
  return !!(config && config.enabled);
}

/**
 * Enviar email simple (interfaz compatible con MailServerExportable)
 * @param {object} options - { to: string[], subject, body, isHtml? }
 */
async function sendSimpleEmail(options) {
  const { to, subject, body, isHtml = false } = options;
  return sendEmail({
    to,
    subject,
    htmlBody: isHtml ? body : undefined,
    textBody: isHtml ? undefined : body,
  });
}

/**
 * Enviar email de prueba
 */
async function sendTestEmail(toEmail) {
  return sendEmail({
    to: [toEmail],
    subject: '✅ Test Email — Servicio de Email APP Afiliados',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #10b981;">✅ Configuración de Email Correcta</h2>
        <p>Si está leyendo este mensaje, el servicio de envío de emails está funcionando correctamente.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 12px;">
          <strong>Fecha:</strong> ${new Date().toLocaleString('es-AR')}<br>
          <strong>Proveedor:</strong> ${await getEmailProvider()}
        </p>
      </div>
    `,
  });
}

/**
 * Maskear email para mostrar parcialmente
 * Muestra primeros 3 caracteres + *** + dominio completo
 * Ejemplo: marianrodriguez@gmail.com -> mar***@gmail.com
 * 
 * @param {string} email - Email a maskear
 * @returns {string} Email maskeado
 */
function maskEmail(email) {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return email;
  }

  const [localPart, domain] = email.split('@');
  
  if (localPart.length <= 3) {
    return `${localPart[0]}***@${domain}`;
  }

  const visiblePart = localPart.substring(0, 3);
  return `${visiblePart}***@${domain}`;
}

/**
 * Enviar email de recuperación de contraseña
 * 
 * @param {string} toEmail - Email destinatario
 * @param {string} recoveryLink - Link de recuperación de contraseña
 * @param {string} userName - Nombre del usuario (opcional)
 * @returns {Promise<Object>} { success, messageId, maskedEmail }
 */
async function sendPasswordRecoveryEmail(toEmail, recoveryLink, userName = null) {
  try {
    console.log('📧 Enviando email de recuperación de contraseña:', { toEmail: maskEmail(toEmail) });

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #0066cc; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
          .button { display: inline-block; padding: 12px 30px; background: #0066cc; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Recuperación de Contraseña</h1>
          </div>
          <div class="content">
            ${userName ? `<p>Hola <strong>${userName}</strong>,</p>` : '<p>Hola,</p>'}
            <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en la Aplicación Móvil IA.</p>
            <p>Para crear una nueva contraseña, haz clic en el siguiente botón:</p>
            <p style="text-align: center;">
              <a href="${recoveryLink}" class="button">Restablecer Contraseña</a>
            </p>
            <p>Si no solicitaste este cambio, puedes ignorar este correo. Tu contraseña actual permanecerá sin cambios.</p>
            <p><strong>Nota:</strong> Este enlace es válido por 24 horas.</p>
          </div>
          <div class="footer">
            <p>Este es un correo automático. Por favor no respondas a este mensaje.</p>
            <p>&copy; ${new Date().getFullYear()} Aplicación Móvil IA</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const result = await sendEmail({
      to: [toEmail],
      subject: 'Recuperación de Contraseña - Aplicación Móvil IA',
      htmlBody,
    });

    if (!result.success) {
      throw { success: false, error: result.error, code: result.code };
    }

    console.log('✅ Email de recuperación enviado exitosamente:', { provider: result.provider, maskedEmail: maskEmail(toEmail) });
    return { success: true, messageId: result.messageId, maskedEmail: maskEmail(toEmail), provider: result.provider };
  } catch (error) {
    console.error('❌ Error enviando email de recuperación:', error);
    throw { success: false, error: error.message || error.error, code: error.code };
  }
}

/**
 * Enviar email de validación con código
 * 
 * @param {string} toEmail - Email destinatario
 * @param {string} codigoValidacion - Código de validación (4-6 dígitos)
 * @param {string} userName - Nombre del usuario (opcional)
 * @returns {Promise<Object>} { success, messageId, maskedEmail }
 */
async function sendValidationCodeEmail(toEmail, codigoValidacion, userName = null) {
  try {
    console.log('📧 Enviando código de validación:', { toEmail: maskEmail(toEmail), codigo: codigoValidacion });

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #0066cc; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; text-align: center; }
          .code { font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #0066cc; padding: 20px; background: white; border: 2px dashed #0066cc; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Código de Validación</h1>
          </div>
          <div class="content">
            ${userName ? `<p>Hola <strong>${userName}</strong>,</p>` : '<p>Hola,</p>'}
            <p>Tu código de validación para la Aplicación Móvil IA es:</p>
            <div class="code">${codigoValidacion}</div>
            <p>Ingresa este código en la aplicación para completar el proceso.</p>
            <p><strong>Nota:</strong> Este código es válido por 10 minutos.</p>
          </div>
          <div class="footer">
            <p>Este es un correo automático. Por favor no respondas a este mensaje.</p>
            <p>&copy; ${new Date().getFullYear()} Aplicación Móvil IA</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const result = await sendEmail({
      to: [toEmail],
      subject: 'Código de Validación - Aplicación Móvil IA',
      htmlBody,
    });

    if (!result.success) {
      throw { success: false, error: result.error, code: result.code };
    }

    console.log('✅ Email de validación enviado exitosamente:', { provider: result.provider, maskedEmail: maskEmail(toEmail) });
    return { success: true, messageId: result.messageId, maskedEmail: maskEmail(toEmail), provider: result.provider };
  } catch (error) {
    console.error('❌ Error enviando email de validación:', error);
    throw { success: false, error: error.message || error.error, code: error.code };
  }
}

/**
 * Verificar configuración de email (SMTP y/o API según proveedor activo)
 */
async function verifyEmailConfig() {
  const provider = await getEmailProvider();
  const results = { provider, smtp: null, api: null };

  if (provider === 'SMTP' || provider === 'DUAL') {
    results.smtp = await verifySMTPConfig();
  }

  if (provider === 'API' || provider === 'DUAL') {
    const apiConfig = await loadMailApiConfig();
    results.api = apiConfig && apiConfig.enabled
      ? { success: true, message: 'Tekhne Mail API configurada', url: apiConfig.url }
      : { success: false, message: 'Tekhne Mail API no configurada o deshabilitada' };
  }

  return results;
}

/**
 * Verificar configuración SMTP (útil para testing)
 */
async function verifySMTPConfig() {
  try {
    const { transporter } = await createTransporter();
    await transporter.verify();
    console.log('✅ Configuración SMTP verificada correctamente');
    return { success: true, message: 'Configuración SMTP válida' };
  } catch (error) {
    console.error('❌ Error verificando configuración SMTP:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Limpiar cache de configuración (SMTP + API)
 */
function clearEmailCache() {
  smtpConfigCache = null;
  smtpCacheTimestamp = 0;
  apiConfigCache = null;
  apiCacheTimestamp = 0;
  console.log('🗑️  Cache de email limpiado (SMTP + API)');
}

// Backward compatible alias
function clearSMTPCache() {
  clearEmailCache();
}

module.exports = {
  // Core — envío genérico dual-provider
  sendEmail,
  sendSimpleEmail,
  sendTestEmail,

  // Templates específicos
  sendPasswordRecoveryEmail,
  sendValidationCodeEmail,

  // Utilidades
  maskEmail,
  stripHtml,
  escapeHtml,

  // Verificación / diagnóstico
  verifySMTPConfig,
  verifyEmailConfig,
  isTekhneApiConfigured,
  getEmailProvider,

  // Cache
  clearSMTPCache,
  clearEmailCache,
};
