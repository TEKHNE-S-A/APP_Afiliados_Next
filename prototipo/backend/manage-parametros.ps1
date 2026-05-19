# Script de gestion de parametros - SIMPLIFICADO
# Uso: .\manage-parametros.ps1 -Usuario admin -Clave admin123

param(
    [string]$BaseUrl = "http://localhost:3000",
    [string]$Usuario = "admin",
    [string]$Clave = "admin123"
)

# Login
$loginBody = @{ username = $Usuario; password = $Clave } | ConvertTo-Json
$login = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
$headers = @{ Authorization = "Bearer $($login.token)" }

Write-Host "`nAutenticado correctamente como $Usuario" -ForegroundColor Green

# Menu loop
while ($true) {
    Write-Host "`n=== MENU PARAMETROS ===" -ForegroundColor Cyan
    Write-Host "1. Listar todos"
    Write-Host "2. Listar por grupo"
    Write-Host "3. Ver especifico"
    Write-Host "4. Actualizar"
    Write-Host "5. Crear"
    Write-Host "6. Eliminar"
    Write-Host "0. Salir"
    
    $opt = Read-Host "`nOpcion"
    
    switch ($opt) {
        "1" {
            $r = Invoke-RestMethod -Uri "$BaseUrl/admin/parametros" -Headers $headers
            $r.parametros | Format-Table -AutoSize
        }
        "2" {
            $g = Read-Host "Grupo"
            $r = Invoke-RestMethod -Uri "$BaseUrl/admin/parametros/$g" -Headers $headers
            $r.parametros | Format-Table -AutoSize
        }
        "3" {
            $g = Read-Host "Grupo"
            $t = Read-Host "Tipo"
            $r = Invoke-RestMethod -Uri "$BaseUrl/admin/parametros/$g/$t" -Headers $headers
            $r.parametro | Format-List
        }
        "4" {
            $g = Read-Host "Grupo"
            $t = Read-Host "Tipo"
            $v = Read-Host "Valor"
            $body = @{ valor = $v } | ConvertTo-Json
            $r = Invoke-RestMethod -Uri "$BaseUrl/admin/parametros/$g/$t" -Method PUT -Headers $headers -ContentType "application/json" -Body $body
            Write-Host "Actualizado OK" -ForegroundColor Green
            $r.parametro | Format-List
        }
        "5" {
            $g = Read-Host "Grupo"
            $t = Read-Host "Tipo"
            $v = Read-Host "Valor"
            $body = @{ grupo=$g; tipo=$t; valor=$v } | ConvertTo-Json
            $r = Invoke-RestMethod -Uri "$BaseUrl/admin/parametros" -Method POST -Headers $headers -ContentType "application/json" -Body $body
            Write-Host "Creado OK" -ForegroundColor Green
            $r.parametro | Format-List
        }
        "6" {
            $g = Read-Host "Grupo"
            $t = Read-Host "Tipo"
            $confirm = Read-Host "Confirmar eliminacion (S/N)"
            if ($confirm -eq "S") {
                $r = Invoke-RestMethod -Uri "$BaseUrl/admin/parametros/$g/$t" -Method DELETE -Headers $headers
                Write-Host "Eliminado OK" -ForegroundColor Green
            }
        }
        "0" { exit 0 }
    }
    
    Read-Host "`nPresione Enter"
}
