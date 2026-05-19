param(
  [string]$BaseUrl = 'http://localhost:3000'
)

$ErrorActionPreference = 'Stop'

function Invoke-Http {
  param(
    [Parameter(Mandatory=$true)][string]$Method,
    [Parameter(Mandatory=$true)][string]$Url,
    [string]$Body,
    [string]$ContentType,
    [hashtable]$Headers
  )

  try {
    $iwrParams = @{
      Method = $Method
      Uri = $Url
      TimeoutSec = 15
    }
    if ($Headers) { $iwrParams.Headers = $Headers }
    if (-not [string]::IsNullOrEmpty($Body)) { $iwrParams.Body = $Body }
    if (-not [string]::IsNullOrWhiteSpace($ContentType)) { $iwrParams.ContentType = $ContentType }

    $resp = Invoke-WebRequest @iwrParams
    return [pscustomobject]@{
      Status = [int]$resp.StatusCode
      Body = $resp.Content
    }
  } catch {
    $e = $_
    if ($e.Exception -and $e.Exception.Response) {
      $status = [int]$e.Exception.Response.StatusCode
      $content = $null

      if ($e.ErrorDetails -and -not [string]::IsNullOrEmpty($e.ErrorDetails.Message)) {
        $content = $e.ErrorDetails.Message
      } else {
        try {
          $sr = New-Object System.IO.StreamReader($e.Exception.Response.GetResponseStream())
          $content = $sr.ReadToEnd()
        } catch {
          $content = ''
        }
      }

      return [pscustomobject]@{
        Status = $status
        Body = $(if ($null -eq $content) { '' } else { $content })
      }
    }
    throw
  }
}

Write-Host "== Backend Zod/Auth validation smoke ==" -ForegroundColor Cyan
Write-Host "BaseUrl: $BaseUrl" -ForegroundColor DarkCyan

# 1) 401 estándar (sin Authorization)
Write-Host "\n[1] GET /admin/parametros (sin token)" -ForegroundColor Yellow
$r1 = Invoke-Http -Method 'GET' -Url "$BaseUrl/admin/parametros"
Write-Host ("HTTP {0}" -f $r1.Status)
Write-Host ("BodyLen: {0}" -f ($r1.Body | ForEach-Object { $_.Length }))
Write-Output $r1.Body

# 2) 400 estándar (Zod query) - buscar-cuil sin query
Write-Host "\n[2] GET /buscar-cuil (sin query)" -ForegroundColor Yellow
$r2 = Invoke-Http -Method 'GET' -Url "$BaseUrl/buscar-cuil"
Write-Host ("HTTP {0}" -f $r2.Status)
Write-Host ("BodyLen: {0}" -f ($r2.Body | ForEach-Object { $_.Length }))
Write-Output $r2.Body

# 3) 400 estándar (Zod body) - auth/login body vacío
Write-Host "\n[3] POST /auth/login (body vacío)" -ForegroundColor Yellow
$r3 = Invoke-Http -Method 'POST' -Url "$BaseUrl/auth/login" -ContentType 'application/json' -Body '{}' 
Write-Host ("HTTP {0}" -f $r3.Status)
Write-Host ("BodyLen: {0}" -f ($r3.Body | ForEach-Object { $_.Length }))
Write-Output $r3.Body

# 4) 400 estándar (JSON inválido)
Write-Host "\n[4] POST /auth/login (JSON inválido)" -ForegroundColor Yellow
$r4 = Invoke-Http -Method 'POST' -Url "$BaseUrl/auth/login" -ContentType 'application/json' -Body '{'
Write-Host ("HTTP {0}" -f $r4.Status)
Write-Host ("BodyLen: {0}" -f ($r4.Body | ForEach-Object { $_.Length }))
Write-Output $r4.Body

Write-Host "\nOK - smoke terminado" -ForegroundColor Green
