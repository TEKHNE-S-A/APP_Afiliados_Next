# Test completo del endpoint POST /sia/crear-solicitud
# Prueba el flujo completo: BD + SIA con payload completo

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST: Crear Solicitud de Autorización Completa" -ForegroundColor Cyan
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
    $credenciales = $loginResponse.credenciales
    
    Write-Host "✅ Login exitoso" -ForegroundColor Green
    Write-Host "   Token: $($token.Substring(0, 20))..." -ForegroundColor Gray
    Write-Host "   nuusuid: $nuusuid" -ForegroundColor Gray
    Write-Host "   Credenciales en grupo: $($credenciales.Count)" -ForegroundColor Gray
    
    # Usar primera credencial como afiliadoId
    $afiliadoId = $credenciales[0].afiliadoId
    Write-Host "   AfiliadoId para solicitud: $afiliadoId" -ForegroundColor Gray
    
} catch {
    Write-Host "❌ Error en login: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Paso 2: Cargar coberturas disponibles
Write-Host "`nPaso 2: Cargando coberturas disponibles..." -ForegroundColor Yellow

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    $coberturasResponse = Invoke-RestMethod -Uri "http://localhost:3000/sia/prestaciones" `
        -Method Post `
        -Headers $headers `
        -Body "{}"
    
    Write-Host "✅ Coberturas cargadas: $($coberturasResponse.data.Count)" -ForegroundColor Green
    
    # Usar primera cobertura
    $cobertura = $coberturasResponse.data[0].nombre
    Write-Host "   Cobertura seleccionada: $cobertura" -ForegroundColor Gray
    
} catch {
    Write-Host "⚠️  No se pudieron cargar coberturas, usando valor por defecto" -ForegroundColor Yellow
    $cobertura = "Consulta médica"
}

# Paso 3: Crear imagen de prueba en base64 (1x1 pixel PNG rojo)
Write-Host "`nPaso 3: Generando imágenes de prueba..." -ForegroundColor Yellow

# PNG 1x1 rojo válido
$foto1Base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
$foto2Base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEBgIApD5fRAAAAABJRU5ErkJggg=="

Write-Host "✅ Fotos de prueba generadas" -ForegroundColor Green
Write-Host "   Foto 1: $($foto1Base64.Length) caracteres" -ForegroundColor Gray
Write-Host "   Foto 2: $($foto2Base64.Length) caracteres" -ForegroundColor Gray

# Paso 4: Crear solicitud
Write-Host "`nPaso 4: Creando solicitud de autorización..." -ForegroundColor Yellow

$solicitudBody = @{
    afiliadoId = $afiliadoId
    cobertura = $cobertura
    referencia = "Test solicitud completa - $(Get-Date -Format 'HH:mm:ss')"
    texto = "Solicitud de prueba con payload completo incluyendo todos los campos requeridos por REC_SOLICITUDES_APP"
    profesional = "Dr. Test Sistema"
    foto1Base64 = $foto1Base64
    foto2Base64 = $foto2Base64
} | ConvertTo-Json

Write-Host "`nBody del request:" -ForegroundColor Cyan
Write-Host "  afiliadoId: $afiliadoId" -ForegroundColor Gray
Write-Host "  cobertura: $cobertura" -ForegroundColor Gray
Write-Host "  referencia: Test solicitud completa..." -ForegroundColor Gray
Write-Host "  profesional: Dr. Test Sistema" -ForegroundColor Gray
Write-Host "  fotos: 2 adjuntas" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/sia/crear-solicitud" `
        -Method Post `
        -Headers $headers `
        -Body $solicitudBody
    
    Write-Host "`n✅ Solicitud creada exitosamente:" -ForegroundColor Green
    Write-Host "   Solicitud ID: $($response.data.solicitudId)" -ForegroundColor White
    Write-Host "   Fecha: $($response.data.fechaSolicitud)" -ForegroundColor Gray
    Write-Host "   Estado: $($response.data.estado)" -ForegroundColor Gray
    Write-Host "   Fotos adjuntas: $($response.data.fotosAdjuntas)" -ForegroundColor Gray
    
    Write-Host "`n📋 Respuesta completa:" -ForegroundColor Cyan
    Write-Host ($response | ConvertTo-Json -Depth 10) -ForegroundColor White
    
    # Paso 5: Verificar en BD
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "Verificación en Base de Datos" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    
    $solicitudId = $response.data.solicitudId
    
    Write-Host "`nPara verificar la solicitud en PostgreSQL:" -ForegroundColor Yellow
    Write-Host "  SELECT * FROM ausolici WHERE ausolicid = '$solicitudId'" -ForegroundColor Gray
    Write-Host "  SELECT ausolicid, ausolfotid FROM ausoaufo WHERE ausolicid = '$solicitudId'" -ForegroundColor Gray
    
} catch {
    Write-Host "`n❌ Error al crear solicitud:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        Write-Host "`nDetalles del error:" -ForegroundColor Yellow
        Write-Host $_.ErrorDetails.Message -ForegroundColor Gray
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Revisar logs del backend para ver:" -ForegroundColor Yellow
Write-Host "  1. INSERT en tabla ausolici" -ForegroundColor Gray
Write-Host "  2. INSERT en tabla ausoaufo (2 fotos)" -ForegroundColor Gray
Write-Host "  3. COMMIT de transacción" -ForegroundColor Gray
Write-Host "  4. Payload completo enviado a SIA" -ForegroundColor Gray
Write-Host "  5. Respuesta del servicio REC_SOLICITUDES_APP" -ForegroundColor Gray
Write-Host "========================================`n" -ForegroundColor Cyan
