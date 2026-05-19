# ============================================================================
# Script PowerShell: Probar Sesión Persistente Mobile (Punto 2)
# ============================================================================
# Propósito: Guía interactiva para verificar sesión persistente en la app
# Uso: .\test-punto-2-sesion-persistente.ps1
# ============================================================================

Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "  TEST PUNTO 2 - Sesión Persistente Mobile" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📱 Este test verificará que la sesión persiste al cerrar la app" -ForegroundColor Yellow
Write-Host "   y solo se cierra con logout explícito desde ProfileScreen" -ForegroundColor Yellow
Write-Host ""

# Verificar que estamos en el directorio mobile
$mobileDir = "mobile"
if (-not (Test-Path $mobileDir)) {
    Write-Host "❌ ERROR: Directorio mobile no encontrado" -ForegroundColor Red
    Write-Host "   Ejecute desde el directorio raíz del proyecto" -ForegroundColor Yellow
    exit 1
}

Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "PREPARACIÓN: Iniciando Metro Bundler" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar si Metro ya está corriendo (puerto típico de Expo: 19000)
$metroPort = 19000
$metroRunning = $false
try {
    $connection = Test-NetConnection -ComputerName 'localhost' -Port $metroPort -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
    if ($connection.TcpTestSucceeded) {
        $metroRunning = $true
    }
} catch {
    $metroRunning = $false
}

if ($metroRunning) {
    Write-Host "✅ Metro Bundler ya está corriendo" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "🚀 Iniciando Metro Bundler..." -ForegroundColor Yellow
    Write-Host ""
    
    # Iniciar Metro en nueva ventana
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\$mobileDir'; npx expo start" -WindowStyle Normal
    
    Write-Host "⏳ Esperando que Metro Bundler esté listo (10 segundos)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    Write-Host ""
}

Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "TEST 1: Sesión persiste al cerrar app" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 PASOS A SEGUIR:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  1. Abrir la app en el emulador/dispositivo" -ForegroundColor Gray
Write-Host "     - Presione 'a' en Metro para Android" -ForegroundColor Gray
Write-Host "     - Presione 'i' en Metro para iOS" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Hacer LOGIN con credenciales válidas:" -ForegroundColor Gray
Write-Host "     Usuario: marianr@tekhne.com.ar" -ForegroundColor Cyan
Write-Host "     Password: 123456" -ForegroundColor Cyan
Write-Host ""
Write-Host "  3. Verificar que llegó a HomeScreen" -ForegroundColor Gray
Write-Host "     ✅ Debe ver credencial titular" -ForegroundColor Green
Write-Host "     ✅ Debe ver mensaje 'Bienvenido [nombre]'" -ForegroundColor Green
Write-Host ""
Write-Host "  4. CERRAR LA APP COMPLETAMENTE (Force Quit):" -ForegroundColor Gray
Write-Host "     Android: Swipe up desde botón cuadrado → Cerrar app" -ForegroundColor Gray
Write-Host "     iOS: Doble tap Home → Swipe up en la app" -ForegroundColor Gray
Write-Host ""

Read-Host "Presione ENTER cuando haya completado los pasos 1-4"

Write-Host ""
Write-Host "  5. RE-ABRIR LA APP" -ForegroundColor Gray
Write-Host ""

Read-Host "Presione ENTER cuando haya re-abierto la app"

Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "  ¿QUÉ OBSERVÓ AL RE-ABRIR LA APP?" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  A) Fue directo a HomeScreen (sesión mantenida) ✅" -ForegroundColor Green
Write-Host "  B) Mostró LoginScreen (sesión perdida) ❌" -ForegroundColor Red
Write-Host ""

$resultado1 = Read-Host "Ingrese A o B"

if ($resultado1 -eq "A" -or $resultado1 -eq "a") {
    Write-Host ""
    Write-Host "✅ TEST 1 PASADO: Sesión persistente funcionando" -ForegroundColor Green
    Write-Host "   La app restauró el token desde AsyncStorage" -ForegroundColor Gray
    Write-Host "   El usuario NO tuvo que hacer login nuevamente" -ForegroundColor Gray
    Write-Host ""
    $test1Passed = $true
} else {
    Write-Host ""
    Write-Host "❌ TEST 1 FALLÓ: La sesión se perdió al cerrar la app" -ForegroundColor Red
    Write-Host "   Revisar AuthContext.tsx: restaurar token con AsyncStorage.getItem('auth_token')" -ForegroundColor Yellow
    Write-Host ""
    $test1Passed = $false
}

Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "TEST 2: Logout explícito desde ProfileScreen" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 PASOS A SEGUIR:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  1. Estar en HomeScreen (con sesión activa)" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Navegar al tab PERFIL (último tab)" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Hacer SCROLL hasta el FINAL de la pantalla" -ForegroundColor Gray
Write-Host ""
Write-Host "  4. Buscar el botón rojo 'CERRAR SESIÓN'" -ForegroundColor Gray
Write-Host ""
Write-Host "  5. Presionar el botón 'CERRAR SESIÓN'" -ForegroundColor Gray
Write-Host ""

Read-Host "Presione ENTER cuando haya presionado 'Cerrar Sesión'"

Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "  ¿QUÉ OBSERVÓ DESPUÉS DE PRESIONAR 'CERRAR SESIÓN'?" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  A) Regresó a LoginScreen ✅" -ForegroundColor Green
Write-Host "  B) Se quedó en ProfileScreen o crasheó ❌" -ForegroundColor Red
Write-Host ""

$resultado2 = Read-Host "Ingrese A o B"

if ($resultado2 -eq "A" -or $resultado2 -eq "a") {
    Write-Host ""
    Write-Host "✅ TEST 2 PASADO: Logout explícito funcionando" -ForegroundColor Green
    Write-Host "   El botón cerró la sesión correctamente" -ForegroundColor Gray
    Write-Host "   AuthContext.signOut() ejecutado" -ForegroundColor Gray
    Write-Host ""
    $test2Passed = $true
} else {
    Write-Host ""
    Write-Host "❌ TEST 2 FALLÓ: Logout no funcionó correctamente" -ForegroundColor Red
    Write-Host "   Revisar ProfileScreen.tsx: sección del botón de logout (onLogout)" -ForegroundColor Yellow
    Write-Host "   Revisar AuthContext.tsx: implementación de la función signOut()" -ForegroundColor Yellow
    Write-Host ""
    $test2Passed = $false
}

Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "TEST 3: Re-login offline después de logout" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 PASOS A SEGUIR:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  1. Estar en LoginScreen (después del logout)" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. DESACTIVAR WIFI Y DATOS del dispositivo/emulador" -ForegroundColor Yellow
Write-Host "     ⚠️  IMPORTANTE: Sin conexión a internet" -ForegroundColor Yellow
Write-Host ""

Read-Host "Presione ENTER cuando haya desactivado la conexión"

Write-Host ""
Write-Host "  3. Hacer LOGIN OFFLINE con las mismas credenciales:" -ForegroundColor Gray
Write-Host "     Usuario: marianr@tekhne.com.ar" -ForegroundColor Cyan
Write-Host "     Password: 123456" -ForegroundColor Cyan
Write-Host ""

Read-Host "Presione ENTER cuando haya presionado el botón Login"

Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "  ¿QUÉ OBSERVÓ AL HACER LOGIN SIN CONEXIÓN?" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  A) Login exitoso → HomeScreen con credenciales ✅" -ForegroundColor Green
Write-Host "  B) Error 'Sin conexión' o 'Credenciales incorrectas' ❌" -ForegroundColor Red
Write-Host ""

$resultado3 = Read-Host "Ingrese A o B"

if ($resultado3 -eq "A" -or $resultado3 -eq "a") {
    Write-Host ""
    Write-Host "✅ TEST 3 PASADO: Login offline funcionando" -ForegroundColor Green
    Write-Host "   El cache se preservó después del logout" -ForegroundColor Gray
    Write-Host "   StorageManager validó credenciales localmente" -ForegroundColor Gray
    Write-Host ""
    $test3Passed = $true
} else {
    Write-Host ""
    Write-Host "❌ TEST 3 FALLÓ: Login offline no funciona después de logout" -ForegroundColor Red
    Write-Host "   Revisar AuthContext.tsx línea 390: signOut() NO debe borrar cache" -ForegroundColor Yellow
    Write-Host "   Revisar StorageManager: verifyUserCredentials()" -ForegroundColor Yellow
    Write-Host ""
    $test3Passed = $false
}

Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "  RESUMEN DE TESTS - PUNTO 2: SESIÓN PERSISTENTE" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

if ($test1Passed) {
    Write-Host "  ✅ TEST 1: Sesión persiste al cerrar app" -ForegroundColor Green
} else {
    Write-Host "  ❌ TEST 1: Sesión NO persiste al cerrar app" -ForegroundColor Red
}

if ($test2Passed) {
    Write-Host "  ✅ TEST 2: Logout explícito funcionando" -ForegroundColor Green
} else {
    Write-Host "  ❌ TEST 2: Logout explícito NO funciona" -ForegroundColor Red
}

if ($test3Passed) {
    Write-Host "  ✅ TEST 3: Re-login offline después de logout" -ForegroundColor Green
} else {
    Write-Host "  ❌ TEST 3: Re-login offline NO funciona" -ForegroundColor Red
}

Write-Host ""

$allPassed = $test1Passed -and $test2Passed -and $test3Passed

if ($allPassed) {
    Write-Host "============================================================================" -ForegroundColor Green
    Write-Host "  ✅✅✅ PUNTO 2 COMPLETAMENTE FUNCIONAL ✅✅✅" -ForegroundColor Green
    Write-Host "============================================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  🎉 TODOS LOS TESTS PASARON" -ForegroundColor Green
    Write-Host ""
    Write-Host "  ✅ Sesión persiste al cerrar app" -ForegroundColor Green
    Write-Host "  ✅ Logout solo explícito desde ProfileScreen" -ForegroundColor Green
    Write-Host "  ✅ Re-login offline funciona después de logout" -ForegroundColor Green
    Write-Host ""
    Write-Host "  📋 Requisitos REGLAS_GAM_BDD.md Sección 3:" -ForegroundColor Cyan
    Write-Host "     ✅ Sesión persistente implementada" -ForegroundColor Green
    Write-Host "     ✅ Logout explícito implementado" -ForegroundColor Green
    Write-Host "     ✅ Validación al startup implementada" -ForegroundColor Green
    Write-Host ""
    Write-Host "============================================================================" -ForegroundColor Green
} else {
    Write-Host "============================================================================" -ForegroundColor Yellow
    Write-Host "  ⚠️  ALGUNOS TESTS FALLARON" -ForegroundColor Yellow
    Write-Host "============================================================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  📝 Revisar los archivos indicados en los mensajes de error" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  📚 Documentación:" -ForegroundColor Cyan
    Write-Host "     - mobile/PUNTO_2_SESION_PERSISTENTE.md" -ForegroundColor Gray
    Write-Host "     - mobile/src/contexts/AuthContext.tsx" -ForegroundColor Gray
    Write-Host "     - mobile/src/screens/ProfileScreen.tsx" -ForegroundColor Gray
    Write-Host ""
    Write-Host "============================================================================" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "💡 LOGS ÚTILES PARA DEBUGGING:" -ForegroundColor Cyan
Write-Host ""
Write-Host "   En Metro Bundler, buscar logs:" -ForegroundColor Gray
Write-Host "   - '📂 Usuario cargado desde cache' (sesión restaurada)" -ForegroundColor Gray
Write-Host "   - '✅ Logout completado' (logout exitoso)" -ForegroundColor Gray
Write-Host "   - '🔐 LOGIN OFFLINE COMPLETADO' (login offline ok)" -ForegroundColor Gray
Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

exit 0
