# Test de especialidades sin duplicados

Write-Host "`n=== TEST ESPECIALIDADES SIN DUPLICADOS ===" -ForegroundColor Cyan

# 1. Login
Write-Host "`n1️⃣ Login..." -ForegroundColor Yellow
$loginBody = @{
    username = 'admin'
    password = 'admin123'
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $loginResponse.token
Write-Host "   ✅ Login OK" -ForegroundColor Green

$headers = @{
    Authorization = "Bearer $token"
}

# 2. Listar especialidades SIN filtro de rubro (debe devolver sin duplicados)
Write-Host "`n2️⃣ Listar especialidades SIN filtro de rubro..." -ForegroundColor Yellow
$especSinFiltro = Invoke-RestMethod -Uri "http://localhost:3000/admin/cartilla/especialidades" -Method GET -Headers $headers
Write-Host "   Total especialidades: $($especSinFiltro.Count)" -ForegroundColor Cyan

# Agrupar por caespid para detectar duplicados
$porId = @{}
foreach ($e in $especSinFiltro) {
    $id = $e.caespid.Trim()
    if (-not $porId.ContainsKey($id)) {
        $porId[$id] = @()
    }
    $porId[$id] += $e
}

$duplicados = ($porId.GetEnumerator() | Where-Object { $_.Value.Count -gt 1 }).Count

if ($duplicados -eq 0) {
    Write-Host "   ✅ NO hay duplicados" -ForegroundColor Green
} else {
    Write-Host "   ❌ HAY $duplicados especialidades duplicadas:" -ForegroundColor Red
    foreach ($item in $porId.GetEnumerator()) {
        if ($item.Value.Count -gt 1) {
            Write-Host "     - $($item.Key): $($item.Value.Count) veces" -ForegroundColor Red
        }
    }
}

Write-Host "`n   Especialidades encontradas:" -ForegroundColor Gray
$especSinFiltro | ForEach-Object {
    Write-Host "     - $($_.caespid.Trim()): $($_.caespdescr.Trim())" -ForegroundColor Gray
}

# 3. Listar especialidades CON filtro de rubro (puede tener múltiples si el rubro las tiene)
Write-Host "`n3️⃣ Listar especialidades del rubro CENTRO (000000001)..." -ForegroundColor Yellow
$especRubro1 = Invoke-RestMethod -Uri "http://localhost:3000/admin/cartilla/especialidades?rubroId=000000001" -Method GET -Headers $headers
Write-Host "   Total especialidades en CENTRO: $($especRubro1.Count)" -ForegroundColor Cyan

Write-Host "`n   Especialidades del rubro CENTRO:" -ForegroundColor Gray
$especRubro1 | ForEach-Object {
    Write-Host "     - $($_.caespid.Trim()): $($_.caespdescr.Trim())" -ForegroundColor Gray
}

Write-Host "`n=== FIN TEST ===" -ForegroundColor Cyan
