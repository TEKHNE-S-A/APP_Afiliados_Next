# Verificar sincronización de autorizaciones en BD

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Verificación de Sincronización" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$nuusuid = "79ddf82f-0960-466d-ade6-27c9678c2eef"

Write-Host "Usuario: $nuusuid" -ForegroundColor Yellow
Write-Host ""

# Conectar a PostgreSQL
$env:PGPASSWORD = "admin"
$query = "SELECT COUNT(*) as total, MAX(ausolfecal) as ultima_fecha FROM ausolici WHERE nuusuid = '$nuusuid'"

Write-Host "Consultando tabla ausolici..." -ForegroundColor Gray
$result = & psql -U postgres -d app_afiliados_genexus -h localhost -p 5432 -t -c $query

if ($LASTEXITCODE -eq 0) {
    Write-Host "Registros encontrados:" -ForegroundColor Green
    Write-Host $result
    Write-Host ""
    
    # Detalle de registros
    $detailQuery = "SELECT ausolicid, ausoldescr, ausoltipo, ausolestad, ausolfecal FROM ausolici WHERE nuusuid = '$nuusuid' ORDER BY ausolfecal DESC LIMIT 5"
    Write-Host "Últimas 5 autorizaciones:" -ForegroundColor Cyan
    & psql -U postgres -d app_afiliados_genexus -h localhost -p 5432 -c $detailQuery
} else {
    Write-Host "Error consultando BD" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
