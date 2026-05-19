#!/usr/bin/env powershell
# Create a test user for authorization verification

param(
    [string]$BackendUrl = "http://localhost:3000"
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "======================================================================"
Write-Host "  SETUP: Create Test User for Authorization Testing"
Write-Host "======================================================================"
Write-Host ""

# Register a new test user
Write-Host "[1/2] Creating test user..."

$testUser = @{
    email = "testuser_$(Get-Random @(1000..9999))@test.local"
    password = "TestPass123456"
    cuil = "20$(Get-Random @(10000000..99999999))"
    dni = "$(Get-Random @(10000000..99999999))"
    nroAfiliado = "000000000100000000000000001"
    fechaNacimiento = "1980-06-15"
    sexo = "M"
    cantidadIntegrantes = 3
    nombre = "Test"
    apellido = "Usuario"
}

$registerBody = $testUser | ConvertTo-Json

try {
    $registerResponse = Invoke-WebRequest -Uri "$BackendUrl/register" `
        -Method POST `
        -ContentType "application/json" `
        -Body $registerBody `
        -ErrorAction Stop
    
    $registerData = $registerResponse.Content | ConvertFrom-Json
    
    Write-Host "[OK] User created successfully"
    Write-Host "  Email: $($testUser.email)"
    Write-Host "  Password: $($testUser.password)"
    Write-Host ""
}
catch {
    Write-Host "[ERROR] Failed to create user: $($_.Exception.Message)"
    try {
        $err = $_.Exception.Response.Content.ToString() | ConvertFrom-Json
        Write-Host "Details: $($err.error)"
    }
    catch { }
    exit 1
}

# Now login with this user
Write-Host "[2/2] Testing login with new user..."

$loginBody = @{
    username = $testUser.email
    password = $testUser.password
} | ConvertTo-Json

try {
    $loginResponse = Invoke-WebRequest -Uri "$BackendUrl/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody `
        -ErrorAction Stop
    
    $loginData = $loginResponse.Content | ConvertFrom-Json
    
    Write-Host "[OK] Login successful"
    Write-Host "  Email: $($loginData.user.email)"
    Write-Host "  AfiliadoId: $($loginData.user.afiliadoId)"
    Write-Host "  Token: $($loginData.token.Substring(0, 40))..."
    Write-Host ""
    Write-Host "Successfully created and logged in with:"
    Write-Host "  Email: $($testUser.email)"
    Write-Host "  Password: $($testUser.password)"
    Write-Host ""
}
catch {
    Write-Host "[ERROR] Login failed: $($_.Exception.Message)"
    exit 1
}

Write-Host "======================================================================"
Write-Host "SETUP COMPLETE"
Write-Host "======================================================================"
Write-Host ""
Write-Host "Next: Run the test with this user:"
Write-Host "  .\test-option1.ps1 -Email ""$($testUser.email)"" -Password ""$($testUser.password)"""
Write-Host ""
