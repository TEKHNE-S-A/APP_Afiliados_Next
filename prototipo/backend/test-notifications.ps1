# Test de API de Notificaciones
# Fecha: 23 de diciembre de 2025

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST: API de Notificaciones" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:3000"

# Paso 1: Login
Write-Host "1. Login como diana76ar@gmail.com..." -ForegroundColor Yellow
$loginBody = @{
    username = "diana76ar@gmail.com"
    password = "12345678"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.token
    Write-Host "   OK Token obtenido" -ForegroundColor Green
    
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    # Paso 2: Listar notificaciones
    Write-Host "`n2. Listar notificaciones..." -ForegroundColor Yellow
    $notifications = Invoke-RestMethod -Uri "$baseUrl/notifications" -Method GET -Headers $headers
    Write-Host "   Total de notificaciones: $($notifications.Count)" -ForegroundColor White
    
    if ($notifications.Count -gt 0) {
        $unread = ($notifications | Where-Object { -not $_.leida }).Count
        Write-Host "   No leidas: $unread" -ForegroundColor White
        
        Write-Host "`n   Ultimas 3 notificaciones:" -ForegroundColor Cyan
        $notifications | Select-Object -First 3 | ForEach-Object {
            $status = if ($_.leida) { "[X] Leida" } else { "[ ] No leida" }
            Write-Host "      $status - $($_.titulo)" -ForegroundColor White
            Write-Host "        $($_.mensaje)" -ForegroundColor Gray
            Write-Host "        Fecha: $($_.fecha_creacion)" -ForegroundColor Gray
            Write-Host ""
        }
        
        # Paso 3: Marcar primera como leida
        $firstUnread = $notifications | Where-Object { -not $_.leida } | Select-Object -First 1
        if ($firstUnread) {
            Write-Host "3. Marcar notificacion como leida..." -ForegroundColor Yellow
            $markReadResponse = Invoke-RestMethod -Uri "$baseUrl/notifications/mark-read/$($firstUnread.id)" -Method POST -Headers $headers
            Write-Host "   OK $($markReadResponse.message)" -ForegroundColor Green
        } else {
            Write-Host "3. No hay notificaciones sin leer para marcar" -ForegroundColor Gray
        }
        
    } else {
        Write-Host "   No hay notificaciones" -ForegroundColor Gray
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
