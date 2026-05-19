# Reiniciar backend con logs visibles
$ErrorActionPreference = "Stop"
$backendDir = "E:\MisProyectos\appmovil\APP_Afiliados\backend"

Write-Host "`n=== Reiniciando Backend con Logs ===" -ForegroundColor Cyan

# 1. Matar proceso en puerto 3000
$proc = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | 
        Select-Object -ExpandProperty OwningProcess | 
        Select-Object -Unique

if ($proc) {
    Write-Host "Matando proceso $proc en puerto 3000..." -ForegroundColor Yellow
    Stop-Process -Id $proc -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# 2. Iniciar backend
Write-Host "Iniciando backend con logs visibles..." -ForegroundColor Green
Write-Host "CTRL+C para detener`n" -ForegroundColor Yellow

Set-Location $backendDir
node server-soap.js
