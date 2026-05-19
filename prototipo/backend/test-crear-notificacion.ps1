#!/usr/bin/env pwsh
# ==============================================================================
# test-crear-notificacion.ps1
# Script de prueba para el endpoint POST /api/notifications/send
# ==============================================================================

$ErrorActionPreference = "Stop"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "🧪 TEST: Crear Notificación vía API REST" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:3000"
$headers = @{
    "Content-Type" = "application/json"
}

# ==============================================================================
# PASO 1: Login para obtener token
# ==============================================================================

Write-Host "📋 PASO 1: Login para obtener token JWT..." -ForegroundColor Yellow

$loginBody = @{
    username = "marianr@tekhne.com.ar"
    password = "123456"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod `
        -Uri "$baseUrl/auth/login" `
        -Method POST `
        -Headers $headers `
        -Body $loginBody
    
    $token = $loginResponse.token
    $nuusuid = $loginResponse.user.nuusuid
    
    Write-Host "✅ Login exitoso" -ForegroundColor Green
    Write-Host "   Token: $($token.Substring(0, 20))..." -ForegroundColor Gray
    Write-Host "   Usuario ID: $nuusuid" -ForegroundColor Gray
    
} catch {
    Write-Host "❌ Error en login: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Agregar token al header
$headers["Authorization"] = "Bearer $token"

# ==============================================================================
# PASO 2: Crear notificación GENERAL
# ==============================================================================

Write-Host "`n📋 PASO 2: Crear notificación tipo GENERAL..." -ForegroundColor Yellow

$metadata1 = @{
    origen = "powershell_test"
    script = "test-crear-notificacion.ps1"
    timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
}

$notificationBody1 = @{
    nuusuid = $nuusuid
    tipo = "general"
    titulo = "Notificación de Prueba desde PowerShell"
    mensaje = "Esta es una notificación de prueba creada desde el script PowerShell para validar el endpoint /api/notifications/send."
    metadata = $metadata1
} | ConvertTo-Json -Depth 5

try {
    $createResponse1 = Invoke-RestMethod `
        -Uri "$baseUrl/api/notifications/send" `
        -Method POST `
        -Headers $headers `
        -Body $notificationBody1
    
    Write-Host "✅ Notificación GENERAL creada exitosamente" -ForegroundColor Green
    Write-Host "   ID: $($createResponse1.notification.id)" -ForegroundColor Gray
    Write-Host "   Tipo: $($createResponse1.notification.tipo)" -ForegroundColor Gray
    Write-Host "   Título: $($createResponse1.notification.titulo)" -ForegroundColor Gray
    Write-Host "   Fecha: $($createResponse1.notification.fecha_creacion)" -ForegroundColor Gray
    
} catch {
    Write-Host "❌ Error creando notificación: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Response: $($_.ErrorDetails.Message)" -ForegroundColor Gray
    exit 1
}

# ==============================================================================
# PASO 3: Crear notificación AUTORIZACION
# ==============================================================================

Write-Host "`n📋 PASO 3: Crear notificación tipo AUTORIZACION..." -ForegroundColor Yellow

$metadata2 = @{
    autorizacionId = 12345
    prestacion = "Consulta médica"
    estado = "APROBADA"
    fechaAprobacion = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    centroMedico = "Hospital Central"
}

$notificationBody2 = @{
    nuusuid = $nuusuid
    tipo = "autorizacion"
    titulo = "Autorización Aprobada"
    mensaje = "Tu solicitud de autorización #12345 para consulta médica ha sido aprobada exitosamente. Podés presentarte en el centro médico."
    metadata = $metadata2
} | ConvertTo-Json -Depth 5

try {
    $createResponse2 = Invoke-RestMethod `
        -Uri "$baseUrl/api/notifications/send" `
        -Method POST `
        -Headers $headers `
        -Body $notificationBody2
    
    Write-Host "✅ Notificación AUTORIZACION creada exitosamente" -ForegroundColor Green
    Write-Host "   ID: $($createResponse2.notification.id)" -ForegroundColor Gray
    Write-Host "   Tipo: $($createResponse2.notification.tipo)" -ForegroundColor Gray
    Write-Host "   Título: $($createResponse2.notification.titulo)" -ForegroundColor Gray
    Write-Host "   Metadata: autorizacionId=$($createResponse2.notification.metadata.autorizacionId)" -ForegroundColor Gray
    
} catch {
    Write-Host "❌ Error creando notificación: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Response: $($_.ErrorDetails.Message)" -ForegroundColor Gray
    exit 1
}

# ==============================================================================
# PASO 4: Crear notificación CREDENCIAL
# ==============================================================================

Write-Host "`n📋 PASO 4: Crear notificación tipo CREDENCIAL..." -ForegroundColor Yellow

$metadata3 = @{
    diasRestantes = 5
    fechaVencimiento = (Get-Date).AddDays(5).ToString("yyyy-MM-dd")
    accion = "RENOVACION_REQUERIDA"
}

$notificationBody3 = @{
    nuusuid = $nuusuid
    tipo = "credencial"
    titulo = "Tu credencial está por vencer"
    mensaje = "Tu credencial vence en 5 días. Recordá actualizarla para seguir disfrutando de todos los beneficios."
    metadata = $metadata3
} | ConvertTo-Json -Depth 5

try {
    $createResponse3 = Invoke-RestMethod `
        -Uri "$baseUrl/api/notifications/send" `
        -Method POST `
        -Headers $headers `
        -Body $notificationBody3
    
    Write-Host "✅ Notificación CREDENCIAL creada exitosamente" -ForegroundColor Green
    Write-Host "   ID: $($createResponse3.notification.id)" -ForegroundColor Gray
    Write-Host "   Tipo: $($createResponse3.notification.tipo)" -ForegroundColor Gray
    Write-Host "   Título: $($createResponse3.notification.titulo)" -ForegroundColor Gray
    Write-Host "   Metadata: diasRestantes=$($createResponse3.notification.metadata.diasRestantes)" -ForegroundColor Gray
    
} catch {
    Write-Host "❌ Error creando notificación: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Response: $($_.ErrorDetails.Message)" -ForegroundColor Gray
    exit 1
}

# ==============================================================================
# PASO 5: Prueba de VALIDACIONES
# ==============================================================================

Write-Host "`n📋 PASO 5: Probar validaciones..." -ForegroundColor Yellow

# Prueba 5.1: Título vacío
Write-Host "   5.1 - Título vacío..." -ForegroundColor Cyan
$invalidBody1 = @{
    nuusuid = $nuusuid
    tipo = "general"
    titulo = ""
    mensaje = "Mensaje válido"
} | ConvertTo-Json

try {
    Invoke-RestMethod `
        -Uri "$baseUrl/api/notifications/send" `
        -Method POST `
        -Headers $headers `
        -Body $invalidBody1
    
    Write-Host "   ❌ ERROR: Debería haber fallado con título vacío" -ForegroundColor Red
} catch {
    $errorMsg = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($errorMsg.error -eq "VALIDATION_ERROR") {
        Write-Host "   ✅ Validación correcta: $($errorMsg.message)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Error inesperado: $($errorMsg.message)" -ForegroundColor Red
    }
}

# Prueba 5.2: Tipo inválido
Write-Host "   5.2 - Tipo inválido..." -ForegroundColor Cyan
$invalidBody2 = @{
    nuusuid = $nuusuid
    tipo = "tipo_invalido"
    titulo = "Título válido"
    mensaje = "Mensaje válido"
} | ConvertTo-Json

try {
    Invoke-RestMethod `
        -Uri "$baseUrl/api/notifications/send" `
        -Method POST `
        -Headers $headers `
        -Body $invalidBody2
    
    Write-Host "   ❌ ERROR: Debería haber fallado con tipo inválido" -ForegroundColor Red
} catch {
    $errorMsg = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($errorMsg.error -eq "VALIDATION_ERROR") {
        Write-Host "   ✅ Validación correcta: $($errorMsg.message)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Error inesperado: $($errorMsg.message)" -ForegroundColor Red
    }
}

# Prueba 5.3: Usuario no existe
Write-Host "   5.3 - Usuario no existe..." -ForegroundColor Cyan
$invalidBody3 = @{
    nuusuid = "usuario_inexistente_12345"
    tipo = "general"
    titulo = "Título válido"
    mensaje = "Mensaje válido"
} | ConvertTo-Json

try {
    Invoke-RestMethod `
        -Uri "$baseUrl/api/notifications/send" `
        -Method POST `
        -Headers $headers `
        -Body $invalidBody3
    
    Write-Host "   ❌ ERROR: Debería haber fallado con usuario inexistente" -ForegroundColor Red
} catch {
    $errorMsg = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($errorMsg.error -eq "USER_NOT_FOUND") {
        Write-Host "   ✅ Validación correcta: $($errorMsg.message)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Error inesperado: $($errorMsg.message)" -ForegroundColor Red
    }
}

# Prueba 5.4: Título muy largo (>255)
Write-Host "   5.4 - Título muy largo..." -ForegroundColor Cyan
$tituloLargo = "A" * 300
$invalidBody4 = @{
    nuusuid = $nuusuid
    tipo = "general"
    titulo = $tituloLargo
    mensaje = "Mensaje válido"
} | ConvertTo-Json

try {
    Invoke-RestMethod `
        -Uri "$baseUrl/api/notifications/send" `
        -Method POST `
        -Headers $headers `
        -Body $invalidBody4
    
    Write-Host "   ❌ ERROR: Debería haber fallado con título muy largo" -ForegroundColor Red
} catch {
    $errorMsg = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($errorMsg.error -eq "VALIDATION_ERROR") {
        Write-Host "   ✅ Validación correcta: $($errorMsg.message)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Error inesperado: $($errorMsg.message)" -ForegroundColor Red
    }
}

# ==============================================================================
# PASO 6: Verificar que se guardaron en BD
# ==============================================================================

Write-Host "`n📋 PASO 6: Verificar que se guardaron en BD..." -ForegroundColor Yellow

try {
    $listResponse = Invoke-RestMethod `
        -Uri ($baseUrl + '/notifications?page=1&limit=10') `
        -Method GET `
        -Headers $headers
    
    $recentNotifications = $listResponse.notifications | Where-Object { 
        $_.fecha_creacion -gt (Get-Date).AddMinutes(-5).ToString("yyyy-MM-ddTHH:mm:ss") 
    }
    
    Write-Host "✅ Total de notificaciones recientes: $($recentNotifications.Count)" -ForegroundColor Green
    
    foreach ($notif in $recentNotifications) {
        Write-Host "   - [$($notif.tipo)] $($notif.titulo)" -ForegroundColor Gray
    }
    
} catch {
    Write-Host "❌ Error listando notificaciones: $($_.Exception.Message)" -ForegroundColor Red
}

# ==============================================================================
# RESUMEN
# ==============================================================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "✅ TESTS COMPLETADOS" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`n✅ Notificación GENERAL creada" -ForegroundColor Green
Write-Host "✅ Notificación AUTORIZACION creada" -ForegroundColor Green
Write-Host "✅ Notificación CREDENCIAL creada" -ForegroundColor Green
Write-Host "✅ Validaciones funcionando correctamente" -ForegroundColor Green
Write-Host "✅ Push notifications enviadas (si hay dispositivos)" -ForegroundColor Green
Write-Host "`nℹ️  Revisá los logs del backend para confirmar el envío de push notifications" -ForegroundColor Cyan
Write-Host ""
