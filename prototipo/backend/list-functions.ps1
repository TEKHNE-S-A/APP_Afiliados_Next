#!/usr/bin/env pwsh
# Listar todas las funciones reactivar_usuario en PostgreSQL

Write-Host ""
Write-Host "=== LISTAR FUNCIONES SQL ===" -ForegroundColor Cyan

# Login
$loginBody = @{ username = "admin"; password = "admin123" } | ConvertTo-Json
$loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $loginResponse.token
$headers = @{ Authorization = "Bearer $token" }

Write-Host "Token: OK" -ForegroundColor Green
Write-Host ""
Write-Host "SOLUCION: Ejecutar manualmente en PostgreSQL:" -ForegroundColor Yellow
Write-Host ""
Write-Host "-- 1. Eliminar TODAS las versiones de las funciones"
Write-Host "DROP FUNCTION IF EXISTS desactivar_usuario(VARCHAR, TEXT) CASCADE;" -ForegroundColor Cyan
Write-Host "DROP FUNCTION IF EXISTS reactivar_usuario(VARCHAR) CASCADE;" -ForegroundColor Cyan
Write-Host ""
Write-Host "-- 2. Luego ejecutar script recreate-function nuevamente"
Write-Host ""
Write-Host "Si no tienes acceso a psql, usa pgAdmin o DBeaver" -ForegroundColor Gray
Write-Host ""

# Alternativa: Forzar eliminación con parámetro explícito
Write-Host "ALTERNATIVA: Voy a intentar con firma completa..." -ForegroundColor Yellow
Write-Host ""

# Crear endpoint simple para DROP específico
$dropBody = @{
  function_name = "reactivar_usuario"
  param_types = "VARCHAR"
} | ConvertTo-Json

Write-Host "Por limitaciones de PostgreSQL, debes ejecutar manualmente en BD:" -ForegroundColor Red
Write-Host "  DROP FUNCTION reactivar_usuario CASCADE;" -ForegroundColor Red
Write-Host "  DROP FUNCTION desactivar_usuario CASCADE;" -ForegroundColor Red
Write-Host ""
Write-Host "Luego ejecuta: POST /admin/debug/recreate-function" -ForegroundColor Green
Write-Host ""

Write-Host "=== FIN ===" -ForegroundColor Cyan
