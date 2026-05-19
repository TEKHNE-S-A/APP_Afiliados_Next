param(
  [ValidateSet('production', 'preview', 'development')]
  [string]$Profile = 'production',
    [switch]$Submit,
    [switch]$ValidateOnly
)

$ErrorActionPreference = 'Stop'

$root    = $PSScriptRoot
$mobileDir = Join-Path $root "mobile"

# --- Verificar EAS CLI ---
$easCmd = Get-Command eas -ErrorAction SilentlyContinue
if (-not $easCmd) {
    Write-Host "Instalando EAS CLI..." -ForegroundColor Cyan
    npm install -g eas-cli
}

# --- Check 1: projectId configurado ---
$appJson = Get-Content (Join-Path $mobileDir "app.json") -Raw | ConvertFrom-Json
$projectId = $appJson.expo.extra.eas.projectId
if (-not $projectId) {
    Write-Warning "⚠️  extra.eas.projectId está vacío en app.json."
    Write-Warning "   Ejecutar 'eas init' dentro de mobile/ para vincular el proyecto a tu cuenta Expo."
    Write-Warning "   Requires: cuenta Expo gratuita en https://expo.dev"
    if (-not $ValidateOnly) {
        $resp = Read-Host "   ¿Continuar de todas formas? [s/N]"
        if ($resp -notmatch '^[sS]') { exit 0 }
    }
}

# --- Check 1.1: Bundle ID iOS no vacío ---
$bundleId = $appJson.expo.ios.bundleIdentifier
if (-not $bundleId) {
    Write-Warning "⚠️  ios.bundleIdentifier está vacío en app.json."
} elseif ($bundleId -match 'osep') {
    Write-Warning "⚠️  ios.bundleIdentifier contiene 'osep': $bundleId"
    Write-Warning "   Revisar si la marca final debe permanecer genérica."
} else {
    Write-Host "✅ Bundle ID iOS: $bundleId" -ForegroundColor Green
}

# --- Check 1.2: Google Maps API Key iOS ---
$iosMapsKey = $appJson.expo.ios.config.googleMapsApiKey
if (-not $iosMapsKey -or $iosMapsKey -match 'COMPLETAR') {
    Write-Warning "⚠️  googleMapsApiKey de iOS no está configurada en app.json."
    Write-Warning "   Completar expo.ios.config.googleMapsApiKey antes de publicar."
} else {
    Write-Host "✅ Google Maps API Key iOS configurada." -ForegroundColor Green
}

# --- Check 2: Apple IDs en eas.json (solo para producción) ---
if ($Profile -eq 'production') {
    $easJson = Get-Content (Join-Path $mobileDir "eas.json") -Raw
    if ($easJson -match 'COMPLETAR_APPLE') {
        Write-Warning "⚠️  eas.json tiene valores COMPLETAR_APPLE_* sin configurar."
        Write-Warning "   Completar: appleId, ascAppId y appleTeamId en mobile/eas.json sección submit.production.ios"
    }
}

# --- Check 2.1: metadata App Store (URLs legales) ---
$iosMetadata = Join-Path $mobileDir "store-metadata\ios-app-store.es-AR.md"
if (Test-Path $iosMetadata) {
    $iosMetadataText = Get-Content $iosMetadata -Raw
    if ($iosMetadataText -match 'COMPLETAR_URL') {
        Write-Warning "⚠️  iOS metadata aún tiene URLs sin completar (COMPLETAR_URL)."
    } else {
        Write-Host "✅ Metadata iOS: URLs legales completas." -ForegroundColor Green
    }
} else {
    Write-Warning "⚠️  No se encontró mobile/store-metadata/ios-app-store.es-AR.md"
}

# --- Check 3: URL de producción ---
$envFile = Join-Path $mobileDir ".env"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw
    if ($envContent -match 'API_BASE_URL_IOS\s*=\s*(http://192\.168\.|http://localhost|COMPLETAR)') {
        Write-Warning "⚠️  API_BASE_URL_IOS parece apuntar a servidor de desarrollo."
        Write-Warning "   Para App Store debe ser la URL HTTPS de producción."
        Write-Warning "   Copiar mobile/.env.production a mobile/.env y completar la URL."
        if (-not $ValidateOnly) {
            $resp = Read-Host "   ¿Continuar de todas formas? [s/N]"
            if ($resp -notmatch '^[sS]') { exit 0 }
        }
    }
}

if ($ValidateOnly) {
    Write-Host ""
    Write-Host "Validación iOS completada (sin build)." -ForegroundColor Green
    exit 0
}

# --- Build ---
Write-Host ""
Write-Host "==> Build iOS con EAS ($Profile)..." -ForegroundColor Cyan
Write-Host "    Plataforma: ios"
Write-Host "    El build se ejecuta en la nube de Expo (~15-20 min)."
Write-Host ""

Push-Location $mobileDir
try {
    if ($Submit) {
        & eas build --platform ios --profile $Profile --auto-submit
    } else {
        & eas build --platform ios --profile $Profile
    }
    if ($LASTEXITCODE -ne 0) { throw "EAS build finalizó con código $LASTEXITCODE" }
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "Build enviado. Seguir el progreso en: https://expo.dev" -ForegroundColor Green
if (-not $Submit) {
    Write-Host "Cuando esté listo, subir a TestFlight/App Store Connect con:" -ForegroundColor Cyan
    Write-Host "  eas submit --platform ios --profile production" -ForegroundColor White
}
