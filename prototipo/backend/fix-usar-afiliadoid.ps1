# Fix: Usar afiliadoId en lugar de nuusuid para REC_SOLICITUDES_APP

$file = "e:\MisProyectos\appmovil\APP_Afiliados\backend\server-soap.js"
$lines = Get-Content $file -Encoding UTF8

# Buscar la linea con "AUSolIdExt: nuusuid"
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match 'AUSolIdExt: nuusuid' -and $i -gt 3800 -and $i -lt 3850) {
        Write-Host "Encontrado en linea $($i+1): $($lines[$i])" -ForegroundColor Cyan
        
        # Agregar linea para obtener afiliadoId
        $insertLineNum = $i - 6  # Despues de "const nuusuid"
        Write-Host "Insertando obtencion de afiliadoId en linea $($insertLineNum+1)" -ForegroundColor Yellow
        
        # Insertar nueva linea
        $newLine = '    const afiliadoId = req.session.afiliadoId'
        $lines = $lines[0..($insertLineNum)] + $newLine + $lines[($insertLineNum+1)..($lines.Count-1)]
        
        # Cambiar AUSolIdExt
        $i = $i + 1  # Ajustar indice despues de insercion
        $lines[$i] = $lines[$i] -replace 'AUSolIdExt: nuusuid', 'AUSolIdExt: afiliadoId || nuusuid'
        Write-Host "Cambiado en linea $($i+1): $($lines[$i])" -ForegroundColor Green
        
        # Agregar log de afiliadoId
        for ($j = $i-10; $j -lt $i; $j++) {
            if ($lines[$j] -match "console\.log\('   Usuario \(nuusuid\)") {
                $lines = $lines[0..$j] + "    console.log('   AfiliadoId:', afiliadoId)" + $lines[($j+1)..($lines.Count-1)]
                Write-Host "Log agregado en linea $($j+2)" -ForegroundColor Green
                break
            }
        }
        
        break
    }
}

Set-Content -Path $file -Value $lines -Encoding UTF8
Write-Host "" -ForegroundColor Green
Write-Host "✅ Archivo modificado: Ahora usa afiliadoId en REC_SOLICITUDES_APP" -ForegroundColor Green
