#!/usr/bin/env pwsh
# Debug endpoint reactivate con logs en tiempo real

Write-Host ""
Write-Host "=== DEBUG CON LOGS ===" -ForegroundColor Cyan
Write-Host ""

# Paso 1: Matar proceso en puerto 3000
Write-Host "1. Matando proceso en puerto 3000..." -ForegroundColor Yellow
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | 
  Select-Object -ExpandProperty OwningProcess | 
  ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }

Start-Sleep -Milliseconds 500
Write-Host "   OK" -ForegroundColor Green

# Paso 2: Iniciar backend en background con logs
Write-Host ""
Write-Host "2. Iniciando backend en background..." -ForegroundColor Yellow

$job = Start-Job -ScriptBlock {
  Set-Location $using:PSScriptRoot
  node server-soap.js 2>&1
}

# Esperar a que el servidor esté listo
Write-Host "   Esperando servidor..." -ForegroundColor Gray
$maxWait = 10
$waited = 0
$ready = $false

while ($waited -lt $maxWait -and -not $ready) {
  Start-Sleep -Milliseconds 500
  $waited++
  
  try {
    $health = Invoke-RestMethod -Uri "http://localhost:3000/health" -ErrorAction SilentlyContinue
    if ($health.status -eq "ok") {
      $ready = $true
      Write-Host "   OK - Backend listo" -ForegroundColor Green
    }
  } catch {
    # Ignorar, seguir esperando
  }
}

if (-not $ready) {
  Write-Host "   ERROR - Backend no respondió" -ForegroundColor Red
  Stop-Job $job
  Remove-Job $job
  exit 1
}

# Paso 3: Ejecutar test
Write-Host ""
Write-Host "3. Ejecutando test reactivación..." -ForegroundColor Yellow
Write-Host ""

# Login
$loginBody = @{ username = "admin"; password = "admin123" } | ConvertTo-Json
try {
  $loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
  $token = $loginResponse.token
  Write-Host "   Login: OK" -ForegroundColor Green
} catch {
  Write-Host "   Login: ERROR" -ForegroundColor Red
  Write-Host $_ -ForegroundColor Red
  Stop-Job $job
  Remove-Job $job
  exit 1
}

# Reactivar usuario
$headers = @{ Authorization = "Bearer $token" }
$body = @{ nuusuid = "0000000000000000000000000000000000000023" } | ConvertTo-Json

Write-Host ""
Write-Host "   Enviando POST /admin/user/reactivate..." -ForegroundColor White
Write-Host "   Body: $body" -ForegroundColor Gray
Write-Host ""

Start-Sleep -Milliseconds 100

try {
  $response = Invoke-RestMethod -Uri "http://localhost:3000/admin/user/reactivate" -Method POST -Body $body -ContentType "application/json" -Headers $headers
  
  Write-Host ""
  Write-Host "   SUCCESS" -ForegroundColor Green
  Write-Host "   Response:" -ForegroundColor White
  $response | ConvertTo-Json | Write-Host
  
} catch {
  Write-Host ""
  Write-Host "   ERROR RESPONSE" -ForegroundColor Red
  Write-Host "   Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
  
  $errorStream = $_.Exception.Response.GetResponseStream()
  $reader = New-Object System.IO.StreamReader($errorStream)
  $errorBody = $reader.ReadToEnd()
  $reader.Close()
  
  Write-Host "   Body: $errorBody" -ForegroundColor Red
}

# Paso 4: Mostrar logs del backend
Write-Host ""
Write-Host "4. LOGS BACKEND:" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

Start-Sleep -Milliseconds 200

# Obtener output del job
$logs = Receive-Job $job

# Filtrar solo los logs relevantes (últimos relacionados con reactivate)
$logs | Select-Object -Last 50 | ForEach-Object {
  if ($_ -match "reactivate|reactivación|req.body|req.user|req.session|ERROR|error") {
    Write-Host $_ -ForegroundColor Yellow
  } else {
    Write-Host $_ -ForegroundColor Gray
  }
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan

# Paso 5: Cleanup
Write-Host ""
Write-Host "5. Limpieza..." -ForegroundColor Yellow
Stop-Job $job -ErrorAction SilentlyContinue
Remove-Job $job -ErrorAction SilentlyContinue

Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | 
  Select-Object -ExpandProperty OwningProcess | 
  ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }

Write-Host "   OK" -ForegroundColor Green

Write-Host ""
Write-Host "=== FIN ===" -ForegroundColor Cyan
