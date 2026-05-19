# Test API Notificaciones con Basic Auth (GeneXus)
# Ejecutar: .\test-notif-basic-auth.ps1

$baseUrl = "http://localhost:3000"
$ErrorActionPreference = "Stop"

Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "  TEST BASIC AUTH - NOTIFICACIONES" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Credenciales Basic Auth (usuario admin configurado)
$username = "admin@test.local"
$password = "admin123"

# Construir Basic Auth header
$credenciales = "${username}:${password}"
$base64Auth = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($credenciales))

Write-Host "`n Credenciales:" -ForegroundColor Yellow
Write-Host "   Usuario: $username" -ForegroundColor Gray
Write-Host "   Basic Auth: $($base64Auth.Substring(0, 20))..." -ForegroundColor Gray

try {
    # Test 1: Enviar notificación con Basic Auth + YAML
    Write-Host "`n Enviando notificación con Basic Auth + YAML..." -NoNewline
    
    $timestamp = Get-Date -Format "o"
    $notifBodyYaml = @"
nuusuid: "0000000000000000000000000000000000000025"
tipo: general
titulo: Test Basic Auth desde PowerShell
mensaje: Esta notificacion fue enviada usando Basic Auth (GeneXus compatible) con formato YAML.
metadata:
  authType: BasicAuth
  formato: YAML
  timestamp: $timestamp
  usuario: $username
"@
    
    $headers = @{
        Authorization = "Basic $base64Auth"
        ContentType = "application/yaml"
        Accept = "application/yaml"
    }
    
    $response = Invoke-RestMethod -Uri "$baseUrl/api/notifications/send" -Method Post -Headers $headers -Body $notifBodyYaml -ContentType "application/yaml"
    
    Write-Host " OK" -ForegroundColor Green
    
    # Mostrar resultados
    Write-Host "`n NOTIFICACION CREADA:" -ForegroundColor Cyan
    Write-Host "   ID:     $($response.notification.id)" -ForegroundColor White
    Write-Host "   Tipo:   $($response.notification.tipo)" -ForegroundColor White
    Write-Host "   Titulo: $($response.notification.titulo)" -ForegroundColor White
    Write-Host "   Fecha:  $($response.notification.fecha_creacion)" -ForegroundColor Gray
    
    # Test 2: Enviar otra notificación (autorizacion)
    Write-Host "`n Enviando notificacion tipo 'autorizacion'..." -NoNewline
    
    $notifAuth = @"
nuusuid: "0000000000000000000000000000000000000025"
tipo: autorizacion
titulo: Autorizacion Aprobada
mensaje: Tu solicitud de autorizacion ha sido aprobada exitosamente.
metadata:
  autorizacionId: 99999
  prestacion: Consulta medica
  estado: APROBADA
"@
    
    $response2 = Invoke-RestMethod -Uri "$baseUrl/api/notifications/send" -Method Post -Headers $headers -Body $notifAuth -ContentType "application/yaml"
    
    Write-Host " OK" -ForegroundColor Green
    Write-Host "   ID: $($response2.notification.id)" -ForegroundColor White
    
    Write-Host "`n TESTS EXITOSOS - Basic Auth funcionando correctamente" -ForegroundColor Green
    Write-Host "`n GeneXus puede usar este mismo formato:" -ForegroundColor Cyan
    Write-Host "   Base64Token: $base64Auth" -ForegroundColor Gray
    
} catch {
    Write-Host " ERROR" -ForegroundColor Red
    Write-Host "`n ERROR:" -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Yellow
    
    if ($_.ErrorDetails.Message) {
        try {
            $errorDetail = $_.ErrorDetails.Message | ConvertFrom-Json
            Write-Host "`n   Codigo: $($errorDetail.error)" -ForegroundColor Yellow
            Write-Host "   Mensaje: $($errorDetail.message)" -ForegroundColor Gray
        } catch {
            Write-Host "`n   Detalles:" -ForegroundColor Yellow
            Write-Host "   $($_.ErrorDetails.Message)" -ForegroundColor Gray
        }
    }
    
    Write-Host "`n TIPS:" -ForegroundColor Cyan
    Write-Host "   - Verifica que el backend este corriendo en puerto 3000" -ForegroundColor Gray
    Write-Host "   - Verifica usuario/password: $username / $password" -ForegroundColor Gray
    Write-Host "   - Confirma que el usuario existe en la tabla nuusuari" -ForegroundColor Gray
    exit 1
}

Write-Host "`n=====================================" -ForegroundColor Cyan
