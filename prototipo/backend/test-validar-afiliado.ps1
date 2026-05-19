# Test VALIDAAFIREG - Validar si un afiliado existe en el sistema
$baseUrl = "http://localhost:3000"

Write-Host "`n=== TEST VALIDAAFIREG ===" -ForegroundColor Cyan

# Datos a probar
$testData = @{
    cuil = "27116465383"
    dni = "11646538"
    fechaNacimiento = "1956-03-10"
    sexo = "F"
}

Write-Host "Datos a validar:" -ForegroundColor Yellow
$testData | Format-List

# Construir JSON para SOAP
$soapData = @{
    service = "VALIDAAFIREG"
    params = @{
        AfiliadoNro = $testData.dni
        FecNacimiento = $testData.fechaNacimiento
    }
} | ConvertTo-Json -Depth 10

Write-Host "`nLlamando a SOAP VALIDAAFIREG..." -ForegroundColor Gray
Write-Host $soapData -ForegroundColor DarkGray

try {
    # Endpoint debug que ejecuta SOAP directamente
    $response = Invoke-RestMethod -Uri "$baseUrl/debug/soap/execute" -Method POST `
        -ContentType "application/json" -Body $soapData
    
    Write-Host "`nRESPUESTA SOAP:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10 | Write-Host -ForegroundColor White
    
} catch {
    Write-Host "`nERROR:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor DarkRed
    
    if ($_.ErrorDetails.Message) {
        Write-Host "`nDetalles:" -ForegroundColor Gray
        $_.ErrorDetails.Message | Write-Host -ForegroundColor DarkRed
    }
}
