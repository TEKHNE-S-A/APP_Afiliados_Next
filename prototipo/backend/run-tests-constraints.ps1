#!/usr/bin/env pwsh
# Script simple: Test Constraints de Integridad

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "🧪 Test Constraints de Integridad" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Ejecutar el script SQL
Write-Host "`n⏳ Ejecutando tests SQL..." -ForegroundColor Yellow
Write-Host "   Ubicación: test-constraints-integridad.sql" -ForegroundColor Gray

psql -h localhost -p 5432 -U postgres -d app_afiliados_genexus -f test-constraints-integridad.sql

Write-Host "`n" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "✅ Tests completados" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "`nInterpretación de resultados:" -ForegroundColor Yellow
Write-Host "  • TEST 1-2: Deben mostrar ERROR (violates unique constraint)" -ForegroundColor Green
Write-Host "  • TEST 3-4: Deben mostrar '0' en count_after (cascade funcionó)" -ForegroundColor Green

