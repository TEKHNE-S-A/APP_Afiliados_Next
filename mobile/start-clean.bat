@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

REM === Detectar Android SDK para que Expo encuentre adb ===
if "%ANDROID_SDK_ROOT%"=="" (
	if not "%ANDROID_HOME%"=="" set ANDROID_SDK_ROOT=%ANDROID_HOME%
)

if "%ANDROID_SDK_ROOT%"=="" (
	if exist "%LOCALAPPDATA%\Android\Sdk" set "ANDROID_SDK_ROOT=%LOCALAPPDATA%\Android\Sdk"
)

REM Normalizar ANDROID_HOME para tooling que lo requiera
if "%ANDROID_HOME%"=="" (
	if not "%ANDROID_SDK_ROOT%"=="" set "ANDROID_HOME=%ANDROID_SDK_ROOT%"
)

if not "%ANDROID_SDK_ROOT%"=="" (
	if exist "%ANDROID_SDK_ROOT%\platform-tools\adb.exe" (
		set "PATH=%ANDROID_SDK_ROOT%\platform-tools;%ANDROID_SDK_ROOT%\emulator;!PATH!"
		echo Android SDK: %ANDROID_SDK_ROOT%
		echo adb: %ANDROID_SDK_ROOT%\platform-tools\adb.exe
	) else (
		echo [WARN] ANDROID_SDK_ROOT seteado pero no encuentro adb.exe: %ANDROID_SDK_ROOT%\platform-tools\adb.exe
	)
) else (
	echo [WARN] No se detecto ANDROID_SDK_ROOT/ANDROID_HOME. Expo puede fallar al abrir Android.
)

echo === Limpiando caches ===
if exist ".expo" rmdir /s /q ".expo"
if exist "node_modules\.cache" rmdir /s /q "node_modules\.cache"
del /f /q "%TEMP%\metro-*" 2>nul
del /f /q "%TEMP%\haste-*" 2>nul

echo === Iniciando Expo ===
set EXPO_DEBUG=1
set DEBUG=expo:*

set "EXPO_ARGS=--port 8082 --clear"
if /I "%1"=="android" set "EXPO_ARGS=--android %EXPO_ARGS%"
if /I "%1"=="--android" set "EXPO_ARGS=--android %EXPO_ARGS%"

npx expo start %EXPO_ARGS%
