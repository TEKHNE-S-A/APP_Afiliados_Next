# Test rápido API Notificaciones con YAML
# Ejecutar: .\test-notif-yaml-quick.ps1

$baseUrl = "http://localhost:3000"
$ErrorActionPreference = "Stop"

Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "  🧪 TEST API NOTIFICACIONES YAML" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

try {
    # 1. Login para obtener token
    Write-Host "`n1️⃣ Haciendo login..." -NoNewline
    
    $loginBody = @"
username: marianr@tekhne.com.ar
password: "123456"
"@
    
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" `
        -Method Post `
        -ContentType "application/yaml" `
        -Body $loginBody `
        -ErrorAction Stop
    
    $token = $loginResponse.token
    Write-Host " ✅" -ForegroundColor Green
    Write-Host "   Token: $($token.Substring(0, 20))..." -ForegroundColor Gray
    
    # 2. Enviar notificación con YAML
    Write-Host "`n2️⃣ Enviando notificación YAML..." -NoNewline
    
    $notifBodyYaml = @"
nuusuid: "0000000000000000000000000000000000000024"
tipo: general
titulo: Test YAML desde PowerShell
mensaje: Esta notificación fue enviada usando formato YAML exitosamente.
metadata:
  test: true
  formato: YAML
  timestamp: $(Get-Date -Format "o")
"@
    
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/yaml"
        "Accept" = "application/yaml"
    }
    
    $response = Invoke-RestMethod -Uri "$baseUrl/api/notifications/send" `
        -Method Post `
        -Headers $headers `
        -Body $notifBodyYaml `
        -ErrorAction Stop
    
    Write-Host " ✅" -ForegroundColor Green
    
    # 3. Mostrar resultados
    Write-Host "`n📬 NOTIFICACIÓN CREADA:" -ForegroundColor Cyan
    Write-Host "   ID:     $($response.notification.id)" -ForegroundColor White
    Write-Host "   Tipo:   $($response.notification.tipo)" -ForegroundColor White
    Write-Host "   Título: $($response.notification.titulo)" -ForegroundColor White
    Write-Host "   Fecha:  $($response.notification.fecha_creacion)" -ForegroundColor Gray
    
    Write-Host "`n✅ TEST EXITOSO - Formato YAML funcionando correctamente" -ForegroundColor Green
    
} catch {
    Write-Host " ❌" -ForegroundColor Red
    Write-Host "`n❌ ERROR:" -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Yellow
    
    if ($_.ErrorDetails.Message) {
        Write-Host "`n   Detalles:" -ForegroundColor Yellow
        Write-Host "   $($_.ErrorDetails.Message)" -ForegroundColor Gray
    }
    
    Write-Host "`n💡 TIP: Verifica que el backend esté corriendo en puerto 3000" -ForegroundColor Cyan
    exit 1
}

Write-Host "`n=====================================" -ForegroundColor Cyan
