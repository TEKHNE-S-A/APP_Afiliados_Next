# Test del servicio AUDETALLE_CONSUMO_APP
# Requiere NumeroDelegacion y NumeroAutorizacion

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST: AUDETALLE_CONSUMO_APP (GET /sia/detalle-consumo)" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Llamando a AUDETALLE_CONSUMO_APP..." -ForegroundColor Yellow

# Parámetros de consulta
$params = @{
    NumeroDelegacion = 1
    NumeroAutorizacion = 7211
}

Write-Host "`nParámetros de consulta:" -ForegroundColor Cyan
Write-Host "  NumeroDelegacion: $($params.NumeroDelegacion)" -ForegroundColor Gray
Write-Host "  NumeroAutorizacion: $($params.NumeroAutorizacion)" -ForegroundColor Gray

try {
    $queryString = "NumeroDelegacion=$($params.NumeroDelegacion)&NumeroAutorizacion=$($params.NumeroAutorizacion)"
    $uri = "http://localhost:3000/sia/detalle-consumo?$queryString"
    
    $response = Invoke-RestMethod -Uri $uri -Method Get
    
    Write-Host "`n✅ Respuesta exitosa:" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 10) -ForegroundColor White
    
} catch {
    Write-Host "`n❌ Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        Write-Host "`nDetalles del error:" -ForegroundColor Yellow
        Write-Host $_.ErrorDetails.Message -ForegroundColor Gray
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Revisar logs del backend para ver el XML SOAP generado" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan
