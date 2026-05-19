# Test simple de enrolamientos
Write-Host "`n=== TEST ENROLAMIENTOS ===" -ForegroundColor Cyan

$baseUrl = "http://localhost:3000"

# Login
Write-Host "`n[1] Login..." -ForegroundColor Yellow
$loginBody = @{ username = "hj@gmail.com"; password = "12345678" } | ConvertTo-Json
$login = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -ContentType "application/json" -Body $loginBody -SessionVariable session

Write-Host "Usuario: $($login.user.nuusuapell)" -ForegroundColor Green
Write-Host "Credenciales: $($login.credenciales.Count)" -ForegroundColor Green

if ($login.credenciales.Count -eq 0) {
    Write-Host "ERROR: No hay credenciales" -ForegroundColor Red
    exit
}

# Obtener enrolamientos
$afiliadoId = $login.credenciales[0].crcrenroaf
Write-Host "`n[2] Obteniendo enrolamientos para: $afiliadoId" -ForegroundColor Yellow

try {
    $enrol = Invoke-RestMethod -Uri "$baseUrl/sia/enrolamientos-afiliado?AfiliadoId=$afiliadoId" -Method Get -WebSession $session
    
    Write-Host "`nRespuesta:" -ForegroundColor Cyan
    $enrol | ConvertTo-Json -Depth 10
    
    $count = if ($enrol.data.Enrolamientos) { $enrol.data.Enrolamientos.Count } else { 0 }
    Write-Host "`nEnrolamientos encontrados: $count" -ForegroundColor $(if ($count -gt 0) { "Green" } else { "Yellow" })
    
} catch {
    Write-Host "`nERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host $_.Exception -ForegroundColor Red
}
