# Test GAM Integration - Simplificado
# Prueba de servicios GAM (GeneXus Access Manager)

Write-Host "🔐 Test de Integración GAM - APP_Afiliados" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$BaseUrl = "http://localhost:3000"

# Datos de prueba
$timestamp = Get-Date -Format 'yyyyMMddHHmmss'
$testEmail = "test.gam.$timestamp@example.com"
$testPassword = "TestGAM123!"

Write-Host "📋 Datos de prueba:" -ForegroundColor Yellow
Write-Host "  Email: $testEmail"
Write-Host "  Password: $testPassword"
Write-Host ""

# 1. Verificar backend está corriendo
Write-Host "🔍 1. Verificando backend..." -ForegroundColor Green
try {
    $health = Invoke-RestMethod -Uri "$BaseUrl/" -Method Get -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Backend activo" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend no responde. Ejecuta: cd backend; node server-soap.js" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. POST /gam/register
Write-Host "`n🔍 2. POST /gam/register" -ForegroundColor Green
$registerData = @{
    email = $testEmail
    password = $testPassword
    firstName = "Juan Carlos"
    lastName = "Perez"
    telefono = "3834888888"
    nroAfiliado = "07-12345678-00"
    documento = "12345678"
    cuil = "20123456789"
    sexo = "M"
    fechaNacimiento = "1985-04-15"
    canMiembrosFamiliar = 1
} | ConvertTo-Json

try {
    Write-Host "📤 Enviando registro a GAM..." -ForegroundColor Yellow
    
    $registerResponse = Invoke-RestMethod `
        -Uri "$BaseUrl/gam/register" `
        -Method Post `
        -Body $registerData `
        -ContentType "application/json" `
        -TimeoutSec 30 `
        -ErrorAction Stop
    
    Write-Host "✅ Registro exitoso:" -ForegroundColor Green
    $registerResponse | ConvertTo-Json -Depth 3 | Write-Host
    
    if ($registerResponse.userId) {
        Write-Host "`n📋 UserID obtenido: $($registerResponse.userId)" -ForegroundColor Cyan
        Write-Host "   Este UserID se usará como nuusuid en la BD" -ForegroundColor Cyan
    }
    
} catch {
    Write-Host "❌ Error en registro:" -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   Detalles: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    Write-Host "`n⚠️  Esto es esperado si GAM API no está disponible o datos son inválidos" -ForegroundColor Yellow
}

# 3. POST /gam/login
Write-Host "`n🔍 3. POST /gam/login" -ForegroundColor Green
$loginData = @{
    username = $testEmail
    password = $testPassword
} | ConvertTo-Json

try {
    Write-Host "📤 Intentando login con GAM..." -ForegroundColor Yellow
    
    $loginResponse = Invoke-RestMethod `
        -Uri "$BaseUrl/gam/login" `
        -Method Post `
        -Body $loginData `
        -ContentType "application/json" `
        -TimeoutSec 30 `
        -ErrorAction Stop
    
    Write-Host "✅ Login exitoso:" -ForegroundColor Green
    Write-Host "   Access Token: $($loginResponse.access_token.Substring(0, 50))..." -ForegroundColor Cyan
    Write-Host "   User ID: $($loginResponse.user_id)" -ForegroundColor Cyan
    Write-Host "   Expires in: $($loginResponse.expires_in) segundos" -ForegroundColor Cyan
    
    $accessToken = $loginResponse.access_token
    
    # 4. GET /gam/userinfo (con token)
    Write-Host "`n🔍 4. GET /gam/userinfo" -ForegroundColor Green
    try {
        $headers = @{
            "Authorization" = "Bearer $accessToken"
        }
        
        Write-Host "📤 Obteniendo info usuario..." -ForegroundColor Yellow
        
        $userInfo = Invoke-RestMethod `
            -Uri "$BaseUrl/gam/userinfo" `
            -Method Get `
            -Headers $headers `
            -TimeoutSec 30 `
            -ErrorAction Stop
        
        Write-Host "✅ Info usuario obtenida:" -ForegroundColor Green
        $userInfo | ConvertTo-Json -Depth 3 | Write-Host
        
    } catch {
        Write-Host "❌ Error obteniendo info usuario:" -ForegroundColor Red
        Write-Host "   $($_.Exception.Message)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Error en login:" -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   Detalles: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    Write-Host "`n⚠️  Esto es esperado si el usuario no fue registrado exitosamente" -ForegroundColor Yellow
}

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "✅ Test GAM completado" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Próximos pasos:" -ForegroundColor Yellow
Write-Host "  1. Si los tests fallaron, verificar que GAM API esté disponible"
Write-Host "  2. Verificar logs del backend (backend/server-soap.js)"
Write-Host "  3. Revisar config.json - credenciales GAM"
Write-Host "  4. Ejecutar migración SQL: backend/db/migrate_gam_integration.sql"
Write-Host ""
