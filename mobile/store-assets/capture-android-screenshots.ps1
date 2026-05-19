param(
  [string]$Serial,
  [string]$Locale = "es-AR",
  [string]$DeviceType = "phone",
  [string]$AppId = "com.tekhnedesarrollo.demo",
  [string]$AdbPath,
  [int]$DelaySeconds = 1
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$outputDir = Join-Path $scriptDir "screenshots\android\$DeviceType\$Locale"

if (-not (Test-Path $outputDir)) {
  New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

$adbCandidates = @()
if ($AdbPath) {
  $adbCandidates += $AdbPath
}

$adbFromPath = Get-Command adb -ErrorAction SilentlyContinue
if ($adbFromPath) {
  $adbCandidates += $adbFromPath.Source
}

if ($env:ANDROID_HOME) {
  $adbCandidates += (Join-Path $env:ANDROID_HOME "platform-tools\adb.exe")
}

if ($env:ANDROID_SDK_ROOT) {
  $adbCandidates += (Join-Path $env:ANDROID_SDK_ROOT "platform-tools\adb.exe")
}

$adbCandidates += "C:\Android-SDK18U12\platform-tools\adb.exe"

$adbCmd = $adbCandidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
if (-not $adbCmd) {
  throw "No se encontró adb. Indicá -AdbPath o configurá ANDROID_HOME/ANDROID_SDK_ROOT."
}

$adbCliParams = @()
if ($Serial) {
  $adbCliParams += @("-s", $Serial)
}

Write-Host "== Captura Android para tienda ==" -ForegroundColor Cyan
Write-Host "Salida: $outputDir"
Write-Host "App: $AppId"
Write-Host "ADB: $adbCmd"

$devices = & $adbCmd @adbCliParams "devices"
if (-not $devices) {
  throw "No se pudo ejecutar adb. Verifica Android SDK/platform-tools."
}

$shots = @(
  @{ Name = "01-login"; Tip = "Pantalla de Login" },
  @{ Name = "02-home"; Tip = "Home con credencial titular" },
  @{ Name = "03-modal-qr"; Tip = "Modal credencial con QR" },
  @{ Name = "04-grupo-familiar"; Tip = "Carrusel o grupo familiar" },
  @{ Name = "05-perfil"; Tip = "Pantalla de perfil" },
  @{ Name = "06-prestadores"; Tip = "Pantalla de prestadores" },
  @{ Name = "07-solicitud-autorizacion"; Tip = "Solicitud de autorización" },
  @{ Name = "08-notificaciones-tramites"; Tip = "Notificaciones o trámites" }
)

$remoteFolder = "/sdcard/Download/store-shots"
& $adbCmd @adbCliParams "shell" "mkdir" "-p" $remoteFolder | Out-Null

for ($i = 0; $i -lt $shots.Count; $i++) {
  $shot = $shots[$i]
  $index = $i + 1
  Write-Host ""
  Write-Host "[$index/$($shots.Count)] $($shot.Name)" -ForegroundColor Yellow
  Write-Host "   $($shot.Tip)"
  Read-Host "Posicioná la app en esa pantalla y presioná Enter"

  if ($DelaySeconds -gt 0) {
    Start-Sleep -Seconds $DelaySeconds
  }

  $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $remoteFile = "$remoteFolder/$($shot.Name)-$timestamp.png"
  $localFile = Join-Path $outputDir "$($shot.Name).png"

  & $adbCmd @adbCliParams "shell" "screencap" "-p" $remoteFile | Out-Null
  & $adbCmd @adbCliParams "pull" $remoteFile $localFile | Out-Null
  & $adbCmd @adbCliParams "shell" "rm" "-f" $remoteFile | Out-Null

  if (Test-Path $localFile) {
    Write-Host "   OK -> $localFile" -ForegroundColor Green
  } else {
    Write-Host "   ERROR: no se encontró archivo local" -ForegroundColor Red
  }
}

Write-Host ""
Write-Host "Capturas completadas en: $outputDir" -ForegroundColor Cyan
Write-Host "Revisá que estén sin datos personales reales antes de subir a tienda." -ForegroundColor Magenta
