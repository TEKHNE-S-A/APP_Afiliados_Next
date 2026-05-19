# Test del servicio COSEGUROS_PENDIENTES_APP
# Requiere usuario autenticado para obtener AfiliadoId

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST: COSEGUROS_PENDIENTES_APP (GET /sia/coseguros-pendientes)" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Paso 1: Login para obtener token
Write-Host "Paso 1: Login de usuario..." -ForegroundColor Yellow
$loginBody = @{
    username = "marianr@tekhne.com.ar"
    password = "123456"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/auth/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body $loginBody
    
    $token = $loginResponse.token
    $afiliadoId = $loginResponse.user.nuusaafili
    
    Write-Host "✅ Login exitoso" -ForegroundColor Green
    Write-Host "   Token: $($token.Substring(0, 20))..." -ForegroundColor Gray
    Write-Host "   AfiliadoId: $afiliadoId" -ForegroundColor Gray
    
} catch {
    Write-Host "❌ Error en login: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Paso 2: Llamar al servicio COSEGUROS_PENDIENTES_APP
Write-Host "`nPaso 2: Llamando a COSEGUROS_PENDIENTES_APP..." -ForegroundColor Yellow

$headers = @{
    "Authorization" = "Bearer $token"
}

Write-Host "`nNota: AfiliadoId se obtiene automáticamente del usuario autenticado: $afiliadoId" -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/sia/coseguros-pendientes" `
        -Method Get `
        -Headers $headers
    
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
