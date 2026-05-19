param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('avd', 'phone')]
  [string]$Profile
)

$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot
$source = Join-Path $root ('.env.' + $Profile)
$target = Join-Path $root '.env'

if (-not (Test-Path $source)) {
  throw "No existe el perfil: $source"
}

Copy-Item -Path $source -Destination $target -Force
Write-Host "Perfil aplicado: $Profile" -ForegroundColor Green
Write-Host "Archivo actualizado: $target"
Write-Host "Siguiente paso: recompilar/reiniciar app para tomar cambios." -ForegroundColor Yellow
