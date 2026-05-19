#!/usr/bin/env pwsh
# Test llamada directa a función SQL desactivar_usuario

Write-Host ""
Write-Host "=== TEST FUNCION SQL desactivar_usuario() ===" -ForegroundColor Cyan

# Login
$loginBody = @{ username = "admin"; password = "admin123" } | ConvertTo-Json
$loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $loginResponse.token
Write-Host "Token: OK" -ForegroundColor Green

# Headers
$headers = @{ Authorization = "Bearer $token" }

# Test función SQL
Write-Host ""
Write-Host "Llamando endpoint test..." -ForegroundColor Yellow
$testBody = @{ nuusuid = "0000000000000000000000000000000000000023" } | ConvertTo-Json

try {
  $testResponse = Invoke-RestMethod -Uri "http://localhost:3000/admin/debug/test-desactivar-function" -Method POST -Body $testBody -ContentType "application/json" -Headers $headers
  
  Write-Host ""
  Write-Host "USUARIO ANTES:" -ForegroundColor Cyan
  Write-Host "  Email: $($testResponse.user_before.nuusumail)"
  Write-Host "  nuusuactiv: [$($testResponse.user_before.nuusuactiv)]"
  Write-Host "  Length: $($testResponse.user_before.len_activ)"
  Write-Host "  ASCII: $($testResponse.user_before.ascii_activ)"
  
  Write-Host ""
  Write-Host "RESULTADO FUNCION SQL:" -ForegroundColor Cyan
  Write-Host "  success: $($testResponse.function_result.success)" -ForegroundColor $(if ($testResponse.function_result.success) { "Green" } else { "Red" })
  Write-Host "  message: $($testResponse.function_result.message)"
  Write-Host "  usuario_id: $($testResponse.function_result.usuario_id)"
  Write-Host "  email: $($testResponse.function_result.email)"
  if ($testResponse.function_result.fecha_desactivacion) {
    Write-Host "  fecha_desactivacion: $($testResponse.function_result.fecha_desactivacion)"
  }
  
  Write-Host ""
  Write-Host "TEST INFO:" -ForegroundColor Cyan
  $testResponse.test_info | Format-List
  
} catch {
  Write-Host ""
  Write-Host "ERROR en test" -ForegroundColor Red
  Write-Host $_ -ForegroundColor Red
}

Write-Host ""
Write-Host "=== FIN TEST ===" -ForegroundColor Cyan
