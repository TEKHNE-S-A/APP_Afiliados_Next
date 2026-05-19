param(
  [string]$BaseUrl = 'http://127.0.0.1:3000',
  [string]$Username = 'marianr@tekhne.com.ar',
  [string]$Pass = '123456'
)

$ErrorActionPreference = 'Stop'

function Assert-True {
  param([bool]$Condition, [string]$Message)
  if (-not $Condition) { throw "ASSERT FAILED: $Message" }
}

Write-Host "== Semana 8 smoke test (auth/me + requireAuth) ==" -ForegroundColor Cyan
Write-Host "BaseUrl: $BaseUrl"
Write-Host "Usuario: $Username"

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

# 1) Login
$loginBody = @{ username = $Username; password = $Pass } | ConvertTo-Json

try {
  $loginRes = Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/login" -ContentType 'application/json' -Body $loginBody
} catch {
  $raw = $null
  try { $raw = $_.ErrorDetails.Message } catch { $raw = $null }

  Write-Host "Login FAILED" -ForegroundColor Red
  if ($raw) {
    Write-Host "Respuesta:" -ForegroundColor Yellow
    Write-Host $raw
  } else {
    Write-Host ("Error: " + $_.Exception.Message) -ForegroundColor Yellow
  }
  exit 1
}

$token = $null
if ($loginRes.token) { $token = $loginRes.token }
elseif ($loginRes.access_token) { $token = $loginRes.access_token }

Assert-True ($null -ne $token -and $token.Length -gt 10) 'Login debe devolver token o access_token'
Write-Host "Login OK. Token len: $($token.Length)" -ForegroundColor Green

# 2) /auth/me
$headers = @{ Authorization = "Bearer $token" }
$me = Invoke-RestMethod -Method Get -Uri "$BaseUrl/auth/me" -Headers $headers

Assert-True ($null -ne $me.username -and [string]$me.username -ne '') '/auth/me debe devolver username'
Assert-True ($null -ne $me.nuusuid -and [string]$me.nuusuid -ne '') '/auth/me debe devolver nuusuid'
Write-Host ("Me OK: username=" + $me.username + " authType=" + $me.authType) -ForegroundColor Green

Write-Host "OK" -ForegroundColor Green
exit 0
