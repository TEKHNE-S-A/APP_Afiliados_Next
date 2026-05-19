# Test Semana 16 - Google Maps + Ubicacion

Write-Host "`n========================================"  -ForegroundColor Cyan
Write-Host "  TEST SEMANA 16 - GOOGLE MAPS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 1. Verificar dependencias instaladas
Write-Host "1. Verificando dependencias..." -ForegroundColor Yellow
$packageJson = Get-Content "mobile\package.json" -Raw | ConvertFrom-Json

$hasLocation = $packageJson.dependencies.'expo-location' -ne $null
$hasMaps = $packageJson.dependencies.'react-native-maps' -ne $null

if ($hasLocation) {
    Write-Host "   [OK] expo-location instalado" -ForegroundColor Green
} else {
    Write-Host "   [ERROR] expo-location NO instalado" -ForegroundColor Red
}

if ($hasMaps) {
    Write-Host "   [OK] react-native-maps instalado" -ForegroundColor Green
} else {
    Write-Host "   [ERROR] react-native-maps NO instalado" -ForegroundColor Red
}

# 2. Verificar archivos creados
Write-Host "`n2. Verificando archivos creados..." -ForegroundColor Yellow

$files = @(
    "mobile\src\services\locationService.ts",
    "mobile\src\components\MapViewComponent.tsx",
    "mobile\src\screens\CartillaMapScreen.tsx"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        $lines = (Get-Content $file).Count
        Write-Host "   [OK] $file - $lines lineas" -ForegroundColor Green
    } else {
        Write-Host "   [ERROR] $file NO encontrado" -ForegroundColor Red
    }
}

# 3. Verificar configuracion app.json
Write-Host "`n3. Verificando configuracion app.json..." -ForegroundColor Yellow
$appJson = Get-Content "mobile\app.json" -Raw | ConvertFrom-Json

# Android permisos
$androidPermissions = $appJson.expo.android.permissions
$hasLocationPermissions = ($androidPermissions -contains "ACCESS_FINE_LOCATION") -and 
                          ($androidPermissions -contains "ACCESS_COARSE_LOCATION")

if ($hasLocationPermissions) {
    Write-Host "   [OK] Android: Permisos de ubicacion configurados" -ForegroundColor Green
} else {
    Write-Host "   [ERROR] Android: Permisos de ubicacion FALTANTES" -ForegroundColor Red
}

# Android Google Maps API Key
$hasAndroidApiKey = $appJson.expo.android.config.googleMaps.apiKey -ne $null
if ($hasAndroidApiKey) {
    $androidKey = $appJson.expo.android.config.googleMaps.apiKey
    if ($androidKey -eq "GOOGLE_MAPS_API_KEY_PLACEHOLDER") {
        Write-Host "   [WARN] Android: API Key es placeholder (necesita configuracion)" -ForegroundColor Yellow
    } else {
        Write-Host "   [OK] Android: API Key configurado" -ForegroundColor Green
    }
} else {
    Write-Host "   [ERROR] Android: API Key NO configurado" -ForegroundColor Red
}

# iOS permisos
$hasIosLocationPermission = $appJson.expo.ios.infoPlist.NSLocationWhenInUseUsageDescription -ne $null
if ($hasIosLocationPermission) {
    Write-Host "   [OK] iOS: Permisos de ubicacion configurados" -ForegroundColor Green
} else {
    Write-Host "   [ERROR] iOS: Permisos de ubicacion FALTANTES" -ForegroundColor Red
}

# iOS Google Maps API Key
$hasIosApiKey = $appJson.expo.ios.config.googleMapsApiKey -ne $null
if ($hasIosApiKey) {
    $iosKey = $appJson.expo.ios.config.googleMapsApiKey
    if ($iosKey -eq "GOOGLE_MAPS_API_KEY_PLACEHOLDER") {
        Write-Host "   [WARN] iOS: API Key es placeholder (necesita configuracion)" -ForegroundColor Yellow
    } else {
        Write-Host "   [OK] iOS: API Key configurado" -ForegroundColor Green
    }
} else {
    Write-Host "   [ERROR] iOS: API Key NO configurado" -ForegroundColor Red
}

# 4. Verificar integracion en App.tsx
Write-Host "`n4. Verificando integracion en navegacion..." -ForegroundColor Yellow
$appTsx = Get-Content "mobile\src\App.tsx" -Raw

$hasImport = $appTsx -match "import CartillaMapScreen"
$hasRoute = $appTsx -match 'name="CartillaMap"'

if ($hasImport) {
    Write-Host "   [OK] Import de CartillaMapScreen presente" -ForegroundColor Green
} else {
    Write-Host "   [ERROR] Import de CartillaMapScreen FALTANTE" -ForegroundColor Red
}

if ($hasRoute) {
    Write-Host "   [OK] Ruta CartillaMap configurada" -ForegroundColor Green
} else {
    Write-Host "   [ERROR] Ruta CartillaMap NO configurada" -ForegroundColor Red
}

# 5. Test API backend (si esta corriendo)
Write-Host "`n5. Testeando API backend..." -ForegroundColor Yellow

$backendUrl = "http://localhost:3000"
$lat = -28.4686692
$lng = -65.7798579
$radioKm = 10
$limit = 5
$testUrl = "${backendUrl}/api/cartilla?lat=$lat&lng=$lng&radioKm=$radioKm&limit=$limit"

try {
    $response = Invoke-RestMethod -Uri $testUrl -Method Get -TimeoutSec 5
    
    if ($response.data) {
        $count = $response.data.Count
        $total = $response.pagination.total
        Write-Host "   [OK] Backend respondiendo: $count/$total entidades" -ForegroundColor Green
        
        # Verificar que tienen distancia_km
        $hasDistance = $response.data[0].distancia_km -ne $null
        if ($hasDistance) {
            Write-Host "   [OK] Respuesta incluye distancia_km" -ForegroundColor Green
        } else {
            Write-Host "   [ERROR] Respuesta NO incluye distancia_km" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "   [WARN] Backend no responde (esta corriendo?)" -ForegroundColor Yellow
    Write-Host "      Para iniciar: cd backend; node server-soap.js" -ForegroundColor Gray
}

# Resumen
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  RESUMEN" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Componentes implementados:" -ForegroundColor White
Write-Host "  - locationService.ts (permisos + geolocalizacion)" -ForegroundColor Gray
Write-Host "  - MapViewComponent.tsx (mapa reutilizable)" -ForegroundColor Gray
Write-Host "  - CartillaMapScreen.tsx (pantalla completa)" -ForegroundColor Gray

Write-Host "`nProximos pasos:" -ForegroundColor White
Write-Host "  1. Configurar Google Maps API Key real en app.json" -ForegroundColor Yellow
Write-Host "  2. Ejecutar: cd mobile; npx expo start" -ForegroundColor Yellow
Write-Host "  3. Navegar a: Perfil -> CartillaMap" -ForegroundColor Yellow
Write-Host "  4. Permitir permisos de ubicacion" -ForegroundColor Yellow
Write-Host "  5. Verificar mapa + lista de prestadores cercanos`n" -ForegroundColor Yellow
