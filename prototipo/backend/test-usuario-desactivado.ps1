#!/usr/bin/env pwsh
# Test validaciones de usuarios desactivados

Write-Host "`n=== TEST VALIDACIONES USUARIO DESACTIVADO ===" -ForegroundColor Cyan

# 1. Crear usuario de prueba y desactivarlo
Write-Host "`n1️⃣  Preparando usuario de prueba desactivado..." -ForegroundColor Green

$testEmail = "usuario.desactivado@test.com"

# Verificar si existe
$checkQuery = "SELECT nuusuid, nuusumail, nuusubajaf FROM nuusuari WHERE nuusumail = '$testEmail'"
$existingUser = node -e "const db = require('./db/connection'); db.query(`"$checkQuery`").then(r => { if(r.rows[0]) console.log(JSON.stringify(r.rows[0])); process.exit(0); })"

if ($existingUser) {
    Write-Host "   Usuario ya existe en BD" -ForegroundColor Yellow
    $userData = $existingUser | ConvertFrom-Json
    Write-Host "   Email: $($userData.nuusumail)" -ForegroundColor Cyan
    Write-Host "   Desactivado: $($userData.nuusubajaf -ne $null)" -ForegroundColor $(if ($userData.nuusubajaf) { "Red" } else { "Green" })
    
    if (-not $userData.nuusubajaf) {
        Write-Host "   ⚠️  Desactivando usuario..." -ForegroundColor Yellow
        node -e "const db = require('./db/connection'); db.query(`"UPDATE nuusuari SET nuusubajaf = NOW() WHERE nuusumail = '$testEmail'`").then(() => { console.log('Usuario desactivado'); process.exit(0); })"
    }
} else {
    Write-Host "   ℹ️  Usuario no existe, usar marianr@tekhne.com.ar" -ForegroundColor Yellow
    $testEmail = "marianr@tekhne.com.ar"
    
    # Asegurar que está desactivado
    node -e "const db = require('./db/connection'); db.query(`"UPDATE nuusuari SET nuusubajaf = NOW() WHERE nuusumail = '$testEmail'`").then(() => { console.log('Usuario desactivado'); process.exit(0); })"
}

Write-Host "   ✅ Usuario de prueba: $testEmail" -ForegroundColor Green
Write-Host ""

# 2. Test: Recuperación de contraseña de usuario desactivado
Write-Host "2️⃣  TEST: Recuperación de contraseña (usuario desactivado)..." -ForegroundColor Green

$recoveryBody = @{
    email = $testEmail
} | ConvertTo-Json

try {
    $recoveryResponse = Invoke-RestMethod -Uri 'http://localhost:3000/gam/password-recovery' -Method POST -Body $recoveryBody -ContentType 'application/json'
    
    Write-Host "   ❌ ERROR: Debería haber bloqueado la recuperación" -ForegroundColor Red
    Write-Host "   Respuesta: $($recoveryResponse | ConvertTo-Json)" -ForegroundColor Yellow
    
} catch {
    $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
    
    if ($_.Exception.Response.StatusCode.value__ -eq 403 -and $errorDetails.error -eq 'Usuario desactivado') {
        Write-Host "   ✅ Recuperación correctamente bloqueada" -ForegroundColor Green
        Write-Host "   Mensaje: $($errorDetails.message)" -ForegroundColor Yellow
        Write-Host "   Fecha baja: $($errorDetails.fechaBaja)" -ForegroundColor Cyan
    } else {
        Write-Host "   ❌ Error inesperado:" -ForegroundColor Red
        Write-Host "   $($errorDetails | ConvertTo-Json)" -ForegroundColor Red
    }
}

Write-Host ""

# 3. Test: Registro con email de usuario desactivado
Write-Host "3️⃣  TEST: Registro con email desactivado..." -ForegroundColor Green

$registerBody = @{
    email = $testEmail
    password = "TestPass123!@#"
    firstName = "Usuario"
    lastName = "Desactivado"
    nroAfiliado = "20-12028238-8"
    documento = "12028238"
    cuil = "20120282388"
    sexo = "M"
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri 'http://localhost:3000/gam/register' -Method POST -Body $registerBody -ContentType 'application/json'
    
    Write-Host "   ❌ ERROR: Debería haber bloqueado el registro" -ForegroundColor Red
    Write-Host "   Respuesta: $($registerResponse | ConvertTo-Json)" -ForegroundColor Yellow
    
} catch {
    $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
    
    if ($_.Exception.Response.StatusCode.value__ -eq 403 -and $errorDetails.code -eq 'USER_DEACTIVATED') {
        Write-Host "   ✅ Registro correctamente bloqueado" -ForegroundColor Green
        Write-Host "   Mensaje: $($errorDetails.message)" -ForegroundColor Yellow
        Write-Host "   Código: $($errorDetails.code)" -ForegroundColor Cyan
    } else {
        Write-Host "   ❌ Error inesperado:" -ForegroundColor Red
        Write-Host "   $($errorDetails | ConvertTo-Json)" -ForegroundColor Red
    }
}

Write-Host ""

# 4. Test: Login con usuario desactivado
Write-Host "4️⃣  TEST: Login con usuario desactivado..." -ForegroundColor Green

$loginBody = @{
    username = $testEmail
    password = "12345678"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri 'http://localhost:3000/auth/login' -Method POST -Body $loginBody -ContentType 'application/json'
    
    Write-Host "   ❌ ERROR: Debería haber bloqueado el login" -ForegroundColor Red
    Write-Host "   Respuesta: $($loginResponse | ConvertTo-Json)" -ForegroundColor Yellow
    
} catch {
    Write-Host "   ✅ Login correctamente bloqueado" -ForegroundColor Green
    Write-Host "   Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Yellow
}

Write-Host ""

# 5. Reactivar usuario para no dejar BD inconsistente
Write-Host "5️⃣  Limpieza: Reactivando usuario..." -ForegroundColor Green
node -e "const db = require('./db/connection'); db.query(`"UPDATE nuusuari SET nuusubajaf = NULL WHERE nuusumail = '$testEmail'`").then(() => { console.log('   ✅ Usuario reactivado'); process.exit(0); })"

Write-Host "`n=== TEST COMPLETADO ===" -ForegroundColor Cyan
