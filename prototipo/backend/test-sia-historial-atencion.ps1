# Test del servicio HISTORIAL_ATENCION_APP
# Requiere usuario autenticado para obtener AfiliadoId

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST: HISTORIAL_ATENCION_APP (GET /sia/historial-atencion)" -ForegroundColor Cyan
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

# Paso 2: Llamar al servicio HISTORIAL_ATENCION_APP
Write-Host "`nPaso 2: Llamando a HISTORIAL_ATENCION_APP..." -ForegroundColor Yellow

$headers = @{
    "Authorization" = "Bearer $token"
}

# Parámetros de consulta
$params = @{
    DesdeFecha = "2025-01-01"
    HastaFecha = "2025-07-01"
    Pagina = 1
    RegistrosXPagina = 4
}

Write-Host "`nParámetros de consulta:" -ForegroundColor Cyan
Write-Host "  DesdeFecha: $($params.DesdeFecha) (formato YYYY-MM-DD)" -ForegroundColor Gray
Write-Host "  HastaFecha: $($params.HastaFecha) (formato YYYY-MM-DD)" -ForegroundColor Gray
Write-Host "  Pagina: $($params.Pagina)" -ForegroundColor Gray
Write-Host "  RegistrosXPagina: $($params.RegistrosXPagina)" -ForegroundColor Gray
Write-Host "`nNota: AfiliadoId se obtiene automáticamente del usuario autenticado: $afiliadoId" -ForegroundColor Cyan

try {
    $queryString = "DesdeFecha=$($params.DesdeFecha)&HastaFecha=$($params.HastaFecha)&Pagina=$($params.Pagina)&RegistrosXPagina=$($params.RegistrosXPagina)"
    $uri = "http://localhost:3000/sia/historial-atencion?$queryString"
    
    $response = Invoke-RestMethod -Uri $uri `
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
