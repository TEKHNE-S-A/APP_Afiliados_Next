# APP Afiliados — Migración Genexus → React Native

> Aplicación móvil para gestión de afiliados de obra social, migrada desde Genexus a React Native + TypeScript

[![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)

---

## 📋 Tabla de Contenidos

- [Descripción](#descripción)
- [Características](#características)
- [Tech Stack](#tech-stack)
- [Inicio Rápido](#inicio-rápido)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Documentación](#documentación)
- [Roadmap](#roadmap)
- [Contribuir](#contribuir)

---

## 📖 Descripción

Este repositorio contiene la migración de la aplicación móvil OSEP APP Afiliados desde Genexus a una arquitectura moderna con:

- **Frontend**: React Native + Expo + TypeScript
- **Backend**: Node.js (sin dependencias externas para desarrollo)
- **Scripts**: Python para análisis del `.xpz` Genexus

El proyecto incluye herramientas de análisis para extraer inventarios del Knowledge Base Genexus y generar roadmaps de migración.

---

## ✨ Características

### Funcionalidades Implementadas ✅

- **Autenticación**: Login con OAuth/JWT, persistencia de token en `AsyncStorage`
- **Dashboard**: Resumen ejecutivo (plan, saldo, trámites pendientes, próximo turno)
- **Trámites**: CRUD completo (crear, listar, filtrar por estado)
- **Historial**: Transacciones y movimientos
- **Notificaciones**: Centro de avisos
- **Perfil**: Información del afiliado

### Features Técnicos

- 🔐 Autenticación con tokens Bearer
- 🔄 Pull-to-refresh en todas las listas
- 📱 Navegación por tabs (React Navigation)
- 🎨 UI moderna con componentes custom
- 🌐 API wrapper centralizado con soporte mock/real
- 💾 Persistencia local con AsyncStorage
- 📊 Dashboard con estadísticas en tiempo real

---

## 🛠️ Tech Stack

### Frontend (Mobile)
- **Framework**: React Native 0.76+
- **Expo**: SDK 52
- **Lenguaje**: TypeScript 5+
- **Navegación**: React Navigation 6+
- **State**: Context API
- **HTTP**: Custom API wrapper (fetch)
- **Storage**: AsyncStorage
- **Icons**: Ionicons

### Backend (Demo/Dev)
- **Runtime**: Node.js 18+
- **Framework**: HTTP core module (sin dependencias)
- **Auth**: JWT tokens (in-memory store)
- **Port**: 3000

### DevOps & Tooling
- **Análisis XPZ**: Python 3.13+ (ElementTree, pandas)
- **Linting**: ESLint
- **Format**: Prettier
- **Testing**: Jest (pendiente configuración)

---

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 18+ ([descargar](https://nodejs.org/))
- Python 3.13+ (solo para scripts de análisis)
- Android Studio (para AVD) o Xcode (para iOS Simulator)
- Expo CLI: `npm install -g expo-cli`

### 1. Clonar el repositorio

```bash
git clone <repo-url>
cd APP_Afiliados
```

### 2. Arrancar el Backend

```bash
cd backend
node server-soap.js
```

Notas:
- El backend real está en `backend/server-soap.js` e integra PostgreSQL + SOAP/GAM según configuración.
- Ver guía completa (Windows/PowerShell) en `DEVELOPMENT.md`.

### 3. Arrancar la App Móvil

```bash
cd mobile
npm install --legacy-peer-deps  # (si hay conflictos de peer-deps)
npx expo start
```

Opciones:
- Presiona `a` para abrir en Android AVD
- Presiona `i` para abrir en iOS Simulator
- Presiona `w` para abrir en navegador web
- Escanea el QR con Expo Go (iOS/Android)

### 4. Configurar API Base URL

La configuración se hace en `mobile/.env` (no en `mobile/src/config.ts`).

Ejemplo recomendado:

```dotenv
USE_MOCK=false
API_BASE_URL_ANDROID=http://10.0.2.2:3000
API_BASE_URL_IOS=http://192.168.100.56:3000
USE_MOCK_LOCATION=false
```

Notas:

- En dispositivo físico Android por USB usar `adb reverse tcp:3000 tcp:3000`.
- El cliente Android normaliza automáticamente `10.0.2.2/10.0.3.2` a `127.0.0.1` en dispositivo físico.
- En release, la ubicación mock está desactivada y se usa GPS real.

### 5. Login de prueba

- **Usuario**: `demo`
- **Contraseña**: `demo123`

---

## 📁 Estructura del Proyecto

```
APP_Afiliados/
├── backend/                  # Backend Node.js demo
│   ├── server-soap.js       # Servidor principal (Express + SOAP + PostgreSQL)
│   ├── package.json
│   └── README.md
├── mobile/                   # App React Native (Expo)
│   ├── src/
│   │   ├── screens/         # Pantallas: Login, Home, Trámites, etc.
│   │   ├── contexts/        # AuthContext
│   │   ├── services/        # api.ts (wrapper HTTP)
│   │   ├── config.ts        # USE_MOCK, API_BASE_URL
│   │   └── App.tsx          # Entry point
│   ├── app.json
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
├── scripts/                  # Scripts Python para análisis XPZ
│   ├── parse_xpz_deep.py    # Parser streaming del XML
│   ├── export_xpz_inventory.py
│   ├── generate_migration_summary.py
│   ├── extract_xpz.ps1      # PowerShell helper
│   └── ...
├── build/                    # Artefactos generados
│   ├── xpz_deep_inventory.json
│   ├── xpz_ui_mapping.json
│   ├── MIGRATION_SUMMARY.json
│   └── xpz_extracted/       # XML extraído del .xpz
├── xpz/                      # Knowledge Base Genexus
│   └── PRODUCTO_APP_SHEMA_DESA1.xpz
├── .github/
│   └── copilot-instructions.md  # Guía para agentes AI
├── MIGRATION_PLAN.md         # Roadmap detallado
├── PROGRESS_SUMMARY.md       # Resumen de progreso
└── README.md                 # Este archivo
```

## ✅ Validaciones antes de push

Desde la raíz del repo:

```powershell
.\pre-push-validation.ps1
```

Guía completa: `DEVELOPMENT.md`.

---

## 📚 Documentación

| Documento | Descripción |
|-----------|-------------|
| [`MIGRATION_PLAN.md`](MIGRATION_PLAN.md) | Plan completo de migración (fases, tech stack, roadmap) |
| [`PROGRESS_SUMMARY.md`](PROGRESS_SUMMARY.md) | Resumen del progreso actual y métricas |
| [`backend/README.md`](backend/README.md) | Instrucciones del backend (endpoints, config) |
| [`mobile/README.md`](mobile/README.md) | Guía de la app móvil |
| [`CREDENCIAL_LAYOUT_ADMIN.md`](CREDENCIAL_LAYOUT_ADMIN.md) | Configuración de plantilla de credencial (general/plan, preview y presets) |
| [`ADMIN_WEBPANELS_REDESIGN_PLAN.md`](ADMIN_WEBPANELS_REDESIGN_PLAN.md) | Plan por fases para rediseño de web panels admin (UX + accesibilidad) |
| [`ADMIN_WEBPANELS_PHASE0_CHECKLIST.md`](ADMIN_WEBPANELS_PHASE0_CHECKLIST.md) | Checklist operativo para diagnóstico inicial (Fase 0) |
| [`.github/copilot-instructions.md`](.github/copilot-instructions.md) | Guía para agentes AI |
| [`build/MIGRATION_SUMMARY.json`](build/MIGRATION_SUMMARY.json) | Análisis ejecutivo del `.xpz` Genexus |

---

## 🗺️ Roadmap

### Completado ✅ (Fase 1-2)
- [x] Scaffold React Native + Expo
- [x] Backend demo con 8 endpoints
- [x] Autenticación y persistencia de token
- [x] Pantallas: Login, Home, Trámites, Historial, Notificaciones, Perfil
- [x] Navegación por tabs
- [x] Dashboard con estadísticas
- [x] CRUD de trámites
- [x] Documentación completa

### En Progreso 🔄 (Fase 3)
- [ ] Tests unitarios (Jest + RTL)
- [ ] Mejorar pantallas de Perfil e Historial
- [ ] Validación de formularios (React Hook Form + Zod)

### Planificado 📋 (Fase 4-6)
- [ ] Backend real con base de datos (Prisma + PostgreSQL)
- [ ] Push notifications (Firebase)
- [ ] Modo offline (SQLite)
- [ ] Tema oscuro
- [ ] Tests E2E (Detox)
- [ ] CI/CD (GitHub Actions)
- [ ] Deploy a App Store / Google Play

Ver [`MIGRATION_PLAN.md`](MIGRATION_PLAN.md) para el roadmap completo.

---

## 🤝 Contribuir

1. Fork el repositorio
2. Crea una rama para tu feature: `git checkout -b feature/nueva-funcionalidad`
3. Commit tus cambios: `git commit -m 'Add: nueva funcionalidad'`
4. Push a la rama: `git push origin feature/nueva-funcionalidad`
5. Abre un Pull Request

### Reglas de contribución

- Usa commits descriptivos (formato: `Add:`, `Fix:`, `Update:`, etc.)
- Escribe tests para nuevas funcionalidades
- Actualiza la documentación si es necesario
- Sigue el estilo de código existente (ESLint + Prettier)

---

## 📝 Licencia

Este proyecto es privado y de uso interno.

---

## 👥 Equipo

- **Desarrollo**: [Tu nombre/equipo]
- **Arquitectura**: [Arquitecto del sistema]
- **QA**: [Equipo de testing]

---

## 🔗 Enlaces Útiles

- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [Expo Docs](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/docs/getting-started)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

## 📞 Soporte

Para preguntas o issues, contactar al equipo de desarrollo o abrir un issue en GitHub.

---

**Última actualización**: 27 de noviembre de 2025  
**Versión**: 1.0.0-alpha  
**Estado**: 🟢 En desarrollo activo
#   a p p _ a f i l i a d o s 
 
 