#!/usr/bin/env node
/**
 * Script de prueba para Tekhne Mail Service
 * 
 * Uso:
 *   node test-mail-service.js
 *   node test-mail-service.js tu-email@ejemplo.com
 */

require('dotenv').config();
const mailService = require('./mailService');

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, emoji, message) {
  console.log(`${color}${emoji} ${message}${colors.reset}`);
}

async function testMailService() {
  console.log('\n' + '='.repeat(60));
  log(colors.cyan, '📧', 'TEST DE TEKHNE MAIL SERVICE');
  console.log('='.repeat(60) + '\n');

  // Obtener email de destino
  const testEmail = process.argv[2] || 'test@ejemplo.com';
  
  log(colors.blue, 'ℹ️ ', `Email de prueba: ${testEmail}`);
  console.log('');

  // 1. Verificar configuración
  log(colors.yellow, '1️⃣ ', 'Verificando configuración...');
  
  const config = {
    'MAIL_API_URL': process.env.MAIL_API_URL || '❌ NO CONFIGURADA',
    'MAIL_API_KEY': process.env.MAIL_API_KEY ? '✅ CONFIGURADA' : '❌ NO CONFIGURADA',
    'MAIL_FROM_ADDRESS': process.env.MAIL_FROM_ADDRESS || '❌ NO CONFIGURADA'
  };

  Object.entries(config).forEach(([key, value]) => {
    const hasValue = value && !value.includes('❌');
    const color = hasValue ? colors.green : colors.red;
    log(color, hasValue ? '✅' : '❌', `${key}: ${value}`);
  });

  console.log('');

  // 2. Verificar si el servicio está configurado
  log(colors.yellow, '2️⃣ ', 'Verificando estado del servicio...');
  
  if (!mailService.isConfigured()) {
    log(colors.red, '❌', 'SERVICIO NO CONFIGURADO');
    log(colors.yellow, '⚠️ ', 'Configura las variables MAIL_* en archivo .env');
    log(colors.yellow, '📄', 'Ver archivo .env.example como referencia');
    process.exit(1);
  }
  
  log(colors.green, '✅', 'Servicio configurado correctamente');
  console.log('');

  // 3. Validar email de destino
  log(colors.yellow, '3️⃣ ', 'Validando email de destino...');
  
  if (!mailService.validateEmail(testEmail)) {
    log(colors.red, '❌', `Email inválido: ${testEmail}`);
    log(colors.yellow, 'ℹ️ ', 'Uso: node test-mail-service.js email@valido.com');
    process.exit(1);
  }
  
  log(colors.green, '✅', `Email válido: ${testEmail}`);
  console.log('');

  // 4. Enviar email de prueba
  log(colors.yellow, '4️⃣ ', 'Enviando email de prueba...');
  log(colors.blue, '📤', `Destinatario: ${testEmail}`);
  console.log('');

  try {
    const result = await mailService.sendTestEmail(testEmail);
    
    if (result.sent) {
      console.log('');
      log(colors.green, '✅', '¡EMAIL ENVIADO EXITOSAMENTE!');
      console.log('');
      log(colors.cyan, 'ℹ️ ', `Destinatario: ${testEmail}`);
      log(colors.cyan, 'ℹ️ ', `Message ID: ${result.messageId || 'N/A'}`);
      console.log('');
      log(colors.yellow, '📬', 'Revisa tu bandeja de entrada y/o carpeta de spam');
      console.log('');
    }
  } catch (error) {
    console.log('');
    log(colors.red, '❌', 'ERROR AL ENVIAR EMAIL');
    console.log('');
    log(colors.red, '⚠️ ', error.message);
    console.log('');
    log(colors.yellow, '💡', 'Posibles causas:');
    log(colors.yellow, '  •', 'API Key incorrecta');
    log(colors.yellow, '  •', 'Servidor Tekhne no disponible');
    log(colors.yellow, '  •', 'Problemas de red/firewall');
    console.log('');
    process.exit(1);
  }

  // 5. Resumen
  console.log('='.repeat(60));
  log(colors.green, '✅', 'TEST COMPLETADO EXITOSAMENTE');
  console.log('='.repeat(60) + '\n');

  process.exit(0);
}

// Ejecutar
testMailService().catch(error => {
  console.error('Error inesperado:', error);
  process.exit(1);
});
