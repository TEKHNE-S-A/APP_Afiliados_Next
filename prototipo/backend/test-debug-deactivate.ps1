#!/usr/bin/env pwsh
# Test diagnóstico para endpoint desactivar

Write-Host ""
Write-Host "=== TEST DEBUG DESACTIVAR USUARIO ===" -ForegroundColor Cyan

# Login
Write-Host ""
Write-Host "PASO 1: Login admin..." -ForegroundColor Yellow
$loginBody = @{
  username = "admin"
  password = "admin123"
} | ConvertTo-Json

try {
  $loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
  
  $token = $loginResponse.token
  Write-Host "OK - Token obtenido" -ForegroundColor Green
} catch {
  Write-Host "ERROR en login" -ForegroundColor Red
  Write-Host $_ -ForegroundColor Red
  exit 1
}

# Headers para requests autenticados
$headers = @{
  Authorization = "Bearer $token"
}

# Verificar usuario antes
Write-Host ""
Write-Host "PASO 2: Verificar usuario ANTES..." -ForegroundColor Yellow
$nuusuid = "0000000000000000000000000000000000000023"

try {
  $userBefore = Invoke-RestMethod -Uri "http://localhost:3000/admin/users/$nuusuid" -Method GET -Headers $headers
  
  Write-Host "Email: $($userBefore.user.nuusumail)" -ForegroundColor White
  Write-Host "nuusuactiv: [$($userBefore.user.nuusuactiv)]" -ForegroundColor White
  Write-Host "Estado: $($userBefore.user.estado)" -ForegroundColor White
  Write-Host "Length nuusuid: $($nuusuid.Length)" -ForegroundColor Gray
} catch {
  Write-Host "ERROR verificando usuario" -ForegroundColor Red
  Write-Host $_ -ForegroundColor Red
  exit 1
}

# Intentar desactivar
Write-Host ""
Write-Host "PASO 3: Intentar desactivar..." -ForegroundColor Yellow
$deactivateBody = @{
  nuusuid = $nuusuid
  motivo = "Test debug desactivacion"
} | ConvertTo-Json

Write-Host "JSON enviado:" -ForegroundColor Gray
Write-Host $deactivateBody -ForegroundColor Gray

try {
  $deactivateResponse = Invoke-RestMethod -Uri "http://localhost:3000/admin/user/deactivate" -Method POST -Body $deactivateBody -ContentType "application/json" -Headers $headers
  
  Write-Host ""
  Write-Host "OK - DESACTIVACION EXITOSA" -ForegroundColor Green
  Write-Host "Respuesta:" -ForegroundColor White
  $deactivateResponse | ConvertTo-Json -Depth 3 | Write-Host
  
} catch {
  Write-Host ""
  Write-Host "ERROR - DESACTIVACION FALLO" -ForegroundColor Red
  Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
  
  # Leer body del error
  $errorStream = $_.Exception.Response.GetResponseStream()
  $reader = New-Object System.IO.StreamReader($errorStream)
  $errorBody = $reader.ReadToEnd()
  $reader.Close()
  
  Write-Host "Error body:" -ForegroundColor Red
  Write-Host $errorBody -ForegroundColor Red
  
  # Parsear JSON error si es posible
  try {
    $errorJson = $errorBody | ConvertFrom-Json
    Write-Host ""
    Write-Host "Detalles error:" -ForegroundColor Yellow
    Write-Host "  error: $($errorJson.error)" -ForegroundColor White
    Write-Host "  code: $($errorJson.code)" -ForegroundColor White
    if ($errorJson.details) {
      Write-Host "  details: $($errorJson.details)" -ForegroundColor White
    }
  } catch {
    # No es JSON, mostrar como está
  }
}

Write-Host ""
Write-Host "=== FIN TEST ===" -ForegroundColor Cyan
