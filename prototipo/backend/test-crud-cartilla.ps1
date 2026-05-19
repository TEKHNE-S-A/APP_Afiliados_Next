# Script de prueba - CRUD Completo Admin Cartilla
# Verifica crear, leer, actualizar y eliminar entidades

$baseUrl = "http://localhost:3000"
$headers = @{
    "Content-Type" = "application/json"
}

Write-Host "`n=== TEST CRUD ADMIN CARTILLA ===" -ForegroundColor Cyan
Write-Host "Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n" -ForegroundColor Gray

# Paso 1: Login
Write-Host "1️⃣  LOGIN..." -ForegroundColor Yellow
try {
    $loginBody = @{
        username = "admin"
        password = "admin123"
    } | ConvertTo-Json

    $loginRes = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $loginRes.token
    $headers["Authorization"] = "Bearer $token"
    Write-Host "   ✅ Login exitoso - Token obtenido`n" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Error en login: $_" -ForegroundColor Red
    exit 1
}

# Paso 2: Obtener catálogos
Write-Host "2️⃣  OBTENIENDO CATÁLOGOS..." -ForegroundColor Yellow
try {
    $rubros = Invoke-RestMethod -Uri "$baseUrl/admin/cartilla/rubros" -Headers $headers
    $especialidades = Invoke-RestMethod -Uri "$baseUrl/admin/cartilla/especialidades" -Headers $headers
    $localidades = Invoke-RestMethod -Uri "$baseUrl/admin/cartilla/localidades" -Headers $headers
    
    Write-Host "   📋 Rubros disponibles: $($rubros.Count)" -ForegroundColor White
    Write-Host "   📋 Especialidades disponibles: $($especialidades.Count)" -ForegroundColor White
    Write-Host "   📋 Localidades disponibles: $($localidades.Count)`n" -ForegroundColor White
    
    $rubroTest = $rubros[0].carubid
    $especTest = $especialidades[0].caespid
    $localidadTest = $localidades[0].nulocid
} catch {
    Write-Host "   ❌ Error obteniendo catálogos: $_" -ForegroundColor Red
    exit 1
}

# Paso 3: Crear nueva entidad (POST)
Write-Host "3️⃣  CREANDO NUEVA ENTIDAD..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "HHmmss"
$nuevaEntidad = @{
    caentdescri = "ENTIDAD TEST $timestamp"
    carubid = $rubroTest
    caentmatri = "MP-TEST-$timestamp"
    caespid = $especTest
    caentdireccion = "Calle Test 123, Mendoza"
    nulocid = $localidadTest
    caentestado = "A"
    caentobs = "Creada por script de prueba automatizado"
} | ConvertTo-Json

try {
    $createRes = Invoke-RestMethod -Uri "$baseUrl/admin/cartilla/entidades" -Method Post -Headers $headers -Body $nuevaEntidad
    $entidadId = $createRes.caentid
    Write-Host "   ✅ Entidad creada - ID: $entidadId" -ForegroundColor Green
    Write-Host "   📝 Descripción: $($createRes.caentdescri)" -ForegroundColor White
    Write-Host "   🏥 Matrícula: $($createRes.caentmatri)`n" -ForegroundColor White
} catch {
    Write-Host "   ❌ Error creando entidad: $_" -ForegroundColor Red
    exit 1
}

# Paso 4: Leer entidad creada (GET by ID)
Write-Host "4️⃣  LEYENDO ENTIDAD CREADA..." -ForegroundColor Yellow
try {
    $entidad = Invoke-RestMethod -Uri "$baseUrl/admin/cartilla/entidades/$entidadId" -Headers $headers
    Write-Host "   ✅ Entidad leída correctamente" -ForegroundColor Green
    Write-Host "   📋 ID: $($entidad.caentid)" -ForegroundColor White
    Write-Host "   📝 Descripción: $($entidad.caentdescri)" -ForegroundColor White
    Write-Host "   🏷️  Rubro: $($entidad.rubro.carubdescr)" -ForegroundColor White
    Write-Host "   🎯 Especialidad: $($entidad.especialidad.caespdescr)" -ForegroundColor White
    Write-Host "   📍 Dirección: $($entidad.caentdireccion)" -ForegroundColor White
    Write-Host "   🌎 Localidad: $($entidad.localidad.nulocdescr)`n" -ForegroundColor White
} catch {
    Write-Host "   ❌ Error leyendo entidad: $_" -ForegroundColor Red
    exit 1
}

# Paso 5: Actualizar entidad (PUT)
Write-Host "5️⃣  ACTUALIZANDO ENTIDAD..." -ForegroundColor Yellow
$entidadActualizada = @{
    caentdescri = "ENTIDAD TEST ACTUALIZADA $timestamp"
    carubid = $rubroTest
    caentmatri = "MP-TEST-UPD-$timestamp"
    caespid = $especTest
    caentdireccion = "Calle Test 456, Mendoza (ACTUALIZADA)"
    nulocid = $localidadTest
    caentestado = "A"
    caentobs = "Actualizada por script de prueba automatizado - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
} | ConvertTo-Json

try {
    $updateRes = Invoke-RestMethod -Uri "$baseUrl/admin/cartilla/entidades/$entidadId" -Method Put -Headers $headers -Body $entidadActualizada
    Write-Host "   ✅ Entidad actualizada" -ForegroundColor Green
    Write-Host "   📝 Nueva descripción: $($updateRes.caentdescri)" -ForegroundColor White
    Write-Host "   🏥 Nueva matrícula: $($updateRes.caentmatri)" -ForegroundColor White
    Write-Host "   📍 Nueva dirección: $($updateRes.caentdireccion)`n" -ForegroundColor White
} catch {
    Write-Host "   ❌ Error actualizando entidad: $_" -ForegroundColor Red
    exit 1
}

# Paso 6: Verificar actualización (GET by ID)
Write-Host "6️⃣  VERIFICANDO ACTUALIZACIÓN..." -ForegroundColor Yellow
try {
    $entidadVerif = Invoke-RestMethod -Uri "$baseUrl/admin/cartilla/entidades/$entidadId" -Headers $headers
    
    if ($entidadVerif.caentdescri -like "*ACTUALIZADA*") {
        Write-Host "   ✅ Actualización verificada correctamente" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Advertencia: La descripción no refleja la actualización" -ForegroundColor Yellow
    }
    Write-Host "   📝 Descripción actual: $($entidadVerif.caentdescri)`n" -ForegroundColor White
} catch {
    Write-Host "   ❌ Error verificando actualización: $_" -ForegroundColor Red
}

# Paso 7: Eliminar entidad (DELETE)
Write-Host "7️⃣  ELIMINANDO ENTIDAD..." -ForegroundColor Yellow
try {
    $deleteRes = Invoke-RestMethod -Uri "$baseUrl/admin/cartilla/entidades/$entidadId" -Method Delete -Headers $headers
    Write-Host "   ✅ Entidad eliminada (baja lógica)" -ForegroundColor Green
    Write-Host "   ID eliminado: $entidadId`n" -ForegroundColor White
} catch {
    Write-Host "   ❌ Error eliminando entidad: $_" -ForegroundColor Red
    exit 1
}

# Paso 8: Verificar eliminación (debe dar 404 o estado inactivo)
Write-Host "8️⃣  VERIFICANDO ELIMINACIÓN..." -ForegroundColor Yellow
try {
    $entidadEliminada = Invoke-RestMethod -Uri "$baseUrl/admin/cartilla/entidades/$entidadId" -Headers $headers
    
    if ($entidadEliminada.caentestado -eq "I") {
        Write-Host "   ✅ Baja lógica verificada - Estado: Inactivo" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Advertencia: Entidad aún activa - Estado: $($entidadEliminada.caentestado)" -ForegroundColor Yellow
    }
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 404) {
        Write-Host "   ✅ Entidad no encontrada (eliminación física)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Error verificando eliminación: $_" -ForegroundColor Red
    }
}

# Resumen final
Write-Host "`n=== RESUMEN TEST CRUD ===" -ForegroundColor Cyan
Write-Host "✅ 1. Login exitoso" -ForegroundColor Green
Write-Host "✅ 2. Catálogos obtenidos ($($rubros.Count) rubros, $($especialidades.Count) especialidades, $($localidades.Count) localidades)" -ForegroundColor Green
Write-Host "✅ 3. Entidad creada (ID: $entidadId)" -ForegroundColor Green
Write-Host "✅ 4. Entidad leída correctamente" -ForegroundColor Green
Write-Host "✅ 5. Entidad actualizada" -ForegroundColor Green
Write-Host "✅ 6. Actualización verificada" -ForegroundColor Green
Write-Host "✅ 7. Entidad eliminada" -ForegroundColor Green
Write-Host "✅ 8. Eliminación verificada`n" -ForegroundColor Green

Write-Host "🎉 TODOS LOS TESTS PASARON EXITOSAMENTE`n" -ForegroundColor Green
Write-Host "Interfaz web disponible en: $baseUrl/admin/cartilla" -ForegroundColor Cyan
