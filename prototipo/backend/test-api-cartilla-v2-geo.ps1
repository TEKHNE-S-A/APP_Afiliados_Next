# Test API Cartilla v2 con filtros geográficos - Semana 15
# Endpoints públicos con búsqueda por proximidad

$ErrorActionPreference = "Continue"
$baseUrl = "http://localhost:3000"

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  TEST API CARTILLA v2 - FILTROS GEOGRÁFICOS              ║" -ForegroundColor Cyan
Write-Host "║  Búsqueda por proximidad (lat/lng/radioKm)               ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Coordenadas de referencia: San Fernando del Valle de Catamarca
$latCatamarca = -28.4686692
$lngCatamarca = -65.77985799999999

# TEST 1: Búsqueda básica por proximidad (10km)
Write-Host "🌍 TEST 1: Búsqueda por proximidad (radio 10km)" -ForegroundColor Yellow
Write-Host "   Punto: San Fernando del Valle de Catamarca" -ForegroundColor Gray
Write-Host "   Lat: $latCatamarca, Lng: $lngCatamarca" -ForegroundColor Gray
try {
    $response = Invoke-RestMethod -Uri ($baseUrl + "/api/cartilla?lat=$latCatamarca&lng=$lngCatamarca&radioKm=10&limit=5") -Method Get
    Write-Host "   ✅ Status: 200 OK" -ForegroundColor Green
    Write-Host "   📊 Encontrados: $($response.pagination.total)" -ForegroundColor White
    Write-Host "   📦 Mostrando: $($response.data.Count)" -ForegroundColor White
    if ($response.filters) {
        Write-Host "   🎯 Filtros aplicados:" -ForegroundColor Cyan
        Write-Host "      - Radio: $($response.filters.radioKm) km" -ForegroundColor Gray
        Write-Host "      - Ordenado por: $($response.filters.ordenadoPor)" -ForegroundColor Gray
    }
    if ($response.data.Count -gt 0) {
        Write-Host "`n   Resultados más cercanos:" -ForegroundColor Cyan
        $response.data | ForEach-Object {
            Write-Host "     - $($_.caentapeno)" -ForegroundColor White
            Write-Host "       📍 Distancia: $($_.distancia_km) km" -ForegroundColor Gray
            Write-Host "       📌 Localidad: $($_.localidad)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# TEST 2: Búsqueda con radio ampliado (50km)
Write-Host "🌍 TEST 2: Búsqueda con radio ampliado (50km)" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri ($baseUrl + "/api/cartilla?lat=$latCatamarca&lng=$lngCatamarca&radioKm=50&limit=10") -Method Get
    Write-Host "   ✅ Status: 200 OK" -ForegroundColor Green
    Write-Host "   📊 Encontrados en 50km: $($response.pagination.total)" -ForegroundColor White
    Write-Host "   📦 Mostrando: $($response.data.Count)" -ForegroundColor White
    if ($response.data.Count -gt 0) {
        $min = ($response.data | ForEach-Object { [double]$_.distancia_km } | Measure-Object -Minimum).Minimum
        $max = ($response.data | ForEach-Object { [double]$_.distancia_km } | Measure-Object -Maximum).Maximum
        Write-Host "   📏 Rango distancias: $min km - $max km" -ForegroundColor Cyan
    }
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# TEST 3: Búsqueda con especialidad + geo
Write-Host "🏥 TEST 3: Búsqueda por especialidad + proximidad" -ForegroundColor Yellow
Write-Host "   Especialidad: KIN (Kinesiología) + Radio 20km" -ForegroundColor Gray
try {
    $response = Invoke-RestMethod -Uri ($baseUrl + "/api/cartilla?lat=$latCatamarca&lng=$lngCatamarca&radioKm=20&especialidadId=KIN&limit=5") -Method Get
    Write-Host "   ✅ Status: 200 OK" -ForegroundColor Green
    Write-Host "   📊 Kinesiólogos cercanos: $($response.pagination.total)" -ForegroundColor White
    Write-Host "   📦 Mostrando: $($response.data.Count)" -ForegroundColor White
    if ($response.data.Count -gt 0) {
        Write-Host "`n   Kinesiólogos en 20km:" -ForegroundColor Cyan
        $response.data | Select-Object -First 3 | ForEach-Object {
            Write-Host "     - $($_.caentapeno)" -ForegroundColor White
            Write-Host "       📍 $($_.distancia_km) km de distancia" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# TEST 4: Búsqueda con texto + geo
Write-Host "🔍 TEST 4: Búsqueda por texto + proximidad" -ForegroundColor Yellow
Write-Host "   Texto: 'sanatorio' + Radio 15km" -ForegroundColor Gray
try {
    $response = Invoke-RestMethod -Uri ($baseUrl + "/api/cartilla?lat=$latCatamarca&lng=$lngCatamarca&radioKm=15&q=sanatorio&limit=5") -Method Get
    Write-Host "   ✅ Status: 200 OK" -ForegroundColor Green
    Write-Host "   📊 Sanatorios cercanos: $($response.pagination.total)" -ForegroundColor White
    if ($response.data.Count -gt 0) {
        Write-Host "`n   Sanatorios en 15km:" -ForegroundColor Cyan
        $response.data | ForEach-Object {
            Write-Host "     - $($_.caentapeno)" -ForegroundColor White
            Write-Host "       📍 $($_.distancia_km) km" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# TEST 5: Orden por nombre (sin orden por distancia)
Write-Host "📝 TEST 5: Ordenar por nombre (sin orden distancia)" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri ($baseUrl + "/api/cartilla?lat=$latCatamarca&lng=$lngCatamarca&radioKm=10&orderBy=nombre&limit=5") -Method Get
    Write-Host "   ✅ Status: 200 OK" -ForegroundColor Green
    Write-Host "   📊 Total: $($response.pagination.total)" -ForegroundColor White
    Write-Host "   🔤 Ordenado por: nombre (alfabético)" -ForegroundColor Cyan
    if ($response.data.Count -gt 0) {
        Write-Host "`n   Primeros resultados:" -ForegroundColor Cyan
        $response.data | ForEach-Object {
            Write-Host "     - $($_.caentapeno) [$($_.distancia_km) km]" -ForegroundColor White
        }
    }
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# TEST 6: Validación Zod - lat sin lng (debe fallar)
Write-Host "🔒 TEST 6: Validación - lat sin lng (debe rechazar)" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri ($baseUrl + "/api/cartilla?lat=$latCatamarca&limit=5") -Method Get -ErrorAction Stop
    Write-Host "   ❌ FALLO: Debería rechazar lat sin lng" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 400) {
        Write-Host "   ✅ Status: 400 Bad Request (correcto)" -ForegroundColor Green
        Write-Host "   ✅ Validación Zod rechazó lat sin lng" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Yellow
    }
}
Write-Host ""

# TEST 7: Validación - radioKm fuera de rango (debe fallar)
Write-Host "🔒 TEST 7: Validación - radioKm=1000 (debe rechazar >500)" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri ($baseUrl + "/api/cartilla?lat=$latCatamarca&lng=$lngCatamarca&radioKm=1000") -Method Get -ErrorAction Stop
    Write-Host "   ❌ FALLO: Debería rechazar radioKm > 500" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 400) {
        Write-Host "   ✅ Status: 400 Bad Request (correcto)" -ForegroundColor Green
        Write-Host "   ✅ Validación Zod rechazó radioKm > 500" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Yellow
    }
}
Write-Host ""

# TEST 8: Paginación con filtro geo
Write-Host "📄 TEST 8: Paginación con filtro geográfico" -ForegroundColor Yellow
try {
    $page1 = Invoke-RestMethod -Uri ($baseUrl + "/api/cartilla?lat=$latCatamarca&lng=$lngCatamarca&radioKm=25&page=1&limit=3") -Method Get
    $page2 = Invoke-RestMethod -Uri ($baseUrl + "/api/cartilla?lat=$latCatamarca&lng=$lngCatamarca&radioKm=25&page=2&limit=3") -Method Get
    
    Write-Host "   ✅ Página 1: $($page1.data.Count) resultados" -ForegroundColor Green
    Write-Host "   ✅ Página 2: $($page2.data.Count) resultados" -ForegroundColor Green
    Write-Host "   📊 Total en 25km: $($page1.pagination.total)" -ForegroundColor White
    Write-Host "   📄 Total páginas: $($page1.pagination.totalPages)" -ForegroundColor White
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# RESUMEN
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  RESUMEN SEMANA 15                                         ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Filtros geográficos implementados:" -ForegroundColor Green
Write-Host "   - Búsqueda por proximidad (lat/lng/radioKm)" -ForegroundColor White
Write-Host "   - Cálculo de distancia con fórmula Haversine" -ForegroundColor White
Write-Host "   - Orden por distancia (default)" -ForegroundColor White
Write-Host "   - Orden por nombre o prioridad" -ForegroundColor White
Write-Host "   - Combinable con filtros v1 (q, especialidadId, rubroId)" -ForegroundColor White
Write-Host "   - Validación Zod lat/lng juntos" -ForegroundColor White
Write-Host "   - Validación radioKm (0.1 - 500 km)" -ForegroundColor White
Write-Host ""
Write-Host "📝 Endpoints:" -ForegroundColor Cyan
Write-Host "   GET /api/cartilla?lat={lat}&lng={lng}&radioKm={km}" -ForegroundColor White
Write-Host "   GET /api/cartilla?lat={lat}&lng={lng}&especialidadId={id}" -ForegroundColor White
Write-Host ""
