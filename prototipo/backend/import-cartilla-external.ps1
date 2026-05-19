# Script para importar cartilla desde archivo externo
# Ubicacion: backend/import-cartilla-external.ps1

param(
    [string]$FilePath = "E:\MisProyectos\ophtha-antifraud-platform\src\cartilla\7900_CARTILLA_PRESTADORES.txt",
    [switch]$DryRun = $false,
    [int]$BatchSize = 100
)

Write-Host "`n===== IMPORTACION DE CARTILLA DESDE ARCHIVO EXTERNO =====" -ForegroundColor Cyan
Write-Host "Archivo: $FilePath" -ForegroundColor White
Write-Host "Modo: $(if ($DryRun) { 'DRY RUN (sin guardar)' } else { 'PRODUCCION' })" -ForegroundColor $(if ($DryRun) { 'Yellow' } else { 'Green' })
Write-Host "Batch size: $BatchSize`n" -ForegroundColor White

# Verificar que el archivo existe
if (-not (Test-Path $FilePath)) {
    Write-Host "ERROR: Archivo no encontrado: $FilePath" -ForegroundColor Red
    exit 1
}

# Directorio del script
$scriptDir = $PSScriptRoot

# Script Node.js temporal
$jsScript = @"
const { importCartillaFromFile } = require('./services/cartillaImportService');

const filePath = process.argv[2];
const dryRun = process.argv[3] === 'true';
const batchSize = parseInt(process.argv[4]) || 100;

async function main() {
  try {
    const result = await importCartillaFromFile(filePath, { dryRun, batchSize });
    
    if (!result.success) {
      process.exit(1);
    }
    
    console.log('\n=== RESUMEN FINAL ===');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('\nERROR FATAL:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
"@

$tempJs = Join-Path $scriptDir "temp-import-cartilla.js"
$jsScript | Out-File -FilePath $tempJs -Encoding UTF8

try {
    # Ejecutar importacion
    Write-Host "Ejecutando importacion..." -ForegroundColor Cyan
    node $tempJs $FilePath $DryRun.IsPresent $BatchSize
    
    $exitCode = $LASTEXITCODE
    
    if ($exitCode -eq 0) {
        Write-Host "`nImportacion completada exitosamente!" -ForegroundColor Green
    } else {
        Write-Host "`nImportacion finalizo con errores (codigo: $exitCode)" -ForegroundColor Red
    }
    
} finally {
    # Limpiar archivo temporal
    if (Test-Path $tempJs) {
        Remove-Item $tempJs -Force
    }
}

Write-Host "`n===== FIN IMPORTACION =====`n" -ForegroundColor Cyan
