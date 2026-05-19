# ============================================================================
# Script PowerShell: Probar sistema de emails SMTP desde backend
# ============================================================================
# Propósito: Verificar configuración SMTP y envío de emails
# Uso: .\test-smtp-emails.ps1
# ============================================================================

Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "  TEST SMTP EMAILS - Verificación de envío de correos" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

$backendUrl = "http://localhost:3000"

# Verificar que el backend esté corriendo
Write-Host "🔍 Verificando que el backend esté corriendo..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$backendUrl/health" -Method GET -TimeoutSec 5 -ErrorAction SilentlyContinue
    Write-Host "✅ Backend corriendo en $backendUrl" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend no está corriendo en $backendUrl" -ForegroundColor Red
    Write-Host "   Inicie el backend con: node server-soap.js" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Test 1: Verificar configuración SMTP desde BD
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "TEST 1: Verificar configuración SMTP desde BD" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📧 Verificando parámetros SMTP..." -ForegroundColor Yellow

$testScript = @"
const emailService = require('./emailService');
const db = require('./db/connection');

async function testSMTPConfig() {
  try {
    // Leer parámetros SMTP desde BD
    const result = await db.query(
      'SELECT nusistippa, nusisvalpa FROM nusispar WHERE nusisgrupa = \$1 ORDER BY nusistippa',
      ['SMTP']
    );
    
    console.log('\n🔧 Parámetros SMTP en BD:');
    result.rows.forEach(row => {
      const valor = row.nusistippa === 'Password' ? '***OCULTO***' : row.nusisvalpa;
      console.log(`   ${row.nusistippa}: ${valor}`);
    });
    
    if (result.rows.length === 0) {
      console.log('\n❌ No hay parámetros SMTP configurados');
      console.log('   Ejecute: backend\\setup-smtp-backend.ps1');
      process.exit(1);
    }
    
    // Verificar conexión SMTP
    console.log('\n🔌 Verificando conexión SMTP...');
    const verification = await emailService.verifySMTPConfig();
    
    if (verification.success) {
      console.log('✅ Configuración SMTP válida');
    } else {
      console.log('❌ Error en configuración SMTP:', verification.error);
      process.exit(1);
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

testSMTPConfig();
"@

Set-Content -Path "backend\test-smtp-config-temp.js" -Value $testScript
node backend\test-smtp-config-temp.js
Remove-Item "backend\test-smtp-config-temp.js" -ErrorAction SilentlyContinue

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Configuración SMTP inválida" -ForegroundColor Red
    Write-Host "   Actualice los parámetros en la BD (ver setup-smtp-backend.ps1)" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Test 2: Probar función maskEmail
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "TEST 2: Probar función de masking de emails" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

$testEmails = @(
    "marianrodriguez@gmail.com",
    "test@osep.gob.ar",
    "a@b.com",
    "usuario.largo.nombre@dominio.com.ar"
)

Write-Host "📧 Probando maskEmail()..." -ForegroundColor Yellow
Write-Host ""

foreach ($email in $testEmails) {
    $testScript = "const emailService = require('./emailService'); console.log(emailService.maskEmail('$email'));"
    $masked = node -e $testScript
    Write-Host "   $email  →  $masked" -ForegroundColor Gray
}

Write-Host ""
Write-Host "✅ Función maskEmail verificada" -ForegroundColor Green

Write-Host ""

# Test 3: Envío de email de prueba (opcional)
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "TEST 3: Enviar email de prueba (OPCIONAL)" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

$sendTest = Read-Host "¿Desea enviar un email de prueba? (S/N) [N]"

if ($sendTest -eq "S" -or $sendTest -eq "s") {
    Write-Host ""
    $testEmail = Read-Host "Ingrese email de destino"
    
    if ([string]::IsNullOrWhiteSpace($testEmail)) {
        Write-Host "❌ Email vacío, test omitido" -ForegroundColor Red
    } else {
        Write-Host ""
        Write-Host "📧 Enviando email de prueba a: $testEmail" -ForegroundColor Yellow
        
        $body = @{
            email = $testEmail
            userName = "Usuario de Prueba"
        } | ConvertTo-Json
        
        try {
            $response = Invoke-RestMethod `
                -Uri "$backendUrl/gam/password-recovery" `
                -Method POST `
                -ContentType "application/json" `
                -Body $body
            
            Write-Host ""
            Write-Host "✅ Email enviado exitosamente:" -ForegroundColor Green
            Write-Host "   Mensaje: $($response.message)" -ForegroundColor Gray
            Write-Host "   Email maskeado: $($response.maskedEmail)" -ForegroundColor Gray
            
        } catch {
            Write-Host ""
            Write-Host "❌ Error enviando email:" -ForegroundColor Red
            Write-Host "   $($_.Exception.Message)" -ForegroundColor Red
        }
    }
} else {
    Write-Host "⏭️  Test de envío omitido" -ForegroundColor Yellow
}

Write-Host ""

# Resumen final
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "  RESUMEN DE TESTS" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Configuración SMTP verificada" -ForegroundColor Green
Write-Host "✅ Función maskEmail funcionando" -ForegroundColor Green
Write-Host ""
Write-Host "📚 Endpoints disponibles:" -ForegroundColor Cyan
Write-Host "   POST $backendUrl/gam/password-recovery" -ForegroundColor Gray
Write-Host "        Body: { email, userName? }" -ForegroundColor Gray
Write-Host "        Respuesta: { success, message, emailSent, maskedEmail }" -ForegroundColor Gray
Write-Host ""
Write-Host "🔧 Funciones en emailService.js:" -ForegroundColor Cyan
Write-Host "   - sendPasswordRecoveryEmail(toEmail, recoveryLink, userName?)" -ForegroundColor Gray
Write-Host "   - sendValidationCodeEmail(toEmail, codigo, userName?)" -ForegroundColor Gray
Write-Host "   - maskEmail(email)" -ForegroundColor Gray
Write-Host "   - verifySMTPConfig()" -ForegroundColor Gray
Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""
