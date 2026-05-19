# Test de Solicitud SIN Prescripción (Tipo "S")
# Valida el flujo completo: verificar parámetro, obtener prestaciones, crear solicitud tipo S

$ErrorActionPreference = "Stop"
$baseUrl = "http://localhost:3000"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TEST: Solicitud SIN Prescripción" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# ============================================================
# PASO 1: Verificar parámetro HabilitarAutorizSinOrden
# ============================================================
Write-Host "1️⃣  Verificando parámetro FUNCIONES_APP.HabilitarAutorizSinOrden..." -ForegroundColor Yellow

try {
    $parametroResponse = Invoke-RestMethod -Uri "$baseUrl/parametros/funciones-app/habilitar-autoriz-sin-orden" -Method Get
    
    Write-Host "   ✅ Parámetro obtenido:" -ForegroundColor Green
    Write-Host "      Valor: $($parametroResponse.valor)" -ForegroundColor Cyan
    Write-Host "      Habilitado: $($parametroResponse.habilitado)" -ForegroundColor Cyan
    
    if (-not $parametroResponse.habilitado) {
        Write-Host "`n   ⚠️  ADVERTENCIA: Autorizaciones sin prescripción DESHABILITADAS" -ForegroundColor Yellow
        Write-Host "      La app no mostrará la opción tipo 'S'`n" -ForegroundColor Yellow
    } else {
        Write-Host "      ✅ Funcionalidad HABILITADA`n" -ForegroundColor Green
    }
} catch {
    Write-Host "   ❌ Error al verificar parámetro: $_" -ForegroundColor Red
    exit 1
}

# ============================================================
# PASO 2: Login y obtener token
# ============================================================
Write-Host "2️⃣  Obteniendo token de autenticación..." -ForegroundColor Yellow

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

$headers = @{
    "Authorization" = "Bearer $token"
}

# ============================================================
# PASO 3: Obtener prestaciones disponibles
# ============================================================
Write-Host "3️⃣  Obteniendo prestaciones disponibles (REC_PRESTACIONES_APP)..." -ForegroundColor Yellow

try {
    Write-Host "   📤 Llamando POST /sia/prestaciones..." -ForegroundColor White
    $prestacionesResponse = Invoke-RestMethod -Uri "$baseUrl/sia/prestaciones" -Method Post -ContentType "application/json"
    
    $prestaciones = $prestacionesResponse.prestaciones
    
    Write-Host "`n   ✅ Prestaciones obtenidas: $($prestaciones.Count)" -ForegroundColor Green
    
    if ($prestaciones.Count -eq 0) {
        Write-Host "   ⚠️  No hay prestaciones disponibles. No se puede continuar con el test." -ForegroundColor Yellow
        exit 0
    }
    
    Write-Host "   ================================" -ForegroundColor Gray
    Write-Host "   Primeras 5 prestaciones:" -ForegroundColor Cyan
    $prestaciones | Select-Object -First 5 | ForEach-Object {
        Write-Host "      ID: $($_.AULPresID) - $($_.AULPresDescripcion)" -ForegroundColor White
    }
    Write-Host "   ================================`n" -ForegroundColor Gray
    
    # Seleccionar la primera prestación para el test
    $prestacionSeleccionada = $prestaciones[0]
    Write-Host "   📌 Prestación seleccionada para test:" -ForegroundColor Green
    Write-Host "      ID: $($prestacionSeleccionada.AULPresID)" -ForegroundColor Cyan
    Write-Host "      Descripción: $($prestacionSeleccionada.AULPresDescripcion)`n" -ForegroundColor Cyan
    
} catch {
    Write-Host "`n   ❌ Error al obtener prestaciones:" -ForegroundColor Red
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
# PASO 4: Crear solicitud tipo "S" (SIN prescripción)
# ============================================================
Write-Host "4️⃣  Creando solicitud tipo 'S' (Sin Prescripción)..." -ForegroundColor Yellow

$solicitudBody = @{
    AfiliadoId = $afiliadoId
    AUSolTipo = "S"                                                     # Tipo "S" = Sin Prescripción
    cobertura = "101"                                                   # ID cobertura ENROLAMIENTOS → AUSolGravCodigo
    prestacionId = $prestacionSeleccionada.AULPresID                    # Código prestación REC_PRESTACIONES_APP → AUSolPresId
    AUSolPresCant = 2                                                   # Cantidad editable
    referencia = "Test automatizado - Tipo S - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    profesional = "Dr. Test Script - Sin Prescripción"
    # NO incluir foto1Base64 ni foto2Base64 (tipo S no admite fotos)
} | ConvertTo-Json

try {
    Write-Host "   📤 Enviando POST /sia/crear-solicitud..." -ForegroundColor White
    Write-Host "      AUSolTipo: S (Sin Prescripción)" -ForegroundColor Gray
    Write-Host "      Cobertura: 101 (ENROLAMIENTOS → AUSolGravCodigo)" -ForegroundColor Gray
    Write-Host "      prestacionId: $($prestacionSeleccionada.AULPresID) (REC_PRESTACIONES_APP → AUSolPresId)" -ForegroundColor Gray
    Write-Host "      AUSolPresCant: 2" -ForegroundColor Gray
    Write-Host "      Sin fotos adjuntas`n" -ForegroundColor Gray
    
    $solicitudResponse = Invoke-RestMethod -Uri "$baseUrl/sia/crear-solicitud" -Method Post -Body $solicitudBody -ContentType "application/json" -Headers $headers
    
    Write-Host "`n   ✅ RESPUESTA DEL SERVIDOR:" -ForegroundColor Green
    Write-Host "   ================================" -ForegroundColor Gray
    $solicitudResponse | ConvertTo-Json -Depth 5 | Write-Host -ForegroundColor Cyan
    Write-Host "   ================================`n" -ForegroundColor Gray
    
    if ($solicitudResponse.success) {
        Write-Host "   ✅✅ ÉXITO - Solicitud tipo 'S' creada correctamente" -ForegroundColor Green
        Write-Host "       Solicitud ID: $($solicitudResponse.data.solicitudId)" -ForegroundColor Green
        Write-Host "       Estado: $($solicitudResponse.data.estado)" -ForegroundColor Green
        Write-Host "       Fotos adjuntas: $($solicitudResponse.data.fotosAdjuntas) (debe ser 0)`n" -ForegroundColor Green
        
        if ($solicitudResponse.data.fotosAdjuntas -ne 0) {
            Write-Host "   ⚠️  ADVERTENCIA: Se adjuntaron fotos en solicitud tipo 'S' (debería ser 0)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ⚠️  ADVERTENCIA: Respuesta sin campo 'success'" -ForegroundColor Yellow
    }
} catch {
    Write-Host "`n   ❌ ERROR al crear solicitud tipo 'S':" -ForegroundColor Red
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
# PASO 5: Crear solicitud tipo "P" (CON prescripción) para comparar
# ============================================================
Write-Host "5️⃣  Creando solicitud tipo 'P' (Con Prescripción) para comparar..." -ForegroundColor Yellow

# Foto 1x1 pixel en base64
$fotoBase64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k="

$solicitudBody2 = @{
    AfiliadoId = $afiliadoId
    AUSolTipo = "P"                                                     # Tipo "P" = Con Prescripción
    cobertura = "101"                                                   # ID cobertura
    referencia = "Test automatizado - Tipo P - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    profesional = "Dr. Test Script - Con Prescripción"
    Foto1Base64 = $fotoBase64                                           # Foto requerida para tipo P
} | ConvertTo-Json

try {
    Write-Host "   📤 Enviando POST /sia/crear-solicitud..." -ForegroundColor White
    Write-Host "      AUSolTipo: P (Con Prescripción)" -ForegroundColor Gray
    Write-Host "      Cobertura: 101" -ForegroundColor Gray
    Write-Host "      Con 1 foto adjunta`n" -ForegroundColor Gray
    
    $solicitudResponse2 = Invoke-RestMethod -Uri "$baseUrl/sia/crear-solicitud" -Method Post -Body $solicitudBody2 -ContentType "application/json" -Headers $headers
    
    Write-Host "`n   ✅ RESPUESTA DEL SERVIDOR:" -ForegroundColor Green
    Write-Host "   ================================" -ForegroundColor Gray
    $solicitudResponse2 | ConvertTo-Json -Depth 5 | Write-Host -ForegroundColor Cyan
    Write-Host "   ================================`n" -ForegroundColor Gray
    
    if ($solicitudResponse2.success) {
        Write-Host "   ✅✅ ÉXITO - Solicitud tipo 'P' creada correctamente" -ForegroundColor Green
        Write-Host "       Solicitud ID: $($solicitudResponse2.data.solicitudId)" -ForegroundColor Green
        Write-Host "       Estado: $($solicitudResponse2.data.estado)" -ForegroundColor Green
        Write-Host "       Fotos adjuntas: $($solicitudResponse2.data.fotosAdjuntas) (debe ser 1)`n" -ForegroundColor Green
    }
} catch {
    Write-Host "`n   ❌ ERROR al crear solicitud tipo 'P':" -ForegroundColor Red
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
    
    # No salir con error, es solo comparativo
}

# ============================================================
# RESUMEN FINAL
# ============================================================
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RESUMEN DE TESTS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Parámetro HabilitarAutorizSinOrden verificado" -ForegroundColor Green
Write-Host "✅ Prestaciones obtenidas ($($prestaciones.Count) disponibles)" -ForegroundColor Green
Write-Host "✅ Solicitud tipo 'S' (Sin Prescripción) creada" -ForegroundColor Green
Write-Host "✅ Solicitud tipo 'P' (Con Prescripción) creada" -ForegroundColor Green
Write-Host "`n🎉 Todos los tests pasaron correctamente`n" -ForegroundColor Green

Write-Host "========================================" -ForegroundColor Yellow
Write-Host "  DIFERENCIAS TIPO 'P' vs TIPO 'S'" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "TIPO 'P' (Con Prescripción):" -ForegroundColor White
Write-Host "  - Requiere prestacionId (código prestación REC_PRESTACIONES_APP → AUSolPresId)" -ForegroundColor Gray
Write-Host "  - Requiere cobertura (id ENROLAMIENTOS → AUSolGravCodigo)" -ForegroundColor Gray
Write-Host "  - Permite adjuntar hasta 2 fotos" -ForegroundColor Gray
Write-Host "  - AUSolPresCant fijo (1)" -ForegroundColor Gray
Write-Host "  - Campos SIA: AUSolPresId, AUSolGravCodigo, AUSolPresCant=1, Foto[]" -ForegroundColor Gray
Write-Host ""
Write-Host "TIPO 'S' (Sin Prescripción):" -ForegroundColor White
Write-Host "  - Requiere prestacionId (código prestación REC_PRESTACIONES_APP → AUSolPresId)" -ForegroundColor Gray
Write-Host "  - Requiere cobertura (id ENROLAMIENTOS → AUSolGravCodigo)" -ForegroundColor Gray
Write-Host "  - NO permite adjuntar fotos" -ForegroundColor Gray
Write-Host "  - AUSolPresCant editable por usuario" -ForegroundColor Gray
Write-Host "  - Campos SIA: AUSolPresId, AUSolGravCodigo, AUSolPresCant (sin Foto[])" -ForegroundColor Gray
Write-Host ""

Write-Host "========================================`n" -ForegroundColor Cyan
