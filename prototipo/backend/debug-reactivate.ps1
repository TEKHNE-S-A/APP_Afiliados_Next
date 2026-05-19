#!/usr/bin/env pwsh
# Debug reactivación

$loginBody = @{ username = "admin"; password = "admin123" } | ConvertTo-Json
$loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $loginResponse.token
$headers = @{ Authorization = "Bearer $token" }

$body = @{ nuusuid = "0000000000000000000000000000000000000023" } | ConvertTo-Json

Write-Host "Enviando reactivación..." -ForegroundColor Yellow
Write-Host "Body: $body"
Write-Host ""

try {
  $r = Invoke-RestMethod -Uri "http://localhost:3000/admin/user/reactivate" -Method POST -Body $body -ContentType "application/json" -Headers $headers
  Write-Host "Exito:" -ForegroundColor Green
  $r | ConvertTo-Json
} catch {
  Write-Host "Error:" -ForegroundColor Red
  $errorStream = $_.Exception.Response.GetResponseStream()
  $reader = New-Object System.IO.StreamReader($errorStream)
  $errorBody = $reader.ReadToEnd()
  Write-Host $errorBody -ForegroundColor Red
}
