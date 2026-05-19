#Requires -Version 5.1
<#
.SYNOPSIS
  Suite de smoke tests reproductible -- APP Afiliados Backend
  Tarea #22: Tests E2E del flujo critico

.DESCRIPTION
  Cubre los flujos core del backend de forma rapida y sin efectos secundarios:
    - Health del backend
    - Login afiliado local + me
    - Credenciales del grupo familiar
    - Mis Autorizaciones
    - Cartilla (busqueda basica)
    - Feature flags publicos
    - Admin: login + leer parametros + audit-logs
    - 401 sin token en endpoints protegidos
    - Notificaciones: preferencias de usuario
    - Favoritos y recientes
    - Refresh token invalido (seguridad)
    - Info util (publico)
    - Observabilidad (admin auth)

.PARAMETER BaseUrl
  URL base del backend. Default: http://127.0.0.1:3000

.PARAMETER Username
  Email o DNI del usuario afiliado de prueba.

.PARAMETER Pass
  Contrasena del usuario afiliado de prueba.

.PARAMETER AdminEmail
  Email del administrador.

.PARAMETER AdminPass
  Contrasena del administrador.

.EXAMPLE
  .\smoke-tests.ps1
  .\smoke-tests.ps1 -BaseUrl http://localhost:3000
  .\smoke-tests.ps1 -Verbose
#>

[Diagnostics.CodeAnalysis.SuppressMessageAttribute('PSAvoidUsingPlainTextForPassword', '', Justification = 'Smoke test local')]
[CmdletBinding()]
param(
    [string]$BaseUrl    = 'http://127.0.0.1:3000',
    [string]$Username   = 'marianr@tekhne.com.ar',
    [string]$Pass       = '12345678',
    [string]$AdminEmail = 'admin@test.local',
    [string]$AdminPass  = 'admin123'
)

$ErrorActionPreference = 'Continue'

# ------------------------------------------------------------------
# Contadores y helpers
# ------------------------------------------------------------------
[int]$Script:PassCount = 0
[int]$Script:FailCount = 0
[int]$Script:SkipCount = 0
$Script:Errors = New-Object System.Collections.Generic.List[string]

function Write-Section([string]$Title) {
    Write-Host ""
    Write-Host ("  " + $Title) -ForegroundColor Cyan
    Write-Host ("  " + ("-" * 55)) -ForegroundColor DarkGray
}

function Write-Pass([string]$Name, [string]$Detail = '') {
    $Script:PassCount++
    if ($Detail) {
        Write-Host "  [PASS] $Name -- $Detail" -ForegroundColor Green
    } else {
        Write-Host "  [PASS] $Name" -ForegroundColor Green
    }
}

function Write-Fail([string]$Name, [string]$Detail = '') {
    $Script:FailCount++
    $msg = if ($Detail) { "${Name}: $Detail" } else { $Name }
    $Script:Errors.Add($msg)
    Write-Host "  [FAIL] $Name" -ForegroundColor Red
    if ($Detail) {
        Write-Host "         $Detail" -ForegroundColor DarkRed
    }
}

function Write-Skip([string]$Name, [string]$Reason = '') {
    $Script:SkipCount++
    $suffix = if ($Reason) { " ($Reason)" } else { '' }
    Write-Host "  [SKIP] $Name$suffix" -ForegroundColor DarkYellow
}

# Null-coalesce compatible con PS 5
function Coalesce($a, $b) { if ($null -ne $a -and "$a" -ne '') { $a } else { $b } }

# Wrapper sobre Invoke-RestMethod que nunca lanza excepciones
function Invoke-Api {
    param(
        [string]$Method = 'GET',
        [string]$Url,
        [hashtable]$Headers = @{},
        [string]$Body = '',
        [int]$TimeoutSec = 15
    )
    $splat = @{
        Method      = $Method
        Uri         = $Url
        TimeoutSec  = $TimeoutSec
        Headers     = $Headers
        ErrorAction = 'Stop'
    }
    if ($Body) {
        $splat['Body']        = $Body
        $splat['ContentType'] = 'application/json'
    }
    try {
        $resp = Invoke-RestMethod @splat
        return [PSCustomObject]@{ ok = $true; body = $resp; status = 200; rawError = ''; errMsg = '' }
    } catch {
        $statusCode = 0
        try { $statusCode = [int]$_.Exception.Response.StatusCode } catch {}
        $rawErr = ''
        try { $rawErr = $_.ErrorDetails.Message } catch {}
        $errMsg = $_.Exception.Message
        return [PSCustomObject]@{ ok = $false; body = $null; status = $statusCode; rawError = $rawErr; errMsg = $errMsg }
    }
}

function Get-AuthHeader([string]$Token) {
    return @{ Authorization = "Bearer $Token" }
}

# ------------------------------------------------------------------
# 0. ESPERAR BACKEND
# ------------------------------------------------------------------
Write-Host ""
Write-Host "======================================================" -ForegroundColor White
Write-Host "  SMOKE TESTS -- APP Afiliados Backend                " -ForegroundColor White
Write-Host ("  " + (Get-Date -Format 'yyyy-MM-dd HH:mm')) -ForegroundColor DarkGray
Write-Host "  BaseUrl : $BaseUrl" -ForegroundColor DarkGray
Write-Host "======================================================" -ForegroundColor White

Write-Section "0. Verificar que el backend responde"

$backendUp = $false
for ($i = 1; $i -le 10; $i++) {
    $r = Invoke-Api -Url "$BaseUrl/health"
    if ($r.ok) { $backendUp = $true; break }
    Write-Host "  Intento $i/10 -- esperando backend..." -ForegroundColor DarkYellow
    Start-Sleep -Milliseconds 800
}

if (-not $backendUp) {
    Write-Host ""
    Write-Host "  [ERROR FATAL] Backend no disponible en $BaseUrl/health" -ForegroundColor Red
    Write-Host "  Inicialo con: cd backend; node server-soap.js" -ForegroundColor Yellow
    exit 2
}

$hBody = (Invoke-Api -Url "$BaseUrl/health").body
$dbSt  = if ($hBody -and $hBody.PSObject.Properties['database']) { $hBody.database } else { 'desconocido' }
$appSt = if ($hBody -and $hBody.PSObject.Properties['status'])   { $hBody.status }   else { 'ok' }
Write-Pass "GET /health" "status=$appSt  db=$dbSt"

# ------------------------------------------------------------------
# 1. LOGIN AFILIADO
# ------------------------------------------------------------------
Write-Section "1. Login afiliado (POST /auth/login)"

# ConvertTo-Json en PS5 serializa strings numericos sin comillas; construir JSON manualmente
$loginBody = "{`"username`":`"$Username`",`"password`":`"$Pass`"}"
$loginR    = Invoke-Api -Method POST -Url "$BaseUrl/auth/login" -Body $loginBody

$afilToken = $null
$soapDown  = $false

if (-not $loginR.ok) {
    $err = Coalesce $loginR.rawError $loginR.errMsg
    # SKIP si es SOAP/GAM quien falla (no error del backend en sí)
    if ($loginR.rawError -like '*AFILIACION_NO_VIGENTE*' -or $loginR.rawError -like '*no vigente*') {
        Write-Skip "POST /auth/login" "SOAP no devuelve credenciales para este usuario (entorno de prueba)"
        $soapDown = $true
    } elseif ($loginR.rawError -like '*No pudimos verificar*' -or $loginR.rawError -like '*Error de autenticaci*') {
        Write-Skip "POST /auth/login" "GAM no disponible -- usuario GAM sin hash local (servicio externo caido)"
        $soapDown = $true
    } elseif ($loginR.rawError -like '*SOAP_ERROR*' -or $loginR.rawError -like '*verificar tu afiliaci*') {
        Write-Skip "POST /auth/login" "SOAP/Beneficiarios no disponible"
        $soapDown = $true
    } else {
        $errMsg2 = Coalesce ($loginR.rawError -replace '\s+', ' ') $loginR.errMsg
        Write-Fail "POST /auth/login" "HTTP $($loginR.status) -- $errMsg2"
    }
} else {
    if ($loginR.body.token)            { $afilToken = $loginR.body.token }
    elseif ($loginR.body.access_token) { $afilToken = $loginR.body.access_token }

    if (-not $afilToken -or $afilToken.Length -lt 10) {
        Write-Fail "POST /auth/login" "No devolvio token/access_token valido"
    } else {
        $credCount = '?'
        if ($loginR.body.credenciales -is [System.Array]) { $credCount = $loginR.body.credenciales.Count }
        Write-Pass "POST /auth/login" "token ok (len=$($afilToken.Length))  credenciales=$credCount"
    }
}

# 1b. /auth/me
if (-not $afilToken) {
    if ($soapDown) { Write-Skip "GET /auth/me" "SOAP no disponible" }
    else           { Write-Skip "GET /auth/me" "sin token" }
} else {
    $meR = Invoke-Api -Url "$BaseUrl/auth/me" -Headers (Get-AuthHeader $afilToken)
    if ($meR.ok -and $meR.body.nuusuid) {
        $authType = if ($meR.body.PSObject.Properties['authType']) { $meR.body.authType } else { 'local' }
        Write-Pass "GET /auth/me" "username=$($meR.body.username)  authType=$authType"
    } else {
        $err = Coalesce $meR.rawError $meR.errMsg
        Write-Fail "GET /auth/me" "HTTP $($meR.status) -- $err"
    }
}

# 1c. 401 sin token
$noTokenR = Invoke-Api -Url "$BaseUrl/auth/me"
if ($noTokenR.status -eq 401) {
    Write-Pass "GET /auth/me sin token => 401" "proteccion ok"
} else {
    Write-Fail "GET /auth/me sin token => esperaba 401" "recibio HTTP $($noTokenR.status)"
}

# 1d. Sesiones activas
$sessR = if ($afilToken) { Invoke-Api -Url "$BaseUrl/auth/sessions" -Headers (Get-AuthHeader $afilToken) } else { $null }
if ($null -eq $sessR) { Write-Skip "GET /auth/sessions" "sin token" }
elseif ($sessR.ok) {
    $sessCnt = '?'
    if     ($sessR.body.sessions -is [System.Array]) { $sessCnt = $sessR.body.sessions.Count }
    elseif ($sessR.body -is [System.Array])          { $sessCnt = $sessR.body.Count }
    Write-Pass "GET /auth/sessions" "sesiones=$sessCnt"
} else {
    Write-Fail "GET /auth/sessions" "HTTP $($sessR.status)"
}

# ------------------------------------------------------------------
# 2. CREDENCIALES
# ------------------------------------------------------------------
Write-Section "2. Credenciales del grupo familiar"

if (-not $afilToken) {
    Write-Skip "GET /credenciales" "sin token afiliado"
    Write-Skip "GET /credenciales sin token => 401" "sin token afiliado"
} else {

$credR = Invoke-Api -Url "$BaseUrl/credenciales" -Headers (Get-AuthHeader $afilToken)
if ($credR.ok -and $credR.body.credenciales -is [System.Array]) {
    $cnt   = $credR.body.credenciales.Count
    $first = $credR.body.credenciales[0]
    $hasF  = ($null -ne $first.afiliadoId) -or ($null -ne $first.AfiliadoId) -or ($null -ne $first.nuusuid)
    if ($hasF) {
        Write-Pass "GET /credenciales" "count=$cnt  campos ok"
    } else {
        Write-Fail "GET /credenciales" "Faltan campos en la credencial devuelta"
    }
} else {
    $err = Coalesce $credR.rawError $credR.errMsg
    Write-Fail "GET /credenciales" "HTTP $($credR.status) -- $err"
}

# 2b. 401 sin token
$credNoAuth = Invoke-Api -Url "$BaseUrl/credenciales"
if ($credNoAuth.status -eq 401) {
    Write-Pass "GET /credenciales sin token => 401" "proteccion ok"
} else {
    Write-Fail "GET /credenciales sin token => esperaba 401" "recibio HTTP $($credNoAuth.status)"
}

} # end if $afilToken

# ------------------------------------------------------------------
# 3. AUTORIZACIONES
# ------------------------------------------------------------------
Write-Section "3. Mis Autorizaciones"

# La prueba 401 no requiere token; siempre se ejecuta
$autNoAuth = Invoke-Api -Url "$BaseUrl/mis-autorizaciones"
if ($autNoAuth.status -eq 401) {
    Write-Pass "GET /mis-autorizaciones sin token => 401" "proteccion ok"
} else {
    Write-Fail "GET /mis-autorizaciones sin token => esperaba 401" "recibio HTTP $($autNoAuth.status)"
}

if (-not $afilToken) {
    Write-Skip "GET /mis-autorizaciones" "sin token afiliado"
} else {

$autR = Invoke-Api -Url "$BaseUrl/mis-autorizaciones" -Headers (Get-AuthHeader $afilToken)
if ($autR.ok) {
    $autCnt = '?'
    if     ($autR.body -is [System.Array])                    { $autCnt = $autR.body.Count }
    elseif ($autR.body.autorizaciones -is [System.Array])     { $autCnt = $autR.body.autorizaciones.Count }
    Write-Pass "GET /mis-autorizaciones" "count=$autCnt"
} else {
    Write-Fail "GET /mis-autorizaciones" "HTTP $($autR.status)"
}

} # end if $afilToken

# ------------------------------------------------------------------
# 4. CARTILLA
# ------------------------------------------------------------------
Write-Section "4. Cartilla (busqueda basica)"

$cartHeaders = if ($afilToken) { Get-AuthHeader $afilToken } else { @{} }
$cartR = Invoke-Api -Url "$BaseUrl/api/cartilla?q=medico&limit=5" -Headers $cartHeaders
if ($cartR.ok) {
    $cartCnt = '?'
    if     ($cartR.body -is [System.Array])               { $cartCnt = $cartR.body.Count }
    elseif ($cartR.body.data -is [System.Array])          { $cartCnt = $cartR.body.data.Count }
    elseif ($cartR.body.entidades -is [System.Array])     { $cartCnt = $cartR.body.entidades.Count }
    elseif ($cartR.body.results -is [System.Array])       { $cartCnt = $cartR.body.results.Count }
    Write-Pass "GET /api/cartilla?q=medico" "resultados=$cartCnt"
} elseif ($cartR.status -eq 401) {
    $cartR2 = Invoke-Api -Url "$BaseUrl/api/cartilla?q=medico&limit=5"
    if ($cartR2.ok) {
        Write-Pass "GET /api/cartilla?q=medico (publico)" "ok"
    } else {
        Write-Fail "GET /api/cartilla?q=medico" "HTTP $($cartR2.status)"
    }
} else {
    Write-Fail "GET /api/cartilla?q=medico" "HTTP $($cartR.status)"
}

# ------------------------------------------------------------------
# 5. FEATURE FLAGS (publico)
# ------------------------------------------------------------------
Write-Section "5. Feature Flags"

$ffR = Invoke-Api -Url "$BaseUrl/feature-flags"
if ($ffR.ok) {
    $flagsCnt = '?'
    if     ($ffR.body.flags -is [System.Array]) { $flagsCnt = $ffR.body.flags.Count }
    elseif ($ffR.body -is [System.Array])       { $flagsCnt = $ffR.body.Count }
    Write-Pass "GET /feature-flags" "count=$flagsCnt"
} else {
    Write-Fail "GET /feature-flags" "HTTP $($ffR.status)"
}

$ffOneR = Invoke-Api -Url "$BaseUrl/feature-flags/habilitarCartilla"
if ($ffOneR.ok -and $null -ne $ffOneR.body.habilitado) {
    Write-Pass "GET /feature-flags/habilitarCartilla" "habilitado=$($ffOneR.body.habilitado)"
} else {
    Write-Skip "GET /feature-flags/habilitarCartilla" "flag no encontrado"
}

# ------------------------------------------------------------------
# 6. NOTIFICACIONES (preferencias)
# ------------------------------------------------------------------
Write-Section "6. Notificaciones -- preferencias del afiliado"

if (-not $afilToken) {
    Write-Skip "GET /api/me/notification-preferences" "sin token afiliado"
    Write-Skip "GET /api/me/notification-preferences sin token => 401" "sin token afiliado"
} else {

$prefR = Invoke-Api -Url "$BaseUrl/api/me/notification-preferences" -Headers (Get-AuthHeader $afilToken)
if ($prefR.ok) {
    Write-Pass "GET /api/me/notification-preferences" "ok"
} else {
    Write-Fail "GET /api/me/notification-preferences" "HTTP $($prefR.status)"
}

$prefNoAuth = Invoke-Api -Url "$BaseUrl/api/me/notification-preferences"
if ($prefNoAuth.status -eq 401) {
    Write-Pass "GET /api/me/notification-preferences sin token => 401" "proteccion ok"
} else {
    Write-Fail "GET /api/me/notification-preferences sin token => esperaba 401" "recibio HTTP $($prefNoAuth.status)"
}

} # end if $afilToken

# ------------------------------------------------------------------
# 7. ADMIN: LOGIN + PARAMETROS
# ------------------------------------------------------------------
Write-Section "7. Admin -- login y parametros"

$adminLoginBody = @{ username = $AdminEmail; password = $AdminPass } | ConvertTo-Json
$adminLoginR    = Invoke-Api -Method POST -Url "$BaseUrl/admin/login" -Body $adminLoginBody
$adminToken     = $null

if ($adminLoginR.ok) {
    if     ($adminLoginR.body.token)        { $adminToken = $adminLoginR.body.token }
    elseif ($adminLoginR.body.access_token) { $adminToken = $adminLoginR.body.access_token }
}

if ($adminToken) {
    Write-Pass "POST /admin/login" "token ok (len=$($adminToken.Length))"
    $adminHeaders = Get-AuthHeader $adminToken

    $paramR = Invoke-Api -Url "$BaseUrl/admin/parametros" -Headers $adminHeaders
    if ($paramR.ok) {
        $paramTotal = if ($null -ne $paramR.body.total) { $paramR.body.total } else { '?' }
        Write-Pass "GET /admin/parametros" "total=$paramTotal"
    } else {
        Write-Fail "GET /admin/parametros" "HTTP $($paramR.status)"
    }

    $vigR = Invoke-Api -Url "$BaseUrl/admin/parametros/GENERALES/VigenciaCred" -Headers $adminHeaders
    if ($vigR.ok -and $vigR.body.parametro) {
        Write-Pass "GET /admin/parametros/GENERALES/VigenciaCred" "valor=$($vigR.body.parametro.nusisvalpa)"
    } else {
        Write-Fail "GET /admin/parametros/GENERALES/VigenciaCred" "HTTP $($vigR.status)"
    }

    $auditR = Invoke-Api -Url "$BaseUrl/admin/audit-logs?limit=5" -Headers $adminHeaders
    if ($auditR.ok) {
        $auditCnt = '?'
        if     ($null -ne $auditR.body.total)                { $auditCnt = $auditR.body.total }
        elseif ($auditR.body.logs -is [System.Array])        { $auditCnt = $auditR.body.logs.Count }
        Write-Pass "GET /admin/audit-logs" "total=$auditCnt"
    } else {
        Write-Fail "GET /admin/audit-logs" "HTTP $($auditR.status)"
    }

    $supportR = Invoke-Api -Url "$BaseUrl/admin/support/timeline?q=$Username&limit=5" -Headers $adminHeaders
    if ($supportR.ok) {
        Write-Pass "GET /admin/support/timeline" "ok"
    } else {
        Write-Fail "GET /admin/support/timeline" "HTTP $($supportR.status)"
    }

    $adminNoAuth = Invoke-Api -Url "$BaseUrl/admin/parametros"
    if ($adminNoAuth.status -eq 401) {
        Write-Pass "GET /admin/parametros sin token => 401" "proteccion ok"
    } else {
        Write-Fail "GET /admin/parametros sin token => esperaba 401" "recibio HTTP $($adminNoAuth.status)"
    }
} else {
    $err = Coalesce $adminLoginR.rawError $adminLoginR.errMsg
    Write-Fail "POST /admin/login" "HTTP $($adminLoginR.status) -- $err"
    Write-Skip "GET /admin/parametros" "sin token admin"
    Write-Skip "GET /admin/parametros/GENERALES/VigenciaCred" "sin token admin"
    Write-Skip "GET /admin/audit-logs" "sin token admin"
    Write-Skip "GET /admin/support/timeline" "sin token admin"
    Write-Skip "GET /admin/parametros sin token => 401" "sin token admin"
}

# ------------------------------------------------------------------
# 8. REFRESH TOKEN INVALIDO (seguridad)
# ------------------------------------------------------------------
Write-Section "8. Seguridad -- refresh token invalido"

$refreshBody = @{ refreshToken = 'invalid-token-test-security-smoke' } | ConvertTo-Json
$refreshR    = Invoke-Api -Method POST -Url "$BaseUrl/auth/refresh-token" -Body $refreshBody
if ($refreshR.status -in @(401, 400, 403)) {
    Write-Pass "POST /auth/refresh-token con token invalido => $($refreshR.status)" "proteccion ok"
} else {
    Write-Fail "POST /auth/refresh-token con token invalido" "esperaba 400/401/403 -- recibio $($refreshR.status)"
}

# ------------------------------------------------------------------
# 9. INFO UTIL (publico)
# ------------------------------------------------------------------
Write-Section "9. Info Util (publico)"

$infoR = Invoke-Api -Url "$BaseUrl/api/info-util"
if ($infoR.ok) {
    $infoCnt = '?'
    if     ($infoR.body -is [System.Array])           { $infoCnt = $infoR.body.Count }
    elseif ($infoR.body.data -is [System.Array])      { $infoCnt = $infoR.body.data.Count }
    elseif ($infoR.body.items -is [System.Array])     { $infoCnt = $infoR.body.items.Count }
    Write-Pass "GET /api/info-util" "count=$infoCnt"
} else {
    Write-Fail "GET /api/info-util" "HTTP $($infoR.status)"
}

# ------------------------------------------------------------------
# 10. FAVORITOS Y RECIENTES
# ------------------------------------------------------------------
Write-Section "10. Favoritos y recientes del afiliado"

if (-not $afilToken) {
    Write-Skip "GET /api/me/favoritos" "sin token afiliado"
    Write-Skip "GET /api/me/recientes" "sin token afiliado"
} else {

$favR = Invoke-Api -Url "$BaseUrl/api/me/favoritos" -Headers (Get-AuthHeader $afilToken)
if ($favR.ok) {
    $favCnt = '?'
    if     ($favR.body -is [System.Array])              { $favCnt = $favR.body.Count }
    elseif ($favR.body.favoritos -is [System.Array])    { $favCnt = $favR.body.favoritos.Count }
    Write-Pass "GET /api/me/favoritos" "count=$favCnt"
} else {
    Write-Fail "GET /api/me/favoritos" "HTTP $($favR.status)"
}

$recR = Invoke-Api -Url "$BaseUrl/api/me/recientes" -Headers (Get-AuthHeader $afilToken)
if ($recR.ok) {
    $recCnt = '?'
    if     ($recR.body -is [System.Array])               { $recCnt = $recR.body.Count }
    elseif ($recR.body.recientes -is [System.Array])     { $recCnt = $recR.body.recientes.Count }
    Write-Pass "GET /api/me/recientes" "count=$recCnt"
} else {
    Write-Fail "GET /api/me/recientes" "HTTP $($recR.status)"
}

} # end if $afilToken

# ------------------------------------------------------------------
# 11. OBSERVABILIDAD (requiere admin)
# ------------------------------------------------------------------
Write-Section "11. Observabilidad y health extendido"

if ($adminToken) {
    $obsR = Invoke-Api -Url "$BaseUrl/health/observability" -Headers (Get-AuthHeader $adminToken)
    if ($obsR.ok) {
        Write-Pass "GET /health/observability" "ok"
    } else {
        Write-Fail "GET /health/observability" "HTTP $($obsR.status)"
    }

    $alertR = Invoke-Api -Url "$BaseUrl/health/alerts" -Headers (Get-AuthHeader $adminToken)
    if ($alertR.ok) {
        Write-Pass "GET /health/alerts" "ok"
    } else {
        Write-Fail "GET /health/alerts" "HTTP $($alertR.status)"
    }
} else {
    Write-Skip "GET /health/observability" "sin token admin"
    Write-Skip "GET /health/alerts" "sin token admin"
}

# ------------------------------------------------------------------
# 12. ANALITICA FUNCIONAL (requiere admin)
# ------------------------------------------------------------------
Write-Section "12. Analitica funcional"

if ($adminToken) {
    $analyticsR = Invoke-Api -Url "$BaseUrl/admin/analytics/summary?days=7" -Headers (Get-AuthHeader $adminToken)
    if ($analyticsR.ok) {
        $hasTotals  = $null -ne $analyticsR.body.totals
        $hasByEvent = $analyticsR.body.byEvent -is [System.Array]
        $hasDaily   = $analyticsR.body.daily -is [System.Array]

        if ($hasTotals -and $hasByEvent -and $hasDaily) {
            $totalEvents = if ($null -ne $analyticsR.body.totals.events) { $analyticsR.body.totals.events } else { '?' }
            Write-Pass "GET /admin/analytics/summary?days=7" "events=$totalEvents byEvent=$($analyticsR.body.byEvent.Count) daily=$($analyticsR.body.daily.Count)"
        } else {
            Write-Fail "GET /admin/analytics/summary?days=7" "respuesta incompleta (totals/byEvent/daily)"
        }
    } else {
        Write-Fail "GET /admin/analytics/summary?days=7" "HTTP $($analyticsR.status)"
    }

    $analyticsNoAuth = Invoke-Api -Url "$BaseUrl/admin/analytics/summary?days=7"
    if ($analyticsNoAuth.status -eq 401) {
        Write-Pass "GET /admin/analytics/summary sin token => 401" "proteccion ok"
    } else {
        Write-Fail "GET /admin/analytics/summary sin token => esperaba 401" "recibio HTTP $($analyticsNoAuth.status)"
    }
} else {
    Write-Skip "GET /admin/analytics/summary?days=7" "sin token admin"
    Write-Skip "GET /admin/analytics/summary sin token => 401" "sin token admin"
}

# ------------------------------------------------------------------
# 13. CONSTANCIA PDF DE CREDENCIAL
# ------------------------------------------------------------------
Write-Section "13. Constancia PDF de credencial"

$pdfNoAuth = Invoke-Api -Url "$BaseUrl/credencial/constancia.pdf"
if ($pdfNoAuth.status -eq 401) {
    Write-Pass "GET /credencial/constancia.pdf sin token => 401" "proteccion ok"
} else {
    Write-Fail "GET /credencial/constancia.pdf sin token => esperaba 401" "recibio HTTP $($pdfNoAuth.status)"
}

if (-not $afilToken) {
    Write-Skip "GET /credencial/constancia.pdf" "sin token afiliado"
} else {
    $pdfAuth = Invoke-Api -Url "$BaseUrl/credencial/constancia.pdf" -Headers (Get-AuthHeader $afilToken)
    if ($pdfAuth.ok) {
      Write-Pass "GET /credencial/constancia.pdf" "descarga ok"
    } else {
      Write-Fail "GET /credencial/constancia.pdf" "HTTP $($pdfAuth.status)"
    }
}

# ------------------------------------------------------------------
# RESUMEN FINAL
# ------------------------------------------------------------------
Write-Host ""
Write-Host "======================================================" -ForegroundColor White
Write-Host "  RESUMEN SMOKE TESTS -- APP Afiliados Backend        " -ForegroundColor White
Write-Host "======================================================" -ForegroundColor White
Write-Host ("  PASS : " + $Script:PassCount) -ForegroundColor Green
if ($Script:FailCount -gt 0) {
    Write-Host ("  FAIL : " + $Script:FailCount) -ForegroundColor Red
} else {
    Write-Host ("  FAIL : " + $Script:FailCount) -ForegroundColor Green
}
Write-Host ("  SKIP : " + $Script:SkipCount) -ForegroundColor DarkYellow
Write-Host ""

if ($Script:Errors.Count -gt 0) {
    Write-Host "  Tests fallidos:" -ForegroundColor Red
    foreach ($e in $Script:Errors) {
        Write-Host "    - $e" -ForegroundColor Red
    }
    Write-Host ""
}

$total = $Script:PassCount + $Script:FailCount
Write-Host ("  Total evaluados : $total") -ForegroundColor White

if ($Script:FailCount -eq 0) {
    Write-Host "  Estado : OK -- todos los smoke tests pasaron" -ForegroundColor Green
    exit 0
} else {
    $pct = [math]::Round(($Script:PassCount / [math]::Max($total, 1)) * 100, 0)
    Write-Host "  Estado : DEGRADADO -- $($Script:FailCount) fallido(s) ($pct% exito)" -ForegroundColor Red
    exit 1
}
