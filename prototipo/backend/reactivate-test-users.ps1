#!/usr/bin/env pwsh
# Reactivar usuarios de test

Write-Host ""
Write-Host "=== REACTIVAR USUARIOS DE TEST ===" -ForegroundColor Cyan

# Login
$loginBody = @{ username = "admin"; password = "admin123" } | ConvertTo-Json
$loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $loginResponse.token
$headers = @{ Authorization = "Bearer $token" }

Write-Host "Token: OK" -ForegroundColor Green

# Usuario 1: 0000000000000000000000000000000000000023
Write-Host ""
Write-Host "Reactivando usuario 023..." -ForegroundColor Yellow
$body1 = @{ nuusuid = "0000000000000000000000000000000000000023" } | ConvertTo-Json

try {
  $r1 = Invoke-RestMethod -Uri "http://localhost:3000/admin/user/reactivate" -Method POST -Body $body1 -ContentType "application/json" -Headers $headers
  Write-Host "OK - $($r1.message)" -ForegroundColor Green
} catch {
  Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Usuario 2: 0000000000000000000000000000000000000024
Write-Host ""
Write-Host "Reactivando usuario 024..." -ForegroundColor Yellow
$body2 = @{ nuusuid = "0000000000000000000000000000000000000024" } | ConvertTo-Json

try {
  $r2 = Invoke-RestMethod -Uri "http://localhost:3000/admin/user/reactivate" -Method POST -Body $body2 -ContentType "application/json" -Headers $headers
  Write-Host "OK - $($r2.message)" -ForegroundColor Green
} catch {
  Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== FIN ===" -ForegroundColor Cyan
