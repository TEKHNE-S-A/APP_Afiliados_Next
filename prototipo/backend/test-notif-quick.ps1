# Test rápido de notificaciones con usuario existente

$baseUrl = "http://localhost:3000"
$testUser = "nuevo@test.com"
$testPassword = "123456"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST NOTIFICACIONES - PRUEBA RÁPIDA" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 1. LOGIN
Write-Host "1. LOGIN..." -NoNewline
$loginBody = @{
    username = $testUser
    password = $testPassword
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.token
    Write-Host " OK" -ForegroundColor Green
    Write-Host "   Token: $($token.Substring(0, 30))..." -ForegroundColor Gray
} catch {
    Write-Host " FAIL" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# 2. LISTAR NOTIFICACIONES
Write-Host "`n2. LISTAR NOTIFICACIONES..." -NoNewline
try {
    $listResponse = Invoke-RestMethod -Uri "$baseUrl/notifications" -Method Get -Headers $headers
    $count = $listResponse.notifications.Count
    Write-Host " OK" -ForegroundColor Green
    Write-Host "   Total: $count notificaciones" -ForegroundColor Gray
    
    if ($count -gt 0) {
        $listResponse.notifications[0..([math]::Min(2, $count-1))] | ForEach-Object {
            $icon = if ($_.leida) { "[X]" } else { "[ ]" }
            Write-Host "   $icon [$($_.tipo)] $($_.titulo)" -ForegroundColor $(if ($_.leida) { "Gray" } else { "White" })
        }
    }
} catch {
    Write-Host " FAIL" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
}

# 3. CONTAR NO LEÍDAS
Write-Host "`n3. CONTAR NO LEÍDAS..." -NoNewline
try {
    $countResponse = Invoke-RestMethod -Uri "$baseUrl/notifications/unread-count" -Method Get -Headers $headers
    Write-Host " OK" -ForegroundColor Green
    Write-Host "   No leídas: $($countResponse.unreadCount)" -ForegroundColor Gray
} catch {
    Write-Host " FAIL" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
}

# 4. FILTRAR POR TIPO "autorizacion"
Write-Host "`n4. FILTRAR POR TIPO (autorizacion)..." -NoNewline
try {
    $filterResponse = Invoke-RestMethod -Uri "$baseUrl/notifications?tipo=autorizacion" -Method Get -Headers $headers
    Write-Host " OK" -ForegroundColor Green
    Write-Host "   Encontradas: $($filterResponse.notifications.Count)" -ForegroundColor Gray
} catch {
    Write-Host " FAIL" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
}

# 5. FILTRAR SOLO NO LEÍDAS
Write-Host "`n5. FILTRAR SOLO NO LEÍDAS..." -NoNewline
try {
    $unreadResponse = Invoke-RestMethod -Uri "$baseUrl/notifications?leida=false" -Method Get -Headers $headers
    Write-Host " OK" -ForegroundColor Green
    Write-Host "   No leídas: $($unreadResponse.notifications.Count)" -ForegroundColor Gray
} catch {
    Write-Host " FAIL" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
}

# 6. MARCAR COMO LEÍDA (primera no leída)
Write-Host "`n6. MARCAR COMO LEÍDA..." -NoNewline
try {
    $unreadNotif = $unreadResponse.notifications[0]
    if ($unreadNotif) {
        $markReadResponse = Invoke-RestMethod -Uri "$baseUrl/notifications/$($unreadNotif.id)/mark-read" -Method Put -Headers $headers
        Write-Host " OK" -ForegroundColor Green
        Write-Host "   Marcada: $($unreadNotif.titulo)" -ForegroundColor Gray
    } else {
        Write-Host " SKIP (no hay notificaciones no leídas)" -ForegroundColor Yellow
    }
} catch {
    Write-Host " FAIL" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
}

# 7. MARK ALL AS READ
Write-Host "`n7. MARCAR TODAS COMO LEÍDAS..." -NoNewline
try {
    $markAllResponse = Invoke-RestMethod -Uri "$baseUrl/notifications/mark-all-read" -Method Post -Headers $headers
    Write-Host " OK" -ForegroundColor Green
    Write-Host "   Actualizadas: $($markAllResponse.updatedCount)" -ForegroundColor Gray
} catch {
    Write-Host " FAIL" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
}

# 8. VERIFICAR QUE TODAS ESTÁN LEÍDAS
Write-Host "`n8. VERIFICAR TODAS LEÍDAS..." -NoNewline
try {
    $finalCount = Invoke-RestMethod -Uri "$baseUrl/notifications/unread-count" -Method Get -Headers $headers
    if ($finalCount.unreadCount -eq 0) {
        Write-Host " OK" -ForegroundColor Green
        Write-Host "   No leídas: $($finalCount.unreadCount)" -ForegroundColor Gray
    } else {
        Write-Host " ATENCION" -ForegroundColor Yellow
        Write-Host "   Aún quedan $($finalCount.unreadCount) no leídas" -ForegroundColor Yellow
    }
} catch {
    Write-Host " FAIL" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "PRUEBA COMPLETADA" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan
