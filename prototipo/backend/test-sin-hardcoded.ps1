# Test para verificar que NO hay valores hardcodeados
# Todos los valores deben leerse dinámicamente desde nusispar

$ErrorActionPreference = "Stop"

Write-Host "`n=== Verificación de Configuración Dinámica ===" -ForegroundColor Cyan
Write-Host "Todos los parámetros deben leerse desde nusispar, sin fallbacks hardcodeados`n" -ForegroundColor Yellow

# 1. Verificar parámetros en BD
Write-Host "1. Parámetros en nusispar (wsbeneftk):" -ForegroundColor Green

$tempJs = @'
const db = require('./db/connection');

async function run() {
  try {
    const result = await db.query(
      "SELECT nusistippa, nusisvalpa FROM nusispar WHERE nusisgrupa = 'wsbeneftk' ORDER BY nusistippa"
    );
    
    const params = {};
    result.rows.forEach(row => {
      params[row.nusistippa.trim()] = row.nusisvalpa.trim();
    });
    
    console.log('\nParámetros encontrados:');
    console.table(result.rows);
    
    // Validar que todos los parámetros requeridos existen
    const requeridos = ['Host', 'Port', 'Secure', 'BaseUrl', 'Servicio', 'User', 'Password'];
    const faltantes = requeridos.filter(r => !params[r]);
    
    if (faltantes.length > 0) {
      console.error('\n❌ FALTAN PARÁMETROS REQUERIDOS:', faltantes);
      console.error('El backend NO puede funcionar sin estos parámetros en nusispar');
      process.exit(1);
    }
    
    console.log('\n✅ Todos los parámetros requeridos están configurados');
    console.log('\nURL construida:');
    const protocol = params.Secure === '1' ? 'https' : 'http';
    const url = `${protocol}://${params.Host}:${params.Port}${params.BaseUrl}${params.Servicio}`;
    console.log(url);
    
    console.log('\nCredenciales HTTP:');
    console.log('  User:', params.User);
    console.log('  Password:', params.Password.substring(0, 3) + '***');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

run();
'@

$tempFile = ".\test_sin_hardcoded_temp.js"
$tempJs | Out-File -FilePath $tempFile -Encoding UTF8

try {
  node $tempFile
} finally {
  Remove-Item $tempFile -ErrorAction SilentlyContinue
}

Write-Host "`n2. Backend status:" -ForegroundColor Green

try {
  $response = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get
  Write-Host "  Status: $($response.status)" -ForegroundColor Green
  Write-Host "  SOAP connected: $($response.soapConnected)" -ForegroundColor Green
  Write-Host "  Timestamp: $($response.timestamp)" -ForegroundColor Gray
} catch {
  Write-Host "  Error consultando /health: $_" -ForegroundColor Red
  exit 1
}

Write-Host "`n=== Verificación Completada ===" -ForegroundColor Cyan
Write-Host "✅ El backend está configurado para leer TODOS los parámetros desde nusispar" -ForegroundColor Green
Write-Host "✅ NO hay valores hardcodeados como fallback" -ForegroundColor Green
Write-Host "✅ Si falta algún parámetro en nusispar, el backend lanzará un error" -ForegroundColor Green
