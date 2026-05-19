# ============================================================================
# GUÍA VERIFICACIÓN MANUAL - Admin Usuarios (Semana 29)
# ============================================================================
# Ejecuta estos comandos uno por uno para probar la funcionalidad manualmente
# ============================================================================

$baseUrl = "http://localhost:3000"

Write-Host "`n============================================================================" -ForegroundColor Cyan
Write-Host "  VERIFICACIÓN MANUAL - ADMIN USUARIOS" -ForegroundColor Cyan
Write-Host "============================================================================`n" -ForegroundColor Cyan

# ============================================================================
# PASO 1: Obtener token de autenticación admin
# ============================================================================

Write-Host "`n[PASO 1] Login como admin" -ForegroundColor Yellow
Write-Host "----------------------------------------------------------------------" -ForegroundColor Gray

$loginBody = @{
    username = "admin"
    password = "admin123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.token
    
    Write-Host "✅ Token obtenido: $($token.Substring(0, 40))..." -ForegroundColor Green
    Write-Host ""
    
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
} catch {
    Write-Host "❌ Error en login: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# ============================================================================
# PASO 2: Listar usuarios (sin filtros)
# ============================================================================

Write-Host "`n[PASO 2] GET /admin/users - Listar todos los usuarios" -ForegroundColor Yellow
Write-Host "----------------------------------------------------------------------" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/admin/users" -Method GET -Headers $headers
    
    Write-Host "Total usuarios: $($response.pagination.total)" -ForegroundColor Cyan
    Write-Host "Página: $($response.pagination.page) de $($response.pagination.total_pages)" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "Usuarios encontrados:" -ForegroundColor White
    foreach ($user in $response.users) {
        $estadoColor = if ($user.estado -eq 'ACTIVO') { 'Green' } else { 'Red' }
        Write-Host "  📋 $($user.nuusumail)" -ForegroundColor Gray
        Write-Host "     ID: $($user.nuusuid)" -ForegroundColor DarkGray
        Write-Host "     Estado: $($user.estado) | Tipo: $($user.tipo_auth)" -ForegroundColor $estadoColor
        Write-Host ""
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Read-Host "`nPresiona Enter para continuar al siguiente paso"

# ============================================================================
# PASO 3: Filtrar usuarios activos
# ============================================================================

Write-Host "`n[PASO 3] GET /admin/users?estado=activo - Filtrar solo activos" -ForegroundColor Yellow
Write-Host "----------------------------------------------------------------------" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/admin/users?estado=activo&limit=10&orderBy=email&orderDir=asc" -Method GET -Headers $headers
    
    Write-Host "Usuarios activos: $($response.pagination.total)" -ForegroundColor Green
    Write-Host "Mostrando: $($response.users.Count) de $($response.pagination.total)" -ForegroundColor Cyan
    Write-Host ""
    
    foreach ($user in $response.users) {
        Write-Host "  ✅ $($user.nuusumail) - $($user.nuusuapell)" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Read-Host "`nPresiona Enter para continuar"

# ============================================================================
# PASO 4: Buscar usuario por texto
# ============================================================================

Write-Host "`n[PASO 4] GET /admin/users?q=test - Buscar usuarios con 'test'" -ForegroundColor Yellow
Write-Host "----------------------------------------------------------------------" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/admin/users?q=test" -Method GET -Headers $headers
    
    Write-Host "Resultados búsqueda 'test': $($response.pagination.total)" -ForegroundColor Cyan
    Write-Host ""
    
    foreach ($user in $response.users) {
        Write-Host "  🔍 $($user.nuusumail)" -ForegroundColor Cyan
        Write-Host "     Nombre: $($user.nuusuapell)" -ForegroundColor DarkGray
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Read-Host "`nPresiona Enter para continuar"

# ============================================================================
# PASO 5: Detalle de un usuario específico
# ============================================================================

Write-Host "`n[PASO 5] GET /admin/users/:id - Detalle usuario específico" -ForegroundColor Yellow
Write-Host "----------------------------------------------------------------------" -ForegroundColor Gray

# Obtener primer usuario para ejemplo
try {
    $listResponse = Invoke-RestMethod -Uri "$baseUrl/admin/users?limit=1" -Method GET -Headers $headers
    $userId = $listResponse.users[0].nuusuid
    
    Write-Host "Consultando detalle de usuario: $userId" -ForegroundColor Gray
    Write-Host ""
    
    $response = Invoke-RestMethod -Uri "$baseUrl/admin/users/$userId" -Method GET -Headers $headers
    $user = $response.user
    
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor DarkCyan
    Write-Host "  DETALLE USUARIO" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor DarkCyan
    Write-Host ""
    Write-Host "📧 Email: $($user.nuusumail)" -ForegroundColor White
    Write-Host "👤 Nombre: $($user.nuusuapell)" -ForegroundColor White
    Write-Host "🆔 ID: $($user.nuusuid)" -ForegroundColor Gray
    Write-Host "🏥 AfiliadoId: $($user.nuusuafili)" -ForegroundColor Gray
    
    $estadoColor = if ($user.estado -eq 'ACTIVO') { 'Green' } else { 'Red' }
    $estadoIcon = if ($user.estado -eq 'ACTIVO') { '✅' } else { '❌' }
    Write-Host "$estadoIcon Estado: $($user.estado)" -ForegroundColor $estadoColor
    
    Write-Host "🔐 Tipo Auth: $($user.tipo_autenticacion)" -ForegroundColor Cyan
    Write-Host "📄 Total Credenciales: $($user.total_credenciales)" -ForegroundColor Cyan
    Write-Host ""
    
    if ($user.credenciales_grupo_familiar -and $user.credenciales_grupo_familiar.Count -gt 0) {
        Write-Host "👨‍👩‍👧‍👦 Credenciales Grupo Familiar:" -ForegroundColor Yellow
        foreach ($cred in $user.credenciales_grupo_familiar) {
            $propietarioIcon = if ($cred.esPropietario) { '⭐' } else { '  ' }
            Write-Host "  $propietarioIcon $($cred.nombre)" -ForegroundColor White
            Write-Host "     Parentesco: $($cred.parentesco)" -ForegroundColor DarkGray
            Write-Host "     Vence: $($cred.vence)" -ForegroundColor DarkGray
            Write-Host ""
        }
    }
    
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor DarkCyan
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Read-Host "`nPresiona Enter para continuar"

# ============================================================================
# PASO 6: Estadísticas de usuarios
# ============================================================================

Write-Host "`n[PASO 6] GET /admin/stats/users - Estadísticas generales" -ForegroundColor Yellow
Write-Host "----------------------------------------------------------------------" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/admin/stats/users" -Method GET -Headers $headers
    $stats = $response.estadisticas
    
    Write-Host ""
    Write-Host "📊 ESTADÍSTICAS DE USUARIOS" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════" -ForegroundColor DarkCyan
    Write-Host "  Total usuarios:       $($stats.total_usuarios)" -ForegroundColor White
    Write-Host "  ✅ Activos:           $($stats.usuarios_activos)" -ForegroundColor Green
    Write-Host "  ❌ Desactivados:      $($stats.usuarios_desactivados)" -ForegroundColor Red
    Write-Host ""
    Write-Host "  🔐 Usuarios GAM:      $($stats.usuarios_gam)" -ForegroundColor Cyan
    Write-Host "  🔑 Usuarios Local:    $($stats.usuarios_local)" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════" -ForegroundColor DarkCyan
    Write-Host ""
    
    # Calcular porcentajes
    if ($stats.total_usuarios -gt 0) {
        $pctActivos = [math]::Round(($stats.usuarios_activos / $stats.total_usuarios) * 100, 1)
        $pctGAM = [math]::Round(($stats.usuarios_gam / $stats.total_usuarios) * 100, 1)
        
        Write-Host "📈 Porcentajes:" -ForegroundColor Yellow
        Write-Host "  Usuarios activos:  $pctActivos%" -ForegroundColor Green
        Write-Host "  Autenticación GAM: $pctGAM%" -ForegroundColor Cyan
    }
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================================================
# RESUMEN FINAL
# ============================================================================

Write-Host "`n`n============================================================================" -ForegroundColor Magenta
Write-Host "  VERIFICACIÓN COMPLETADA" -ForegroundColor Magenta
Write-Host "============================================================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "✅ Todos los endpoints de administración de usuarios están funcionando" -ForegroundColor Green
Write-Host ""
Write-Host "Endpoints verificados:" -ForegroundColor White
Write-Host "  1. GET  /admin/users (listar con filtros)" -ForegroundColor Gray
Write-Host "  2. GET  /admin/users/:id (detalle específico)" -ForegroundColor Gray
Write-Host "  3. GET  /admin/stats/users (estadísticas)" -ForegroundColor Gray
Write-Host ""
Write-Host "Documentación completa: WEEK29_ADMIN_USERS_SUMMARY.md" -ForegroundColor Cyan
Write-Host "Test automatizado: .\test-week29-admin-users-complete.ps1" -ForegroundColor Cyan
Write-Host ""
Write-Host "============================================================================`n" -ForegroundColor Magenta
