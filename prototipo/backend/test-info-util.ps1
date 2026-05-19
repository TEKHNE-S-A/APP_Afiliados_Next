param(
  [string]$BaseUrl = 'http://127.0.0.1:3000'
)

$ErrorActionPreference = 'Stop'

function Assert-True {
  param([bool]$Condition, [string]$Message)
  if (-not $Condition) { throw "ASSERT FAILED: $Message" }
}

Write-Host "== Semana 21 smoke test (Info útil - GET /api/info-util) ==" -ForegroundColor Cyan
Write-Host "BaseUrl: $BaseUrl"

# 0) Esperar backend /health
$healthOk = $false
for ($i = 1; $i -le 8; $i++) {
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
  Write-Host "Levantalo con: cd backend; node server-soap.js" -ForegroundColor Yellow
  exit 1
}

# 1) GET /api/info-util
try {
  $res = Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/info-util" -TimeoutSec 10
} catch {
  $raw = $null
  try { $raw = $_.ErrorDetails.Message } catch { $raw = $null }

  Write-Host "GET /api/info-util FAILED" -ForegroundColor Red
  if ($raw) {
    Write-Host "Respuesta:" -ForegroundColor Yellow
    Write-Host $raw
  } else {
    Write-Host ("Error: " + $_.Exception.Message) -ForegroundColor Yellow
  }
  exit 1
}

Assert-True ($null -ne $res.items) 'Respuesta debe incluir items'
Assert-True ($res.items -is [System.Array]) 'items debe ser un array'

Write-Host "Items recibidos: $($res.items.Count)" -ForegroundColor Green

if ($res.items.Count -gt 0) {
  $i0 = $res.items[0]

  Assert-True ($null -ne $i0.id) 'item.id debe existir'
  Assert-True ($null -ne $i0.tipo) 'item.tipo debe existir'
  Assert-True ($null -ne $i0.titulo) 'item.titulo debe existir'

  Write-Host "Primer item: tipo=$($i0.tipo) titulo=$($i0.titulo)" -ForegroundColor Green
}

Write-Host "OK" -ForegroundColor Green
exit 0
