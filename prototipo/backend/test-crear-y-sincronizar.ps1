# Test crear solicitud SIN prescripción en SIA y verificar sincronización
$ErrorActionPreference = "Stop"

Write-Host "`n=== TEST: Crear Solicitud SIN Prescripción ===" -ForegroundColor Cyan

# 1. Login
Write-Host "`n1. Login..." -ForegroundColor Yellow
$loginBody = @{
    username = 'marianr@tekhne.com.ar'
    password = '12345678'
} | ConvertTo-Json

$login = Invoke-RestMethod -Uri 'http://localhost:3000/auth/login' -Method Post -ContentType 'application/json' -Body $loginBody -ErrorAction Stop
$token = $login.token
$afiliadoId = $login.user.afiliadoId

Write-Host "✅ Login OK" -ForegroundColor Green
Write-Host "   Token: $($token.Substring(0, 20))..." -ForegroundColor Gray
Write-Host "   AfiliadoId: $afiliadoId" -ForegroundColor Gray

# 2. Obtener prestaciones
Write-Host "`n2. Obteniendo prestaciones..." -ForegroundColor Yellow
$prestaciones = Invoke-RestMethod -Uri 'http://localhost:3000/sia/prestaciones' -Method Post -Headers @{
    'Authorization' = "Bearer $token"
    'Content-Type' = 'application/json'
} -Body '{}' -ErrorAction Stop

Write-Host "✅ Prestaciones obtenidas: $($prestaciones.prestaciones.Count)" -ForegroundColor Green
$prestacion = $prestaciones.prestaciones[0]
Write-Host "   Usando: $($prestacion.AULPresDescripcion) (ID: $($prestacion.AULPresID))" -ForegroundColor Gray

# 3. Obtener coberturas
Write-Host "`n3. Obteniendo coberturas..." -ForegroundColor Yellow
$coberturas = Invoke-RestMethod -Uri 'http://localhost:3000/sia/enrolamientos' -Method Get -Headers @{
    'Authorization' = "Bearer $token"
} -ErrorAction Stop

Write-Host "✅ Coberturas obtenidas: $($coberturas.coberturas.Count)" -ForegroundColor Green
$cobertura = $coberturas.coberturas[0]
Write-Host "   Usando: $($cobertura.descripcion) (ID: $($cobertura.id))" -ForegroundColor Gray

# 4. Crear solicitud SIN prescripción
Write-Host "`n4. Creando solicitud SIN prescripción..." -ForegroundColor Yellow
$solicitudBody = @{
    tipo = 'S'
    afiliadoId = $afiliadoId
    prestacionId = $prestacion.AULPresID
    coberturaId = $cobertura.id
    cantidad = 2
    referencia = "Test solicitud sin prescripción - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    profesional = "Dr. Test"
} | ConvertTo-Json

Write-Host "   Payload:" -ForegroundColor Gray
$solicitudBody | ConvertFrom-Json | Format-List

$solicitud = Invoke-RestMethod -Uri 'http://localhost:3000/sia/crear-solicitud' -Method Post -Headers @{
    'Authorization' = "Bearer $token"
    'Content-Type' = 'application/json'
} -Body $solicitudBody -ErrorAction Stop

Write-Host "✅ Solicitud creada" -ForegroundColor Green
Write-Host "   ID Local: $($solicitud.data.solicitudId)" -ForegroundColor Gray
Write-Host "   Estado: $($solicitud.data.estado)" -ForegroundColor Gray

# 5. Esperar 2 segundos para que SIA procese
Write-Host "`n5. Esperando 2 segundos..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

# 6. Obtener autorizaciones (con sincronización automática)
Write-Host "`n6. Obteniendo autorizaciones (con sincronización SOAP)..." -ForegroundColor Yellow
$autorizaciones = Invoke-RestMethod -Uri 'http://localhost:3000/mis-autorizaciones' -Method Get -Headers @{
    'Authorization' = "Bearer $token"
} -ErrorAction Stop

Write-Host "✅ Autorizaciones obtenidas: $($autorizaciones.total)" -ForegroundColor Green

# Buscar la autorización recién creada
$nuevaAuth = $autorizaciones.autorizaciones | Where-Object { $_.ausolicid -eq $solicitud.data.solicitudId }

if ($nuevaAuth) {
    Write-Host "`n📋 AUTORIZACIÓN SINCRONIZADA:" -ForegroundColor Cyan
    Write-Host "   Descripción: $($nuevaAuth.descripcion)" -ForegroundColor White
    Write-Host "   Estado: $($nuevaAuth.estado)" -ForegroundColor $(if ($nuevaAuth.estado -eq 'ENV') { 'Yellow' } elseif ($nuevaAuth.estado -eq 'AUT') { 'Green' } else { 'Red' })
    Write-Host "   N° Autorización: $($nuevaAuth.autorizacion_numero)" -ForegroundColor White
    Write-Host "   Tipo: $($nuevaAuth.tipo)" -ForegroundColor White
    Write-Host "   Cantidad: $($nuevaAuth.cantidad)" -ForegroundColor White
    Write-Host "   Profesional: $($nuevaAuth.profesional)" -ForegroundColor White
} else {
    Write-Host "`n⚠️  Autorización no encontrada en el listado" -ForegroundColor Yellow
}

Write-Host "`n=== TEST COMPLETADO ===" -ForegroundColor Cyan
