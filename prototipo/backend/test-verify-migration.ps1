#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Suite de pruebas para verify-user-migration
.DESCRIPTION
    Ejecuta verificaciones con diferentes tipos de usuarios para validar el script
#>

Write-Host "`n╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║        TEST SUITE - Verificación de Migración de Usuarios     ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$tests = @(
    @{
        Name = "Usuario GAM migrado - con credenciales"
        Email = "nuevo@test.com"
        Expected = "GAM (GUID)"
    },
    @{
        Name = "Usuario GAM con grupo familiar"
        Email = "nuevo2@test.com"
        Expected = "GAM (GUID)"
    },
    @{
        Name = "Usuario LEGACY - admin backend"
        Email = "admin@osep.gob.ar"
        Expected = "LEGACY"
    }
)

$passed = 0
$failed = 0

foreach ($test in $tests) {
    Write-Host "══════════════════════════════════════════════════════════════════" -ForegroundColor Yellow
    Write-Host "TEST: $($test.Name)" -ForegroundColor Yellow
    Write-Host "Email: $($test.Email)" -ForegroundColor Yellow
    Write-Host "══════════════════════════════════════════════════════════════════" -ForegroundColor Yellow
    Write-Host ""
    
    # Ejecutar verificación
    node verify-user-migration.js $test.Email
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ PASSED: $($test.Name)" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "`n❌ FAILED: $($test.Name)" -ForegroundColor Red
        $failed++
    }
    
    Write-Host ""
    Start-Sleep -Seconds 1
}

# Resumen
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                      RESUMEN DE PRUEBAS                        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "Total tests: $($tests.Count)" -ForegroundColor White
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })

if ($failed -eq 0) {
    Write-Host "`n✅ TODAS LAS PRUEBAS PASARON`n" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n❌ ALGUNAS PRUEBAS FALLARON`n" -ForegroundColor Red
    exit 1
}
