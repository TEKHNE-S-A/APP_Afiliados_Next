param(
    [Parameter(Mandatory=$true)]
    [string]$XpzPath
)

try {
    if (-not (Test-Path $XpzPath)) { throw "XPZ file not found: $XpzPath" }
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $base = [System.IO.Path]::GetFileNameWithoutExtension($XpzPath)
    $destDir = Join-Path -Path (Join-Path (Split-Path $XpzPath -Parent) '..' ) -ChildPath 'backups'
    if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir | Out-Null }
    $dest = Join-Path $destDir "$($base)_$timestamp.xpz"
    Copy-Item -Path $XpzPath -Destination $dest -Force
    Write-Output "Backup created: $dest"
    exit 0
} catch {
    Write-Error $_.Exception.Message
    exit 2
}
