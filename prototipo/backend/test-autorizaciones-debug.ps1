# Test directo de /mis-autorizaciones con logs completos

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TEST: /mis-autorizaciones con logs" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3000"

# Login
Write-Host "1. Login..." -ForegroundColor Yellow
$loginBody = @{
    username = "hj@gmail.com"
    password = "123456"
} | ConvertTo-Json

try {
    $loginResp = Invoke-WebRequest -Uri "$baseUrl/gam/login" -Method POST -Body $loginBody -ContentType "application/json" -UseBasicParsing
    $loginData = $loginResp.Content | ConvertFrom-Json
    $token = $loginData.access_token
    Write-Host "   Token obtenido: $($token.Substring(0,20))..." -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "Error en login: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Llamar a mis-autorizaciones
Write-Host "2. GET /mis-autorizaciones..." -ForegroundColor Yellow
Write-Host "   Esperando respuesta..." -ForegroundColor Gray

try {
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    
    $response = Invoke-WebRequest -Uri "$baseUrl/mis-autorizaciones" -Method GET -Headers $headers -UseBasicParsing
    $data = $response.Content | ConvertFrom-Json
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  RESPUESTA DEL ENDPOINT" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "success: $($data.success)" -ForegroundColor White
    Write-Host "total: $($data.total)" -ForegroundColor White
    Write-Host "sincronizado: $($data.sincronizado)" -ForegroundColor White
    Write-Host ""
    
    if ($data.autorizaciones -and $data.autorizaciones.Count -gt 0) {
        Write-Host "Autorizaciones ($($data.autorizaciones.Count)):" -ForegroundColor Cyan
        $data.autorizaciones | ForEach-Object {
            Write-Host "  - ID: $($_.ausolicid), Tipo: $($_.tipo), Estado: $($_.estado)" -ForegroundColor White
        }
    } else {
        Write-Host "⚠️  Array de autorizaciones VACIO" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  AHORA MIRA LOS LOGS DEL BACKEND" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Busca estas líneas:" -ForegroundColor Gray
    Write-Host "  📦 Tipo de payload: ..." -ForegroundColor Gray
    Write-Host "  📦 Es array: ..." -ForegroundColor Gray
    Write-Host "  📦 Payload raw: ..." -ForegroundColor Gray
    Write-Host "  ✅ X autorizaciones obtenidas desde SIA" -ForegroundColor Gray
    Write-Host ""
    
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host "Detalles: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    exit 1
}

Write-Host ""
Write-Host "COPIA Y PEGA LOS LOGS DEL BACKEND AQUI" -ForegroundColor Yellow
