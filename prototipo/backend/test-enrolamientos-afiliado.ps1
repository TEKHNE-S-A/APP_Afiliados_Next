# Test Enrolamientos por Afiliado
# Script para probar el endpoint GET /sia/enrolamientos-afiliado

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST: Enrolamientos por Afiliado" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Configuración
$baseUrl = "http://localhost:3000"
$username = "hj@gmail.com"
$password = "12345678"

# Paso 1: Login
Write-Host "[1/3] Iniciando sesión..." -ForegroundColor Yellow
try {
    $loginBody = @{
        username = $username
        password = $password
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body $loginBody `
        -SessionVariable session

    Write-Host "✅ Login exitoso" -ForegroundColor Green
    Write-Host "   Usuario: $($loginResponse.user.nuusuapell)" -ForegroundColor Gray
    Write-Host "   Credenciales: $($loginResponse.credenciales.Count)" -ForegroundColor Gray
    
    # Mostrar afiliados disponibles
    if ($loginResponse.credenciales -and $loginResponse.credenciales.Count -gt 0) {
        Write-Host "`n📋 Afiliados disponibles:" -ForegroundColor Cyan
        foreach ($cred in $loginResponse.credenciales) {
            $parentesco = if ($cred.crcrepropi -eq 'S') { "Titular" } else { "Familiar" }
            Write-Host "   - $($cred.crcreapeno) [$parentesco]" -ForegroundColor White
            Write-Host "     AfiliadoId: $($cred.crcrenroaf)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "❌ Error en login: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Paso 2: Seleccionar primer afiliado
Write-Host "`n[2/3] Obteniendo enrolamientos..." -ForegroundColor Yellow

if (-not $loginResponse.credenciales -or $loginResponse.credenciales.Count -eq 0) {
    Write-Host "❌ No hay afiliados disponibles" -ForegroundColor Red
    exit 1
}

$afiliadoId = $loginResponse.credenciales[0].crcrenroaf
$afiliadoNombre = $loginResponse.credenciales[0].crcreapeno

Write-Host "   Afiliado seleccionado: $afiliadoNombre" -ForegroundColor Gray
Write-Host "   AfiliadoId: $afiliadoId" -ForegroundColor Gray

try {
    $enrolResponse = Invoke-RestMethod -Uri "$baseUrl/sia/enrolamientos-afiliado?AfiliadoId=$afiliadoId" `
        -Method Get `
        -WebSession $session

    Write-Host "✅ Respuesta recibida" -ForegroundColor Green
    
    # Mostrar resultado
    Write-Host "`n[3/3] Resultado:" -ForegroundColor Yellow
    
    if ($enrolResponse.success) {
        $enrolamientos = $enrolResponse.data.Enrolamientos
        
        if ($enrolamientos -and $enrolamientos.Count -gt 0) {
            Write-Host "✅ $($enrolamientos.Count) enrolamiento(s) encontrado(s)" -ForegroundColor Green
            Write-Host "`n📋 Enrolamientos:" -ForegroundColor Cyan
            
            foreach ($enrol in $enrolamientos) {
                Write-Host "`n   🔹 $($enrol.EnrolNombre -or $enrol.Nombre -or 'Sin nombre')" -ForegroundColor White
                if ($enrol.EnrolId -or $enrol.Id) {
                    Write-Host "      ID: $($enrol.EnrolId -or $enrol.Id)" -ForegroundColor Gray
                }
                if ($enrol.EnrolDescripcion -or $enrol.Detalle) {
                    Write-Host "      Descripción: $($enrol.EnrolDescripcion -or $enrol.Detalle)" -ForegroundColor Gray
                }
            }
        } else {
            Write-Host "⚠️  No se encontraron enrolamientos para este afiliado" -ForegroundColor Yellow
            Write-Host "   Esto puede ser normal si el afiliado no tiene enrolamientos activos" -ForegroundColor Gray
        }
    } else {
        Write-Host "❌ La respuesta indica error" -ForegroundColor Red
    }
    
    # Mostrar JSON completo
    Write-Host "`n📄 Respuesta JSON completa:" -ForegroundColor Cyan
    $enrolResponse | ConvertTo-Json -Depth 10 | Write-Host -ForegroundColor Gray
    
} catch {
    Write-Host "❌ Error obteniendo enrolamientos: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Probar con todos los afiliados
if ($loginResponse.credenciales.Count -gt 1) {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "Probando con todos los afiliados..." -ForegroundColor Cyan
    Write-Host "========================================`n" -ForegroundColor Cyan
    
    $contador = 1
    foreach ($cred in $loginResponse.credenciales) {
        $parentesco = if ($cred.crcrepropi -eq 'S') { "Titular" } else { "Familiar" }
        Write-Host "[$contador/$($loginResponse.credenciales.Count)] $($cred.crcreapeno) [$parentesco]" -ForegroundColor Yellow
        
        try {
            $testResponse = Invoke-RestMethod -Uri "$baseUrl/sia/enrolamientos-afiliado?AfiliadoId=$($cred.crcrenroaf)" `
                -Method Get `
                -WebSession $session
            
            $count = if ($testResponse.data.Enrolamientos) { $testResponse.data.Enrolamientos.Count } else { 0 }
            Write-Host "   ✅ $count enrolamiento(s)" -ForegroundColor Green
        } catch {
            Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        }
        
        $contador++
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "✅ Test completado" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan
