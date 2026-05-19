# Guía de Contribución

¡Agradecemos tus contribuciones a APP Afiliados! Por favor sigue estas directrices:

## 📋 Antes de Empezar

1. **Fork** el repositorio
2. **Clone** tu fork localmente:
   ```bash
   git clone https://github.com/TU_USUARIO/appmovilrn.git
   cd appmovilrn
   ```
3. Crea una rama para tu feature/fix:
   ```bash
   git checkout -b feat/tu-feature
   # o
   git checkout -b fix/tu-fix
   ```

## 🔧 Desarrollo Local

Referencia principal: `DEVELOPMENT.md`.

### Setup Mobile
```bash
cd mobile
npm install --legacy-peer-deps
npx expo start
# Presiona 'a' para Android o 'i' para iOS
```

### Setup Backend
```bash
cd backend
node server-soap.js
```

### Setup Scripts (Python)
```bash
python -m venv venv
source venv/Scripts/activate  # o `venv\Scripts\activate` en Windows
pip install -r requirements.txt  # si existe
```

## ✅ Requisitos para PRs

1. **Cambios pequeños y enfocados**: Un propósito por PR
2. **No tocar `build/*` a mano**: si necesitás cambiar algo, ajustá el script que lo genera
2. **Tests**: Añade tests para lógica nueva si aplica
3. **Documentación**: Actualiza README o docs si hay cambios de API
4. **Validación pre-push**: Ejecuta desde la raíz `pre-push-validation.ps1`
   ```powershell
   .\pre-push-validation.ps1
   ```
5. **Commits legibles**: Usa mensajes descriptivos en inglés o español

### Ejemplos de Mensajes de Commit
```
feat: añadir pantalla de notificaciones
fix: corregir validación de email en LoginScreen
docs: actualizar instrucciones de setup
refactor: simplificar AuthContext
```

## 🧪 Branches y Versionado

- **main**: Producción. Solo merges de PRs verificados.
- **develop**: Desarrollo. Base para nuevas features.
- **feat/\***: Features nuevas
- **fix/\***: Bug fixes
- **docs/\***: Cambios en documentación

## 🐛 Reporte de Bugs

Si encuentras un bug, abre un **Issue** con:
- Descripción clara
- Pasos para reproducir
- Comportamiento esperado vs actual
- Stack trace o screenshots

## 🎯 Roadmap de Contribuciones

Áreas donde necesitamos ayuda:
- [ ] Cobertura de tests (Jest)
- [ ] Animaciones en transiciones de pantalla
- [ ] Modo oscuro
- [ ] Internacionalización (i18n)
- [ ] Integración real con SOAP backend

## ❓ Preguntas?

- Abre una discusión en **Issues**
- Revisa la documentación en `docs/` o archivos `.md` en la raíz

¡Gracias por contribuir! 🚀
