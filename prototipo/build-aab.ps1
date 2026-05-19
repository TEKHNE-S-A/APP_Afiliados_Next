param(
  [switch]$SkipBuild,
    [switch]$SkipClean,
  [string]$OutDir = "dist\aab"
)

$ErrorActionPreference = 'Stop'

$root      = $PSScriptRoot
$androidDir = Join-Path $root "mobile\android"
$aabSource  = Join-Path $androidDir "app\build\outputs\bundle\release\app-release.aab"
$destDir    = Join-Path $root $OutDir

if (-not (Test-Path $androidDir)) {
    throw "No se encontró la carpeta Android: $androidDir"
}

if (-not $SkipBuild) {
    # --- Check 1: Keystore de producción ---
    $gradleProps = Join-Path $androidDir "gradle.properties"
    $localProps  = Join-Path $androidDir "local.properties"
    $hasKeystore = (Select-String -Path $gradleProps -Pattern '^APP_RELEASE_STORE_FILE=' -Quiet) -or
                   ((Test-Path $localProps) -and (Select-String -Path $localProps -Pattern '^APP_RELEASE_STORE_FILE=' -Quiet))
    if ($hasKeystore) {
        Write-Host "✅ Keystore de producción configurada." -ForegroundColor Green
    } else {
        Write-Warning "⚠️  APP_RELEASE_STORE_FILE no está configurado."
        Write-Warning "   Configurar en mobile/android/local.properties (recomendado) o gradle.properties."
        Write-Warning "   Ver mobile/keystores/README.md."
        $resp = Read-Host "   ¿Continuar de todas formas? [s/N]"
        if ($resp -notmatch '^[sS]') { exit 0 }
    }

    # --- Check 2: URL de producción en .env ---
    $envFile = Join-Path $root "mobile\.env"
    if (Test-Path $envFile) {
        $envContent = Get-Content $envFile -Raw
        if ($envContent -match 'API_BASE_URL_ANDROID\s*=\s*(http://10\.0\.[23]\.[23]|http://192\.168\.|http://localhost|COMPLETAR)') {
            Write-Warning "⚠️  API_BASE_URL_ANDROID parece apuntar a un servidor de desarrollo o no está configurado."
            Write-Warning "   Para Play Store debe ser la URL HTTPS de producción."
            Write-Warning "   Copiar mobile/.env.production a mobile/.env y completar la URL antes de publicar."
            $resp = Read-Host "   ¿Continuar de todas formas? [s/N]"
            if ($resp -notmatch '^[sS]') { exit 0 }
        } else {
            Write-Host "✅ URL de backend configurada." -ForegroundColor Green
        }
    } else {
        Write-Warning "⚠️  No se encontró mobile/.env. Verificar que API_BASE_URL_ANDROID apunta a producción."
    }

    # --- Check 3: cleartext traffic ---
    $appJson = Join-Path $root "mobile\app.json"
    if ((Get-Content $appJson -Raw) -match '"usesCleartextTraffic"\s*:\s*true') {
        Write-Warning "⚠️  usesCleartextTraffic=true en app.json. En producción el backend debe ser HTTPS."
        Write-Warning "   Cuando el backend de producción esté en HTTPS, cambiar a false en app.json."
    }

    Push-Location $androidDir
    try {
        if (-not $SkipClean) {
            Write-Host "==> Limpiando build anterior..." -ForegroundColor Cyan
            & .\gradlew.bat clean
            if ($LASTEXITCODE -ne 0) { throw "Clean falló con código $LASTEXITCODE" }
        } else {
            Write-Host "==> Omitiendo clean (SkipClean)." -ForegroundColor Yellow
        }

        Write-Host "==> Generando AAB release..." -ForegroundColor Cyan
        & .\gradlew.bat bundleRelease -x lintVitalAnalyzeRelease -x lintVitalReportRelease -x :react-native-screens:lintVitalAnalyzeRelease
        if ($LASTEXITCODE -ne 0) { throw "bundleRelease falló con código $LASTEXITCODE" }
    } finally {
        Pop-Location
    }
} else {
    Write-Host "==> Omitiendo build (SkipBuild)." -ForegroundColor Yellow
}

if (-not (Test-Path $aabSource)) {
    throw "No se encontró el AAB esperado en: $aabSource"
}

New-Item -ItemType Directory -Path $destDir -Force | Out-Null

$timestamp  = Get-Date -Format "yyyyMMdd-HHmmss"
$aabVersioned = Join-Path $destDir "app-release-$timestamp.aab"
$aabLatest    = Join-Path $destDir "app-release-latest.aab"

Copy-Item -Path $aabSource -Destination $aabVersioned -Force
Copy-Item -Path $aabSource -Destination $aabLatest    -Force

$fileInfo = Get-Item $aabVersioned

Write-Host ""
Write-Host "AAB generado correctamente:" -ForegroundColor Green
Write-Host "  Versionado : $aabVersioned"
Write-Host "  Último     : $aabLatest"
Write-Host "  Tamaño     : $([math]::Round($fileInfo.Length / 1MB, 2)) MB"
Write-Host "  Fecha      : $($fileInfo.LastWriteTime)"
Write-Host ""
Write-Host "Próximo paso: subir $aabLatest a Play Console → track interno." -ForegroundColor Cyan
