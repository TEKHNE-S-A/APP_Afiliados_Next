# ============================================================================
# SCRIPT: Crear notificaciones de prueba en PostgreSQL
# ============================================================================

$testUser = "marianr@tekhne.com.ar"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "CREAR NOTIFICACIONES DE PRUEBA" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 1. Obtener nuusuid del usuario
Write-Host "1. Obteniendo nuusuid del usuario $testUser..."

$query1 = "SELECT nuusuid FROM nuusuari WHERE nuusumail = '$testUser' LIMIT 1;"

try {
    $result = psql -U postgres -d app_afiliados_genexus -c $query1 -t -A 2>&1
    
    if ($LASTEXITCODE -eq 0 -and $result) {
        $nuusuid = $result.Trim()
        Write-Host "[OK] Usuario encontrado: nuusuid = $nuusuid" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Usuario no encontrado o error en consulta" -ForegroundColor Red
        Write-Host "Detalle: $result" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "[ERROR] Error ejecutando consulta: $_" -ForegroundColor Red
    exit 1
}

# 2. Verificar si ya existen notificaciones
Write-Host "`n2. Verificando notificaciones existentes..."

$query2 = "SELECT COUNT(*) FROM notifications WHERE nuusuid = '$nuusuid';"

try {
    $count = psql -U postgres -d app_afiliados_genexus -c $query2 -t -A 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[INFO] Notificaciones existentes: $count" -ForegroundColor Cyan
        
        if ([int]$count -gt 0) {
            $respuesta = Read-Host "`n¿Deseas eliminar las notificaciones existentes antes de crear nuevas? (s/n)"
            if ($respuesta -eq "s" -or $respuesta -eq "S") {
                $query3 = "DELETE FROM notifications WHERE nuusuid = '$nuusuid';"
                psql -U postgres -d app_afiliados_genexus -c $query3 2>&1 | Out-Null
                Write-Host "[OK] Notificaciones eliminadas" -ForegroundColor Green
            }
        }
    }
} catch {
    Write-Host "[WARN] No se pudo verificar notificaciones existentes" -ForegroundColor Yellow
}

# 3. Insertar notificaciones de prueba
Write-Host "`n3. Insertando 10 notificaciones de prueba..."

$query4 = @"
INSERT INTO notifications (id, nuusuid, tipo, titulo, mensaje, leida, fecha_creacion, fecha_leida, metadata)
VALUES 
  (uuid_generate_v4(), '$nuusuid', 'info', 'Nueva prestación disponible', 'Tenés una nueva prestación disponible para consultar', false, now() - interval '1 day', NULL, '{"categoria": "prestaciones"}'),
  (uuid_generate_v4(), '$nuusuid', 'warning', 'Renovación de credencial', 'Tu credencial vence en 15 días. Renovála ahora.', false, now() - interval '2 days', NULL, '{"categoria": "credencial", "dias_vencimiento": 15}'),
  (uuid_generate_v4(), '$nuusuid', 'success', 'Autorización aprobada', 'Tu solicitud de autorización #12345 fue aprobada', false, now() - interval '3 hours', NULL, '{"categoria": "autorizaciones", "numero": "12345"}'),
  (uuid_generate_v4(), '$nuusuid', 'info', 'Recordatorio de turno', 'Recordá tu turno médico mañana a las 10:00', false, now() - interval '6 hours', NULL, '{"categoria": "turnos", "hora": "10:00"}'),
  (uuid_generate_v4(), '$nuusuid', 'error', 'Pago pendiente', 'Tenés un pago de coseguro pendiente', false, now() - interval '12 hours', NULL, '{"categoria": "pagos", "monto": 2500}'),
  (uuid_generate_v4(), '$nuusuid', 'info', 'Bienvenido a OSEP', 'Gracias por registrarte en nuestra app móvil', true, now() - interval '7 days', now() - interval '6 days', '{"categoria": "bienvenida"}'),
  (uuid_generate_v4(), '$nuusuid', 'success', 'Credencial actualizada', 'Tu credencial digital fue actualizada exitosamente', true, now() - interval '5 days', now() - interval '5 days', '{"categoria": "credencial"}'),
  (uuid_generate_v4(), '$nuusuid', 'info', 'Nuevo servicio disponible', 'Ahora podés consultar farmacias cercanas', true, now() - interval '4 days', now() - interval '3 days', '{"categoria": "servicios"}'),
  (uuid_generate_v4(), '$nuusuid', 'warning', 'Mantenimiento programado', 'El sistema estará en mantenimiento el domingo', true, now() - interval '8 days', now() - interval '7 days', '{"categoria": "sistema"}'),
  (uuid_generate_v4(), '$nuusuid', 'success', 'Pago procesado', 'Tu pago de $1500 fue procesado correctamente', true, now() - interval '10 days', now() - interval '9 days', '{"categoria": "pagos", "monto": 1500}');
"@

try {
    psql -U postgres -d app_afiliados_genexus -c $query4 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] 10 notificaciones insertadas correctamente" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Error insertando notificaciones" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "[ERROR] Error: $_" -ForegroundColor Red
    exit 1
}

# 4. Verificar inserción
Write-Host "`n4. Verificando inserción..."

$query5 = @"
SELECT COUNT(*) as total, 
       SUM(CASE WHEN leida = false THEN 1 ELSE 0 END) as no_leidas,
       SUM(CASE WHEN leida = true THEN 1 ELSE 0 END) as leidas
FROM notifications 
WHERE nuusuid = '$nuusuid';
"@

try {
    Write-Host "`nResumen de notificaciones:" -ForegroundColor Cyan
    psql -U postgres -d app_afiliados_genexus -c $query5
    Write-Host ""
} catch {
    Write-Host "[WARN] No se pudo verificar: $_" -ForegroundColor Yellow
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "NOTIFICACIONES CREADAS EXITOSAMENTE" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan
Write-Host "Ahora puedes ejecutar: .\test-notifications-endpoints.ps1" -ForegroundColor Cyan
Write-Host ""
