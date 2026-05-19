# Script para registrar correctamente un usuario con CUIL real que existe en SOAP
# CUIL: 20288787655, Fecha Nac: 30/05/1981, Cantidad Grupo: 8

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  REGISTRO CORRECTO CON DATOS REALES  " -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Datos del afiliado
$registrationData = @{
    cuil = "20288787655"
    fechaNacimiento = "1981-05-30"
    sexo = "M"
    cantidadIntegrantes = 8
    email = "cuil20288787655@test.com"
    password = "password123"
} | ConvertTo-Json

Write-Host "Datos a registrar:" -ForegroundColor Yellow
Write-Host "  CUIL: 20288787655" -ForegroundColor Gray
Write-Host "  Fecha Nac: 30/05/1981" -ForegroundColor Gray
Write-Host "  Sexo: M" -ForegroundColor Gray
Write-Host "  Cantidad Grupo: 8" -ForegroundColor Gray
Write-Host "  Email: cuil20288787655@test.com" -ForegroundColor Gray
Write-Host "  Password: password123" -ForegroundColor Gray
Write-Host "`nLlamando a POST /register...`n" -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri 'http://localhost:3000/register' `
        -Method POST `
        -Body $registrationData `
        -ContentType 'application/json' `
        -ErrorAction Stop
    
    Write-Host "REGISTRO EXITOSO" -ForegroundColor Green
    Write-Host "`nRespuesta:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 5 | Write-Host -ForegroundColor Gray
    
    if ($response.data.afiliadoId) {
        Write-Host "`nAfiliadoId obtenido: $($response.data.afiliadoId)" -ForegroundColor Green
        Write-Host "Longitud: $($response.data.afiliadoId.Length) caracteres" -ForegroundColor Gray
    } else {
        Write-Host "`nNo se obtuvo AfiliadoId valido" -ForegroundColor Yellow
    }
    
    if ($response.data.nuusuid) {
        Write-Host "Usuario guardado en BD con ID: $($response.data.nuusuid)" -ForegroundColor Green
    }
    
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "  AHORA PUEDES HACER LOGIN CON:" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Username: 20288787655" -ForegroundColor White -BackgroundColor DarkGreen
    Write-Host "  Password: password123" -ForegroundColor White -BackgroundColor DarkGreen
    Write-Host "`n  O con email:" -ForegroundColor Gray
    Write-Host "  Username: cuil20288787655@test.com" -ForegroundColor White -BackgroundColor DarkGreen
    Write-Host "  Password: password123" -ForegroundColor White -BackgroundColor DarkGreen
    Write-Host ""
    
} catch {
    Write-Host "ERROR EN REGISTRO" -ForegroundColor Red
    Write-Host "`nDetalles:" -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        Write-Host "`nRespuesta del servidor:" -ForegroundColor Yellow
        try {
            $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
            $errorResponse | ConvertTo-Json -Depth 5 | Write-Host -ForegroundColor Red
        } catch {
            Write-Host $_.ErrorDetails.Message -ForegroundColor Red
        }
    }
}
