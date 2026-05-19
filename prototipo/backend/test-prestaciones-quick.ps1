# Test rápido de prestaciones
$baseUrl = "http://localhost:3000"

Write-Host "🧪 Test REC_PRESTACIONES_APP" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Gray
Write-Host ""

try {
    Write-Host "📤 Enviando POST /sia/prestaciones..." -ForegroundColor White
    
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    $body = @{} | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/sia/prestaciones" `
                                   -Method Post `
                                   -Headers $headers `
                                   -Body $body `
                                   -TimeoutSec 30
    
    Write-Host "✅ Respuesta recibida" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Resultado:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 10 | Write-Host -ForegroundColor White
    
    if ($response.success -and $response.prestaciones) {
        Write-Host ""
        Write-Host "📋 Prestaciones (primeras 10):" -ForegroundColor Cyan
        $response.prestaciones | Select-Object -First 10 | ForEach-Object {
            Write-Host "   ID: $($_.AULPresID) - $($_.AULPresDescripcion)" -ForegroundColor White
        }
        Write-Host ""
        Write-Host "Total: $($response.total) prestaciones" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "⚠️ No se recibieron prestaciones" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host ""
    Write-Host "❌ Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        Write-Host ""
        Write-Host "Detalle:" -ForegroundColor Yellow
        try {
            $errorObj = $_.ErrorDetails.Message | ConvertFrom-Json
            $errorObj | ConvertTo-Json -Depth 5 | Write-Host -ForegroundColor Yellow
        } catch {
            Write-Host $_.ErrorDetails.Message -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "================================" -ForegroundColor Gray
