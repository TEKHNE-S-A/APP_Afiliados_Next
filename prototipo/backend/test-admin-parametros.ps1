# Test script para endpoints /admin/parametros con autenticación
param(
    [string]$BaseUrl = "http://localhost:3000",
    [string]$Username = "admin",
    [string]$Password = "admin123"
)

Write-Host "`n===== Test de Endpoints Admin de Parámetros =====" -ForegroundColor Cyan

# 1. Login
Write-Host "`n1️⃣ Login..." -ForegroundColor Yellow
$loginBody = @{
    username = $Username
    password = $Password
} | ConvertTo-Json

try {
    $login = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
    $token = $login.token
    Write-Host "✅ Login exitoso" -ForegroundColor Green
    Write-Host "   Token: $($token.Substring(0,40))..." -ForegroundColor Gray
} catch {
    Write-Host "❌ Error en login: $_" -ForegroundColor Red
    exit 1
}

$headers = @{
    Authorization = "Bearer $token"
}

# 2. Listar todos los parámetros
Write-Host "`n2️⃣ GET /admin/parametros - Listar todos..." -ForegroundColor Yellow
try {
    $all = Invoke-RestMethod -Uri "$BaseUrl/admin/parametros" -Method GET -Headers $headers
    Write-Host "✅ Total parámetros: $($all.total)" -ForegroundColor Green
    $all.parametros | Select-Object -First 3 | Format-Table -AutoSize
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

# 3. Obtener parámetros de un grupo
Write-Host "`n3️⃣ GET /admin/parametros/GENERALES..." -ForegroundColor Yellow
try {
    $grupo = Invoke-RestMethod -Uri "$BaseUrl/admin/parametros/GENERALES" -Method GET -Headers $headers
    Write-Host "✅ Parámetros de GENERALES: $($grupo.total)" -ForegroundColor Green
    $grupo.parametros | Format-Table -AutoSize
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

# 4. Obtener parámetro específico
Write-Host "`n4️⃣ GET /admin/parametros/GENERALES/VigenciaCred..." -ForegroundColor Yellow
try {
    $param = Invoke-RestMethod -Uri "$BaseUrl/admin/parametros/GENERALES/VigenciaCred" -Method GET -Headers $headers
    Write-Host "✅ Valor actual: $($param.parametro.nusisvalpa)" -ForegroundColor Green
    $param.parametro | Format-List
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

# 5. Actualizar parámetro
Write-Host "`n5️⃣ PUT /admin/parametros/GENERALES/VigenciaCred (20 días)..." -ForegroundColor Yellow
try {
    $updateBody = @{ valor = "20" } | ConvertTo-Json
    $updated = Invoke-RestMethod -Uri "$BaseUrl/admin/parametros/GENERALES/VigenciaCred" -Method PUT -Headers $headers -ContentType "application/json" -Body $updateBody
    Write-Host "✅ Actualizado a: $($updated.parametro.nusisvalpa)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

# 6. Crear nuevo parámetro
Write-Host "`n6️⃣ POST /admin/parametros (crear TEST.AdminTest)..." -ForegroundColor Yellow
try {
    $createBody = @{
        grupo = "TEST"
        tipo = "AdminTest"
        valor = "test_value_admin"
    } | ConvertTo-Json
    
    $created = Invoke-RestMethod -Uri "$BaseUrl/admin/parametros" -Method POST -Headers $headers -ContentType "application/json" -Body $createBody
    Write-Host "✅ Parámetro creado:" -ForegroundColor Green
    $created.parametro | Format-List
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

# 7. Eliminar parámetro
Write-Host "`n7️⃣ DELETE /admin/parametros/TEST/AdminTest..." -ForegroundColor Yellow
try {
    $deleted = Invoke-RestMethod -Uri "$BaseUrl/admin/parametros/TEST/AdminTest" -Method DELETE -Headers $headers
    Write-Host "✅ Parámetro eliminado:" -ForegroundColor Green
    $deleted.parametroEliminado | Format-List
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

# 8. Verificar seguridad (sin token debe fallar)
Write-Host "`n8️⃣ Test de seguridad (sin token)..." -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "$BaseUrl/admin/parametros" -Method GET -ErrorAction Stop
    Write-Host "❌ ERROR: Endpoint accesible sin autenticación!" -ForegroundColor Red
} catch {
    if ($_.Exception.Message -like "*401*" -or $_.Exception.Message -like "*No autorizado*") {
        Write-Host "✅ Seguridad OK: 401 sin token" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Error inesperado: $_" -ForegroundColor Yellow
    }
}

# 9. Restaurar VigenciaCred al valor original
Write-Host "`n9️⃣ Restaurando VigenciaCred a 10 días..." -ForegroundColor Yellow
try {
    $restoreBody = @{ valor = "10" } | ConvertTo-Json
    $restored = Invoke-RestMethod -Uri "$BaseUrl/admin/parametros/GENERALES/VigenciaCred" -Method PUT -Headers $headers -ContentType "application/json" -Body $restoreBody
    Write-Host "✅ Restaurado a: $($restored.parametro.nusisvalpa)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

Write-Host "`n===== Tests completados =====" -ForegroundColor Cyan
