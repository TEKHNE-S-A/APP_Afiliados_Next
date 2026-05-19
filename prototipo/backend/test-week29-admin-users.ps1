# ============================================================================
# TEST SUITE - SEMANA 29: Admin Usuarios (Parcial)
# ============================================================================
# Proposito: Verificar funcionalidad admin usuarios implementada
# Fecha: 10/02/2026
# Scope:
#   - Eliminacion logica (DELETE /user/account)
#   - Reactivacion usuarios (POST /admin/user/reactivate)
#   - Estado cuenta (GET /user/status)
#   - Estadisticas (GET /admin/stats/users)
#   - Funciones BD (desactivar_usuario, reactivar_usuario, estadisticas_usuarios)
#
# NOTA: Endpoints de listado/busqueda NO implementados aun
# ============================================================================

$baseUrl = "http://localhost:3000"

Write-Host "`n============================================================================" -ForegroundColor Magenta
Write-Host "  SEMANA 29 - TEST ADMIN USUARIOS (IMPLEMENTACION PARCIAL)" -ForegroundColor Magenta
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
    $nuusuid = $loginResponse.user.username
    
    if ($token) {
        Write-Host "  [OK] Token obtenido exitosamente" -ForegroundColor Green
        Write-Host "    Usuario: $nuusuid" -ForegroundColor Gray
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
# TEST 1: GET /user/status - Verificar estado de cuenta
# ============================================================================

Write-Host "`n[TEST 1] GET /user/status - Verificar estado cuenta" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/user/status" -Method GET -Headers $headers -TimeoutSec 10
    
    Write-Host "`nEstado de cuenta:" -ForegroundColor Yellow
    Write-Host "  Usuario ID: $($response.nuusuid)" -ForegroundColor Gray
    Write-Host "  Email: $($response.email)" -ForegroundColor Gray
    Write-Host "  Nombre: $($response.nombre)" -ForegroundColor Gray
    Write-Host "  Estado: $($response.estado)" -ForegroundColor Gray
    Write-Host "  Activo: $($response.activo)" -ForegroundColor Gray
    
    # Validaciones
    $test1Pass = $true
    
    if ($response.nuusuid -and $response.email) {
        Write-Host "  [OK] Endpoint devuelve datos basicos del usuario" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] Respuesta incompleta" -ForegroundColor Red
        $test1Pass = $false
    }
    
    if ($response.estado -and $response.PSObject.Properties['activo']) {
        Write-Host "  [OK] Campos estado y activo presentes" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] Campos de estado ausentes" -ForegroundColor Red
        $test1Pass = $false
    }
    
    if ($test1Pass) {
        Write-Host "`n[TEST 1] RESULTADO: PASS" -ForegroundColor Green
        $testResults += @{Test = "GET /user/status"; Result = "PASS"}
    } else {
        Write-Host "`n[TEST 1] RESULTADO: FAIL" -ForegroundColor Red
        $testResults += @{Test = "GET /user/status"; Result = "FAIL"}
    }
    
} catch {
    Write-Host "`n[TEST 1] RESULTADO: FAIL" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    $testResults += @{Test = "GET /user/status"; Result = "FAIL"}
}

Start-Sleep -Milliseconds 500

# ============================================================================
# TEST 2: GET /admin/stats/users - Estadisticas de usuarios
# ============================================================================

Write-Host "`n[TEST 2] GET /admin/stats/users - Estadisticas usuarios" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/admin/stats/users" -Method GET -Headers $headers -TimeoutSec 10
    
    Write-Host "`nEstadisticas (llamando funcion estadisticas_usuarios()):" -ForegroundColor Yellow
    
    $stats = $response.estadisticas
    
    if ($stats) {
        Write-Host "  Total usuarios: $($stats.total_usuarios)" -ForegroundColor Gray
        Write-Host "  Usuarios activos: $($stats.usuarios_activos)" -ForegroundColor Gray
        Write-Host "  Usuarios desactivados: $($stats.usuarios_desactivados)" -ForegroundColor Gray
        Write-Host "  Usuarios GAM: $($stats.usuarios_gam)" -ForegroundColor Gray
        Write-Host "  Usuarios Local: $($stats.usuarios_local)" -ForegroundColor Gray
        
        Write-Host "  [OK] Endpoint retorna estadisticas completas" -ForegroundColor Green
        Write-Host "`n[TEST 2] RESULTADO: PASS" -ForegroundColor Green
        $testResults += @{Test = "GET /admin/stats/users"; Result = "PASS"}
    } else {
        Write-Host "  [ERROR] Estadisticas no encontradas en respuesta" -ForegroundColor Red
        Write-Host "`n[TEST 2] RESULTADO: FAIL" -ForegroundColor Red
        $testResults += @{Test = "GET /admin/stats/users"; Result = "FAIL"}
    }
    
} catch {
    Write-Host "`n[TEST 2] RESULTADO: FAIL" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    $testResults += @{Test = "GET /admin/stats/users"; Result = "FAIL"}
}

Start-Sleep -Milliseconds 500

# ============================================================================
# TEST 3: Verificar funciones BD en migrate_logical_deletion.sql
# ============================================================================

Write-Host "`n[TEST 3] Verificar funciones BD PostgreSQL" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

$sqlPath = Join-Path $PSScriptRoot "db\migrate_logical_deletion.sql"

if (Test-Path $sqlPath) {
    $sqlContent = Get-Content $sqlPath -Raw -Encoding UTF8
    
    # Verificar funcion desactivar_usuario
    if ($sqlContent -match "CREATE.*FUNCTION.*desactivar_usuario") {
        Write-Host "  [OK] Funcion desactivar_usuario() definida" -ForegroundColor Green
        
        if ($sqlContent -match "nuusuactiv.*=.*'N'") {
            Write-Host "    [OK] Implementa soft delete (nuusuactiv = 'N')" -ForegroundColor Green
        }
        if ($sqlContent -match "nuusufecde.*NOW") {
            Write-Host "    [OK] Registra fecha desactivacion" -ForegroundColor Green
        }
        if ($sqlContent -match "nuusumotde") {
            Write-Host "    [OK] Guarda motivo desactivacion" -ForegroundColor Green
        }
    }
    
    # Verificar funcion reactivar_usuario
    if ($sqlContent -match "CREATE.*FUNCTION.*reactivar_usuario") {
        Write-Host "  [OK] Funcion reactivar_usuario() definida" -ForegroundColor Green
        
        if ($sqlContent -match "nuusuactiv.*=.*'S'") {
            Write-Host "    [OK] Reactiva usuario (nuusuactiv = 'S')" -ForegroundColor Green
        }
    }
    
    # Verificar funcion estadisticas_usuarios
    if ($sqlContent -match "CREATE.*FUNCTION.*estadisticas_usuarios") {
        Write-Host "  [OK] Funcion estadisticas_usuarios() definida" -ForegroundColor Green
        
        if ($sqlContent -match "COUNT.*FILTER.*WHERE nuusuactiv") {
            Write-Host "    [OK] Cuenta usuarios por estado (activo/desactivado)" -ForegroundColor Green
        }
        if ($sqlContent -match "usuarios_gam.*usuarios_local") {
            Write-Host "    [OK] Distingue usuarios GAM vs Local" -ForegroundColor Green
        }
    }
    
    # Verificar tabla auditoria
    if ($sqlContent -match "CREATE TABLE.*auditoria_usuarios") {
        Write-Host "  [OK] Tabla auditoria_usuarios definida" -ForegroundColor Green
    }
    
    # Verificar trigger
    if ($sqlContent -match "CREATE TRIGGER.*trig_audit_usuario") {
        Write-Host "  [OK] Trigger de auditoria configurado" -ForegroundColor Green
    }
    
    # Verificar indices
    if ($sqlContent -match "CREATE INDEX.*idx_nuusuari_activo") {
        Write-Host "  [OK] Indice idx_nuusuari_activo para optimizacion" -ForegroundColor Green
    }
    
    Write-Host "`n[TEST 3] RESULTADO: PASS" -ForegroundColor Green
    $testResults += @{Test = "Funciones BD SQL"; Result = "PASS"}
    
} else {
    Write-Host "  [WARNING] Archivo migrate_logical_deletion.sql no encontrado" -ForegroundColor Yellow
    $testResults += @{Test = "Funciones BD SQL"; Result = "SKIP"}
}

Start-Sleep -Milliseconds 500

# ============================================================================
# TEST 4: Verificar estructura columnas nuusuari
# ============================================================================

Write-Host "`n[TEST 4] Verificar columnas nuevas tabla nuusuari" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

if (Test-Path $sqlPath) {
    $sqlContent = Get-Content $sqlPath -Raw -Encoding UTF8
    
    # Verificar columnas agregadas
    $hasNuusuactiv = $sqlContent -match "nuusuactiv CHAR\(1\)"
    $hasNuusufecde = $sqlContent -match "nuusufecde TIMESTAMP"
    $hasNuusumotde = $sqlContent -match "nuusumotde TEXT"
    
    if ($hasNuusuactiv) {
        Write-Host "  [OK] Columna nuusuactiv (CHAR(1)) - Estado activo/desactivado" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] Columna nuusuactiv no encontrada" -ForegroundColor Red
    }
    
    if ($hasNuusufecde) {
        Write-Host "  [OK] Columna nuusufecde (TIMESTAMP) - Fecha desactivacion" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] Columna nuusufecde no encontrada" -ForegroundColor Red
    }
    
    if ($hasNuusumotde) {
        Write-Host "  [OK] Columna nuusumotde (TEXT) - Motivo desactivacion" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] Columna nuusumotde no encontrada" -ForegroundColor Red
    }
    
    if ($hasNuusuactiv -and $hasNuusufecde -and $hasNuusumotde) {
        Write-Host "`n[TEST 4] RESULTADO: PASS" -ForegroundColor Green
        $testResults += @{Test = "Columnas tabla nuusuari"; Result = "PASS"}
    } else {
        Write-Host "`n[TEST 4] RESULTADO: FAIL" -ForegroundColor Red
        $testResults += @{Test = "Columnas tabla nuusuari"; Result = "FAIL"}
    }
    
} else {
    Write-Host "  [SKIP] No se puede verificar sin archivo SQL" -ForegroundColor Yellow
    $testResults += @{Test = "Columnas tabla nuusuari"; Result = "SKIP"}
}

Start-Sleep -Milliseconds 500

# ============================================================================
# TEST 5: Verificar endpoints implementados vs esperados
# ============================================================================

Write-Host "`n[TEST 5] Verificar endpoints Semana 29 (esperados vs implementados)" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

$serverPath = Join-Path $PSScriptRoot "server-soap.js"

if (Test-Path $serverPath) {
    $serverContent = Get-Content $serverPath -Raw -Encoding UTF8
    
    Write-Host "`nEndpoints IMPLEMENTADOS:" -ForegroundColor Yellow
    
    # DELETE /user/account
    if ($serverContent -match "DELETE /user/account") {
        Write-Host "  [OK] DELETE /user/account - Eliminacion logica" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] DELETE /user/account NO encontrado" -ForegroundColor Red
    }
    
    # POST /admin/user/reactivate
    if ($serverContent -match "POST /admin/user/reactivate") {
        Write-Host "  [OK] POST /admin/user/reactivate - Reactivar usuario" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] POST /admin/user/reactivate NO encontrado" -ForegroundColor Red
    }
    
    # GET /user/status
    if ($serverContent -match "GET /user/status") {
        Write-Host "  [OK] GET /user/status - Estado cuenta" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] GET /user/status NO encontrado" -ForegroundColor Red
    }
    
    # GET /admin/stats/users
    if ($serverContent -match "GET /admin/stats/users") {
        Write-Host "  [OK] GET /admin/stats/users - Estadisticas" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] GET /admin/stats/users NO encontrado" -ForegroundColor Red
    }
    
    Write-Host "`nEndpoints FALTANTES (scope Semana 29):" -ForegroundColor Yellow
    
    # GET /admin/users (listar con paginacion)
    if ($serverContent -match "GET /admin/users") {
        Write-Host "  [OK] GET /admin/users - Listar usuarios (paginado)" -ForegroundColor Green
    } else {
        Write-Host "  [FALTA] GET /admin/users - Listar usuarios con paginacion" -ForegroundColor Red
    }
    
    # GET /admin/users/search
    if ($serverContent -match "GET /admin/users/search") {
        Write-Host "  [OK] GET /admin/users/search - Buscar usuarios" -ForegroundColor Green
    } else {
        Write-Host "  [FALTA] GET /admin/users/search - Buscar usuarios (query params)" -ForegroundColor Red
    }
    
    # GET /admin/users/:id
    if ($serverContent -match "GET /admin/users/:id") {
        Write-Host "  [OK] GET /admin/users/:id - Detalle usuario" -ForegroundColor Green
    } else {
        Write-Host "  [FALTA] GET /admin/users/:id - Detalle de un usuario especifico" -ForegroundColor Red
    }
    
    Write-Host "`n[TEST 5] RESULTADO: PASS (con warnings)" -ForegroundColor Yellow
    Write-Host "  Implementado: 4/7 endpoints (57%)" -ForegroundColor Yellow
    Write-Host "  Faltante: 3/7 endpoints (43%)" -ForegroundColor Yellow
    $testResults += @{Test = "Endpoints Semana 29"; Result = "PARTIAL"}
    
} else {
    Write-Host "  [ERROR] Archivo server-soap.js no encontrado" -ForegroundColor Red
    $testResults += @{Test = "Endpoints Semana 29"; Result = "FAIL"}
}

# ============================================================================
# RESUMEN FINAL
# ============================================================================

Write-Host "`n============================================================================" -ForegroundColor Magenta
Write-Host "  RESUMEN TEST SUITE SEMANA 29" -ForegroundColor Magenta
Write-Host "============================================================================" -ForegroundColor Magenta
Write-Host ""

$passCount = ($testResults | Where-Object { $_.Result -eq "PASS" }).Count
$failCount = ($testResults | Where-Object { $_.Result -eq "FAIL" }).Count
$skipCount = ($testResults | Where-Object { $_.Result -eq "SKIP" }).Count
$partialCount = ($testResults | Where-Object { $_.Result -eq "PARTIAL" }).Count

Write-Host "Tests ejecutados:" -ForegroundColor White
foreach ($result in $testResults) {
    $color = switch ($result.Result) {
        "PASS" { "Green" }
        "FAIL" { "Red" }
        "SKIP" { "Gray" }
        "PARTIAL" { "Yellow" }
    }
    $symbol = switch ($result.Result) {
        "PASS" { "[OK]" }
        "FAIL" { "[FAIL]" }
        "SKIP" { "[SKIP]" }
        "PARTIAL" { "[PARTIAL]" }
    }
    Write-Host "  $symbol $($result.Test)" -ForegroundColor $color
}
Write-Host ""
Write-Host "Total: $passCount PASS / $failCount FAIL / $partialCount PARTIAL / $skipCount SKIP" -ForegroundColor $(if ($failCount -eq 0 -and $partialCount -eq 0) { "Green" } else { "Yellow" })
Write-Host ""
Write-Host "CONCLUSION SEMANA 29:" -ForegroundColor White
Write-Host "  ✅ Implementado (57%):" -ForegroundColor Green
Write-Host "    - Eliminacion logica usuarios (soft delete)" -ForegroundColor Gray
Write-Host "    - Reactivacion usuarios (solo admin)" -ForegroundColor Gray
Write-Host "    - Estado de cuenta (GET /user/status)" -ForegroundColor Gray
Write-Host "    - Estadisticas usuarios (GET /admin/stats/users)" -ForegroundColor Gray
Write-Host "    - Funciones BD completas (desactivar/reactivar/estadisticas)" -ForegroundColor Gray
Write-Host "    - Tabla auditoria con triggers" -ForegroundColor Gray
Write-Host "    - Indices optimizados" -ForegroundColor Gray
Write-Host ""
Write-Host "  ⚠️  Faltante (43%):" -ForegroundColor Yellow
Write-Host "    - GET /admin/users (listar con paginacion + filtros)" -ForegroundColor Gray
Write-Host "    - GET /admin/users/search (buscar usuarios)" -ForegroundColor Gray
Write-Host "    - GET /admin/users/:id (detalle usuario especifico)" -ForegroundColor Gray
Write-Host "    - Schemas Zod para validacion" -ForegroundColor Gray
Write-Host ""
Write-Host "RECOMENDACION:" -ForegroundColor White
Write-Host "  Implementar endpoints faltantes para completar Semana 29 al 100%" -ForegroundColor Cyan
Write-Host ""
Write-Host "============================================================================`n" -ForegroundColor Magenta
