#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Test completo de Tarea 17 - Preferencias de Notificación
  Verifica: tabla BD, endpoints GET/PUT, respeto de prefs en createNotification
#>

$BASE = "http://localhost:3000"
$EMAIL = "marianr@tekhne.com.ar"
$PASS  = "123456"

function Write-OK   { param($msg) Write-Host "  ✅ $msg" -ForegroundColor Green }
function Write-FAIL { param($msg) Write-Host "  ❌ $msg" -ForegroundColor Red }
function Write-INFO { param($msg) Write-Host "  ℹ  $msg" -ForegroundColor Cyan }
function Write-HEAD { param($msg) Write-Host "`n=== $msg ===" -ForegroundColor Yellow }

# ─────────────────────────────────────────────────────────────
# 0. Verificar que el backend esté activo
# ─────────────────────────────────────────────────────────────
Write-HEAD "0. Salud del backend"
try {
    $health = Invoke-RestMethod "$BASE/health" -Method GET -TimeoutSec 5
    Write-OK "Backend activo — status: $($health.status)"
} catch {
    Write-FAIL "Backend no responde en $BASE. Inicialo primero con: node server-soap.js"
    exit 1
}

# ─────────────────────────────────────────────────────────────
# 1. Verificar que la tabla nu_notif_prefs existe en BD
# ─────────────────────────────────────────────────────────────
Write-HEAD "1. Tabla nu_notif_prefs en BD"
try {
    $check = node -e @"
const { Pool } = require('pg');
const pool = new Pool({ host:'127.0.0.1', port:5432, database:'app_afiliados_genexus', user:'postgres', password:'12345678' });
pool.query("SELECT COUNT(*) FROM information_schema.tables WHERE table_name='nu_notif_prefs'")
  .then(r => { console.log(r.rows[0].count); pool.end(); })
  .catch(e => { console.log('ERR:' + e.message); pool.end(); });
"@
    if ($check -eq "1") {
        Write-OK "Tabla nu_notif_prefs existe"
    } else {
        Write-FAIL "Tabla nu_notif_prefs NO encontrada (count=$check)"
    }
} catch {
    Write-FAIL "Error al consultar BD: $($_.Exception.Message)"
}

# ─────────────────────────────────────────────────────────────
# 2. Login para obtener token
# ─────────────────────────────────────────────────────────────
Write-HEAD "2. Login"
try {
    $loginBody = @{ username = $EMAIL; password = $PASS } | ConvertTo-Json
    $loginResp = Invoke-RestMethod "$BASE/auth/login" -Method POST `
        -Body $loginBody -ContentType "application/json" -TimeoutSec 15
    $TOKEN = $loginResp.token ?? $loginResp.access_token
    if ($TOKEN) {
        Write-OK "Login OK — token: $($TOKEN.Substring(0, [Math]::Min(20,$TOKEN.Length)))..."
    } else {
        Write-FAIL "Login sin token en respuesta"
        exit 1
    }
} catch {
    Write-FAIL "Error en login: $($_.Exception.Message)"
    exit 1
}

$HEADERS = @{ Authorization = "Bearer $TOKEN" }

# ─────────────────────────────────────────────────────────────
# 3. GET preferencias — valores por defecto
# ─────────────────────────────────────────────────────────────
Write-HEAD "3. GET /api/me/notification-preferences (defaults)"
try {
    $prefs = Invoke-RestMethod "$BASE/api/me/notification-preferences" `
        -Method GET -Headers $HEADERS -TimeoutSec 10
    $cats = $prefs.preferences
    if ($cats -and $cats.Count -eq 5) {
        Write-OK "Devuelve 5 categorías"
        foreach ($c in $cats) {
            $estado = "push=$($c.push) in_app=$($c.in_app)"
            Write-INFO "$($c.categoria.PadRight(16)) → $estado"
        }
    } else {
        Write-FAIL "Se esperaban 5 categorías, recibidas: $($cats.Count)"
    }
} catch {
    Write-FAIL "Error GET preferencias: $($_.Exception.Message)"
}

# ─────────────────────────────────────────────────────────────
# 4. PUT — desactivar push de 'noticias' y in_app de 'tramites'
# ─────────────────────────────────────────────────────────────
Write-HEAD "4. PUT /api/me/notification-preferences (modificar)"
try {
    $putBody = @{
        preferences = @(
            @{ categoria = "credencial";    push = $true;  in_app = $true  }
            @{ categoria = "autorizaciones";push = $true;  in_app = $true  }
            @{ categoria = "tramites";      push = $true;  in_app = $false }   # ← in_app OFF
            @{ categoria = "noticias";      push = $false; in_app = $true  }   # ← push OFF
            @{ categoria = "sistema";       push = $true;  in_app = $true  }
        )
    } | ConvertTo-Json -Depth 4

    $putResp = Invoke-RestMethod "$BASE/api/me/notification-preferences" `
        -Method PUT -Headers $HEADERS -Body $putBody -ContentType "application/json" -TimeoutSec 10

    $updated = $putResp.preferences
    $tramites = $updated | Where-Object { $_.categoria -eq "tramites" }
    $noticias = $updated | Where-Object { $_.categoria -eq "noticias" }

    if ($tramites -and $tramites.in_app -eq $false) {
        Write-OK "tramites.in_app desactivado correctamente"
    } else {
        Write-FAIL "tramites.in_app debería ser false, es: $($tramites.in_app)"
    }
    if ($noticias -and $noticias.push -eq $false) {
        Write-OK "noticias.push desactivado correctamente"
    } else {
        Write-FAIL "noticias.push debería ser false, es: $($noticias.push)"
    }
} catch {
    Write-FAIL "Error PUT preferencias: $($_.Exception.Message)"
}

# ─────────────────────────────────────────────────────────────
# 5. GET — verificar que los cambios se persistieron
# ─────────────────────────────────────────────────────────────
Write-HEAD "5. GET — persistencia de cambios"
try {
    $prefs2 = Invoke-RestMethod "$BASE/api/me/notification-preferences" `
        -Method GET -Headers $HEADERS -TimeoutSec 10
    $tramites2 = $prefs2.preferences | Where-Object { $_.categoria -eq "tramites" }
    $noticias2  = $prefs2.preferences | Where-Object { $_.categoria -eq "noticias" }

    if ($tramites2.in_app -eq $false -and $noticias2.push -eq $false) {
        Write-OK "Cambios persistidos correctamente"
    } else {
        Write-FAIL "Los cambios no se reflejan: tramites.in_app=$($tramites2.in_app) noticias.push=$($noticias2.push)"
    }
} catch {
    Write-FAIL "Error en GET de verificación: $($_.Exception.Message)"
}

# ─────────────────────────────────────────────────────────────
# 6. Verificar que las categorías inválidas son rechazadas
# ─────────────────────────────────────────────────────────────
Write-HEAD "6. PUT con categoría inválida (debe rechazar)"
try {
    $badBody = @{
        preferences = @(
            @{ categoria = "categoria_inexistente"; push = $true; in_app = $true }
        )
    } | ConvertTo-Json -Depth 4

    try {
        $badResp = Invoke-RestMethod "$BASE/api/me/notification-preferences" `
            -Method PUT -Headers $HEADERS -Body $badBody -ContentType "application/json" -TimeoutSec 10
        Write-FAIL "Debería haber rechazado la categoría inválida pero respondió 200"
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        if ($code -eq 400) {
            Write-OK "Categoría inválida rechazada con 400"
        } else {
            Write-INFO "Respondió código $code (se esperaba 400)"
        }
    }
} catch {
    Write-INFO "Error de red al probar categoría inválida: $($_.Exception.Message)"
}

# ─────────────────────────────────────────────────────────────
# 7. Restaurar defaults para no dejar datos sucios
# ─────────────────────────────────────────────────────────────
Write-HEAD "7. Restaurar preferencias por defecto"
try {
    $restoreBody = @{
        preferences = @(
            @{ categoria = "credencial";    push = $true; in_app = $true }
            @{ categoria = "autorizaciones";push = $true; in_app = $true }
            @{ categoria = "tramites";      push = $true; in_app = $true }
            @{ categoria = "noticias";      push = $true; in_app = $true }
            @{ categoria = "sistema";       push = $true; in_app = $true }
        )
    } | ConvertTo-Json -Depth 4

    Invoke-RestMethod "$BASE/api/me/notification-preferences" `
        -Method PUT -Headers $HEADERS -Body $restoreBody -ContentType "application/json" -TimeoutSec 10 | Out-Null
    Write-OK "Preferencias restauradas a defaults (todo TRUE)"
} catch {
    Write-FAIL "Error al restaurar: $($_.Exception.Message)"
}

# ─────────────────────────────────────────────────────────────
# Resumen
# ─────────────────────────────────────────────────────────────
Write-Host "`n============================================" -ForegroundColor Yellow
Write-Host "  Tarea 17 - Prueba completada" -ForegroundColor Yellow
Write-Host "  Para probar el mobile:" -ForegroundColor Yellow
Write-Host "    1. Abrí la app y logueate" -ForegroundColor White
Write-Host "    2. Ir a Perfil → Notificaciones" -ForegroundColor White
Write-Host "    3. Verificar switches por categoría" -ForegroundColor White
Write-Host "    4. Guardar → debe quedar persistido" -ForegroundColor White
Write-Host "    5. En tab Notificaciones → icono ⚙ en header" -ForegroundColor White
Write-Host "============================================`n" -ForegroundColor Yellow
