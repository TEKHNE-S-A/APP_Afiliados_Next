[Diagnostics.CodeAnalysis.SuppressMessageAttribute('PSAvoidUsingPlainTextForPassword', '', Justification='Smoke test local (no usar en producción)')]
param(
  [string]$BaseUrl = 'http://127.0.0.1:3000',
  [string]$Username = 'marianr@tekhne.com.ar',
  [Alias('Password')]
  [string]$PasswordPlain = '123456'
)

$ErrorActionPreference = 'Stop'

function Assert-True {
  param([bool]$Condition, [string]$Message)
  if (-not $Condition) { throw "ASSERT FAILED: $Message" }
}

Write-Host "== Semana 7 smoke test (repositories) ==" -ForegroundColor Cyan
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
$loginBody = @{ username = $Username; password = $PasswordPlain } | ConvertTo-Json

try {
  $loginRes = Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/login" -ContentType 'application/json' -Body $loginBody
} catch {
  $raw = $null
  try {
    $raw = $_.ErrorDetails.Message
  } catch {
    $raw = $null
  }

  Write-Host "Login FAILED" -ForegroundColor Red
  if ($raw) {
    Write-Host "Respuesta:" -ForegroundColor Yellow
    Write-Host $raw
    if ($raw -match 'Contrase\u00f1a incorrecta|Contrasea incorrecta|Contraseña incorrecta') {
      Write-Host "Hint: para usuarios de testing suele ser '123456'." -ForegroundColor Yellow
    }
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

# 2) Credenciales (lectura BD)
$headers = @{ Authorization = "Bearer $token" }
$credsRes = Invoke-RestMethod -Method Get -Uri "$BaseUrl/credenciales" -Headers $headers

Assert-True ($null -ne $credsRes.credenciales) 'Respuesta debe incluir credenciales[]'
Assert-True ($credsRes.credenciales -is [System.Array]) 'credenciales debe ser un array'
Write-Host "Credenciales recibidas: $($credsRes.credenciales.Count)" -ForegroundColor Green

if ($credsRes.credenciales.Count -gt 0) {
  $c0 = $credsRes.credenciales[0]
  Assert-True ($null -ne $c0.crcrefecvi) 'crcrefecvi debe existir'
  $fec = [string]$c0.crcrefecvi
  Assert-True ($fec.Length -ge 10) 'crcrefecvi debe tener al menos 10 chars'
  Assert-True ($fec.Substring(0,10) -match '^\d{4}-\d{2}-\d{2}$') 'crcrefecvi debe ser YYYY-MM-DD'

  $cuil = $c0.crcrecuil
  Assert-True ($null -ne $cuil) 'crcrecuil debe existir'
  Assert-True ([double]$cuil -gt 0) 'crcrecuil debe ser numérico > 0'

  Write-Host "Formato OK: crcrefecvi=$($fec.Substring(0,10)), crcrecuil=$cuil" -ForegroundColor Green
}

Write-Host "OK" -ForegroundColor Green
exit 0
