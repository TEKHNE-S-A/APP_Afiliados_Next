# Test GAM - Version minima
Write-Host "Test GAM Integration" -ForegroundColor Cyan
Write-Host "===================" -ForegroundColor Cyan

$BaseUrl = "http://localhost:3000"

# Test 1: Backend activo
Write-Host "`n1. Verificando backend..." -ForegroundColor Green
try {
    Invoke-RestMethod -Uri "$BaseUrl/" -Method Get -TimeoutSec 5 | Out-Null
    Write-Host "OK - Backend activo" -ForegroundColor Green
} catch {
    Write-Host "FAIL - Backend no responde" -ForegroundColor Red
    exit 1
}

# Test 2: Registro GAM
Write-Host "`n2. POST /gam/register..." -ForegroundColor Green
$timestamp = Get-Date -Format 'yyyyMMddHHmmss'
$email = "test.$timestamp@example.com"

$body = @{
    email = $email
    password = "Test123!"
    firstName = "Juan"
    lastName = "Perez"
    telefono = "1234567890"
    nroAfiliado = "01-12345678-00"
    documento = "12345678"
    cuil = "20123456789"
    sexo = "M"
    fechaNacimiento = "1985-01-15"
    canMiembrosFamiliar = 1
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/gam/register" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 30
    Write-Host "OK - Registro exitoso" -ForegroundColor Green
    Write-Host "   UserID: $($response.userId)" -ForegroundColor Cyan
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host "   $($_.ErrorDetails.Message)" -ForegroundColor Yellow
    }
}

# Test 3: Login GAM
Write-Host "`n3. POST /gam/login..." -ForegroundColor Green
$loginBody = @{
    username = $email
    password = "Test123!"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$BaseUrl/gam/login" -Method Post -Body $loginBody -ContentType "application/json" -TimeoutSec 30
    Write-Host "OK - Login exitoso" -ForegroundColor Green
    Write-Host "   Access Token: $($loginResponse.access_token.Substring(0,40))..." -ForegroundColor Cyan
    Write-Host "   User ID: $($loginResponse.user_id)" -ForegroundColor Cyan
} catch {
    Write-Host "FAIL - $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host "   $($_.ErrorDetails.Message)" -ForegroundColor Yellow
    }
}

Write-Host "`nTest completado" -ForegroundColor Cyan
