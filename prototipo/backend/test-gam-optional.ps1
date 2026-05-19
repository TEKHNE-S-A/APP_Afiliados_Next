param(
    [string]$BaseUrl = "http://localhost:3000",
    [string]$AdminUser = "admin@test.local",
    [string]$AdminPassword = "admin123"
)

$ErrorActionPreference = "Stop"

Write-Host "" 
Write-Host "===== Test GAM Opcional (HabilitarGAM S/N) =====" -ForegroundColor Cyan

function Login-Admin {
    param([string]$Url, [string]$User, [string]$Password)

    $body = @{ username = $User; password = $Password } | ConvertTo-Json
    $login = Invoke-RestMethod -Uri "$Url/auth/login" -Method POST -ContentType "application/json" -Body $body

    if (-not $login.token) {
        throw "No se obtuvo token de admin en /auth/login"
    }

    return $login.token
}

function Get-ParamValue {
    param([string]$Url, [hashtable]$Headers)

    $resp = Invoke-RestMethod -Uri "$Url/admin/parametros/SEGURIDAD_APP/HabilitarGAM" -Method GET -Headers $Headers
    return [string]$resp.parametro.nusisvalpa
}

function Set-ParamValue {
    param([string]$Url, [hashtable]$Headers, [string]$Value)

    $payload = @{ valor = $Value } | ConvertTo-Json
    $resp = Invoke-RestMethod -Uri "$Url/admin/parametros/SEGURIDAD_APP/HabilitarGAM" -Method PUT -Headers $Headers -ContentType "application/json" -Body $payload
    return [string]$resp.parametro.nusisvalpa
}

function Invoke-GamGuardProbe {
    param([string]$Url)

    try {
        $resp = Invoke-WebRequest -Uri "$Url/gam/userinfo" -Method GET -UseBasicParsing
        return [int]$resp.StatusCode
    }
    catch {
        if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
            return [int]$_.Exception.Response.StatusCode.value__
        }
        throw
    }
}

function Invoke-AuthLoginProbe {
    param([string]$Url)

    $body = @{ username = "dummy@test.local"; password = "dummy" } | ConvertTo-Json

    try {
        $resp = Invoke-WebRequest -Uri "$Url/auth/login" -Method POST -ContentType "application/json" -Body $body -UseBasicParsing
        return [int]$resp.StatusCode
    }
    catch {
        if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
            return [int]$_.Exception.Response.StatusCode.value__
        }
        throw
    }
}

$token = Login-Admin -Url $BaseUrl -User $AdminUser -Password $AdminPassword
$headers = @{ Authorization = "Bearer $token" }
Write-Host "[OK] Login admin" -ForegroundColor Green

$originalValue = Get-ParamValue -Url $BaseUrl -Headers $headers
Write-Host "[INFO] Valor inicial SEGURIDAD_APP.HabilitarGAM = $originalValue" -ForegroundColor Gray

try {
    Write-Host "" 
    Write-Host "Paso 1: Set HabilitarGAM = S" -ForegroundColor Yellow
    $afterS = Set-ParamValue -Url $BaseUrl -Headers $headers -Value "S"
    Write-Host "   Valor guardado: $afterS" -ForegroundColor Gray

    $statusS = Invoke-GamGuardProbe -Url $BaseUrl
    Write-Host "   /gam/userinfo status con S: $statusS" -ForegroundColor Gray
    if ($statusS -eq 410) {
        throw "Con HabilitarGAM='S' no deberia devolver 410"
    }
    Write-Host "[OK] Guard GAM habilitado" -ForegroundColor Green

    Write-Host "" 
    Write-Host "Paso 2: Set HabilitarGAM = N" -ForegroundColor Yellow
    $afterN = Set-ParamValue -Url $BaseUrl -Headers $headers -Value "N"
    Write-Host "   Valor guardado: $afterN" -ForegroundColor Gray

    $statusN = Invoke-GamGuardProbe -Url $BaseUrl
    Write-Host "   /gam/userinfo status con N: $statusN" -ForegroundColor Gray
    if ($statusN -ne 410) {
        throw "Con HabilitarGAM='N' se esperaba 410 (GAM_DISABLED)"
    }
    Write-Host "[OK] Guard GAM deshabilitado" -ForegroundColor Green

    Write-Host "" 
    Write-Host "Paso 2b: Verificar /auth/login con GAM deshabilitado" -ForegroundColor Yellow
    $authStatusN = Invoke-AuthLoginProbe -Url $BaseUrl
    Write-Host "   /auth/login status con N: $authStatusN" -ForegroundColor Gray
    if ($authStatusN -eq 500) {
        throw "Con HabilitarGAM='N' /auth/login no debe responder 500"
    }
    Write-Host "[OK] /auth/login sin GAM responde controlado" -ForegroundColor Green

    Write-Host "" 
    Write-Host "Paso 3: Restaurar valor original = $originalValue" -ForegroundColor Yellow
    [void](Set-ParamValue -Url $BaseUrl -Headers $headers -Value $originalValue)
    Write-Host "[OK] Restauracion completada" -ForegroundColor Green

    Write-Host "" 
    Write-Host "===== RESULTADO: TEST OK =====" -ForegroundColor Cyan
}
catch {
    Write-Host "" 
    Write-Host "[ERROR] TEST FALLO: $($_.Exception.Message)" -ForegroundColor Red

    try {
        [void](Set-ParamValue -Url $BaseUrl -Headers $headers -Value $originalValue)
        Write-Host "[WARN] Se restauro el valor original ($originalValue)" -ForegroundColor Yellow
    }
    catch {
        Write-Host "[WARN] No se pudo restaurar el valor original: $($_.Exception.Message)" -ForegroundColor Yellow
    }

    exit 1
}
