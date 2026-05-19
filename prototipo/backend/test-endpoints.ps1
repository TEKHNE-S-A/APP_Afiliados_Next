# Test de endpoints críticos de cartilla

Write-Host "`n=== TEST ENDPOINTS CARTILLA ===" -ForegroundColor Cyan

# 1. GET - Listar entidades
Write-Host "`n1️⃣ GET /admin/cartilla - Listar entidades" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/admin/cartilla" -Method GET -TimeoutSec 10
    Write-Host "   ✅ Listado OK - Total: $($response.Count) entidades" -ForegroundColor Green
} catch {
    Write-Host "   ❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Detalle: $($_.ErrorDetails.Message)" -ForegroundColor Red
}

# 2. POST - Crear entidad (datos mínimos)
Write-Host "`n2️⃣ POST /admin/cartilla - Crear entidad" -ForegroundColor Yellow
$body = @{
    caentdescri = "TEST ENDPOINT DIRECT $(Get-Date -Format 'HHmmss')"
    carubid = "000000001"
    caentdireccion = "Calle Test 123"
    nulocid = "00001"
    caentestado = "A"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/admin/cartilla" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 10
    Write-Host "   ✅ Creación OK - ID: $($response.caentid)" -ForegroundColor Green
    $testId = $response.caentid
    
    # 3. GET BY ID - Ver detalle
    Write-Host "`n3️⃣ GET /admin/cartilla/$testId - Ver detalle" -ForegroundColor Yellow
    $detalle = Invoke-RestMethod -Uri "http://localhost:3000/admin/cartilla/$testId" -Method GET -TimeoutSec 10
    Write-Host "   ✅ Detalle OK - Nombre: $($detalle.caentdescri)" -ForegroundColor Green
    Write-Host "   - Rubro: $($detalle.carubid)" -ForegroundColor Gray
    Write-Host "   - Especialidad: $($detalle.caespid)" -ForegroundColor Gray
    Write-Host "   - Dirección: $($detalle.caentdireccion)" -ForegroundColor Gray
    
    # 4. PUT - Editar entidad
    Write-Host "`n4️⃣ PUT /admin/cartilla/$testId - Editar entidad" -ForegroundColor Yellow
    $editBody = @{
        caentdescri = "TEST EDITADO $(Get-Date -Format 'HHmmss')"
        carubid = "000000002"
        caentdireccion = "Calle Editada 456"
        nulocid = "00002"
        caentestado = "A"
    } | ConvertTo-Json
    
    $editResponse = Invoke-RestMethod -Uri "http://localhost:3000/admin/cartilla/$testId" -Method PUT -Body $editBody -ContentType "application/json" -TimeoutSec 10
    Write-Host "   ✅ Edición OK - Nombre actualizado: $($editResponse.caentdescri)" -ForegroundColor Green
    
} catch {
    Write-Host "   ❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   Detalle: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

Write-Host "`n=== FIN TEST ===" -ForegroundColor Cyan
