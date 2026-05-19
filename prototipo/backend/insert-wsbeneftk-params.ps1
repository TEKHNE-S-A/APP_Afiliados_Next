# Script para insertar par�metros de endpoints SOAP en la BD
# Grupo: wsbeneftk (Web Services Beneficios Tekhne)

$ErrorActionPreference = "Stop"

$DBHost = "localhost"
$DBPort = "5432"
$DBName = "app_afiliados_genexus"
$DBUser = "postgres"
$DBPassword = "Ignacio00"

Write-Host "Insertando parametros wsbeneftk en la BD..." -ForegroundColor Cyan

# Establecer variable de entorno para password
$env:PGPASSWORD = $DBPassword

# Ruta al script SQL
$sqlFile = Join-Path $PSScriptRoot "db\insert_parametros_wsbeneftk.sql"

if (-not (Test-Path $sqlFile)) {
    Write-Host "No se encontro el archivo SQL: $sqlFile" -ForegroundColor Red
    exit 1
}

Write-Host "Ejecutando: $sqlFile" -ForegroundColor Yellow

# Crear script JS temporal directamente
$tempJs = Join-Path $PSScriptRoot "insert_wsbeneftk_temp.js"

$jsContent = @'
const db = require('./db/connection');

async function run() {
  try {
    await db.query("DELETE FROM nusispar WHERE nusisgrupa = 'wsbeneftk'");
    console.log('Parametros anteriores eliminados');
    
    // Insertar componentes de conexión
    const componentes = [
      { tipo: 'Host', valor: 'test17.osep.gob.ar' },
      { tipo: 'Port', valor: '443' },
      { tipo: 'Secure', valor: '1' },
      { tipo: 'BaseUrl', valor: '/OSEP_BENEF17_TEST_WS/' },
      { tipo: 'Servicio', valor: 'com.tekhne.abe_ws' },
      { tipo: 'User', valor: 'mariar' },
      { tipo: 'Password', valor: 'ignacio11' }
    ];
    
    for (const comp of componentes) {
      await db.query(
        "INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa) VALUES ('wsbeneftk', $1, $2)",
        [comp.tipo, comp.valor]
      );
      console.log('Insertado: ' + comp.tipo + ' = ' + comp.valor);
    }
    
    const result = await db.query(
      "SELECT nusisgrupa, nusistippa, nusisvalpa FROM nusispar WHERE nusisgrupa = 'wsbeneftk' ORDER BY nusistippa"
    );
    
    console.log('\nParametros insertados:');
    console.table(result.rows);
    
    if (result.rows.length === 7) {
      console.log('OK: 7 parametros encontrados (Host, Port, Secure, BaseUrl, Servicio, User, Password)');
    } else {
      console.error('ERROR: Se esperaban 7 parametros, encontrados:', result.rows.length);
      process.exit(1);
    }
    
    console.log('\nInsercion completada exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

run();
'@

$jsContent | Out-File -FilePath $tempJs -Encoding UTF8

try {
    # Ejecutar con Node.js
    Write-Host "Ejecutando insercion..." -ForegroundColor Green
    node $tempJs
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`nParametros wsbeneftk insertados correctamente" -ForegroundColor Green
        Write-Host "Reinicia el backend para que los cambios surtan efecto" -ForegroundColor Yellow
    } else {
        Write-Host "`nError en la insercion (codigo: $LASTEXITCODE)" -ForegroundColor Red
        exit $LASTEXITCODE
    }
} finally {
    # Limpiar archivo temporal
    if (Test-Path $tempJs) {
        Remove-Item $tempJs -Force
    }
}
