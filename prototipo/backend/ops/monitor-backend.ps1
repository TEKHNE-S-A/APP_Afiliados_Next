param(
    [string]$BaseUrl = "http://localhost:3000",
    [PSCredential]$AdminCredential,
    # Fallback si /health/alerts/config falla o ALERTAS_OPS no está en nusispar
    [int]$ErrorRateThresholdPct = 20,
    [int]$MaxDependencyLatencyMs = 8000,
    [string]$WebhookUrl = "",
    [string]$SmtpServer = "",
    [int]$SmtpPort = 25,
    [string]$MailFrom = "",
    [string]$MailTo = "",
    [switch]$Loop,
    [int]$IntervalSeconds = 60
)

$ErrorActionPreference = 'Stop'

function Send-WebhookAlert {
    param(
        [string]$Url,
        [hashtable]$Payload
    )

    if ([string]::IsNullOrWhiteSpace($Url)) { return }

    try {
        Invoke-RestMethod -Uri $Url -Method POST -ContentType 'application/json' -Body ($Payload | ConvertTo-Json -Depth 8) | Out-Null
        Write-Host "[ALERTA] Webhook enviado" -ForegroundColor Yellow
    } catch {
        Write-Warning "No se pudo enviar webhook: $($_.Exception.Message)"
    }
}

function Send-EmailAlert {
    param(
        [string]$Server,
        [int]$Port,
        [string]$From,
        [string]$To,
        [string]$Subject,
        [string]$Body
    )

    if ([string]::IsNullOrWhiteSpace($Server) -or [string]::IsNullOrWhiteSpace($From) -or [string]::IsNullOrWhiteSpace($To)) { return }

    try {
        Send-MailMessage -SmtpServer $Server -Port $Port -From $From -To $To -Subject $Subject -Body $Body | Out-Null
        Write-Host "[ALERTA] Email enviado" -ForegroundColor Yellow
    } catch {
        Write-Warning "No se pudo enviar email: $($_.Exception.Message)"
    }
}

function Invoke-BackendCheck {
    param(
        [string]$ApiBase,
        [PSCredential]$Credential,
        [int]$ErrorRateThreshold,
        [int]$MaxLatencyMs
    )

    $now = Get-Date -Format o
    $alerts = @()

    try {
        $health = Invoke-RestMethod -Uri "$ApiBase/health" -Method GET -TimeoutSec 10
    } catch {
        $alerts += "Backend caído o /health inaccesible: $($_.Exception.Message)"
        return @{
            ok = $false
            timestamp = $now
            alerts = $alerts
            health = $null
            observability = $null
        }
    }

    $token = $null
    try {
        $username = 'admin@test.local'
        $plainPassword = 'admin123'

        if ($Credential) {
            $username = $Credential.UserName
            $credPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Credential.Password)
            try {
                $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($credPtr)
            }
            finally {
                [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($credPtr)
            }
        } else {
            $username = 'admin@test.local'
            $plainPassword = 'admin123'
        }

        $loginPayload = @{ username = $username; password = $plainPassword } | ConvertTo-Json
        $loginResp = Invoke-RestMethod -Uri "$ApiBase/admin/login" -Method POST -ContentType 'application/json' -Body $loginPayload -TimeoutSec 15
        $token = $loginResp.token
    } catch {
        $alerts += "No se pudo autenticar admin para chequeos avanzados: $($_.Exception.Message)"
    }

    $obs = $null
    if ($token) {
        # Cargar configuración de alertas desde nusispar via backend
        try {
            $headers = @{ Authorization = "Bearer $token" }
            $alertsConfig = Invoke-RestMethod -Uri "$ApiBase/health/alerts/config" -Headers $headers -Method GET -TimeoutSec 10
            if ($alertsConfig) {
                if ($alertsConfig.thresholds.errorRatePct) { $ErrorRateThreshold = [int]$alertsConfig.thresholds.errorRatePct }
                if ($alertsConfig.thresholds.maxLatencyMs)  { $MaxLatencyMs       = [int]$alertsConfig.thresholds.maxLatencyMs  }
                Write-Host "[CONFIG] Umbrales cargados desde nusispar: ErrorRate=$ErrorRateThreshold% MaxLatency=${MaxLatencyMs}ms" -ForegroundColor Cyan
            }
        } catch {
            Write-Host "[CONFIG] No se pudo leer /health/alerts/config — usando valores por parámetro" -ForegroundColor DarkYellow
        }

        try {
            $headers = @{ Authorization = "Bearer $token" }
            $obs = Invoke-RestMethod -Uri "$ApiBase/health/observability" -Headers $headers -Method GET -TimeoutSec 20
        } catch {
            $alerts += "No se pudo consultar /health/observability: $($_.Exception.Message)"
        }

        try {
            $headers = @{ Authorization = "Bearer $token" }
            $alertSummary = $null
            try {
                $alertSummary = Invoke-RestMethod -Uri "$ApiBase/health/alerts" -Headers $headers -Method GET -TimeoutSec 20
            } catch {
                $alertSummary = $_.ErrorDetails.Message | ConvertFrom-Json
            }

            if ($alertSummary -and $alertSummary.status -eq 'alert') {
                $alerts += "/health/alerts reporta estado ALERT"
            }
        } catch {
            $alerts += "No se pudo interpretar /health/alerts: $($_.Exception.Message)"
        }
    }

    if ($obs) {
        $requestsTotal = [double]($obs.observability.requests.total)
        $errors5xx = [double]($obs.observability.requests.errors5xx)
        $errorRate = 0
        if ($requestsTotal -gt 0) {
            $errorRate = [math]::Round(($errors5xx / $requestsTotal) * 100, 2)
        }

        if ($errorRate -ge $ErrorRateThreshold) {
            $alerts += "Error rate alto: $errorRate% (umbral $ErrorRateThreshold%)"
        }

        if ($obs.dependencies -and $obs.dependencies.checks) {
            foreach ($dep in $obs.dependencies.checks) {
                if (-not $dep.ok) {
                    $alerts += "Dependencia caída: $($dep.dependency)"
                }
                if ($dep.latencyMs -and [int]$dep.latencyMs -ge $MaxLatencyMs) {
                    $alerts += "Latencia alta en $($dep.dependency): $($dep.latencyMs)ms (umbral ${MaxLatencyMs}ms)"
                }
                if ($dep.error -and $dep.error -match 'timeout') {
                    $alerts += "Timeout detectado en $($dep.dependency): $($dep.error)"
                }
            }
        }
    }

    return @{
        ok = ($alerts.Count -eq 0)
        timestamp = $now
        alerts = $alerts
        health = $health
        observability = $obs
    }
}

function Invoke-MonitorOnce {
    # Intentar obtener config de notificaciones desde nusispar antes del chequeo
    $notifConfig = $null
    try {
        $loginPayload = @{ username = 'admin@test.local'; password = 'admin123' } | ConvertTo-Json
        $loginResp = Invoke-RestMethod -Uri "$BaseUrl/admin/login" -Method POST -ContentType 'application/json' -Body $loginPayload -TimeoutSec 10
        if ($loginResp.token) {
            $headers = @{ Authorization = "Bearer $($loginResp.token)" }
            $notifConfig = Invoke-RestMethod -Uri "$BaseUrl/health/alerts/config" -Headers $headers -Method GET -TimeoutSec 10
        }
    } catch { }

    # Aplicar config de nusispar si está disponible (tiene precedencia sobre params de PS)
    $effectiveWebhook      = if ($notifConfig.notifications.webhookUrl) { $notifConfig.notifications.webhookUrl } else { $WebhookUrl }
    $effectiveSmtpServer   = if ($notifConfig.notifications.smtpServer)  { $notifConfig.notifications.smtpServer  } else { $SmtpServer }
    $effectiveSmtpPort     = if ($notifConfig.notifications.smtpPort)    { [int]$notifConfig.notifications.smtpPort    } else { $SmtpPort }
    $effectiveMailFrom     = if ($notifConfig.notifications.mailFrom)    { $notifConfig.notifications.mailFrom    } else { $MailFrom }
    $effectiveMailTo       = if ($notifConfig.notifications.mailTo)      { $notifConfig.notifications.mailTo      } else { $MailTo }
    $effectiveErrorRate    = if ($notifConfig.thresholds.errorRatePct)   { [int]$notifConfig.thresholds.errorRatePct   } else { $ErrorRateThresholdPct }
    $effectiveLatency      = if ($notifConfig.thresholds.maxLatencyMs)   { [int]$notifConfig.thresholds.maxLatencyMs   } else { $MaxDependencyLatencyMs }

    if ($notifConfig) {
        Write-Host "[CONFIG] Notificaciones desde nusispar: SMTP=$effectiveSmtpServer MailTo=$effectiveMailTo Webhook=$(if ($effectiveWebhook) { 'configurado' } else { 'no' })" -ForegroundColor Cyan
    }

    $result = Invoke-BackendCheck -ApiBase $BaseUrl -Credential $AdminCredential -ErrorRateThreshold $effectiveErrorRate -MaxLatencyMs $effectiveLatency

    if ($result.ok) {
        Write-Host "[OK] $($result.timestamp) Backend saludable" -ForegroundColor Green
        return 0
    }

    Write-Host "[ALERTA] $($result.timestamp) Se detectaron incidentes:" -ForegroundColor Red
    foreach ($a in $result.alerts) {
        Write-Host " - $a" -ForegroundColor Yellow
    }

    $payload = @{
        system = 'APP_Afiliados backend'
        timestamp = $result.timestamp
        baseUrl = $BaseUrl
        alerts = $result.alerts
    }

    Send-WebhookAlert -Url $effectiveWebhook -Payload $payload
    Send-EmailAlert -Server $effectiveSmtpServer -Port $effectiveSmtpPort -From $effectiveMailFrom -To $effectiveMailTo -Subject '[APP_Afiliados] Alerta backend' -Body (($payload | ConvertTo-Json -Depth 8))

    return 2
}

if ($Loop) {
    $effectiveInterval = if ($notifConfig -and $notifConfig.schedule.intervalSeconds) { [int]$notifConfig.schedule.intervalSeconds } else { $IntervalSeconds }
    Write-Host "Monitoreo continuo iniciado. Intervalo: ${effectiveInterval}s (configurable en ALERTAS_OPS.IntervalSeconds)" -ForegroundColor Cyan
    while ($true) {
        [void](Invoke-MonitorOnce)
        Start-Sleep -Seconds $effectiveInterval
    }
}

exit (Invoke-MonitorOnce)
