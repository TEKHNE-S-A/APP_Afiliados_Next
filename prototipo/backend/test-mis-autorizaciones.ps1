# Test GET /mis-autorizaciones - Endpoint con sincronización SOAP + BD
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  TEST: GET /mis-autorizaciones" -ForegroundColor Cyan
Write-Host "  Descripción: SOAP + BD Sync" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3000"

# PASO 1: Login para obtener token
Write-Host "📝 PASO 1: Login para obtener token..." -ForegroundColor Yellow
$loginBody = @{
    username = "marianr@tekhne.com.ar"
    password = "123456"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -SessionVariable session
    $token = $loginResponse.token
    Write-Host "✅ Login exitoso" -ForegroundColor Green
    Write-Host "   Token: $($token.Substring(0, 20))..." -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "❌ Error en login: $_" -ForegroundColor Red
    exit 1
}

# PASO 2: Llamar a /mis-autorizaciones
Write-Host "📋 PASO 2: GET /mis-autorizaciones..." -ForegroundColor Yellow
Write-Host "   URL: $baseUrl/mis-autorizaciones" -ForegroundColor Gray
Write-Host "   Headers: Authorization: Bearer [token]" -ForegroundColor Gray
Write-Host ""

try {
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    
    $response = Invoke-RestMethod -Uri "$baseUrl/mis-autorizaciones" -Method GET -Headers $headers
    
    Write-Host "✅ Respuesta recibida:" -ForegroundColor Green
    Write-Host "   success: $($response.success)" -ForegroundColor White
    Write-Host "   total: $($response.total)" -ForegroundColor White
    Write-Host "   sincronizado: $($response.sincronizado)" -ForegroundColor White
    Write-Host ""
    
    if ($response.autorizaciones -and $response.autorizaciones.Count -gt 0) {
        Write-Host "📄 Autorizaciones encontradas: $($response.autorizaciones.Count)" -ForegroundColor Cyan
        Write-Host ""
        
        $contador = 1
        foreach ($auth in $response.autorizaciones) {
            Write-Host "   [$contador] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkCyan
            Write-Host "   ID: $($auth.ausolicid)" -ForegroundColor White
            Write-Host "   Descripción: $($auth.descripcion)" -ForegroundColor White
            Write-Host "   Tipo: $($auth.tipo)" -ForegroundColor White
            Write-Host "   Estado: $($auth.estado)" -ForegroundColor White
            Write-Host "   Cantidad: $($auth.cantidad)" -ForegroundColor White
            Write-Host "   Fecha Alta: $($auth.fecha_alta)" -ForegroundColor White
            Write-Host "   Profesional: $($auth.profesional)" -ForegroundColor White
            Write-Host "   Nº Autorización: $($auth.autorizacion_numero)" -ForegroundColor White
            Write-Host "   Prestación ID: $($auth.tipo_prestacion_id)" -ForegroundColor White
            Write-Host ""
            $contador++
        }
    } else {
        Write-Host "ℹ️  No se encontraron autorizaciones" -ForegroundColor Yellow
    }
    
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
    Write-Host "✅ TEST COMPLETADO CON ÉXITO" -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Error en /mis-autorizaciones:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails) {
        $errorMsg = $_.ErrorDetails.Message
        Write-Host "Detalles: $errorMsg" -ForegroundColor Red
    }
    exit 1
}
