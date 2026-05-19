# ============================================================================
# Script PowerShell: Instalar dependencias backend y ejecutar script SQL SMTP
# ============================================================================
# Propósito: Configurar backend para envío de emails desde BD
# Uso: .\setup-smtp-backend.ps1
# ============================================================================

Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "  CONFIGURACIÓN SMTP BACKEND - Sistema de Emails desde BD" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

# Variables
$backendDir = $PSScriptRoot
$dbScriptPath = Join-Path $backendDir "db\insert_smtp_parameters.sql"

# Paso 1: Instalar dependencias npm
Write-Host "📦 Paso 1: Instalando dependencias npm..." -ForegroundColor Yellow
Write-Host ""

try {
    Push-Location $backendDir
    npm install
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Dependencias instaladas correctamente" -ForegroundColor Green
    } else {
        Write-Host "❌ Error instalando dependencias npm" -ForegroundColor Red
        exit 1
    }
} finally {
    Pop-Location
}

Write-Host ""

# Paso 2: Ejecutar script SQL de parámetros SMTP
Write-Host "🔧 Paso 2: Ejecutando script SQL de parámetros SMTP..." -ForegroundColor Yellow
Write-Host ""

if (-not (Test-Path $dbScriptPath)) {
    Write-Host "❌ No se encontró el script SQL: $dbScriptPath" -ForegroundColor Red
    exit 1
}

Write-Host "Ruta del script SQL:" -ForegroundColor Gray
Write-Host "  $dbScriptPath" -ForegroundColor Gray
Write-Host ""

# Solicitar credenciales PostgreSQL
Write-Host "Ingrese las credenciales de PostgreSQL:" -ForegroundColor Cyan
$dbHost = Read-Host "Host (default: localhost)"
if ([string]::IsNullOrWhiteSpace($dbHost)) { $dbHost = "localhost" }

$dbPort = Read-Host "Port (default: 5432)"
if ([string]::IsNullOrWhiteSpace($dbPort)) { $dbPort = "5432" }

$dbName = Read-Host "Database (default: app_afiliados_genexus)"
if ([string]::IsNullOrWhiteSpace($dbName)) { $dbName = "app_afiliados_genexus" }

$dbUser = Read-Host "Usuario (default: postgres)"
if ([string]::IsNullOrWhiteSpace($dbUser)) { $dbUser = "postgres" }

$dbPassword = Read-Host "Password" -AsSecureString
$dbPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword)
)

Write-Host ""
Write-Host "Ejecutando script SQL..." -ForegroundColor Yellow

# Setear variable de entorno PGPASSWORD
$env:PGPASSWORD = $dbPasswordPlain

try {
    # Ejecutar script SQL con psql
    $psqlArgs = @(
        "-h", $dbHost,
        "-p", $dbPort,
        "-U", $dbUser,
        "-d", $dbName,
        "-f", $dbScriptPath
    )
    
    psql @psqlArgs
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Script SQL ejecutado correctamente" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "❌ Error ejecutando script SQL" -ForegroundColor Red
        Write-Host "Verifique las credenciales y que PostgreSQL esté corriendo" -ForegroundColor Red
        exit 1
    }
} finally {
    # Limpiar variable de entorno
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host ""

# Paso 3: Instrucciones post-instalación
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "  CONFIGURACIÓN COMPLETADA" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Dependencias backend instaladas (nodemailer incluido)" -ForegroundColor Green
Write-Host "✅ Parámetros SMTP insertados en tabla nusispar" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  ACCIÓN REQUERIDA: Actualizar parámetros SMTP en la base de datos" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Conectarse a PostgreSQL:" -ForegroundColor White
Write-Host "   psql -h $dbHost -p $dbPort -U $dbUser -d $dbName" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Actualizar credenciales SMTP (OBLIGATORIO):" -ForegroundColor White
Write-Host ""
Write-Host "   -- Para Gmail con App Password:" -ForegroundColor Gray
Write-Host "   UPDATE nusispar SET nusisvalpa = 'smtp.gmail.com' WHERE nusisgrupa = 'SMTP' AND nusistippa = 'Host';" -ForegroundColor Gray
Write-Host "   UPDATE nusispar SET nusisvalpa = 'tu-email@gmail.com' WHERE nusisgrupa = 'SMTP' AND nusistippa = 'User';" -ForegroundColor Gray
Write-Host "   UPDATE nusispar SET nusisvalpa = 'xxxx xxxx xxxx xxxx' WHERE nusisgrupa = 'SMTP' AND nusistippa = 'Password';" -ForegroundColor Gray
Write-Host "   UPDATE nusispar SET nusisvalpa = 'noreply@osep.gob.ar' WHERE nusisgrupa = 'SMTP' AND nusistippa = 'FromEmail';" -ForegroundColor Gray
Write-Host ""
Write-Host "   -- Para Office 365:" -ForegroundColor Gray
Write-Host "   UPDATE nusispar SET nusisvalpa = 'smtp.office365.com' WHERE nusisgrupa = 'SMTP' AND nusistippa = 'Host';" -ForegroundColor Gray
Write-Host "   UPDATE nusispar SET nusisvalpa = 'cuenta@osep.gob.ar' WHERE nusisgrupa = 'SMTP' AND nusistippa = 'User';" -ForegroundColor Gray
Write-Host "   UPDATE nusispar SET nusisvalpa = 'password-cuenta' WHERE nusisgrupa = 'SMTP' AND nusistippa = 'Password';" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Verificar configuración:" -ForegroundColor White
Write-Host "   SELECT * FROM nusispar WHERE nusisgrupa = 'SMTP' ORDER BY nusistippa;" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Probar envío de email (desde backend/):" -ForegroundColor White
Write-Host "   node -e `"require('./emailService').verifySMTPConfig().then(r => console.log(r))`"" -ForegroundColor Gray
Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📚 Documentación:" -ForegroundColor Cyan
Write-Host "   - REGLAS_GAM_BDD.md (reglas de integración GAM)" -ForegroundColor Gray
Write-Host "   - backend/emailService.js (servicio de emails)" -ForegroundColor Gray
Write-Host "   - backend/gamService.js (funciones actualizadas)" -ForegroundColor Gray
Write-Host ""
Write-Host "🚀 Iniciar backend:" -ForegroundColor Cyan
Write-Host "   cd backend" -ForegroundColor Gray
Write-Host "   node server-soap.js" -ForegroundColor Gray
Write-Host ""
Write-Host "Presione cualquier tecla para continuar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
