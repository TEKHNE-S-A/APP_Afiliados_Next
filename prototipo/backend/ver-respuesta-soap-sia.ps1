# Script para ver la respuesta completa del servicio SOAP SIA
$ErrorActionPreference = "Stop"

Write-Host "`n=== Consultando servicio SOAP SIA ===" -ForegroundColor Cyan

# 1. Login
$loginBody = @{
    username = 'marianr@tekhne.com.ar'
    password = '12345678'
} | ConvertTo-Json

$login = Invoke-RestMethod -Uri 'http://localhost:3000/auth/login' -Method Post -ContentType 'application/json' -Body $loginBody
$token = $login.token

Write-Host "✅ Login OK" -ForegroundColor Green

# 2. Consultar SIA directamente
$ausolicid = '276b6ba2-5764-46f1-ae9d-4f4a1b086149'

Write-Host "`nConsultando SIA con ausolicid: $ausolicid`n" -ForegroundColor Yellow

$siaBody = @{
    Mode = 'DSP'
    AUSolIdExt = $ausolicid
} | ConvertTo-Json

$siaResponse = Invoke-RestMethod -Uri 'http://localhost:3000/sia/solicitudes' -Method Post -Headers @{
    'Authorization' = "Bearer $token"
    'Content-Type' = 'application/json'
} -Body $siaBody

Write-Host "=== RESPUESTA COMPLETA DEL SERVICIO SOAP ===" -ForegroundColor Cyan
$siaResponse.data | ConvertTo-Json -Depth 10

Write-Host "`n=== Parseando Resultado ===" -ForegroundColor Cyan

if ($siaResponse.data.Resultado) {
    $resultado = $siaResponse.data.Resultado | ConvertFrom-Json
    Write-Host "`n Campos en Resultado:" -ForegroundColor Yellow
    $resultado.PSObject.Properties | ForEach-Object {
        $value = if ($_.Value) { $_.Value } else { "(vacio)" }
        Write-Host "   $($_.Name): $value"
    }
}
