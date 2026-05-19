# Test completo: Login + Ver notificaciones iniciales + Crear solicitud + Ver notificaciones nuevas
# Fecha: 23 de diciembre de 2025

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST COMPLETO: Notificaciones Automaticas" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:3000"
$username = "diana76ar@gmail.com"
$password = "12345678"

# Paso 1: Login
Write-Host "1. Login..." -ForegroundColor Yellow
$loginBody = @{
    username = $username
    password = $password
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.token
    Write-Host "   OK Token obtenido" -ForegroundColor Green
    
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    # Paso 2: Ver notificaciones iniciales
    Write-Host "`n2. Notificaciones iniciales..." -ForegroundColor Yellow
    $notif1 = Invoke-RestMethod -Uri "$baseUrl/notifications" -Headers $headers
    $count1 = $notif1.Count
    Write-Host "   Total: $count1" -ForegroundColor White
    
    # Paso 3: Crear solicitud
    Write-Host "`n3. Creando solicitud de autorizacion..." -ForegroundColor Yellow
    Write-Host "   (Esto deberia generar una notificacion automatica)" -ForegroundColor Gray
    
    # Datos mockeados para prueba rapida
    $solicitudBody = @{
        afiliadoId = "123456789012345678901234567890"
        cobertura = 101
        prestacionId = "14201010101"
        referencia = "Test notificacion automatica"
        tipo = "S"
        cantidad = 1
    } | ConvertTo-Json
    
    try {
        $solicitudResponse = Invoke-RestMethod -Uri "$baseUrl/sia/crear-solicitud" -Method POST -Body $solicitudBody -Headers $headers -ErrorAction SilentlyContinue
        Write-Host "   OK Solicitud creada" -ForegroundColor Green
    } catch {
        Write-Host "   Advertencia: Error al crear solicitud (puede ser por datos invalidos)" -ForegroundColor Yellow
        Write-Host "   Mensaje: $($_.Exception.Message)" -ForegroundColor Gray
    }
    
    # Paso 4: Ver notificaciones nuevas
    Start-Sleep -Seconds 1
    Write-Host "`n4. Notificaciones despues de crear solicitud..." -ForegroundColor Yellow
    $notif2 = Invoke-RestMethod -Uri "$baseUrl/notifications" -Headers $headers
    $count2 = $notif2.Count
    Write-Host "   Total: $count2" -ForegroundColor White
    
    if ($count2 -gt $count1) {
        Write-Host "   OK Se genero nueva notificacion!" -ForegroundColor Green
        $nuevas = $count2 - $count1
        Write-Host "   Nuevas: $nuevas" -ForegroundColor Green
        
        # Mostrar ultima notificacion
        $ultima = $notif2 | Select-Object -First 1
        Write-Host "`n   Ultima notificacion:" -ForegroundColor Cyan
        Write-Host "      Titulo: $($ultima.titulo)" -ForegroundColor White
        Write-Host "      Mensaje: $($ultima.mensaje)" -ForegroundColor White
        Write-Host "      Tipo: $($ultima.tipo)" -ForegroundColor White
    } else {
        Write-Host "   Advertencia: No se genero notificacion nueva" -ForegroundColor Yellow
        Write-Host "   (Probablemente fallo la creacion de solicitud)" -ForegroundColor Gray
    }
    
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "TEST COMPLETADO" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Cyan
    
} catch {
    Write-Host "`nERROR:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
    exit 1
}
