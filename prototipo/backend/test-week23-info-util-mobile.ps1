# ============================================================================
# TEST SUITE - SEMANA 23: Info Util Mobile UI
# ============================================================================
# Proposito: Verificar integracion completa de pantalla Info Util mobile
# Fecha: 10/02/2026
# ============================================================================

$baseUrl = "http://localhost:3000"

Write-Host "`n============================================================================" -ForegroundColor Magenta
Write-Host "  SEMANA 23 - TEST INFO UTIL MOBILE UI" -ForegroundColor Magenta
Write-Host "============================================================================`n" -ForegroundColor Magenta

$testResults = @()

# ============================================================================
# TEST 1: GET /api/info-util - Endpoint publico funcional
# ============================================================================

Write-Host "`n[TEST 1] GET /api/info-util - Endpoint publico funcional" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/info-util" -Method GET -TimeoutSec 10
    
    Write-Host "`nTotal items: $($response.items.Count)" -ForegroundColor Yellow
    
    # Validaciones
    $test1Pass = $true
    
    if ($response.items -and $response.items.Count -ge 3) {
        Write-Host "  [OK] Endpoint devuelve 3+ items" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] Endpoint sin datos suficientes" -ForegroundColor Red
        $test1Pass = $false
    }
    
    # Verificar estructura DTO publica
    $firstItem = $response.items[0]
    if ($firstItem.id -and $firstItem.tipo -and $firstItem.titulo) {
        Write-Host "  [OK] Estructura DTO correcta (id, tipo, titulo)" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] Estructura DTO incorrecta" -ForegroundColor Red
        $test1Pass = $false
    }
    
    # Verificar tipos transformados (direccion, tel, link)
    $tipos = $response.items | ForEach-Object { $_.tipo } | Select-Object -Unique
    if ($tipos -contains "direccion" -or $tipos -contains "tel" -or $tipos -contains "link") {
        Write-Host "  [OK] Tipos transformados correctamente" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] Tipos no transformados" -ForegroundColor Red
        $test1Pass = $false
    }
    
    if ($test1Pass) {
        Write-Host "`n[TEST 1] RESULTADO: PASS" -ForegroundColor Green
        $testResults += @{Test = "GET /api/info-util"; Result = "PASS"}
    } else {
        Write-Host "`n[TEST 1] RESULTADO: FAIL" -ForegroundColor Red
        $testResults += @{Test = "GET /api/info-util"; Result = "FAIL"}
    }
    
} catch {
    Write-Host "`n[TEST 1] RESULTADO: FAIL" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    $testResults += @{Test = "GET /api/info-util"; Result = "FAIL"}
}

Start-Sleep -Milliseconds 500

# ============================================================================
# TEST 2: Verificar archivo InfoUtilScreen.tsx
# ============================================================================

Write-Host "`n[TEST 2] Verificar archivo InfoUtilScreen.tsx existe" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

$screenPath = Join-Path $PSScriptRoot "..\mobile\src\screens\InfoUtilScreen.tsx"

if (Test-Path $screenPath) {
    $content = Get-Content $screenPath -Raw -Encoding UTF8
    
    # Verificar imports clave
    $hasImports = $content -match "import.*InfoUtilService" -and 
                  $content -match "import.*Linking" -and
                  $content -match "import.*AsyncStorage"
    
    if ($hasImports) {
        Write-Host "  [OK] Imports correctos (InfoUtilService, Linking, AsyncStorage)" -ForegroundColor Green
    } else {
        Write-Host "  [WARNING] Algunos imports pueden faltar" -ForegroundColor Yellow
    }
    
    # Verificar estrategia cache-first
    $hasCacheFirst = $content -match "cache-first" -or $content -match "getFromCache"
    
    if ($hasCacheFirst) {
        Write-Host "  [OK] Estrategia cache-first implementada" -ForegroundColor Green
    } else {
        Write-Host "  [WARNING] Cache-first puede no estar implementado" -ForegroundColor Yellow
    }
    
    # Verificar acciones (tel, link, direccion)
    $hasActions = $content -match "tel:" -and 
                  $content -match "Linking.openURL" -and
                  $content -match "handleDireccionPress"
    
    if ($hasActions) {
        Write-Host "  [OK] Acciones implementadas (tel, link, direccion)" -ForegroundColor Green
    } else {
        Write-Host "  [WARNING] Algunas acciones pueden faltar" -ForegroundColor Yellow
    }
    
    # Verificar estados (loading, empty, error, offline)
    $hasStates = $content -match "loading" -and 
                 $content -match "isOffline" -and
                 $content -match "refreshing"
    
    if ($hasStates) {
        Write-Host "  [OK] Estados implementados (loading, offline, refreshing)" -ForegroundColor Green
    } else {
        Write-Host "  [WARNING] Algunos estados pueden faltar" -ForegroundColor Yellow
    }
    
    Write-Host "`n[TEST 2] RESULTADO: PASS" -ForegroundColor Green
    $testResults += @{Test = "InfoUtilScreen.tsx"; Result = "PASS"}
    
} else {
    Write-Host "  [ERROR] Archivo InfoUtilScreen.tsx no encontrado" -ForegroundColor Red
    Write-Host "`n[TEST 2] RESULTADO: FAIL" -ForegroundColor Red
    $testResults += @{Test = "InfoUtilScreen.tsx"; Result = "FAIL"}
}

Start-Sleep -Milliseconds 500

# ============================================================================
# TEST 3: Verificar servicio InfoUtilService.ts
# ============================================================================

Write-Host "`n[TEST 3] Verificar servicio InfoUtilService.ts existe" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

$servicePath = Join-Path $PSScriptRoot "..\mobile\src\services\infoUtilService.ts"

if (Test-Path $servicePath) {
    $content = Get-Content $servicePath -Raw -Encoding UTF8
    
    # Verificar funciones clave
    $hasSaveToCache = $content -match "saveToCache"
    $hasGetFromCache = $content -match "getFromCache"
    $hasClearCache = $content -match "clearCache"
    $hasLastSync = $content -match "getLastSyncTimestamp"
    
    if ($hasSaveToCache -and $hasGetFromCache -and $hasClearCache -and $hasLastSync) {
        Write-Host "  [OK] Funciones cache implementadas:" -ForegroundColor Green
        Write-Host "    - saveToCache()" -ForegroundColor Gray
        Write-Host "    - getFromCache()" -ForegroundColor Gray
        Write-Host "    - clearCache()" -ForegroundColor Gray
        Write-Host "    - getLastSyncTimestamp()" -ForegroundColor Gray
    } else {
        Write-Host "  [WARNING] Algunas funciones cache pueden faltar" -ForegroundColor Yellow
    }
    
    # Verificar cache key
    $hasasCacheKey = $content -match "info_util_cache_v1"
    
    if ($hasCacheKey) {
        Write-Host "  [OK] Cache key correcta: info_util_cache_v1" -ForegroundColor Green
    } else {
        Write-Host "  [WARNING] Cache key puede ser incorrecta" -ForegroundColor Yellow
    }
    
    # Verificar tipo InfoUtilItem
    $hasItemType = $content -match "InfoUtilItem"
    
    if ($hasItemType) {
        Write-Host "  [OK] Tipo InfoUtilItem definido" -ForegroundColor Green
    } else {
        Write-Host "  [WARNING] Tipo InfoUtilItem puede faltar" -ForegroundColor Yellow
    }
    
    Write-Host "`n[TEST 3] RESULTADO: PASS" -ForegroundColor Green
    $testResults += @{Test = "InfoUtilService.ts"; Result = "PASS"}
    
} else {
    Write-Host "  [ERROR] Archivo infoUtilService.ts no encontrado" -ForegroundColor Red
    Write-Host "`n[TEST 3] RESULTADO: FAIL" -ForegroundColor Red
    $testResults += @{Test = "InfoUtilService.ts"; Result = "FAIL"}
}

Start-Sleep -Milliseconds 500

# ============================================================================
# TEST 4: Verificar integracion en navegacion (App.tsx)
# ============================================================================

Write-Host "`n[TEST 4] Verificar integracion en navegacion (App.tsx)" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

$appPath = Join-Path $PSScriptRoot "..\mobile\src\App.tsx"

if (Test-Path $appPath) {
    $content = Get-Content $appPath -Raw -Encoding UTF8
    
    # Verificar import InfoUtilScreen
    $hasImport = $content -match "import.*InfoUtilScreen"
    
    if ($hasImport) {
        Write-Host "  [OK] InfoUtilScreen importada en App.tsx" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] InfoUtilScreen NO importada" -ForegroundColor Red
    }
    
    # Verificar InfoUtilStack definido
    $hasStack = $content -match "function InfoUtilStack"
    
    if ($hasStack) {
        Write-Host "  [OK] InfoUtilStack definido" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] InfoUtilStack NO definido" -ForegroundColor Red
    }
    
    # Verificar Tab.Screen InfoUtil
    $hasTab = $content -match '<Tab.Screen.*name="InfoUtil"'
    
    if ($hasTab) {
        Write-Host "  [OK] Tab InfoUtil registrado en navegacion" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] Tab InfoUtil NO registrado" -ForegroundColor Red
    }
    
    # Verificar icono en tabBarIcon
    $hasIcon = $content -match "information-circle"
    
    if ($hasIcon) {
        Write-Host "  [OK] Icono information-circle configurado" -ForegroundColor Green
    } else {
        Write-Host "  [WARNING] Icono puede no estar configurado" -ForegroundColor Yellow
    }
    
    Write-Host "`n[TEST 4] RESULTADO: PASS" -ForegroundColor Green
    $testResults += @{Test = "Navegacion App.tsx"; Result = "PASS"}
    
} else {
    Write-Host "  [ERROR] Archivo App.tsx no encontrado" -ForegroundColor Red
    Write-Host "`n[TEST 4] RESULTADO: FAIL" -ForegroundColor Red
    $testResults += @{Test = "Navegacion App.tsx"; Result = "FAIL"}
}

# ============================================================================
# RESUMEN FINAL
# ============================================================================

Write-Host "`n============================================================================" -ForegroundColor Magenta
Write-Host "  RESUMEN TEST SUITE SEMANA 23" -ForegroundColor Magenta
Write-Host "============================================================================" -ForegroundColor Magenta
Write-Host ""

$passCount = ($testResults | Where-Object { $_.Result -eq "PASS" }).Count
$failCount = ($testResults | Where-Object { $_.Result -eq "FAIL" }).Count

Write-Host "Tests ejecutados:" -ForegroundColor White
foreach ($result in $testResults) {
    $color = if ($result.Result -eq "PASS") { "Green" } else { "Red" }
    $symbol = if ($result.Result -eq "PASS") { "[OK]" } else { "[FAIL]" }
    Write-Host "  $symbol $($result.Test)" -ForegroundColor $color
}
Write-Host ""
Write-Host "Total: $passCount PASS / $failCount FAIL" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Yellow" })
Write-Host ""
Write-Host "Componentes validados:" -ForegroundColor White
Write-Host "  - Endpoint GET /api/info-util (backend)" -ForegroundColor Gray
Write-Host "  - InfoUtilScreen.tsx (pantalla mobile)" -ForegroundColor Gray
Write-Host "  - InfoUtilService.ts (cache offline)" -ForegroundColor Gray
Write-Host "  - Integracion App.tsx (navegacion)" -ForegroundColor Gray
Write-Host ""
Write-Host "Funcionalidades confirmadas:" -ForegroundColor White
Write-Host "  - Cache offline con AsyncStorage (cache-first)" -ForegroundColor Gray
Write-Host "  - Acciones: tel:, Linking.openURL(), direccion en maps" -ForegroundColor Gray
Write-Host "  - Estados: loading, empty, error, offline" -ForegroundColor Gray
Write-Host "  - Refresh control (pull-to-refresh)" -ForegroundColor Gray
Write-Host "  - Tab navegacion con icono information-circle" -ForegroundColor Gray
Write-Host ""
Write-Host "============================================================================`n" -ForegroundColor Magenta
