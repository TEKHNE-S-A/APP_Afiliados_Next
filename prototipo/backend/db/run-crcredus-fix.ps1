#!/usr/bin/env pwsh
$ErrorActionPreference = "Stop"

Write-Host "Aplicando fix a crcredus.nuusuid..." -ForegroundColor Cyan

$config = Get-Content "$PSScriptRoot\..\config.json" | ConvertFrom-Json
$db = $config.database

$env:PGPASSWORD = $db.password

$query = @"
BEGIN;
ALTER TABLE crcredus ALTER COLUMN nuusuid TYPE VARCHAR(100);
COMMENT ON COLUMN crcredus.nuusuid IS 'FK a nuusuari.nuusuid - soporta UserID de GAM (VARCHAR 100)';
COMMIT;
SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name = 'crcredus' AND column_name = 'nuusuid';
"@

try {
    $pgPath = 'C:\Program Files\PostgreSQL\16\bin\psql.exe'
    if (-not (Test-Path $pgPath)) {
        $pgPath = 'C:\Program Files\PostgreSQL\15\bin\psql.exe'
    }
    if (-not (Test-Path $pgPath)) {
        $pgPath = 'psql'
    }
    
    $result = & $pgPath -h $db.host -p $db.port -U $db.user -d $db.database -c $query
    Write-Host $result
    Write-Host ""
    Write-Host "[OK] Fix aplicado exitosamente" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Error: $_" -ForegroundColor Red
    exit 1
}
