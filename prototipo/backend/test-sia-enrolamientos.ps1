# Test del servicio SIA ENROLAMIENTOS
# Ejemplo: NroInternoPersona='63', Fecha='12/12/2025'

$ErrorActionPreference = "Stop"

Write-Host "`n=== Test Servicio SIA: ENROLAMIENTOS ===" -ForegroundColor Cyan

$body = @{
    NroInternoPersona = "63"
    Fecha = "12/12/2025"
} | ConvertTo-Json

Write-Host "`nBody enviado:" -ForegroundColor Yellow
Write-Host $body -ForegroundColor Gray

Write-Host "`nEnviando request a http://localhost:3000/sia/enrolamientos..." -ForegroundColor Green

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/sia/enrolamientos" `
        -Method Post `
        -ContentType "application/json" `
        -Body $body `
        -TimeoutSec 30
    
    Write-Host "`n✅ Respuesta recibida:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10 | Write-Host
    
    if ($response.success) {
        Write-Host "`n✅ Servicio ejecutado exitosamente" -ForegroundColor Green
    } else {
        Write-Host "`n⚠️  Servicio respondió pero con error" -ForegroundColor Yellow
    }
} catch {
    Write-Host "`n❌ Error en request:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "`nResponse body:" -ForegroundColor Yellow
        Write-Host $responseBody -ForegroundColor Gray
    }
    exit 1
}

Write-Host "`n=== Verificar logs del backend para ver XML SOAP generado ===" -ForegroundColor Cyan
Write-Host "Buscar en consola: 📤 SOAP SIA REQUEST XML" -ForegroundColor Yellow
