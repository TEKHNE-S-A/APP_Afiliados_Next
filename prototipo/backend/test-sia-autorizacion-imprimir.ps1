# Test del servicio AUTORIZACION_IMPRIMIR
# Requiere usuario autenticado para obtener NUUsuAfiliadoID

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST: AUTORIZACION_IMPRIMIR (POST /sia/autorizacion-imprimir)" -ForegroundColor Cyan
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
    $nuusuid = $loginResponse.user.nuusuid
    
    Write-Host "✅ Login exitoso" -ForegroundColor Green
    Write-Host "   Token: $($token.Substring(0, 20))..." -ForegroundColor Gray
    Write-Host "   nuusuid (NUUsuAfiliadoID): $nuusuid" -ForegroundColor Gray
    
} catch {
    Write-Host "❌ Error en login: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Paso 2: Llamar al servicio AUTORIZACION_IMPRIMIR
Write-Host "`nPaso 2: Llamando a AUTORIZACION_IMPRIMIR..." -ForegroundColor Yellow

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$body = @{
    DelegacionNumero = 1
    AutorizacionNumero = 7211
} | ConvertTo-Json

Write-Host "`nBody del request:" -ForegroundColor Cyan
Write-Host $body -ForegroundColor Gray
Write-Host "`nNota: NUUsuAfiliadoID se obtiene automáticamente del usuario autenticado (nuusuid: $nuusuid)" -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/sia/autorizacion-imprimir" `
        -Method Post `
        -Headers $headers `
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
Write-Host "========================================`n" -ForegroundColor Cyan
