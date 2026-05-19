param(
    [switch]$InstallPm2,
    [switch]$Startup,
    [switch]$Restart,
    [string]$AppName = 'app-afiliados-backend'
)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

if (!(Test-Path '.\logs')) {
    New-Item -ItemType Directory -Path '.\logs' | Out-Null
}

if ($InstallPm2) {
    npm install -g pm2
}

if (!(Get-Command pm2 -ErrorAction SilentlyContinue)) {
    throw 'pm2 no encontrado. Ejecutar con -InstallPm2 o instalarlo globalmente.'
}

if ($Restart) {
    pm2 restart $AppName
} else {
    pm2 start .\ecosystem.config.js --only $AppName
}

pm2 save

if ($Startup) {
    pm2 startup
}

Write-Host "PM2 configurado para $AppName" -ForegroundColor Green
Write-Host "Estado:" -ForegroundColor Cyan
pm2 status $AppName
