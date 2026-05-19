# Script de migración: Cambiar ausolfecal y ausolfecor a TIMESTAMP
# Fecha: 23 de diciembre de 2025

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "MIGRACIÓN: ausolfecal DATE → TIMESTAMP" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Configuración de conexión PostgreSQL
$dbHost = "localhost"
$dbPort = "5432"
$dbName = "app_afiliados_genexus"
$dbUser = "postgres"

# Solicitar contraseña
$dbPassword = Read-Host "Ingresa la contraseña de PostgreSQL" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword)
$dbPasswordPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

# Construir connection string
$env:PGPASSWORD = $dbPasswordPlain
$psqlPath = "psql"
$psqlArgs = @("-h", $dbHost, "-p", $dbPort, "-U", $dbUser, "-d", $dbName)

Write-Host "Paso 1: Verificando estado actual de la tabla..." -ForegroundColor Yellow

# Verificar tipos de dato actuales
Write-Host "`nTipos de dato actuales:" -ForegroundColor White
& $psqlPath @psqlArgs -t -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = `'ausolici`' AND column_name IN (`'ausolfecal`', `'ausolfecor`') ORDER BY column_name;"

Write-Host "`nPaso 2: Contando registros existentes..." -ForegroundColor Yellow
$totalRegistros = & $psqlPath @psqlArgs -t -c "SELECT COUNT(*) as total FROM ausolici;"
Write-Host "Total de registros: $($totalRegistros.Trim())" -ForegroundColor White

Write-Host "`nPaso 3: Ejecutando migración..." -ForegroundColor Yellow
Write-Host "⚠️  Esto creará un backup automático en 'ausolici_backup_20251223'" -ForegroundColor Yellow

$confirm = Read-Host "`n¿Continuar con la migración? (S/N)"
if ($confirm -ne "S" -and $confirm -ne "s") {
    Write-Host "`n❌ Migración cancelada" -ForegroundColor Red
    exit 0
}

# Ejecutar script de migración
Write-Host "`nEjecutando script SQL..." -ForegroundColor Cyan
$scriptPath = ".\db\migrate_ausolfecal_to_timestamp.sql"

if (Test-Path $scriptPath) {
    & $psqlPath @psqlArgs -f $scriptPath
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Migración ejecutada exitosamente" -ForegroundColor Green
    } else {
        Write-Host "`n❌ Error en la migración" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "`n❌ No se encontró el script: $scriptPath" -ForegroundColor Red
    exit 1
}

Write-Host "`nPaso 4: Verificando resultado..." -ForegroundColor Yellow

# Verificar nuevos tipos de dato
Write-Host "`nTipos de dato después de migración:" -ForegroundColor White
& $psqlPath @psqlArgs -t -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = `'ausolici`' AND column_name IN (`'ausolfecal`', `'ausolfecor`') ORDER BY column_name;"

# Verificar que no se perdieron registros
$totalRegistrosAfter = & $psqlPath @psqlArgs -t -c "SELECT COUNT(*) as total FROM ausolici;"
Write-Host "`nTotal de registros después: $($totalRegistrosAfter.Trim())" -ForegroundColor White

# Mostrar primeros 5 registros
Write-Host "`nPrimeros 5 registros (ordenados por fecha):" -ForegroundColor White
& $psqlPath @psqlArgs -c "SELECT ausolicid, ausolfecal, ausolfecor, ausoldescr, ausolestad FROM ausolici ORDER BY ausolfecal DESC LIMIT 5;"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "✅ MIGRACIÓN COMPLETADA" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`nNOTAS IMPORTANTES:" -ForegroundColor Yellow
Write-Host "1. Backup creado en tabla: ausolici_backup_20251223" -ForegroundColor White
Write-Host "2. Índice recreado: idx_ausolici_user_fecha" -ForegroundColor White
Write-Host "3. Reiniciar backend para que use TIMESTAMP" -ForegroundColor White
Write-Host "4. Una vez verificado, eliminar backup con:" -ForegroundColor White
Write-Host "   DROP TABLE ausolici_backup_20251223;" -ForegroundColor Gray

Write-Host "`nPróximos pasos:" -ForegroundColor Yellow
Write-Host "1. Reiniciar backend: .\restart-backend.ps1" -ForegroundColor White
Write-Host "2. Probar creación de solicitud" -ForegroundColor White
Write-Host "3. Verificar que las fechas incluyen hora" -ForegroundColor White

# Limpiar password del environment
$env:PGPASSWORD = $null
