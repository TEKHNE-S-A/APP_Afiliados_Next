# Test de importación con muestra pequeña
# Copia las primeras 100 líneas del archivo original

param(
    [int]$NumLineas = 100
)

$archivoOriginal = "E:\MisProyectos\ophtha-antifraud-platform\src\cartilla\7900_CARTILLA_PRESTADORES.txt"
$archivoTest = "E:\MisProyectos\appmovil\APP_Afiliados\backend\data\cartilla_test_sample.jsonl"

# Crear directorio si no existe
New-Item -ItemType Directory -Force -Path (Split-Path $archivoTest) | Out-Null

Write-Host "`n===== CREANDO MUESTRA DE TEST =====" -ForegroundColor Cyan
Write-Host "Origen: $archivoOriginal" -ForegroundColor White
Write-Host "Destino: $archivoTest" -ForegroundColor White
Write-Host "Lineas: $NumLineas`n" -ForegroundColor White

# Copiar N líneas
Get-Content $archivoOriginal -First $NumLineas | Set-Content $archivoTest -Encoding UTF8

Write-Host "Muestra creada exitosamente!`n" -ForegroundColor Green

# Ejecutar importación DRY RUN
Write-Host "Ejecutando importacion en modo DRY RUN...`n" -ForegroundColor Yellow
& ".\import-cartilla-external.ps1" -FilePath $archivoTest -DryRun -BatchSize 50

Write-Host "`n===== TEST COMPLETADO =====`n" -ForegroundColor Cyan
