# Upsert de parámetros SOAP/SIA en nusispar vía API admin
# Requiere backend corriendo en http://localhost:3000
# Uso:
#   .\set-soap-params.ps1
#   .\set-soap-params.ps1 -BaseUrl http://localhost:3000 -AdminUser admin -AdminPass admin123

param(
  [string]$BaseUrl = "http://localhost:3000",
  [string]$AdminUser = "admin",
  [string]$AdminPass = "admin123",

  # WSBENEFTK (Beneficiarios)
  [string]$WsBenefHost = "test17.osep.gob.ar",
  [string]$WsBenefPort = "443",
  [string]$WsBenefSecure = "1",
  [string]$WsBenefBaseUrl = "/OSEP_BENEF17_TEST_WS/",
  [string]$WsBenefServicio = "com.tekhne.abe_ws",
  [string]$WsBenefUser = "admin",
  [string]$WsBenefPassword = "",

  # WSSIATK (SIA)
  [string]$SiaHost = "tkqa.tekhne.com.ar",
  [string]$SiaPort = "8700",
  [string]$SiaSecure = "0",
  [string]$SiaBaseUrl = "/PRODUCTO_SIA_QA/",
  [string]$SiaServicio = "com.tekhne.asia_ws",
  [string]$SiaUser = "mariar",
  [string]$SiaPassword = ""
)

$ErrorActionPreference = "Stop"

function Get-AdminToken {
  param([string]$Url, [string]$User, [string]$Pass)

  $body = @{ username = $User; password = $Pass } | ConvertTo-Json
  $resp = Invoke-RestMethod -Method Post -Uri "$Url/admin/login" -ContentType "application/json" -Body $body
  if (-not $resp.token) { throw "No se recibió token de /admin/login" }
  return $resp.token
}

function Upsert-Parametro {
  param(
    [string]$Url,
    [string]$Token,
    [string]$Grupo,
    [string]$Tipo,
    [string]$Valor
  )

  $headers = @{ Authorization = "Bearer $Token" }

  # Intentar actualizar primero (PUT)
  try {
    $bodyPut = @{ valor = $Valor } | ConvertTo-Json
    Invoke-RestMethod -Method Put -Uri "$Url/admin/parametros/$Grupo/$Tipo" -Headers $headers -ContentType "application/json" -Body $bodyPut | Out-Null
    Write-Host "[OK] PUT $Grupo.$Tipo = $Valor" -ForegroundColor Green
    return
  } catch {
    $status = $_.Exception.Response.StatusCode.value__
    if ($status -ne 404) {
      throw
    }
  }

  # Si no existe, crear (POST)
  $bodyPost = @{ grupo = $Grupo; tipo = $Tipo; valor = $Valor } | ConvertTo-Json
  Invoke-RestMethod -Method Post -Uri "$Url/admin/parametros" -Headers $headers -ContentType "application/json" -Body $bodyPost | Out-Null
  Write-Host "[OK] POST $Grupo.$Tipo = $Valor" -ForegroundColor Green
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Upsert parámetros nusispar (SOAP/SIA)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "BaseUrl: $BaseUrl" -ForegroundColor Gray

if ([string]::IsNullOrWhiteSpace($WsBenefPassword)) {
  $secure = Read-Host "WSBENEFTK.Password (no se guarda en el script)" -AsSecureString
  $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { $WsBenefPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr) } finally { [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

if ([string]::IsNullOrWhiteSpace($SiaPassword)) {
  $secure = Read-Host "WSSIATK.Password (no se guarda en el script)" -AsSecureString
  $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { $SiaPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr) } finally { [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

$token = Get-AdminToken -Url $BaseUrl -User $AdminUser -Pass $AdminPass
Write-Host "Token admin: OK" -ForegroundColor Gray

# WSBENEFTK
Upsert-Parametro -Url $BaseUrl -Token $token -Grupo "WSBENEFTK" -Tipo "Host" -Valor $WsBenefHost
Upsert-Parametro -Url $BaseUrl -Token $token -Grupo "WSBENEFTK" -Tipo "Port" -Valor $WsBenefPort
Upsert-Parametro -Url $BaseUrl -Token $token -Grupo "WSBENEFTK" -Tipo "Secure" -Valor $WsBenefSecure
Upsert-Parametro -Url $BaseUrl -Token $token -Grupo "WSBENEFTK" -Tipo "BaseUrl" -Valor $WsBenefBaseUrl
Upsert-Parametro -Url $BaseUrl -Token $token -Grupo "WSBENEFTK" -Tipo "Servicio" -Valor $WsBenefServicio
Upsert-Parametro -Url $BaseUrl -Token $token -Grupo "WSBENEFTK" -Tipo "User" -Valor $WsBenefUser
Upsert-Parametro -Url $BaseUrl -Token $token -Grupo "WSBENEFTK" -Tipo "Password" -Valor $WsBenefPassword

# WSSIATK
Upsert-Parametro -Url $BaseUrl -Token $token -Grupo "WSSIATK" -Tipo "Host" -Valor $SiaHost
Upsert-Parametro -Url $BaseUrl -Token $token -Grupo "WSSIATK" -Tipo "Port" -Valor $SiaPort
Upsert-Parametro -Url $BaseUrl -Token $token -Grupo "WSSIATK" -Tipo "Secure" -Valor $SiaSecure
Upsert-Parametro -Url $BaseUrl -Token $token -Grupo "WSSIATK" -Tipo "BaseUrl" -Valor $SiaBaseUrl
Upsert-Parametro -Url $BaseUrl -Token $token -Grupo "WSSIATK" -Tipo "Servicio" -Valor $SiaServicio
Upsert-Parametro -Url $BaseUrl -Token $token -Grupo "WSSIATK" -Tipo "User" -Valor $SiaUser
Upsert-Parametro -Url $BaseUrl -Token $token -Grupo "WSSIATK" -Tipo "Password" -Valor $SiaPassword

Write-Host "\nListo. Reiniciá el backend para que reintente SOAP/SIA." -ForegroundColor Cyan
