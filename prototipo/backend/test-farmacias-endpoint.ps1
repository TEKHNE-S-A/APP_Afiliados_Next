/**
 * Script para probar el endpoint /api/cartilla con filtro rubroId=000000008
 * Verifica si el filtro de farmacias está funcionando correctamente
 */

$baseUrl = "http://localhost:3000"

Write-Host "`n🧪 TEST: Endpoint /api/cartilla con filtro rubroId=000000008`n" -ForegroundColor Cyan

# Test 1: Sin filtro de rubro (todos los prestadores)
Write-Host "1️⃣  Sin filtro de rubro (baseline):" -ForegroundColor Yellow
try {
    $response1 = Invoke-RestMethod -Uri "$baseUrl/api/cartilla?page=1&limit=5&lat=-28.4696&lng=-65.7795&radioKm=10" -Method GET
    Write-Host "   Total encontrado: $($response1.pagination.total)" -ForegroundColor Green
    Write-Host "   Primeros 3:" -ForegroundColor Gray
    $response1.data[0..2] | ForEach-Object {
        Write-Host "     - $($_.caentid.Trim()): $($_.caentapeno.Trim())" -ForegroundColor White
    }
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Con filtro rubroId=000000008 (solo farmacias)
Write-Host "`n2️⃣  Con filtro rubroId=000000008 (solo farmacias):" -ForegroundColor Yellow
try {
    $response2 = Invoke-RestMethod -Uri "$baseUrl/api/cartilla?page=1&limit=5&lat=-28.4696&lng=-65.7795&radioKm=10&rubroId=000000008" -Method GET
    Write-Host "   Total encontrado: $($response2.pagination.total)" -ForegroundColor Green
    Write-Host "   Primeros 3:" -ForegroundColor Gray
    $response2.data[0..2] | ForEach-Object {
        Write-Host "     - $($_.caentid.Trim()): $($_.caentapeno.Trim())" -ForegroundColor White
    }
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Con filtro q='RED' + rubroId=000000008
Write-Host "`n3️⃣  Con filtro q='RED' + rubroId=000000008:" -ForegroundColor Yellow
try {
    $response3 = Invoke-RestMethod -Uri "$baseUrl/api/cartilla?page=1&limit=5&lat=-28.4696&lng=-65.7795&radioKm=10&rubroId=000000008&q=RED" -Method GET
    Write-Host "   Total encontrado: $($response3.pagination.total)" -ForegroundColor Green
    Write-Host "   Resultados:" -ForegroundColor Gray
    $response3.data | ForEach-Object {
        Write-Host "     - $($_.caentid.Trim()): $($_.caentapeno.Trim())" -ForegroundColor White
    }
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Verificar estructura de respuesta
Write-Host "`n4️⃣  Verificación estructura respuesta con rubroId=000000008:" -ForegroundColor Yellow
try {
    $response4 = Invoke-RestMethod -Uri "$baseUrl/api/cartilla?page=1&limit=1&rubroId=000000008" -Method GET
    $entidad = $response4.data[0]
    Write-Host "   Campos presentes en respuesta:" -ForegroundColor Gray
    Write-Host "     - caentid: $($entidad.caentid)" -ForegroundColor White
    Write-Host "     - caentapeno: $($entidad.caentapeno)" -ForegroundColor White
    Write-Host "     - carubdescr: $($entidad.carubdescr)" -ForegroundColor White
    Write-Host "     - caespecial: $($entidad.caespecial)" -ForegroundColor White
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n📊 RESUMEN:" -ForegroundColor Cyan
Write-Host "   - Endpoint: $baseUrl/api/cartilla" -ForegroundColor Gray
Write-Host "   - Filtro rubroId aplicado correctamente: " -NoNewline -ForegroundColor Gray
if ($response2.pagination.total -lt $response1.pagination.total) {
    Write-Host "✅ SÍ (menos resultados con filtro)" -ForegroundColor Green
} else {
    Write-Host "❌ NO (mismo total o más)" -ForegroundColor Red
}

Write-Host ""
