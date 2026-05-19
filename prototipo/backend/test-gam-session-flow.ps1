#!/usr/bin/env pwsh
# Test flujo completo de sesiones GAM

Write-Host "`n=== TEST FLUJO SESIONES GAM ===" -ForegroundColor Cyan
Write-Host "Probando arquitectura: Sesiones manejadas 100% por GAM`n" -ForegroundColor Yellow

# 1. LOGIN
Write-Host "1️⃣  LOGIN con usuario GAM..." -ForegroundColor Green
$loginBody = @{
    username = 'marianr@tekhne.com.ar'
    password = '12345678'
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri 'http://localhost:3000/auth/login' -Method POST -Body $loginBody -ContentType 'application/json'
    
    $gamToken = $loginResponse.token
    Write-Host "   ✅ Login exitoso" -ForegroundColor Green
    Write-Host "   Token GAM: $($gamToken.Substring(0,40))..." -ForegroundColor Cyan
    Write-Host "   Usuario: $($loginResponse.user.email)" -ForegroundColor Yellow
    Write-Host "   Credenciales: $($loginResponse.credenciales.Count)`n" -ForegroundColor Magenta
    
} catch {
    Write-Host "   ❌ Error en login:" -ForegroundColor Red
    Write-Host "   $($_.ErrorDetails.Message)" -ForegroundColor Red
    exit 1
}

# 2. VALIDAR TOKEN CON /auth/me
Write-Host "2️⃣  Validando token GAM con /auth/me..." -ForegroundColor Green
try {
    $meResponse = Invoke-RestMethod -Uri 'http://localhost:3000/auth/me' -Method GET -Headers @{
        'Authorization' = "Bearer $gamToken"
    }
    
    Write-Host "   ✅ Token GAM válido" -ForegroundColor Green
    Write-Host "   Usuario: $($meResponse.username)" -ForegroundColor Yellow
    Write-Host "   Afiliado ID: $($meResponse.afiliadoId)`n" -ForegroundColor Cyan
    
} catch {
    Write-Host "   ❌ Error validando token:" -ForegroundColor Red
    Write-Host "   $($_.ErrorDetails.Message)`n" -ForegroundColor Red
}

# 3. VERIFICAR TOKEN EN BD
Write-Host "3️⃣  Verificando token guardado en BD..." -ForegroundColor Green
node check-user-marianr.js
Write-Host ""

# 4. CANCELAR REGISTRACIÓN
Write-Host "4️⃣  Probando cancelación de registración..." -ForegroundColor Green
Write-Host "   ⚠️  ADVERTENCIA: Esto desactivará el usuario en GAM!" -ForegroundColor Yellow
Write-Host "   Presiona CTRL+C para cancelar en los próximos 3 segundos..." -ForegroundColor Red
Start-Sleep -Seconds 3

try {
    $cancelResponse = Invoke-RestMethod -Uri 'http://localhost:3000/gam/cancel-registration' -Method POST -Headers @{
        'Authorization' = "Bearer $gamToken"
    }
    
    Write-Host "   ✅ Cancelación exitosa" -ForegroundColor Green
    Write-Host "   Mensaje: $($cancelResponse.message)" -ForegroundColor Yellow
    Write-Host "   Usuario GAM anulado: $($cancelResponse.gamCancelled)" -ForegroundColor Cyan
    Write-Host "   Local desactivado: $($cancelResponse.localDeactivated)`n" -ForegroundColor Magenta
    
} catch {
    Write-Host "   ❌ Error en cancelación:" -ForegroundColor Red
    $errorMsg = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "   $($errorMsg.error)" -ForegroundColor Red
    if ($errorMsg.code) {
        Write-Host "   Código: $($errorMsg.code)" -ForegroundColor Yellow
    }
    Write-Host ""
}

# 5. LOGOUT
Write-Host "5️⃣  Cerrando sesión GAM..." -ForegroundColor Green
try {
    $logoutResponse = Invoke-RestMethod -Uri 'http://localhost:3000/gam/logout' -Method POST -Headers @{
        'Authorization' = "Bearer $gamToken"
    }
    
    Write-Host "   ✅ Logout exitoso" -ForegroundColor Green
    Write-Host "   Tipo: $($logoutResponse.authType)" -ForegroundColor Yellow
    Write-Host "   Mensaje: $($logoutResponse.message)`n" -ForegroundColor Cyan
    
} catch {
    Write-Host "   ❌ Error en logout:" -ForegroundColor Red
    Write-Host "   $($_.ErrorDetails.Message)`n" -ForegroundColor Red
}

# 6. VERIFICAR TOKEN REVOCADO
Write-Host "6️⃣  Verificando que token fue revocado..." -ForegroundColor Green
try {
    $meResponse2 = Invoke-RestMethod -Uri 'http://localhost:3000/auth/me' -Method GET -Headers @{
        'Authorization' = "Bearer $gamToken"
    }
    
    Write-Host "   ❌ ERROR: Token aún válido (debería estar revocado)" -ForegroundColor Red
    
} catch {
    Write-Host "   ✅ Token correctamente revocado" -ForegroundColor Green
    Write-Host "   Respuesta: 401 Unauthorized`n" -ForegroundColor Yellow
}

Write-Host "=== TEST COMPLETADO ===" -ForegroundColor Cyan
