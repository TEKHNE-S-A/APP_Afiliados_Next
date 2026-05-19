[Diagnostics.CodeAnalysis.SuppressMessageAttribute('PSAvoidUsingPlainTextForPassword', '', Justification='Smoke test local (no usar en producción)')]
param(
  [string]$BaseUrl = 'http://127.0.0.1:3000',
  [string]$Username = 'marianr@tekhne.com.ar',
  [Alias('Password')]
  [string]$PasswordPlain = '123456',
  [switch]$SyntheticFallback,
  [string]$AfiliadoIdFallback = 'TESTPRESENCIALIDAD001'
)

$ErrorActionPreference = 'Stop'

function Assert-True {
  param([bool]$Condition, [string]$Message)
  if (-not $Condition) { throw "ASSERT FAILED: $Message" }
}

Write-Host "== Smoke test token presencialidad (3 digitos) ==" -ForegroundColor Cyan
Write-Host "BaseUrl: $BaseUrl"
Write-Host "Usuario: $Username"
Write-Host "Fallback sintético: $SyntheticFallback"

# 0) Health
$null = Invoke-RestMethod -Method Get -Uri "$BaseUrl/health" -TimeoutSec 8
Write-Host "Health OK" -ForegroundColor Green

# 1) Intentar login y obtención de credencial real
$afiliadoId = $null
$tokenTemporal = $null

try {
  $loginBody = @{ username = $Username; password = $PasswordPlain } | ConvertTo-Json
  $loginRes = Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/login" -ContentType 'application/json' -Body $loginBody

  $token = $null
  if ($loginRes.token) { $token = $loginRes.token }
  elseif ($loginRes.access_token) { $token = $loginRes.access_token }

  Assert-True ($null -ne $token -and $token.Length -gt 10) 'Login debe devolver token o access_token'
  Write-Host "Login OK" -ForegroundColor Green

  $headers = @{ Authorization = "Bearer $token" }
  $credsRes = Invoke-RestMethod -Method Get -Uri "$BaseUrl/credenciales" -Headers $headers

  Assert-True ($null -ne $credsRes.credenciales) 'Respuesta debe incluir credenciales[]'
  Assert-True ($credsRes.credenciales.Count -gt 0) 'Debe existir al menos una credencial para probar token presencialidad'

  $c0 = $credsRes.credenciales[0]
  $afiliadoId = [string]$c0.crcreafili
  if ([string]::IsNullOrWhiteSpace($afiliadoId)) {
    $afiliadoId = [string]$c0.AfiliadoId
  }

  $tokenTemporal = [string]$c0.tokenTemporal
  Assert-True (-not [string]::IsNullOrWhiteSpace($afiliadoId)) 'La credencial debe traer afiliadoId (crcreafili o AfiliadoId)'
  Assert-True ($tokenTemporal -match '^\d{3}$') 'tokenTemporal debe tener formato de 3 digitos'

  Write-Host "Credencial real OK: afiliadoId=$afiliadoId tokenTemporal=$tokenTemporal" -ForegroundColor Green
}
catch {
  if (-not $SyntheticFallback) {
    throw "No se pudo obtener una credencial real del usuario. Reintentá con un usuario que tenga credenciales o ejecutá con -SyntheticFallback. Detalle: $($_.Exception.Message)"
  }

  Write-Host "No se pudo usar credencial real; activando fallback sintético..." -ForegroundColor Yellow
  $afiliadoId = $AfiliadoIdFallback
  $rawOut = node -e "const s=require('./tokenService'); (async()=>{console.log(await s.generateTokenFor(process.argv[1], new Date()));})().catch(()=>process.exit(1));" "$afiliadoId"
  $rawText = [string]($rawOut -join "`n")
  $m = [regex]::Match($rawText, '(\d{3})\s*$')
  $tokenTemporal = if ($m.Success) { $m.Groups[1].Value } else { '' }
  Assert-True ($tokenTemporal -match '^\d{3}$') 'Fallback: tokenTemporal generado debe ser de 3 digitos'
  Write-Host "Fallback OK: afiliadoId=$afiliadoId tokenTemporal=$tokenTemporal" -ForegroundColor Yellow
}

# 3) Caso valido
$validUrl = "$BaseUrl/credencial/token-valido?afiliadoId=$([uri]::EscapeDataString($afiliadoId))&token=$tokenTemporal"
$validRes = Invoke-RestMethod -Method Get -Uri $validUrl -TimeoutSec 8

Assert-True ($validRes.valido -eq $true) 'El tokenTemporal de la credencial debe validar como valido'
Assert-True ($validRes.timeoutMinutos -ge 1) 'timeoutMinutos debe ser >= 1'
Assert-True (-not [string]::IsNullOrWhiteSpace([string]$validRes.expiraEn)) 'expiraEn debe existir'

Write-Host "Validacion positiva OK: valido=$($validRes.valido), expiraEn=$($validRes.expiraEn), timeout=$($validRes.timeoutMinutos)min" -ForegroundColor Green

# 4) Caso invalido (usar un token distinto al valido)
$invalidToken = '999'
if ($invalidToken -eq $tokenTemporal) { $invalidToken = '998' }

$invalidUrl = "$BaseUrl/credencial/token-valido?afiliadoId=$([uri]::EscapeDataString($afiliadoId))&token=$invalidToken"
$invalidRes = Invoke-RestMethod -Method Get -Uri $invalidUrl -TimeoutSec 8

Assert-True ($invalidRes.valido -eq $false) 'Un token incorrecto debe devolver valido=false'
Write-Host "Validacion negativa OK: token=$invalidToken valido=$($invalidRes.valido)" -ForegroundColor Green

Write-Host "TEST OK - endpoint /credencial/token-valido verificado" -ForegroundColor Green
exit 0
