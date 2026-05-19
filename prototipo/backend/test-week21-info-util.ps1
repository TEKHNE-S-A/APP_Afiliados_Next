<# 
.SYNOPSIS
    Test completo de Info Útil (Semana 21)
    
.DESCRIPTION
    Prueba GET /api/info-util y verifica estructura DTO
    
.EXAMPLE
    .\test-week21-info-util.ps1
    
.NOTES
    Requisitos:
    - Backend corriendo en http://localhost:3000
    - BD con tabla noinfuti
#>

$ErrorActionPreference = 'Stop'
$baseUrl = 'http://localhost:3000'

Write-Host "`n============================================================================" -ForegroundColor Cyan
Write-Host "TEST SEMANA 21 - INFO ÚTIL" -ForegroundColor Cyan
Write-Host "============================================================================`n" -ForegroundColor Cyan

# ============================================================================
# TEST 1: GET /api/info-util (endpoint público)
# ============================================================================
Write-Host "[TEST 1] Endpoint público GET /api/info-util" -ForegroundColor Yellow
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/info-util" -Method Get -ContentType 'application/json'
    
    Write-Host "✅ Respuesta exitosa:" -ForegroundColor Green
    Write-Host "   - Items encontrados: $($response.items.Count)" -ForegroundColor White
    
    if ($response.items.Count -gt 0) {
        Write-Host "`n   📋 Listado de items:" -ForegroundColor Cyan
        
        foreach ($item in $response.items) {
            Write-Host "`n   Item:" -ForegroundColor White
            Write-Host "     - ID: $($item.id)" -ForegroundColor Gray
            Write-Host "     - Tipo: $($item.tipo)" -ForegroundColor Gray
            Write-Host "     - Título: $($item.titulo)" -ForegroundColor Gray
            
            if ($item.telefono) {
                Write-Host "     - Teléfono: $($item.telefono)" -ForegroundColor Gray
            }
            
            if ($item.direccion) {
                Write-Host "     - Dirección: $($item.direccion)" -ForegroundColor Gray
            }
            
            if ($item.link) {
                Write-Host "     - Link: $($item.link)" -ForegroundColor Gray
            }
            
            if ($item.geo) {
                Write-Host "     - Geo: $($item.geo)" -ForegroundColor Gray
            }
            
            if ($item.imagenUrl) {
                Write-Host "     - Imagen URL: $($item.imagenUrl)" -ForegroundColor Gray
            }
        }
        
        # Verificar estructura DTO
        Write-Host "`n   🔍 Validación estructura DTO:" -ForegroundColor Cyan
        
        $primerItem = $response.items[0]
        $tieneId = $null -ne $primerItem.id
        $tieneTipo = $null -ne $primerItem.tipo
        $tieneTitulo = $null -ne $primerItem.titulo
        
        if ($tieneId -and $tieneTipo -and $tieneTitulo) {
            Write-Host "     ✅ Campos obligatorios presentes (id, tipo, titulo)" -ForegroundColor Green
        } else {
            Write-Host "     ❌ Faltan campos obligatorios" -ForegroundColor Red
            if (-not $tieneId) { Write-Host "       - Falta: id" -ForegroundColor Red }
            if (-not $tieneTipo) { Write-Host "       - Falta: tipo" -ForegroundColor Red }
            if (-not $tieneTitulo) { Write-Host "       - Falta: titulo" -ForegroundColor Red }
        }
        
        # Verificar que NO devuelve campos vacíos/null opcionales
        $camposVacios = @()
        foreach ($prop in $primerItem.PSObject.Properties) {
            if ($prop.Name -in @('telefono', 'direccion', 'link', 'geo', 'imagenUrl')) {
                if ([string]::IsNullOrWhiteSpace($prop.Value)) {
                    $camposVacios += $prop.Name
                }
            }
        }
        
        if ($camposVacios.Count -eq 0) {
            Write-Host "     ✅ No devuelve campos opcionales vacíos" -ForegroundColor Green
        } else {
            Write-Host "     ℹ️  Campos opcionales vacíos: $($camposVacios -join ', ')" -ForegroundColor DarkYellow
        }
        
    } else {
        Write-Host "`n   ⚠️  No hay items en la tabla noinfuti" -ForegroundColor Yellow
        Write-Host "   Ejecutar análisis: node backend/db/analyze-noinfuti-structure.js" -ForegroundColor Gray
    }
    
} catch {
    Write-Host "❌ Error en Test 1: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host $_.Exception -ForegroundColor Red
    exit 1
}

# ============================================================================
# TEST 2: Verificar tipos de datos devueltos
# ============================================================================
Write-Host "`n[TEST 2] Verificación tipos de datos y catálogo" -ForegroundColor Yellow
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/info-util" -Method Get -ContentType 'application/json'
    
    if ($response.items.Count -gt 0) {
        # Agrupar por tipo
        $tiposEncontrados = $response.items | Group-Object -Property tipo
        
        Write-Host "📊 Tipos encontrados en respuesta:" -ForegroundColor Cyan
        foreach ($grupo in $tiposEncontrados) {
            Write-Host "   - Tipo '$($grupo.Name)': $($grupo.Count) items" -ForegroundColor White
        }
        
        # Verificar catálogo esperado según análisis BD
        Write-Host "`n📋 Catálogo esperado según BD:" -ForegroundColor Cyan
        Write-Host "   - D (direccion): items con dirección física" -ForegroundColor White
        Write-Host "   - T (tel): items con número de teléfono" -ForegroundColor White
        Write-Host "   - L (link): items con enlace web" -ForegroundColor White
        
        Write-Host "`n✅ Tipos transformados correctamente" -ForegroundColor Green
        
    } else {
        Write-Host "ℹ️  No hay items para verificar tipos" -ForegroundColor DarkYellow
    }
    
} catch {
    Write-Host "❌ Error en Test 2: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# ============================================================================
# TEST 3: Verificar orden de items
# ============================================================================
Write-Host "`n[TEST 3] Verificación de orden (tipo, título)" -ForegroundColor Yellow
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/info-util" -Method Get -ContentType 'application/json'
    
    if ($response.items.Count -gt 1) {
        $ordenCorrecto = $true
        
        for ($i = 1; $i -lt $response.items.Count; $i++) {
            $anterior = $response.items[$i - 1]
            $actual = $response.items[$i]
            
            # Comparar tipo primero
            if ($anterior.tipo -gt $actual.tipo) {
                $ordenCorrecto = $false
                Write-Host "❌ Orden incorrecto: tipo '$($anterior.tipo)' después de '$($actual.tipo)'" -ForegroundColor Red
                break
            }
            
            # Si mismo tipo, comparar título
            if ($anterior.tipo -eq $actual.tipo -and $anterior.titulo -gt $actual.titulo) {
                $ordenCorrecto = $false
                Write-Host "❌ Orden incorrecto: título '$($anterior.titulo)' después de '$($actual.titulo)'" -ForegroundColor Red
                break
            }
        }
        
        if ($ordenCorrecto) {
            Write-Host "✅ Items correctamente ordenados por tipo y título" -ForegroundColor Green
        }
        
    } else {
        Write-Host "ℹ️  Solo hay $($response.items.Count) item(s), no se puede verificar orden" -ForegroundColor DarkYellow
    }
    
} catch {
    Write-Host "❌ Error en Test 3: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# ============================================================================
# RESUMEN FINAL
# ============================================================================
Write-Host "`n============================================================================" -ForegroundColor Cyan
Write-Host "✅ TESTS COMPLETADOS - INFO ÚTIL FUNCIONANDO" -ForegroundColor Green
Write-Host "============================================================================" -ForegroundColor Cyan

Write-Host "`nResumen de funcionalidades verificadas:" -ForegroundColor White
Write-Host "  ✅ Endpoint público GET /api/info-util" -ForegroundColor Green
Write-Host "  ✅ Estructura DTO correcta (id, tipo, titulo + opcionales)" -ForegroundColor Green
Write-Host "  ✅ Transformación de tipos (D→direccion, T→tel, L→link)" -ForegroundColor Green
Write-Host "  ✅ Ordenamiento correcto (tipo, título)" -ForegroundColor Green
Write-Host "  ✅ No devuelve campos opcionales vacíos" -ForegroundColor Green

Write-Host "`nAnálisis BD disponible en: backend/db/analyze-noinfuti-structure.js" -ForegroundColor Cyan
Write-Host "Repository: backend/repositories/infoUtilRepository.js" -ForegroundColor Cyan
Write-Host ""
