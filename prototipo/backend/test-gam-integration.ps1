# Test GAM Integration
# Prueba de servicios GAM (GeneXus Access Manager)

Write-Host "🔐 Test de Integración GAM - APP_Afiliados" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$BaseUrl = "http://localhost:3000"

# Datos de prueba
$testEmail = "test.gam.$(Get-Date -Format 'yyyyMMddHHmmss')@example.com"
$testPassword = "TestGAM123!"
$testData = @{
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
}

Write-Host "📋 Datos de prueba:" -ForegroundColor Yellow
$testData | ConvertTo-Json -Depth 3

# 1. Verificar backend está corriendo
Write-Host "`n🔍 1. Verificando backend..." -ForegroundColor Green
try {
    $health = Invoke-RestMethod -Uri "$BaseUrl/" -Method Get -TimeoutSec 5
    Write-Host "✅ Backend activo" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend no responde. Ejecuta: cd backend; node server-soap.js" -ForegroundColor Red
    exit 1
}

# 2. Test directo de gamService (desde Node.js)
Write-Host "`n🔍 2. Test directo gamService.js (Node.js)..." -ForegroundColor Green
$testScript = @"
const gamService = require('./gamService');

async function testGAM() {
    try {
        console.log('🔐 Testing GAM Base URL:', gamService.GAM_BASE_URL);
        console.log('🔐 Testing GAM Client ID:', gamService.GAM_CLIENT_ID);
        
        // Test 1: Validar usuario (sin registro previo - debe fallar esperadamente)
        console.log('\n--- Test 1: Validar Usuario ---');
        try {
            const validation = await gamService.validateUserGAM({
                nroAfiliado: '$($testData.nroAfiliado)',
                documento: '$($testData.documento)',
                cuil: '$($testData.cuil)',
                sexo: '$($testData.sexo)',
                fechaNacimiento: '$($testData.fechaNacimiento)',
                canMiembrosFamiliar: 1
            });
            console.log('Validación:', validation);
        } catch (e) {
            console.log('❌ Validación falló (esperado si usuario no existe):', e.error);
        }
        
        // Test 2: Registrar usuario
        console.log('\n--- Test 2: Registrar Usuario ---');
        try {
            const registro = await gamService.registerUserGAM({
                email: '$($testData.email)',
                password: '$($testData.password)',
                firstName: '$($testData.firstName)',
                lastName: '$($testData.lastName)',
                telefono: '$($testData.telefono)',
                nroAfiliado: '$($testData.nroAfiliado)',
                documento: '$($testData.documento)',
                cuil: '$($testData.cuil)',
                sexo: '$($testData.sexo)',
                fechaNacimiento: '$($testData.fechaNacimiento)',
                canMiembrosFamiliar: 1
            });
            console.log('✅ Registro exitoso:', registro);
            console.log('📋 UserID (será nuusuid):', registro.userId);
        } catch (e) {
            console.log('❌ Registro falló:', e.error || e.message);
            console.log('Detalles:', e.details);
        }
        
        // Test 3: Login GAM OAuth2
        console.log('\n--- Test 3: Login OAuth2 ---');
        try {
            const login = await gamService.loginGAM('$testEmailValue', '$testPasswordValue');
            console.log('✅ Login exitoso');
            console.log('📋 Access Token (primeros 50 chars):', login.access_token.substring(0, 50) + '...');
            console.log('📋 User ID:', login.user_id);
            console.log('📋 Expires in:', login.expires_in, 'segundos');
            
            // Test 4: Obtener info usuario
            console.log('\n--- Test 4: Obtener Info Usuario ---');
            try {
                const userInfo = await gamService.getUserInfo(login.access_token);
                console.log('✅ Info usuario obtenida:', userInfo);
            } catch (e) {
                console.log('❌ Error obteniendo info:', e.error);
            }
        } catch (e) {
            console.log('❌ Login falló:', e.error || e.message);
            console.log('Detalles:', e.details);
        }
        
    } catch (error) {
        console.error('❌ Error general:', error);
    }
}

testGAM();
"@

Set-Content -Path "$PSScriptRoot\test-gam-direct.js" -Value $testScript -Encoding UTF8
Write-Host "📝 Script de prueba creado: test-gam-direct.js" -ForegroundColor Cyan

Write-Host "`n▶️  Ejecutando test directo..." -ForegroundColor Yellow
Push-Location $PSScriptRoot
try {
    node test-gam-direct.js
} catch {
    Write-Host "❌ Error ejecutando test: $_" -ForegroundColor Red
} finally {
    Pop-Location
}

# 3. Test endpoints REST del backend
Write-Host "`n🔍 3. Test endpoints REST (backend)..." -ForegroundColor Green

# 3.1 POST /gam/register (nuevo endpoint)
Write-Host "`n📤 3.1 POST /gam/register" -ForegroundColor Yellow
try {
    $registerResponse = Invoke-RestMethod `
        -Uri "$BaseUrl/gam/register" `
        -Method Post `
        -Body ($testData | ConvertTo-Json -Depth 3) `
        -ContentType "application/json" `
        -TimeoutSec 30
    
    Write-Host "✅ Registro exitoso:" -ForegroundColor Green
    $registerResponse | ConvertTo-Json -Depth 3
    
    $userId = $registerResponse.userId
    Write-Host "📋 UserID obtenido: $userId (será usado como nuusuid)" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Error en registro:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.ErrorDetails) {
        Write-Host $_.ErrorDetails.Message
    }
}

# 3.2 POST /gam/login (nuevo endpoint)
Write-Host "`n📤 3.2 POST /gam/login" -ForegroundColor Yellow
try {
    $loginBody = @{
        username = $testEmail
        password = $testPassword
    } | ConvertTo-Json
    
    $loginResponse = Invoke-RestMethod `
        -Uri "$BaseUrl/gam/login" `
        -Method Post `
        -Body $loginBody `
        -ContentType "application/json" `
        -TimeoutSec 30
    
    Write-Host "✅ Login exitoso:" -ForegroundColor Green
    $loginResponse | ConvertTo-Json -Depth 3
    
    $accessToken = $loginResponse.access_token
    Write-Host "📋 Access Token: $($accessToken.Substring(0, 50))..." -ForegroundColor Cyan
    
    # 3.3 GET /gam/userinfo (con token)
    Write-Host "`n📤 3.3 GET /gam/userinfo" -ForegroundColor Yellow
    try {
        $headers = @{
            "Authorization" = "Bearer $accessToken"
        }
        
        $userInfo = Invoke-RestMethod `
            -Uri "$BaseUrl/gam/userinfo" `
            -Method Get `
            -Headers $headers `
            -TimeoutSec 30
        
        Write-Host "✅ Info usuario obtenida:" -ForegroundColor Green
        $userInfo | ConvertTo-Json -Depth 3
        
    } catch {
        Write-Host "❌ Error obteniendo info usuario:" -ForegroundColor Red
        Write-Host $_.Exception.Message
    }
    
} catch {
    Write-Host "❌ Error en login:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.ErrorDetails) {
        Write-Host $_.ErrorDetails.Message
    }
}

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "✅ Test GAM completado" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Próximos pasos:" -ForegroundColor Yellow
Write-Host "  1. Verificar que el UserID de GAM se guarda como nuusuid en la BD"
Write-Host "  2. Adaptar /register y /auth/login existentes para usar GAM"
Write-Host "  3. Actualizar mobile app para usar tokens GAM"
Write-Host ""
