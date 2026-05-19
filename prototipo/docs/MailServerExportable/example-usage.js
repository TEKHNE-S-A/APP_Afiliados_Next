/**
 * Ejemplos de uso del Tekhne Mail Service
 * ========================================
 * 
 * Ejecutar: node example-usage.js
 */

require('dotenv').config();
const mailService = require('./mailService');

// Verificar que el servicio está configurado
if (!mailService.isConfigured()) {
  console.error('❌ Servicio no configurado. Copiar .env.example a .env y configurar.');
  process.exit(1);
}

// ============================================================
// EJEMPLO 1: Email de texto plano
// ============================================================
async function ejemplo1_TextoPlano() {
  console.log('\n📧 Ejemplo 1: Email de texto plano');
  
  const result = await mailService.sendSimpleEmail({
    to: ['destinatario@ejemplo.com'],
    subject: 'Notificación del sistema',
    body: 'Hola!\n\nEste es un mensaje de texto plano.\n\nSaludos.',
    isHtml: false
  });

  console.log('Resultado:', result);
}

// ============================================================
// EJEMPLO 2: Email HTML
// ============================================================
async function ejemplo2_EmailHTML() {
  console.log('\n📧 Ejemplo 2: Email HTML');
  
  const result = await mailService.sendSimpleEmail({
    to: ['destinatario@ejemplo.com'],
    subject: 'Bienvenido al sistema',
    body: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h1 style="color: #3b82f6;">¡Bienvenido!</h1>
        <p>Gracias por registrarte en nuestro sistema.</p>
        <p>Tu cuenta ha sido creada exitosamente.</p>
        <a href="https://ejemplo.com/login" 
           style="display: inline-block; 
                  background: #3b82f6; 
                  color: white; 
                  padding: 10px 20px; 
                  text-decoration: none; 
                  border-radius: 5px;">
          Iniciar Sesión
        </a>
      </div>
    `,
    isHtml: true
  });

  console.log('Resultado:', result);
}

// ============================================================
// EJEMPLO 3: Múltiples destinatarios
// ============================================================
async function ejemplo3_MultiplesDestinatarios() {
  console.log('\n📧 Ejemplo 3: Múltiples destinatarios');
  
  const result = await mailService.sendSimpleEmail({
    to: [
      'usuario1@ejemplo.com',
      'usuario2@ejemplo.com',
      'usuario3@ejemplo.com'
    ],
    subject: 'Anuncio importante',
    body: 'Este mensaje es para todos los usuarios.',
    isHtml: false
  });

  console.log('Resultado:', result);
}

// ============================================================
// EJEMPLO 4: Validar emails antes de enviar
// ============================================================
async function ejemplo4_ValidarEmails() {
  console.log('\n📧 Ejemplo 4: Validar emails');
  
  const emails = [
    'valido@email.com',
    'invalido',
    'otro-valido@test.com',
    'sin-arroba.com'
  ];

  const validation = mailService.validateEmailList(emails);
  
  console.log('Lista de emails:', emails);
  console.log('¿Todos válidos?:', validation.valid);
  console.log('Inválidos:', validation.invalid);

  if (validation.valid) {
    // Enviar solo si todos son válidos
    console.log('✅ Todos los emails son válidos, se puede enviar');
  } else {
    console.log('❌ Hay emails inválidos, corregir antes de enviar');
  }
}

// ============================================================
// EJEMPLO 5: Manejo de errores
// ============================================================
async function ejemplo5_ManejoErrores() {
  console.log('\n📧 Ejemplo 5: Manejo de errores');
  
  const result = await mailService.sendSimpleEmail({
    to: ['destinatario@ejemplo.com'],
    subject: 'Test',
    body: 'Mensaje de prueba',
    isHtml: false
  });

  if (result.success) {
    console.log('✅ Email enviado correctamente');
    console.log('   Message ID:', result.messageId);
  } else {
    console.log('❌ Error al enviar email');
    console.log('   Error:', result.error);
    
    // Acciones según el error
    if (result.error.includes('no configurado')) {
      console.log('   Acción: Verificar variables de entorno');
    } else if (result.error.includes('401')) {
      console.log('   Acción: Verificar API Key');
    } else if (result.error.includes('timeout')) {
      console.log('   Acción: Reintentar más tarde');
    }
  }
}

// ============================================================
// EJEMPLO 6: Template de notificación
// ============================================================
function crearTemplateNotificacion(datos) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                  color: white; padding: 20px; text-align: center;">
        <h1>📧 ${datos.titulo}</h1>
      </div>
      <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb;">
        <p>Hola <strong>${datos.nombre}</strong>,</p>
        <p>${datos.mensaje}</p>
        ${datos.linkUrl ? `
          <div style="text-align: center; margin: 30px 0;">
            <a href="${datos.linkUrl}" 
               style="background: #667eea; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px;">
              ${datos.linkTexto || 'Ver más'}
            </a>
          </div>
        ` : ''}
      </div>
      <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
        <p>Este es un correo automático, no responder.</p>
      </div>
    </div>
  `;
}

async function ejemplo6_Template() {
  console.log('\n📧 Ejemplo 6: Usando template');
  
  const html = crearTemplateNotificacion({
    titulo: 'Nueva Notificación',
    nombre: 'Juan Pérez',
    mensaje: 'Tienes una nueva tarea asignada en el sistema.',
    linkUrl: 'https://ejemplo.com/tareas/123',
    linkTexto: 'Ver Tarea'
  });

  const result = await mailService.sendSimpleEmail({
    to: ['destinatario@ejemplo.com'],
    subject: 'Nueva tarea asignada',
    body: html,
    isHtml: true
  });

  console.log('Resultado:', result);
}

// ============================================================
// EJECUTAR EJEMPLOS
// ============================================================
async function main() {
  console.log('='.repeat(60));
  console.log('EJEMPLOS DE USO - TEKHNE MAIL SERVICE');
  console.log('='.repeat(60));

  // Descomentar el ejemplo que quieras probar:
  
  // await ejemplo1_TextoPlano();
  // await ejemplo2_EmailHTML();
  // await ejemplo3_MultiplesDestinatarios();
  await ejemplo4_ValidarEmails();
  // await ejemplo5_ManejoErrores();
  // await ejemplo6_Template();

  console.log('\n✅ Ejemplos completados');
}

main().catch(console.error);
