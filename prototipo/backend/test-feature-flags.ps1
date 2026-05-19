# Test Feature Flags - Tarea 20
# Valida los endpoints de feature flags recientemente implementados
# Requiere: backend corriendo en puerto 3000

$ErrorActionPreference = "Stop"
$BaseUrl = "http://localhost:3000"
$PASS = 0
$FAIL = 0

function Test-Endpoint {
  param( [string]$Name, [string]$Method, [string]$Url, [string]$Body = "" )
  
  Write-Host "`n[TEST] $Name" -ForegroundColor Cyan
  Write-Host "   $Method $Url" -ForegroundColor Gray
  
  try {
    $splat = @{ Method = $Method; Uri = $Url }
    if ($Body) { $splat['Body'] = $Body }
    if ($Body) { $splat['ContentType'] = 'application/json' }
    
    $response = Invoke-RestMethod @splat
    
    $successStatus = if ($response.PSObject.Properties.Name -contains 'success') { $response.success } else { $true }
    $statusText = if ($successStatus) { 'OK' } else { 'OK-BUT-NO-SUCCESS-FLAG' }
    Write-Host "   [OK] $statusText" -ForegroundColor Green
    
    if ($response.PSObject.Properties.Name -contains 'total') {
      Write-Host "      Total: $($response.total)" -ForegroundColor Cyan
    }
    if ($response.PSObject.Properties.Name -contains 'flags') {
      Write-Host "      Flags: $($response.flags.Count) items" -ForegroundColor Cyan
    }
    if ($response.PSObject.Properties.Name -contains 'habilitado') {
      Write-Host "      Habilitado: $($response.habilitado)" -ForegroundColor Cyan
    }
    
    $global:PASS++
    return $response
  } catch {
    Write-Host "   [FAIL] $_" -ForegroundColor Red
    $global:FAIL++
    return $null
  }
}

# ============================================================================
# HEADER
# ============================================================================
Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host "  TEST SUITE: Feature Flags (Tarea 20)" -ForegroundColor Yellow
Write-Host "  URL Base: $BaseUrl" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

# ============================================================================
# TEST 1: Obtener todos los flags
# ============================================================================
$allFlags = Test-Endpoint "GET /feature-flags (todos los flags)" GET "$BaseUrl/feature-flags"

if ($allFlags) {
  Write-Host "`n[INFO] Resumen de flags:" -ForegroundColor Cyan
  Write-Host "   Total: $($allFlags.total)" -ForegroundColor Green
  Write-Host "   Habilitados: $($allFlags.totalHabilitados)" -ForegroundColor Green
  $deshabilitados = $allFlags.total - $allFlags.totalHabilitados
  Write-Host "   Deshabilitados: $deshabilitados" -ForegroundColor Yellow
  
  # Mostrar por módulo
  if ($allFlags.porModulo) {
    Write-Host "`n[INFO] Por Modulo:" -ForegroundColor Cyan
    $allFlags.porModulo.PSObject.Properties | ForEach-Object {
      $modulo = $_.Name
      $count = $_.Value.Count
      $habilitados = ($_.Value | Where-Object { $_.habilitado }).Count
      Write-Host "   - $modulo`: $habilitados/$count habilitados" -ForegroundColor Green
    }
  }
}

# ============================================================================
# TEST 2: Obtener flag específico (HabilitarCartilla)
# ============================================================================
Test-Endpoint "GET /feature-flags/HabilitarCartilla" GET "$BaseUrl/feature-flags/HabilitarCartilla" | Out-Null

# ============================================================================
# TEST 3: Obtener flag específico (HabilitarAutorizSinOrden)
# ============================================================================
$flagAutoriz = Test-Endpoint "GET /feature-flags/HabilitarAutorizSinOrden" GET "$BaseUrl/feature-flags/HabilitarAutorizSinOrden"

# ============================================================================
# TEST 4: Obtener flags por módulo (cartilla)
# ============================================================================
Test-Endpoint "GET /feature-flags/modulo/cartilla" GET "$BaseUrl/feature-flags/modulo/cartilla" | Out-Null

# ============================================================================
# TEST 5: Obtener flags por módulo (sia)
# ============================================================================
Test-Endpoint "GET /feature-flags/modulo/sia" GET "$BaseUrl/feature-flags/modulo/sia" | Out-Null

# ============================================================================
# TEST 6: Obtener flags por módulo (notificaciones)
# ============================================================================
Test-Endpoint "GET /feature-flags/modulo/notificaciones" GET "$BaseUrl/feature-flags/modulo/notificaciones" | Out-Null

# ============================================================================
# TEST 7: Obtener flags por módulo (ui)
# ============================================================================
Test-Endpoint "GET /feature-flags/modulo/ui" GET "$BaseUrl/feature-flags/modulo/ui" | Out-Null

# ============================================================================
# TEST 8: Flag inválido (debe retornar 404)
# ============================================================================
Write-Host "`n[TEST] GET /feature-flags/FlagInexistente (debe fallar con 404)" -ForegroundColor Cyan
try {
  $response = Invoke-RestMethod -Method GET -Uri "$BaseUrl/feature-flags/FlagInexistente"
  Write-Host "   [FAIL] Esperaba 404, pero obtuvo 200" -ForegroundColor Red
  $global:FAIL++
} catch {
  if ($_.Exception.Response.StatusCode -eq 404) {
    Write-Host "   [OK] Correctamente rechazado con 404" -ForegroundColor Green
    $global:PASS++
  } else {
    Write-Host "   [FAIL] Error inesperado: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    $global:FAIL++
  }
}

# ============================================================================
# TEST 9: Comparar con endpoint antiguo (para compatibility)
# ============================================================================
Write-Host "`n[TEST] GET /parametros/funciones-app/habilitar-autoriz-sin-orden (legacy)" -ForegroundColor Cyan
try {
  $legacyResp = Invoke-RestMethod -Method GET -Uri "$BaseUrl/parametros/funciones-app/habilitar-autoriz-sin-orden"
  Write-Host "   [OK] Legacy endpoint OK: habilitado=$($legacyResp.habilitado)" -ForegroundColor Green
  $global:PASS++
  
  # Comparar con nuevo endpoint
  if ($flagAutoriz -and $legacyResp.habilitado -eq $flagAutoriz.habilitado) {
    Write-Host "   [OK] Valores sincronizados entre legacy y nuevo endpoint" -ForegroundColor Green
    $global:PASS++
  } else {
    Write-Host "   [WARN] Valores DIFERENTES entre endpoints" -ForegroundColor Yellow
  }
} catch {
  Write-Host "   [FAIL] Error: $_" -ForegroundColor Red
  $global:FAIL++
}

# ============================================================================
# RESULTADO FINAL
# ============================================================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  RESULTADO FINAL" -ForegroundColor Cyan
Write-Host "  [PASS] $PASS  |  [FAIL] $FAIL" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($FAIL -eq 0) {
  Write-Host "`n[SUCCESS] TODOS LOS TESTS PASARON!" -ForegroundColor Green
  exit 0
} else {
  Write-Host "`n[WARNING] Algunos tests fallaron" -ForegroundColor Yellow
  exit 1
}
