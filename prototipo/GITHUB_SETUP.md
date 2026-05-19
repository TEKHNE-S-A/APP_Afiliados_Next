# GitHub Setup Guide

Esta guía explica cómo preparar el proyecto APP_Afiliados para trabajar con GitHub.

## 🚀 Pasos Iniciales (Primera vez)

### 1. Verificar Git Instalado
```powershell
git --version
```

### 2. Configurar Git (si es primera vez)
```powershell
git config --global user.name "Tu Nombre"
git config --global user.email "tu@email.com"
```

### 3. Inicializar el Repositorio Local (si no está ya inicializado)
```powershell
cd e:\MisProyectos\appmovil\APP_Afiliados
git init
```

### 4. Añadir el Remote
```powershell
git remote add origin https://github.com/TEKHNE-S-A/appmovilrn.git
```

### 5. Verificar la Configuración
```powershell
git remote -v
# Debería mostrar:
# origin  https://github.com/TEKHNE-S-A/appmovilrn.git (fetch)
# origin  https://github.com/TEKHNE-S-A/appmovilrn.git (push)
```

## 📤 Push Inicial al Repositorio

### Opción A: Rama Main (Recomendado para Primera Sincronización)
```powershell
# 1. Stage todos los archivos
git add .

# 2. Commit inicial
git commit -m "Initial commit: APP Afiliados project structure"

# 3. Rename branch a main si aún no la tiene
git branch -M main

# 4. Push a GitHub
git push -u origin main
```

### Opción B: Si GitHub Tiene Contenido Previo
```powershell
# Traer archivos del remote primero
git pull origin main --allow-unrelated-histories

# Luego resolver conflictos si los hay
git add .
git commit -m "Merge remote changes"
git push -u origin main
```

## 🔐 Autenticación GitHub

### Opción 1: Token Personal (Recomendado)
1. Ve a https://github.com/settings/tokens
2. Generá un **Personal Access Token** (PAT) con permisos:
   - `repo` (acceso completo)
   - `workflow` (si usas CI/CD)
3. Copia el token
4. En PowerShell, cuando te pida contraseña:
   - Username: tu_usuario
   - Password: pega el token (se ve como `ghp_xxxxxxxxxxx`)

### Opción 2: SSH
```powershell
# Generar clave SSH
ssh-keygen -t ed25519 -C "tu@email.com"

# Agregar a ssh-agent
ssh-add "$env:USERPROFILE\.ssh\id_ed25519"

# Ver clave pública (cópiala)
Get-Content "$env:USERPROFILE\.ssh\id_ed25519.pub"
```

Luego ve a https://github.com/settings/ssh/new y pega la clave.

## 🔄 Flujo de Trabajo Diario

### Crear una Rama para tu Feature
```powershell
git checkout -b feat/nombre-de-feature
# o
git checkout -b fix/nombre-del-fix
```

### Hacer Cambios y Commits
```powershell
git add .
git commit -m "feat: descripción del cambio"
```

### Push a GitHub
```powershell
git push -u origin feat/nombre-de-feature
# O si ya existe:
git push
```

### Crear Pull Request
1. Ve a https://github.com/TEKHNE-S-A/appmovilrn
2. Click en "Compare & pull request"
3. Llena el template de PR
4. Submit

## 🛡️ Archivos Protegidos

Estos archivos **NO** deben commitearse (están en `.gitignore`):
- `.env` (variables de entorno sensibles)
- `node_modules/` (muy grande)
- `build/` generados por scripts
- `.vscode/` (configuración local)
- `backend/data/users.json` (datos de desarrollo)

## 📋 Checklist Pre-Push

```powershell
# 1. Actualizar rama
git pull

# 2. Ver cambios
git status

# 3. Revisar cambios línea por línea
git diff

# 4. Lint (desde mobile/)
cd mobile && npm run lint && cd ..

# 5. Si todo está bien, hacer commit
git add .
git commit -m "tipo: descripción"

# 6. Push
git push
```

## 🚨 Troubleshooting

### "fatal: Authentication failed"
```powershell
# Limpiar credenciales guardadas
git config --global --unset user.password
# Vuelve a intentar push, se pedirá autenticación
```

### "Your branch and 'origin/main' have diverged"
```powershell
git fetch origin
git rebase origin/main
# O si prefieres merge:
git merge origin/main
```

### ".gitignore no está funcionando"
```powershell
# Si agregaste un archivo a .gitignore después de tracked:
git rm --cached archivo.env
git commit -m "Remove sensitive file from tracking"
```

### "branch develop doesn't exist on origin"
```powershell
git push -u origin develop
```

## 📚 Recursos

- [Git Docs](https://git-scm.com/doc)
- [GitHub Guides](https://guides.github.com/)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

**Última actualización**: 2 de diciembre de 2025
