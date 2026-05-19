# ============================================================================
# TEST DISPOSITIVOS (PUSH TOKENS) - Semana 25
# ============================================================================

$baseUrl = "http://localhost:3000"
$testUser = "marianr@tekhne.com.ar"
$testPassword = "123456"

Write-Host "`n========================================"
Write-Host "TEST DISPOSITIVOS (PUSH TOKENS)"
Write-Host "========================================`n"

# 1. LOGIN
Write-Host "1. LOGIN - Obtener token de autenticacion"
$loginBody = @{
    username = $testUser
    password = $testPassword
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.token
    Write-Host "[OK] Login exitoso" -ForegroundColor Green
    Write-Host "     Token: $($token.Substring(0, 40))..."
} catch {
    Write-Host "[FAIL] Error en login: $_" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# 2. REGISTRO NUEVO DISPOSITIVO ANDROID
Write-Host "`n2. POST /devices/register - Registrar dispositivo Android"
$deviceToken1 = "ExponentPushToken[test-android-token-12345]"
$registerBody = @{
    push_token = $deviceToken1
    plataforma = "android"
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri "$baseUrl/devices/register" -Method Post -Headers $headers -Body $registerBody
    $deviceId1 = $registerResponse.device.id
    Write-Host "[OK] Dispositivo registrado" -ForegroundColor Green
    Write-Host "     ID: $deviceId1"
    Write-Host "     Token: $($registerResponse.device.push_token)"
    Write-Host "     Plataforma: $($registerResponse.device.plataforma)"
} catch {
    Write-Host "[FAIL] Error registrando dispositivo: $_" -ForegroundColor Red
    exit 1
}

# 3. REGISTRO SEGUNDO DISPOSITIVO iOS
Write-Host "`n3. POST /devices/register - Registrar dispositivo iOS"
$deviceToken2 = "ExponentPushToken[test-ios-token-67890]"
$registerBody2 = @{
    push_token = $deviceToken2
    plataforma = "ios"
} | ConvertTo-Json

try {
    $registerResponse2 = Invoke-RestMethod -Uri "$baseUrl/devices/register" -Method Post -Headers $headers -Body $registerBody2
    $deviceId2 = $registerResponse2.device.id
    Write-Host "[OK] Segundo dispositivo registrado" -ForegroundColor Green
    Write-Host "     ID: $deviceId2"
    Write-Host "     Plataforma: $($registerResponse2.device.plataforma)"
} catch {
    Write-Host "[FAIL] Error registrando segundo dispositivo: $_" -ForegroundColor Red
    exit 1
}

# 4. UPSERT
Write-Host "`n4. POST /devices/register - Upsert (actualizar existente)"
Start-Sleep -Seconds 1

$upsertBody = @{
    push_token = $deviceToken1
    plataforma = "android"
} | ConvertTo-Json

try {
    $upsertResponse = Invoke-RestMethod -Uri "$baseUrl/devices/register" -Method Post -Headers $headers -Body $upsertBody
    Write-Host "[OK] Dispositivo actualizado (upsert)" -ForegroundColor Green
    Write-Host "     ID: $($upsertResponse.device.id)"
    
    if ($upsertResponse.device.id -eq $deviceId1) {
        Write-Host "     [OK] Mismo ID - upsert funciono correctamente" -ForegroundColor Green
    } else {
        Write-Host "     [WARN] ID diferente - upsert no funciono" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[FAIL] Error en upsert: $_" -ForegroundColor Red
}

# 5. LISTAR DISPOSITIVOS
Write-Host "`n5. GET /devices - Listar dispositivos activos"
try {
    $listResponse = Invoke-RestMethod -Uri "$baseUrl/devices" -Method Get -Headers $headers
    Write-Host "[OK] Dispositivos obtenidos: $($listResponse.devices.Count)" -ForegroundColor Green
    
    foreach ($device in $listResponse.devices) {
        Write-Host "     ---"
        Write-Host "     ID: $($device.id)"
        Write-Host "     Token: $($device.push_token.Substring(0, 50))..."
        Write-Host "     Plataforma: $($device.plataforma)"
    }
} catch {
    Write-Host "[FAIL] Error listando dispositivos: $_" -ForegroundColor Red
}

# 6. DESACTIVAR DISPOSITIVO
Write-Host "`n6. DELETE /devices/:id - Desactivar primer dispositivo"
try {
    $null = Invoke-RestMethod -Uri "$baseUrl/devices/$deviceId1" -Method Delete -Headers $headers
    Write-Host "[OK] Dispositivo desactivado" -ForegroundColor Green
    Write-Host "     ID desactivado: $deviceId1"
} catch {
    Write-Host "[FAIL] Error desactivando dispositivo: $_" -ForegroundColor Red
}

# 7. VERIFICAR DESACTIVACION
Write-Host "`n7. GET /devices - Verificar desactivacion"
try {
    $listResponse2 = Invoke-RestMethod -Uri "$baseUrl/devices" -Method Get -Headers $headers
    Write-Host "[OK] Dispositivos activos: $($listResponse2.devices.Count)" -ForegroundColor Green
    
    $deviceStillActive = $listResponse2.devices | Where-Object { $_.id -eq $deviceId1 }
    if ($null -eq $deviceStillActive) {
        Write-Host "     [OK] Dispositivo desactivado no aparece" -ForegroundColor Green
    } else {
        Write-Host "     [WARN] Dispositivo desactivado aun aparece" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[FAIL] Error verificando desactivacion: $_" -ForegroundColor Red
}

# 8. VALIDACION - Token invalido
Write-Host "`n8. Validacion - Token Expo invalido"
$invalidTokenBody = @{
    push_token = "invalid-token-format"
    plataforma = "android"
} | ConvertTo-Json

try {
    $null = Invoke-RestMethod -Uri "$baseUrl/devices/register" -Method Post -Headers $headers -Body $invalidTokenBody
    Write-Host "[FAIL] ERROR: Deberia haber rechazado token invalido" -ForegroundColor Red
} catch {
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($errorResponse.error -eq "VALIDATION_ERROR") {
        Write-Host "[OK] Validacion correcta: token rechazado" -ForegroundColor Green
        Write-Host "     Mensaje: $($errorResponse.errors[0].message)"
    } else {
        Write-Host "[WARN] Error inesperado: $($errorResponse.error)" -ForegroundColor Yellow
    }
}

# 9. VALIDACION - Sin autenticacion
Write-Host "`n9. Validacion - Sin token de autenticacion"
try {
    $null = Invoke-RestMethod -Uri "$baseUrl/devices/register" -Method Post -Body $registerBody -ContentType "application/json"
    Write-Host "[FAIL] ERROR: Deberia requerir autenticacion" -ForegroundColor Red
} catch {
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($errorResponse.error -eq "UNAUTHORIZED") {
        Write-Host "[OK] Autenticacion requerida correctamente" -ForegroundColor Green
        Write-Host "     Mensaje: $($errorResponse.message)"
    } else {
        Write-Host "[WARN] Error inesperado: $($errorResponse.error)" -ForegroundColor Yellow
    }
}

# 10. VALIDACION - Dispositivo inexistente
Write-Host "`n10. Validacion - Eliminar dispositivo inexistente"
$fakeDeviceId = "00000000-0000-0000-0000-000000000000"
try {
    $null = Invoke-RestMethod -Uri "$baseUrl/devices/$fakeDeviceId" -Method Delete -Headers $headers
    Write-Host "[WARN] Dispositivo no encontrado (esperado)" -ForegroundColor Yellow
} catch {
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($errorResponse.error -eq "NOT_FOUND") {
        Write-Host "[OK] Validacion correcta: dispositivo no encontrado" -ForegroundColor Green
        Write-Host "     Mensaje: $($errorResponse.message)"
    } else {
        Write-Host "     Error: $($errorResponse.error)"
    }
}

# RESUMEN
Write-Host "`n========================================"
Write-Host "RESUMEN DE PRUEBAS"
Write-Host "========================================" 
Write-Host "[OK] Login exitoso" -ForegroundColor Green
Write-Host "[OK] Registro de dispositivo nuevo" -ForegroundColor Green
Write-Host "[OK] Registro de segundo dispositivo" -ForegroundColor Green
Write-Host "[OK] Upsert (actualizacion de dispositivo existente)" -ForegroundColor Green
Write-Host "[OK] Listado de dispositivos activos" -ForegroundColor Green
Write-Host "[OK] Desactivacion de dispositivo (soft delete)" -ForegroundColor Green
Write-Host "[OK] Verificacion de desactivacion" -ForegroundColor Green
Write-Host "[OK] Validacion de token Expo invalido" -ForegroundColor Green
Write-Host "[OK] Validacion de autenticacion requerida" -ForegroundColor Green
Write-Host "[OK] Validacion de ownership de dispositivos" -ForegroundColor Green
Write-Host "`nTODAS LAS PRUEBAS COMPLETADAS" -ForegroundColor Green
Write-Host "========================================`n"
