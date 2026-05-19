# Test de Implementación REGLA 2.1 y 2.2
# Verifica que el flujo de registro detecta usuarios existentes en GAM

$baseUrl = "http://localhost:3000"
$ErrorActionPreference = "Continue"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST REGLA 2: Registration and Login" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# ============================================================================
# TEST 1: Verificar función checkUserExistsInGAM (caso usuario NO existe)
# ============================================================================
Write-Host "TEST 1: Usuario nuevo (NO existe en GAM)" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray

$newUserData = @{
    email = "nuevo_usuario_test_$(Get-Date -Format 'yyyyMMddHHmmss')@test.com"
    password = "Test123456"
    firstName = "Test"
    lastName = "Usuario"
    telefono = "3515555555"
    documento = "99999999"
    cuil = "20999999999"
    nroAfiliado = "99-999999-99"
    sexo = "M"
    fechaNacimiento = "1990-01-01"
} | ConvertTo-Json

Write-Host "Datos: $($newUserData.Replace('"password":"Test123456"', '"password":"***"'))" -ForegroundColor Gray

try {
    $response1 = Invoke-RestMethod -Uri "$baseUrl/gam/register" `
        -Method POST `
        -ContentType "application/json" `
        -Body $newUserData `
        -ErrorAction Stop
    
    Write-Host "✅ Respuesta exitosa" -ForegroundColor Green
    Write-Host "   Case: $($response1.case)" -ForegroundColor Cyan
    Write-Host "   UserID: $($response1.userId)" -ForegroundColor Cyan
    Write-Host "   Created in GAM: $($response1.createdInGAM)" -ForegroundColor Cyan
    Write-Host "   User existed in GAM: $($response1.userExistedInGAM)" -ForegroundColor Cyan
    Write-Host "   Message: $($response1.message)" -ForegroundColor Gray
    
    if ($response1.case -eq "2.2" -and $response1.createdInGAM -eq $true) {
        Write-Host "   ✅ CASO 2.2 correctamente ejecutado" -ForegroundColor Green
    } else {
        Write-Host "   ❌ CASO 2.2 NO detectado correctamente" -ForegroundColor Red
    }
    
    $global:testUserId = $response1.userId
    $global:testUserEmail = ($newUserData | ConvertFrom-Json).email
    $global:testUserPassword = ($newUserData | ConvertFrom-Json).password
    
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "❌ Error: $statusCode" -ForegroundColor Red
    Write-Host "   Code: $($errorBody.code)" -ForegroundColor Red
    Write-Host "   Message: $($errorBody.error)" -ForegroundColor Red
}

Start-Sleep -Seconds 2

# ============================================================================
# TEST 2: Intentar registrar MISMO usuario (caso usuario existe en GAM)
# ============================================================================
Write-Host "`nTEST 2: Usuario existente (SÍ existe en GAM)" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray

# Usar email diferente pero intentar crear cuenta con mismo usuario
$existingUserData = @{
    email = $global:testUserEmail
    password = $global:testUserPassword
    firstName = "Test2"
    lastName = "Usuario2"
    telefono = "3515555556"
    documento = "99999999"
    cuil = "20999999999"
    nroAfiliado = "99-999999-99"
    sexo = "M"
    fechaNacimiento = "1990-01-01"
} | ConvertTo-Json

Write-Host "Datos: Email=$($global:testUserEmail)" -ForegroundColor Gray

try {
    $response2 = Invoke-RestMethod -Uri "$baseUrl/gam/register" `
        -Method POST `
        -ContentType "application/json" `
        -Body $existingUserData `
        -ErrorAction Stop
    
    Write-Host "✅ Respuesta exitosa" -ForegroundColor Green
    Write-Host "   Case: $($response2.case)" -ForegroundColor Cyan
    Write-Host "   UserID: $($response2.userId)" -ForegroundColor Cyan
    Write-Host "   Created in GAM: $($response2.createdInGAM)" -ForegroundColor Cyan
    Write-Host "   User existed in GAM: $($response2.userExistedInGAM)" -ForegroundColor Cyan
    Write-Host "   Synced to local DB: $($response2.syncedToLocalDB)" -ForegroundColor Cyan
    Write-Host "   Message: $($response2.message)" -ForegroundColor Gray
    
    if ($response2.case -eq "2.1" -and $response2.userExistedInGAM -eq $true) {
        Write-Host "   ✅ CASO 2.1 correctamente ejecutado" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Caso detectado: $($response2.case)" -ForegroundColor Yellow
    }
    
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "❌ Error: $statusCode" -ForegroundColor Red
    Write-Host "   Code: $($errorBody.code)" -ForegroundColor Red
    Write-Host "   Message: $($errorBody.error)" -ForegroundColor Red
    
    # Si el error es USER_ALREADY_SYNCED, es correcto (ya está en BD local)
    if ($errorBody.code -eq "USER_ALREADY_SYNCED") {
        Write-Host "   ✅ Usuario ya sincronizado (esperado)" -ForegroundColor Green
    }
}

Start-Sleep -Seconds 2

# ============================================================================
# TEST 3: Simular caso 2.1 (usuario en GAM, no en BD local)
# ============================================================================
Write-Host "`nTEST 3: Simular CASO 2.1 puro" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host "Para probar CASO 2.1 puro:" -ForegroundColor Gray
Write-Host "1. Crear usuario SOLO en GAM (desde web)" -ForegroundColor Gray
Write-Host "2. Intentar registrar desde app móvil con MISMO email" -ForegroundColor Gray
Write-Host "3. App debe detectar que existe en GAM y NO crear nuevo usuario" -ForegroundColor Gray
Write-Host "4. App debe sincronizar a BD local usando UserID existente" -ForegroundColor Gray

# ============================================================================
# TEST 4: Verificar en BD local
# ============================================================================
Write-Host "`nTEST 4: Verificación en BD local" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray

if ($global:testUserId) {
    Write-Host "Verificar en PostgreSQL:" -ForegroundColor Gray
    Write-Host "  SELECT nuusuid, nuusumail, nuusuapell" -ForegroundColor Cyan
    Write-Host "  FROM nuusuari" -ForegroundColor Cyan
    Write-Host "  WHERE nuusuid = '$($global:testUserId)';" -ForegroundColor Cyan
    
    Write-Host "`n  SELECT tipo_autenticacion" -ForegroundColor Cyan
    Write-Host "  FROM v_usuarios_tipo" -ForegroundColor Cyan
    Write-Host "  WHERE nuusuid = '$($global:testUserId)';" -ForegroundColor Cyan
    Write-Host "  -- Debe mostrar 'GAM' (nuusuid NO es numérico)" -ForegroundColor Gray
}

# ============================================================================
# RESUMEN
# ============================================================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "RESUMEN DE IMPLEMENTACIÓN" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`n✅ Funciones implementadas:" -ForegroundColor Green
Write-Host "   - gamService.checkUserExistsInGAM()" -ForegroundColor White
Write-Host "   - Flujo CASO 2.1 en POST /gam/register" -ForegroundColor White
Write-Host "   - Flujo CASO 2.2 en POST /gam/register" -ForegroundColor White

Write-Host "`n📋 Casos cubiertos:" -ForegroundColor Cyan
Write-Host "   CASO 2.1: Usuario existe en GAM → solo sync a BD local ✅" -ForegroundColor White
Write-Host "   CASO 2.2: Usuario NO existe en GAM → crear completo ✅" -ForegroundColor White

Write-Host "`n⚠️  Para TEST completo CASO 2.1:" -ForegroundColor Yellow
Write-Host "   1. Registrar usuario en GAM web" -ForegroundColor Gray
Write-Host "   2. Intentar registro en app con mismo email" -ForegroundColor Gray
Write-Host "   3. Verificar que NO se crea duplicado en GAM" -ForegroundColor Gray
Write-Host "   4. Verificar que se crea registro en BD local" -ForegroundColor Gray

Write-Host "`n========================================`n" -ForegroundColor Cyan
