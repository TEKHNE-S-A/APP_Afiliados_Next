# Script para crear tabla de notificaciones
# Fecha: 23 de diciembre de 2025

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "CREAR TABLA: notifications" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Configuración
$dbHost = "localhost"
$dbPort = "5432"
$dbName = "app_afiliados_genexus"
$dbUser = "postgres"

# Solicitar contraseña
$dbPassword = Read-Host "Ingresa la contraseña de PostgreSQL" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword)
$dbPasswordPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$env:PGPASSWORD = $dbPasswordPlain
$psqlPath = "psql"
$psqlArgs = @("-h", $dbHost, "-p", $dbPort, "-U", $dbUser, "-d", $dbName)

Write-Host "Ejecutando script SQL..." -ForegroundColor Yellow
$scriptPath = ".\db\create_notifications_table.sql"

if (Test-Path $scriptPath) {
    & $psqlPath @psqlArgs -f $scriptPath
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Tabla 'notifications' creada exitosamente" -ForegroundColor Green
        
        # Verificar
        Write-Host "`nVerificando estructura..." -ForegroundColor Yellow
        & $psqlPath @psqlArgs -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = `'notifications`' ORDER BY ordinal_position;"
        
    } else {
        Write-Host "`n❌ Error al crear tabla" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "`n❌ No se encontró el script: $scriptPath" -ForegroundColor Red
    exit 1
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "✅ COMPLETADO" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

# Limpiar password
$env:PGPASSWORD = $null
