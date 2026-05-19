# Test del servicio REC_PRESTACIONES_APP
# No requiere parámetros

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST: REC_PRESTACIONES_APP (POST /sia/prestaciones)" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Llamando a REC_PRESTACIONES_APP (sin parámetros)..." -ForegroundColor Yellow

$body = @{} | ConvertTo-Json

Write-Host "`nBody del request (vacío):" -ForegroundColor Cyan
Write-Host $body -ForegroundColor Gray
Write-Host "`nNota: Este servicio no requiere parámetros, el tag <Parametros> se envía vacío" -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/sia/prestaciones" `
        -Method Post `
        -ContentType "application/json" `
        -Body $body
    
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
Write-Host "El tag <Parametros> debe estar vacío: <com:Parametros></com:Parametros>" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan
