Write-Host "Aplicando migracion: agregar columna nuusugamrefresh"

$env:PGPASSWORD = "ignacio11"

# Ejecutar SQL
$result = psql -h localhost -U postgres -d app_afiliados_genexus -f "db/add_refresh_token_column.sql" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "Migracion aplicada exitosamente"
    Write-Host $result
} else {
    Write-Host "Error aplicando migracion"
    Write-Host $result
    exit 1
}

Write-Host ""
Write-Host "Columna nuusugamrefresh agregada a la tabla nuusuari"
