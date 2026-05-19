param(
    [Parameter(Mandatory=$true)]
    [string]$XpzPath
)

try {
    if (-not (Test-Path $XpzPath)) { throw "XPZ file not found: $XpzPath" }
    # Extract to temp folder to validate structure
    $tempDir = Join-Path -Path (Split-Path $XpzPath -Parent) -ChildPath ("validate_" + [System.Guid]::NewGuid().ToString())
    New-Item -ItemType Directory -Path $tempDir | Out-Null
    $tempZip = Join-Path -Path $tempDir -ChildPath "tmp.zip"
    Copy-Item -Path $XpzPath -Destination $tempZip -Force
    Expand-Archive -Path $tempZip -DestinationPath $tempDir -Force

    # Check for common Genexus artifacts
    $hasGxw = Get-ChildItem -Path $tempDir -Recurse -Filter "*.gxw" -ErrorAction SilentlyContinue
    $hasObjects = Test-Path (Join-Path $tempDir 'objects')
    $hasKb = Get-ChildItem -Path $tempDir -Recurse -Include "*.kb" -ErrorAction SilentlyContinue

    if ($hasGxw -or $hasObjects -or $hasKb) {
        Write-Output "Validation passed: Found Genexus artifacts"
        Remove-Item -Path $tempDir -Recurse -Force
        exit 0
    } else {
        Write-Error "Validation failed: Genexus artifacts not found"
        Remove-Item -Path $tempDir -Recurse -Force
        exit 3
    }
} catch {
    Write-Error $_.Exception.Message
    exit 2
}
