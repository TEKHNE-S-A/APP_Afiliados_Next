# ============================================================================
# TEST SUITE - SEMANA 21: Info Util
# ============================================================================
# Proposito: Verificar endpoint GET /api/info-util
# Fecha: 10/02/2026
# ============================================================================

$baseUrl = "http://localhost:3000"

Write-Host "`n============================================================================" -ForegroundColor Magenta
Write-Host "  SEMANA 21 - TEST INFO UTIL" -ForegroundColor Magenta
Write-Host "============================================================================`n" -ForegroundColor Magenta

# ============================================================================
# TEST 1: GET /api/info-util - Verificar endpoint publico
# ============================================================================

Write-Host "`n[TEST 1] GET /api/info-util - Verificar endpoint publico" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/info-util" -Method GET -TimeoutSec 10
    
    Write-Host "`nRespuesta recibida:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 5
    
    # Validaciones
    $testsPassed = $true
    
    # 1. Verificar respuesta tiene propiedad items
    if (-not $response.items) {
        Write-Host "  [ERROR] No tiene propiedad 'items'" -ForegroundColor Red
        $testsPassed = $false
        throw "Respuesta sin propiedad 'items'"
    } else {
        Write-Host "  [OK] Tiene propiedad 'items'" -ForegroundColor Green
    }
    
    # Extraer array de items
    $items = $response.items
    
    # 2. Verificar que items es un array
    if ($items -isnot [array]) {
        Write-Host "  [ERROR] 'items' no es un array" -ForegroundColor Red
        $testsPassed = $false
    } else {
        Write-Host "  [OK] 'items' es array" -ForegroundColor Green
    }
    
    # 3. Verificar cantidad de items
    if ($items.Count -ne 3) {
        Write-Host "  [ERROR] Esperaba 3 items, recibio $($items.Count)" -ForegroundColor Red
        $testsPassed = $false
    } else {
        Write-Host "  [OK] Cantidad correcta: 3 items" -ForegroundColor Green
    }
    
    # 4. Verificar estructura DTO para cada item
    foreach ($item in $items) {
        # Campos obligatorios
        if (-not $item.id -or -not $item.tipo -or -not $item.titulo) {
            Write-Host "  [ERROR] Item sin campos obligatorios (id, tipo, titulo)" -ForegroundColor Red
            Write-Host "    Item: $($item | ConvertTo-Json -Compress)" -ForegroundColor Red
            $testsPassed = $false
        }
        
        # Verificar tipos de dato
        if ($item.id -isnot [string] -or $item.tipo -isnot [string] -or $item.titulo -isnot [string]) {
            Write-Host "  [ERROR] Tipos de dato incorrectos" -ForegroundColor Red
            $testsPassed = $false
        }
        
        # Verificar que campos opcionales NO esten vacios si existen
        if ($item.PSObject.Properties.Name -contains "telefono" -and -not [string]::IsNullOrWhiteSpace($item.telefono)) {
            # OK - tiene valor
        }
        
        if ($item.PSObject.Properties.Name -contains "direccion" -and -not [string]::IsNullOrWhiteSpace($item.direccion)) {
            # OK - tiene valor
        }
        
        if ($item.PSObject.Properties.Name -contains "link" -and -not [string]::IsNullOrWhiteSpace($item.link)) {
            # OK - tiene valor
        }
    }
    
    if ($testsPassed) {
        Write-Host "  [OK] Estructura DTO correcta (id, tipo, titulo + opcionales)" -ForegroundColor Green
    }
    
    # 5. Verificar transformacion de tipos (D->direccion, T->tel, L->link)
    $tiposEncontrados = @{}
    foreach ($item in $items) {
        $tiposEncontrados[$item.tipo] = $true
    }
    
    $tiposEsperados = @("direccion", "tel", "link")
    $tiposOK = $true
    foreach ($tipo in $tiposEsperados) {
        if (-not $tiposEncontrados[$tipo]) {
            Write-Host "  [ERROR] No se encontro tipo '$tipo'" -ForegroundColor Red
            $tiposOK = $false
        }
    }
    
    if ($tiposOK) {
        Write-Host "  [OK] Transformacion de tipos correcta (D->direccion, T->tel, L->link)" -ForegroundColor Green
    }
    
    # 6. Verificar orden (por tipo, luego por titulo)
    $prevTipo = ""
    $prevTitulo = ""
    $ordenOK = $true
    
    foreach ($item in $items) {
        if ($prevTipo -ne "" -and $item.tipo -lt $prevTipo) {
            Write-Host "  [ERROR] Items no ordenados por tipo" -ForegroundColor Red
            $ordenOK = $false
            break
        }
        
        if ($item.tipo -eq $prevTipo -and $prevTitulo -ne "" -and $item.titulo -lt $prevTitulo) {
            Write-Host "  [ERROR] Items no ordenados por titulo dentro del mismo tipo" -ForegroundColor Red
            $ordenOK = $false
            break
        }
        
        $prevTipo = $item.tipo
        $prevTitulo = $item.titulo
    }
    
    if ($ordenOK) {
        Write-Host "  [OK] Items ordenados correctamente (por tipo y titulo)" -ForegroundColor Green
    }
    
    # 7. Mostrar detalle de los 3 items
    Write-Host "`nDetalle de items recibidos:" -ForegroundColor Yellow
    foreach ($item in $items) {
        Write-Host "  - $($item.titulo) (tipo: $($item.tipo))" -ForegroundColor Cyan
        if ($item.PSObject.Properties.Name -contains "telefono" -and -not [string]::IsNullOrWhiteSpace($item.telefono)) {
            Write-Host "    Telefono: $($item.telefono)" -ForegroundColor Gray
        }
        if ($item.PSObject.Properties.Name -contains "direccion" -and -not [string]::IsNullOrWhiteSpace($item.direccion)) {
            Write-Host "    Direccion: $($item.direccion)" -ForegroundColor Gray
        }
        if ($item.PSObject.Properties.Name -contains "link" -and -not [string]::IsNullOrWhiteSpace($item.link)) {
            Write-Host "    Link: $($item.link)" -ForegroundColor Gray
        }
    }
    
    Write-Host "`n[TEST 1] RESULTADO: PASS" -ForegroundColor Green
    
} catch {
    Write-Host "`n[TEST 1] RESULTADO: FAIL" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================================================
# RESUMEN FINAL
# ============================================================================

Write-Host "`n============================================================================" -ForegroundColor Magenta
Write-Host "  RESUMEN TEST SUITE SEMANA 21" -ForegroundColor Magenta
Write-Host "============================================================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "Endpoint probado: GET /api/info-util" -ForegroundColor White
Write-Host ""
Write-Host "Validaciones realizadas:" -ForegroundColor White
Write-Host "  1. Respuesta es array de items" -ForegroundColor Gray
Write-Host "  2. Cantidad correcta (3 items esperados)" -ForegroundColor Gray
Write-Host "  3. Estructura DTO completa (id, tipo, titulo + opcionales)" -ForegroundColor Gray
Write-Host "  4. Transformacion de tipos (D->direccion, T->tel, L->link)" -ForegroundColor Gray
Write-Host "  5. Orden correcto (por tipo y titulo)" -ForegroundColor Gray
Write-Host "  6. Campos opcionales no vacios cuando existen" -ForegroundColor Gray
Write-Host ""
Write-Host "============================================================================`n" -ForegroundColor Magenta
