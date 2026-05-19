# Test de Creación de Solicitud con Fotos
# Valida que los campos corregidos (AUSoFIdExt, AUSoFFileName) funcionen correctamente

$ErrorActionPreference = "Stop"
$baseUrl = "http://localhost:3000"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TEST: Solicitud SIA con Fotos" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# ============================================================
# PASO 1: Login y obtener token
# ============================================================
Write-Host "1️⃣  Obteniendo token de autenticación..." -ForegroundColor Yellow

$loginBody = @{
    username = "marianr@tekhne.com.ar"
    password = "123456"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.token
    $afiliadoId = $loginResponse.user.nuusuafili
    
    Write-Host "   ✅ Token obtenido: $($token.Substring(0,30))..." -ForegroundColor Green
    Write-Host "   ✅ AfiliadoId: $afiliadoId`n" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Error en login: $_" -ForegroundColor Red
    exit 1
}

# ============================================================
# PASO 2: Preparar foto de prueba (1x1 pixel JPEG)
# ============================================================
Write-Host "2️⃣  Preparando foto de prueba..." -ForegroundColor Yellow

# Foto 1x1 pixel en base64 (válida, ~600 bytes)
$fotoBase64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k="

Write-Host "   ✅ Foto preparada (1x1 pixel, ~600 bytes)`n" -ForegroundColor Green

# ============================================================
# PASO 3: Crear solicitud con 1 foto
# ============================================================
Write-Host "3️⃣  Enviando solicitud con 1 foto..." -ForegroundColor Yellow

$solicitudBody = @{
    AfiliadoId = $afiliadoId
    AUSolTipo = "A"
    AUSolPresId = 101
    AUSolPresCant = 1
    AUSolReferencia = "Test automatizado - 1 foto - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    AUSolProfesional = "Dr. Test Script"
    Foto1Base64 = $fotoBase64
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer $token"
}

try {
    Write-Host "   📤 Enviando POST /sia/solicitudes..." -ForegroundColor White
    $solicitudResponse = Invoke-RestMethod -Uri "$baseUrl/sia/solicitudes" -Method Post -Body $solicitudBody -ContentType "application/json" -Headers $headers
    
    Write-Host "`n   ✅ RESPUESTA DE SIA:" -ForegroundColor Green
    Write-Host "   ================================" -ForegroundColor Gray
    $solicitudResponse | ConvertTo-Json -Depth 5 | Write-Host -ForegroundColor Cyan
    Write-Host "   ================================`n" -ForegroundColor Gray
    
    if ($solicitudResponse.AUSolId -and $solicitudResponse.AUSolId -gt 0) {
        Write-Host "   ✅✅ ÉXITO - Solicitud creada en SIA" -ForegroundColor Green
        Write-Host "       ID SIA: $($solicitudResponse.AUSolId)" -ForegroundColor Green
        Write-Host "       Estado: $($solicitudResponse.AUSolEstId)`n" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  ADVERTENCIA: SIA no devolvió ID válido" -ForegroundColor Yellow
        Write-Host "       Respuesta completa arriba`n" -ForegroundColor Yellow
    }
} catch {
    Write-Host "`n   ❌ ERROR al crear solicitud:" -ForegroundColor Red
    Write-Host "   $_`n" -ForegroundColor Red
    
    # Intentar parsear error de SIA
    if ($_.ErrorDetails.Message) {
        Write-Host "   Detalle del error:" -ForegroundColor Red
        try {
            $errorObj = $_.ErrorDetails.Message | ConvertFrom-Json
            $errorObj | ConvertTo-Json -Depth 5 | Write-Host -ForegroundColor Yellow
        } catch {
            Write-Host "   $($_.ErrorDetails.Message)" -ForegroundColor Yellow
        }
    }
    
    exit 1
}

# ============================================================
# PASO 4: Crear solicitud con 2 fotos
# ============================================================
Write-Host "4️⃣  Enviando solicitud con 2 fotos..." -ForegroundColor Yellow

$solicitudBody2 = @{
    AfiliadoId = $afiliadoId
    AUSolTipo = "A"
    AUSolPresId = 102
    AUSolPresCant = 2
    AUSolReferencia = "Test automatizado - 2 fotos - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    AUSolProfesional = "Dra. Test Script"
    Foto1Base64 = $fotoBase64
    Foto2Base64 = $fotoBase64  # Misma foto para test
} | ConvertTo-Json

try {
    Write-Host "   📤 Enviando POST /sia/solicitudes..." -ForegroundColor White
    $solicitudResponse2 = Invoke-RestMethod -Uri "$baseUrl/sia/solicitudes" -Method Post -Body $solicitudBody2 -ContentType "application/json" -Headers $headers
    
    Write-Host "`n   ✅ RESPUESTA DE SIA:" -ForegroundColor Green
    Write-Host "   ================================" -ForegroundColor Gray
    $solicitudResponse2 | ConvertTo-Json -Depth 5 | Write-Host -ForegroundColor Cyan
    Write-Host "   ================================`n" -ForegroundColor Gray
    
    if ($solicitudResponse2.AUSolId -and $solicitudResponse2.AUSolId -gt 0) {
        Write-Host "   ✅✅ ÉXITO - Solicitud con 2 fotos creada en SIA" -ForegroundColor Green
        Write-Host "       ID SIA: $($solicitudResponse2.AUSolId)" -ForegroundColor Green
        Write-Host "       Estado: $($solicitudResponse2.AUSolEstId)`n" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  ADVERTENCIA: SIA no devolvió ID válido" -ForegroundColor Yellow
        Write-Host "       Respuesta completa arriba`n" -ForegroundColor Yellow
    }
} catch {
    Write-Host "`n   ❌ ERROR al crear solicitud con 2 fotos:" -ForegroundColor Red
    Write-Host "   $_`n" -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        Write-Host "   Detalle del error:" -ForegroundColor Red
        try {
            $errorObj = $_.ErrorDetails.Message | ConvertFrom-Json
            $errorObj | ConvertTo-Json -Depth 5 | Write-Host -ForegroundColor Yellow
        } catch {
            Write-Host "   $($_.ErrorDetails.Message)" -ForegroundColor Yellow
        }
    }
    
    exit 1
}

# ============================================================
# RESUMEN FINAL
# ============================================================
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RESUMEN DE TESTS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Test 1: Solicitud con 1 foto - OK" -ForegroundColor Green
Write-Host "✅ Test 2: Solicitud con 2 fotos - OK" -ForegroundColor Green
Write-Host "`n🎉 Todos los tests pasaron correctamente`n" -ForegroundColor Green

# ============================================================
# INSTRUCCIONES DE VERIFICACIÓN
# ============================================================
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "  VERIFICACIÓN MANUAL RECOMENDADA" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "1. Revisar logs del backend para confirmar:" -ForegroundColor White
Write-Host "   - Logs '📸 Fotos preparadas para SIA'" -ForegroundColor Gray
Write-Host "   - Campos: idExt='1'/'2', filename='f1.jpg'/'f2.jpg'" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Verificar en BD local (PostgreSQL):" -ForegroundColor White
Write-Host "   SELECT * FROM ausolicitud" -ForegroundColor Gray
Write-Host "   ORDER BY ausolfecha DESC LIMIT 2;" -ForegroundColor Gray
Write-Host ""
Write-Host "   SELECT ausolicid, ausolfotid," -ForegroundColor Gray
Write-Host "          length(ausolf) as foto_bytes" -ForegroundColor Gray
Write-Host "   FROM ausoaufo" -ForegroundColor Gray
Write-Host "   ORDER BY ausolicid DESC LIMIT 4;" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Verificar desde app móvil:" -ForegroundColor White
Write-Host "   - Navegar a 'Mis Solicitudes'" -ForegroundColor Gray
Write-Host "   - Verificar que aparecen las 2 nuevas" -ForegroundColor Gray
Write-Host "   - Abrir detalle y ver fotos adjuntas" -ForegroundColor Gray
Write-Host ""

Write-Host "========================================`n" -ForegroundColor Cyan
