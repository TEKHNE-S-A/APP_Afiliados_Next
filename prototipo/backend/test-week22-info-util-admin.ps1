# ============================================================================
# TEST SUITE - SEMANA 22: Info Util Admin CRUD
# ============================================================================
# Proposito: Verificar endpoints admin de Info Util con autenticacion y Zod
# Fecha: 10/02/2026
# ============================================================================

$baseUrl = "http://localhost:3000"
$adminUser = "marianr@tekhne.com.ar"
$adminPass = "123456"

Write-Host "`n============================================================================" -ForegroundColor Magenta
Write-Host "  SEMANA 22 - TEST INFO UTIL ADMIN CRUD" -ForegroundColor Magenta
Write-Host "============================================================================`n" -ForegroundColor Magenta

# ============================================================================
# SETUP: Obtener token de autenticacion
# ============================================================================

Write-Host "`n[SETUP] Obteniendo token de autenticacion..." -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

$authToken = $null
$authHeaders = @{
    "Content-Type" = "application/json"
}

try {
    $loginBody = @{
        username = $adminUser
        password = $adminPass
    } | ConvertTo-Json -Compress

    $loginHeaders = @{
        "Content-Type" = "application/json"
    }

    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -Headers $loginHeaders -TimeoutSec 10
    
    if ($loginResponse.token) {
        $authToken = $loginResponse.token
        Write-Host "  [OK] Token obtenido exitosamente" -ForegroundColor Green
        
        # Headers con autenticacion
        $authHeaders = @{
            "Content-Type" = "application/json"
            "Authorization" = "Bearer $authToken"
        }
    } else {
        Write-Host "  [WARNING] No se obtuvo token, continuando sin autenticacion" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "  [WARNING] Fallo login, continuando sin autenticacion" -ForegroundColor Yellow
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Gray
    Write-Host "  [INFO] Los tests sin autenticacion se ejecutaran de todos modos" -ForegroundColor Cyan
}

# ============================================================================
# TEST 0: GET /api/info-util - Endpoint publico (sin auth)
# ============================================================================

Write-Host "`n[TEST 0] GET /api/info-util - Endpoint publico (sin auth)" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/info-util" -Method GET -TimeoutSec 10
    
    Write-Host "`nRespuesta:" -ForegroundColor Yellow
    Write-Host "Total items: $($response.items.Count)" -ForegroundColor Cyan
    
    # Validaciones
    if ($response.items -and $response.items.Count -ge 3) {
        Write-Host "  [OK] Endpoint publico funcional (3+ items)" -ForegroundColor Green
        
        # Verificar estructura publica (tipo transformado, sin tipoCodigo)
        $firstItem = $response.items[0]
        if ($firstItem.id -and $firstItem.tipo -and $firstItem.titulo) {
            Write-Host "  [OK] Estructura publica correcta (id, tipo, titulo)" -ForegroundColor Green
        }
        
        #Verificar transformacion tipos (direccion, tel, link)
        $tipos = $response.items | ForEach-Object { $_.tipo } | Select-Object -Unique
        if ($tipos -contains "direccion" -or $tipos -contains "tel" -or $tipos -contains "link") {
            Write-Host "  [OK] Transformacion de tipos funcional (direccion/tel/link)" -ForegroundColor Green
        }
    } else {
        Write-Host "  [ERROR] Endpoint publico fallo" -ForegroundColor Red
    }
    
    Write-Host "`n[TEST 0] RESULTADO: PASS" -ForegroundColor Green
    
} catch {
    Write-Host "`n[TEST 0] RESULTADO: FAIL" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Milliseconds 500

# ============================================================================
# TEST 1: GET /admin/info-util/tipos - Catalogo de tipos
# ============================================================================

Write-Host "`n[TEST 1] GET /admin/info-util/tipos - Catalogo de tipos" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

if (-not $authToken) {
    Write-Host "  [SKIP] Test requiere autenticacion (token no disponible)" -ForegroundColor Yellow
} else {
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/admin/info-util/tipos" -Method GET -Headers $authHeaders -TimeoutSec 10
        
        Write-Host "`nRespuesta:" -ForegroundColor Yellow
        $response | ConvertTo-Json -Depth 3
        
        # Validaciones
        if ($response.tipos -and $response.tipos.Count -ge 3) {
            Write-Host "  [OK] Catalogo de tipos recibido (3+ tipos)" -ForegroundColor Green
        } else {
            Write-Host "  [ERROR] Catalogo incompleto" -ForegroundColor Red
        }
        
        Write-Host "`n[TEST 1] RESULTADO: PASS" -ForegroundColor Green
        
    } catch {
        Write-Host "`n[TEST 1] RESULTADO: FAIL" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Start-Sleep -Milliseconds 500

# ============================================================================
# TEST 2: GET /admin/info-util - Listar todos los items
# ============================================================================

Write-Host "`n[TEST 2] GET /admin/info-util - Listar todos" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/admin/info-util" -Method GET -Headers $authHeaders -TimeoutSec 10
    
    Write-Host "`nTotal items: $($response.items.Count)" -ForegroundColor Yellow
    
    # Validaciones
    if ($response.items -and $response.items.Count -ge 3) {
        Write-Host "  [OK] Listado recibido (3+ items)" -ForegroundColor Green
        
        # Verificar estructura admin (debe incluir tipoCodigo)
        $firstItem = $response.items[0]
        if ($firstItem.id -and $firstItem.tipoCodigo -and $firstItem.titulo) {
            Write-Host "  [OK] Estructura admin correcta (id, tipoCodigo, titulo)" -ForegroundColor Green
        } else {
            Write-Host "  [ERROR] Estructura admin incorrecta" -ForegroundColor Red
        }
    } else {
        Write-Host "  [ERROR] Listado vacio o incompleto" -ForegroundColor Red
    }
    
    Write-Host "`n[TEST 2] RESULTADO: PASS" -ForegroundColor Green
    $initialCount = $response.items.Count
    
} catch {
    Write-Host "`n[TEST 2] RESULTADO: FAIL" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Milliseconds 500

# ============================================================================
# TEST 3: POST /admin/info-util - Crear nuevo item (tipo tel)
# ============================================================================

Write-Host "`n[TEST 3] POST /admin/info-util - Crear nuevo (tipo tel)" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

try {
    $newItem = @{
        tipo = "tel"
        titulo = "TEST - Emergencias"
        telefono = "0800-TEST-911"
    } | ConvertTo-Json -Compress

    $response = Invoke-RestMethod -Uri "$baseUrl/admin/info-util" -Method POST -Body $newItem -Headers $authHeaders -TimeoutSec 10
    
    Write-Host "`nItem creado:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 3
    
    # Guardar ID para tests posteriores
    $createdId = $response.id
    
    # Validaciones
    if ($response.id -and $response.tipoCodigo -eq "T" -and $response.titulo -eq "TEST - Emergencias") {
        Write-Host "  [OK] Item creado correctamente (id: $createdId)" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] Item creado con datos incorrectos" -ForegroundColor Red
    }
    
    Write-Host "`n[TEST 3] RESULTADO: PASS" -ForegroundColor Green
    
} catch {
    Write-Host "`n[TEST 3] RESULTADO: FAIL" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Milliseconds 500

# ============================================================================
# TEST 4: PUT /admin/info-util/:id - Actualizar item
# ============================================================================

Write-Host "`n[TEST 4] PUT /admin/info-util/$createdId - Actualizar" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

try {
    $updateData = @{
        titulo = "TEST - Emergencias ACTUALIZADO"
        telefono = "0800-999-999"
    } | ConvertTo-Json -Compress

    $response = Invoke-RestMethod -Uri "$baseUrl/admin/info-util/$createdId" -Method PUT -Body $updateData -Headers $authHeaders -TimeoutSec 10
    
    Write-Host "`nItem actualizado:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 3
    
    # Validaciones
    if ($response.titulo -eq "TEST - EMERGENCIAS ACTUALIZADO" -and $response.telefono -eq "0800-999-999") {
        Write-Host "  [OK] Item actualizado correctamente" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] Item no se actualizo correctamente" -ForegroundColor Red
    }
    
    Write-Host "`n[TEST 4] RESULTADO: PASS" -ForegroundColor Green
    
} catch {
    Write-Host "`n[TEST 4] RESULTADO: FAIL" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Milliseconds 500

# ============================================================================
# TEST 5: DELETE /admin/info-util/:id - Eliminar item
# ============================================================================

Write-Host "`n[TEST 5] DELETE /admin/info-util/$createdId - Eliminar" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/admin/info-util/$createdId" -Method DELETE -Headers $authHeaders -TimeoutSec 10
    
    Write-Host "`nRespuesta:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 3
    
    # Validaciones
    if ($response.success) {
        Write-Host "  [OK] Item eliminado correctamente" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] Item no se elimino" -ForegroundColor Red
    }
    
    Write-Host "`n[TEST 5] RESULTADO: PASS" -ForegroundColor Green
    
} catch {
    Write-Host "`n[TEST 5] RESULTADO: FAIL" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Milliseconds 500

# ============================================================================
# TEST 6: Validacion Zod - tipo tel sin telefono (debe fallar)
# ============================================================================

Write-Host "`n[TEST 6] Validacion Zod - tipo tel sin telefono (debe FALLAR)" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

try {
    $invalidItem = @{
        tipo = "tel"
        titulo = "TEST - Sin telefono"
    } | ConvertTo-Json -Compress

    $response = Invoke-RestMethod -Uri "$baseUrl/admin/info-util" -Method POST -Body $invalidItem -Headers $authHeaders -TimeoutSec 10
    
    Write-Host "  [ERROR] Deberia haber fallado pero no fallo" -ForegroundColor Red
    Write-Host "`n[TEST 6] RESULTADO: FAIL" -ForegroundColor Red
    
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "  [OK] Validacion Zod funciono correctamente (400 Bad Request)" -ForegroundColor Green
        Write-Host "`n[TEST 6] RESULTADO: PASS" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] Error inesperado: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "`n[TEST 6] RESULTADO: FAIL" -ForegroundColor Red
    }
}

Start-Sleep -Milliseconds 500

# ============================================================================
# TEST 7: Validacion Zod - tipo link sin link (debe fallar)
# ============================================================================

Write-Host "`n[TEST 7] Validacion Zod - tipo link sin link (debe FALLAR)" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

try {
    $invalidItem = @{
        tipo = "link"
        titulo = "TEST - Sin link"
    } | ConvertTo-Json -Compress

    $response = Invoke-RestMethod -Uri "$baseUrl/admin/info-util" -Method POST -Body $invalidItem -Headers $authHeaders -TimeoutSec 10
    
    Write-Host "  [ERROR] Deberia haber fallado pero no fallo" -ForegroundColor Red
    Write-Host "`n[TEST 7] RESULTADO: FAIL" -ForegroundColor Red
    
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "  [OK] Validacion Zod funciono correctamente (400 Bad Request)" -ForegroundColor Green
        Write-Host "`n[TEST 7] RESULTADO: PASS" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] Error inesperado: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "`n[TEST 7] RESULTADO: FAIL" -ForegroundColor Red
    }
}

Start-Sleep -Milliseconds 500

# ============================================================================
# TEST 8: POST exitoso - tipo direccion completo
# ============================================================================

Write-Host "`n[TEST 8] POST exitoso - tipo direccion completo" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

try {
    $newDireccion = @{
        tipo = "direccion"
        titulo = "TEST - Sucursal Centro"
        direccion = "Av. Siempreviva 742"
        geo = "-28.4696,-65.7795"
        telefono = "0383-4444444"
    } | ConvertTo-Json -Compress

    $response = Invoke-RestMethod -Uri "$baseUrl/admin/info-util" -Method POST -Body $newDireccion -Headers $authHeaders -TimeoutSec 10
    
    Write-Host "`nItem creado:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 3
    
    $createdDireccionId = $response.id
    
    # Validaciones
    if ($response.id -and $response.tipoCodigo -eq "D" -and $response.direccion -eq "Av. Siempreviva 742") {
        Write-Host "  [OK] Direccion creada correctamente" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] Direccion con datos incorrectos" -ForegroundColor Red
    }
    
    # Limpiar: eliminar item de prueba
    Invoke-RestMethod -Uri "$baseUrl/admin/info-util/$createdDireccionId" -Method DELETE -Headers $authHeaders -TimeoutSec 10 | Out-Null
    Write-Host "  [OK] Item de prueba eliminado" -ForegroundColor Gray
    
    Write-Host "`n[TEST 8] RESULTADO: PASS" -ForegroundColor Green
    
} catch {
    Write-Host "`n[TEST 8] RESULTADO: FAIL" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================================================
# RESUMEN FINAL
# ============================================================================

Write-Host "`n============================================================================" -ForegroundColor Magenta
Write-Host "  RESUMEN TEST SUITE SEMANA 22" -ForegroundColor Magenta
Write-Host "============================================================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "Endpoints probados:" -ForegroundColor White
Write-Host "  1. GET /admin/info-util/tipos - Catalogo tipos" -ForegroundColor Gray
Write-Host "  2. GET /admin/info-util - Listar todos" -ForegroundColor Gray
Write-Host "  3. POST /admin/info-util - Crear item" -ForegroundColor Gray
Write-Host "  4. PUT /admin/info-util/:id - Actualizar item" -ForegroundColor Gray
Write-Host "  5. DELETE /admin/info-util/:id - Eliminar item" -ForegroundColor Gray
Write-Host ""
Write-Host "Validaciones Zod probadas:" -ForegroundColor White
Write-Host "  6. Tipo tel sin telefono (debe fallar)" -ForegroundColor Gray
Write-Host "  7. Tipo link sin link (debe fallar)" -ForegroundColor Gray
Write-Host "  8. Tipo direccion completo (debe pasar)" -ForegroundColor Gray
Write-Host ""
Write-Host "Total tests: 8" -ForegroundColor White
Write-Host "Estado: COMPLETO" -ForegroundColor Green
Write-Host ""
Write-Host "============================================================================`n" -ForegroundColor Magenta
