#!/usr/bin/env pwsh
# Test simple del panel

Write-Host "Testing Planes Panel"
Write-Host "==================`n"

# 1. Obtener token
Write-Host "[1] Obteniendo token..."
$loginResp = Invoke-WebRequest -Uri http://localhost:3000/admin/login `
  -Method POST `
  -Headers @{'Content-Type'='application/json'} `
  -Body (@{username='admin@test.local';password='admin123'} | ConvertTo-Json)

$loginData = $loginResp.Content | ConvertFrom-Json
$token = $loginData.token

Write-Host "Token OK: $($token.Substring(0,20))..."

# 2. Obtener planes
Write-Host "`n[2] Obteniendo planes..."
$planesResp = Invoke-WebRequest -Uri http://localhost:3000/admin/planes `
  -Method GET `
  -Headers @{'Authorization'="Bearer $token"}

$planesData = $planesResp.Content | ConvertFrom-Json
Write-Host "Planes: $($planesData.planes.Count)"
$planesData.planes | ForEach-Object {
  Write-Host "  Plan $($_.id): $($_.descripcion)"
}

# 3. Abrir navegador
Write-Host "`n[3] Abriendo navegador..."
Start-Process "http://localhost:3000/admin/planes-ui"

Write-Host "`nInstrucciones:"
Write-Host "1. Login: admin@test.local / admin123"
Write-Host "2. Abre F12 Console"
Write-Host "3. Click en boton Editar Imagen"
Write-Host "4. Mira los alerts y consolelogs"
