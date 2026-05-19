#!/usr/bin/env pwsh
# Script para iniciar Expo desde el directorio correcto

param(
    [switch]$Android,
    [switch]$Debug
)

Set-Location $PSScriptRoot
Write-Host "📱 Directorio actual: $(Get-Location)"
Write-Host "📦 Verificando package.json..."

if (Test-Path "package.json") {
    Write-Host "✅ package.json encontrado"

    # Intentar detectar Android SDK automáticamente (necesario para que Expo pueda usar adb)
    if (-not $env:ANDROID_SDK_ROOT -and -not $env:ANDROID_HOME) {
        $defaultSdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
        if (Test-Path $defaultSdk) {
            $env:ANDROID_SDK_ROOT = $defaultSdk
            $env:ANDROID_HOME = $defaultSdk
        }
    }

    if ($env:ANDROID_SDK_ROOT -and -not $env:ANDROID_HOME) {
        $env:ANDROID_HOME = $env:ANDROID_SDK_ROOT
    }
    if ($env:ANDROID_HOME -and -not $env:ANDROID_SDK_ROOT) {
        $env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
    }

    $sdkRoot = $env:ANDROID_SDK_ROOT
    if (-not $sdkRoot) { $sdkRoot = $env:ANDROID_HOME }

    if ($sdkRoot -and (Test-Path $sdkRoot)) {
        $platformTools = Join-Path $sdkRoot 'platform-tools'
        $emulatorDir = Join-Path $sdkRoot 'emulator'
        if (Test-Path $platformTools) {
            $env:PATH = "$platformTools;$env:PATH"
        }
        if (Test-Path $emulatorDir) {
            $env:PATH = "$emulatorDir;$env:PATH"
        }

        $adb = Join-Path $platformTools 'adb.exe'
        if (Test-Path $adb) {
            Write-Host "🤖 Android SDK detectado: $sdkRoot"
            Write-Host "✅ adb: $adb"
        } else {
            Write-Host "⚠️ Android SDK detectado pero no encuentro adb.exe en: $platformTools"
        }
    } else {
        Write-Host "⚠️ ANDROID_SDK_ROOT/ANDROID_HOME no configurado. Expo puede fallar al abrir Android (adb)."
    }

    if ($Debug) {
        $env:EXPO_DEBUG = '1'
        if (-not $env:DEBUG) {
            $env:DEBUG = 'expo:*'
        }
    }

    Write-Host "🚀 Iniciando Expo en puerto 8082..."
    if ($Android) {
        npx expo start --android --port 8082 --clear
    } else {
        npx expo start --port 8082 --clear
    }
} else {
    Write-Host "❌ ERROR: package.json no encontrado en $(Get-Location)"
    exit 1
}
