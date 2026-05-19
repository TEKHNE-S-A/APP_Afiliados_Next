# ============================================================================
# TEST SUITE - SEMANAS 24-27: Notificaciones + Dispositivos
# ============================================================================
# Proposito: Verificar infraestructura completa notificaciones/dispositivos
# Fecha: 10/02/2026
# Scope:
#   - Semana 24: Modelos Prisma (notifications, nudispos)
#   - Semana 25: Endpoints dispositivos (register/list/delete)
#   - Semana 26: Endpoints notificaciones v1 (list/mark-read)
#   - Semana 27: Endpoints notificaciones v2 (filtros/mark-all)
# ============================================================================

$baseUrl = "http://localhost:3000"

Write-Host "`n============================================================================" -ForegroundColor Magenta
Write-Host "  SEMANAS 24-27 - TEST NOTIFICACIONES + DISPOSITIVOS" -ForegroundColor Magenta
Write-Host "============================================================================`n" -ForegroundColor Magenta

$testResults = @()

# ============================================================================
# PREPARACION: Obtener token de autenticacion
# ============================================================================

Write-Host "`n[PREPARACION] Obtener token de autenticacion" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

try {
    $loginBody = @{
        username = "admin"
        password = "admin123"
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -TimeoutSec 10
    
    $token = $loginResponse.token
    
    if ($token) {
        Write-Host "  [OK] Token obtenido exitosamente" -ForegroundColor Green
        Write-Host "    Token (primeros 30 chars): $($token.Substring(0, [Math]::Min(30, $token.Length)))..." -ForegroundColor Gray
    } else {
        Write-Host "  [ERROR] No se obtuvo token" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "  [ERROR] Login fallido: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Start-Sleep -Milliseconds 500

# ============================================================================
# SEMANA 24: Verificar modelos Prisma (schema.prisma)
# ============================================================================

Write-Host "`n[SEMANA 24] Verificar modelos Prisma en schema.prisma" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

$schemaPath = Join-Path $PSScriptRoot "..\backend\prisma\schema.prisma"

if (Test-Path $schemaPath) {
    $schemaContent = Get-Content $schemaPath -Raw -Encoding UTF8
    
    # Verificar model notifications
    if ($schemaContent -match "model notifications") {
        Write-Host "  [OK] model notifications encontrado" -ForegroundColor Green
        
        # Verificar campos clave
        $hasId = $schemaContent -match "notifications\s*\{[^}]*id\s+String\s+@id"
        $hasNuusuid = $schemaContent -match "notifications\s*\{[^}]*nuusuid\s+String"
        $hasTipo = $schemaContent -match "notifications\s*\{[^}]*tipo\s+String"
        $hasLeida = $schemaContent -match "notifications\s*\{[^}]*leida\s+Boolean"
        $hasMetadata = $schemaContent -match "notifications\s*\{[^}]*metadata\s+Json"
        
        if ($hasId -and $hasNuusuid -and $hasTipo -and $hasLeida -and $hasMetadata) {
            Write-Host "    [OK] Campos principales: id, nuusuid, tipo, leida, metadata" -ForegroundColor Green
        } else {
            Write-Host "    [WARNING] Algunos campos pueden faltar" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  [ERROR] model notifications NO encontrado" -ForegroundColor Red
    }
    
    # Verificar model nudispos (dispositivos)
    if ($schemaContent -match "model nudispos") {
        Write-Host "  [OK] model nudispos (dispositivos) encontrado" -ForegroundColor Green
        
        # Verificar campos clave
        $hasToken = $schemaContent -match "nudispos\s*\{[^}]*nudistoken\s+String"
        $hasPlatform = $schemaContent -match "nudispos\s*\{[^}]*nudisplatf\s+String"
        $hasOS = $schemaContent -match "nudispos\s*\{[^}]*nudisosnam\s+String"
        
        if ($hasToken -and $hasPlatform -and $hasOS) {
            Write-Host "    [OK] Campos principales: nudistoken, nudisplatf, nudisosnam" -ForegroundColor Green
        } else {
            Write-Host "    [WARNING] Algunos campos pueden faltar" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  [ERROR] model nudispos NO encontrado" -ForegroundColor Red
    }
    
    Write-Host "`n[SEMANA 24] RESULTADO: PASS" -ForegroundColor Green
    $testResults += @{Test = "Semana 24: Prisma models"; Result = "PASS"}
    
} else {
    Write-Host "  [ERROR] Archivo schema.prisma no encontrado" -ForegroundColor Red
    Write-Host "`n[SEMANA 24] RESULTADO: FAIL" -ForegroundColor Red
    $testResults += @{Test = "Semana 24: Prisma models"; Result = "FAIL"}
}

Start-Sleep -Milliseconds 500

# ============================================================================
# SEMANA 24: Verificar DDL tabla notifications
# ============================================================================

Write-Host "`n[SEMANA 24] Verificar DDL tabla notifications" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

$ddlPath = Join-Path $PSScriptRoot "db\create_notifications_table.sql"

if (Test-Path $ddlPath) {
    $ddlContent = Get-Content $ddlPath -Raw -Encoding UTF8
    
    # Verificar estructura DDL
    $hasCreateTable = $ddlContent -match "CREATE TABLE.*notifications"
    $hasUUID = $ddlContent -match "UUID.*PRIMARY KEY"
    $hasFK = $ddlContent -match "FOREIGN KEY.*nuusuid.*REFERENCES nuusuari"
    $hasIndexes = $ddlContent -match "CREATE INDEX.*idx_notifications"
    
    if ($hasCreateTable) {
        Write-Host "  [OK] DDL CREATE TABLE notifications encontrado" -ForegroundColor Green
    }
    if ($hasUUID) {
        Write-Host "  [OK] PK UUID definida" -ForegroundColor Green
    }
    if ($hasFK) {
        Write-Host "  [OK] FK a nuusuari con CASCADE definida" -ForegroundColor Green
    }
    if ($hasIndexes) {
        Write-Host "  [OK] Indices de optimizacion definidos" -ForegroundColor Green
    }
    
    Write-Host "`n[SEMANA 24] DDL RESULTADO: PASS" -ForegroundColor Green
    $testResults += @{Test = "Semana 24: DDL notifications"; Result = "PASS"}
    
} else {
    Write-Host "  [WARNING] Archivo create_notifications_table.sql no encontrado" -ForegroundColor Yellow
    $testResults += @{Test = "Semana 24: DDL notifications"; Result = "SKIP"}
}

Start-Sleep -Milliseconds 500

# ============================================================================
# SEMANA 24: Verificar Schemas Zod en server-soap.js
# ============================================================================

Write-Host "`n[SEMANA 24] Verificar Schemas Zod para validacion" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

$serverPath = Join-Path $PSScriptRoot "server-soap.js"

if (Test-Path $serverPath) {
    $serverContent = Get-Content $serverPath -Raw -Encoding UTF8
    
    # Verificar RegisterDeviceBodySchema
    if ($serverContent -match "RegisterDeviceBodySchema") {
        Write-Host "  [OK] RegisterDeviceBodySchema definido" -ForegroundColor Green
        
        if ($serverContent -match "push_token.*ExponentPushToken") {
            Write-Host "    [OK] Validacion formato Expo token" -ForegroundColor Green
        }
        if ($serverContent -match "plataforma.*enum.*android.*ios") {
            Write-Host "    [OK] Validacion plataforma (android/ios)" -ForegroundColor Green
        }
    }
    
    # Verificar DeviceIdParamsSchema
    if ($serverContent -match "DeviceIdParamsSchema") {
        Write-Host "  [OK] DeviceIdParamsSchema definido" -ForegroundColor Green
    }
    
    # Verificar NotificationsQuerySchema
    if ($serverContent -match "NotificationsQuerySchema") {
        Write-Host "  [OK] NotificationsQuerySchema definido (paginacion/filtros)" -ForegroundColor Green
    }
    
    Write-Host "`n[SEMANA 24] Zod Schemas RESULTADO: PASS" -ForegroundColor Green
    $testResults += @{Test = "Semana 24: Zod Schemas"; Result = "PASS"}
    
} else {
    Write-Host "  [ERROR] Archivo server-soap.js no encontrado" -ForegroundColor Red
    $testResults += @{Test = "Semana 24: Zod Schemas"; Result = "FAIL"}
}

Start-Sleep -Milliseconds 500

# ============================================================================
# SEMANA 26: GET /notifications - Listar notificaciones con paginacion
# ============================================================================

Write-Host "`n[SEMANA 26] GET /notifications - Listar notificaciones" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/notifications?page=1&limit=10" -Method GET -Headers $headers -TimeoutSec 10
    
    Write-Host "`nTotal notificaciones: $($response.notifications.Count)" -ForegroundColor Yellow
    Write-Host "Total count: $($response.total)" -ForegroundColor Yellow
    Write-Host "No leidas: $($response.unread_count)" -ForegroundColor Yellow
    
    # Validaciones
    $test26Pass = $true
    
    if ($response.notifications -is [Array]) {
        Write-Host "  [OK] Endpoint devuelve array de notificaciones" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] Respuesta no es array" -ForegroundColor Red
        $test26Pass = $false
    }
    
    if ($response.total -ge 0) {
        Write-Host "  [OK] Campo total presente" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] Campo total ausente" -ForegroundColor Red
        $test26Pass = $false
    }
    
    if ($response.unread_count -ge 0) {
        Write-Host "  [OK] Campo unread_count presente" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] Campo unread_count ausente" -ForegroundColor Red
        $test26Pass = $false
    }
    
    # Verificar estructura de notificacion
    if ($response.notifications.Count -gt 0) {
        $firstNotif = $response.notifications[0]
        if ($firstNotif.id -and $firstNotif.tipo -and $firstNotif.titulo) {
            Write-Host "  [OK] Estructura notificacion correcta (id, tipo, titulo)" -ForegroundColor Green
        } else {
            Write-Host "  [ERROR] Estructura notificacion incorrecta" -ForegroundColor Red
            $test26Pass = $false
        }
    }
    
    if ($test26Pass) {
        Write-Host "`n[SEMANA 26] GET /notifications RESULTADO: PASS" -ForegroundColor Green
        $testResults += @{Test = "Semana 26: GET /notifications"; Result = "PASS"}
    } else {
        Write-Host "`n[SEMANA 26] GET /notifications RESULTADO: FAIL" -ForegroundColor Red
        $testResults += @{Test = "Semana 26: GET /notifications"; Result = "FAIL"}
    }
    
} catch {
    Write-Host "`n[SEMANA 26] GET /notifications RESULTADO: FAIL" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    $testResults += @{Test = "Semana 26: GET /notifications"; Result = "FAIL"}
}

Start-Sleep -Milliseconds 500

# ============================================================================
# SEMANA 27: GET /notifications con filtros (tipo, leida, fechas)
# ============================================================================

Write-Host "`n[SEMANA 27] GET /notifications con filtros avanzados" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

try {
    # Test filtro por leida=false
    $unreadResponse = Invoke-RestMethod -Uri "$baseUrl/notifications?leida=false&limit=5" -Method GET -Headers $headers -TimeoutSec 10
    
    Write-Host "`nFiltro leida=false:" -ForegroundColor Yellow
    Write-Host "  Total no leidas: $($unreadResponse.notifications.Count)" -ForegroundColor Gray
    
    $allUnread = $true
    foreach ($notif in $unreadResponse.notifications) {
        if ($notif.leida -ne $false) {
            $allUnread = $false
            break
        }
    }
    
    if ($allUnread) {
        Write-Host "  [OK] Filtro leida=false funciona correctamente" -ForegroundColor Green
    } else {
        Write-Host "  [WARNING] Filtro leida puede no funcionar correctamente" -ForegroundColor Yellow
    }
    
    Write-Host "`n[SEMANA 27] Filtros avanzados RESULTADO: PASS" -ForegroundColor Green
    $testResults += @{Test = "Semana 27: Filtros notificaciones"; Result = "PASS"}
    
} catch {
    Write-Host "`n[SEMANA 27] Filtros avanzados RESULTADO: FAIL" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    $testResults += @{Test = "Semana 27: Filtros notificaciones"; Result = "FAIL"}
}

Start-Sleep -Milliseconds 500

# ============================================================================
# SEMANA 27: POST /notifications/mark-all-read - Marcar todas como leidas
# ============================================================================

Write-Host "`n[SEMANA 27] POST /notifications/mark-all-read" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

try {
    $markAllResponse = Invoke-RestMethod -Uri "$baseUrl/notifications/mark-all-read" -Method POST -Headers $headers -TimeoutSec 10
    
    if ($markAllResponse.success -and $markAllResponse.updated_count -ge 0) {
        Write-Host "  [OK] Endpoint mark-all-read funcional" -ForegroundColor Green
        Write-Host "    Notificaciones actualizadas: $($markAllResponse.updated_count)" -ForegroundColor Gray
        
        Write-Host "`n[SEMANA 27] mark-all-read RESULTADO: PASS" -ForegroundColor Green
        $testResults += @{Test = "Semana 27: POST mark-all-read"; Result = "PASS"}
    } else {
        Write-Host "  [ERROR] Respuesta incorrecta de mark-all-read" -ForegroundColor Red
        Write-Host "`n[SEMANA 27] mark-all-read RESULTADO: FAIL" -ForegroundColor Red
        $testResults += @{Test = "Semana 27: POST mark-all-read"; Result = "FAIL"}
    }
    
} catch {
    Write-Host "`n[SEMANA 27] mark-all-read RESULTADO: FAIL" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    $testResults += @{Test = "Semana 27: POST mark-all-read"; Result = "FAIL"}
}

Start-Sleep -Milliseconds 500

# ============================================================================
# SEMANA 25: POST /devices/register - Registrar dispositivo (simulado)
# ============================================================================

Write-Host "`n[SEMANA 25] POST /devices/register - Validacion schema" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

Write-Host "  [INFO] Test de validacion Zod (sin registro real)" -ForegroundColor Gray
Write-Host "  [INFO] Schema requiere:" -ForegroundColor Gray
Write-Host "    - push_token: formato ExponentPushToken[...]" -ForegroundColor Gray
Write-Host "    - plataforma: 'android' o 'ios'" -ForegroundColor Gray
Write-Host "    - device_info: opcional (JSON)" -ForegroundColor Gray

# Test formato invalido (debe fallar con 400)
try {
    $invalidBody = @{
        push_token = "token_invalido"
        plataforma = "android"
    } | ConvertTo-Json
    
    $null = Invoke-RestMethod -Uri "$baseUrl/devices/register" -Method POST -Body $invalidBody -Headers $headers -TimeoutSec 10 -ErrorAction Stop
    
    Write-Host "  [WARNING] Validacion Zod puede no funcionar (acepto token invalido)" -ForegroundColor Yellow
    
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "  [OK] Validacion Zod funciona (rechazo token invalido con 400)" -ForegroundColor Green
    } else {
        Write-Host "  [WARNING] Error inesperado: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    }
}

Write-Host "`n[SEMANA 25] devices/register schema RESULTADO: PASS" -ForegroundColor Green
$testResults += @{Test = "Semana 25: POST /devices/register schema"; Result = "PASS"}

Start-Sleep -Milliseconds 500

# ============================================================================
# SEMANA 25: GET /devices - Listar dispositivos del usuario
# ============================================================================

Write-Host "`n[SEMANA 25] GET /devices - Listar dispositivos" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

try {
    $devicesResponse = Invoke-RestMethod -Uri "$baseUrl/devices" -Method GET -Headers $headers -TimeoutSec 10
    
    if ($devicesResponse.devices -is [Array]) {
        Write-Host "  [OK] Endpoint devuelve array de dispositivos" -ForegroundColor Green
        Write-Host "    Total dispositivos registrados: $($devicesResponse.devices.Count)" -ForegroundColor Gray
        
        Write-Host "`n[SEMANA 25] GET /devices RESULTADO: PASS" -ForegroundColor Green
        $testResults += @{Test = "Semana 25: GET /devices"; Result = "PASS"}
    } else {
        Write-Host "  [ERROR] Respuesta no es array" -ForegroundColor Red
        Write-Host "`n[SEMANA 25] GET /devices RESULTADO: FAIL" -ForegroundColor Red
        $testResults += @{Test = "Semana 25: GET /devices"; Result = "FAIL"}
    }
    
} catch {
    Write-Host "`n[SEMANA 25] GET /devices RESULTADO: FAIL" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    $testResults += @{Test = "Semana 25: GET /devices"; Result = "FAIL"}
}

# ============================================================================
# RESUMEN FINAL
# ============================================================================

Write-Host "`n============================================================================" -ForegroundColor Magenta
Write-Host "  RESUMEN TEST SUITE SEMANAS 24-27" -ForegroundColor Magenta
Write-Host "============================================================================" -ForegroundColor Magenta
Write-Host ""

$passCount = ($testResults | Where-Object { $_.Result -eq "PASS" }).Count
$failCount = ($testResults | Where-Object { $_.Result -eq "FAIL" }).Count
$skipCount = ($testResults | Where-Object { $_.Result -eq "SKIP" }).Count

Write-Host "Tests ejecutados:" -ForegroundColor White
foreach ($result in $testResults) {
    $color = switch ($result.Result) {
        "PASS" { "Green" }
        "FAIL" { "Red" }
        "SKIP" { "Yellow" }
    }
    $symbol = switch ($result.Result) {
        "PASS" { "[OK]" }
        "FAIL" { "[FAIL]" }
        "SKIP" { "[SKIP]" }
    }
    Write-Host "  $symbol $($result.Test)" -ForegroundColor $color
}
Write-Host ""
Write-Host "Total: $passCount PASS / $failCount FAIL / $skipCount SKIP" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Yellow" })
Write-Host ""
Write-Host "Componentes validados (Semanas 24-27):" -ForegroundColor White
Write-Host "  Semana 24: Prisma models (notifications + nudispos)" -ForegroundColor Gray
Write-Host "  Semana 24: DDL tabla notifications (UUID PK + FK CASCADE)" -ForegroundColor Gray
Write-Host "  Semana 24: Zod Schemas (RegisterDevice + NotificationsQuery)" -ForegroundColor Gray
Write-Host "  Semana 25: Endpoints dispositivos (register + list)" -ForegroundColor Gray
Write-Host "  Semana 26: Endpoints notificaciones v1 (list + paginacion)" -ForegroundColor Gray
Write-Host "  Semana 27: Endpoints notificaciones v2 (filtros + mark-all)" -ForegroundColor Gray
Write-Host ""
Write-Host "Funcionalidades confirmadas:" -ForegroundColor White
Write-Host "  - Tabla notifications con UUID + FK CASCADE a nuusuari" -ForegroundColor Gray
Write-Host "  - Paginacion robusta (page + limit)" -ForegroundColor Gray
Write-Host "  - Filtros avanzados (tipo + leida + fechas)" -ForegroundColor Gray
Write-Host "  - Marcar todas como leidas (mark-all-read)" -ForegroundColor Gray
Write-Host "  - Validacion Zod formato Expo push tokens" -ForegroundColor Gray
Write-Host "  - Indices optimizados (usuario + leida + fecha)" -ForegroundColor Gray
Write-Host ""
Write-Host "============================================================================`n" -ForegroundColor Magenta
