param([string]$BaseUrl = "http://localhost:3000")
$ADMIN_EMAIL = "admin@test.local"
$ADMIN_PASS  = "admin123"
$pass = 0; $fail = 0

function Check($name, $condition, $detail = "") {
    if ($condition) { Write-Host "  PASS: $name" -ForegroundColor Green; $script:pass++ }
    else { Write-Host "  FAIL: $name $(if($detail){ '-- '+$detail })" -ForegroundColor Red; $script:fail++ }
}

Write-Host "--- Login admin ---"
try {
    $loginBody = @{ username = $ADMIN_EMAIL; password = $ADMIN_PASS } | ConvertTo-Json
    $login = Invoke-RestMethod -Uri "$BaseUrl/admin/login" -Method POST -ContentType "application/json" -Body $loginBody
    $token = $login.token
    $H = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }
    Check "Login admin" ($token -ne $null)
} catch { Write-Host "  FATAL: No se pudo hacer login: $_"; exit 1 }

Write-Host "--- 7.1 Roles por defecto ---"
try {
    $r = Invoke-RestMethod -Uri "$BaseUrl/admin/roles" -Headers $H
    $nombres = $r.roles | ForEach-Object { $_.nombre }
    Check "super_admin existe"  ($nombres -contains "super_admin")
    Check "operador_sia existe" ($nombres -contains "operador_sia")
    Check "visor existe"        ($nombres -contains "visor")
} catch { Check "GET /admin/roles" $false "$_" }

Write-Host "--- 7.2 Modulo invalido => 400 ---"
try {
    $body = @{ nombre = "test_invalido_$(Get-Random)"; permisos = @("inexistente") } | ConvertTo-Json
    Invoke-RestMethod -Uri "$BaseUrl/admin/roles" -Method POST -Headers $H -Body $body
    Check "400 por modulo invalido" $false "No lanzo error"
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    Check "400 por modulo invalido" ($code -eq 400) "HTTP $code"
}

Write-Host "--- 7.3 Asignar/remover rol ---"
try {
    $usersRes = Invoke-RestMethod -Uri "$BaseUrl/admin/users?limit=1" -Headers $H
    $userId = $usersRes.users[0].nuusuid
    $rolesRes = Invoke-RestMethod -Uri "$BaseUrl/admin/roles" -Headers $H
    $visorId = ($rolesRes.roles | Where-Object { $_.nombre -eq "visor" }).id
    $body = @{ roleId = $visorId } | ConvertTo-Json
    $assign = Invoke-RestMethod -Uri "$BaseUrl/admin/users/$userId/role" -Method POST -Headers $H -Body $body
    Check "Asignar rol devuelve success" ($assign.success -eq $true)
    $body2 = "{""roleId"":null}"
    $remove = Invoke-RestMethod -Uri "$BaseUrl/admin/users/$userId/role" -Method POST -Headers $H -Body $body2
    Check "Remover rol (null)" ($remove.success -eq $true -or $remove.message -ne $null)
} catch { Check "Asignar/remover rol" $false "$_" }

Write-Host "--- 7.4 requirePermission en codigo ---"
try {
    $src = Get-Content "E:\MisProyectos\appmovil\APP_Afiliados\backend\server-soap.js" -Raw
    Check "requirePermission(parametros) en codigo" ($src -match "requirePermission\('parametros'\)")
    Check "requirePermission(sia) en codigo"        ($src -match "requirePermission\('sia'\)")
    Check "requirePermission(salud) en codigo"      ($src -match "requirePermission\('salud'\)")
} catch { Check "Verificar codigo" $false "$_" }

Write-Host "--- 7.5 Admin sin rol => 200 en /admin/parametros ---"
try {
    $paramsRes = Invoke-RestMethod -Uri "$BaseUrl/admin/parametros" -Headers $H
    Check "Admin sin rol => 200 en /admin/parametros" ($paramsRes -ne $null)
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    Check "Admin sin rol => 200 en /admin/parametros" $false "HTTP $code"
}

Write-Host "--- 7.6 Rollback script existe ---"
Check "rollback_roles_permissions.sql existe" (Test-Path "E:\MisProyectos\appmovil\APP_Afiliados\backend\db\rollback_roles_permissions.sql")

Write-Host ""
Write-Host "======================================"
Write-Host " Resultados: $pass pasados, $fail fallidos" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Yellow" })
Write-Host "======================================"
