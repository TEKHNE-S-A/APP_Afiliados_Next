# Script para crear usuario de prueba con credenciales conocidas
# Este usuario tiene cantidadIntegrantes = 4, debería tener grupo familiar

$ErrorActionPreference = "Stop"

$createUrl = "http://localhost:3000/debug/create-test-user"
$loginUrl = "http://localhost:3000/auth/login"

# Usuario de prueba con contraseña conocida
$userData = @{
    username = "20204902659"
    password = "prueba123"
    email = "prueba@test.com"
} | ConvertTo-Json

Write-Host "`n=== CREANDO USUARIO DE PRUEBA ===" -ForegroundColor Cyan
Write-Host "Username/CUIL: 20204902659" -ForegroundColor Yellow
Write-Host "Password: prueba123`n" -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri $createUrl -Method POST -Body $userData -ContentType "application/json" -TimeoutSec 10
    Write-Host "✅ Usuario creado" -ForegroundColor Green
    
    # Intentar login (esto debería sincronizar credenciales desde SOAP)
    Write-Host "`n=== PROBANDO LOGIN CON SINCRONIZACIÓN SOAP ===" -ForegroundColor Cyan
    $loginData = @{
        username = "20204902659"
        password = "prueba123"
    } | ConvertTo-Json
    
    Write-Host "Esperando respuesta (puede tardar hasta 2 minutos por SOAP)..." -ForegroundColor Yellow
    $loginResponse = Invoke-RestMethod -Uri $loginUrl -Method POST -Body $loginData -ContentType "application/json" -TimeoutSec 120
    
    Write-Host "`n✅ LOGIN EXITOSO" -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
    Write-Host "Token: $($loginResponse.token.Substring(0, 30))..." -ForegroundColor Cyan
    Write-Host "Usuario: $($loginResponse.user.name)" -ForegroundColor Cyan
    Write-Host "`nCREDENCIALES SINCRONIZADAS: $($loginResponse.credenciales.Count)" -ForegroundColor Green
    
    if ($loginResponse.credenciales.Count -gt 0) {
        Write-Host "`nGRUPO FAMILIAR:" -ForegroundColor Yellow
        $loginResponse.credenciales | ForEach-Object {
            $tipo = if ($_.crcrepropi -eq 'S') { "👑 TITULAR" } else { "👤 Miembro" }
            $parentesco = if ($_.crcreparen) { "($($_.crcreparen))" } else { "" }
            Write-Host "  $tipo - $($_.crcreapeno) $parentesco" -ForegroundColor Cyan
        }
    }
    
    Write-Host "`nESTADÍSTICAS DE SINCRONIZACIÓN:" -ForegroundColor Yellow
    Write-Host "  Total: $($loginResponse.sync.total)" -ForegroundColor White
    Write-Host "  Insertadas: $($loginResponse.sync.inserted)" -ForegroundColor Green
    Write-Host "  Actualizadas: $($loginResponse.sync.updated)" -ForegroundColor Yellow
    Write-Host "  Sin cambios: $($loginResponse.sync.unchanged)" -ForegroundColor Gray
    
    Write-Host "`n✅ CREDENCIALES LISTAS PARA MOBILE!" -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
    Write-Host "Username: 20204902659" -ForegroundColor Cyan
    Write-Host "Password: prueba123`n" -ForegroundColor Cyan
    
} catch {
    Write-Host "`n❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host "Detalles: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
    }
    exit 1
}
