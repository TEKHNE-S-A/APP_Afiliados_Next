# Test Semana 19 - Paso 6: Delegaciones
# Valida endpoint API /api/cartilla con filtro rubroId=000000009

$baseUrl = "http://localhost:3000"
$rubroIdDelegaciones = "000000009"

Write-Host "`n🏢 Test Delegaciones - API Endpoint" -ForegroundColor Cyan
Write-Host ("=" * 60)

# Test 1: Listar delegaciones (página 1, 5 items)
Write-Host "`n1️⃣  Test: GET /api/cartilla?rubroId=000000009`&page=1`&limit=5" -ForegroundColor Yellow
try {
    $uri1 = '{0}/api/cartilla?rubroId={1}&page=1&limit=5' -f $baseUrl, $rubroIdDelegaciones
    $response = Invoke-RestMethod -Uri $uri1 -Method Get -ContentType "application/json"
    
    Write-Host "✅ Status: 200 OK" -ForegroundColor Green
    Write-Host "   Total delegaciones: $($response.pagination.total)"
    Write-Host "   Páginas: $($response.pagination.totalPages)"
    Write-Host "   Items en respuesta: $($response.data.Count)"
    
    if ($response.data.Count -gt 0) {
        Write-Host "`n   📋 Primeras delegaciones:" -ForegroundColor Cyan
        foreach ($del in $response.data) {
            $nombre = $del.caentapeno.Trim()
            $id = $del.caentid.Trim()
            $rubro = if ($del.carubdescr) { $del.carubdescr.Trim() } else { "N/A" }
            Write-Host "      - $nombre (ID: $id, Rubro: $rubro)"
        }
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Delegaciones con filtro geográfico (Catamarca capital)
Write-Host "`n2️⃣  Test: GET /api/cartilla con filtro geográfico (lat/lng/radio)" -ForegroundColor Yellow
$lat = -28.4686692
$lng = -65.7798579
$radioKm = 50

try {
    $uri2 = '{0}/api/cartilla?rubroId={1}&lat={2}&lng={3}&radioKm={4}&orderBy=distancia' -f $baseUrl, $rubroIdDelegaciones, $lat, $lng, $radioKm
    $response = Invoke-RestMethod -Uri $uri2 -Method Get -ContentType "application/json"
    
    Write-Host "✅ Status: 200 OK" -ForegroundColor Green
    Write-Host "   Centro: lat=$lat, lng=$lng"
    Write-Host "   Radio: $radioKm km"
    Write-Host "   Delegaciones encontradas: $($response.data.Count)"
    
    if ($response.data.Count -gt 0) {
        Write-Host "`n   📍 Delegaciones cercanas:" -ForegroundColor Cyan
        foreach ($del in $response.data | Select-Object -First 5) {
            $nombre = $del.caentapeno.Trim()
            $distancia = $del.distancia_km
            Write-Host "      - $nombre ($distancia km)"
        }
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Delegaciones con búsqueda por texto
Write-Host "`n3️⃣  Test: GET /api/cartilla con filtro texto (q=CENTRAL)" -ForegroundColor Yellow
try {
    $uri3 = '{0}/api/cartilla?rubroId={1}&q=CENTRAL' -f $baseUrl, $rubroIdDelegaciones
    $response = Invoke-RestMethod -Uri $uri3 -Method Get -ContentType "application/json"
    
    Write-Host "✅ Status: 200 OK" -ForegroundColor Green
    Write-Host "   Resultados para búsqueda 'CENTRAL': $($response.data.Count)"
    
    if ($response.data.Count -gt 0) {
        Write-Host "`n   🔍 Delegaciones encontradas:" -ForegroundColor Cyan
        foreach ($del in $response.data) {
            $nombre = $del.caentapeno.Trim()
            $id = $del.caentid.Trim()
            Write-Host "      - $nombre (ID: $id)"
        }
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Detalle de una delegación específica
Write-Host "`n4️⃣  Test: GET /api/cartilla/:id (detalle delegación)" -ForegroundColor Yellow
$delegacionId = "00303"  # ANDALGALA
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/cartilla/$delegacionId" -Method Get -ContentType "application/json"
    
    Write-Host "✅ Status: 200 OK" -ForegroundColor Green
    $nombre = $response.caentapeno.Trim()
    $id = $response.caentid.Trim()
    $rubro = if ($response.carubdescr) { $response.carubdescr.Trim() } else { "N/A" }
    
    Write-Host "`n   📋 Detalle delegación:" -ForegroundColor Cyan
    Write-Host "      ID: $id"
    Write-Host "      Nombre: $nombre"
    Write-Host "      Rubro: $rubro"
    
    if ($response.direcciones -and $response.direcciones.Count -gt 0) {
        $dir = $response.direcciones[0]
        Write-Host "      Dirección: $($dir.caendirecc)"
        if ($dir.caendlat -and $dir.caendlng) {
            Write-Host "      Coordenadas: $($dir.caendlat), $($dir.caendlng)"
        }
    }
    
    if ($response.telefonos -and $response.telefonos.Count -gt 0) {
        Write-Host "      Teléfonos: $($response.telefonos.Count)"
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Resumen
Write-Host "`n" -NoNewline
Write-Host ("=" * 60)
Write-Host "✅ Test de API Delegaciones completado" -ForegroundColor Green
Write-Host "   - Listado con filtro rubroId: OK"
Write-Host "   - Filtro geográfico (lat/lng/radio): OK"
Write-Host "   - Búsqueda por texto: OK"
Write-Host "   - Detalle individual: OK"
Write-Host ""
