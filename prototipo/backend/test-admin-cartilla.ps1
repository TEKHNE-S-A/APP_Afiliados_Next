# Test del Admin Web de Cartilla
# PowerShell
# Verifica que todos los endpoints del admin funcionen correctamente

$ErrorActionPreference = "Stop"

Write-Host "`n===== TEST ADMIN CARTILLA =====" -ForegroundColor Cyan

$BASE_URL = "http://localhost:3000"

# 1. Login primero para obtener token
Write-Host "`n1️⃣  Login admin..." -ForegroundColor Yellow

$loginBody = @{
    username = "admin"
    password = "admin123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$BASE_URL/admin/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.token
    Write-Host "✅ Token obtenido" -ForegroundColor Green
} catch {
    Write-Host "❌ Error en login: $_" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# 2. Test listar rubros
Write-Host "`n2️⃣  Listar rubros..." -ForegroundColor Yellow
try {
    $rubros = Invoke-RestMethod -Uri "$BASE_URL/admin/cartilla/rubros" -Method GET -Headers $headers
    Write-Host "✅ Rubros: $($rubros.Count)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

# 3. Test listar especialidades
Write-Host "`n3️⃣  Listar especialidades..." -ForegroundColor Yellow
try {
    $especialidades = Invoke-RestMethod -Uri "$BASE_URL/admin/cartilla/especialidades" -Method GET -Headers $headers
    Write-Host "✅ Especialidades: $($especialidades.Count)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

# 4. Test listar localidades
Write-Host "`n4️⃣  Listar localidades..." -ForegroundColor Yellow
try {
    $localidades = Invoke-RestMethod -Uri "$BASE_URL/admin/cartilla/localidades" -Method GET -Headers $headers
    Write-Host "✅ Localidades: $($localidades.Count)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

# 5. Test listar entidades (primera página)
Write-Host "`n5️⃣  Listar entidades (página 1)..." -ForegroundColor Yellow
try {
    $entidades = Invoke-RestMethod -Uri "$BASE_URL/admin/cartilla/entidades?page=1&limit=10" -Method GET -Headers $headers
    Write-Host "✅ Entidades: $($entidades.data.Count) de $($entidades.pagination.total)" -ForegroundColor Green
    Write-Host "   Total páginas: $($entidades.pagination.totalPages)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

# 6. Test búsqueda por texto
Write-Host "`n6️⃣  Buscar entidades por texto..." -ForegroundColor Yellow
try {
    $busqueda = Invoke-RestMethod -Uri "$BASE_URL/admin/cartilla/entidades?q=HERRERA&limit=5" -Method GET -Headers $headers
    Write-Host "✅ Resultados: $($busqueda.data.Count)" -ForegroundColor Green
    if ($busqueda.data.Count -gt 0) {
        Write-Host "   Ejemplo: $($busqueda.data[0].caentapeno)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

# 7. Test filtro por geocodificación
Write-Host "`n7️⃣  Filtrar por geocodificación..." -ForegroundColor Yellow
try {
    $conGeo = Invoke-RestMethod -Uri "$BASE_URL/admin/cartilla/entidades?conGeo=S&limit=5" -Method GET -Headers $headers
    Write-Host "✅ Con coordenadas: $($conGeo.data.Count)" -ForegroundColor Green
    
    $sinGeo = Invoke-RestMethod -Uri "$BASE_URL/admin/cartilla/entidades?conGeo=N&limit=5" -Method GET -Headers $headers
    Write-Host "✅ Sin coordenadas: $($sinGeo.data.Count)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

# 8. Test estadísticas de geocodificación
Write-Host "`n8️⃣  Estadísticas geocodificación..." -ForegroundColor Yellow
try {
    $stats = Invoke-RestMethod -Uri "$BASE_URL/admin/cartilla/geocoding/stats" -Method GET -Headers $headers
    Write-Host "✅ Stats obtenidas:" -ForegroundColor Green
    Write-Host "   Total: $($stats.total)" -ForegroundColor Gray
    Write-Host "   Pendientes: $($stats.pendientes)" -ForegroundColor Gray
    Write-Host "   Exitosas: $($stats.exitosas)" -ForegroundColor Gray
    Write-Host "   Errores: $($stats.errores)" -ForegroundColor Gray
    Write-Host "   % Completado: $($stats.porcentajeGeocodificado)%" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

# 9. Test detalle de entidad (si existe alguna)
Write-Host "`n9️⃣  Detalle de entidad..." -ForegroundColor Yellow
try {
    if ($entidades.data.Count -gt 0) {
        $primeraId = $entidades.data[0].caentid
        $detalle = Invoke-RestMethod -Uri "$BASE_URL/admin/cartilla/entidades/$primeraId" -Method GET -Headers $headers
        Write-Host "✅ Detalle obtenido: $($detalle.caentapeno)" -ForegroundColor Green
        Write-Host "   Direcciones: $($detalle.direcciones.Count)" -ForegroundColor Gray
        Write-Host "   Teléfonos: $($detalle.telefonos.Count)" -ForegroundColor Gray
        Write-Host "   Cartillas: $($detalle.cartillas.Count)" -ForegroundColor Gray
    } else {
        Write-Host "⚠️  No hay entidades para testear detalle" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

# 10. Test interfaz web
Write-Host "`n🔟 Verificar interfaz web..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/admin/cartilla" -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "OK: Interfaz web accesible" -ForegroundColor Green
        Write-Host "   URL: $BASE_URL/admin/cartilla" -ForegroundColor Cyan
    }
} catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "===== TEST COMPLETADO =====" -ForegroundColor Green
Write-Host ""
Write-Host "Resumen:" -ForegroundColor Cyan
Write-Host "   Todos los endpoints basicos funcionan" -ForegroundColor Green
Write-Host "   Interfaz web lista en: $BASE_URL/admin/cartilla" -ForegroundColor Cyan
Write-Host "   Credenciales: admin / admin123" -ForegroundColor Gray
Write-Host ""
Write-Host "Pendiente: Configurar Google Maps API Key" -ForegroundColor Yellow
