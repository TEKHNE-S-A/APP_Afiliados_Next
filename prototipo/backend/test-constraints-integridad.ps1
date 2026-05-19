#!/usr/bin/env pwsh
# Script: Test Constraints de Integridad
# Propósito: Verificar que Ítem 4 (UNIQUE) e Ítem 6 (FK ON DELETE CASCADE) funcionan
# Fecha: 05/05/2026

param(
    [switch]$Cleanup = $false
)

$ErrorActionPreference = "Stop"

# Variables de conexión BD
$dbHost = "localhost"
$dbPort = 5432
$dbName = "app_afiliados_genexus"
$dbUser = "postgres"

# Verificar psql
$psqlCmd = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlCmd) {
    Write-Host "❌ psql no encontrado en PATH" -ForegroundColor Red
    exit 1
}

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "🧪 Test Constraints de Integridad" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Función auxiliar para ejecutar SQL
function Invoke-SQL {
    param([string]$sql, [string]$file)
    if ($file) {
        psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -f $file 2>&1
    } else {
        $sql | psql -h $dbHost -p $dbPort -U $dbUser -d $dbName 2>&1
    }
}

# ============================================================================
# SETUP: Crear datos de prueba
# ============================================================================

Write-Host "`n📋 SETUP: Preparando datos de prueba..." -ForegroundColor Yellow

$setupSQL = "
DELETE FROM public.nuusuari WHERE nuusumail = 'test.unique@test.com';
INSERT INTO public.nuusuari 
  (nuusuid, nuusuafili, nuplaid, nuusufecha, nuusunroaf, nuususexo, nuusuapell, 
   nuusuestit, nuusutelef, nuusumail, nuusubille, nuusuidbil, nuusumailf, 
   nuusuacept, nuusuqrbil, nuusuultno, nuusubajaf, nuusunivel)
VALUES 
  ('TEST-UNIQUE-001', 'TEST-AFILI-001', '1', CURRENT_DATE, '12345678', 'M', 
   'TEST USER', 'S', '1234567890', 'test.unique@test.com', 'N', 'ID-BILL-001',
   CURRENT_TIMESTAMP, 'S', 'QR-TEST-001', 1, CURRENT_TIMESTAMP, 1);

DELETE FROM public.crcreden WHERE crcrecuil = 9876543210;
INSERT INTO public.crcreden
  (crcreid, crcrefecvi, crcrelin, crcrenroaf, crcreapeno, crcreafili, crcrecuil,
   crcreplaid, crcredocum, crcresexo, crcrefecha, crcrehash, crcreifech)
VALUES
  ('TEST-CRED-001', CURRENT_DATE, '', '98765432', 'TEST PERSON', 'TEST-AFILI-001', 9876543210,
   '1', '98765432', 'M', '1990-01-01', '0000000000000000000000000000000000000000', CURRENT_TIMESTAMP);

DELETE FROM public.crcredus WHERE nuusuid = 'TEST-UNIQUE-001' AND crcreid = 'TEST-CRED-001';
INSERT INTO public.crcredus (nuusuid, crcreid, crcrepropi)
VALUES ('TEST-UNIQUE-001', 'TEST-CRED-001', 'S');

SELECT 'Setup completado' as status;
"

Invoke-SQL $setupSQL | Out-Null
Write-Host "✅ Datos de prueba creados" -ForegroundColor Green

# ============================================================================
# TEST 1: UNIQUE constraint en nuusumail (Ítem 4)
# ============================================================================

Write-Host "`n" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "TEST 1️⃣ : UNIQUE en nuusumail (email duplicado)" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

Write-Host "`n📝 Acción: Intentar insertar otro usuario con email 'test.unique@test.com'" -ForegroundColor Yellow

$test1SQL = "
INSERT INTO public.nuusuari 
  (nuusuid, nuusuafili, nuplaid, nuusufecha, nuusunroaf, nuususexo, nuusuapell, 
   nuusuestit, nuusutelef, nuusumail, nuusubille, nuusuidbil, nuusumailf, 
   nuusuacept, nuusuqrbil, nuusuultno, nuusubajaf, nuusunivel)
VALUES 
  ('TEST-UNIQUE-DUP', 'TEST-AFILI-DUP', '1', CURRENT_DATE, '87654321', 'F', 
   'DUP USER', 'N', '9876543210', 'test.unique@test.com', 'N', 'ID-BILL-002',
   CURRENT_TIMESTAMP, 'S', 'QR-TEST-002', 1, CURRENT_TIMESTAMP, 1);
"

$result1 = Invoke-SQL $test1SQL
if ($result1 -like "*duplicate*" -or $result1 -like "*unique*" -or $result1 -like "*violates*") {
    Write-Host "✅ PASS: Se rechazó la inserción (error esperado de UNIQUE)" -ForegroundColor Green
} else {
    Write-Host "❌ FAIL: La inserción NO fue rechazada (el constraint no funciona)" -ForegroundColor Red
    Write-Host "   Output: $result1" -ForegroundColor Gray
}

# ============================================================================
# TEST 2: UNIQUE constraint en crcrecuil (Ítem 4)
# ============================================================================

Write-Host "`n" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "TEST 2️⃣ : UNIQUE en crcrecuil (CUIL duplicado)" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

Write-Host "`n📝 Acción: Intentar insertar otra credencial con CUIL 9876543210" -ForegroundColor Yellow

$test2SQL = "
INSERT INTO public.crcreden
  (crcreid, crcrefecvi, crcrelin, crcrenroaf, crcreapeno, crcreafili, crcrecuil,
   crcreplaid, crcredocum, crcresexo, crcrefecha, crcrehash, crcreifech)
VALUES
  ('TEST-CRED-DUP', CURRENT_DATE, '', '87654321', 'DUP PERSON', 'TEST-AFILI-DUP', 9876543210,
   '1', '87654321', 'F', '1995-05-15', '0000000000000000000000000000000000000000', CURRENT_TIMESTAMP);
"

$result2 = Invoke-SQL $test2SQL
if ($result2 -like "*duplicate*" -or $result2 -like "*unique*" -or $result2 -like "*violates*") {
    Write-Host "✅ PASS: Se rechazó la inserción (error esperado de UNIQUE)" -ForegroundColor Green
} else {
    Write-Host "❌ FAIL: La inserción NO fue rechazada (el constraint no funciona)" -ForegroundColor Red
    Write-Host "   Output: $result2" -ForegroundColor Gray
}

# ============================================================================
# TEST 3: FK ON DELETE CASCADE en crcredus (Ítem 6)
# ============================================================================

Write-Host "`n" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "TEST 3️⃣ : FK ON DELETE CASCADE al borrar usuario" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

Write-Host "`n📝 Acción 1: Verificar relaciones antes del delete" -ForegroundColor Yellow

$test3aSQL = "SELECT COUNT(*) as total_relaciones FROM public.crcredus WHERE nuusuid = 'TEST-UNIQUE-001';"

$result3a = Invoke-SQL $test3aSQL
Write-Host "   Relaciones encontradas antes: $($result3a | Select-String -Pattern '\d+' | Select-Object -First 1)" -ForegroundColor Gray

Write-Host "`n📝 Acción 2: Borrar el usuario 'TEST-UNIQUE-001'" -ForegroundColor Yellow

$test3bSQL = "DELETE FROM public.nuusuari WHERE nuusuid = 'TEST-UNIQUE-001';"

Invoke-SQL $test3bSQL | Out-Null
Write-Host "   Usuario borrado ✓" -ForegroundColor Gray

Write-Host "`n📝 Acción 3: Verificar que la relación se borró en cascada" -ForegroundColor Yellow

$test3cSQL = "SELECT COUNT(*) as total_relaciones FROM public.crcredus WHERE nuusuid = 'TEST-UNIQUE-001';"

$result3c = Invoke-SQL $test3cSQL
if ($result3c -like "*0*" -or $result3c -contains "0") {
    Write-Host "✅ PASS: Las relaciones en crcredus fueron eliminadas automáticamente (CASCADE funcionó)" -ForegroundColor Green
} else {
    Write-Host "❌ FAIL: Las relaciones aún existen (el FK CASCADE no funciona)" -ForegroundColor Red
    Write-Host "   Output: $result3c" -ForegroundColor Gray
}

# ============================================================================
# TEST 4: FK ON DELETE CASCADE - verificar nuusuauth también se borra
# ============================================================================

Write-Host "`n" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "TEST 4️⃣ : FK ON DELETE CASCADE en nuusuauth" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

Write-Host "`n📝 Setup: Crear usuario con entrada en nuusuauth" -ForegroundColor Yellow

$test4aSQL = "
DELETE FROM public.nuusuari WHERE nuusuid = 'TEST-UNIQUE-002';
INSERT INTO public.nuusuari 
  (nuusuid, nuusuafili, nuplaid, nuusufecha, nuusunroaf, nuususexo, nuusuapell, 
   nuusuestit, nuusutelef, nuusumail, nuusubille, nuusuidbil, nuusumailf, 
   nuusuacept, nuusuqrbil, nuusuultno, nuusubajaf, nuusunivel)
VALUES 
  ('TEST-UNIQUE-002', 'TEST-AFILI-002', '1', CURRENT_DATE, '11111111', 'M', 
   'TEST USER 2', 'S', '1111111111', 'test.unique2@test.com', 'N', 'ID-BILL-002',
   CURRENT_TIMESTAMP, 'S', 'QR-TEST-002', 1, CURRENT_TIMESTAMP, 1);

DELETE FROM public.nuusuauth WHERE nuusuid = 'TEST-UNIQUE-002';
INSERT INTO public.nuusuauth (nuusuid, nuusupass)
VALUES ('TEST-UNIQUE-002', 'hash_password_aqui');
"

Invoke-SQL $test4aSQL | Out-Null
Write-Host "✅ Usuario y contraseña creados" -ForegroundColor Green

Write-Host "`n📝 Acción 1: Verificar entrada en nuusuauth" -ForegroundColor Yellow

$test4bSQL = "SELECT COUNT(*) as total_passwords FROM public.nuusuauth WHERE nuusuid = 'TEST-UNIQUE-002';"

$result4b = Invoke-SQL $test4bSQL
Write-Host "   Entradas encontradas: $($result4b | Select-String -Pattern '\d+' | Select-Object -First 1)" -ForegroundColor Gray

Write-Host "`n📝 Acción 2: Borrar usuario (debe eliminar nuusuauth en cascada)" -ForegroundColor Yellow

$test4cSQL = "DELETE FROM public.nuusuari WHERE nuusuid = 'TEST-UNIQUE-002';"

Invoke-SQL $test4cSQL | Out-Null
Write-Host "   Usuario borrado ✓" -ForegroundColor Gray

Write-Host "`n📝 Acción 3: Verificar que nuusuauth también se borró" -ForegroundColor Yellow

$test4dSQL = "SELECT COUNT(*) as total_passwords FROM public.nuusuauth WHERE nuusuid = 'TEST-UNIQUE-002';"

$result4d = Invoke-SQL $test4dSQL
if ($result4d -like "*0*" -or $result4d -contains "0") {
    Write-Host "✅ PASS: El registro en nuusuauth fue eliminado automáticamente (CASCADE funcionó)" -ForegroundColor Green
} else {
    Write-Host "❌ FAIL: El registro en nuusuauth aún existe (el FK CASCADE no funciona)" -ForegroundColor Red
    Write-Host "   Output: $result4d" -ForegroundColor Gray
}

# ============================================================================
# CLEANUP
# ============================================================================

if ($Cleanup) {
    Write-Host "`n" -ForegroundColor Cyan
    Write-Host "🧹 CLEANUP: Eliminando datos de prueba..." -ForegroundColor Yellow
    
    $cleanupSQL = "
DELETE FROM public.crcredus WHERE nuusuid LIKE 'TEST-UNIQUE-%';
DELETE FROM public.crcreden WHERE crcreid LIKE 'TEST-CRED-%';
DELETE FROM public.nuusuauth WHERE nuusuid LIKE 'TEST-UNIQUE-%';
DELETE FROM public.nuusuari WHERE nuusuid LIKE 'TEST-UNIQUE-%';
"
    
    Invoke-SQL $cleanupSQL | Out-Null
    Write-Host "✅ Datos de prueba eliminados" -ForegroundColor Green
}

# ============================================================================
# RESUMEN
# ============================================================================

Write-Host "`n" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "✅ Tests completados" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "`n💡 Próximos pasos:" -ForegroundColor Yellow
Write-Host "   • Si todos los tests pasaron: los constraints funcionan ✅" -ForegroundColor Green
Write-Host "   • Si alguno falló: revisar el error en la BD" -ForegroundColor Red
Write-Host "`n🧹 Para limpiar datos de prueba, ejecuta:" -ForegroundColor Cyan
Write-Host "   .\test-constraints-integridad.ps1 -Cleanup" -ForegroundColor Gray


# ============================================================================
# SETUP: Crear datos de prueba
# ============================================================================

Write-Host "`n📋 SETUP: Preparando datos de prueba..." -ForegroundColor Yellow

$setupSQL = @"
-- Crear un usuario de prueba con email único
DELETE FROM public.nuusuari WHERE nuusumail = 'test.unique@test.com';
INSERT INTO public.nuusuari 
  (nuusuid, nuusuafili, nuplaid, nuusufecha, nuusunroaf, nuususexo, nuusuapell, 
   nuusuestit, nuusutelef, nuusumail, nuusubille, nuusuidbil, nuusumailf, 
   nuusuacept, nuusuqrbil, nuusuultno, nuusubajaf, nuusunivel)
VALUES 
  ('TEST-UNIQUE-001', 'TEST-AFILI-001', '1', CURRENT_DATE, '12345678', 'M', 
   'TEST USER', 'S', '1234567890', 'test.unique@test.com', 'N', 'ID-BILL-001',
   CURRENT_TIMESTAMP, 'S', 'QR-TEST-001', 1, CURRENT_TIMESTAMP, 1);

-- Crear una credencial de prueba con CUIL único
DELETE FROM public.crcreden WHERE crcrecuil = 9876543210;
INSERT INTO public.crcreden
  (crcreid, crcrefecvi, crcrelin, crcrenroaf, crcreapeno, crcreafili, crcrecuil,
   crcreplaid, crcredocum, crcresexo, crcrefecha, crcrehash, crcreifech)
VALUES
  ('TEST-CRED-001', CURRENT_DATE, '', '98765432', 'TEST PERSON', 'TEST-AFILI-001', 9876543210,
   '1', '98765432', 'M', '1990-01-01', '0000000000000000000000000000000000000000', CURRENT_TIMESTAMP);

-- Crear relación usuario-credencial
DELETE FROM public.crcredus WHERE nuusuid = 'TEST-UNIQUE-001' AND crcreid = 'TEST-CRED-001';
INSERT INTO public.crcredus (nuusuid, crcreid, crcrepropi)
VALUES ('TEST-UNIQUE-001', 'TEST-CRED-001', 'S');

SELECT 'Setup completado' as status;
"@

Write-Host "✅ Datos de prueba creados" -ForegroundColor Green

# ============================================================================
# TEST 1: UNIQUE constraint en nuusumail (Ítem 4)
# ============================================================================

Write-Host "`n" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "TEST 1️⃣ : UNIQUE en nuusumail (email duplicado)" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

Write-Host "`n📝 Acción: Intentar insertar otro usuario con email 'test.unique@test.com'" -ForegroundColor Yellow

$test1SQL = @"
INSERT INTO public.nuusuari 
  (nuusuid, nuusuafili, nuplaid, nuusufecha, nuusunroaf, nuususexo, nuusuapell, 
   nuusuestit, nuusutelef, nuusumail, nuusubille, nuusuidbil, nuusumailf, 
   nuusuacept, nuusuqrbil, nuusuultno, nuusubajaf, nuusunivel)
VALUES 
  ('TEST-UNIQUE-DUP', 'TEST-AFILI-DUP', '1', CURRENT_DATE, '87654321', 'F', 
   'DUP USER', 'N', '9876543210', 'test.unique@test.com', 'N', 'ID-BILL-002',
   CURRENT_TIMESTAMP, 'S', 'QR-TEST-002', 1, CURRENT_TIMESTAMP, 1);
"@

$result1 = Invoke-SQL $test1SQL
if ($result1 -like "*duplicate*" -or $result1 -like "*unique*" -or $result1 -like "*violates*") {
    Write-Host "✅ PASS: Se rechazó la inserción (error esperado de UNIQUE)" -ForegroundColor Green
    Write-Host "   Mensaje: $($result1 | Select-String -Pattern "ERROR" -ErrorAction SilentlyContinue)" -ForegroundColor Gray
} else {
    Write-Host "❌ FAIL: La inserción NO fue rechazada (el constraint no funciona)" -ForegroundColor Red
}

# ============================================================================
# TEST 2: UNIQUE constraint en crcrecuil (Ítem 4)
# ============================================================================

Write-Host "`n" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "TEST 2️⃣ : UNIQUE en crcrecuil (CUIL duplicado)" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

Write-Host "`n📝 Acción: Intentar insertar otra credencial con CUIL 9876543210" -ForegroundColor Yellow

$test2SQL = @"
INSERT INTO public.crcreden
  (crcreid, crcrefecvi, crcrelin, crcrenroaf, crcreapeno, crcreafili, crcrecuil,
   crcreplaid, crcredocum, crcresexo, crcrefecha, crcrehash, crcreifech)
VALUES
  ('TEST-CRED-DUP', CURRENT_DATE, '', '87654321', 'DUP PERSON', 'TEST-AFILI-DUP', 9876543210,
   '1', '87654321', 'F', '1995-05-15', '0000000000000000000000000000000000000000', CURRENT_TIMESTAMP);
"@

$result2 = Invoke-SQL $test2SQL
if ($result2 -like "*duplicate*" -or $result2 -like "*unique*" -or $result2 -like "*violates*") {
    Write-Host "✅ PASS: Se rechazó la inserción (error esperado de UNIQUE)" -ForegroundColor Green
    Write-Host "   Mensaje: $($result2 | Select-String -Pattern "ERROR" -ErrorAction SilentlyContinue)" -ForegroundColor Gray
} else {
    Write-Host "❌ FAIL: La inserción NO fue rechazada (el constraint no funciona)" -ForegroundColor Red
}

# ============================================================================
# TEST 3: FK ON DELETE CASCADE en crcredus (Ítem 6)
# ============================================================================

Write-Host "`n" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "TEST 3️⃣ : FK ON DELETE CASCADE al borrar usuario" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

Write-Host "`n📝 Acción 1: Verificar relaciones antes del delete" -ForegroundColor Yellow

$test3aSQL = @"
SELECT COUNT(*) as total_relaciones
FROM public.crcredus 
WHERE nuusuid = 'TEST-UNIQUE-001';
"@

$result3a = Invoke-SQL $test3aSQL
Write-Host "   Relaciones encontradas antes: $result3a" -ForegroundColor Gray

Write-Host "`n📝 Acción 2: Borrar el usuario 'TEST-UNIQUE-001'" -ForegroundColor Yellow

$test3bSQL = @"
DELETE FROM public.nuusuari WHERE nuusuid = 'TEST-UNIQUE-001';
SELECT 'Usuario borrado' as status;
"@

$result3b = Invoke-SQL $test3bSQL
Write-Host "   $result3b" -ForegroundColor Gray

Write-Host "`n📝 Acción 3: Verificar que la relación se borró en cascada" -ForegroundColor Yellow

$test3cSQL = @"
SELECT COUNT(*) as total_relaciones
FROM public.crcredus 
WHERE nuusuid = 'TEST-UNIQUE-001';
"@

$result3c = Invoke-SQL $test3cSQL
if ($result3c -like "*0*") {
    Write-Host "✅ PASS: Las relaciones en crcredus fueron eliminadas automáticamente (CASCADE funcionó)" -ForegroundColor Green
} else {
    Write-Host "❌ FAIL: Las relaciones aún existen (el FK CASCADE no funciona)" -ForegroundColor Red
}

# ============================================================================
# TEST 4: FK ON DELETE CASCADE - verificar nuusuauth también se borra
# ============================================================================

Write-Host "`n" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "TEST 4️⃣ : FK ON DELETE CASCADE en nuusuauth" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

Write-Host "`n📝 Setup: Crear usuario con entrada en nuusuauth" -ForegroundColor Yellow

$test4aSQL = @"
-- Crear usuario
DELETE FROM public.nuusuari WHERE nuusuid = 'TEST-UNIQUE-002';
INSERT INTO public.nuusuari 
  (nuusuid, nuusuafili, nuplaid, nuusufecha, nuusunroaf, nuususexo, nuusuapell, 
   nuusuestit, nuusutelef, nuusumail, nuusubille, nuusuidbil, nuusumailf, 
   nuusuacept, nuusuqrbil, nuusuultno, nuusubajaf, nuusunivel)
VALUES 
  ('TEST-UNIQUE-002', 'TEST-AFILI-002', '1', CURRENT_DATE, '11111111', 'M', 
   'TEST USER 2', 'S', '1111111111', 'test.unique2@test.com', 'N', 'ID-BILL-002',
   CURRENT_TIMESTAMP, 'S', 'QR-TEST-002', 1, CURRENT_TIMESTAMP, 1);

-- Crear entrada en nuusuauth
DELETE FROM public.nuusuauth WHERE nuusuid = 'TEST-UNIQUE-002';
INSERT INTO public.nuusuauth (nuusuid, nuusupass)
VALUES ('TEST-UNIQUE-002', 'hash_password_aqui');

SELECT 'Setup completado' as status;
"@

Invoke-SQL $test4aSQL | Out-Null

Write-Host ✅ Usuario y contraseña creados" -ForegroundColor Green

Write-Host "`n📝 Acción 1: Verificar entrada en nuusuauth" -ForegroundColor Yellow

$test4bSQL = @"
SELECT COUNT(*) as total_passwords
FROM public.nuusuauth 
WHERE nuusuid = 'TEST-UNIQUE-002';
"@

$result4b = Invoke-SQL $test4bSQL
Write-Host "   Entradas encontradas: $result4b" -ForegroundColor Gray

Write-Host "`n📝 Acción 2: Borrar usuario (debe eliminar nuusuauth en cascada)" -ForegroundColor Yellow

$test4cSQL = @"
DELETE FROM public.nuusuari WHERE nuusuid = 'TEST-UNIQUE-002';
SELECT 'Usuario borrado' as status;
"@

Invoke-SQL $test4cSQL | Out-Null

Write-Host "`n📝 Acción 3: Verificar que nuusuauth también se borró" -ForegroundColor Yellow

$test4dSQL = @"
SELECT COUNT(*) as total_passwords
FROM public.nuusuauth 
WHERE nuusuid = 'TEST-UNIQUE-002';
"@

$result4d = Invoke-SQL $test4dSQL
if ($result4d -like "*0*") {
    Write-Host "✅ PASS: El registro en nuusuauth fue eliminado automáticamente (CASCADE funcionó)" -ForegroundColor Green
} else {
    Write-Host "❌ FAIL: El registro en nuusuauth aún existe (el FK CASCADE no funciona)" -ForegroundColor Red
}

# ============================================================================
# CLEANUP
# ============================================================================

if ($Cleanup) {
    Write-Host "`n" -ForegroundColor Cyan
    Write-Host "🧹 CLEANUP: Eliminando datos de prueba..." -ForegroundColor Yellow
    
    $cleanupSQL = @"
DELETE FROM public.crcredus WHERE nuusuid LIKE 'TEST-UNIQUE-%';
DELETE FROM public.crcreden WHERE crcreid LIKE 'TEST-CRED-%';
DELETE FROM public.nuusuauth WHERE nuusuid LIKE 'TEST-UNIQUE-%';
DELETE FROM public.nuusuari WHERE nuusuid LIKE 'TEST-UNIQUE-%';
SELECT 'Cleanup completado' as status;
"@
    
    Invoke-SQL $cleanupSQL | Out-Null
    Write-Host "✅ Datos de prueba eliminados" -ForegroundColor Green
}

# ============================================================================
# RESUMEN
# ============================================================================

Write-Host "`n" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "✅ Tests completados" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "`n💡 Próximos pasos:" -ForegroundColor Yellow
Write-Host "   • Si todos los tests pasaron: los constraints funcionan ✅" -ForegroundColor Green
Write-Host "   • Si alguno falló: revisar el error en la BD" -ForegroundColor Red
Write-Host "`n🧹 Para limpiar datos de prueba, ejecuta:" -ForegroundColor Cyan
Write-Host "   .\test-constraints-integridad.ps1 -Cleanup" -ForegroundColor Gray
