/**
 * Tekhne Mail Service
 * ====================
 * Servicio de envío de emails usando la API de Tekhne
 * 
 * Uso:
 *   const mailService = require('./mailService');
 *   await mailService.sendSimpleEmail({ to: ['email@ejemplo.com'], subject: 'Test', body: 'Hola', isHtml: false });
 * 
 * Requiere variables de entorno:
 *   - MAIL_API_URL: URL del endpoint de Tekhne
 *   - MAIL_API_KEY: API Key de autenticación
 *   - MAIL_FROM_ADDRESS: Email del remitente
 *   - MAIL_FROM_NAME: Nombre del remitente (opcional)
 * 
 * @author Tekhne S.A.
 * @version 1.0.0
 * @date Enero 2026
 */

const axios = require('axios');

class MailService {
  constructor() {
    this.apiUrl = null;
    this.apiKey = null;
    this.fromAddress = null;
    this.fromName = null;
    this.initialize();
  }

  /**
   * Inicializa la configuración del servicio desde variables de entorno
   */
  initialize() {
    // Cargar dotenv si no está cargado
    try {
      require('dotenv').config();
    } catch (e) {
      // dotenv no está instalado, continuar sin él
    }

    this.apiUrl = process.env.MAIL_API_URL;
    this.apiKey = process.env.MAIL_API_KEY;
    this.fromAddress = process.env.MAIL_FROM_ADDRESS || process.env.MAIL_FROM;
    this.fromName = process.env.MAIL_FROM_NAME || 'Sistema';

    if (this.apiUrl && this.apiKey && this.fromAddress) {
      console.log(`✅ Mail Service inicializado`);
      console.log(`   URL: ${this.apiUrl}`);
      console.log(`   From: ${this.fromName} <${this.fromAddress}>`);
    } else {
      console.warn('⚠️  Mail Service NO configurado. Variables requeridas:');
      console.warn(`   MAIL_API_URL: ${this.apiUrl ? '✅' : '❌ FALTA'}`);
      console.warn(`   MAIL_API_KEY: ${this.apiKey ? '✅' : '❌ FALTA'}`);
      console.warn(`   MAIL_FROM_ADDRESS: ${this.fromAddress ? '✅' : '❌ FALTA'}`);
    }
  }

  /**
   * Verifica si el servicio está configurado correctamente
   * @returns {boolean}
   */
  isConfigured() {
    return !!(this.apiUrl && this.apiKey && this.fromAddress);
  }

  /**
   * Envía un email usando la API de Tekhne
   * 
   * @param {Object} options - Opciones del email
   * @param {string[]} options.to - Array de emails destino
   * @param {string} options.subject - Asunto del email
   * @param {string} options.body - Contenido del mensaje
   * @param {boolean} [options.isHtml=false] - true = HTML, false = texto plano
   * @param {string} [options.from] - Remitente (usa MAIL_FROM_ADDRESS por defecto)
   * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
   * 
   * @example
   * // Email de texto plano
   * await mailService.sendSimpleEmail({
   *   to: ['user@ejemplo.com'],
   *   subject: 'Hola',
   *   body: 'Este es un mensaje de prueba',
   *   isHtml: false
   * });
   * 
   * @example
   * // Email HTML
   * await mailService.sendSimpleEmail({
   *   to: ['user@ejemplo.com'],
   *   subject: 'Bienvenido',
   *   body: '<h1>Hola!</h1><p>Bienvenido al sistema.</p>',
   *   isHtml: true
   * });
   */
  async sendSimpleEmail(options) {
    if (!this.isConfigured()) {
      console.warn('⚠️  Email no enviado: Servicio no configurado');
      return {
        success: false,
        error: 'Servicio de email no configurado. Verificar variables MAIL_* en .env'
      };
    }

    try {
      const { from, to, subject, body, isHtml = false } = options;

      // Validar parámetros requeridos
      if (!to || !Array.isArray(to) || to.length === 0) {
        return { success: false, error: 'Destinatarios inválidos. Debe ser un array de emails.' };
      }

      if (!subject) {
        return { success: false, error: 'Subject es requerido' };
      }

      if (!body) {
        return { success: false, error: 'Body es requerido' };
      }

      console.log(`📧 Enviando email a: ${to.join(', ')}`);
      console.log(`   Subject: ${subject}`);

      // Construir payload para Tekhne API
      // La API requiere: from, to, subject, bodyText y bodyHtml
      const payload = {
        from: from || this.fromAddress,
        to: to,
        subject: subject,
        bodyText: isHtml ? this.stripHtml(body) : body,
        bodyHtml: isHtml ? body : `<p>${this.escapeHtml(body).replace(/\n/g, '<br>')}</p>`
      };

      // Enviar a Tekhne API
      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        timeout: 30000 // 30 segundos
      });

      console.log('✅ Email enviado exitosamente');
      
      return {
        success: true,
        messageId: response.data?.messageId,
        to: to
      };

    } catch (error) {
      console.error('❌ Error enviando email:', error.message);
      
      if (error.response) {
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Detalle:`, error.response.data?.details || error.response.data);
      }

      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data
      };
    }
  }

  /**
   * Envía un email de prueba para verificar la configuración
   * 
   * @param {string} toEmail - Email de destino para la prueba
   * @returns {Promise<{sent: boolean, messageId?: string}>}
   */
  async sendTestEmail(toEmail) {
    if (!this.isConfigured()) {
      throw new Error('Servicio de email no configurado');
    }

    const result = await this.sendSimpleEmail({
      to: [toEmail],
      subject: '✅ Test Email - Configuración Correcta',
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #10b981;">✅ Configuración de Email Correcta</h2>
          <p>Si está leyendo este mensaje, el servicio de envío de emails está funcionando correctamente.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 12px;">
            <strong>Servicio:</strong> Tekhne Mail API<br>
            <strong>Fecha:</strong> ${new Date().toLocaleString('es-AR')}<br>
            <strong>From:</strong> ${this.fromAddress}
          </p>
        </div>
      `,
      isHtml: true
    });

    if (!result.success) {
      throw new Error(result.error || 'Error al enviar email de prueba');
    }

    return { 
      sent: true, 
      messageId: result.messageId 
    };
  }

  /**
   * Valida formato de email
   * @param {string} email
   * @returns {boolean}
   */
  validateEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  /**
   * Valida lista de emails
   * @param {string[]} emails
   * @returns {{valid: boolean, invalid: string[]}}
   */
  validateEmailList(emails) {
    const invalid = emails.filter(email => !this.validateEmail(email));
    return {
      valid: invalid.length === 0,
      invalid
    };
  }

  /**
   * Elimina tags HTML de un string
   * @param {string} html
   * @returns {string}
   */
  stripHtml(html) {
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
   * @param {string} text
   * @returns {string}
   */
  escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Exportar instancia singleton
module.exports = new MailService();
