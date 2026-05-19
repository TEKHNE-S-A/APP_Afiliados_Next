# Test simple de validacion de email
# Usa endpoint interno del backend

$backendUrl = "http://localhost:3000"

# Test con usuario REAL de la BD
$emailExistente = "marianr@tekhne.com.ar"
$nroAfiliadoExistente = "288787655"

Write-Host "Test Validacion Email - Usuario Existente" -ForegroundColor Cyan
Write-Host "Email: $emailExistente" -ForegroundColor Yellow
Write-Host "NroAfiliado: $nroAfiliadoExistente`n" -ForegroundColor Yellow

# Crear endpoint temporal en server-soap.js para exponer validateEmailDuplication
# Por ahora vamos a hacer el test directamente con el endpoint /gam/register

Write-Host "Intentando registrar con email existente y MISMO nroAfiliado..." -ForegroundColor Yellow

$body = @{
    email = $emailExistente
    password = "Test123456"
    firstName = "Marian"
    lastName = "Rodriguez"
    telefono = "3834555555"
    nroAfiliado = $nroAfiliadoExistente
    documento = "28878765"
    cuil = "20288787655"
    sexo = "F"
    fechaNacimiento = "1980-01-01"
    canMiembrosFamiliar = 1
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$backendUrl/gam/register" -Method POST -ContentType "application/json" -Body $body -Verbose 2>&1
    Write-Host "Respuesta:" -ForegroundColor Gray
    Write-Host ($response | ConvertTo-Json -Depth 5) -ForegroundColor Gray
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $errorStream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($errorStream)
    $errorBody = $reader.ReadToEnd()
    
    Write-Host "Status Code: $statusCode" -ForegroundColor Yellow
    Write-Host "Error Body:" -ForegroundColor Yellow
    Write-Host $errorBody -ForegroundColor Gray
    
    try {
        $errorDetails = $errorBody | ConvertFrom-Json
        Write-Host "`nParsed Error:" -ForegroundColor Yellow
        Write-Host ($errorDetails | ConvertTo-Json -Depth 5) -ForegroundColor Gray
    } catch {
        Write-Host "No se pudo parsear el error como JSON" -ForegroundColor Red
    }
}
