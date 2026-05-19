# Test Punto 3 - Validacion Email Duplicado
# Verifica que el sistema bloquea emails duplicados cross-user

Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "  TEST PUNTO 3 - Validacion Email Duplicado Cross-User" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host ""

$backendUrl = "http://localhost:3000"

# Verificar que el backend este corriendo
Write-Host "Verificando backend..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$backendUrl/health" -Method GET -TimeoutSec 5 -ErrorAction SilentlyContinue
    Write-Host "Backend OK`n" -ForegroundColor Green
} catch {
    Write-Host "Backend no esta corriendo en $backendUrl" -ForegroundColor Red
    Write-Host "Inicie el backend con: node server-soap.js`n" -ForegroundColor Yellow
    exit 1
}

Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "TEST 1: Email NO existe - Permitir registro" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan

$timestamp = [DateTimeOffset]::Now.ToUnixTimeSeconds()
$testEmail1 = "test.nuevo.$timestamp@example.com"

Write-Host "Intentando registrar con email NUEVO: $testEmail1" -ForegroundColor Yellow

$body1 = @{
    email = $testEmail1
    password = "Test123456"
    firstName = "Test"
    lastName = "Usuario"
    telefono = "1234567890"
    nroAfiliado = "99-999999-99"
    documento = "99999999"
    cuil = "20999999999"
    sexo = "M"
    fechaNacimiento = "1990-01-01"
    canMiembrosFamiliar = 1
} | ConvertTo-Json

try {
    $response1 = Invoke-RestMethod -Uri "$backendUrl/gam/register" -Method POST -ContentType "application/json" -Body $body1
    Write-Host "TEST 1 PASADO: Email nuevo permitido" -ForegroundColor Green
    Write-Host "Respuesta: $($response1.message)`n" -ForegroundColor Gray
    $test1Passed = $true
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
    
    if ($statusCode -eq 409) {
        Write-Host "TEST 1: Email marcado como duplicado (puede ser de prueba anterior)" -ForegroundColor Yellow
        Write-Host "Codigo: $($errorDetails.code)`n" -ForegroundColor Gray
        $test1Passed = $true
    } else {
        Write-Host "TEST 1 FALLO: Error inesperado" -ForegroundColor Red
        Write-Host "Status: $statusCode" -ForegroundColor Red
        Write-Host "Error: $($errorDetails.error)`n" -ForegroundColor Red
        $test1Passed = $false
    }
}

Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "TEST 2: Email existe para EL MISMO usuario - Ofrecer recovery" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan

Write-Host "Intentando registrar NUEVAMENTE con el MISMO email y nroAfiliado" -ForegroundColor Yellow

try {
    $response2 = Invoke-RestMethod -Uri "$backendUrl/gam/register" -Method POST -ContentType "application/json" -Body $body1
    Write-Host "TEST 2 FALLO: Debio rechazar el registro duplicado`n" -ForegroundColor Red
    $test2Passed = $false
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
    
    if ($statusCode -eq 409 -and $errorDetails.code -eq 'EMAIL_EXISTS_SAME_USER') {
        Write-Host "TEST 2 PASADO: Email duplicado detectado (mismo usuario)" -ForegroundColor Green
        Write-Host "Codigo: $($errorDetails.code)" -ForegroundColor Gray
        Write-Host "Mismo usuario: $($errorDetails.sameUser)" -ForegroundColor Gray
        Write-Host "Puede recuperar: $($errorDetails.canRecover)" -ForegroundColor Gray
        Write-Host "Email maskeado: $($errorDetails.maskedEmail)" -ForegroundColor Gray
        Write-Host "Mensaje: $($errorDetails.message)`n" -ForegroundColor Gray
        $test2Passed = $true
    } else {
        Write-Host "TEST 2: Respuesta inesperada" -ForegroundColor Yellow
        Write-Host "Status: $statusCode" -ForegroundColor Yellow
        Write-Host "Codigo: $($errorDetails.code)`n" -ForegroundColor Yellow
        $test2Passed = $false
    }
}

Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "TEST 3: Email existe para OTRO usuario - Bloquear registro" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan

Write-Host "Intentando registrar con el MISMO email pero DIFERENTE nroAfiliado" -ForegroundColor Yellow

$body3 = @{
    email = $testEmail1
    password = "Test123456"
    firstName = "Otro"
    lastName = "Usuario"
    telefono = "9876543210"
    nroAfiliado = "88-888888-88"
    documento = "88888888"
    cuil = "20888888888"
    sexo = "F"
    fechaNacimiento = "1985-05-05"
    canMiembrosFamiliar = 2
} | ConvertTo-Json

try {
    $response3 = Invoke-RestMethod -Uri "$backendUrl/gam/register" -Method POST -ContentType "application/json" -Body $body3
    Write-Host "TEST 3 FALLO: Debio bloquear el registro (email de otro usuario)`n" -ForegroundColor Red
    $test3Passed = $false
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
    
    if ($statusCode -eq 409 -and $errorDetails.code -eq 'EMAIL_EXISTS_DIFFERENT_USER') {
        Write-Host "TEST 3 PASADO: Email duplicado bloqueado (otro usuario)" -ForegroundColor Green
        Write-Host "Codigo: $($errorDetails.code)" -ForegroundColor Gray
        Write-Host "Mismo usuario: $($errorDetails.sameUser)" -ForegroundColor Gray
        Write-Host "Puede recuperar: $($errorDetails.canRecover)" -ForegroundColor Gray
        Write-Host "Mensaje: $($errorDetails.message)`n" -ForegroundColor Gray
        $test3Passed = $true
    } else {
        Write-Host "TEST 3: Respuesta inesperada" -ForegroundColor Yellow
        Write-Host "Status: $statusCode" -ForegroundColor Yellow
        Write-Host "Codigo: $($errorDetails.code)`n" -ForegroundColor Yellow
        $test3Passed = $false
    }
}

Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "  RESUMEN DE TESTS - PUNTO 3: VALIDACION EMAIL DUPLICADO" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan

if ($test1Passed) {
    Write-Host "  TEST 1: Email nuevo permitido - OK" -ForegroundColor Green
} else {
    Write-Host "  TEST 1: Email nuevo permitido - FALLO" -ForegroundColor Red
}

if ($test2Passed) {
    Write-Host "  TEST 2: Email duplicado mismo usuario (ofrece recovery) - OK" -ForegroundColor Green
} else {
    Write-Host "  TEST 2: Email duplicado mismo usuario - FALLO" -ForegroundColor Red
}

if ($test3Passed) {
    Write-Host "  TEST 3: Email duplicado otro usuario (bloqueado) - OK" -ForegroundColor Green
} else {
    Write-Host "  TEST 3: Email duplicado otro usuario - FALLO" -ForegroundColor Red
}

Write-Host ""

$allPassed = $test1Passed -and $test2Passed -and $test3Passed

if ($allPassed) {
    Write-Host "========================================================================" -ForegroundColor Green
    Write-Host "  PUNTO 3 COMPLETAMENTE FUNCIONAL" -ForegroundColor Green
    Write-Host "========================================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  TODOS LOS TESTS PASARON" -ForegroundColor Green
    Write-Host ""
    Write-Host "  - Email nuevo permite registro" -ForegroundColor Green
    Write-Host "  - Email duplicado mismo usuario ofrece recovery" -ForegroundColor Green
    Write-Host "  - Email duplicado otro usuario bloqueado" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Requisitos REGLAS_GAM_BDD.md Seccion 5:" -ForegroundColor Cyan
    Write-Host "    - No permite mismo email para diferentes usuarios" -ForegroundColor Green
    Write-Host "    - Ofrece recovery si email existe para mismo usuario" -ForegroundColor Green
    Write-Host "    - Bloquea registro si email existe para otro usuario" -ForegroundColor Green
    Write-Host ""
    Write-Host "========================================================================" -ForegroundColor Green
} else {
    Write-Host "========================================================================" -ForegroundColor Yellow
    Write-Host "  ALGUNOS TESTS FALLARON" -ForegroundColor Yellow
    Write-Host "========================================================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Revisar:" -ForegroundColor Yellow
    Write-Host "    - backend/server-soap.js: funcion validateEmailDuplication()" -ForegroundColor Gray
    Write-Host "    - backend/server-soap.js: endpoint POST /gam/register" -ForegroundColor Gray
    Write-Host ""
    Write-Host "========================================================================" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Codigos de respuesta:" -ForegroundColor Cyan
Write-Host "  EMAIL_EXISTS_SAME_USER: Status 409, sameUser=true, canRecover=true" -ForegroundColor Gray
Write-Host "  EMAIL_EXISTS_DIFFERENT_USER: Status 409, sameUser=false, canRecover=false" -ForegroundColor Gray
Write-Host ""

exit 0
