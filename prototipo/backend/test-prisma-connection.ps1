param(
  [string]$BackendDir = $PSScriptRoot,
  [string]$DatabaseUrl
)

$ErrorActionPreference = 'Stop'

Write-Host "== Prisma: validate/generate + conexión ==" -ForegroundColor Cyan
Write-Host "BackendDir: $BackendDir" -ForegroundColor DarkCyan

function Resolve-BackendDir {
  param([string]$Dir)

  # Caso esperado: ejecutado dentro de backend/
  if (Test-Path (Join-Path $Dir 'package.json')) {
    return $Dir
  }

  # Caso común: se pasa la raíz del repo
  $candidate = Join-Path $Dir 'backend'
  if (Test-Path (Join-Path $candidate 'package.json')) {
    return $candidate
  }

  return $Dir
}

$BackendDir = Resolve-BackendDir -Dir $BackendDir
Write-Host "BackendDir(resuelto): $BackendDir" -ForegroundColor DarkCyan
Set-Location $BackendDir

function Mask-DatabaseUrl {
  param([string]$Url)
  if ([string]::IsNullOrWhiteSpace($Url)) { return $Url }
  # Mascara la contraseña si viene en formato user:pass@
  return ($Url -replace '^(postgresql:\/\/[^:\/]+:)([^@]+)(@)', '$1***$3')
}

function Ensure-DatabaseUrl {
  if (-not [string]::IsNullOrWhiteSpace($DatabaseUrl)) {
    $env:DATABASE_URL = $DatabaseUrl
    return
  }
  if (-not [string]::IsNullOrWhiteSpace($env:DATABASE_URL)) {
    return
  }

  $hostName = if ($env:DB_HOST) { $env:DB_HOST } else { '127.0.0.1' }
  $port = if ($env:DB_PORT) { $env:DB_PORT } else { '5432' }
  $user = if ($env:DB_USER) { $env:DB_USER } else { 'postgres' }
  $password = if ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { '12345678' }
  $dbName = if ($env:DB_NAME) { $env:DB_NAME } else { 'app_afiliados_genexus' }

  # Encode básico (espacios/@ etc.)
  Add-Type -AssemblyName System.Web
  $encodedPassword = [System.Web.HttpUtility]::UrlEncode($password)
  $env:DATABASE_URL = ('postgresql://{0}:{1}@{2}:{3}/{4}?schema=public' -f $user, $encodedPassword, $hostName, $port, $dbName)
}

function Assert-LastExitCode {
  param([string]$Step)
  if ($LASTEXITCODE -ne 0) {
    throw "Fallo '$Step' (exit=$LASTEXITCODE)"
  }
}

Ensure-DatabaseUrl
Write-Host ("DATABASE_URL: {0}" -f (Mask-DatabaseUrl -Url $env:DATABASE_URL)) -ForegroundColor DarkGray

# 1) Validar schema
Write-Host "\n[1] prisma validate" -ForegroundColor Yellow
npm run -s prisma:validate
Assert-LastExitCode 'prisma validate'

# 2) Generar client
Write-Host "\n[2] prisma generate" -ForegroundColor Yellow
for ($i = 1; $i -le 3; $i++) {
  npm run -s prisma:generate
  if ($LASTEXITCODE -eq 0) { break }
  Write-Host ("prisma generate falló (exit=$LASTEXITCODE), reintento $i/3...") -ForegroundColor DarkYellow
  Start-Sleep -Seconds (2 * $i)
}
if ($LASTEXITCODE -ne 0) {
  Write-Host "WARN: prisma generate no pudo completarse (posible lock EPERM si el backend está corriendo)." -ForegroundColor DarkYellow
  Write-Host "      Podés reintentar con el backend detenido." -ForegroundColor DarkYellow
}

# 3) Probar conexión y query mínima
Write-Host "\n[3] node scripts/prisma-check.js" -ForegroundColor Yellow
if (-not (Test-Path (Join-Path $BackendDir 'scripts\prisma-check.js'))) {
  throw "No se encontró scripts/prisma-check.js en '$BackendDir'."
}
node .\scripts\prisma-check.js
Assert-LastExitCode 'node prisma-check'

Write-Host "\nOK" -ForegroundColor Green
