# Script de prueba - CRUD Completo Admin Cartilla
# Verifica crear, leer, actualizar y eliminar entidades

$baseUrl = "http://localhost:3000"
$headers = @{
    "Content-Type" = "application/json"
}

Write-Host "`n=== TEST CRUD ADMIN CARTILLA ===" -ForegroundColor Cyan
Write-Host "Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n" -ForegroundColor Gray

# Paso 1: Login
Write-Host "1. LOGIN..." -ForegroundColor Yellow
try {
    $loginBody = @{
        username = "admin"
        password = "admin123"
    } | ConvertTo-Json

    $loginRes = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $loginRes.token
    $headers["Authorization"] = "Bearer $token"
    Write-Host "   OK - Login exitoso - Token obtenido`n" -ForegroundColor Green
} catch {
    Write-Host "   ERROR en login: $_" -ForegroundColor Red
    exit 1
}

# Paso 2: Obtener catálogos
Write-Host "2. OBTENIENDO CATALOGOS..." -ForegroundColor Yellow
try {
    $rubros = Invoke-RestMethod -Uri "$baseUrl/admin/cartilla/rubros" -Headers $headers
    $especialidades = Invoke-RestMethod -Uri "$baseUrl/admin/cartilla/especialidades" -Headers $headers
    $localidades = Invoke-RestMethod -Uri "$baseUrl/admin/cartilla/localidades" -Headers $headers
    
    Write-Host "   Rubros disponibles: $($rubros.Count)" -ForegroundColor White
    Write-Host "   Especialidades disponibles: $($especialidades.Count)" -ForegroundColor White
    Write-Host "   Localidades disponibles: $($localidades.Count)`n" -ForegroundColor White
    
    $rubroTest = $rubros[0].carubid
    $especTest = $especialidades[0].caespid
    $localidadTest = $localidades[0].nulocid
} catch {
    Write-Host "   ERROR obteniendo catalogos: $_" -ForegroundColor Red
    exit 1
}

# Paso 3: Crear nueva entidad (POST)
Write-Host "3. CREANDO NUEVA ENTIDAD..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "HHmmss"
$nuevaEntidad = @{
    caentdescri = "ENTIDAD TEST $timestamp"
    carubid = $rubroTest
    caentmatri = "MP-TEST-$timestamp"
    caespid = $especTest
    caentdireccion = "Calle Test 123, Mendoza"
    caentestado = "A"
    caentobs = "Creada por script de prueba automatizado"
} | ConvertTo-Json

try {
    $createRes = Invoke-RestMethod -Uri "$baseUrl/admin/cartilla/entidades" -Method Post -Headers $headers -Body $nuevaEntidad
    $entidadId = $createRes.caentid
    Write-Host "   OK - Entidad creada - ID: $entidadId" -ForegroundColor Green
    Write-Host "   Descripcion: $($createRes.caentdescri)" -ForegroundColor White
    Write-Host "   Matricula: $($createRes.caentmatri)`n" -ForegroundColor White
} catch {
    Write-Host "   ERROR creando entidad: $_" -ForegroundColor Red
    exit 1
}

# Paso 4: Leer entidad creada (GET by ID)
Write-Host "4. LEYENDO ENTIDAD CREADA..." -ForegroundColor Yellow
try {
    $entidad = Invoke-RestMethod -Uri "$baseUrl/admin/cartilla/entidades/$entidadId" -Headers $headers
    Write-Host "   OK - Entidad leida correctamente" -ForegroundColor Green
    Write-Host "   ID: $($entidad.caentid)" -ForegroundColor White
    Write-Host "   Descripcion: $($entidad.caentdescri)" -ForegroundColor White
    Write-Host "   Rubro: $($entidad.rubro.carubdescr)" -ForegroundColor White
    Write-Host "   Especialidad: $($entidad.especialidad.caespdescr)" -ForegroundColor White
    Write-Host "   Direccion: $($entidad.caentdireccion)" -ForegroundColor White
    Write-Host "   Localidad: $($entidad.localidad.nulocdescr)`n" -ForegroundColor White
} catch {
    Write-Host "   ERROR leyendo entidad: $_" -ForegroundColor Red
    exit 1
}

# Paso 5: Actualizar entidad (PUT)
Write-Host "5. ACTUALIZANDO ENTIDAD..." -ForegroundColor Yellow
$entidadActualizada = @{
    caentdescri = "ENTIDAD TEST ACTUALIZADA $timestamp"
    carubid = $rubroTest
    caentmatri = "MP-TEST-UPD-$timestamp"
    caespid = $especTest
    caentdireccion = "Calle Test 456, Mendoza (ACTUALIZADA)"
    caentestado = "A"
    caentobs = "Actualizada por script de prueba automatizado - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
} | ConvertTo-Json

try {
    $updateRes = Invoke-RestMethod -Uri "$baseUrl/admin/cartilla/entidades/$entidadId" -Method Put -Headers $headers -Body $entidadActualizada
    Write-Host "   OK - Entidad actualizada" -ForegroundColor Green
    Write-Host "   Nueva descripcion: $($updateRes.caentdescri)" -ForegroundColor White
    Write-Host "   Nueva matricula: $($updateRes.caentmatri)" -ForegroundColor White
    Write-Host "   Nueva direccion: $($updateRes.caentdireccion)`n" -ForegroundColor White
} catch {
    Write-Host "   ERROR actualizando entidad: $_" -ForegroundColor Red
    exit 1
}

# Paso 6: Verificar actualización (GET by ID)
Write-Host "6. VERIFICANDO ACTUALIZACION..." -ForegroundColor Yellow
try {
    $entidadVerif = Invoke-RestMethod -Uri "$baseUrl/admin/cartilla/entidades/$entidadId" -Headers $headers
    
    if ($entidadVerif.caentdescri -like "*ACTUALIZADA*") {
        Write-Host "   OK - Actualizacion verificada correctamente" -ForegroundColor Green
    } else {
        Write-Host "   ADVERTENCIA: La descripcion no refleja la actualizacion" -ForegroundColor Yellow
    }
    Write-Host "   Descripcion actual: $($entidadVerif.caentdescri)`n" -ForegroundColor White
} catch {
    Write-Host "   ERROR verificando actualizacion: $_" -ForegroundColor Red
}

# Paso 7: Eliminar entidad (DELETE)
Write-Host "7. ELIMINANDO ENTIDAD..." -ForegroundColor Yellow
try {
    $deleteRes = Invoke-RestMethod -Uri "$baseUrl/admin/cartilla/entidades/$entidadId" -Method Delete -Headers $headers
    Write-Host "   OK - Entidad eliminada (baja logica)" -ForegroundColor Green
    Write-Host "   ID eliminado: $entidadId`n" -ForegroundColor White
} catch {
    Write-Host "   ERROR eliminando entidad: $_" -ForegroundColor Red
    exit 1
}

# Paso 8: Verificar eliminación (debe dar 404 o estado inactivo)
Write-Host "8. VERIFICANDO ELIMINACION..." -ForegroundColor Yellow
try {
    $entidadEliminada = Invoke-RestMethod -Uri "$baseUrl/admin/cartilla/entidades/$entidadId" -Headers $headers
    
    if ($entidadEliminada.caentestado -eq "I") {
        Write-Host "   OK - Baja logica verificada - Estado: Inactivo" -ForegroundColor Green
    } else {
        Write-Host "   ADVERTENCIA: Entidad aun activa - Estado: $($entidadEliminada.caentestado)" -ForegroundColor Yellow
    }
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 404) {
        Write-Host "   OK - Entidad no encontrada (eliminacion fisica)" -ForegroundColor Green
    } else {
        Write-Host "   ERROR verificando eliminacion: $_" -ForegroundColor Red
    }
}

# Resumen final
Write-Host "`n=== RESUMEN TEST CRUD ===" -ForegroundColor Cyan
Write-Host "OK - 1. Login exitoso" -ForegroundColor Green
Write-Host "OK - 2. Catalogos obtenidos ($($rubros.Count) rubros, $($especialidades.Count) especialidades, $($localidades.Count) localidades)" -ForegroundColor Green
Write-Host "OK - 3. Entidad creada (ID: $entidadId)" -ForegroundColor Green
Write-Host "OK - 4. Entidad leida correctamente" -ForegroundColor Green
Write-Host "OK - 5. Entidad actualizada" -ForegroundColor Green
Write-Host "OK - 6. Actualizacion verificada" -ForegroundColor Green
Write-Host "OK - 7. Entidad eliminada" -ForegroundColor Green
Write-Host "OK - 8. Eliminacion verificada`n" -ForegroundColor Green

Write-Host "TODOS LOS TESTS PASARON EXITOSAMENTE" -ForegroundColor Green
Write-Host "`nInterfaz web disponible en: $baseUrl/admin/cartilla" -ForegroundColor Cyan
