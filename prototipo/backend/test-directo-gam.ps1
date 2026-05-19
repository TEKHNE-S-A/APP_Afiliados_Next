# Test directo a GAM - solo registro
$baseUrl = "http://localhost:3000"
$timestamp = Get-Date -Format "yyyyMMddHHmmss"

Write-Host "`n=== TEST DIRECTO REGISTRO GAM ===" -ForegroundColor Cyan

$gamData = @{
    email = "test.gam.${timestamp}@example.com"
    password = "Pass1234!"
    firstName = "DIEGO JAVIER"
    lastName = "NIEVA"
    telefono = "2612345678"
    cuil = "20071262692"
    documento = "7126269"
    nroAfiliado = "0712626900"
    sexo = "M"
    fechaNacimiento = "19/07/1978"
    canMiembrosFamiliar = 2
} | ConvertTo-Json

Write-Host "Datos para GAM:" -ForegroundColor Yellow
Write-Host $gamData -ForegroundColor DarkGray

try {
    Write-Host "`nLlamando a /gam/register..." -ForegroundColor Gray
    $response = Invoke-RestMethod -Uri "$baseUrl/gam/register" -Method POST `
        -ContentType "application/json" -Body $gamData -TimeoutSec 60 -Verbose
    
    Write-Host "`nRESPUESTA EXITOSA:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10 | Write-Host -ForegroundColor White
    
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $errorBody = $_.ErrorDetails.Message
    
    Write-Host "`nERROR (Status: $statusCode):" -ForegroundColor Red
    Write-Host $errorBody -ForegroundColor DarkRed
    
    try {
        $errorJson = $errorBody | ConvertFrom-Json
        Write-Host "`nDetalles estructurados:" -ForegroundColor Gray
        $errorJson | Format-List | Out-String | Write-Host -ForegroundColor DarkRed
    } catch {}
}
