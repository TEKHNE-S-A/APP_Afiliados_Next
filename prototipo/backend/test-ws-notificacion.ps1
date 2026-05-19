# Test WS_NOTIFICACION (REST) - YAML request + JSON response
# Ejecutar (default): .\test-ws-notificacion.ps1
# Con parámetros (sin login): .\test-ws-notificacion.ps1 -CrCreId "..." -NroAfiliado "..."
# Requiere backend corriendo en http://localhost:3000

param(
    [string]$BaseUrl = "http://localhost:3000",
    # Login (Bearer) - solo se usa si no se pasa -CrCreId / -NroAfiliado
    [string]$LoginUsername = "marianr@tekhne.com.ar",
    [string]$LoginPassword = "123456",
    # Alternativa: pasar datos directamente (saltea /auth/login y /credenciales)
    [string]$CrCreId,
    [string]$NroAfiliado,
    # Basic Auth (integraciones)
    [string]$BasicUsername = "admin@test.local",
    [string]$BasicPassword = "admin123"
)

$baseUrl = $BaseUrl
$ErrorActionPreference = "Stop"

Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "  🧪 TEST WS_NOTIFICACION" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

if ($CrCreId -and $NroAfiliado) {
    $crcreid = $CrCreId
    $crcrenroaf = $NroAfiliado

    Write-Host "`n1) Usando datos provistos por parámetro (sin login)" -ForegroundColor Gray
    Write-Host "   CrCreId:     $crcreid" -ForegroundColor Gray
    Write-Host "   NroAfiliado: $crcrenroaf" -ForegroundColor Gray
} else {
    # ------------------------------------------------------------
    # 1) Login (Bearer) solo para obtener un CrCreId real desde /credenciales
    # ------------------------------------------------------------
    # Importante: en YAML, valores numéricos sin comillas se parsean como número.
    # Por eso, siempre enviamos username/password como strings.
    $loginYaml = "username: '$LoginUsername'`npassword: '$LoginPassword'`n"

    Write-Host "`n1) Login (Bearer) para obtener token..." -NoNewline
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -ContentType "application/yaml" -Body $loginYaml
    $token = $loginResponse.token
    if (-not $token) {
        throw "No se obtuvo token desde /auth/login"
    }
    Write-Host " OK" -ForegroundColor Green

    # ------------------------------------------------------------
    # 2) Obtener credenciales de BD y tomar la primera (crcreid + crcrenroaf)
    # ------------------------------------------------------------
    Write-Host "2) Obtener /credenciales..." -NoNewline
    $bearerHeaders = @{ "Authorization" = "Bearer $token" }
    $credResp = Invoke-RestMethod -Uri "$baseUrl/credenciales" -Method Get -Headers $bearerHeaders
    $credenciales = $credResp.credenciales

    if (-not $credenciales -or $credenciales.Count -lt 1) {
        throw "No se encontraron credenciales en /credenciales para el usuario de prueba"
    }

    $cred = $credenciales[0]
    $crcreid = $cred.crcreid
    $crcrenroaf = $cred.crcrenroaf

    if (-not $crcreid -or -not $crcrenroaf) {
        throw "La credencial seleccionada no tiene crcreid/crcrenroaf (ver respuesta de /credenciales)"
    }
    Write-Host " OK" -ForegroundColor Green
    Write-Host "   CrCreId:     $crcreid" -ForegroundColor Gray
    Write-Host "   NroAfiliado: $crcrenroaf" -ForegroundColor Gray
}

# ------------------------------------------------------------
# 3) Basic Auth (integraciones) para llamar WS_NOTIFICACION
# ------------------------------------------------------------
$username = $BasicUsername
$password = $BasicPassword
$base64Auth = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("${username}:${password}"))

$wsBodyYaml = @"
Titulo: "Test WS_NOTIFICACION"
Mensaje: "Prueba de envío batch desde PowerShell"
NUMesId: 1
Afiliados:
  - NUUsuAfiliadoID: "$crcreid"
    NUUsuNroAfiliado: "$crcrenroaf"
"@

$wsHeaders = @{
    "Authorization" = "Basic $base64Auth"
    "Content-Type"  = "application/yaml"
    "Accept"        = "application/json"
}

Write-Host "`n3) POST /api/ws/WS_NOTIFICACION (Basic + YAML)..." -NoNewline
$response = Invoke-RestMethod -Uri "$baseUrl/api/ws/WS_NOTIFICACION" -Method Post -Headers $wsHeaders -Body $wsBodyYaml
Write-Host " OK" -ForegroundColor Green

Write-Host "`nRESPUESTA (SDT):" -ForegroundColor Cyan
Write-Host "   Titulo:  $($response.Titulo)" -ForegroundColor White
Write-Host "   Mensaje: $($response.Mensaje)" -ForegroundColor White
Write-Host "   NUMesId: $($response.NUMesId)" -ForegroundColor White
Write-Host "   Afiliados: $($response.Afiliados.Count)" -ForegroundColor Gray

if ($response.Messages) {
    Write-Host "`nMESSAGES:" -ForegroundColor Cyan
    $response.Messages | ForEach-Object {
        Write-Host ("   - [Type={0}] Id={1} :: {2}" -f $_.Type, $_.Id, $_.Description) -ForegroundColor Gray
    }
} else {
    Write-Host "`n⚠️  La respuesta no trajo Messages" -ForegroundColor Yellow
}

Write-Host "`n=====================================" -ForegroundColor Cyan
