# Script para registrar usuario de prueba en el backend
# Uso: .\register-test-user.ps1

$ErrorActionPreference = "Stop"

$registerUrl = "http://localhost:3000/register"
$loginUrl = "http://localhost:3000/auth/login"

# Datos del usuario de prueba
$userData = @{
    cuil = "20288787655"
    dni = "28878765"
    password = "123456"
    confirm = "123456"
    email = "test@test.com"
    fechaNacimiento = "1985-05-15"
    sexo = "M"
    cantidadIntegrantes = 3
} | ConvertTo-Json

Write-Host "`n=== REGISTRANDO USUARIO DE PRUEBA ===" -ForegroundColor Cyan
Write-Host "CUIL: 20288787655" -ForegroundColor Yellow
Write-Host "Password: 123456" -ForegroundColor Yellow
Write-Host "Email: test@test.com`n" -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri $registerUrl -Method POST -Body $userData -ContentType "application/json" -TimeoutSec 30
    Write-Host "✅ Usuario registrado exitosamente" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 5)
    
    # Intentar login
    Write-Host "`n=== PROBANDO LOGIN ===" -ForegroundColor Cyan
    $loginData = @{
        username = "20288787655"
        password = "123456"
    } | ConvertTo-Json
    
    $loginResponse = Invoke-RestMethod -Uri $loginUrl -Method POST -Body $loginData -ContentType "application/json" -TimeoutSec 120
    Write-Host "✅ Login exitoso" -ForegroundColor Green
    Write-Host "Token: $($loginResponse.token)" -ForegroundColor Green
    Write-Host "Credenciales sincronizadas: $($loginResponse.credenciales.Count)" -ForegroundColor Green
    Write-Host "Stats: +$($loginResponse.sync.inserted) ↻$($loginResponse.sync.updated) =$($loginResponse.sync.unchanged)" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host "Detalles: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
    }
    exit 1
}

Write-Host "`n✅ Usuario listo para usar en la app mobile!" -ForegroundColor Green
Write-Host "Username: 20288787655" -ForegroundColor Cyan
Write-Host "Password: 123456`n" -ForegroundColor Cyan
