#!/usr/bin/env pwsh
# Recrear función desactivar_usuario (FIX)

Write-Host ""
Write-Host "=== RECREAR FUNCION desactivar_usuario() ===" -ForegroundColor Cyan

# Login
$loginBody = @{ username = "admin"; password = "admin123" } | ConvertTo-Json
$loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $loginResponse.token
Write-Host "Token: OK" -ForegroundColor Green

# Headers
$headers = @{ Authorization = "Bearer $token" }

# Recrear función
Write-Host ""
Write-Host "Recreando función..." -ForegroundColor Yellow

try {
  $recreateResponse = Invoke-RestMethod -Uri "http://localhost:3000/admin/debug/recreate-function" -Method POST -Body "{}" -ContentType "application/json" -Headers $headers
  
  Write-Host ""
  Write-Host "OK - FUNCION RECREADA" -ForegroundColor Green
  Write-Host "  message: $($recreateResponse.message)"
  
  Write-Host ""
  Write-Host "TEST AUTOMATICO DE LA FUNCION:" -ForegroundColor Cyan
  Write-Host "  success: $($recreateResponse.test_result.success)" -ForegroundColor $(if ($recreateResponse.test_result.success) { "Green" } else { "Red" })
  Write-Host "  message: $($recreateResponse.test_result.message)"
  Write-Host "  usuario_id: $($recreateResponse.test_result.usuario_id)"
  Write-Host "  email: $($recreateResponse.test_result.email)"
  if ($recreateResponse.test_result.fecha_desactivacion) {
    Write-Host "  fecha_desactivacion: $($recreateResponse.test_result.fecha_desactivacion)"
  }
  
  if ($recreateResponse.test_result.success) {
    Write-Host ""
    Write-Host "SUCCESS - La función ahora funciona correctamente!" -ForegroundColor Green
    Write-Host "El usuario fue desactivado exitosamente en el test" -ForegroundColor Green
    Write-Host ""
    Write-Host "NOTA: El usuario de test ahora está DESACTIVADO" -ForegroundColor Yellow
    Write-Host "Puedes reactivarlo con: POST /admin/user/reactivate" -ForegroundColor Yellow
  }
  
} catch {
  Write-Host ""
  Write-Host "ERROR recreando función" -ForegroundColor Red
  Write-Host $_ -ForegroundColor Red
}

Write-Host ""
Write-Host "=== FIN ===" -ForegroundColor Cyan
