param(
  [switch]$SkipBuild,
  [ValidateSet('default', 'test', 'production')]
  [string]$Profile = 'default',
  [string]$OutDir = "dist\apk"
)

$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot
$mobileDir = Join-Path $root "mobile"
$androidDir = Join-Path $root "mobile\android"
$apkSource = Join-Path $androidDir "app\build\outputs\apk\release\app-release.apk"
$destDir = Join-Path $root $OutDir
$envProductionPath = Join-Path $mobileDir ".env.production"
$envTestPath = Join-Path $mobileDir ".env.test"

$envProductionBackup = $null

function Set-BuildEnvironmentFiles {
  param(
    [string]$SelectedProfile
  )

  if (-not (Test-Path $envProductionPath)) {
    throw "No se encontró el archivo de entorno de producción: $envProductionPath"
  }

  $script:envProductionBackup = Get-Content -Path $envProductionPath -Raw

  switch ($SelectedProfile) {
    'default' {
      Write-Host "==> Usando perfil por defecto (mobile/.env.production actual)." -ForegroundColor Cyan
      return
    }
    'test' {
      if (-not (Test-Path $envTestPath)) {
        throw "No se encontró el archivo de entorno de test: $envTestPath"
      }

      $testContent = Get-Content -Path $envTestPath -Raw
      Set-Content -Path $envProductionPath -Value $testContent -NoNewline
      Write-Host "==> Perfil de build: TEST" -ForegroundColor Cyan
      Write-Host "    Se aplicó mobile/.env.test sobre mobile/.env.production durante el build." -ForegroundColor DarkCyan
    }
    'production' {
      Write-Host "==> Perfil de build: PRODUCTION" -ForegroundColor Cyan
      Write-Host "    Se usa mobile/.env.production sin tocar mobile/.env." -ForegroundColor DarkCyan
    }
  }
}

function Restore-BuildEnvironmentFiles {
  if ($null -ne $envProductionBackup) {
    Set-Content -Path $envProductionPath -Value $envProductionBackup -NoNewline
  }
}

if (-not (Test-Path $androidDir)) {
  throw "No se encontró la carpeta Android: $androidDir"
}

Set-BuildEnvironmentFiles -SelectedProfile $Profile

try {
  if (-not $SkipBuild) {
    Write-Host "==> Generando APK release..." -ForegroundColor Cyan
    Push-Location $androidDir
    try {
      & .\gradlew.bat assembleRelease
      if ($LASTEXITCODE -ne 0) {
        throw "Gradle finalizó con código $LASTEXITCODE"
      }
    }
    finally {
      Pop-Location
    }
  }
  else {
    Write-Host "==> Omitiendo build (SkipBuild)." -ForegroundColor Yellow
  }
}
finally {
  Restore-BuildEnvironmentFiles
}

if (-not (Test-Path $apkSource)) {
  throw "No se encontró el APK esperado en: $apkSource"
}

New-Item -ItemType Directory -Path $destDir -Force | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$apkVersioned = Join-Path $destDir "app-release-$timestamp.apk"
$apkLatest = Join-Path $destDir "app-release-latest.apk"

Copy-Item -Path $apkSource -Destination $apkVersioned -Force
Copy-Item -Path $apkSource -Destination $apkLatest -Force

$fileInfo = Get-Item $apkVersioned

Write-Host "" 
Write-Host "APK generado y copiado correctamente:" -ForegroundColor Green
Write-Host "- Versionado: $apkVersioned"
Write-Host "- Último:     $apkLatest"
Write-Host "- Perfil:     $Profile"
Write-Host "- Tamaño:     $([math]::Round($fileInfo.Length / 1MB, 2)) MB"
Write-Host "- Fecha:      $($fileInfo.LastWriteTime)"
