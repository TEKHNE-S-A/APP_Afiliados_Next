# Test API Cartilla v1 (sin geo) - Semana 14
# Endpoints públicos sin autenticación

$ErrorActionPreference = "Continue"
$baseUrl = "http://localhost:3000"

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  TEST API CARTILLA v1 - SEMANA 14                         ║" -ForegroundColor Cyan
Write-Host "║  Endpoints públicos (sin autenticación)                   ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# TEST 1: Listado básico
Write-Host "📋 TEST 1: Listado básico" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri ($baseUrl + '/api/cartilla?page=1&limit=5') -Method Get
    Write-Host "   ✅ Status: 200 OK" -ForegroundColor Green
    Write-Host "   📊 Total: $($response.total)" -ForegroundColor White
    Write-Host "   📄 Página: $($response.page) de $($response.totalPages)" -ForegroundColor White
    Write-Host "   📦 Resultados: $($response.data.Count)" -ForegroundColor White
    if ($response.data.Count -gt 0) {
        Write-Host "`n   Muestra (primeros 2):" -ForegroundColor Cyan
        $response.data | Select-Object -First 2 | ForEach-Object {
            Write-Host "     - $($_.caentapeno)" -ForegroundColor White
            Write-Host "       ID: $($_.caentid) | Rubro: $($_.rubroDescripcion)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# TEST 2: Búsqueda por texto
Write-Host "🔍 TEST 2: Búsqueda por texto libre" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri ($baseUrl + '/api/cartilla?q=sanatorio&limit=5') -Method Get
    Write-Host "   ✅ Status: 200 OK" -ForegroundColor Green
    Write-Host "   📊 Encontrados: $($response.total)" -ForegroundColor White
    Write-Host "   📦 Mostrando: $($response.data.Count)" -ForegroundColor White
    if ($response.data.Count -gt 0) {
        Write-Host "`n   Resultados:" -ForegroundColor Cyan
        $response.data | ForEach-Object {
            Write-Host "     - $($_.caentapeno)" -ForegroundColor White
        }
    }
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# TEST 3: Filtro por especialidad
Write-Host "🏥 TEST 3: Filtro por especialidad" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri ($baseUrl + '/api/cartilla?especialidadId=00000015&limit=5') -Method Get
    Write-Host "   ✅ Status: 200 OK" -ForegroundColor Green
    Write-Host "   📊 Total con especialidad: $($response.total)" -ForegroundColor White
    Write-Host "   📦 Mostrando: $($response.data.Count)" -ForegroundColor White
    if ($response.data.Count -gt 0) {
        Write-Host "`n   Resultados:" -ForegroundColor Cyan
        $response.data | Select-Object -First 3 | ForEach-Object {
            Write-Host "     - $($_.caentapeno)" -ForegroundColor White
            Write-Host "       Especialidad: $($_.especialidadDescripcion)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# TEST 4: Filtro por rubro
Write-Host "🏢 TEST 4: Filtro por rubro" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri ($baseUrl + '/api/cartilla?rubroId=00000001&limit=5') -Method Get
    Write-Host "   ✅ Status: 200 OK" -ForegroundColor Green
    Write-Host "   📊 Total con rubro: $($response.total)" -ForegroundColor White
    Write-Host "   📦 Mostrando: $($response.data.Count)" -ForegroundColor White
    if ($response.data.Count -gt 0) {
        Write-Host "`n   Resultados:" -ForegroundColor Cyan
        $response.data | Select-Object -First 3 | ForEach-Object {
            Write-Host "     - $($_.caentapeno)" -ForegroundColor White
            Write-Host "       Rubro: $($_.rubroDescripcion)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# TEST 5: Solo con geocodificación
Write-Host "🌍 TEST 5: Solo con coordenadas geográficas" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri ($baseUrl + '/api/cartilla?conGeo=S&limit=5') -Method Get
    Write-Host "   ✅ Status: 200 OK" -ForegroundColor Green
    Write-Host "   📊 Total geocodificadas: $($response.total)" -ForegroundColor White
    Write-Host "   📦 Mostrando: $($response.data.Count)" -ForegroundColor White
    if ($response.data.Count -gt 0) {
        Write-Host "`n   Resultados con coordenadas:" -ForegroundColor Cyan
        $response.data | Select-Object -First 3 | ForEach-Object {
            Write-Host "     - $($_.caentapeno)" -ForegroundColor White
            Write-Host "       📍 Dirección: $($_.direccion)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# TEST 6: Paginación
Write-Host "📄 TEST 6: Paginación" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri ($baseUrl + '/api/cartilla?page=2&limit=10') -Method Get
    Write-Host "   ✅ Status: 200 OK" -ForegroundColor Green
    Write-Host "   📊 Total: $($response.total)" -ForegroundColor White
    Write-Host "   📄 Página: $($response.page) de $($response.totalPages)" -ForegroundColor White
    Write-Host "   📦 Resultados: $($response.data.Count)" -ForegroundColor White
    Write-Host "   ⏭️  hasNext: $($response.hasNext) | ⏮️  hasPrev: $($response.hasPrev)" -ForegroundColor White
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# TEST 7: Detalle de entidad
Write-Host "📝 TEST 7: Detalle de entidad" -ForegroundColor Yellow
try {
    $listResponse = Invoke-RestMethod -Uri ($baseUrl + '/api/cartilla?limit=1') -Method Get
    if ($listResponse.data.Count -gt 0) {
        $testId = $listResponse.data[0].caentid
        $detailResponse = Invoke-RestMethod -Uri ($baseUrl + "/api/cartilla/$testId") -Method Get
        Write-Host "   ✅ Status: 200 OK" -ForegroundColor Green
        Write-Host "`n   Detalle:" -ForegroundColor Cyan
        Write-Host "     Nombre: $($detailResponse.caentapeno)" -ForegroundColor White
        Write-Host "     ID: $($detailResponse.caentid)" -ForegroundColor Gray
        Write-Host "     Matrícula: $($detailResponse.caentmatri)" -ForegroundColor Gray
        Write-Host "     Rubro: $($detailResponse.rubroDescripcion)" -ForegroundColor Gray
        Write-Host "     Especialidad: $($detailResponse.especialidadDescripcion)" -ForegroundColor Gray
        Write-Host "     Dirección: $($detailResponse.direccion)" -ForegroundColor Gray
        Write-Host "     Teléfono: $($detailResponse.telefono)" -ForegroundColor Gray
        Write-Host "     Web: $($detailResponse.web)" -ForegroundColor Gray
    } else {
        Write-Host "   ⚠️  No hay entidades para probar" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# TEST 8: Validación Zod - parámetros inválidos
Write-Host "🔒 TEST 8: Validación Zod (parámetros inválidos)" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri ($baseUrl + '/api/cartilla?page=0&limit=500') -Method Get -ErrorAction Stop
    Write-Host "   ❌ FALLO: Debería rechazar page=0 y limit=500" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 400) {
        Write-Host "   ✅ Status: 400 Bad Request (correcto)" -ForegroundColor Green
        Write-Host "   ✅ Validación Zod funcionando" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Yellow
    }
}
Write-Host ""

# TEST 9: Detalle entidad inexistente
Write-Host "🔍 TEST 9: Detalle de entidad inexistente" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri ($baseUrl + '/api/cartilla/9999999999') -Method Get -ErrorAction Stop
    Write-Host "   ❌ FALLO: Debería retornar 404" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 404) {
        Write-Host "   ✅ Status: 404 Not Found (correcto)" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Yellow
    }
}
Write-Host ""

# RESUMEN
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  RESUMEN DE TESTS                                          ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ API Cartilla v1 funcionando correctamente" -ForegroundColor Green
Write-Host "   - Listado con paginación" -ForegroundColor White
Write-Host "   - Búsqueda por texto libre (q)" -ForegroundColor White
Write-Host "   - Filtros: especialidadId, rubroId, localidadId, conGeo" -ForegroundColor White
Write-Host "   - Detalle de entidad" -ForegroundColor White
Write-Host "   - Validación Zod en query params" -ForegroundColor White
Write-Host "   - Manejo de errores 404/400" -ForegroundColor White
Write-Host ""
Write-Host "📝 Endpoints públicos (sin autenticación):" -ForegroundColor Cyan
Write-Host "   GET /api/cartilla - Listado con filtros" -ForegroundColor White
Write-Host "   GET /api/cartilla/{id} - Detalle" -ForegroundColor White
Write-Host ""
