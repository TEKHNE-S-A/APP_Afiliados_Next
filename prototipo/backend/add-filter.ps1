# Fix: Filtrar autorizaciones invalidas (AUSolId=0)

$file = "e:\MisProyectos\appmovil\APP_Afiliados\backend\server-soap.js"
$content = Get-Content $file -Raw -Encoding UTF8

# Buscar y reemplazar el bloque completo
$oldPattern = 'console\.log\(`✅ \$\{autorizaciones\.length\} autorizaciones obtenidas desde SIA`\)'

$replacement = @'
    // Filtrar objetos invalidos: AUSolId === 0 o con mensajes de error
    autorizaciones = autorizaciones.filter(auth => {
      // Filtrar si tiene AUSolId === 0 (respuesta de "no encontrado")
      if (auth.AUSolId === 0 || auth.AUSolicId === 0) {
        console.log('   ⚠️  Autorizacion con ID 0 ignorada (no valida)')
        return false
      }
      // Filtrar si tiene mensajes de error
      if (auth.Mensajes && Array.isArray(auth.Mensajes) && auth.Mensajes.length > 0) {
        const tieneError = auth.Mensajes.some(m => m.Type === 1 || m.Description?.includes('No se encontro'))
        if (tieneError) {
          console.log('   ⚠️  Autorizacion con mensaje de error ignorada:', auth.Mensajes[0].Description)
          return false
        }
      }
      return true
    })
    
    console.log(`✅ ${autorizaciones.length} autorizaciones validas obtenidas desde SIA`)
'@

if ($content -match $oldPattern) {
    $content = $content -replace $oldPattern, $replacement
    Set-Content -Path $file -Value $content -Encoding UTF8 -NoNewline
    Write-Host "✅ Filtro agregado correctamente" -ForegroundColor Green
} else {
    Write-Host "❌ No se encontró el patrón" -ForegroundColor Red
}
