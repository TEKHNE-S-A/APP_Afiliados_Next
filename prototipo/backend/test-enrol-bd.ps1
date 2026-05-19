# Consultar datos de credenciales en BD
Write-Host "`n=== CONSULTA BD CREDENCIALES ===" -ForegroundColor Cyan

$baseUrl = "http://localhost:3000"

# Login
Write-Host "`n[1] Login..." -ForegroundColor Yellow
$loginBody = @{ username = "hj@gmail.com"; password = "12345678" } | ConvertTo-Json
$login = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -ContentType "application/json" -Body $loginBody -SessionVariable session

Write-Host "Usuario: $($login.user.nuusuapell)" -ForegroundColor Green
Write-Host "Credenciales: $($login.credenciales.Count)`n" -ForegroundColor Green

# Mostrar todas las credenciales con sus campos
foreach ($cred in $login.credenciales) {
    $parentesco = if ($cred.crcrepropi -eq 'S') { "Titular" } else { "Familiar" }
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Credencial: $($cred.crcreapeno)" -ForegroundColor White
    Write-Host "Parentesco: $parentesco" -ForegroundColor Gray
    Write-Host "crcreid (AfiliadoId): $($cred.crcreid)" -ForegroundColor Yellow
    Write-Host "crcrenroaf (Nro Afiliado): $($cred.crcrenroaf)" -ForegroundColor Green
    Write-Host "crcreafili: $($cred.crcreafili)" -ForegroundColor Gray
    Write-Host "crcrecuil: $($cred.crcrecuil)" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Ahora probando con el primer afiliado..." -ForegroundColor Yellow
$afiliadoId = $login.credenciales[0].crcreid
Write-Host "AfiliadoId a consultar: $afiliadoId`n" -ForegroundColor White

try {
    $enrol = Invoke-RestMethod -Uri "$baseUrl/sia/enrolamientos-afiliado?AfiliadoId=$afiliadoId" -Method Get -WebSession $session
    
    Write-Host "Respuesta:" -ForegroundColor Cyan
    $enrol | ConvertTo-Json -Depth 10
    
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
}
