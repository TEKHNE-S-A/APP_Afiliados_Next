# pre-push-validation.ps1
# Script para validar antes de hacer push a GitHub

param(
    [switch]$StrictIntegration
)

Write-Host "Validando proyecto antes de push..." -ForegroundColor Cyan
Write-Host ""

$isValid = $true

# 1. Verificar estructura
Write-Host "Estructura de carpetas esperada:" -ForegroundColor Green
@("mobile", "backend", "scripts", "build") | ForEach-Object {
    if (Test-Path $_) {
        Write-Host "  [OK] $_" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] $_ NO ENCONTRADO" -ForegroundColor Red
        $isValid = $false
    }
}
Write-Host ""

# 2. Verificar .gitignore
if (Test-Path .gitignore) {
    Write-Host "[OK] .gitignore presente" -ForegroundColor Green
} else {
    Write-Host "[ERROR] .gitignore NO encontrado" -ForegroundColor Red
    $isValid = $false
}

# 3. Verificar .env.example
if (Test-Path .env.example) {
    Write-Host "[OK] .env.example presente" -ForegroundColor Green
}

if (Test-Path .env) {
    Write-Host "[AVISO] .env presente (debe estar en .gitignore)" -ForegroundColor Yellow
}
Write-Host ""

# 4. Verificar archivos importantes
$requiredFiles = @(
    "README.md",
    "CONTRIBUTING.md",
    "LICENSE",
    "SECURITY.md",
    ".gitattributes"
)

Write-Host "Archivos requeridos:" -ForegroundColor Cyan
$requiredFiles | ForEach-Object {
    if (Test-Path $_) {
        Write-Host "  [OK] $_" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] $_ NO ENCONTRADO" -ForegroundColor Red
        $isValid = $false
    }
}

Write-Host ""

# 5. Verificar git
Write-Host "Estado de Git:" -ForegroundColor Cyan
$gitCheck = git rev-parse --git-dir 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Git repository encontrado" -ForegroundColor Green
    git status --short
} else {
    Write-Host "  [AVISO] No es un git repository aun" -ForegroundColor Yellow
    Write-Host "  Ejecuta primero: git init" -ForegroundColor Yellow
}

Write-Host ""

# 6. Validar GAM opcional (si backend esta disponible)
Write-Host "Validación de integración GAM opcional:" -ForegroundColor Cyan
$gamTestScript = "backend\test-gam-optional.ps1"

if (Test-Path $gamTestScript) {
    try {
        $health = Invoke-WebRequest -Uri "http://127.0.0.1:3000/health" -Method GET -UseBasicParsing -TimeoutSec 3
        if ($health.StatusCode -eq 200) {
            Write-Host "  [OK] Backend activo. Ejecutando test-gam-optional.ps1" -ForegroundColor Green
            Push-Location backend
            try {
                $psCommand = if (Get-Command powershell -ErrorAction SilentlyContinue) {
                    'powershell'
                } elseif (Get-Command pwsh -ErrorAction SilentlyContinue) {
                    'pwsh'
                } else {
                    throw 'No se encontró powershell ni pwsh para ejecutar test-gam-optional.ps1'
                }

                & $psCommand -NoProfile -ExecutionPolicy Bypass -File .\test-gam-optional.ps1
                if ($LASTEXITCODE -ne 0) {
                    Write-Host "  [ERROR] test-gam-optional.ps1 falló" -ForegroundColor Red
                    $isValid = $false
                } else {
                    Write-Host "  [OK] test-gam-optional.ps1" -ForegroundColor Green
                }
            } finally {
                Pop-Location
            }
        } else {
            throw "Backend no respondió 200"
        }
    } catch {
        $msg = "  [AVISO] Se omite test GAM opcional (backend no disponible en :3000)."
        if ($StrictIntegration) {
            Write-Host ($msg + " Use backend activo o quite -StrictIntegration.") -ForegroundColor Red
            $isValid = $false
        } else {
            Write-Host $msg -ForegroundColor Yellow
            Write-Host "          Para ejecutar manualmente: cd backend; .\test-gam-optional.ps1" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "  [AVISO] No existe backend\\test-gam-optional.ps1" -ForegroundColor Yellow
    if ($StrictIntegration) {
        $isValid = $false
    }
}

Write-Host ""

if ($isValid) {
    Write-Host "Validacion completada. Listo para push." -ForegroundColor Green
    exit 0
} else {
    Write-Host "Hay problemas. Corrígelos antes de hacer push." -ForegroundColor Red
    exit 1
}
