param(
  [ValidateSet('login','register','credencial','load500','stress','spike','admin','admin-baseline','admin-stress','admin-spike','sia','sia-baseline','sia-stress','sia-spike','all','all-critical')]
  [string]$Scenario = 'all',
  [string]$BaseUrl = 'http://localhost:3000',
  [string]$Username = 'admin@test.local',
  [string]$Password = 'admin123',
  [string]$DupEmail = 'ppinetta@gmail.com',
  [string]$Username2 = 'marianr@tekhne.com.ar',
  [string]$Username3 = 'diana76ar@gmail.com',
  [string]$Username4 = 'admin@osep.gob.ar',
  [string]$Username5 = '20120282388',
  [string]$Password2 = '123456',
  [string]$Password3 = '123456',
  [string]$Password4 = 'admin123',
  [string]$Password5 = '123456',
  [string]$SiaAfiliadoId = '000000380000000000001000000380',
  [int]$P95Ms = 1500,
  [int]$P99Ms = 2500,
  [int]$AdminUsersLimit = 5,
  [int]$AdminParametrosLimit = 100,
  [int]$SiaPrestacionesRatio = 100,
  [switch]$SkipSiaPrestaciones
)

$ErrorActionPreference = 'Stop'

# ---------- helpers admin API ----------
function Get-AdminToken {
  $r = Invoke-RestMethod -Method POST -Uri "$BaseUrl/admin/login" `
    -Body (ConvertTo-Json @{ email = $Username; password = $Password }) `
    -ContentType 'application/json' -ErrorAction SilentlyContinue
  if ($r) { return $r.token } else { return $null }
}

function Set-RateLimitEnabled([string]$Token, [bool]$Enabled) {
  $val = if ($Enabled) { 'S' } else { 'N' }
  $headers = @{ Authorization = "Bearer $Token" }
  $putBody   = ConvertTo-Json @{ valor = $val }
  $createBody = ConvertTo-Json @{ grupo = 'SEGURIDAD_APP'; tipo = 'RateLimitEnabled'; valor = $val }
  try {
    Invoke-RestMethod -Method PUT -Uri "$BaseUrl/admin/parametros/SEGURIDAD_APP/RateLimitEnabled" `
      -Body $putBody -ContentType 'application/json' -Headers $headers | Out-Null
    Write-Host "  RateLimitEnabled=$val" -ForegroundColor DarkGray
  } catch {
    $status = $_.Exception.Response.StatusCode.value__
    if ($status -eq 404) {
      try {
        Invoke-RestMethod -Method POST -Uri "$BaseUrl/admin/parametros" `
          -Body $createBody -ContentType 'application/json' -Headers $headers | Out-Null
        Write-Host "  RateLimitEnabled=$val (creado)" -ForegroundColor DarkGray
      } catch {
        Write-Host "  ⚠ No se pudo crear RateLimitEnabled: $($_.Exception.Message)" -ForegroundColor Yellow
      }
    } else {
      Write-Host "  ⚠ No se pudo cambiar RateLimitEnabled: $($_.Exception.Message)" -ForegroundColor Yellow
    }
  }
}
# ---------- /helpers ----------

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$k6Dir = Join-Path $scriptRoot 'k6'

$scenarios = @()
switch ($Scenario) {
  'login' { $scenarios = @(@{ file = 'login.js'; profile = 'baseline' }) }
  'register' { $scenarios = @(@{ file = 'register-duplicates.js'; profile = 'baseline' }) }
  'credencial' { $scenarios = @(@{ file = 'credencial.js'; profile = 'baseline' }) }
  'load500' { $scenarios = @(@{ file = 'mixed-critical.js'; profile = 'load500' }) }
  'stress' { $scenarios = @(@{ file = 'mixed-critical.js'; profile = 'stress' }) }
  'spike' { $scenarios = @(@{ file = 'mixed-critical.js'; profile = 'spike' }) }
  'admin' { $scenarios = @(@{ file = 'admin.js'; profile = 'load500' }) }
  'admin-baseline' { $scenarios = @(@{ file = 'admin.js'; profile = 'baseline' }) }
  'admin-stress' { $scenarios = @(@{ file = 'admin.js'; profile = 'stress' }) }
  'admin-spike' { $scenarios = @(@{ file = 'admin.js'; profile = 'spike' }) }
  'sia' { $scenarios = @(@{ file = 'sia.js'; profile = 'load500' }) }
  'sia-baseline' { $scenarios = @(@{ file = 'sia.js'; profile = 'baseline' }) }
  'sia-stress' { $scenarios = @(@{ file = 'sia.js'; profile = 'stress' }) }
  'sia-spike' { $scenarios = @(@{ file = 'sia.js'; profile = 'spike' }) }
  'all-critical' {
    $scenarios = @(
      @{ file = 'mixed-critical.js'; profile = 'load500' },
      @{ file = 'admin.js'; profile = 'load500' },
      @{ file = 'sia.js'; profile = 'load500' }
    )
  }
  default {
    $scenarios = @(
      @{ file = 'login.js'; profile = 'baseline' },
      @{ file = 'register-duplicates.js'; profile = 'baseline' },
      @{ file = 'credencial.js'; profile = 'baseline' }
    )
  }
}

$k6Local = Get-Command k6 -ErrorAction SilentlyContinue
# Fallback: buscar k6.exe en rutas conocidas si no está en PATH
if (-not $k6Local) {
  $k6FallbackPaths = @('E:\tools\k6\k6.exe', 'C:\tools\k6\k6.exe', "$env:LOCALAPPDATA\k6\k6.exe")
  foreach ($fb in $k6FallbackPaths) {
    if (Test-Path $fb) { $k6Local = $fb; break }
  }
}
$dockerCmd = Get-Command docker -ErrorAction SilentlyContinue

if (-not $k6Local -and -not $dockerCmd) {
  throw 'No se encontró k6 ni docker. Instala k6 (winget install GrafanaLabs.k6) o Docker Desktop.'
}

# Desactivar rate limiting durante los tests de carga para evitar falsos 429.
Write-Host ""
Write-Host "-- Obteniendo token admin para gestionar parámetros..." -ForegroundColor DarkGray
$adminToken = Get-AdminToken
if ($adminToken) {
  Set-RateLimitEnabled $adminToken $false
} else {
  Write-Host "  ⚠ No se pudo autenticar como admin; el rate limiter permanece activo." -ForegroundColor Yellow
}

try {
foreach ($scenarioConfig in $scenarios) {
  $file = $scenarioConfig.file
  $profile = $scenarioConfig.profile
  $fullPath = Join-Path $k6Dir $file
  if (-not (Test-Path $fullPath)) {
    throw "No existe el script de escenario: $fullPath"
  }

  Write-Host "" 
  Write-Host "=== Ejecutando $file ===" -ForegroundColor Cyan

  $includeSiaPrestaciones = if ($SkipSiaPrestaciones) { 'false' } else { 'true' }

  if ($k6Local) {
    & k6 run `
      -e "BASE_URL=$BaseUrl" `
      -e "USERNAME=$Username" `
      -e "USERNAME2=$Username2" `
      -e "USERNAME3=$Username3" `
      -e "USERNAME4=$Username4" `
      -e "USERNAME5=$Username5" `
      -e "PASSWORD=$Password" `
      -e "PASSWORD2=$Password2" `
      -e "PASSWORD3=$Password3" `
      -e "PASSWORD4=$Password4" `
      -e "PASSWORD5=$Password5" `
      -e "DUP_EMAIL=$DupEmail" `
      -e "SIA_AFILIADO_ID=$SiaAfiliadoId" `
      -e "PERF_PROFILE=$profile" `
      -e "P95_MS=$P95Ms" `
      -e "P99_MS=$P99Ms" `
      -e "ADMIN_USERS_LIMIT=$AdminUsersLimit" `
      -e "ADMIN_PARAMETROS_LIMIT=$AdminParametrosLimit" `
      -e "SIA_PRESTACIONES_RATIO=$SiaPrestacionesRatio" `
      -e "SIA_INCLUDE_PRESTACIONES=$includeSiaPrestaciones" `
      $fullPath

    if ($LASTEXITCODE -ne 0) {
      throw "k6 falló en escenario $file"
    }
  }
  else {
    # Dentro de Docker, "localhost" apunta al contenedor, no al host.
    # Reemplazamos automáticamente por host.docker.internal (Docker Desktop Windows/Mac).
    $dockerBaseUrl = $BaseUrl -replace 'localhost', 'host.docker.internal' `
                              -replace '127\.0\.0\.1', 'host.docker.internal'

    & docker run --rm `
      --add-host=host.docker.internal:host-gateway `
      -v "${k6Dir}:/scripts" `
      -e "BASE_URL=$dockerBaseUrl" `
      -e "USERNAME=$Username" `
      -e "USERNAME2=$Username2" `
      -e "USERNAME3=$Username3" `
      -e "USERNAME4=$Username4" `
      -e "USERNAME5=$Username5" `
      -e "PASSWORD=$Password" `
      -e "PASSWORD2=$Password2" `
      -e "PASSWORD3=$Password3" `
      -e "PASSWORD4=$Password4" `
      -e "PASSWORD5=$Password5" `
      -e "DUP_EMAIL=$DupEmail" `
      -e "SIA_AFILIADO_ID=$SiaAfiliadoId" `
      -e "PERF_PROFILE=$profile" `
      -e "P95_MS=$P95Ms" `
      -e "P99_MS=$P99Ms" `
      -e "ADMIN_USERS_LIMIT=$AdminUsersLimit" `
      -e "ADMIN_PARAMETROS_LIMIT=$AdminParametrosLimit" `
      -e "SIA_PRESTACIONES_RATIO=$SiaPrestacionesRatio" `
      -e "SIA_INCLUDE_PRESTACIONES=$includeSiaPrestaciones" `
      grafana/k6 run "/scripts/$file"

    if ($LASTEXITCODE -ne 0) {
      throw "k6 (docker) falló en escenario $file"
    }
  }
}

Write-Host "" 
Write-Host "OK: suite k6 finalizada." -ForegroundColor Green
} finally {
  # Siempre reactivar el rate limiter al terminar (sea éxito o error).
  if ($adminToken) {
    Write-Host ""
    Write-Host "-- Reactivando rate limiter..." -ForegroundColor DarkGray
    Set-RateLimitEnabled $adminToken $true
  }
}
