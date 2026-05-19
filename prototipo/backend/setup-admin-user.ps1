# Setup Admin User - Crear usuario admin@test.local si no existe
# Ejecutar: .\setup-admin-user.ps1

$ErrorActionPreference = "Stop"

Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "  SETUP USUARIO ADMIN BACKEND" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

$adminEmail = "admin@test.local"
$adminPassword = "admin123"

# Función para hashear contraseña (mismo algoritmo que el backend)
function Get-PasswordHash {
    param([string]$password)
    
    # Generar salt aleatorio (16 bytes)
    $salt = New-Object byte[] 16
    $rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::new()
    $rng.GetBytes($salt)
    
    # Hashear contraseña con PBKDF2 (1000 iterations, 64 bytes)
    $pbkdf2 = New-Object System.Security.Cryptography.Rfc2898DeriveBytes($password, $salt, 1000)
    $hash = $pbkdf2.GetBytes(64)
    
    # Convertir a hex
    $saltHex = ($salt | ForEach-Object { $_.ToString("x2") }) -join ''
    $hashHex = ($hash | ForEach-Object { $_.ToString("x2") }) -join ''
    
    return "${saltHex}:${hashHex}"
}

try {
    Write-Host "`n1. Verificando si usuario existe..." -NoNewline
    
    # Llamar al endpoint /admin/backend-admins para obtener lista
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:3000/admin/backend-admins" `
            -Method Get `
            -ErrorAction SilentlyContinue
        
        if ($response.admins -contains $adminEmail) {
            Write-Host " OK (ya existe en lista)" -ForegroundColor Green
            Write-Host "   Admin: $adminEmail" -ForegroundColor Gray
        } else {
            Write-Host " NO existe" -ForegroundColor Yellow
        }
    } catch {
        Write-Host " ERROR consultando API" -ForegroundColor Red
    }
    
    Write-Host "`n2. Configurando admin en nusispar..." -NoNewline
    
    # Usar el endpoint /admin/backend-admins/add para agregar admin
    # Este endpoint creará el usuario en BD si no existe
    $addAdminBody = @{
        email = $adminEmail
        nombre = "Admin Test"
        password = $adminPassword
    } | ConvertTo-Json
    
    try {
        # Primero necesitamos autenticarnos (problema: necesitamos un admin existente)
        # Alternativa: crear directamente en BD usando Node.js
        
        Write-Host " Usando Node.js" -ForegroundColor Yellow
        
        # Script Node.js inline
        $nodeScript = @"
const crypto = require('crypto');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return salt + ':' + hash;
}

const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'app_afiliados_genexus',
  user: 'postgres',
  password: 'admin'
});

async function setupAdmin() {
  const email = '$adminEmail';
  const password = '$adminPassword';
  const nombre = 'ADMIN TEST';
  
  try {
    // 1. Verificar si ya existe
    const existing = await pool.query(
      'SELECT nuusuid FROM nuusuari WHERE LOWER(TRIM(nuusumail)) = \$1',
      [email.toLowerCase()]
    );
    
    if (existing.rows.length > 0) {
      console.log('OK: Usuario ya existe (nuusuid: ' + existing.rows[0].nuusuid + ')');
      
      // Actualizar contraseña en nuusuauth
      const passwordHash = hashPassword(password);
      await pool.query(
        'INSERT INTO nuusuauth (nuusuid, nuusupass, nuusucrea, nuusuultm) VALUES (\$1, \$2, NOW(), NOW()) ON CONFLICT (nuusuid) DO UPDATE SET nuusupass = \$2, nuusuultm = NOW()',
        [existing.rows[0].nuusuid, passwordHash]
      );
      console.log('OK: Contraseña actualizada');
      
    } else {
      // 2. Crear usuario en nuusuari
      const passwordHash = hashPassword(password);
      
      const insert = await pool.query(\`
        INSERT INTO nuusuari (
          nuusuafili, nuplaid, nuusufecha, nuusunroaf, nuususexo,
          nuusuapell, nuusuestit, nuusutelef, nuusumail,
          nuusubille, nuusuidbil, nuusumailf, nuusuacept,
          nuusuqrbil, nuusuultno, nuusubajaf, nuusunivel
        ) VALUES (
          '', NULL, NOW(), '', NULL,
          \$1, NULL, '', \$2,
          'N', '', NOW(), 'S',
          '', 0, '0001-01-01'::timestamp, 0
        ) RETURNING nuusuid
      \`, [nombre, email]);
      
      const nuusuid = insert.rows[0].nuusuid;
      
      // 3. Crear contraseña en nuusuauth
      await pool.query(
        'INSERT INTO nuusuauth (nuusuid, nuusupass, nuusucrea, nuusuultm) VALUES (\$1, \$2, NOW(), NOW())',
        [nuusuid, passwordHash]
      );
      
      console.log('OK: Usuario creado (nuusuid: ' + nuusuid + ')');
    }
    
    // 4. Agregar a lista de admins en nusispar
    const paramCheck = await pool.query(
      'SELECT nusisvalpa FROM nusispar WHERE nusisgrupa = \$1 AND nusistippa = \$2',
      ['SEGURIDAD_APP', 'BackendAdminEmails']
    );
    
    let currentAdmins = [];
    if (paramCheck.rows.length > 0) {
      currentAdmins = paramCheck.rows[0].nusisvalpa
        .split(',')
        .map(e => e.trim().toLowerCase())
        .filter(e => e);
    }
    
    if (!currentAdmins.includes(email.toLowerCase())) {
      currentAdmins.push(email.toLowerCase());
      const newValue = currentAdmins.join(', ');
      
      if (paramCheck.rows.length > 0) {
        await pool.query(
          'UPDATE nusispar SET nusisvalpa = \$1 WHERE nusisgrupa = \$2 AND nusistippa = \$3',
          [newValue, 'SEGURIDAD_APP', 'BackendAdminEmails']
        );
      } else {
        await pool.query(
          'INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa, nusisdescr) VALUES (\$1, \$2, \$3, \$4)',
          ['SEGURIDAD_APP', 'BackendAdminEmails', newValue, 'Emails de administradores del backend']
        );
      }
      console.log('OK: Agregado a lista de admins');
    } else {
      console.log('OK: Ya está en lista de admins');
    }
    
    await pool.end();
    console.log('DONE');
    
  } catch (error) {
    console.error('ERROR: ' + error.message);
    await pool.end();
    process.exit(1);
  }
}

setupAdmin();
"@
        
        # Ejecutar script Node.js
        $nodeScript | Out-File -FilePath "temp-setup-admin.js" -Encoding UTF8
        $output = node temp-setup-admin.js 2>&1
        Remove-Item "temp-setup-admin.js" -Force
        
        if ($output -match "ERROR:") {
            Write-Host " ERROR" -ForegroundColor Red
            Write-Host "   $output" -ForegroundColor Yellow
            exit 1
        } else {
            Write-Host " OK" -ForegroundColor Green
            Write-Host "   $output" -ForegroundColor Gray
        }
        
    } catch {
        Write-Host " ERROR" -ForegroundColor Red
        Write-Host "   $($_.Exception.Message)" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "`n3. Verificando autenticación..." -NoNewline
    
    # Test login
    $credenciales = "${adminEmail}:${adminPassword}"
    $base64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($credenciales))
    
    $headers = @{
        Authorization = "Basic $base64"
    }
    
    $testResponse = Invoke-RestMethod -Uri "http://localhost:3000/auth/me" `
        -Method Get `
        -Headers $headers
    
    Write-Host " OK" -ForegroundColor Green
    Write-Host "   Usuario: $($testResponse.user.nuusumail)" -ForegroundColor Gray
    Write-Host "   ID: $($testResponse.user.nuusuid)" -ForegroundColor Gray
    
    Write-Host "`n=====================================" -ForegroundColor Cyan
    Write-Host "  SETUP COMPLETADO" -ForegroundColor Green
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host "`nCredenciales:" -ForegroundColor Yellow
    Write-Host "  Email:    $adminEmail" -ForegroundColor White
    Write-Host "  Password: $adminPassword" -ForegroundColor White
    Write-Host "`nBase64:   $base64" -ForegroundColor Gray
    
} catch {
    Write-Host "`n=====================================" -ForegroundColor Red
    Write-Host "  ERROR EN SETUP" -ForegroundColor Red
    Write-Host "=====================================" -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Yellow
    exit 1
}
