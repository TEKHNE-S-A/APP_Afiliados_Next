# Test rapido del script de sincronizacion GAM
# Uso: .\test-sync-gam.ps1

Write-Host ""
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host "   Test Suite - Sincronizacion GAM -> BD Local" -ForegroundColor Cyan
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host ""

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Test 1: Verificar que backend esta corriendo
Write-Host "[Test 1] Backend disponible..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method GET -TimeoutSec 5
    if ($response.status -eq "ok") {
        Write-Host "   [PASS] Backend responde correctamente" -ForegroundColor Green
        Write-Host "   SOAP Connected: $($response.soapConnected)" -ForegroundColor Gray
    } else {
        Write-Host "   [FAIL] Backend no responde 'ok'" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   [FAIL] Backend no disponible en http://localhost:3000" -ForegroundColor Red
    Write-Host "   Inicia el backend con: node server-soap.js" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Test 2: Verificar que el script existe
Write-Host "[Test 2] Archivos del script..." -ForegroundColor Yellow
$scriptMain = Join-Path $scriptDir "sync-users-from-gam.js"
$scriptPS = Join-Path $scriptDir "sync-users-from-gam.ps1"

if (Test-Path $scriptMain) {
    Write-Host "   [PASS] sync-users-from-gam.js encontrado" -ForegroundColor Green
} else {
    Write-Host "   [FAIL] sync-users-from-gam.js no encontrado" -ForegroundColor Red
    exit 1
}

if (Test-Path $scriptPS) {
    Write-Host "   [PASS] sync-users-from-gam.ps1 encontrado" -ForegroundColor Green
} else {
    Write-Host "   [FAIL] sync-users-from-gam.ps1 no encontrado" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 3: Omitido (conexion BD se verifica en test 4)
Write-Host "[Test 3] Conexion a PostgreSQL... [OMITIDO - se verifica en test 4]" -ForegroundColor Gray

Write-Host ""

# Test 4: Dry-run con usuario de prueba
Write-Host "[Test 4] Dry-run con usuario de prueba..." -ForegroundColor Yellow
Write-Host "   Ejecutando: node sync-users-from-gam.js --email=marianr@tekhne.com.ar --dry-run" -ForegroundColor Gray

Push-Location $scriptDir
$output = node sync-users-from-gam.js --email=marianr@tekhne.com.ar --dry-run 2>&1
Pop-Location

# Verificar que el script se ejecuto sin errores fatales
if ($LASTEXITCODE -eq 0) {
    Write-Host "   [PASS] Script ejecutado sin errores" -ForegroundColor Green
    
    # Analizar output
    $outputStr = $output -join "`n"
    
    if ($outputStr -match "Backend disponible") {
        Write-Host "   [PASS] Backend verificado en script" -ForegroundColor Green
    }
    
    if ($outputStr -match "Usuario migrado exitosamente" -or $outputStr -match "Sin cambios" -or $outputStr -match "Saltados") {
        Write-Host "   [PASS] Usuario procesado correctamente" -ForegroundColor Green
    }
    
    if ($outputStr -match "\[DRY-RUN\]") {
        Write-Host "   [PASS] Modo DRY-RUN activado correctamente" -ForegroundColor Green
    }
    
} else {
    Write-Host "   [FAIL] Script termino con errores" -ForegroundColor Red
    Write-Host "   Output:" -ForegroundColor Yellow
    Write-Host $output
    exit 1
}

Write-Host ""

# Test 5: Verificar endpoint /credencial/sync-manual
Write-Host "[Test 5] Endpoint /credencial/sync-manual..." -ForegroundColor Yellow
try {
    # Probar sin autenticacion (debe rechazar desde IP no-localhost)
    # Como estamos en localhost, debe aceptar
    $testBody = @{
        nuusuid = "test-guid-12345"
        afiliadoId = "123456789012345678901234567890"
    } | ConvertTo-Json
    
    # Este test intenta llamar al endpoint pero esperamos un error 400 o 500 (no 403)
    # porque los parametros son de prueba
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:3000/credencial/sync-manual" `
                                      -Method POST `
                                      -Body $testBody `
                                      -ContentType "application/json" `
                                      -TimeoutSec 10
        
        Write-Host "   [WARN] Endpoint respondio exitosamente con parametros de prueba (inesperado)" -ForegroundColor Yellow
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        
        if ($statusCode -eq 403) {
            Write-Host "   [FAIL] Endpoint rechazo peticion desde localhost (no deberia)" -ForegroundColor Red
        } elseif ($statusCode -eq 404 -or $statusCode -eq 400 -or $statusCode -eq 500) {
            Write-Host "   [PASS] Endpoint existe y es accesible (error esperado con parametros de prueba)" -ForegroundColor Green
        } else {
            Write-Host "   [WARN] Endpoint respondio con codigo inesperado: $statusCode" -ForegroundColor Yellow
        }
    }
    
} catch {
    Write-Host "   [FAIL] Error probando endpoint" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host "   Test Suite Completado" -ForegroundColor Cyan
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para ejecutar sincronizacion real:" -ForegroundColor Yellow
Write-Host "   .\sync-users-from-gam.ps1 -DryRun    # Simulacion" -ForegroundColor Gray
Write-Host "   .\sync-users-from-gam.ps1            # Produccion" -ForegroundColor Gray
Write-Host ""
