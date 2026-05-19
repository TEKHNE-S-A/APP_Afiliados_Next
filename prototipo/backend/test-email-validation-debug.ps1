# Debug Email Validation
# Test simple para depurar la validacion de email

$backendUrl = "http://localhost:3000"
$timestamp = [DateTimeOffset]::Now.ToUnixTimeSeconds()
$testEmail = "test.debug.$timestamp@example.com"

Write-Host "Test Email Validation Debug" -ForegroundColor Cyan
Write-Host "Email de prueba: $testEmail`n" -ForegroundColor Yellow

# Test 1: Registrar usuario (debe guardar en BD local tambien)
Write-Host "1. Registrando usuario..." -ForegroundColor Yellow

$body1 = @{
    email = $testEmail
    password = "Test123456"
    firstName = "Test"
    lastName = "Debug"
    telefono = "1111111111"
    nroAfiliado = "77-777777-77"
    documento = "77777777"
    cuil = "20777777777"
    sexo = "M"
    fechaNacimiento = "1990-01-01"
    canMiembrosFamiliar = 1
} | ConvertTo-Json

try {
    $response1 = Invoke-RestMethod -Uri "$backendUrl/gam/register" -Method POST -ContentType "application/json" -Body $body1
    Write-Host "Registro exitoso" -ForegroundColor Green
    Write-Host "UserID: $($response1.userId)" -ForegroundColor Gray
    Write-Host "Mensaje: $($response1.message)`n" -ForegroundColor Gray
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
    Write-Host "Error en registro" -ForegroundColor Red
    Write-Host "Status: $statusCode" -ForegroundColor Red
    Write-Host "Error: $($errorDetails.error)" -ForegroundColor Red
    Write-Host "Message: $($errorDetails.message)`n" -ForegroundColor Red
}

# Test 2: Intentar registrar MISMO email MISMO nroAfiliado
Write-Host "2. Intentando registrar MISMO email con MISMO nroAfiliado..." -ForegroundColor Yellow

try {
    $response2 = Invoke-RestMethod -Uri "$backendUrl/gam/register" -Method POST -ContentType "application/json" -Body $body1
    Write-Host "ERROR: Debio rechazar el registro duplicado" -ForegroundColor Red
    Write-Host "Respuesta: $($response2 | ConvertTo-Json)`n" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
    
    Write-Host "Registro rechazado (esperado)" -ForegroundColor Green
    Write-Host "Status: $statusCode" -ForegroundColor Gray
    Write-Host "Codigo: $($errorDetails.code)" -ForegroundColor Gray
    Write-Host "Mismo usuario: $($errorDetails.sameUser)" -ForegroundColor Gray
    Write-Host "Puede recuperar: $($errorDetails.canRecover)" -ForegroundColor Gray
    Write-Host "Email maskeado: $($errorDetails.maskedEmail)" -ForegroundColor Gray
    Write-Host "Mensaje: $($errorDetails.message)" -ForegroundColor Gray
    Write-Host "Sugerencia: $($errorDetails.suggestion)`n" -ForegroundColor Gray
}

# Test 3: Intentar registrar MISMO email DIFERENTE nroAfiliado
Write-Host "3. Intentando registrar MISMO email con DIFERENTE nroAfiliado..." -ForegroundColor Yellow

$body3 = @{
    email = $testEmail  # Mismo email
    password = "Test123456"
    firstName = "Otro"
    lastName = "Usuario"
    telefono = "2222222222"
    nroAfiliado = "66-666666-66"  # DIFERENTE
    documento = "66666666"
    cuil = "20666666666"
    sexo = "F"
    fechaNacimiento = "1985-05-05"
    canMiembrosFamiliar = 2
} | ConvertTo-Json

try {
    $response3 = Invoke-RestMethod -Uri "$backendUrl/gam/register" -Method POST -ContentType "application/json" -Body $body3
    Write-Host "ERROR: Debio rechazar el registro (email de otro usuario)" -ForegroundColor Red
    Write-Host "Respuesta: $($response3 | ConvertTo-Json)`n" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
    
    Write-Host "Registro bloqueado (esperado)" -ForegroundColor Green
    Write-Host "Status: $statusCode" -ForegroundColor Gray
    Write-Host "Codigo: $($errorDetails.code)" -ForegroundColor Gray
    Write-Host "Mismo usuario: $($errorDetails.sameUser)" -ForegroundColor Gray
    Write-Host "Puede recuperar: $($errorDetails.canRecover)" -ForegroundColor Gray
    Write-Host "Mensaje: $($errorDetails.message)`n" -ForegroundColor Gray
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Debug completado" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
