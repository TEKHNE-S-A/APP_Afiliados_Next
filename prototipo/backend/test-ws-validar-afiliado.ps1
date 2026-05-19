# test-ws-validar-afiliado.ps1
# Suite de pruebas para POST /api/ws/WS_VALIDAR_AFILIADO
#
# Lógica GeneXus: busca en nuusuari WHERE nuusuafili = ? AND nuusubajaf IS NULL
# luego verifica estado GAM (IsActive AND !isDeleted AND IsEnabledInRepository)
#
# EstadoAfiliado (tipo d_NUEstadoAfiliado):
#   E = Existente       (encontrado en BD + activo en GAM)
#   I = Inexistente     (no encontrado, baja, o inactivo en GAM) -- DEFAULT
#   D = Inactivo        (reservado: GAM isDeleted/disabled)
#   H = Habilitado      (reservado)
#
# Uso: .\test-ws-validar-afiliado.ps1 [-BaseUrl http://localhost:3000] [-RealAfiliadoId 000000071000000000001000000071]

param(
    [string]$BaseUrl       = "http://localhost:3000",
    [string]$RealAfiliadoId = "000000072000000000001000000072",  # nuusuafili de un afiliado real
    [string]$AdminUser     = "admin@test.local",
    [string]$AdminPass     = "admin123"
)

$ENDPOINT = "$BaseUrl/api/ws/WS_VALIDAR_AFILIADO"
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("${AdminUser}:${AdminPass}"))
$HEADERS = @{
    Authorization   = "Basic $b64"
    'Content-Type'  = "application/json"
    Accept          = "application/json"
}

$pass = 0
$fail = 0

function Test-Case {
    param(
        [string]$Id,
        [string]$Desc,
        [string]$Method = "POST",
        [string]$Body,
        [int]   $ExpectStatus,
        [string]$ExpectEstado
    )
    try {
        if ($Method -eq "GET") {
            $resp = Invoke-WebRequest $ENDPOINT -Method Get -Headers $HEADERS -TimeoutSec 10 -EA Stop
        } else {
            $resp = Invoke-WebRequest $ENDPOINT -Method Post -Headers $HEADERS -Body $Body -TimeoutSec 10 -EA Stop
        }
        $status = $resp.StatusCode
        $content = $resp.Content | ConvertFrom-Json
        $estado = $content.EstadoAfiliado
    }
    catch {
        $raw = ""
        if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
            $raw = $_.ErrorDetails.Message
        } elseif ($_.Exception.Response) {
            try {
                $stream = $_.Exception.Response.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($stream)
                $raw = $reader.ReadToEnd()
            } catch {}
        }
        $status = 0
        try { $status = [int]$_.Exception.Response.StatusCode } catch {}
        try { $content = $raw | ConvertFrom-Json; $estado = $content.EstadoAfiliado } catch { $estado = "" }
    }

    $statusOk = ($status -eq $ExpectStatus)
    $estadoOk  = if ($ExpectEstado) { $estado -eq $ExpectEstado } else { $true }

    if ($statusOk -and $estadoOk) {
        Write-Host "[PASS] $Id - $Desc  (HTTP=$status Estado=$estado)"
        $script:pass++
    } else {
        Write-Host "[FAIL] $Id - $Desc  (HTTP=$status esperado=$ExpectStatus  Estado=$estado esperadoEstado=$ExpectEstado)"
        $script:fail++
    }
}

Write-Host ""
Write-Host "===== WS_VALIDAR_AFILIADO - Suite de pruebas ====="
Write-Host "Endpoint: $ENDPOINT"
Write-Host "Logica: nuusuari WHERE nuusuafili=? AND bajaf IS NULL, luego check GAM"
Write-Host ""

# T00: GET debe retornar 405
Test-Case -Id "T00" -Desc "GET debe retornar 405" `
    -Method GET -ExpectStatus 405

# T01: Campo vacio -> EstadoAfiliado I (HTTP 400)  (antes era 'E')
Test-Case -Id "T01" -Desc "NUUsuAfiliadoID vacio -> I (HTTP 400)" `
    -Body '{"NUUsuAfiliadoID":""}' -ExpectStatus 400 -ExpectEstado "I"

# T02: Campo ausente -> EstadoAfiliado I (HTTP 400)
Test-Case -Id "T02" -Desc "NUUsuAfiliadoID ausente -> I (HTTP 400)" `
    -Body '{}' -ExpectStatus 400 -ExpectEstado "I"

# T03: Muy largo (41 chars) -> I (HTTP 400)
$long41 = "A" * 41
Test-Case -Id "T03" -Desc "NUUsuAfiliadoID > 40 chars -> I (HTTP 400)" `
    -Body "{`"NUUsuAfiliadoID`":`"$long41`"}" -ExpectStatus 400 -ExpectEstado "I"

# T04: nuusuafili inexistente -> I (HTTP 200)  (antes era 'N', code eliminado)
Test-Case -Id "T04" -Desc "nuusuafili no encontrado -> I (HTTP 200)" `
    -Body '{"NUUsuAfiliadoID":"999999999999999999999999999999"}' -ExpectStatus 200 -ExpectEstado "I"

# T05: nuusuafili real -> E o I (HTTP 200) -- nunca N
if ($RealAfiliadoId) {
    try {
        $resp = Invoke-RestMethod $ENDPOINT -Method Post -Headers $HEADERS `
            -Body "{`"NUUsuAfiliadoID`":`"$RealAfiliadoId`"}" -TimeoutSec 15 -EA Stop
        $estado = $resp.EstadoAfiliado
        if ($estado -eq "E" -or $estado -eq "I" -or $estado -eq "D") {
            Write-Host "[PASS] T05 - nuusuafili real -> Estado=$estado (E=existente, I=inexistente/baja/GAMinactivo, D=deshabilitado)"
            $pass++
        } else {
            Write-Host "[FAIL] T05 - nuusuafili real -> Estado=$estado (esperado E, I o D)"
            $fail++
        }
    } catch {
        Write-Host "[FAIL] T05 - nuusuafili real -> excepcion: $_"
        $fail++
    }
} else {
    Write-Host "[SKIP] T05 - No se proporciono RealAfiliadoId"
}

# T06: Sin autorizacion -> 401
try {
    $noAuthHeaders = @{ 'Content-Type' = 'application/json'; Accept = 'application/json' }
    $r = Invoke-WebRequest $ENDPOINT -Method Post -Headers $noAuthHeaders `
        -Body '{"NUUsuAfiliadoID":"test"}' -TimeoutSec 10 -EA Stop
    Write-Host "[FAIL] T06 - Sin auth debe retornar 401, obtuvo $($r.StatusCode)"
    $fail++
} catch {
    $sc = 0; try { $sc = [int]$_.Exception.Response.StatusCode } catch {}
    if ($sc -eq 401) {
        Write-Host "[PASS] T06 - Sin auth retorna 401"
        $pass++
    } else {
        Write-Host "[FAIL] T06 - Sin auth retorno $sc (esperado 401)"
        $fail++
    }
}

# T07: Exactamente 40 chars (limite maximo valido) -> HTTP 200 (no error de validacion)
$exact40 = "B" * 40
try {
    $resp = Invoke-WebRequest $ENDPOINT -Method Post -Headers $HEADERS `
        -Body "{`"NUUsuAfiliadoID`":`"$exact40`"}" -TimeoutSec 10 -EA Stop
    if ([int]$resp.StatusCode -eq 200) {
        $estado = ($resp.Content | ConvertFrom-Json).EstadoAfiliado
        Write-Host "[PASS] T07 - 40 chars exactos -> HTTP 200 Estado=$estado (no es 400)"
        $pass++
    } else {
        Write-Host "[FAIL] T07 - 40 chars exactos -> HTTP $($resp.StatusCode) (esperado 200)"
        $fail++
    }
} catch {
    # PS 5.1: excepciones HTTP 4xx también llegan aqui
    $sc = 0; try { $sc = [int]$_.Exception.Response.StatusCode } catch {}
    Write-Host "[FAIL] T07 - 40 chars exactos -> HTTP $sc (esperado 200)"
    $fail++
}

Write-Host ""
Write-Host "===== RESULTADO: $pass/$($pass+$fail) tests PASS ====="
if ($fail -gt 0) { Write-Host "[ATENCION] $fail tests FALLARON" }
Write-Host "Esperados: T00=405, T01-T03=400+E:I, T04=200+I, T05=200+E/I/D, T06=401, T07=200"
Write-Host ""
