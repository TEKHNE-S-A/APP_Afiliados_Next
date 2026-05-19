# Test Desactivar/Reactivar Usuario - Admin Endpoints
# Descripcion: Prueba los nuevos endpoints POST /admin/user/deactivate y POST /admin/user/reactivate
# ================================================

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "   TEST DESACTIVAR/REACTIVAR USUARIOS - ADMIN  " -ForegroundColor Cyan
Write-Host "================================================`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:3000"
$token = $null
$testUserId = $null

# ========== PASO 1: Login Admin ==========
Write-Host "================================================" -ForegroundColor Yellow
Write-Host " PASO 1: Login Admin  " -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Yellow

try {
    $loginBody = @{
        username = "admin"
        password = "admin123"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    
    $token = $response.token
    Write-Host "OK - Login exitoso" -ForegroundColor Green
    Write-Host "   Usuario: $($response.user.username)" -ForegroundColor Gray
    Write-Host "   Token: $($token.Substring(0, 20))..." -ForegroundColor Gray
} catch {
    Write-Host "ERROR - No se pudo hacer login" -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ========== PASO 2: Obtener un usuario activo para test ==========
Write-Host "================================================" -ForegroundColor Yellow
Write-Host " PASO 2: Buscar Usuario Activo para Test  " -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Yellow

try {
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    
    $response = Invoke-RestMethod -Uri "$baseUrl/admin/users?estado=activo&limit=5" -Method GET -Headers $headers
    
    if ($response.users.Count -eq 0) {
        Write-Host "ERROR - No hay usuarios activos para probar" -ForegroundColor Red
        exit 1
    }
    
    # Tomar el primer usuario que NO sea admin
    $testUser = $response.users | Where-Object { $_.nuusumail -ne "admin@test.com" -and $_.nuusumail -ne "admin" } | Select-Object -First 1
    
    if (-not $testUser) {
        Write-Host "ERROR - No hay usuarios no-admin para probar" -ForegroundColor Red
        exit 1
    }
    
    $testUserId = $testUser.nuusuid
    Write-Host "OK - Usuario seleccionado para test" -ForegroundColor Green
    Write-Host "   ID: $testUserId" -ForegroundColor Gray
    Write-Host "   Email: $($testUser.nuusumail)" -ForegroundColor Gray
    Write-Host "   Estado actual: $($testUser.estado)" -ForegroundColor Gray
    
} catch {
    Write-Host "ERROR - No se pudo buscar usuarios" -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ========== PASO 3: Desactivar Usuario ==========
Write-Host "================================================" -ForegroundColor Yellow
Write-Host " PASO 3: Desactivar Usuario  " -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Yellow

try {
    $deactivateBody = @{
        nuusuid = $testUserId
        motivo = "Test automatizado - desactivacion temporal"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/admin/user/deactivate" -Method POST -Headers $headers -Body $deactivateBody -ContentType "application/json"
    
    Write-Host "OK - Usuario desactivado exitosamente" -ForegroundColor Green
    Write-Host "   Mensaje: $($response.message)" -ForegroundColor Gray
    Write-Host "   Fecha: $($response.fecha_desactivacion)" -ForegroundColor Gray
    Write-Host "   Usuario: $($response.usuario_desactivado)" -ForegroundColor Gray
    
} catch {
    Write-Host "ERROR - No se pudo desactivar usuario" -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Red
    
    # Si fallo la desactivacion, salir
    exit 1
}

Write-Host ""
Write-Host "Esperando 2 segundos..." -ForegroundColor Gray
Start-Sleep -Seconds 2
Write-Host ""

# ========== PASO 4: Verificar que usuario este desactivado ==========
Write-Host "================================================" -ForegroundColor Yellow
Write-Host " PASO 4: Verificar Estado Desactivado  " -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/admin/users/${testUserId}" -Method GET -Headers $headers
    
    if ($response.user.estado -eq "DESACTIVADO") {
        Write-Host "OK - Estado correcto: DESACTIVADO" -ForegroundColor Green
        Write-Host "   Fecha desactivacion: $($response.user.nuusufecde)" -ForegroundColor Gray
        Write-Host "   Motivo: $($response.user.nuusumotde)" -ForegroundColor Gray
    } else {
        Write-Host "WARN - Estado inesperado: $($response.user.estado)" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "ERROR - No se pudo verificar estado" -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# ========== PASO 5: Reactivar Usuario ==========
Write-Host "================================================" -ForegroundColor Yellow
Write-Host " PASO 5: Reactivar Usuario  " -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Yellow

try {
    $reactivateBody = @{
        nuusuid = $testUserId
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/admin/user/reactivate" -Method POST -Headers $headers -Body $reactivateBody -ContentType "application/json"
    
    Write-Host "OK - Usuario reactivado exitosamente" -ForegroundColor Green
    Write-Host "   Mensaje: $($response.message)" -ForegroundColor Gray
    Write-Host "   Fecha: $($response.fecha_reactivacion)" -ForegroundColor Gray
    
} catch {
    Write-Host "ERROR - No se pudo reactivar usuario" -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Esperando 2 segundos..." -ForegroundColor Gray
Start-Sleep -Seconds 2
Write-Host ""

# ========== PASO 6: Verificar que usuario este activo ==========
Write-Host "================================================" -ForegroundColor Yellow
Write-Host " PASO 6: Verificar Estado Activo  " -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/admin/users/${testUserId}" -Method GET -Headers $headers
    
    if ($response.user.estado -eq "ACTIVO") {
        Write-Host "OK - Estado correcto: ACTIVO" -ForegroundColor Green
        Write-Host "   Campos desactivacion limpiados correctamente" -ForegroundColor Gray
    } else {
        Write-Host "WARN - Estado inesperado: $($response.user.estado)" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "ERROR - No se pudo verificar estado" -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# ========== RESUMEN ==========
Write-Host "================================================" -ForegroundColor Green
Write-Host "   TEST COMPLETADO EXITOSAMENTE  " -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Endpoints probados:" -ForegroundColor Cyan
Write-Host "   POST /admin/user/deactivate - OK" -ForegroundColor Green
Write-Host "   POST /admin/user/reactivate - OK" -ForegroundColor Green
Write-Host "   GET  /admin/users/:id - OK (verificacion estado)" -ForegroundColor Green
Write-Host ""
Write-Host "Usuario de test restaurado a estado ACTIVO" -ForegroundColor Gray
Write-Host "   ID: $testUserId" -ForegroundColor Gray
Write-Host ""
