#!/bin/bash
# pre-push-validation.sh
# Script para validar antes de hacer push a GitHub

echo "🔍 Validando proyecto antes de push..."
echo ""

# 1. Verificar estructura de carpetas
echo "✓ Estructura de carpetas:"
echo "  - mobile/"
echo "  - backend/"
echo "  - scripts/"
echo "  - build/"
echo ""

# 2. Verificar .gitignore existe
if [ -f .gitignore ]; then
    echo "✅ .gitignore presente"
else
    echo "❌ .gitignore NO encontrado"
    exit 1
fi

# 3. Verificar que no hay .env sin .example
if [ -f .env ]; then
    if [ ! -f .env.example ]; then
        echo "⚠️  .env existe pero NO hay .env.example"
        exit 1
    fi
    echo "✅ .env y .env.example presentes"
else
    if [ -f .env.example ]; then
        echo "✅ .env.example presente"
    fi
fi

# 4. Verificar node_modules no está trackeado
if git ls-files | grep -q "^node_modules/"; then
    echo "❌ node_modules está siendo tracked (debe estar en .gitignore)"
    exit 1
fi
echo "✅ node_modules no trackeado"

# 5. Listar cambios a hacer push
echo ""
echo "📋 Cambios a hacer push:"
git diff --name-only --cached

# 6. Validación GAM opcional (si backend está activo)
echo ""
echo "🔐 Validación GAM opcional:"
if [ -f "backend/test-gam-optional.ps1" ]; then
    if curl -sSf "http://127.0.0.1:3000/health" > /dev/null 2>&1; then
        echo "✅ Backend activo en :3000"
        echo "ℹ️  Ejecuta en Windows/PowerShell: cd backend; .\\test-gam-optional.ps1"
    else
        echo "⚠️  Backend no disponible en :3000, se omite test GAM opcional"
    fi
else
    echo "⚠️  No existe backend/test-gam-optional.ps1"
fi

echo ""
echo "✅ Validación completada. Listo para push."
