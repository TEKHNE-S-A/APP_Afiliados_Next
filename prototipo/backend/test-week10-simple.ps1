param([string]$BaseUrl="http://localhost:3000")
$ErrorActionPreference="Stop"

Write-Host "TEST WEEK 10: PARAMETROS via Repository" -ForegroundColor Cyan

# Login
$loginBody='{"username":"admin","password":"admin123"}'
$loginResp=Invoke-WebRequest -Uri "$BaseUrl/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -TimeoutSec 10
$token=($loginResp.Content|ConvertFrom-Json).token
$headers=@{"Authorization"="Bearer $token";"Content-Type"="application/json"}

# Test 1: listAll
Write-Host "[1/5] GET /admin/parametros (listAll)..." -ForegroundColor Yellow
$resp=Invoke-WebRequest -Uri "$BaseUrl/admin/parametros" -Method GET -Headers $headers -TimeoutSec 10
$data=$resp.Content|ConvertFrom-Json
if($data.total -lt 100){Write-Host "FAIL: total=$($data.total)" -ForegroundColor Red; exit 1}
Write-Host "PASS: listAll OK (total:$($data.total))" -ForegroundColor Green

# Test 2: listByGrupo
Write-Host "[2/5] GET /admin/parametros/GENERALES (listByGrupo)..." -ForegroundColor Yellow
$resp=Invoke-WebRequest -Uri "$BaseUrl/admin/parametros/GENERALES" -Method GET -Headers $headers -TimeoutSec 10
$data=$resp.Content|ConvertFrom-Json
if($data.grupo -ne "GENERALES"){Write-Host "FAIL: grupo" -ForegroundColor Red; exit 1}
Write-Host "PASS: listByGrupo OK (total:$($data.total))" -ForegroundColor Green

# Test 3: findOne
Write-Host "[3/5] GET /admin/parametros/GENERALES/VigenciaCred (findOne)..." -ForegroundColor Yellow
$resp=Invoke-WebRequest -Uri "$BaseUrl/admin/parametros/GENERALES/VigenciaCred" -Method GET -Headers $headers -TimeoutSec 10
$data=$resp.Content|ConvertFrom-Json
if($data.parametro.nusisgrupa -ne "GENERALES"){Write-Host "FAIL: nusisgrupa" -ForegroundColor Red; exit 1}
Write-Host "PASS: findOne OK (valor:$($data.parametro.nusisvalpa))" -ForegroundColor Green

# Test 4: create
Write-Host "[4/5] POST /admin/parametros (create)..." -ForegroundColor Yellow
$testGrupo="TEST_W10"
$testTipo="Test_$(Get-Date -Format 'HHmmss')"
$testValor="valor_$(Get-Random -Min 1000 -Max 9999)"
$createBody="{`"grupo`":`"$testGrupo`",`"tipo`":`"$testTipo`",`"valor`":`"$testValor`"}"
$resp=Invoke-WebRequest -Uri "$BaseUrl/admin/parametros" -Method POST -Headers $headers -Body $createBody -TimeoutSec 10
$data=$resp.Content|ConvertFrom-Json
if($resp.StatusCode -ne 201){Write-Host "FAIL: status" -ForegroundColor Red; exit 1}
Write-Host "PASS: create OK (grupo:$testGrupo, tipo:$testTipo)" -ForegroundColor Green

# Test 5: delete
Write-Host "[5/5] DELETE /admin/parametros/$testGrupo/$testTipo (remove)..." -ForegroundColor Yellow
$resp=Invoke-WebRequest -Uri "$BaseUrl/admin/parametros/$testGrupo/$testTipo" -Method DELETE -Headers $headers -TimeoutSec 10
$data=$resp.Content|ConvertFrom-Json
if(-not $data.success){Write-Host "FAIL: success=false" -ForegroundColor Red; exit 1}
Write-Host "PASS: remove OK" -ForegroundColor Green

Write-Host ""
Write-Host "ALL TESTS PASSED" -ForegroundColor Green
Write-Host "Week 10: Parametros via parametrosRepository.js" -ForegroundColor Cyan
exit 0
