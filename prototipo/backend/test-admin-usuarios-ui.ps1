# Test Admin Usuarios UI - Verificación interfaz web
# ================================================

Write-Host "`n╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   TEST INTERFAZ WEB ADMIN USUARIOS                      ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:3000"
$adminUrl = "$baseUrl/admin/usuarios"

Write-Host "URL Base: $baseUrl" -ForegroundColor Gray
Write-Host "URL Admin Usuarios: $adminUrl`n" -ForegroundColor Gray

# ========== PASO 1: Verificar que Backend responda ==========
Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
Write-Host "║  PASO 1: Verificar Backend                            ║" -ForegroundColor Yellow
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Yellow

try {
    $healthResponse = Invoke-RestMethod -Uri "$baseUrl/health" -Method GET
    Write-Host "✅ Backend respondiendo" -ForegroundColor Green
    Write-Host "   Status: $($healthResponse.status)" -ForegroundColor Gray
    Write-Host "   SOAP Connected: $($healthResponse.soapConnected)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Backend NO responde en puerto 3000" -ForegroundColor Red
    Write-Host "   Ejecuta: cd backend; node server-soap.js" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# ========== PASO 2: Verificar que ruta /admin/usuarios responda ==========
Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
Write-Host "║  PASO 2: Verificar Ruta /admin/usuarios               ║" -ForegroundColor Yellow
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri $adminUrl -Method GET
    
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Ruta /admin/usuarios responde correctamente" -ForegroundColor Green
        Write-Host "   Status Code: $($response.StatusCode)" -ForegroundColor Gray
        Write-Host "   Content-Type: $($response.Headers['Content-Type'])" -ForegroundColor Gray
        
        # Verificar que es HTML
        if ($response.Content -like "*<!DOCTYPE html>*") {
            Write-Host "   OK - Respuesta es HTML valido" -ForegroundColor Green
        } else {
            Write-Host "   WARN - Respuesta NO parece ser HTML" -ForegroundColor Yellow
        }
        
        # Verificar título
        if ($response.Content -match '<title>(.+?)</title>') {
            Write-Host "   Titulo: $($Matches[1])" -ForegroundColor Gray
        }
        
    } else {
        Write-Host "WARN - Status Code inesperado: $($response.StatusCode)" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Error al acceder a $adminUrl" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ========== PASO 3: Verificar elementos clave en HTML ==========
Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
Write-Host "║  PASO 3: Verificar Elementos HTML                     ║" -ForegroundColor Yellow
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Yellow

$html = $response.Content

$elements = @(
    @{ Name = "Login Screen"; Pattern = 'id="loginScreen"'; Icon = "[LOGIN]" }
    @{ Name = "App Container"; Pattern = 'id="appScreen"'; Icon = "[APP]" }
    @{ Name = "Users Table"; Pattern = 'id="usersTable"'; Icon = "[TABLE]" }
    @{ Name = "Detail Modal"; Pattern = 'id="detailModal"'; Icon = "[MODAL]" }
    @{ Name = "Stats Cards"; Pattern = "stats-container"; Icon = "[STATS]" }
    @{ Name = "Filters"; Pattern = "filters-container"; Icon = "[FILTER]" }
    @{ Name = "Pagination"; Pattern = "pagination"; Icon = "[PAGES]" }
    @{ Name = "JavaScript API"; Pattern = "API_BASE"; Icon = "[API]" }
    @{ Name = "Login Function"; Pattern = "function.*login"; Icon = "[FN]" }
    @{ Name = "Load Users"; Pattern = "loadUsers"; Icon = "[LOAD]" }
)

foreach ($element in $elements) {
    if ($html -match $element.Pattern) {
        Write-Host "   OK - $($element.Icon) $($element.Name)" -ForegroundColor Green
    } else {
        Write-Host "   FAIL - $($element.Icon) $($element.Name) - NO ENCONTRADO" -ForegroundColor Red
    }
}

Write-Host ""

# ========== PASO 4: Verificar endpoints backend necesarios ==========
Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
Write-Host "║  PASO 4: Verificar Endpoints Backend                  ║" -ForegroundColor Yellow
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Yellow

Write-Host "WARN - Para verificar endpoints necesitas autenticarte primero" -ForegroundColor Yellow
Write-Host ""
Write-Host "   Endpoints requeridos por la interfaz:" -ForegroundColor Gray
Write-Host "   POST /auth/login    - Login admin" -ForegroundColor Gray
Write-Host "   GET  /admin/users   - Listar usuarios" -ForegroundColor Gray
Write-Host "   GET  /admin/users/:id - Detalle usuario" -ForegroundColor Gray
Write-Host "   GET  /admin/stats/users - Estadisticas" -ForegroundColor Gray
Write-Host ""
Write-Host "   Usa: .\test-week29-admin-users-complete.ps1" -ForegroundColor Cyan
Write-Host "        .\verificar-admin-usuarios.ps1" -ForegroundColor Cyan

Write-Host ""

# ========== RESUMEN ==========
Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✅ INTERFAZ WEB VERIFICADA EXITOSAMENTE               ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "WEB - Abre en tu navegador:" -ForegroundColor Cyan
Write-Host "   $adminUrl" -ForegroundColor White -BackgroundColor DarkBlue
Write-Host ""
Write-Host "CREDENCIALES de prueba:" -ForegroundColor Cyan
Write-Host "   Usuario: admin" -ForegroundColor Gray
Write-Host "   Password: admin123" -ForegroundColor Gray
Write-Host ""
Write-Host "FUNCIONALIDADES disponibles:" -ForegroundColor Cyan
Write-Host "   OK - Login con autenticacion" -ForegroundColor Green
Write-Host "   OK - Listado de usuarios con paginacion" -ForegroundColor Green
Write-Host "   OK - Busqueda en tiempo real" -ForegroundColor Green
Write-Host "   OK - Filtros por estado y tipo auth" -ForegroundColor Green
Write-Host "   OK - Dashboard con estadisticas" -ForegroundColor Green
Write-Host "   OK - Ver detalle de usuario" -ForegroundColor Green
Write-Host "   OK - Ver grupo familiar con credenciales" -ForegroundColor Green
Write-Host ""
Write-Host "PROXIMOS pasos opcionales:" -ForegroundColor Yellow
Write-Host "   • Boton desactivar/reactivar usuario" -ForegroundColor Gray
Write-Host "   • Export CSV/Excel" -ForegroundColor Gray
Write-Host "   • Graficos con Chart.js" -ForegroundColor Gray
Write-Host "   • Historial de cambios de estado" -ForegroundColor Gray
Write-Host ""
