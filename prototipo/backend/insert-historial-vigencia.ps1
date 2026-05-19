# Script para insertar parámetro HistorialVigencia en la base de datos
# Ejecutar desde: backend/

Write-Host "🔧 Insertando parámetro HistorialVigencia..." -ForegroundColor Cyan

# Leer configuración de config.json
$configPath = Join-Path $PSScriptRoot "config.json"
if (-not (Test-Path $configPath)) {
    Write-Host "❌ No se encontró config.json" -ForegroundColor Red
    exit 1
}

$config = Get-Content $configPath | ConvertFrom-Json
$dbConfig = $config.database

# Construir string de conexión PostgreSQL
$env:PGPASSWORD = $dbConfig.password
$dbHost = $dbConfig.host
$dbPort = $dbConfig.port
$dbName = $dbConfig.database
$dbUser = $dbConfig.user

Write-Host "📊 Conectando a: $dbHost`:$dbPort/$dbName como $dbUser" -ForegroundColor Yellow

# Ejecutar SQL
$sqlFile = Join-Path $PSScriptRoot "db\insert_parametro_historial_vigencia.sql"

if (-not (Test-Path $sqlFile)) {
    Write-Host "❌ No se encontró el archivo SQL: $sqlFile" -ForegroundColor Red
    exit 1
}

Write-Host "📝 Ejecutando SQL desde: $sqlFile" -ForegroundColor Yellow

try {
    $result = psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -f $sqlFile 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Parámetro insertado exitosamente" -ForegroundColor Green
        Write-Host ""
        Write-Host "📋 Parámetro creado:" -ForegroundColor Cyan
        Write-Host "   Grupo: FUNCIONES_APP" -ForegroundColor White
        Write-Host "   Tipo: HistorialVigencia" -ForegroundColor White
        Write-Host "   Valor: 180 días (6 meses)" -ForegroundColor White
        Write-Host ""
        Write-Host "💡 Este parámetro controla cuántos días hacia atrás" -ForegroundColor Yellow
        Write-Host "   se consulta el historial de atención médica." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "🔄 Puedes modificarlo desde:" -ForegroundColor Cyan
        Write-Host "   - Web: http://localhost:3000/admin" -ForegroundColor White
        Write-Host "   - CLI: .\manage-parametros.ps1" -ForegroundColor White
    } else {
        Write-Host "❌ Error ejecutando SQL:" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
} finally {
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "🎯 Siguiente paso: Reiniciar el backend para aplicar cambios" -ForegroundColor Cyan
Write-Host "   .\restart-backend.ps1" -ForegroundColor White
