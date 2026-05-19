# test-ws-autorizacion.ps1
# Suite de pruebas para POST /api/ws/WS_AUTORIZACION
# Uso: .\test-ws-autorizacion.ps1 [-RealIdExt "EXTREF001"]

param(
    [string]$BaseUrl   = "http://localhost:3000",
    [string]$RealIdExt = "EXTREF001",
    [string]$AdminUser = "admin@test.local",
    [string]$AdminPass = "admin123"
)

$ENDPOINT = "$BaseUrl/api/ws/WS_AUTORIZACION"
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("${AdminUser}:${AdminPass}"))
$HEADERS = @{
    Authorization  = "Basic $b64"
    'Content-Type' = "application/json"
    Accept         = "application/json"
}

$pass = 0
$fail = 0

function Get-StatusCode { param($ex); try { return [int]$ex.Response.StatusCode } catch { return 0 } }

function Get-ErrorBody {
    param($err)
    if ($err.ErrorDetails -and $err.ErrorDetails.Message) { return $err.ErrorDetails.Message }
    try {
        $stream = $err.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        return $reader.ReadToEnd()
    } catch { return "" }
}

Write-Host ""
Write-Host "===== WS_AUTORIZACION - Suite de pruebas ====="
Write-Host "Endpoint: $ENDPOINT"
Write-Host ""

# T00: GET -> 405
try {
    $r = Invoke-WebRequest $ENDPOINT -Method Get -Headers $HEADERS -TimeoutSec 10 -EA Stop
    Write-Host "[FAIL] T00 - GET debe retornar 405, obtuvo $($r.StatusCode)"; $fail++
} catch {
    $sc = Get-StatusCode $_.Exception
    if ($sc -eq 405) { Write-Host "[PASS] T00 - GET retorna 405"; $pass++ }
    else { Write-Host "[FAIL] T00 - GET retorno $sc (esperado 405)"; $fail++ }
}

# T01: Sin AUSolIdExt -> 400, Messages[0].Type=ERROR
try {
    $r = Invoke-WebRequest $ENDPOINT -Method Post -Headers $HEADERS -Body '{}' -TimeoutSec 10 -EA Stop
    Write-Host "[FAIL] T01 - Sin AUSolIdExt debe retornar 400, obtuvo $($r.StatusCode)"; $fail++
} catch {
    $sc   = Get-StatusCode $_.Exception
    $body = Get-ErrorBody $_
    try { $j = $body | ConvertFrom-Json; $type = $j.Messages[0].Type } catch { $type = "" }
    if ($sc -eq 400 -and $type -eq "ERROR") { Write-Host "[PASS] T01 - Sin AUSolIdExt retorna 400 Messages.Type=ERROR"; $pass++ }
    else { Write-Host "[FAIL] T01 - HTTP=$sc type=$type (esperado 400/ERROR)"; $fail++ }
}

# T02: AUSolIdExt vacio -> 400
try {
    $r = Invoke-WebRequest $ENDPOINT -Method Post -Headers $HEADERS `
        -Body '{"AUSolIdExt":""}' -TimeoutSec 10 -EA Stop
    Write-Host "[FAIL] T02 - AUSolIdExt vacio debe retornar 400, obtuvo $($r.StatusCode)"; $fail++
} catch {
    $sc = Get-StatusCode $_.Exception
    if ($sc -eq 400) { Write-Host "[PASS] T02 - AUSolIdExt vacio retorna 400"; $pass++ }
    else { Write-Host "[FAIL] T02 - HTTP=$sc (esperado 400)"; $fail++ }
}

# T03: AUSolIdExt > 40 chars -> 400
$long41 = "X" * 41
try {
    $r = Invoke-WebRequest $ENDPOINT -Method Post -Headers $HEADERS `
        -Body "{`"AUSolIdExt`":`"$long41`"}" -TimeoutSec 10 -EA Stop
    Write-Host "[FAIL] T03 - AUSolIdExt > 40 chars debe retornar 400, obtuvo $($r.StatusCode)"; $fail++
} catch {
    $sc = Get-StatusCode $_.Exception
    if ($sc -eq 400) { Write-Host "[PASS] T03 - AUSolIdExt > 40 chars retorna 400"; $pass++ }
    else { Write-Host "[FAIL] T03 - HTTP=$sc (esperado 400)"; $fail++ }
}

# T04: AUSolEstado > 3 chars -> 400
try {
    $r = Invoke-WebRequest $ENDPOINT -Method Post -Headers $HEADERS `
        -Body '{"AUSolIdExt":"REF001","AUSolEstado":"LARGO"}' -TimeoutSec 10 -EA Stop
    Write-Host "[FAIL] T04 - AUSolEstado > 3 chars debe retornar 400, obtuvo $($r.StatusCode)"; $fail++
} catch {
    $sc = Get-StatusCode $_.Exception
    if ($sc -eq 400) { Write-Host "[PASS] T04 - AUSolEstado > 3 chars retorna 400"; $pass++ }
    else { Write-Host "[FAIL] T04 - HTTP=$sc (esperado 400)"; $fail++ }
}

# T05: AUSolRechazoDef invalido -> 400
try {
    $r = Invoke-WebRequest $ENDPOINT -Method Post -Headers $HEADERS `
        -Body '{"AUSolIdExt":"REF001","AUSolRechazoDef":"X"}' -TimeoutSec 10 -EA Stop
    Write-Host "[FAIL] T05 - AUSolRechazoDef invalido debe retornar 400, obtuvo $($r.StatusCode)"; $fail++
} catch {
    $sc = Get-StatusCode $_.Exception
    if ($sc -eq 400) { Write-Host "[PASS] T05 - AUSolRechazoDef invalido retorna 400"; $pass++ }
    else { Write-Host "[FAIL] T05 - HTTP=$sc (esperado 400)"; $fail++ }
}

# T06: campo numerico invalido -> 400
try {
    $r = Invoke-WebRequest $ENDPOINT -Method Post -Headers $HEADERS `
        -Body '{"AUSolIdExt":"REF001","AUSolAutDCodigo":"NONUM"}' -TimeoutSec 10 -EA Stop
    Write-Host "[FAIL] T06 - Campo numerico invalido debe retornar 400, obtuvo $($r.StatusCode)"; $fail++
} catch {
    $sc = Get-StatusCode $_.Exception
    if ($sc -eq 400) { Write-Host "[PASS] T06 - Campo numerico invalido retorna 400"; $pass++ }
    else { Write-Host "[FAIL] T06 - HTTP=$sc (esperado 400)"; $fail++ }
}

# T07: Sin autorizacion -> 401
try {
    $noAuth = @{ 'Content-Type' = 'application/json' }
    $r = Invoke-WebRequest $ENDPOINT -Method Post -Headers $noAuth `
        -Body '{"AUSolIdExt":"REF001"}' -TimeoutSec 10 -EA Stop
    Write-Host "[FAIL] T07 - Sin auth debe retornar 401, obtuvo $($r.StatusCode)"; $fail++
} catch {
    $sc = Get-StatusCode $_.Exception
    if ($sc -eq 401) { Write-Host "[PASS] T07 - Sin auth retorna 401"; $pass++ }
    else { Write-Host "[FAIL] T07 - HTTP=$sc (esperado 401)"; $fail++ }
}

# T08: Payload completo con estado AUT -> 200 SUCCESS
#       AUSolAutNumero se formatea: AUSolAutDCodigo.PadLeft(5,'0') + "-" + AUSolAutNumero.PadLeft(12,'0')
#       10101 + 202600001234 -> "10101-202600001234"
$payloadAUT = @{
    AUSolIdExt           = $RealIdExt
    AUSolEstado          = "AUT"                   # d_AUSolEstado.Autorizado
    AUSolAutDCodigo      = 10101
    AUSolAutNumero       = 202600001234
    AUSolAutCodGra       = 1
    AUSolAutMar          = "OK"
    AUSolAudMar          = "A01"
    AUSolAutEstado       = "AUTORIZADO"
    AUSolFecVto          = "2026-12-31"
    AUSolRechazoDef      = "N"
    AUSolAutNroAfiliado  = "01-075043-01"
    AUSolAutNomAfi       = "PEREZ, JUAN CARLOS"
    AUSolAutProv         = 12345
    AUSolAutRazPro       = "CENTRO MEDICO SA"     # -> AUSolEntNombre
    AUSolAutSuc          = 1
    AUSolEntidadId       = "ENT001"                # -> AUSolEntID
    AUSolTexto           = "Autorizacion aprobada para consulta medica"
} | ConvertTo-Json -Compress

try {
    $r = Invoke-RestMethod $ENDPOINT -Method Post -Headers $HEADERS -Body $payloadAUT -TimeoutSec 15 -EA Stop
    $type = $r.Messages[0].Type
    $id   = $r.Messages[0].Id
    $desc = $r.Messages[0].Description
    if ($type -eq "SUCCESS") {
        Write-Host "[PASS] T08 - Payload AUT -> SUCCESS (AUSolAutNumero formateado: 10101-202600001234)"
        Write-Host "       Desc: $desc"
        $pass++
    } else {
        Write-Host "[FAIL] T08 - Payload AUT -> Type=$type (esperado SUCCESS)"
        $fail++
    }
} catch {
    Write-Host "[FAIL] T08 - Payload AUT -> excepcion: $_"; $fail++
}

# T09: Solo campo minimo AUSolIdExt -> 200 SUCCESS (campos opcionales nulos)
#      Sin estado AUT/AUD, AUSolAutNumero no se toca (queda NULL en INSERT nuevo)
$payloadMin = '{"AUSolIdExt":"MINREF001"}'
try {
    $r = Invoke-RestMethod $ENDPOINT -Method Post -Headers $HEADERS -Body $payloadMin -TimeoutSec 15 -EA Stop
    if ($r.Messages[0].Type -eq "SUCCESS") {
        Write-Host "[PASS] T09 - Solo AUSolIdExt -> SUCCESS (campos opcionales nulos aceptados)"
        $pass++
    } else {
        Write-Host "[FAIL] T09 - Type=$($r.Messages[0].Type) (esperado SUCCESS)"; $fail++
    }
} catch {
    Write-Host "[FAIL] T09 - Solo AUSolIdExt -> excepcion: $_"; $fail++
}

# T10: UPSERT: reenvio mismo AUSolIdExt -> 200 SUCCESS (idempotente)
try {
    $r = Invoke-RestMethod $ENDPOINT -Method Post -Headers $HEADERS -Body $payloadAUT -TimeoutSec 15 -EA Stop
    if ($r.Messages[0].Type -eq "SUCCESS") {
        Write-Host "[PASS] T10 - Reenvio mismo AUSolIdExt (UPSERT idempotente) -> SUCCESS"
        $pass++
    } else {
        Write-Host "[FAIL] T10 - Reenvio -> Type=$($r.Messages[0].Type)"; $fail++
    }
} catch {
    Write-Host "[FAIL] T10 - Reenvio -> excepcion: $_"; $fail++
}

# T11: estado=AUD + autNumero pequeno -> AUSolAutNumero formateado "00005-000000000123"
$payloadAUD = @{
    AUSolIdExt      = "AUDREF001"
    AUSolEstado     = "AUD"   # d_AUSolEstado.Auditoria -> tambien formatea
    AUSolAutDCodigo = 5
    AUSolAutNumero  = 123
    AUSolFecVto     = "2026-06-30"
    AUSolRechazoDef = "N"
} | ConvertTo-Json -Compress
try {
    $r = Invoke-RestMethod $ENDPOINT -Method Post -Headers $HEADERS -Body $payloadAUD -TimeoutSec 15 -EA Stop
    if ($r.Messages[0].Type -eq "SUCCESS") {
        Write-Host "[PASS] T11 - estado=AUD + autNumero -> SUCCESS (autNumero formateado: 00005-000000000123)"
        $pass++
    } else {
        Write-Host "[FAIL] T11 - estado=AUD -> Type=$($r.Messages[0].Type)"; $fail++
    }
} catch {
    Write-Host "[FAIL] T11 - estado=AUD -> excepcion: $_"; $fail++
}

# T12: estado=CON -> AUSolAutNumero NO se actualiza (SetEmpty comentado en GeneXus)
#      Primero insertar con AUT (autopNumero queda formateado), luego reenviar con CON
#      -> el autNumero formateado debe preservarse
$payloadCON = @{
    AUSolIdExt      = "AUDREF001"    # mismo idExt que T11 (ya existe con autNumero formateado)
    AUSolEstado     = "CON"          # d_AUSolEstado.Consumido -> NO modifica autNumero
    AUSolAutDCodigo = 99999
    AUSolAutNumero  = 999999999999   # aunque se env\u00ede, NO debe sobreescribir si estado=CON
    AUSolFecVto     = "2026-06-30"
} | ConvertTo-Json -Compress
try {
    $r = Invoke-RestMethod $ENDPOINT -Method Post -Headers $HEADERS -Body $payloadCON -TimeoutSec 15 -EA Stop
    if ($r.Messages[0].Type -eq "SUCCESS") {
        Write-Host "[PASS] T12 - estado=CON -> SUCCESS (AUSolAutNumero preservado, no sobreescrito)"
        $pass++
    } else {
        Write-Host "[FAIL] T12 - estado=CON -> Type=$($r.Messages[0].Type)"; $fail++
    }
} catch {
    Write-Host "[FAIL] T12 - estado=CON -> excepcion: $_"; $fail++
}

# T13: estado=REC + AUSolAutNumero vacio -> no se formatea, SUCCESS igualmente
$payloadREC = @{
    AUSolIdExt      = "RECREF001"
    AUSolEstado     = "REC"          # d_AUSolEstado.Rechazado -> no formatea autNumero
    AUSolRechazoDef = "S"
    AUSolTexto      = "Rechazado por falta de documentacion"
} | ConvertTo-Json -Compress
try {
    $r = Invoke-RestMethod $ENDPOINT -Method Post -Headers $HEADERS -Body $payloadREC -TimeoutSec 15 -EA Stop
    if ($r.Messages[0].Type -eq "SUCCESS") {
        Write-Host "[PASS] T13 - estado=REC, sin autNumero -> SUCCESS (no formatea)"
        $pass++
    } else {
        Write-Host "[FAIL] T13 - estado=REC -> Type=$($r.Messages[0].Type)"; $fail++
    }
} catch {
    Write-Host "[FAIL] T13 - estado=REC -> excepcion: $_"; $fail++
}

Write-Host ""
Write-Host "===== RESULTADO: $pass/$($pass+$fail) tests PASS ====="
if ($fail -gt 0) { Write-Host "[ATENCION] $fail tests FALLARON" }
Write-Host "d_AUSolEstado: ENV=Enviado AUD=Auditoria AUT=Autorizado REC=Rechazado PEN=Pendiente CON=Consumido"
Write-Host "AUSolAutNumero formateado: DDD.PadLeft(5,'0') + '-' + NNN.PadLeft(12,'0') [solo AUT/AUD + no vacio + no CON]"
Write-Host ""
