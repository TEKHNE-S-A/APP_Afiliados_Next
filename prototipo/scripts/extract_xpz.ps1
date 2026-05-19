param(
    [Parameter(Mandatory=$true)]
    [string]$XpzPath,
    [Parameter(Mandatory=$true)]
    [string]$OutDir
)

try {
    if (-not (Test-Path $XpzPath)) { throw "XPZ file not found: $XpzPath" }
    if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir -Force | Out-Null }

    # Copy and rename to .zip in a temp location
    $tempZip = Join-Path -Path (Split-Path $OutDir -Parent) -ChildPath ("temp_extract_" + [System.Guid]::NewGuid().ToString() + ".zip")
    Copy-Item -Path $XpzPath -Destination $tempZip -Force

    # Extract using Expand-Archive
    Expand-Archive -Path $tempZip -DestinationPath $OutDir -Force

    # Remove temp zip
    Remove-Item -Path $tempZip -Force

    Write-Output "Extracted to: $OutDir"
    exit 0
} catch {
    Write-Error $_.Exception.Message
    exit 2
}
