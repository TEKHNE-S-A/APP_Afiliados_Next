param(
    [Parameter(Mandatory=$true)]
    [string]$XmlPath
)

if (-not (Test-Path $XmlPath)) { Write-Error "File not found: $XmlPath"; exit 2 }

$patterns = @('transaction','webpanel','object','procedure','report','menu','panel','data','attribute')

$results = @{}
foreach ($p in $patterns) { $results[$p] = New-Object System.Collections.Generic.HashSet[string] }

Write-Output "Scanning XML (this may take a moment)..."

$reader = [System.IO.File]::OpenText($XmlPath)
try {
    while (-not $reader.EndOfStream) {
        $line = $reader.ReadLine()
        foreach ($tag in $patterns) {
            if ($line -match "<${tag}\b") {
                # Try double-quoted attribute first
                $m = [regex]::Match($line, '(?:name|id)\s*=\s*"([^"]+)"')
                if ($m.Success) { $val = $m.Groups[1].Value.Trim(); if (-not [string]::IsNullOrEmpty($val)) { $null = $results[$tag].Add($val) } }
                else {
                    # try single-quoted
                    $m2 = [regex]::Match($line, "(?:name|id)\s*=\s*'([^']+)'")
                    if ($m2.Success) { $val = $m2.Groups[1].Value.Trim(); if (-not [string]::IsNullOrEmpty($val)) { $null = $results[$tag].Add($val) } }
                }
            }
        }
    }
} finally {
    $reader.Close()
}

Write-Output "`n=== Summary ==="
foreach ($tag in $patterns) {
    $count = $results[$tag].Count
    Write-Output "${tag}: $count"
    if ($count -gt 0) {
        $sample = $results[$tag] | Select-Object -First 30
        Write-Output " Sample (${tag}) (first ${($sample.Count)}):"
        foreach ($s in $sample) { Write-Output "  - $s" }
    }
    Write-Output ""
}

Write-Output "Done. You can open build\xpz_extracted\PRODUCTO_APP_SHEMA_DESA1.xml for full details."

# Export results to JSON and CSV in build/ (one level above xpz_extracted)
$buildDir = Split-Path $XmlPath -Parent
$rootBuild = Split-Path $buildDir -Parent
$outJson = Join-Path $rootBuild 'xpz_inventory.json'
$outCsv = Join-Path $rootBuild 'xpz_inventory.csv'

# Prepare export object
$export = @{ counts = @{}; items = @{} }
foreach ($tag in $patterns) {
    $export.counts[$tag] = $results[$tag].Count
    $export.items[$tag] = @($results[$tag])
}

try {
    $export | ConvertTo-Json -Depth 5 | Out-File -FilePath $outJson -Encoding utf8
    # CSV: rows type,id
    $rows = @()
    foreach ($tag in $patterns) {
        foreach ($id in $results[$tag]) {
            $rows += [PSCustomObject]@{ type = $tag; id = $id }
        }
    }
    $rows | Export-Csv -Path $outCsv -NoTypeInformation -Encoding UTF8
    Write-Output "\nExported inventory to: $outJson and $outCsv"
} catch {
    Write-Error "Failed to write export files: $_"
}
