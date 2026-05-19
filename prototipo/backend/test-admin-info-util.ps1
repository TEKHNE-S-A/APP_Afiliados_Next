[Diagnostics.CodeAnalysis.SuppressMessageAttribute('PSAvoidUsingPlainTextForPassword', '', Justification='Smoke test local (no usar en producción)')]
param(
  [string]$BaseUrl = 'http://127.0.0.1:3000',
  [string]$AdminUser = 'admin',
  [Alias('Password')]
  [string]$AdminPasswordPlain = 'admin123'
)

$ErrorActionPreference = 'Stop'

function Assert-True {
  param([bool]$Condition, [string]$Message)
  if (-not $Condition) { throw "ASSERT FAILED: $Message" }
}

Write-Host "== Smoke test (Admin Info util - noinfuti) ==" -ForegroundColor Cyan
Write-Host "BaseUrl: $BaseUrl"

# 0) Esperar backend /health
$healthOk = $false
for ($i = 1; $i -le 12; $i++) {
  try {
    $null = Invoke-RestMethod -Method Get -Uri "$BaseUrl/health" -TimeoutSec 2
    $healthOk = $true
    break
  } catch {
    Start-Sleep -Milliseconds 500
  }
}

if (-not $healthOk) {
  Write-Host "Backend no responde en $BaseUrl/health" -ForegroundColor Red
  exit 1
}

# 1) Crear usuario admin local para /admin/login (solo dev)
$createUserBody = @{ username = $AdminUser; password = $AdminPasswordPlain; email = 'admin@test.local' } | ConvertTo-Json
$null = Invoke-RestMethod -Method Post -Uri "$BaseUrl/debug/create-test-user" -ContentType 'application/json' -Body $createUserBody -TimeoutSec 10

# 2) Login admin
$loginBody = @{ username = $AdminUser; password = $AdminPasswordPlain } | ConvertTo-Json
$loginRes = Invoke-RestMethod -Method Post -Uri "$BaseUrl/admin/login" -ContentType 'application/json' -Body $loginBody -TimeoutSec 10

$token = $null
if ($loginRes.token) { $token = [string]$loginRes.token }
Assert-True ($null -ne $token -and $token.Length -gt 10) 'Login admin debe devolver token'

$headers = @{ Authorization = "Bearer $token" }
Write-Host "Login admin OK. Token len: $($token.Length)" -ForegroundColor Green

# 3) Catálogo de tipos
$tiposRes = Invoke-RestMethod -Method Get -Uri "$BaseUrl/admin/info-util/tipos" -Headers $headers -TimeoutSec 10
Assert-True ($null -ne $tiposRes.tipos) 'Respuesta tipos debe incluir tipos'
Write-Host "Tipos detectados: $($tiposRes.tipos.Count)" -ForegroundColor Green

# 4) Crear item
$createItemBody = @{
  tipo = 'T'
  titulo = 'Emergencias (prueba)'
  telefono = '0800-000-0000'
  direccion = ''
  geo = ''
  link = ''
  imagenUrl = ''
} | ConvertTo-Json

$item = Invoke-RestMethod -Method Post -Uri "$BaseUrl/admin/info-util" -Headers $headers -ContentType 'application/json' -Body $createItemBody -TimeoutSec 10
Assert-True ($null -ne $item.id) 'create debe devolver id'
Write-Host "Creado item id=$($item.id) tipo=$($item.tipo)" -ForegroundColor Green

# 5) Verificar aparece en público
$pub = Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/info-util" -TimeoutSec 10
Assert-True ($pub.items -is [System.Array]) 'public.items debe ser array'
$found = $pub.items | Where-Object { $_.id -eq $item.id }
Assert-True ($null -ne $found) 'El item creado debe aparecer en /api/info-util'

# 6) Eliminar item
$del = Invoke-RestMethod -Method Delete -Uri "$BaseUrl/admin/info-util/$($item.id)" -Headers $headers -TimeoutSec 10
Assert-True ($del.ok -eq $true) 'delete debe devolver ok=true'
Write-Host "Eliminado OK" -ForegroundColor Green

Write-Host "OK" -ForegroundColor Green
exit 0
