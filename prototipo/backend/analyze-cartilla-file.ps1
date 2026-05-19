# Analizar archivo de cartilla sin importar
# Modo DRY RUN para validacion previa

param(
    [string]$FilePath = "E:\MisProyectos\ophtha-antifraud-platform\src\cartilla\7900_CARTILLA_PRESTADORES.txt",
    [int]$MaxLineas = 10
)

Write-Host "`n===== ANALISIS DE ARCHIVO CARTILLA (DRY RUN) =====" -ForegroundColor Cyan
Write-Host "Archivo: $FilePath`n" -ForegroundColor White

# Verificar archivo
if (-not (Test-Path $FilePath)) {
    Write-Host "ERROR: Archivo no encontrado" -ForegroundColor Red
    exit 1
}

# Contar total de lineas
Write-Host "Contando lineas..." -ForegroundColor Yellow
$totalLineas = (Get-Content $FilePath | Measure-Object -Line).Lines
Write-Host "Total de lineas (entidades): $totalLineas`n" -ForegroundColor Green

# Leer y parsear primeras N lineas
Write-Host "Analizando primeras $MaxLineas entidades...`n" -ForegroundColor Yellow

$lineas = Get-Content $FilePath -First $MaxLineas

$contadorRubros = @{}
$contadorMovimientos = @{}
$entidadesEjemplo = @()

foreach ($linea in $lineas) {
    try {
        # Limpiar JSON (dobles comillas escapadas)
        $cleanJson = $linea -replace '""', '"'
        $cleanJson = $cleanJson.TrimStart('"').TrimEnd('"')
        
        # Parsear JSON
        $entidad = $cleanJson | ConvertFrom-Json
        
        # Contar movimientos
        $mov = $entidad.IdMovimiento
        if (-not $contadorMovimientos.ContainsKey($mov)) {
            $contadorMovimientos[$mov] = 0
        }
        $contadorMovimientos[$mov]++
        
        # Contar rubros
        foreach ($plan in $entidad.EntidadPlanes) {
            foreach ($rubro in $plan.PlanRubros) {
                $rubroDesc = $rubro.RubroDescripcion
                if (-not $contadorRubros.ContainsKey($rubroDesc)) {
                    $contadorRubros[$rubroDesc] = 0
                }
                $contadorRubros[$rubroDesc]++
            }
        }
        
        # Guardar ejemplo
        if ($entidadesEjemplo.Count -lt 3) {
            $ejemplo = @{
                Id = $entidad.EntidadId
                Nombre = $entidad.EntidadNombre
                Movimiento = $entidad.IdMovimiento
                Email = $entidad.EntidadEmail
                Web = $entidad.EntidadWeb
                Direcciones = $entidad.EntidadDirecciones.Count
                Planes = $entidad.EntidadPlanes.Count
            }
            $entidadesEjemplo += $ejemplo
        }
        
    } catch {
        Write-Host "Error parseando linea: $_" -ForegroundColor Red
    }
}

Write-Host "=== ESTADISTICAS ===" -ForegroundColor Cyan
Write-Host "Total lineas: $totalLineas" -ForegroundColor White
Write-Host "`nMovimientos:" -ForegroundColor Yellow
$contadorMovimientos.GetEnumerator() | Sort-Object Name | ForEach-Object {
    $tipo = switch ($_.Key) {
        'A' { 'Alta' }
        'B' { 'Baja' }
        'M' { 'Modificacion' }
        default { $_.Key }
    }
    Write-Host "  $tipo ($($_.Key)): $($_.Value)" -ForegroundColor White
}

Write-Host "`nRubros:" -ForegroundColor Yellow
$contadorRubros.GetEnumerator() | Sort-Object Value -Descending | ForEach-Object {
    Write-Host "  $($_.Key): $($_.Value)" -ForegroundColor White
}

Write-Host "`n=== EJEMPLOS DE ENTIDADES ===" -ForegroundColor Cyan
$entidadesEjemplo | ForEach-Object {
    Write-Host "`nEntidad: $($_.Id)" -ForegroundColor Green
    Write-Host "  Nombre: $($_.Nombre)" -ForegroundColor White
    Write-Host "  Movimiento: $($_.Movimiento)" -ForegroundColor White
    Write-Host "  Email: $($_.Email)" -ForegroundColor White
    Write-Host "  Web: $($_.Web)" -ForegroundColor White
    Write-Host "  Direcciones: $($_.Direcciones)" -ForegroundColor White
    Write-Host "  Planes: $($_.Planes)" -ForegroundColor White
}

Write-Host "`n=== CAMPOS A MAPEAR ===" -ForegroundColor Cyan
Write-Host "EntidadId -> caentida.caentid (VARCHAR 10)" -ForegroundColor White
Write-Host "EntidadNombre -> caentida.caentnomb (VARCHAR 100)" -ForegroundColor White
Write-Host "EntidadEmail -> caentida.caentemail (VARCHAR 100)" -ForegroundColor White
Write-Host "EntidadWeb -> caentida.caentweb (VARCHAR 200)" -ForegroundColor White
Write-Host "EntidadPrioridad -> caentida.caentprior (INTEGER)" -ForegroundColor White
Write-Host "DireccionId -> caendire.caendid (VARCHAR 10)" -ForegroundColor White
Write-Host "Direccion -> caendire.caendirecc (VARCHAR 100)" -ForegroundColor White
Write-Host "LocalidadId -> caendire.caloid (VARCHAR 5)" -ForegroundColor White
Write-Host "TelefonoId -> caentele.caentelid (VARCHAR 12)" -ForegroundColor White
Write-Host "Telefono -> caentele.caentelefon (VARCHAR 50)" -ForegroundColor White
Write-Host "RubroId -> carubro.carubrubid (VARCHAR 9)" -ForegroundColor White
Write-Host "RubroDescripcion -> carubro.carubdescrip (VARCHAR 50)" -ForegroundColor White
Write-Host "EspecialidadId -> caespeci.caesid (VARCHAR 3)" -ForegroundColor White
Write-Host "EspecialidadDescripcion -> caespeci.caesdescrip (VARCHAR 50)" -ForegroundColor White

Write-Host "`n=== RECOMENDACION ===" -ForegroundColor Yellow
Write-Host "1. Aplicar migracion GEO: .\backend\db\apply-cartillas-geo-migration.ps1" -ForegroundColor White
Write-Host "2. Ejecutar importacion en modo DRY RUN: .\backend\import-cartilla-external.ps1 -DryRun" -ForegroundColor White
Write-Host "3. Ejecutar importacion real: .\backend\import-cartilla-external.ps1" -ForegroundColor White

Write-Host "`n===== FIN ANALISIS =====`n" -ForegroundColor Cyan
