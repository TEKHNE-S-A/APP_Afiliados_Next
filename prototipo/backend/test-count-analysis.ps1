#!/usr/bin/env pwsh
# Test verificación query COUNT en función

Write-Host ""
Write-Host "=== TEST QUERY COUNT FUNCION ===" -ForegroundColor Cyan

# Login
$loginBody = @{ username = "admin"; password = "admin123" } | ConvertTo-Json
$loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $loginResponse.token
$headers = @{ Authorization = "Bearer $token" }

# Endpoint para ejecutar query directa
$checkBody = @{
  nuusuid = "0000000000000000000000000000000000000023"
  query = @"
SELECT 
  COUNT(*) as count_N,
  (SELECT COUNT(*) FROM nuusuari WHERE nuusuid = '0000000000000000000000000000000000000023') as count_total,
  (SELECT COUNT(*) FROM nuusuari WHERE nuusuid = '0000000000000000000000000000000000000023' AND nuusuactiv = 'S') as count_S,
  (SELECT COUNT(*) FROM nuusuari WHERE nuusuid = '0000000000000000000000000000000000000023' AND nuusuactiv = 'N') as count_N_check
FROM nuusuari
WHERE nuusuid = '0000000000000000000000000000000000000023'
  AND nuusuactiv = 'N'
"@
} | ConvertTo-Json -Depth 3

Write-Host "Test directo en BD..." -ForegroundColor Yellow
Write-Host ""

# Por ahora voy a simular con curl o crear endpoint específico
# Vamos a usar un enfoque diferente: crear un mini endpoint de query genérica

Write-Host "VERIFICACION:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Usuario: 0000000000000000000000000000000000000023"
Write-Host "- Tiene nuusuactiv = 'S' (confirmado)"
Write-Host "- Función dice: 'Usuario ya está desactivado'"
Write-Host ""
Write-Host "HIPOTESIS: La función está verificando:" -ForegroundColor Yellow
Write-Host "  WHERE nuusuid = p_nuusuid AND nuusuactiv = 'N'"
Write-Host ""
Write-Host "Si nuusuactiv = 'S', entonces COUNT debería ser 0"
Write-Host "Pero la función está entrando en el IF (v_count > 0)"
Write-Host ""
Write-Host "POSIBLES CAUSAS:" -ForegroundColor Red
Write-Host "1. Problema de tipos: ¿p_nuusuid es VARCHAR(100) pero nuusuid en tabla tiene espacios?"
Write-Host "2. Problema de escape: ¿El parámetro $1 no está matcheando correctamente?"
Write-Host "3. Función obsoleta: ¿El código de la función en BD es diferente al que vimos?"
Write-Host ""
Write-Host "SIGUIENTE PASO: Verificar código real de la función en PostgreSQL" -ForegroundColor Green
Write-Host ""

Write-Host "=== FIN TEST ===" -ForegroundColor Cyan
