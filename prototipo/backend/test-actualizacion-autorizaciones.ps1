# Test de actualizacion de autorizaciones desde SOAP
# Verifica que los cambios detectados en el servicio se actualicen en BD

$baseUrl = "http://localhost:3000"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST: Actualizacion de Autorizaciones" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# PASO 1: Login
Write-Host "1. Login..." -ForegroundColor Yellow

# Probar con diferentes usuarios
$usuarios = @(
    @{ username = "hj@gmail.com"; password = "12345678" },
    @{ username = "marianr@tekhne.com.ar"; password = "12345678" },
    @{ username = "diana76ar@gmail.com"; password = "12345678" },
    @{ username = "20120282388"; password = "12345678" }
)

$token = $null
foreach ($usuario in $usuarios) {
    Write-Host "   Intentando con: $($usuario.username)..." -ForegroundColor Gray
    $loginBody = $usuario | ConvertTo-Json
    
    try {
        $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST `
            -Body $loginBody -ContentType "application/json" -ErrorAction Stop
        
        if ($loginResponse.token) {
            Write-Host "   ✅ Login exitoso con: $($usuario.username)" -ForegroundColor Green
            $token = $loginResponse.token
            break
        }
    } catch {
        Write-Host "   ❌ Falló: $($usuario.username)" -ForegroundColor DarkGray
    }
}

if (-not $token) {
    Write-Host "`n   ERROR: No se pudo autenticar con ningún usuario" -ForegroundColor Red
    exit 1
}

# PASO 2: Consultar autorizaciones (primera vez)
Write-Host "`n2. Consulta inicial de autorizaciones..." -ForegroundColor Yellow
$headers = @{
    "Authorization" = "Bearer $token"
}

$autorizaciones1 = Invoke-RestMethod -Uri "$baseUrl/mis-autorizaciones" -Method GET -Headers $headers

Write-Host "   Total: $($autorizaciones1.total) autorizaciones" -ForegroundColor Cyan

if ($autorizaciones1.total -gt 0) {
    Write-Host "`n   Primer registro:" -ForegroundColor White
    $primera = $autorizaciones1.autorizaciones[0]
    Write-Host "   - ID: $($primera.ausolicid)" -ForegroundColor Gray
    Write-Host "   - Descripcion: $($primera.descripcion)" -ForegroundColor Gray
    Write-Host "   - Estado: $($primera.estado)" -ForegroundColor Gray
    Write-Host "   - Autorizacion #: $($primera.autorizacion_numero)" -ForegroundColor Gray
}

# PASO 3: Esperar 2 segundos
Write-Host "`n3. Esperando 2 segundos antes de segunda consulta..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

# PASO 4: Consultar autorizaciones (segunda vez - debe detectar cambios si los hay)
Write-Host "`n4. Consulta de re-sincronizacion..." -ForegroundColor Yellow
$autorizaciones2 = Invoke-RestMethod -Uri "$baseUrl/mis-autorizaciones" -Method GET -Headers $headers

Write-Host "   Total: $($autorizaciones2.total) autorizaciones" -ForegroundColor Cyan

if ($autorizaciones2.total -gt 0) {
    Write-Host "`n   Primer registro (actualizado):" -ForegroundColor White
    $primera2 = $autorizaciones2.autorizaciones[0]
    Write-Host "   - ID: $($primera2.ausolicid)" -ForegroundColor Gray
    Write-Host "   - Descripcion: $($primera2.descripcion)" -ForegroundColor Gray
    Write-Host "   - Estado: $($primera2.estado)" -ForegroundColor Gray
    Write-Host "   - Autorizacion #: $($primera2.autorizacion_numero)" -ForegroundColor Gray
    
    # Comparar
    Write-Host "`n   Comparacion:" -ForegroundColor White
    if ($primera.estado -ne $primera2.estado) {
        Write-Host "   CAMBIO DETECTADO: Estado cambio de '$($primera.estado)' a '$($primera2.estado)'" -ForegroundColor Yellow
    } else {
        Write-Host "   Sin cambios en Estado" -ForegroundColor Gray
    }
    
    if ($primera.descripcion -ne $primera2.descripcion) {
        Write-Host "   CAMBIO DETECTADO: Descripcion cambio" -ForegroundColor Yellow
    } else {
        Write-Host "   Sin cambios en Descripcion" -ForegroundColor Gray
    }
    
    if ($primera.autorizacion_numero -ne $primera2.autorizacion_numero) {
        Write-Host "   CAMBIO DETECTADO: Numero autorizacion cambio de '$($primera.autorizacion_numero)' a '$($primera2.autorizacion_numero)'" -ForegroundColor Yellow
    } else {
        Write-Host "   Sin cambios en Numero Autorizacion" -ForegroundColor Gray
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "NOTA: Para verificar actualizaciones reales," -ForegroundColor White
Write-Host "cambiar el estado de una autorizacion en SIA" -ForegroundColor White
Write-Host "y luego ejecutar este script nuevamente." -ForegroundColor White
Write-Host "========================================`n" -ForegroundColor Cyan
