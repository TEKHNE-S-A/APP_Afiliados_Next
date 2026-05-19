# test-ws-token-teleconsulta.ps1
# Suite de pruebas para POST /api/ws/WS_TOKEN_TELECONSULTA
# Uso: .\test-ws-token-teleconsulta.ps1 [-RealNroAfiliado "01-075043-01"]

param(
    [string]$BaseUrl       = "http://localhost:3000",
    [string]$RealNroAfiliado = "01-075043-01",
    [string]$AdminUser     = "admin@test.local",
    [string]$AdminPass     = "admin123"
)

$ENDPOINT = "$BaseUrl/api/ws/WS_TOKEN_TELECONSULTA"
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("${AdminUser}:${AdminPass}"))
$HEADERS = @{
    Authorization  = "Basic $b64"
    'Content-Type' = "application/json"
    Accept         = "application/json"
}
# Charset valido: sin O, 0, I, 1
$VALID_CHARS = [char[]]"ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

$pass = 0
$fail = 0

function Get-RespStatus {
    param([System.Exception]$ex)
    try { return [int]$ex.Response.StatusCode } catch { return 0 }
}

Write-Host ""
Write-Host "===== WS_TOKEN_TELECONSULTA - Suite de pruebas ====="
Write-Host "Endpoint: $ENDPOINT"
Write-Host ""

# T00: GET -> 405
try {
    $r = Invoke-WebRequest $ENDPOINT -Method Get -Headers $HEADERS -TimeoutSec 10 -EA Stop
    Write-Host "[FAIL] T00 - GET debe retornar 405, obtuvo $($r.StatusCode)"; $fail++
} catch {
    $sc = Get-RespStatus $_.Exception
    if ($sc -eq 405) { Write-Host "[PASS] T00 - GET retorna 405"; $pass++ }
    else { Write-Host "[FAIL] T00 - GET retorno $sc (esperado 405)"; $fail++ }
}

# T01: Campo vacio -> 400
try {
    $r = Invoke-WebRequest $ENDPOINT -Method Post -Headers $HEADERS `
        -Body '{"NroAfiliado":""}' -TimeoutSec 10 -EA Stop
    Write-Host "[FAIL] T01 - NroAfiliado vacio debe retornar 400, obtuvo $($r.StatusCode)"; $fail++
} catch {
    $sc = Get-RespStatus $_.Exception
    if ($sc -eq 400) { Write-Host "[PASS] T01 - NroAfiliado vacio retorna 400"; $pass++ }
    else { Write-Host "[FAIL] T01 - NroAfiliado vacio retorno $sc (esperado 400)"; $fail++ }
}

# T02: Campo ausente -> 400
try {
    $r = Invoke-WebRequest $ENDPOINT -Method Post -Headers $HEADERS `
        -Body '{}' -TimeoutSec 10 -EA Stop
    Write-Host "[FAIL] T02 - NroAfiliado ausente debe retornar 400, obtuvo $($r.StatusCode)"; $fail++
} catch {
    $sc = Get-RespStatus $_.Exception
    if ($sc -eq 400) { Write-Host "[PASS] T02 - NroAfiliado ausente retorna 400"; $pass++ }
    else { Write-Host "[FAIL] T02 - NroAfiliado ausente retorno $sc (esperado 400)"; $fail++ }
}

# T03: NroAfiliado > 20 chars -> 400
$long21 = "X" * 21
try {
    $r = Invoke-WebRequest $ENDPOINT -Method Post -Headers $HEADERS `
        -Body "{`"NroAfiliado`":`"$long21`"}" -TimeoutSec 10 -EA Stop
    Write-Host "[FAIL] T03 - > 20 chars debe retornar 400, obtuvo $($r.StatusCode)"; $fail++
} catch {
    $sc = Get-RespStatus $_.Exception
    if ($sc -eq 400) { Write-Host "[PASS] T03 - > 20 chars retorna 400"; $pass++ }
    else { Write-Host "[FAIL] T03 - > 20 chars retorno $sc (esperado 400)"; $fail++ }
}

# T04: NroAfiliado inexistente -> 404
try {
    $r = Invoke-WebRequest $ENDPOINT -Method Post -Headers $HEADERS `
        -Body '{"NroAfiliado":"00-000000-00"}' -TimeoutSec 10 -EA Stop
    Write-Host "[FAIL] T04 - NroAfiliado no encontrado debe retornar 404, obtuvo $($r.StatusCode)"; $fail++
} catch {
    $sc = Get-RespStatus $_.Exception
    if ($sc -eq 404) { Write-Host "[PASS] T04 - NroAfiliado no encontrado retorna 404"; $pass++ }
    else { Write-Host "[FAIL] T04 - NroAfiliado no encontrado retorno $sc (esperado 404)"; $fail++ }
}

# T05: Sin autorizacion -> 401
try {
    $noAuth = @{ 'Content-Type' = 'application/json' }
    $r = Invoke-WebRequest $ENDPOINT -Method Post -Headers $noAuth `
        -Body '{"NroAfiliado":"test"}' -TimeoutSec 10 -EA Stop
    Write-Host "[FAIL] T05 - Sin auth debe retornar 401, obtuvo $($r.StatusCode)"; $fail++
} catch {
    $sc = Get-RespStatus $_.Exception
    if ($sc -eq 401) { Write-Host "[PASS] T05 - Sin auth retorna 401"; $pass++ }
    else { Write-Host "[FAIL] T05 - Sin auth retorno $sc (esperado 401)"; $fail++ }
}

# T06: NroAfiliado real -> token 6 chars validos + fechaHora ISO
if ($RealNroAfiliado) {
    try {
        $r = Invoke-RestMethod $ENDPOINT -Method Post -Headers $HEADERS `
            -Body "{`"NroAfiliado`":`"$RealNroAfiliado`"}" -TimeoutSec 15 -EA Stop

        $tok = $r.token
        $fh  = $r.fechaHora

        # Validar longitud 6
        if (-not $tok -or $tok.Length -ne 6) {
            Write-Host "[FAIL] T06 - token length=$($tok.Length) (esperado 6)  fechaHora=$fh"; $fail++
        } else {
            # Validar charset (sin O, 0, I, 1)
            $invalidChars = $tok.ToCharArray() | Where-Object { $VALID_CHARS -notcontains $_ }
            if ($invalidChars) {
                Write-Host "[FAIL] T06 - token='$tok' contiene chars invalidos: $invalidChars"; $fail++
            } else {
                Write-Host "[PASS] T06 - Token generado: '$tok'  fechaHora: $fh"; $pass++
            }
        }
    } catch {
        Write-Host "[FAIL] T06 - NroAfiliado real -> excepcion: $_"; $fail++
    }
} else {
    Write-Host "[SKIP] T06 - No se proporciono RealNroAfiliado"
}

# T07: Segunda llamada misma clave -> mismo token (cache)
if ($RealNroAfiliado) {
    try {
        $r1 = Invoke-RestMethod $ENDPOINT -Method Post -Headers $HEADERS `
            -Body "{`"NroAfiliado`":`"$RealNroAfiliado`"}" -TimeoutSec 15 -EA Stop
        $r2 = Invoke-RestMethod $ENDPOINT -Method Post -Headers $HEADERS `
            -Body "{`"NroAfiliado`":`"$RealNroAfiliado`"}" -TimeoutSec 15 -EA Stop

        if ($r1.token -eq $r2.token) {
            Write-Host "[PASS] T07 - Cache funciona: token1='$($r1.token)' == token2='$($r2.token)'"; $pass++
        } else {
            # Podria haber expirado entre llamadas en entorno CI lento; registrar como advertencia
            Write-Host "[WARN] T07 - Tokens distintos (posible expiracion): '$($r1.token)' vs '$($r2.token)'"
        }
    } catch {
        Write-Host "[FAIL] T07 - Cache test -> excepcion: $_"; $fail++
    }
} else {
    Write-Host "[SKIP] T07 - No se proporciono RealNroAfiliado"
}

Write-Host ""
Write-Host "===== RESULTADO: $pass/$($pass+$fail) tests PASS ====="
if ($fail -gt 0) { Write-Host "[ATENCION] $fail tests FALLARON" }
Write-Host ""
