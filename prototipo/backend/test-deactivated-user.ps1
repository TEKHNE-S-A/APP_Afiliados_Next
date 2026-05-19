#!/usr/bin/env pwsh
# Test validaciones de usuarios desactivados

Write-Host "`n=== TEST VALIDACIONES USUARIO DESACTIVADO ===" -ForegroundColor Cyan

$testEmail = "marianr@tekhne.com.ar"

# 1. Desactivar usuario
Write-Host "`n1. Desactivando usuario de prueba..." -ForegroundColor Green
node reactivate-user.js
$null = node -e "const db = require('./db/connection'); db.query('UPDATE nuusuari SET nuusubajaf = NOW() WHERE nuusumail = ''$testEmail''').then(() => process.exit(0));"
Write-Host "   Usuario desactivado: $testEmail`n" -ForegroundColor Yellow

# 2. Test recuperación contraseña
Write-Host "2. TEST: Recuperacion de contrasena..." -ForegroundColor Green

$recoveryBody = @{email = $testEmail} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri 'http://localhost:3000/gam/password-recovery' -Method POST -Body $recoveryBody -ContentType 'application/json' | Out-Null
    Write-Host "   FALLO: Deberia haber bloqueado" -ForegroundColor Red
} catch {
    $err = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($err.error -eq 'Usuario desactivado') {
        Write-Host "   CORRECTO: Bloqueado (403 - Usuario desactivado)" -ForegroundColor Green
    } else {
        Write-Host "   Error: $($err.error)" -ForegroundColor Red
    }
}

# 3. Test registro
Write-Host "`n3. TEST: Registro con email desactivado..." -ForegroundColor Green

$registerBody = @{
    email = $testEmail
    password = "TestPass123!@#"
    firstName = "Test"
    lastName = "User"
    nroAfiliado = "20-12028238-8"
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri 'http://localhost:3000/gam/register' -Method POST -Body $registerBody -ContentType 'application/json' | Out-Null
    Write-Host "   FALLO: Deberia haber bloqueado" -ForegroundColor Red
} catch {
    $err = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($err.code -eq 'USER_DEACTIVATED') {
        Write-Host "   CORRECTO: Bloqueado (403 - USER_DEACTIVATED)" -ForegroundColor Green
    } else {
        Write-Host "   Respuesta: $($err.code)" -ForegroundColor Yellow
    }
}

# 4. Reactivar
Write-Host "`n4. Reactivando usuario..." -ForegroundColor Green
node reactivate-user.js

Write-Host "`n=== TEST COMPLETADO ===" -ForegroundColor Cyan
