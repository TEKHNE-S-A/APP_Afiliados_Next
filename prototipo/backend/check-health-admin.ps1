param(
    [string]$BaseUrl = 'http://localhost:3000',
    [string]$Username = 'admin@test.local',
    [string]$Password = 'admin123',
    [switch]$JsonOutput
)

$ErrorActionPreference = 'Stop'

function Invoke-SafeGet {
    param(
        [string]$Uri,
        [hashtable]$Headers
    )

    try {
        $resp = Invoke-RestMethod -Uri $Uri -Headers $Headers -Method GET -TimeoutSec 20
        return @{
            ok = $true
            status = 200
            body = $resp
        }
    } catch {
        $status = 0
        $body = $null
        if ($_.Exception.Response) {
            try { $status = [int]$_.Exception.Response.StatusCode } catch {}
        }
        if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
            try { $body = $_.ErrorDetails.Message | ConvertFrom-Json } catch { $body = $_.ErrorDetails.Message }
        }
        return @{
            ok = $false
            status = $status
            body = $body
            error = $_.Exception.Message
        }
    }
}

$result = [ordered]@{
    timestamp = (Get-Date).ToString('o')
    baseUrl = $BaseUrl
    login = $null
    endpoints = [ordered]@{}
}

# 1) Health público
$result.endpoints.health = Invoke-SafeGet -Uri "$BaseUrl/health" -Headers @{}

# 2) Login admin
try {
    $loginBody = @{ username = $Username; password = $Password } | ConvertTo-Json
    $loginResp = Invoke-RestMethod -Uri "$BaseUrl/admin/login" -Method POST -ContentType 'application/json' -Body $loginBody -TimeoutSec 20
    $token = $loginResp.token

    if (-not $token) {
        throw 'Login admin no devolvió token'
    }

    $result.login = @{ ok = $true; status = 200; user = $Username }
    $headers = @{ Authorization = "Bearer $token" }
} catch {
    $result.login = @{ ok = $false; status = 401; user = $Username; error = $_.Exception.Message }
    $headers = @{}
}

# 3) Endpoints protegidos
$result.endpoints.observability = Invoke-SafeGet -Uri "$BaseUrl/health/observability" -Headers $headers
$result.endpoints.alerts = Invoke-SafeGet -Uri "$BaseUrl/health/alerts" -Headers $headers
$result.endpoints.wsConnectivity = Invoke-SafeGet -Uri "$BaseUrl/health/ws-connectivity" -Headers $headers

if ($JsonOutput) {
    $result | ConvertTo-Json -Depth 10
    exit 0
}

Write-Host "=== CHECK HEALTH ADMIN ===" -ForegroundColor Cyan
Write-Host "Base URL: $BaseUrl"
Write-Host "Timestamp: $($result.timestamp)"
Write-Host ""

if ($result.login.ok) {
    Write-Host "Login admin: OK ($Username)" -ForegroundColor Green
} else {
    Write-Host "Login admin: ERROR ($Username)" -ForegroundColor Red
    Write-Host "  Detalle: $($result.login.error)" -ForegroundColor Yellow
}

Write-Host ""
foreach ($name in @('health','observability','alerts','wsConnectivity')) {
    $entry = $result.endpoints[$name]
    if ($entry.ok) {
        Write-Host ("{0}: OK (status {1})" -f $name, $entry.status) -ForegroundColor Green
    } else {
        Write-Host ("{0}: ERROR (status {1})" -f $name, $entry.status) -ForegroundColor Red
        if ($entry.body) {
            $preview = ($entry.body | ConvertTo-Json -Depth 5)
            Write-Host "  Body: $preview" -ForegroundColor Yellow
        } elseif ($entry.error) {
            Write-Host "  Error: $($entry.error)" -ForegroundColor Yellow
        }
    }
}

$hasErrors = @('health','observability','alerts','wsConnectivity') | ForEach-Object { -not $result.endpoints[$_].ok } | Where-Object { $_ } | Measure-Object
if ($hasErrors.Count -gt 0) {
    exit 1
}

exit 0
