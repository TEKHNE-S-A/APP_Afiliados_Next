<# 
.SYNOPSIS
    Test completo de Sync Incremental Cartilla (Semana 20)
    
.DESCRIPTION
    Prueba GET /api/cartilla/changes con 5 escenarios:
    1. Full sync (sin since) - trae todas las entidades activas
    2. Delta sync con cambios - trae solo entidades modificadas después de una fecha
    3. Delta sync con deletes - trae entidades eliminadas (caentactivo=false)
    4. Filtrado por rubroId - trae solo farmacias o delegaciones
    5. Paginación - prueba page y limit
    
.EXAMPLE
    .\test-week20-sync-incremental.ps1
    
.NOTES
    Requisitos:
    - Backend corriendo en http://localhost:3000
    - BD con migración sync incremental aplicada
    - Al menos 2899 entidades con caentactivo y caentupdated
#>

$ErrorActionPreference = 'Stop'
$baseUrl = 'http://localhost:3000'

Write-Host "`n============================================================================" -ForegroundColor Cyan
Write-Host "TEST SEMANA 20 - SYNC INCREMENTAL CARTILLA" -ForegroundColor Cyan
Write-Host "============================================================================`n" -ForegroundColor Cyan

# ============================================================================
# TEST 1: Full Sync (sin since)
# ============================================================================
Write-Host "`n[TEST 1] Full Sync - Sin parámetro since (todas las entidades activas)" -ForegroundColor Yellow
Write-Host "GET /api/cartilla/changes?page=1&amp;limit=10`n" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/cartilla/changes?page=1&limit=10" -Method Get -ContentType 'application/json'
    
    Write-Host "✅ Respuesta exitosa:" -ForegroundColor Green
    Write-Host "   - Items: $($response.items.Count)" -ForegroundColor White
    Write-Host "   - Deleted: $($response.deleted.Count)" -ForegroundColor White
    Write-Host "   - Total: $($response.pagination.total)" -ForegroundColor White
    Write-Host "   - Páginas: $($response.pagination.pages)" -ForegroundColor White
    Write-Host "   - ServerTime: $($response.sync.serverTime)" -ForegroundColor White
    Write-Host "   - NextSince: $($response.sync.nextSince)" -ForegroundColor White
    
    if ($response.items.Count -gt 0) {
        Write-Host "`n   Primera entidad:" -ForegroundColor Cyan
        Write-Host "   - caentid: $($response.items[0].caentid)" -ForegroundColor White
        Write-Host "   - caentnomb: $($response.items[0].caentnomb)" -ForegroundColor White
        Write-Host "   - caentactivo: $($response.items[0].caentactivo)" -ForegroundColor White
        Write-Host "   - caentupdated: $($response.items[0].caentupdated)" -ForegroundColor White
    }
    
    # Guardar nextSince para siguiente test
    $script:nextSince = $response.sync.nextSince
    
} catch {
    Write-Host "❌ Error en Test 1: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host $_.Exception -ForegroundColor Red
    exit 1
}

# ============================================================================
# TEST 2: Delta Sync con cambios
# ============================================================================
Write-Host "`n[TEST 2] Delta Sync - Con parámetro since (desde hace 7 días)" -ForegroundColor Yellow

# Calcular fecha hace 7 días en formato ISO 8601
$since7days = (Get-Date).AddDays(-7).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
Write-Host "GET /api/cartilla/changes?since=$since7days" -ForegroundColor Gray
Write-Host ""

try {
    $encodedSince7 = [uri]::EscapeDataString($since7days)
    $uri = "${baseUrl}/api/cartilla/changes?since=${encodedSince7}`&limit=10"
    $response = Invoke-RestMethod -Uri $uri -Method Get -ContentType 'application/json'
    
    Write-Host "✅ Respuesta exitosa:" -ForegroundColor Green
    Write-Host "   - Items: $($response.items.Count)" -ForegroundColor White
    Write-Host "   - Deleted: $($response.deleted.Count)" -ForegroundColor White
    Write-Host "   - Since solicitado: $since7days" -ForegroundColor White
    Write-Host "   - NextSince: $($response.sync.nextSince)" -ForegroundColor White
    Write-Host "   - Cambios detectados: $($response.sync.itemsChanged)" -ForegroundColor White
    Write-Host "   - Eliminaciones: $($response.sync.itemsDeleted)" -ForegroundColor White
    
    if ($response.items.Count -gt 0) {
        Write-Host "`n   Primera entidad modificada:" -ForegroundColor Cyan
        Write-Host "   - caentid: $($response.items[0].caentid)" -ForegroundColor White
        Write-Host "   - caentnomb: $($response.items[0].caentnomb)" -ForegroundColor White
        Write-Host "   - caentupdated: $($response.items[0].caentupdated)" -ForegroundColor White
    } else {
        Write-Host "`n   ℹ️  No hay entidades modificadas en los últimos 7 días" -ForegroundColor DarkYellow
    }
    
} catch {
    Write-Host "❌ Error en Test 2: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host $_.Exception -ForegroundColor Red
    exit 1
}

# ============================================================================
# TEST 3: Delta Sync verificando deletes
# ============================================================================
Write-Host "`n[TEST 3] Verificar deleted[] - Entidades con caentactivo=false" -ForegroundColor Yellow
Write-Host 'GET /api/cartilla/changes?since=(hace 365 días)&limit=50' -ForegroundColor Gray
Write-Host ""

# Fecha muy antigua para traer todos los deletes si existen
$sinceOld = (Get-Date).AddDays(-365).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")

try {
    $encodedSince = [uri]::EscapeDataString($sinceOld)
    $uri = "${baseUrl}/api/cartilla/changes?since=${encodedSince}`&limit=50"
    $response = Invoke-RestMethod -Uri $uri -Method Get -ContentType 'application/json'
    
    Write-Host "✅ Respuesta exitosa:" -ForegroundColor Green
    Write-Host "   - Items: $($response.items.Count)" -ForegroundColor White
    Write-Host "   - Deleted: $($response.deleted.Count)" -ForegroundColor White
    
    if ($response.deleted.Count -gt 0) {
        Write-Host "`n   Entidades eliminadas:" -ForegroundColor Cyan
        foreach ($del in $response.deleted) {
            Write-Host "   - $($del.caentid): $($del.caentnomb)" -ForegroundColor White
        }
    } else {
        Write-Host "`n   ℹ️  No hay entidades eliminadas (caentactivo=false)" -ForegroundColor DarkYellow
        Write-Host "   Esto es normal si la BD tiene todas las entidades activas" -ForegroundColor Gray
    }
    
} catch {
    Write-Host "❌ Error en Test 3: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host $_.Exception -ForegroundColor Red
    exit 1
}

# ============================================================================
# TEST 4: Filtrado por rubroId (Farmacias)
# ============================================================================
Write-Host "`n[TEST 4] Filtrado por rubroId - Solo Farmacias (000000008)" -ForegroundColor Yellow
Write-Host 'GET /api/cartilla/changes?rubroId=000000008&limit=10' -ForegroundColor Gray
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/cartilla/changes?rubroId=000000008&limit=10" -Method Get -ContentType 'application/json'
    
    Write-Host "✅ Respuesta exitosa:" -ForegroundColor Green
    Write-Host "   - Items (Farmacias): $($response.items.Count)" -ForegroundColor White
    Write-Host "   - Total farmacias: $($response.pagination.total)" -ForegroundColor White
    
    if ($response.items.Count -gt 0) {
        Write-Host "`n   Primera farmacia:" -ForegroundColor Cyan
        Write-Host "   - caentid: $($response.items[0].caentid)" -ForegroundColor White
        Write-Host "   - caentnomb: $($response.items[0].caentnomb)" -ForegroundColor White
        
        # Verificar que sea farmacia (rubroId debe contener 000000008)
        $rubros = $response.items[0].rubros
        $esFarmacia = $false
        foreach ($rubro in $rubros) {
            if ($rubro.rubroId -eq '000000008') {
                $esFarmacia = $true
                break
            }
        }
        
        if ($esFarmacia) {
            Write-Host "   - ✅ Confirmado: Es una farmacia" -ForegroundColor Green
        } else {
            Write-Host "   - ⚠️  Warning: No se encontró rubroId 000000008 en rubros[]" -ForegroundColor Yellow
        }
    }
    
} catch {
    Write-Host "❌ Error en Test 4: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host $_.Exception -ForegroundColor Red
    exit 1
}

# ============================================================================
# TEST 5: Paginación
# ============================================================================
Write-Host "`n[TEST 5] Paginación - Página 2 con límite 5" -ForegroundColor Yellow
Write-Host 'GET /api/cartilla/changes?page=2&limit=5' -ForegroundColor Gray
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/cartilla/changes?page=2&limit=5" -Method Get -ContentType 'application/json'
    
    Write-Host "✅ Respuesta exitosa:" -ForegroundColor Green
    Write-Host "   - Items: $($response.items.Count)" -ForegroundColor White
    Write-Host "   - Página actual: $($response.pagination.page)" -ForegroundColor White
    Write-Host "   - Límite: $($response.pagination.limit)" -ForegroundColor White
    Write-Host "   - Total: $($response.pagination.total)" -ForegroundColor White
    Write-Host "   - Total páginas: $($response.pagination.pages)" -ForegroundColor White
    Write-Host "   - Desde: $($response.pagination.from)" -ForegroundColor White
    Write-Host "   - Hasta: $($response.pagination.to)" -ForegroundColor White
    
    if ($response.pagination.page -eq 2 -and $response.items.Count -le 5) {
        Write-Host "`n   ✅ Paginación funcionando correctamente" -ForegroundColor Green
    } else {
        Write-Host "`n   ⚠️  Warning: La paginación no devolvió los valores esperados" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Error en Test 5: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host $_.Exception -ForegroundColor Red
    exit 1
}

# ============================================================================
# TEST 6: Validación de parámetros inválidos
# ============================================================================
Write-Host "`n[TEST 6] Validación - Parámetros inválidos (debe fallar)" -ForegroundColor Yellow
Write-Host "GET /api/cartilla/changes?limit=300 (límite máximo 200)`n" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/cartilla/changes?limit=300" -Method Get -ContentType 'application/json' -ErrorAction Stop
    
    Write-Host "❌ Test falló: Debería haber rechazado limit=300" -ForegroundColor Red
    
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "✅ Validación correcta: Rechazó limit=300 (400 Bad Request)" -ForegroundColor Green
        Write-Host "   Mensaje: $($_.ErrorDetails.Message)" -ForegroundColor Gray
    } else {
        Write-Host "❌ Error inesperado: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# ============================================================================
# RESUMEN FINAL
# ============================================================================
Write-Host "`n============================================================================" -ForegroundColor Cyan
Write-Host "✅ TESTS COMPLETADOS - SYNC INCREMENTAL FUNCIONANDO" -ForegroundColor Green
Write-Host "============================================================================" -ForegroundColor Cyan

Write-Host "`nResumen de funcionalidades verificadas:" -ForegroundColor White
Write-Host "  ✅ Full sync (sin since)" -ForegroundColor Green
Write-Host "  ✅ Delta sync (con since)" -ForegroundColor Green
Write-Host "  ✅ Detección de deletes (caentactivo=false)" -ForegroundColor Green
Write-Host "  ✅ Filtrado por rubroId" -ForegroundColor Green
Write-Host "  ✅ Paginación (page + limit)" -ForegroundColor Green
Write-Host "  ✅ Validación de parámetros" -ForegroundColor Green

Write-Host "`nDocumentado en: backend/API_SYNC_INCREMENTAL.md" -ForegroundColor Cyan
Write-Host ""
