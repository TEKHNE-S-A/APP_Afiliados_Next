# Test para Favoritos y Recientes
# Ejecutar después de: npm install && node server-soap.js
# Requiremientos: Backend corriendo en http://localhost:3000

param(
  [switch]$SkipAuth = $false
)

$ENDPOINT = "http://localhost:3000"
$TestUser = @{
  email = "admin@test.local"
  password = "admin123"
}
$global:authToken = $null
$TestCaentid = "000000000000000000000000000012"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TEST: Favoritos y Recientes" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 1. Login
function Test-Login {
  Write-Host "[INFO] Realizando login..." -ForegroundColor Magenta
  
  try {
    $response = Invoke-WebRequest `
      -Uri "$ENDPOINT/admin/login" `
      -Method POST `
      -Headers @{ "Content-Type" = "application/json" } `
      -Body (ConvertTo-Json @{
        username = $TestUser.email
        password = $TestUser.password
      }) `
      -UseBasicParsing
    
    $data = $response.Content | ConvertFrom-Json
    $global:authToken = $data.token
    
    Write-Host "[OK] Login exitoso - Token: $($global:authToken.Substring(0, 20))..." -ForegroundColor Green
    return $true
  } catch {
    Write-Host "[FAIL] Login falló: $($_.Exception.Message)" -ForegroundColor Red
    return $false
  }
}

# Test BASE
Write-Host "`n========== TEST 1: Login ==========" -ForegroundColor Yellow
if (-not (Test-Login)) {
  exit 1
}

# Test 2: POST /api/me/favoritos
Write-Host "`n========== TEST 2: Agregar a Favoritos ==========" -ForegroundColor Yellow
try {
  $response = Invoke-WebRequest `
    -Uri "$ENDPOINT/api/me/favoritos" `
    -Method POST `
    -Headers @{
      "Content-Type" = "application/json"
      "Authorization" = "Bearer $global:authToken"
    } `
    -Body (ConvertTo-Json @{ caentid = $TestCaentid }) `
    -UseBasicParsing

  if ($response.StatusCode -eq 201) {
    Write-Host "[OK] Favorito agregado (201)" -ForegroundColor Green
  } else {
    Write-Host "[OK] Status: $($response.StatusCode)" -ForegroundColor Green
  }
} catch {
  Write-Host "[FAIL] Error al agregar favorito: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: GET /api/me/favoritos
Write-Host "`n========== TEST 3: Listar Favoritos ==========" -ForegroundColor Yellow
try {
  $response = Invoke-WebRequest `
    -Uri "$ENDPOINT/api/me/favoritos" `
    -Method GET `
    -Headers @{
      "Authorization" = "Bearer $global:authToken"
    } `
    -UseBasicParsing

  $data = $response.Content | ConvertFrom-Json
  Write-Host "[OK] Favoritos obtenidos: $($data.total) encontrados" -ForegroundColor Green
  
  if ($data.favoritos.Count -gt 0) {
    Write-Host "    - Primer favorito: $($data.favoritos[0].caentid)" -ForegroundColor Cyan
  }
} catch {
  Write-Host "[FAIL] Error al obtener favoritos: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: POST /api/me/recientes
Write-Host "`n========== TEST 4: Registrar Reciente ==========" -ForegroundColor Yellow
try {
  $responseReciente = Invoke-WebRequest `
    -Uri "$ENDPOINT/api/me/recientes" `
    -Method POST `
    -Headers @{
      "Content-Type" = "application/json"
      "Authorization" = "Bearer $global:authToken"
    } `
    -Body (ConvertTo-Json @{ caentid = $TestCaentid }) `
    -UseBasicParsing

  if ($responseReciente.StatusCode -eq 201) {
    Write-Host "[OK] Acceso registrado (201)" -ForegroundColor Green
  }
} catch {
  Write-Host "[FAIL] Error al registrar reciente: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: GET /api/me/recientes
Write-Host "`n========== TEST 5: Listar Recientes ==========" -ForegroundColor Yellow
try {
  $response = Invoke-WebRequest `
    -Uri "$ENDPOINT/api/me/recientes" `
    -Method GET `
    -Headers @{
      "Authorization" = "Bearer $global:authToken"
    } `
    -UseBasicParsing

  $data = $response.Content | ConvertFrom-Json
  Write-Host "[OK] Recientes obtenidos: $($data.total) encontrados" -ForegroundColor Green
  
  if ($data.recientes.Count -gt 0) {
    Write-Host "    - Primer reciente: $($data.recientes[0].caentid)" -ForegroundColor Cyan
  }
} catch {
  Write-Host "[FAIL] Error al obtener recientes: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 6: GET /api/me/favoritos-y-recientes
Write-Host "`n========== TEST 6: Combo Favoritos + Recientes ==========" -ForegroundColor Yellow
try {
  $response = Invoke-WebRequest `
    -Uri "$ENDPOINT/api/me/favoritos-y-recientes" `
    -Method GET `
    -Headers @{
      "Authorization" = "Bearer $global:authToken"
    } `
    -UseBasicParsing

  $data = $response.Content | ConvertFrom-Json
  Write-Host "[OK] Combo obtenido: $($data.favoritos.Count) favoritos + $($data.recientes.Count) recientes" -ForegroundColor Green
} catch {
  Write-Host "[FAIL] Error al obtener combo: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 7: DELETE /api/me/favoritos/:caentid
Write-Host "`n========== TEST 7: Remover de Favoritos ==========" -ForegroundColor Yellow
try {
  $response = Invoke-WebRequest `
    -Uri "$ENDPOINT/api/me/favoritos/$TestCaentid" `
    -Method DELETE `
    -Headers @{
      "Authorization" = "Bearer $global:authToken"
    } `
    -UseBasicParsing

  $data = $response.Content | ConvertFrom-Json
  Write-Host "[OK] Favorito removido: $($data.success)" -ForegroundColor Green
} catch {
  Write-Host "[FAIL] Error al remover: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 8: DELETE /api/me/recientes - Limpiar todos
Write-Host "`n========== TEST 8: Limpiar Todos los Recientes ==========" -ForegroundColor Yellow
try {
  $response = Invoke-WebRequest `
    -Uri "$ENDPOINT/api/me/recientes" `
    -Method DELETE `
    -Headers @{
      "Authorization" = "Bearer $global:authToken"
    } `
    -UseBasicParsing

  $data = $response.Content | ConvertFrom-Json
  Write-Host "[OK] Limpiados: $($data.count) recientes" -ForegroundColor Green
} catch {
  Write-Host "[FAIL] Error al limpiar: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 9: Validar que sin token retorna 401
Write-Host "`n========== TEST 9: Validar Autenticación ==========" -ForegroundColor Yellow
try {
  $response = Invoke-WebRequest `
    -Uri "$ENDPOINT/api/me/favoritos" `
    -Method GET `
    -UseBasicParsing `
    -ErrorAction Stop
  
  Write-Host "[FAIL] Debería haber retornado 401" -ForegroundColor Red
} catch {
  if ($_.Exception.Response.StatusCode -eq 401) {
    Write-Host "[OK] Retornó 401 Unauthorized (correcto)" -ForegroundColor Green
  } else {
    Write-Host "[FAIL] Retornó: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
  }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TESTS COMPLETADOS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
