#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Verifica que un usuario migrado a GAM tenga todos sus datos actualizados en todas las tablas

.DESCRIPTION
    Este script ejecuta una verificación completa de la migración de un usuario,
    revisando que el nuusuid (GUID de GAM) esté correctamente actualizado en:
    - nuusuari (tabla principal)
    - nuusuauth (autenticación)
    - crcredus (relación usuario-credenciales)
    - crcreden (datos de credenciales del grupo familiar)
    - notifications (notificaciones)
    - push_tokens (tokens de notificaciones push)

.PARAMETER Email
    Email del usuario a verificar

.EXAMPLE
    .\verify-user-migration.ps1 nuevo@test.com
    Verifica la migración del usuario especificado
#>

param(
    [Parameter(Position = 0, Mandatory = $true)]
    [string]$Email
)

# Cambiar al directorio del script
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $scriptPath

try {
    # Verificar que exista el archivo JS
    if (-not (Test-Path "verify-user-migration.js")) {
        Write-Host "Error: No se encontró verify-user-migration.js" -ForegroundColor Red
        exit 1
    }
    
    # Ejecutar el script de Node.js
    node verify-user-migration.js $Email
    
    $exitCode = $LASTEXITCODE
    exit $exitCode
    
} catch {
    Write-Host "Error inesperado: $_" -ForegroundColor Red
    exit 1
} finally {
    Pop-Location
}
