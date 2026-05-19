$baseUrl = "http://localhost:3000"

Write-Host "Test REC_PRESTACIONES_APP" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Gray

try {
    Write-Host "Enviando POST /sia/prestaciones..." -ForegroundColor White
    
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    $body = "{}"
    
    $response = Invoke-RestMethod -Uri "$baseUrl/sia/prestaciones" -Method Post -Headers $headers -Body $body -TimeoutSec 30
    
    Write-Host "Respuesta recibida" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10 | Write-Host
    
    if ($response.success) {
        Write-Host "Total prestaciones: $($response.total)" -ForegroundColor Green
        $response.prestaciones | Select-Object -First 5 | ForEach-Object {
            Write-Host "ID: $($_.AULPresID) - $($_.AULPresDescripcion)"
        }
    } else {
        Write-Host "No se recibieron prestaciones" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}
