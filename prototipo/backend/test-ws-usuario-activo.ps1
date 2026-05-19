# =============================================================================
# test-ws-usuario-activo.ps1
# Tests para POST /api/ws/WS_USUARIO_ACTIVO
#
# SDT_WSValidaUsuario:
#   WSUsuario   (char 40) - login GAM del usuario (email)
#   WSPassword  (char 50) - contrasena GAM
#   IdAfiliado  (char 40) - AfiliadoId del beneficiario (OPCIONAL)
#
# Respuesta: array Respuesta[]
#   RespuestaCodigo      - 000=OK | 50=bloqueado | 51=inactivo(deleted) |
#                          52=inactivo(disabled) | 53=afiliado mismatch |
#                          54=usuario no encontrado en BD | 010=params | 099=interno
#   RespuestaDescripcion - descripcion legible
#
# Notas:
#   - Autenticacion via GAM OAuth2 (no BD local)
#   - IdAfiliado es opcional: si se omite/vacia, solo valida credenciales
#   - Si IdAfiliado se informa, verifica GUID GAM => nuusuari.nuusuid => nuusuafili
# =============================================================================

param(
    [string]$BaseUrl      = "http://localhost:3000",
    [string]$AdminUser    = "admin@test.local",
    [string]$AdminPass    = "admin123",
    [string]$GamUser      = "",   # email de usuario GAM real para tests T08-T10
    [string]$GamPassword  = "",   # contrasena GAM del usuario anterior
    [string]$GamAfiliado  = ""    # nuusuafili esperado para T10
)

$ErrorActionPreference = "Continue"

$creds   = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("${AdminUser}:${AdminPass}"))
$headers = @{ Authorization = "Basic $creds"; "Content-Type" = "application/json"; Accept = "application/json" }

function Invoke-WS($body) {
    $json = $body | ConvertTo-Json -Compress
    try {
        $resp = Invoke-WebRequest -Uri "$BaseUrl/api/ws/WS_USUARIO_ACTIVO" `
                                   -Method Post -Headers $headers -Body $json `
                                   -TimeoutSec 20 -ErrorAction SilentlyContinue
        return $resp.Content | ConvertFrom-Json
    } catch {
        # PowerShell 5.1: leer body de 400/500 desde ErrorDetails o Response stream
        if ($_.ErrorDetails.Message) {
            try { return $_.ErrorDetails.Message | ConvertFrom-Json } catch {}
        }
        try {
            $stream = $_.Exception.Response.GetResponseStream()
            if ($stream) {
                $reader = New-Object System.IO.StreamReader($stream)
                return $reader.ReadToEnd() | ConvertFrom-Json
            }
        } catch {}
        return $null
    }
}

# Obtiene el primer item de Respuesta[] (puede venir como array o objeto segun PS)
function Get-FirstItem($r) {
    if ($null -eq $r) { return $null }
    if ($r.Respuesta -is [Array]) { return $r.Respuesta[0] }
    if ($r.Respuesta) { return $r.Respuesta }      # objeto unico
    return $null
}

function Show-Result($label, $expectedCode, $r) {
    if ($null -eq $r) {
        Write-Host "  [$label] FAIL - Sin respuesta" -ForegroundColor Red; return
    }
    $item   = Get-FirstItem $r
    $codigo = if ($item) { $item.RespuestaCodigo } else { "(sin Respuesta)" }
    $desc   = if ($item) { $item.RespuestaDescripcion } else { "" }
    $match  = if ($codigo -eq $expectedCode) { "PASS" } else { "FAIL (esp $expectedCode)" }
    $color  = if ($match -eq "PASS") { "Green" } else { "Red" }
    Write-Host "  [$label] [$match] Codigo=$codigo  '$desc'" -ForegroundColor $color
}

# Verifica que el codigo NO sea el excluido (para errores GAM cuyo codigo exacto depende del servidor GAM)
function Show-ResultNot($label, $excludeCode, $r) {
    if ($null -eq $r) {
        Write-Host "  [$label] FAIL - Sin respuesta" -ForegroundColor Red; return
    }
    $item   = Get-FirstItem $r
    $codigo = if ($item) { $item.RespuestaCodigo } else { "(sin Respuesta)" }
    $desc   = if ($item) { $item.RespuestaDescripcion } else { "" }
    $match  = if ($codigo -ne $excludeCode) { "PASS (GAM error)" } else { "FAIL (no debia ser $excludeCode)" }
    $color  = if ($match -like "PASS*") { "Green" } else { "Red" }
    Write-Host "  [$label] [$match] Codigo=$codigo  '$desc'" -ForegroundColor $color
}

Write-Host ""
Write-Host "[INFO] Verificando backend en $BaseUrl..." -ForegroundColor Cyan
$health = Invoke-WebRequest -Uri "$BaseUrl/health" -TimeoutSec 5 -ErrorAction SilentlyContinue
if ($health.StatusCode -ne 200) { Write-Host "[FAIL] Backend no disponible" -ForegroundColor Red; exit 1 }
Write-Host "[OK]   Backend disponible" -ForegroundColor Green

Write-Host ""
Write-Host "[INFO] T00: GET debe retornar 405" -ForegroundColor Cyan
$get405 = $false
try {
    $gr = Invoke-WebRequest -Uri "$BaseUrl/api/ws/WS_USUARIO_ACTIVO" -Method Get -TimeoutSec 5
    if ($gr.StatusCode -eq 405) { $get405 = $true }
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 405) { $get405 = $true }
}
if ($get405) { Write-Host "  [T00] [PASS] 405 Method Not Allowed" -ForegroundColor Green }
else         { Write-Host "  [T00] [FAIL] Esperado 405" -ForegroundColor Red }

Write-Host ""
Write-Host "[INFO] Validacion de parametros (esperado: 010)" -ForegroundColor Cyan

# T01: WSUsuario vacio
$r = Invoke-WS @{ WSUsuario=""; WSPassword="123456"; IdAfiliado="" }
Show-Result "T01-User-vacio         " "010" $r

# T02: WSUsuario > 40 chars
$r = Invoke-WS @{ WSUsuario=("X" * 41); WSPassword="123456"; IdAfiliado="" }
Show-Result "T02-User-mas-40-chars  " "010" $r

# T03: WSPassword vacio
$r = Invoke-WS @{ WSUsuario="test@test.com"; WSPassword=""; IdAfiliado="" }
Show-Result "T03-Pass-vacia         " "010" $r

# T04: WSPassword > 50 chars
$r = Invoke-WS @{ WSUsuario="test@test.com"; WSPassword=("A" * 51); IdAfiliado="" }
Show-Result "T04-Pass-mas-50-chars  " "010" $r

# T05: IdAfiliado > 40 chars (es opcional pero si se informa debe ser <= 40)
$r = Invoke-WS @{ WSUsuario="test@test.com"; WSPassword="123456"; IdAfiliado=("B" * 41) }
Show-Result "T05-Afiliado-mas-40    " "010" $r

Write-Host ""
Write-Host "[INFO] Errores GAM (autenticacion fallida — codigo GAM != 000)" -ForegroundColor Cyan

# T06: Usuario no existe en GAM
$r = Invoke-WS @{ WSUsuario="noexiste_xyz_@noexiste.test"; WSPassword="pass123"; IdAfiliado="" }
Show-ResultNot "T06-User-no-existe-GAM  " "000" $r

# T07: Contrasena incorrecta para usuario existente (si hay GAM disponible)
Write-Host "  [T07] Requiere -GamUser para probar password incorrecto" -ForegroundColor Gray
if ($GamUser -ne "") {
    $r = Invoke-WS @{ WSUsuario=$GamUser; WSPassword="WRONGPASS_xyz"; IdAfiliado="" }
    Show-ResultNot "T07-Pass-incorrecta-GAM " "000" $r
} else {
    Write-Host "  [T07] SKIP - pasar -GamUser EMAIL para habilitar" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[INFO] Logica post-login (requiere usuario GAM real via -GamUser / -GamPassword / -GamAfiliado)" -ForegroundColor Cyan

if ($GamUser -eq "") {
    Write-Host "  [T08-T10] SKIP - pasar -GamUser -GamPassword (-GamAfiliado para T10)" -ForegroundColor Yellow
    Write-Host "  Ej: .\test-ws-usuario-activo.ps1 -GamUser 'email@dominio.com' -GamPassword '123456' -GamAfiliado '000000071000000000001000000071'" -ForegroundColor Gray
} else {
    # T08: Login OK, IdAfiliado vacio => solo valida credenciales => 000
    $r = Invoke-WS @{ WSUsuario=$GamUser; WSPassword=$GamPassword; IdAfiliado="" }
    Show-Result "T08-Login-OK-sin-Afiliado " "000" $r

    # T09: Login OK, IdAfiliado no coincide => 53
    $r = Invoke-WS @{ WSUsuario=$GamUser; WSPassword=$GamPassword; IdAfiliado="000000000000000000000000000000" }
    Show-Result "T09-Afiliado-mismatch     " "53"  $r

    if ($GamAfiliado -ne "") {
        # T10: Login OK, IdAfiliado correcto => 000
        $r = Invoke-WS @{ WSUsuario=$GamUser; WSPassword=$GamPassword; IdAfiliado=$GamAfiliado }
        Show-Result "T10-Flujo-completo-OK     " "000" $r
    } else {
        Write-Host "  [T10] SKIP - pasar -GamAfiliado NUUSUAFILI para habilitar" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "[INFO] Sin Auth (esperado: 401)" -ForegroundColor Cyan
$noAuthHeaders = @{ "Content-Type" = "application/json" }
try {
    Invoke-WebRequest -Uri "$BaseUrl/api/ws/WS_USUARIO_ACTIVO" -Method Post -Headers $noAuthHeaders `
        -Body '{"WSUsuario":"a","WSPassword":"b"}' -TimeoutSec 5 | Out-Null
    Write-Host "  [T11] FAIL - Debia retornar 401" -ForegroundColor Red
} catch {
    $sc = $_.Exception.Response.StatusCode.value__
    if ($sc -eq 401) { Write-Host "  [T11] [PASS] 401 Unauthorized" -ForegroundColor Green }
    else             { Write-Host "  [T11] FAIL - Esperado 401, obtenido $sc" -ForegroundColor Red }
}

Write-Host ""
Write-Host "[INFO] Fin tests WS_USUARIO_ACTIVO" -ForegroundColor Cyan
Write-Host "  Validacion params : T01-T05 = 010" -ForegroundColor Gray
Write-Host "  Errores GAM       : T06 = cualquier codigo != 000" -ForegroundColor Gray
Write-Host "  Post-login        : T08=000(sinAfil) T09=53(mismatch) T10=000(OK)" -ForegroundColor Gray
Write-Host ""