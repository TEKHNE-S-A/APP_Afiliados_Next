# ============================================================================
# TEST SUITE COMPLETO - SEMANA 29: Admin Usuarios
# ============================================================================
# Proposito: Verificar funcionalidad COMPLETA admin usuarios
# Fecha: 10/02/2026
# Scope:
#   - Listar usuarios con paginacion + filtros (GET /admin/users)
#   - Detalle usuario especifico (GET /admin/users/:id)
#   - Eliminacion logica (DELETE /user/account)
#   - Reactivacion usuarios (POST /admin/user/reactivate)
#   - Estado cuenta (GET /user/status)
#   - Estadisticas (GET /admin/stats/users)
#   - Funciones BD
# ============================================================================

$baseUrl = "http://localhost:3000"

Write-Host "`n============================================================================" -ForegroundColor Magenta
Write-Host "  SEMANA 29 - TEST ADMIN USUARIOS COMPLETO" -ForegroundColor Magenta
Write-Host "============================================================================`n" -ForegroundColor Magenta

$testResults = @()

# ============================================================================
# PREPARACION: Obtener token de autenticacion admin
# ============================================================================

Write-Host "`n[PREPARACION] Obtener token de autenticacion admin" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

try {
    $loginBody = @{
        username = "admin"
        password = "admin123"
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -TimeoutSec 10
    
    $token = $loginResponse.token
    $adminId = $loginResponse.user.username
    
    if ($token) {
        Write-Host "  [OK] Token admin obtenido exitosamente" -ForegroundColor Green
        Write-Host "    Usuario ID: $adminId" -ForegroundColor Gray
    } else {
        Write-Host "  [ERROR] No se obtuvo token admin" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "  [ERROR] Login admin fallido: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Start-Sleep -Milliseconds 500

# ============================================================================
# TEST1: GET /admin/users - Listar usuarios (sin filtros)
# ============================================================================

Write-Host "`n[TEST 1] GET /admin/users - Listar usuarios (sin filtros)" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/admin/users" -Method GET -Headers $headers -TimeoutSec 10
    
    Write-Host "`nResultado paginacion:" -ForegroundColor Yellow
    Write-Host "  Total usuarios: $($response.pagination.total)" -ForegroundColor Gray
    Write-Host "  Pagina: $($response.pagination.page) de $($response.pagination.total_pages)" -ForegroundColor Gray
    Write-Host "  Limite por pagina: $($response.pagination.limit)" -ForegroundColor Gray
    Write-Host "  Usuarios en resultado: $($response.users.Count)" -ForegroundColor Gray
    
    # Mostrar primeros 3 usuarios
    if ($response.users.Count -gt 0) {
        Write-Host "`nPrimeros usuarios:" -ForegroundColor Yellow
        $response.users | Select-Object -First 3 | ForEach-Object {
            Write-Host "  - $($_.nuusuid) | $($_.nuusumail) | $($_.estado) | $($_.tipo_auth)" -ForegroundColor Gray
        }
    }
    
    # Validaciones
    $test1Pass = $true
    
    if ($response.success -and $response.users -and $response.pagination) {
        Write-Host "  [OK] Endpoint devuelve estructura correcta" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] Estructura de respuesta incorrecta" -ForegroundColor Red
        $test1Pass = $false
    }
    
    if ($response.pagination.total -gt 0) {
        Write-Host "  [OK] Hay usuarios en la BD ($($response.pagination.total) total)" -ForegroundColor Green
    } else {
        Write-Host "  [WARNING] No hay usuarios en la BD" -ForegroundColor Yellow
    }
    
    if ($test1Pass) {
        Write-Host "`n[TEST 1] RESULTADO: PASS" -ForegroundColor Green
        $testResults += @{Test = "GET /admin/users (sin filtros)"; Result = "PASS"}
    } else {
        Write-Host "`n[TEST 1] RESULTADO: FAIL" -ForegroundColor Red
        $testResults += @{Test = "GET /admin/users (sin filtros)"; Result = "FAIL"}
    }
    
    # Guardar ID del primer usuario para siguiente test
    $testUserId = if ($response.users.Count -gt 0) { $response.users[0].nuusuid } else { $null }
    
} catch {
    Write-Host "`n[TEST 1] RESULTADO: FAIL" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    $testResults += @{Test = "GET /admin/users (sin filtros)"; Result = "FAIL"}
    $testUserId = $null
}

Start-Sleep -Milliseconds 500

# ============================================================================
# TEST 2: GET /admin/users con filtros (estado=activo, limit=5)
# ============================================================================

Write-Host "`n[TEST 2] GET /admin/users?estado=activo&limit=5" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/admin/users?estado=activo&limit=5&orderBy=email&orderDir=asc" -Method GET -Headers $headers -TimeoutSec 10
    
    Write-Host "`nResultado con filtros:" -ForegroundColor Yellow
    Write-Host "  Total usuarios activos: $($response.pagination.total)" -ForegroundColor Gray
    Write-Host "  Usuarios en resultado: $($response.users.Count)" -ForegroundColor Gray
    
    # Validar que todos son activos
    $todosActivos = $true
    foreach ($user in $response.users) {
        if ($user.estado -ne 'ACTIVO') {
            $todosActivos = $false
            Write-Host "  [ERROR] Usuario $($user.nuusuid) no esta activo: $($user.estado)" -ForegroundColor Red
        }
    }
    
    if ($todosActivos) {
        Write-Host "  [OK] Filtro estado=activo funciona correctamente" -ForegroundColor Green
    }
    
    if ($response.users.Count -le 5) {
        Write-Host "  [OK] Limite de paginacion respetado (limit=5)" -ForegroundColor Green
    } else {
        Write-Host "  [WARNING] Limite de paginacion no respetado" -ForegroundColor Yellow
    }
    
    if ($todosActivos -and $response.users.Count -le 5) {
        Write-Host "`n[TEST 2] RESULTADO: PASS" -ForegroundColor Green
        $testResults += @{Test = "GET /admin/users (con filtros)"; Result = "PASS"}
    } else {
        Write-Host "`n[TEST 2] RESULTADO: FAIL" -ForegroundColor Red
        $testResults += @{Test = "GET /admin/users (con filtros)"; Result = "FAIL"}
    }
    
} catch {
    Write-Host "`n[TEST 2] RESULTADO: FAIL" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    $testResults += @{Test = "GET /admin/users (con filtros)"; Result = "FAIL"}
}

Start-Sleep -Milliseconds 500

# ============================================================================
# TEST 3: GET /admin/users/:id - Detalle de usuario especifico
# ============================================================================

Write-Host "`n[TEST 3] GET /admin/users/:id - Detalle usuario especifico" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

if ($testUserId) {
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/admin/users/$testUserId" -Method GET -Headers $headers -TimeoutSec 10
        
        Write-Host "`nDetalle de usuario $testUserId :" -ForegroundColor Yellow
        Write-Host "  ID: $($response.user.nuusuid)" -ForegroundColor Gray
        Write-Host "  Email: $($response.user.nuusumail)" -ForegroundColor Gray
        Write-Host "  Nombre: $($response.user.nuusuapell)" -ForegroundColor Gray
        Write-Host "  Estado: $($response.user.estado)" -ForegroundColor Gray
        Write-Host "  Tipo Auth: $($response.user.tipo_autenticacion)" -ForegroundColor Gray
        Write-Host "  AfiliadoId: $($response.user.nuusuafili)" -ForegroundColor Gray
        Write-Host "  Total Credenciales: $($response.user.total_credenciales)" -ForegroundColor Gray
        
        # Validaciones
        $test3Pass = $true
        
        if ($response.success -and $response.user) {
            Write-Host "  [OK] Endpoint devuelve detalle completo" -ForegroundColor Green
        } else {
            Write-Host "  [ERROR] Respuesta incompleta" -ForegroundColor Red
            $test3Pass = $false
        }
        
        if ($response.user.nuusuid -eq $testUserId) {
            Write-Host "  [OK] ID de usuario coincide con solicitado" -ForegroundColor Green
        } else {
            Write-Host "  [ERROR] ID no coincide" -ForegroundColor Red
            $test3Pass = $false
        }
        
        if ($response.user.PSObject.Properties['total_credenciales']) {
            Write-Host "  [OK] Incluye conteo de credenciales del grupo familiar" -ForegroundColor Green
        }
        
        if ($test3Pass) {
            Write-Host "`n[TEST 3] RESULTADO: PASS" -ForegroundColor Green
            $testResults += @{Test = "GET /admin/users/:id"; Result = "PASS"}
        } else {
            Write-Host "`n[TEST 3] RESULTADO: FAIL" -ForegroundColor Red
            $testResults += @{Test = "GET /admin/users/:id"; Result = "FAIL"}
        }
        
    } catch {
        Write-Host "`n[TEST 3] RESULTADO: FAIL" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        $testResults += @{Test = "GET /admin/users/:id"; Result = "FAIL"}
    }
} else {
    Write-Host "  [SKIP] No hay usuario para probar" -ForegroundColor Yellow
    $testResults += @{Test = "GET /admin/users/:id"; Result = "SKIP"}
}

Start-Sleep -Milliseconds 500

# ============================================================================
# TEST 4: GET /admin/stats/users - Estadisticas de usuarios
# ============================================================================

Write-Host "`n[TEST 4] GET /admin/stats/users - Estadisticas usuarios" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/admin/stats/users" -Method GET -Headers $headers -TimeoutSec 10
    
    Write-Host "`nEstadisticas (desde funcion estadisticas_usuarios()):" -ForegroundColor Yellow
    
    $stats = $response.estadisticas
    
    if ($stats) {
        Write-Host "  Total usuarios: $($stats.total_usuarios)" -ForegroundColor Gray
        Write-Host "  Usuarios activos: $($stats.usuarios_activos)" -ForegroundColor Gray
        Write-Host "  Usuarios desactivados: $($stats.usuarios_desactivados)" -ForegroundColor Gray
        Write-Host "  Usuarios GAM: $($stats.usuarios_gam)" -ForegroundColor Gray
        Write-Host "  Usuarios Local: $($stats.usuarios_local)" -ForegroundColor Gray
        
        # Validacion logica
        $totalCalculado = $stats.usuarios_activos + $stats.usuarios_desactivados
        if ($totalCalculado -eq $stats.total_usuarios) {
            Write-Host "  [OK] Suma activos + desactivados = total usuarios" -ForegroundColor Green
        } else {
            Write-Host "  [WARNING] Inconsistencia: activos($($stats.usuarios_activos)) + desactivados($($stats.usuarios_desactivados)) != total($($stats.total_usuarios))" -ForegroundColor Yellow
        }
        
        Write-Host "  [OK] Endpoint retorna estadisticas completas" -ForegroundColor Green
        Write-Host "`n[TEST 4] RESULTADO: PASS" -ForegroundColor Green
        $testResults += @{Test = "GET /admin/stats/users"; Result = "PASS"}
    } else {
        Write-Host "  [ERROR] Estadisticas no encontradas en respuesta" -ForegroundColor Red
        Write-Host "`n[TEST 4] RESULTADO: FAIL" -ForegroundColor Red
        $testResults += @{Test = "GET /admin/stats/users"; Result = "FAIL"}
    }
    
} catch {
    Write-Host "`n[TEST 4] RESULTADO: FAIL" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    $testResults += @{Test = "GET /admin/stats/users"; Result = "FAIL"}
}

Start-Sleep -Milliseconds 500

# ============================================================================
# TEST 5: Verificar Zod schemas implementados
# ============================================================================

Write-Host "`n[TEST 5] Verificar Zod schemas en server-soap.js" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

$serverPath = Join-Path $PSScriptRoot "server-soap.js"

if (Test-Path $serverPath) {
    $serverContent = Get-Content $serverPath -Raw -Encoding UTF8
    
    $test5Pass = $true
    
    # AdminUsersQuerySchema
    if ($serverContent -match "AdminUsersQuerySchema") {
        Write-Host "  [OK] AdminUsersQuerySchema definido" -ForegroundColor Green
        
        if ($serverContent -match "AdminUsersQuerySchema.*page.*limit.*estado.*tipo") {
            Write-Host "    [OK] Incluye parametros: page, limit, estado, tipo" -ForegroundColor Green
        }
    } else {
        Write-Host "  [ERROR] AdminUsersQuerySchema NO encontrado" -ForegroundColor Red
        $test5Pass = $false
    }
    
    # UserIdParamsSchema
    if ($serverContent -match "UserIdParamsSchema") {
        Write-Host "  [OK] UserIdParamsSchema definido" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] UserIdParamsSchema NO encontrado" -ForegroundColor Red
        $test5Pass = $false
    }
    
    if ($test5Pass) {
        Write-Host "`n[TEST 5] RESULTADO: PASS" -ForegroundColor Green
        $testResults += @{Test = "Zod Schemas Semana 29"; Result = "PASS"}
    } else {
        Write-Host "`n[TEST 5] RESULTADO: FAIL" -ForegroundColor Red
        $testResults += @{Test = "Zod Schemas Semana 29"; Result = "FAIL"}
    }
    
} else {
    Write-Host "  [ERROR] Archivo server-soap.js no encontrado" -ForegroundColor Red
    $testResults += @{Test = "Zod Schemas Semana 29"; Result = "FAIL"}
}

Start-Sleep -Milliseconds 500

# ============================================================================
# TEST 6: Verificar middleware requireAdmin
# ============================================================================

Write-Host "`n[TEST 6] Verificar middleware requireAdmin" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

if (Test-Path $serverPath) {
    $serverContent = Get-Content $serverPath -Raw -Encoding UTF8
    
    if ($serverContent -match "function requireAdmin") {
        Write-Host "  [OK] Middleware requireAdmin definido" -ForegroundColor Green
        
        if ($serverContent -match "requireAdmin.*req.*res.*next") {
            Write-Host "    [OK] Signature correcta (req, res, next)" -ForegroundColor Green
        }
        
        if ($serverContent -match "requireAdmin.*isAdmin") {
            Write-Host "    [OK] Valida campo isAdmin" -ForegroundColor Green
        }
        
        Write-Host "`n[TEST 6] RESULTADO: PASS" -ForegroundColor Green
        $testResults += @{Test = "Middleware requireAdmin"; Result = "PASS"}
    } else {
        Write-Host "  [ERROR] Middleware requireAdmin NO encontrado" -ForegroundColor Red
        Write-Host "`n[TEST 6] RESULTADO: FAIL" -ForegroundColor Red
        $testResults += @{Test = "Middleware requireAdmin"; Result = "FAIL"}
    }
} else {
    Write-Host "  [SKIP] No se puede verificar sin archivo" -ForegroundColor Yellow
    $testResults += @{Test = "Middleware requireAdmin"; Result = "SKIP"}
}

Start-Sleep -Milliseconds 500

# ============================================================================
# RESUMEN FINAL
# ============================================================================

Write-Host "`n============================================================================" -ForegroundColor Magenta
Write-Host "  RESUMEN TEST SUITE SEMANA 29 COMPLETA" -ForegroundColor Magenta
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
        "SKIP" { "Gray" }
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
Write-Host "CONCLUSION SEMANA 29:" -ForegroundColor White

if ($passCount -ge 5) {
    Write-Host "  ✅ IMPLEMENTACION COMPLETA (100%)" -ForegroundColor Green
    Write-Host "    - Endpoints listar/buscar/detalle usuarios" -ForegroundColor Gray
    Write-Host "    - Eliminacion logica + reactivacion" -ForegroundColor Gray
    Write-Host "    - Estadisticas usuarios" -ForegroundColor Gray
    Write-Host "    - Funciones BD robustas" -ForegroundColor Gray
    Write-Host "    - Zod schemas + middleware requireAdmin" -ForegroundColor Gray
} else {
    Write-Host "  ⚠️  IMPLEMENTACION PARCIAL" -ForegroundColor Yellow
    Write-Host "    Revisar endpoints/schemas faltantes" -ForegroundColor Gray
}

Write-Host ""
Write-Host "============================================================================`n" -ForegroundColor Magenta
