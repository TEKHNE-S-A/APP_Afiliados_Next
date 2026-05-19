# Test de Registro SOAP + GAM con Email Único
$baseUrl = "http://localhost:3000"
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$email = "test.integration.$timestamp@example.com"

Write-Host "`n=== TEST REGISTRO COMPLETO: SOAP + GAM ===" -ForegroundColor Cyan
Write-Host "Email único: $email`n" -ForegroundColor Yellow

$registerData = @{
    email = $email
    password = "Pass1234!"
    dni = "7126269"
    cuil = "20071262692"
    nroAfiliado = "0712626900"
    sexo = "M"
    fechaNacimiento = "19/07/1978"
    cantidadIntegrantes = 2
    telefono = "2612345678"
    registracionconnroafiliado = "S"
    registracioncondni = "S"
    registracionconcuil = "S"
}

Write-Host "--- Datos del Registro ---" -ForegroundColor Green
$registerData | ConvertTo-Json -Depth 3

Write-Host "`n--- Llamando a POST /register ---" -ForegroundColor Green
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/register" -Method POST `
        -ContentType "application/json" `
        -Body ($registerData | ConvertTo-Json -Depth 3) `
        -Verbose
    
    Write-Host "`n✅ REGISTRO EXITOSO" -ForegroundColor Green
    Write-Host "Respuesta completa:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10
    
    if ($response.data.nuusuid) {
        Write-Host "`nnuusuid obtenido: $($response.data.nuusuid)" -ForegroundColor Green
    } else {
        Write-Host "`nnuusuid es NULL" -ForegroundColor Yellow
    }
    
    if ($response.data.gam) {
        Write-Host "GAM integrado:" -ForegroundColor Green
        $response.data.gam | ConvertTo-Json -Depth 5
    } else {
        Write-Host "GAM es NULL" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "`n❌ ERROR EN REGISTRO" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json
    $errorBody | ConvertTo-Json -Depth 10
}

Write-Host "`n=== FIN DEL TEST ===" -ForegroundColor Cyan
