# Test de parámetros de endpoints por componentes
# Verifica que el backend construye las URLs correctamente

$ErrorActionPreference = "Stop"

Write-Host "`n=== Test de Parámetros SOAP por Componentes ===" -ForegroundColor Cyan
Write-Host "Base URL esperada: https://test17.osep.gob.ar:443/OSEP_BENEF17_TEST_WS/com.tekhne.abe_ws`n" -ForegroundColor Yellow

# 1. Verificar parámetros en BD
Write-Host "1. Verificando parámetros en BD..." -ForegroundColor Green

$tempJs = @'
const db = require('./db/connection');

async function run() {
  try {
    const result = await db.query(
      "SELECT nusisgrupa, nusistippa, nusisvalpa FROM nusispar WHERE nusisgrupa = 'wsbeneftk' ORDER BY nusistippa"
    );
    
    console.log('\nParámetros en BD:');
    console.table(result.rows);
    
    // Construir URL esperada
    const params = {};
    result.rows.forEach(row => {
      params[row.nusistippa.trim()] = row.nusisvalpa.trim();
    });
    
    const protocol = params.Secure === '1' ? 'https' : 'http';
    const expectedUrl = `${protocol}://${params.Host}:${params.Port}${params.BaseUrl}${params.Servicio}`;
    
    console.log('\nURL esperada construida desde BD:');
    console.log(expectedUrl);
    
    console.log('\nComponentes:');
    console.log('  Protocol:', protocol);
    console.log('  Host:', params.Host);
    console.log('  Port:', params.Port);
    console.log('  BaseUrl:', params.BaseUrl);
    console.log('  Servicio:', params.Servicio);
    console.log('  USUARIO:', params.USUARIO);
    console.log('  PASSWORD:', params.PASSWORD);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

run();
'@

$tempFile = ".\test_params_temp.js"
$tempJs | Out-File -FilePath $tempFile -Encoding UTF8

try {
  node $tempFile
} finally {
  Remove-Item $tempFile -ErrorAction SilentlyContinue
}

# 2. Test de endpoint del backend
Write-Host "`n2. Verificando endpoint en uso por el backend..." -ForegroundColor Green

try {
  $response = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get
  Write-Host "Backend status: $($response.status)" -ForegroundColor Green
  Write-Host "SOAP connected: $($response.soapConnected)" -ForegroundColor Green
} catch {
  Write-Host "Error consultando /health: $_" -ForegroundColor Red
  exit 1
}

Write-Host "`nTest completado" -ForegroundColor Green
Write-Host "Verifica los logs del backend para confirmar que muestra la URL:" -ForegroundColor Yellow
Write-Host "https://test17.osep.gob.ar:443/OSEP_BENEF17_TEST_WS/com.tekhne.abe_ws" -ForegroundColor Cyan
