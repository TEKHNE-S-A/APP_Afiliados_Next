#!/usr/bin/env pwsh
# Test simple para crear notificación vía API

$ErrorActionPreference = "Stop"

Write-Host "`n========== TEST: Crear Notificación ==========`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:3000"

# ==============================================================================
# PASO 1: Login
# ==============================================================================

Write-Host "1. Login..." -NoNewline

$loginBody = '{"username":"nuevo@test.com","password":"123456"}'

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.token
    Write-Host " OK" -ForegroundColor Green
    
    # Obtener datos completos del usuario
    $meResponse = Invoke-RestMethod -Uri "$baseUrl/auth/me" -Method GET -Headers @{"Authorization" = "Bearer $token"}
    $nuusuid = $meResponse.nuusuid
    Write-Host "   Usuario ID: $nuusuid" -ForegroundColor Gray
} catch {
    Write-Host " FAIL" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# ==============================================================================
# PASO 2: Crear notificación GENERAL
# ==============================================================================

Write-Host "`n2. Crear notificación GENERAL..." -NoNewline

$body1 = "{
    ""nuusuid"": ""$nuusuid"",
    ""tipo"": ""general"",
    ""titulo"": ""Notificación de Prueba desde PowerShell"",
    ""mensaje"": ""Esta es una notificación de prueba creada para validar el endpoint."",
    ""metadata"": {
        ""origen"": ""powershell_test"",
        ""timestamp"": ""$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')""
    }
}"

try {
    $response1 = Invoke-RestMethod -Uri "$baseUrl/api/notifications/send" -Method POST -Headers $headers -Body $body1
    Write-Host " OK" -ForegroundColor Green
    Write-Host "   ID: $($response1.notification.id)" -ForegroundColor Gray
} catch {
    Write-Host " FAIL" -ForegroundColor Red
    Write-Host "   Error: $($_.ErrorDetails.Message)" -ForegroundColor Red
    exit 1
}

# ==============================================================================
# PASO 3: Crear notificación AUTORIZACION
# ==============================================================================

Write-Host "`n3. Crear notificación AUTORIZACION..." -NoNewline

$body2 = "{
    ""nuusuid"": ""$nuusuid"",
    ""tipo"": ""autorizacion"",
    ""titulo"": ""Autorización Aprobada"",
    ""mensaje"": ""Tu solicitud #12345 ha sido aprobada exitosamente."",
    ""metadata"": {
        ""autorizacionId"": 12345,
        ""prestacion"": ""Consulta médica"",
        ""estado"": ""APROBADA""
    }
}"

try {
    $response2 = Invoke-RestMethod -Uri "$baseUrl/api/notifications/send" -Method POST -Headers $headers -Body $body2
    Write-Host " OK" -ForegroundColor Green
    Write-Host "   ID: $($response2.notification.id)" -ForegroundColor Gray
} catch {
    Write-Host " FAIL" -ForegroundColor Red
    Write-Host "   Error: $($_.ErrorDetails.Message)" -ForegroundColor Red
    exit 1
}

# ==============================================================================
# PASO 4: Crear notificación CREDENCIAL
# ==============================================================================

Write-Host "`n4. Crear notificación CREDENCIAL..." -NoNewline

$fechaVence = (Get-Date).AddDays(5).ToString("yyyy-MM-dd")

$body3 = "{
    ""nuusuid"": ""$nuusuid"",
    ""tipo"": ""credencial"",
    ""titulo"": ""Tu credencial está por vencer"",
    ""mensaje"": ""Tu credencial vence en 5 días."",
    ""metadata"": {
        ""diasRestantes"": 5,
        ""fechaVencimiento"": ""$fechaVence""
    }
}"

try {
    $response3 = Invoke-RestMethod -Uri "$baseUrl/api/notifications/send" -Method POST -Headers $headers -Body $body3
    Write-Host " OK" -ForegroundColor Green
    Write-Host "   ID: $($response3.notification.id)" -ForegroundColor Gray
} catch {
    Write-Host " FAIL" -ForegroundColor Red
    Write-Host "   Error: $($_.ErrorDetails.Message)" -ForegroundColor Red
    exit 1
}

# ==============================================================================
# PASO 5: Validaciones
# ==============================================================================

Write-Host "`n5. Validaciones..." -ForegroundColor Yellow

# 5.1: Título vacío
Write-Host "   5.1 - Título vacío..." -NoNewline
$invalidBody1 = '{"nuusuid":"' + $nuusuid + '","tipo":"general","titulo":"","mensaje":"Mensaje válido"}'
try {
    Invoke-RestMethod -Uri "$baseUrl/api/notifications/send" -Method POST -Headers $headers -Body $invalidBody1
    Write-Host " FAIL (debería haber fallado)" -ForegroundColor Red
} catch {
    $errorMsg = ($_.ErrorDetails.Message | ConvertFrom-Json)
    if ($errorMsg.error -eq "VALIDATION_ERROR") {
        Write-Host " OK" -ForegroundColor Green
    } else {
        Write-Host " FAIL (error inesperado)" -ForegroundColor Red
    }
}

# 5.2: Tipo inválido
Write-Host "   5.2 - Tipo inválido..." -NoNewline
$invalidBody2 = '{"nuusuid":"' + $nuusuid + '","tipo":"tipo_invalido","titulo":"Título","mensaje":"Mensaje"}'
try {
    Invoke-RestMethod -Uri "$baseUrl/api/notifications/send" -Method POST -Headers $headers -Body $invalidBody2
    Write-Host " FAIL (debería haber fallado)" -ForegroundColor Red
} catch {
    $errorMsg = ($_.ErrorDetails.Message | ConvertFrom-Json)
    if ($errorMsg.error -eq "VALIDATION_ERROR") {
        Write-Host " OK" -ForegroundColor Green
    } else {
        Write-Host " FAIL (error inesperado)" -ForegroundColor Red
    }
}

# 5.3: Usuario no existe
Write-Host "   5.3 - Usuario no existe..." -NoNewline
$invalidBody3 = '{"nuusuid":"usuario_falso_12345","tipo":"general","titulo":"Título","mensaje":"Mensaje"}'
try {
    Invoke-RestMethod -Uri "$baseUrl/api/notifications/send" -Method POST -Headers $headers -Body $invalidBody3
    Write-Host " FAIL (debería haber fallado)" -ForegroundColor Red
} catch {
    $errorMsg = ($_.ErrorDetails.Message | ConvertFrom-Json)
    if ($errorMsg.error -eq "USER_NOT_FOUND") {
        Write-Host " OK" -ForegroundColor Green
    } else {
        Write-Host " FAIL (error inesperado)" -ForegroundColor Red
    }
}

# ==============================================================================
# RESUMEN
# ==============================================================================

Write-Host "`n========== TESTS COMPLETADOS ==========`n" -ForegroundColor Green
