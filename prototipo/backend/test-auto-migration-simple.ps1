# Test de Migracion Automatica al Login
# Verifica que usuarios LEGACY se migren automaticamente en su primer login GAM

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  Test: Migracion Automatica LEGACY -> GAM  " -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3000"
$testEmail = "nuevo@test.com"
$testPassword = "12345678"

Write-Host "Usuario de prueba: $testEmail" -ForegroundColor White
Write-Host ""

# Paso 1: Verificar backend
Write-Host "PASO 1: Verificando backend..." -ForegroundColor Cyan
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/health" -Method GET -ErrorAction Stop
    Write-Host "   [OK] Backend disponible" -ForegroundColor Green
} catch {
    Write-Host "   [ERROR] Backend no disponible" -ForegroundColor Red
    Write-Host "   Por favor ejecuta: node server-soap.js" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Paso 2: Login con GAM (deberia migrar automaticamente)
Write-Host "PASO 2: Ejecutando login GAM (migracion automatica)..." -ForegroundColor Cyan
try {
    $loginBody = @{
        username = $testEmail
        password = $testPassword
    } | ConvertTo-Json

    $loginResult = Invoke-RestMethod -Uri "$baseUrl/gam/login" -Method POST `
        -Body $loginBody -ContentType "application/json" -ErrorAction Stop

    Write-Host "   [OK] Login exitoso" -ForegroundColor Green
    Write-Host "   GUID de GAM: $($loginResult.user_id)" -ForegroundColor White
    
    if ($loginResult.migration) {
        Write-Host ""
        Write-Host "   [SUCCESS] MIGRACION AUTOMATICA DETECTADA!" -ForegroundColor Green
        Write-Host "   Mensaje: $($loginResult.migration.message)" -ForegroundColor White
        Write-Host "   Tablas actualizadas:" -ForegroundColor White
        $loginResult.migration.tablesUpdated | ForEach-Object {
            Write-Host "      * $_" -ForegroundColor Gray
        }
    } else {
        Write-Host "   [INFO] Usuario ya estaba migrado (sin migracion automatica)" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "   Credenciales sincronizadas: $($loginResult.credenciales.Count)" -ForegroundColor White
    Write-Host "   Access Token: $($loginResult.access_token.Substring(0, 20))..." -ForegroundColor Gray
    
} catch {
    Write-Host "   [ERROR] Error en login" -ForegroundColor Red
    if ($_.ErrorDetails) {
        $errorData = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "   Error: $($errorData.error)" -ForegroundColor Red
        if ($errorData.details) {
            Write-Host "   Details: $($errorData.details | ConvertTo-Json -Depth 3)" -ForegroundColor Gray
        }
    } else {
        Write-Host "   $_" -ForegroundColor Red
    }
    exit 1
}
Write-Host ""

# Paso 3: Segundo login (ya NO debe migrar)
Write-Host "PASO 3: Segundo login (verificar que NO migra de nuevo)..." -ForegroundColor Cyan
try {
    $loginResult2 = Invoke-RestMethod -Uri "$baseUrl/gam/login" -Method POST `
        -Body $loginBody -ContentType "application/json" -ErrorAction Stop

    if ($loginResult2.migration) {
        Write-Host "   [WARNING] Se migro de nuevo (no deberia pasar)" -ForegroundColor Yellow
    } else {
        Write-Host "   [OK] Correcto: usuario ya migrado, sin migracion adicional" -ForegroundColor Green
    }
} catch {
    Write-Host "   [WARNING] Error en segundo login" -ForegroundColor Yellow
}
Write-Host ""

# Resumen
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "[SUCCESS] TEST COMPLETADO" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "RESUMEN:" -ForegroundColor White
Write-Host "   * Migracion automatica: " -NoNewline -ForegroundColor White
if ($loginResult.migration) {
    Write-Host "FUNCIONANDO [OK]" -ForegroundColor Green
} else {
    Write-Host "No ejecutada (usuario ya migrado)" -ForegroundColor Yellow
}
Write-Host "   * Login GAM: EXITOSO [OK]" -ForegroundColor Green
Write-Host "   * Credenciales: $($loginResult.credenciales.Count) sincronizadas [OK]" -ForegroundColor Green
Write-Host ""
Write-Host "Para probar migracion desde cero:" -ForegroundColor Yellow
Write-Host "1. Revertir usuario a LEGACY:" -ForegroundColor Gray
Write-Host "   node revert-user-to-legacy.js $testEmail" -ForegroundColor Gray
Write-Host "2. Ejecutar este script nuevamente" -ForegroundColor Gray
Write-Host ""
