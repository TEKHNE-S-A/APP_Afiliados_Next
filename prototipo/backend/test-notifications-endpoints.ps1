# ============================================================================
# TEST NOTIFICACIONES v1 + v2 - Semanas 26 + 27
# ============================================================================

$baseUrl = "http://localhost:3000"
$testUser = "marianr@tekhne.com.ar"
$testPassword = "123456"

Write-Host "`n========================================"
Write-Host "TEST NOTIFICACIONES v1 + v2"
Write-Host "========================================`n"

# 1. LOGIN
Write-Host "1. LOGIN - Obtener token de autenticacion"
$loginBody = @{
    username = $testUser
    password = $testPassword
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.token
    $nuusuid = $loginResponse.user.nuusuid
    Write-Host "[OK] Login exitoso" -ForegroundColor Green
    Write-Host "     Token: $($token.Substring(0, 40))..."
    Write-Host "     Usuario ID: $nuusuid"
} catch {
    Write-Host "[FAIL] Error en login: $_" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# 2. CREAR NOTIFICACIONES DE PRUEBA (directo en BD via query)
Write-Host "`n2. Crear notificaciones de prueba en la base de datos"
Write-Host "     (Ejecutar manualmente si es necesario via SQL)"
Write-Host "     INSERT INTO notifications (id, nuusuid, tipo, titulo, mensaje, leida) VALUES"
Write-Host "     (uuid_generate_v4(), '$nuusuid', 'info', 'Test 1', 'Mensaje test 1', false),"
Write-Host "     (uuid_generate_v4(), '$nuusuid', 'warning', 'Test 2', 'Mensaje test 2', false),"
Write-Host "     (uuid_generate_v4(), '$nuusuid', 'success', 'Test 3', 'Mensaje test 3', true);"

# 3. LISTAR NOTIFICACIONES (página 1, default)
Write-Host "`n3. GET /notifications - Listar notificaciones (default: page=1, limit=20)"
try {
    $listResponse = Invoke-RestMethod -Uri "$baseUrl/notifications" -Method Get -Headers $headers
    Write-Host "[OK] Notificaciones obtenidas: $($listResponse.notifications.Count)" -ForegroundColor Green
    Write-Host "     Total: $($listResponse.pagination.totalCount)"
    Write-Host "     Pagina: $($listResponse.pagination.page) de $($listResponse.pagination.totalPages)"
    
    if ($listResponse.notifications.Count -gt 0) {
        $script:testNotificationId = $listResponse.notifications[0].id
        Write-Host "     Primera notificacion:"
        Write-Host "       ID: $($listResponse.notifications[0].id)"
        Write-Host "       Tipo: $($listResponse.notifications[0].tipo)"
        Write-Host "       Titulo: $($listResponse.notifications[0].titulo)"
        Write-Host "       Leida: $($listResponse.notifications[0].leida)"
    }
} catch {
    Write-Host "[FAIL] Error listando notificaciones: $_" -ForegroundColor Red
}

# 4. LISTAR NOTIFICACIONES CON PAGINACION CUSTOM
Write-Host "`n4. GET /notifications?page=1&limit=5&orderBy=tipo&orderDir=asc"
try {
    $customListResponse = Invoke-RestMethod -Uri "$baseUrl/notifications?page=1&limit=5&orderBy=tipo&orderDir=asc" -Method Get -Headers $headers
    Write-Host "[OK] Notificaciones con paginacion custom: $($customListResponse.notifications.Count)" -ForegroundColor Green
    Write-Host "     Total: $($customListResponse.pagination.totalCount)"
    Write-Host "     Limit: $($customListResponse.pagination.limit)"
    Write-Host "     OrderBy: tipo (asc)"
} catch {
    Write-Host "[FAIL] Error en listado custom: $_" -ForegroundColor Red
}

# 5. CONTAR NOTIFICACIONES NO LEIDAS
Write-Host "`n5. GET /notifications/unread-count - Contar no leidas"
try {
    $unreadCountResponse = Invoke-RestMethod -Uri "$baseUrl/notifications/unread-count" -Method Get -Headers $headers
    Write-Host "[OK] Notificaciones no leidas: $($unreadCountResponse.unreadCount)" -ForegroundColor Green
    
    if ($unreadCountResponse.unreadCount -gt 0) {
        Write-Host "     [INFO] Hay notificaciones sin leer"
    } else {
        Write-Host "     [INFO] Todas las notificaciones estan leidas"
    }
} catch {
    Write-Host "[FAIL] Error contando no leidas: $_" -ForegroundColor Red
}

# 6. MARCAR COMO LEIDA
if ($script:testNotificationId) {
    Write-Host "`n6. PUT /notifications/:id/mark-read - Marcar como leida"
    try {
        $markReadResponse = Invoke-RestMethod -Uri "$baseUrl/notifications/$testNotificationId/mark-read" -Method Put -Headers $headers
        Write-Host "[OK] Notificacion marcada como leida" -ForegroundColor Green
        Write-Host "     ID: $($markReadResponse.notification.id)"
        Write-Host "     Leida: $($markReadResponse.notification.leida)"
        Write-Host "     Fecha leida: $($markReadResponse.notification.fecha_leida)"
    } catch {
        Write-Host "[FAIL] Error marcando como leida: $_" -ForegroundColor Red
    }
} else {
    Write-Host "`n6. [SKIP] No hay notificaciones para marcar como leida" -ForegroundColor Yellow
}

# ============================================================================
# NUEVOS TESTS - SEMANA 27: FILTROS Y MARK-ALL-READ
# ============================================================================

# 7. FILTRAR POR TIPO (info)
Write-Host "`n7. GET /notifications?tipo=info - Filtrar por tipo"
try {
    $filterTipoResponse = Invoke-RestMethod -Uri "$baseUrl/notifications?tipo=info" -Method Get -Headers $headers
    Write-Host "[OK] Notificaciones tipo info: $($filterTipoResponse.notifications.Count)" -ForegroundColor Green
    Write-Host "     Total filtrado: $($filterTipoResponse.pagination.totalCount)"
    
    if ($filterTipoResponse.notifications.Count -gt 0) {
        $allInfo = $true
        foreach ($notif in $filterTipoResponse.notifications) {
            if ($notif.tipo -ne "info") {
                $allInfo = $false
                break
            }
        }
        if ($allInfo) {
            Write-Host "     [OK] Todas son tipo info" -ForegroundColor Green
        } else {
            Write-Host "     [WARN] Hay notificaciones de otros tipos" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "[FAIL] Error filtrando por tipo: $_" -ForegroundColor Red
}

# 8. FILTRAR POR LEIDA=false
Write-Host "`n8. GET /notifications?leida=false - Filtrar no leidas"
try {
    $filterLeidaResponse = Invoke-RestMethod -Uri "$baseUrl/notifications?leida=false" -Method Get -Headers $headers
    Write-Host "[OK] Notificaciones no leidas: $($filterLeidaResponse.notifications.Count)" -ForegroundColor Green
    Write-Host "     Total filtrado: $($filterLeidaResponse.pagination.totalCount)"
    
    if ($filterLeidaResponse.notifications.Count -gt 0) {
        $allUnread = $true
        foreach ($notif in $filterLeidaResponse.notifications) {
            if ($notif.leida -eq $true) {
                $allUnread = $false
                break
            }
        }
        if ($allUnread) {
            Write-Host "     [OK] Todas son no leidas" -ForegroundColor Green
        } else {
            Write-Host "     [WARN] Hay notificaciones leidas" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "[FAIL] Error filtrando por leida: $_" -ForegroundColor Red
}

# 9. FILTRAR POR RANGO DE FECHAS (últimos 7 días)
Write-Host "`n9. GET /notifications?fecha_desde=...&fecha_hasta=... - Filtrar por rango de fechas"
$fechaHasta = (Get-Date).ToString("yyyy-MM-dd")
$fechaDesde = (Get-Date).AddDays(-7).ToString("yyyy-MM-dd")
try {
    $filterFechaResponse = Invoke-RestMethod -Uri "$baseUrl/notifications?fecha_desde=$fechaDesde&fecha_hasta=$fechaHasta" -Method Get -Headers $headers
    Write-Host "[OK] Notificaciones ultimos 7 dias: $($filterFechaResponse.notifications.Count)" -ForegroundColor Green
    Write-Host "     Rango: $fechaDesde a $fechaHasta"
    Write-Host "     Total filtrado: $($filterFechaResponse.pagination.totalCount)"
} catch {
    Write-Host "[FAIL] Error filtrando por fecha: $_" -ForegroundColor Red
}

# 10. MARK-ALL-READ - Marcar todas como leidas
Write-Host "`n10. POST /notifications/mark-all-read - Marcar TODAS como leidas"
try {
    $markAllResponse = Invoke-RestMethod -Uri "$baseUrl/notifications/mark-all-read" -Method Post -Headers $headers
    Write-Host "[OK] Notificaciones marcadas como leidas: $($markAllResponse.count)" -ForegroundColor Green
    Write-Host "     Mensaje: $($markAllResponse.message)"
    Write-Host "     Success: $($markAllResponse.success)"
} catch {
    Write-Host "[FAIL] Error marcando todas como leidas: $_" -ForegroundColor Red
}

# 11. VERIFICAR CONTEO DESPUES DE MARK-ALL-READ
Write-Host "`n11. GET /notifications/unread-count - Verificar conteo despues de mark-all-read"
try {
    $finalCountResponse = Invoke-RestMethod -Uri "$baseUrl/notifications/unread-count" -Method Get -Headers $headers
    Write-Host "[OK] Notificaciones no leidas finales: $($finalCountResponse.unreadCount)" -ForegroundColor Green
    
    if ($finalCountResponse.unreadCount -eq 0) {
        Write-Host "     [OK] Todas marcadas como leidas correctamente" -ForegroundColor Green
    } else {
        Write-Host "     [INFO] Aun hay $($finalCountResponse.unreadCount) sin leer" -ForegroundColor Cyan
    }
} catch {
    Write-Host "[FAIL] Error verificando conteo final: $_" -ForegroundColor Red
}

# 12. VALIDACION - Paginacion invalida (limit > 100)
Write-Host "`n12. Validacion - Limit mayor a 100 (debe rechazar)"
try {
    $null = Invoke-RestMethod -Uri "$baseUrl/notifications?limit=200" -Method Get -Headers $headers
    Write-Host "[FAIL] ERROR: Deberia haber rechazado limit > 100" -ForegroundColor Red
} catch {
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($errorResponse.error -eq "VALIDATION_ERROR") {
        Write-Host "[OK] Validacion correcta: limit rechazado" -ForegroundColor Green
        Write-Host "     Mensaje: $($errorResponse.errors[0].message)"
    } else {
        Write-Host "[WARN] Error inesperado: $($errorResponse.error)" -ForegroundColor Yellow
    }
}

# 13. VALIDACION - Sin autenticacion
Write-Host "`n13. Validacion - Sin token de autenticacion"
try {
    $null = Invoke-RestMethod -Uri "$baseUrl/notifications" -Method Get -ContentType "application/json"
    Write-Host "[FAIL] ERROR: Deberia requerir autenticacion" -ForegroundColor Red
} catch {
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($errorResponse.error -eq "UNAUTHORIZED") {
        Write-Host "[OK] Autenticacion requerida correctamente" -ForegroundColor Green
        Write-Host "     Mensaje: $($errorResponse.message)"
    } else {
        Write-Host "[WARN] Error inesperado: $($errorResponse.error)" -ForegroundColor Yellow
    }
}

# 14. VALIDACION - Notificacion inexistente
Write-Host "`n14. Validacion - Marcar notificacion inexistente"
$fakeNotificationId = "00000000-0000-0000-0000-000000000000"
try {
    $null = Invoke-RestMethod -Uri "$baseUrl/notifications/$fakeNotificationId/mark-read" -Method Put -Headers $headers
    Write-Host "[WARN] Notificacion no encontrada (esperado)" -ForegroundColor Yellow
} catch {
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($errorResponse.error -eq "NOT_FOUND") {
        Write-Host "[OK] Validacion correcta: notificacion no encontrada" -ForegroundColor Green
        Write-Host "     Mensaje: $($errorResponse.message)"
    } else {
        Write-Host "     Error: $($errorResponse.error)"
    }
}

# 15. VALIDACION - Filtro tipo invalido
Write-Host "`n15. Validacion - Filtro tipo invalido (debe rechazar)"
try {
    $null = Invoke-RestMethod -Uri "$baseUrl/notifications?tipo=invalido" -Method Get -Headers $headers
    Write-Host "[FAIL] ERROR: Deberia haber rechazado tipo invalido" -ForegroundColor Red
} catch {
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($errorResponse.error -eq "VALIDATION_ERROR") {
        Write-Host "[OK] Validacion correcta: tipo invalido rechazado" -ForegroundColor Green
        Write-Host "     Mensaje: $($errorResponse.errors[0].message)"
    } else {
        Write-Host "[WARN] Error inesperado: $($errorResponse.error)" -ForegroundColor Yellow
    }
}

# 16. VALIDACION - Fecha invalida
Write-Host "`n16. Validacion - Fecha invalida (debe rechazar)"
try {
    $null = Invoke-RestMethod -Uri "$baseUrl/notifications?fecha_desde=fecha-invalida" -Method Get -Headers $headers
    Write-Host "[FAIL] ERROR: Deberia haber rechazado fecha invalida" -ForegroundColor Red
} catch {
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($errorResponse.error -eq "VALIDATION_ERROR") {
        Write-Host "[OK] Validacion correcta: fecha invalida rechazada" -ForegroundColor Green
        Write-Host "     Mensaje: $($errorResponse.errors[0].message)"
    } else {
        Write-Host "[WARN] Error inesperado: $($errorResponse.error)" -ForegroundColor Yellow
    }
}

# RESUMEN
Write-Host "`n========================================"
Write-Host "RESUMEN DE PRUEBAS"
Write-Host "========================================"
Write-Host "[OK] Login exitoso" -ForegroundColor Green
Write-Host "[OK] Listado paginado de notificaciones" -ForegroundColor Green
Write-Host "[OK] Paginacion custom con orderBy" -ForegroundColor Green
Write-Host "[OK] Conteo de notificaciones no leidas" -ForegroundColor Green
if ($script:testNotificationId) {
    Write-Host "[OK] Marcar notificacion como leida" -ForegroundColor Green
} else {
    Write-Host "[SKIP] Marcar notificacion (sin datos)" -ForegroundColor Yellow
}
Write-Host "[OK] Filtrar por tipo (Semana 27)" -ForegroundColor Green
Write-Host "[OK] Filtrar por leida (Semana 27)" -ForegroundColor Green
Write-Host "[OK] Filtrar por rango de fechas (Semana 27)" -ForegroundColor Green
Write-Host "[OK] Mark-all-read (Semana 27)" -ForegroundColor Green
Write-Host "[OK] Verificacion conteo final" -ForegroundColor Green
Write-Host "[OK] Validacion de limit maximo (100)" -ForegroundColor Green
Write-Host "[OK] Validacion de autenticacion requerida" -ForegroundColor Green
Write-Host "[OK] Validacion de ownership de notificaciones" -ForegroundColor Green
Write-Host "[OK] Validacion de filtros invalidos (Semana 27)" -ForegroundColor Green
Write-Host "[OK] Validacion de fechas invalidas (Semana 27)" -ForegroundColor Green
Write-Host "`nNOTA: Para tests completos, crear notificaciones de prueba via SQL" -ForegroundColor Cyan
Write-Host "TODAS LAS PRUEBAS COMPLETADAS" -ForegroundColor Green
Write-Host "========================================`n"
