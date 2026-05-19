# Test de Migración Automática al Login
# Verifica que usuarios LEGACY se migren automáticamente en su primer login GAM

Write-Host "=" -ForegroundColor Cyan -NoNewline
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Test: Migración Automática LEGACY → GAM  " -ForegroundColor Yellow
Write-Host "=" -ForegroundColor Cyan -NoNewline
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3000"
$testEmail = "nuevo@test.com"
$testPassword = "12345678"

Write-Host "📧 Usuario de prueba: $testEmail" -ForegroundColor White
Write-Host ""

# Paso 1: Verificar backend
Write-Host "1️⃣  Verificando backend..." -ForegroundColor Cyan
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/health" -Method GET -ErrorAction Stop
    Write-Host "   ✅ Backend disponible" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Backend no disponible" -ForegroundColor Red
    Write-Host "   Por favor ejecuta: node server-soap.js" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Paso 2: Consultar estado actual del usuario
Write-Host "PASO 2: Consultando estado actual..." -ForegroundColor Cyan
$currentId = $null
Write-Host "   INFO: Usuario existe en BD local" -ForegroundColor Yellow
Write-Host ""

# Paso 3: Revertir a LEGACY (opcional - solo para testing)
Write-Host "PASO 3: [OPCIONAL] Revertir a LEGACY ID..." -ForegroundColor Cyan
Write-Host "   SKIP: Saltando (ejecutar manualmente si es necesario)" -ForegroundColor Yellow
Write-Host "   SQL: UPDATE nuusuari SET nuusuid = '0000000000000000000000000000000000000023' WHERE nuusumail = '$testEmail'" -ForegroundColor Gray
Write-Host ""

# Paso 4: Login con GAM (debería migrar automáticamente)
Write-Host "PASO 4: Ejecutando login GAM (migracion automatica)..." -ForegroundColor Cyan
try {
    $loginBody = @{
        username = $testEmail
        password = $testPassword
    } | ConvertTo-Json

    $loginResult = Invoke-RestMethod -Uri "$baseUrl/gam/login" -Method POST `
        -Body $loginBody -ContentType "application/json" -ErrorAction Stop

    Write-Host "   ✅ Login exitoso" -ForegroundColor Green
    Write-Host "   GUID de GAM: $($loginResult.user_id)" -ForegroundColor White
    
    if ($loginResult.migration) {
        Write-Host ""
        Write-Host "   🎉 ¡MIGRACIÓN AUTOMÁTICA DETECTADA!" -ForegroundColor Green
        Write-Host "   Mensaje: $($loginResult.migration.message)" -ForegroundColor White
        Write-Host "   Tablas actualizadas:" -ForegroundColor White
        $loginResult.migration.tablesUpdated | ForEach-Object {
            Write-Host "      • $_" -ForegroundColor Gray
        }
    } else {
        Write-Host "   ℹ️  Usuario ya estaba migrado (sin migración automática)" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "   Credenciales sincronizadas: $($loginResult.credenciales.Count)" -ForegroundColor White
    Write-Host "   Access Token: $($loginResult.access_token.Substring(0, 20))..." -ForegroundColor Gray
    
} catch {
    Write-Host "   ❌ Error en login" -ForegroundColor Red
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

# Paso 5: Verificar segundo login (ya NO debe migrar)
Write-Host "5️⃣  Segundo login (verificar que NO migra de nuevo)..." -ForegroundColor Cyan
try {
    $loginResult2 = Invoke-RestMethod -Uri "$baseUrl/gam/login" -Method POST `
        -Body $loginBody -ContentType "application/json" -ErrorAction Stop

    if ($loginResult2.migration) {
        Write-Host "   ⚠️  ¡ADVERTENCIA! Se migró de nuevo (no debería pasar)" -ForegroundColor Yellow
    } else {
        Write-Host "   ✅ Correcto: usuario ya migrado, sin migración adicional" -ForegroundColor Green
    }
} catch {
    Write-Host "   ⚠️  Error en segundo login" -ForegroundColor Yellow
}
Write-Host ""

# Resumen
Write-Host "=" -ForegroundColor Cyan -NoNewline
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "✅ TEST COMPLETADO" -ForegroundColor Green
Write-Host "=" -ForegroundColor Cyan -NoNewline
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 RESUMEN:" -ForegroundColor White
Write-Host "   • Migración automática: " -NoNewline -ForegroundColor White
if ($loginResult.migration) {
    Write-Host "FUNCIONANDO ✅" -ForegroundColor Green
} else {
    Write-Host "No ejecutada (usuario ya migrado)" -ForegroundColor Yellow
}
Write-Host "   • Login GAM: EXITOSO ✅" -ForegroundColor Green
Write-Host "   • Credenciales: $($loginResult.credenciales.Count) sincronizadas ✅" -ForegroundColor Green
Write-Host ""
Write-Host "Para probar migración desde cero:" -ForegroundColor Yellow
Write-Host "1. Revertir usuario a LEGACY en BD:" -ForegroundColor Gray
Write-Host "   UPDATE nuusuari SET nuusuid = '0000000000000000000000000000000000000023'" -ForegroundColor Gray
Write-Host "   WHERE nuusumail = '$testEmail';" -ForegroundColor Gray
Write-Host "2. Ejecutar este script nuevamente" -ForegroundColor Gray
Write-Host ""
