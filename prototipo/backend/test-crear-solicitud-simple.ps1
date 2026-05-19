# Test simplificado del endpoint POST /sia/crear-solicitud

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST: Crear Solicitud de Autorizacion Completa" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Login
Write-Host "Paso 1: Login de usuario..." -ForegroundColor Yellow
$loginBody = @{
    username = "hj@gmail.com"
    password = "12345678"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/auth/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body $loginBody
    
    $token = $loginResponse.token
    $credenciales = $loginResponse.credenciales
    
    Write-Host "OK - Login exitoso" -ForegroundColor Green
    Write-Host "  Token: $($token.Substring(0, 20))..." -ForegroundColor Gray
    Write-Host "  Credenciales: $($credenciales.Count)" -ForegroundColor Gray
    
    $afiliadoId = $credenciales[0].afiliadoId
    Write-Host "  AfiliadoId: $afiliadoId" -ForegroundColor Gray
    
} catch {
    Write-Host "ERROR en login: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Cargar coberturas
Write-Host "`nPaso 2: Cargando coberturas..." -ForegroundColor Yellow

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    $coberturasResponse = Invoke-RestMethod -Uri "http://localhost:3000/sia/prestaciones" `
        -Method Post `
        -Headers $headers `
        -Body "{}"
    
    $cobertura = $coberturasResponse.data[0].nombre
    Write-Host "OK - Coberturas cargadas" -ForegroundColor Green
    Write-Host "  Cobertura: $cobertura" -ForegroundColor Gray
    
} catch {
    $cobertura = "Consulta medica"
    Write-Host "OK - Usando cobertura por defecto" -ForegroundColor Yellow
}

# Fotos de prueba (PNG 1x1 pixel)
Write-Host "`nPaso 3: Generando fotos de prueba..." -ForegroundColor Yellow
$foto1Base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
$foto2Base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEBgIApD5fRAAAAABJRU5ErkJggg=="
Write-Host "OK - Fotos generadas" -ForegroundColor Green

# Crear solicitud
Write-Host "`nPaso 4: Creando solicitud..." -ForegroundColor Yellow

$timestamp = Get-Date -Format 'HH:mm:ss'
$solicitudBody = @{
    afiliadoId = $afiliadoId
    cobertura = $cobertura
    referencia = "Test solicitud completa - $timestamp"
    texto = "Solicitud de prueba con payload completo REC_SOLICITUDES_APP"
    profesional = "Dr. Test Sistema"
    foto1Base64 = $foto1Base64
    foto2Base64 = $foto2Base64
} | ConvertTo-Json

Write-Host "  AfiliadoId: $afiliadoId" -ForegroundColor Gray
Write-Host "  Cobertura: $cobertura" -ForegroundColor Gray
Write-Host "  Fotos: 2" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/sia/crear-solicitud" `
        -Method Post `
        -Headers $headers `
        -Body $solicitudBody
    
    Write-Host "`nOK - Solicitud creada exitosamente" -ForegroundColor Green
    Write-Host "  Solicitud ID: $($response.data.solicitudId)" -ForegroundColor White
    Write-Host "  Fecha: $($response.data.fechaSolicitud)" -ForegroundColor Gray
    Write-Host "  Estado: $($response.data.estado)" -ForegroundColor Gray
    Write-Host "  Fotos: $($response.data.fotosAdjuntas)" -ForegroundColor Gray
    
    Write-Host "`nRespuesta completa:" -ForegroundColor Cyan
    Write-Host ($response | ConvertTo-Json -Depth 10) -ForegroundColor White
    
} catch {
    Write-Host "`nERROR al crear solicitud:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        Write-Host "`nDetalles:" -ForegroundColor Yellow
        Write-Host $_.ErrorDetails.Message -ForegroundColor Gray
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Revisar logs del backend para ver el payload completo" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan
