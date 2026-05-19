# Plan de Migración — APP Afiliados

**Fecha**: 27 de noviembre de 2025  
**Versión**: 1.0  
**Proyecto**: Migración Genexus → React Native + TypeScript

---

## 📊 Estado Actual

### Completado ✅
1. **Backend demo funcional** (puerto 3000):
   - Endpoints: `/auth/login`, `/auth/me`, `/health`, `/transactions`, `/notifications`, `/profile`
   - Autenticación con tokens Bearer
   - CORS habilitado
   - Usuario demo: `demo` / `demo123`

2. **App móvil (Expo + TypeScript)**:
   - Scaffold con navegación por tabs
   - Pantallas: Login, Home, Profile, Transactions, Notifications
   - AuthContext con persistencia en AsyncStorage
   - API wrapper con soporte para mock y backend real
   - Configuración centralizada en `config.ts`

3. **Scripts de análisis XPZ**:
   - Extracción y parsing del `.xpz` Genexus
   - Inventarios generados: `xpz_deep_inventory.json`, `xpz_ui_mapping.json`, `MIGRATION_SUMMARY.json`

### En Progreso 🔄
- Conexión de la app móvil al backend real (mock desactivado)
- Testing en emuladores AVD y web

---

## 🎯 Próximos Pasos (Prioridad P0-P1)

### 1. Implementar pantallas core basadas en análisis Genexus

**Pantalla: Trámites / Solicitudes** (P1-High)
- **Componentes RN**: `FlatList`, `Modal`, `TextInput`, `Picker`
- **Backend necesario**:
  - `GET /tramites` — listar trámites del afiliado
  - `POST /tramites` — crear nuevo trámite
  - `GET /tramites/:id` — detalle de trámite
  - `PUT /tramites/:id` — actualizar estado/datos
- **Implementación móvil**:
  - Crear `mobile/src/screens/TramitesScreen.tsx`
  - Formularios con validación (React Hook Form + Zod)
  - Lista con pull-to-refresh
  - Estados: Pendiente, En proceso, Completado, Rechazado
- **Duración estimada**: 1 semana

**Pantalla: Perfil Afiliado (mejorado)** (P1-High)
- **Datos adicionales**: documentos, grupos familiares, plan de salud
- **Backend necesario**:
  - `GET /user/profile` — datos completos
  - `PUT /user/profile` — editar datos personales
  - `GET /user/documents` — documentos adjuntos
  - `POST /user/documents` — subir documentos
- **Implementación móvil**:
  - Ampliar `ProfileScreen.tsx`
  - Subir fotos (expo-image-picker)
  - Validación de DNI/CUIL
- **Duración estimada**: 1 semana

**Pantalla: Dashboard / Home (mejorado)** (P1-High)
- **Widgets**: saldo, estado plan, próximos turnos, notificaciones urgentes
- **Backend necesario**:
  - `GET /dashboard` — resumen ejecutivo
  - `GET /turnos` — próximos turnos médicos
  - `GET /saldo` — estado de cuenta
- **Implementación móvil**:
  - Crear widgets reutilizables
  - Navegación rápida a trámites/perfil
  - Pull-to-refresh general
- **Duración estimada**: 1 semana

---

### 2. Backend: Implementar endpoints reales

**Prioridad P0-P1** (requiere acceso a base de datos Genexus o nueva):
- Endpoints de autenticación OAuth (reemplazar mock)
- CRUD de trámites
- API de perfil completo
- API de historial/transacciones real

**Tecnología sugerida**:
- Node.js + Express + TypeScript
- ORM: Prisma o TypeORM
- Base de datos: PostgreSQL o SQL Server (depende del backend Genexus)
- Autenticación: JWT o OAuth2 (integrar con sistema existente si aplica)

**Duración estimada**: 2-3 semanas

---

### 3. Features adicionales (P2-P3)

**Notificaciones Push** (P2-Medium)
- Integrar Firebase Cloud Messaging
- Backend: endpoint `POST /notifications/register` para tokens FCM
- Mobile: `expo-notifications`
- Duración: 1 semana

**Modo offline** (P2-Medium)
- SQLite local para cache de datos
- Sincronización al reconectar
- Duración: 2 semanas

**Tema oscuro** (P3-Low)
- Context de tema
- Estilos dinámicos
- Duración: 3 días

**Soporte / Help** (P3-Low)
- WebView para FAQ
- Chat en vivo (integrar con Zendesk/Intercom)
- Duración: 1 semana

---

## 📅 Roadmap Detallado

| Fase | Duración | Tareas | Estado |
|------|----------|--------|--------|
| **Setup inicial** | 2 sem | Scaffold, navegación, auth mock | ✅ Completado |
| **Backend real** | 2-3 sem | APIs REST, DB, OAuth real | 🔄 Siguiente |
| **Pantallas core** | 3 sem | Trámites, Perfil, Dashboard | ⏳ Pendiente |
| **Integraciones** | 2 sem | Push, analytics, crash reporting | ⏳ Pendiente |
| **Testing & QA** | 2 sem | Unit tests, E2E, UAT | ⏳ Pendiente |
| **Deploy** | 1 sem | App Store, Play Store | ⏳ Pendiente |

**Total estimado**: 12-14 semanas (3-3.5 meses)

---

## 🛠️ Tech Stack Final

### Frontend
- **Framework**: React Native (Expo)
- **Lenguaje**: TypeScript 5+
- **Navegación**: React Navigation 6+
- **Estado**: Context API (auth) + Redux Toolkit (app state)
- **UI**: React Native Paper o componentes custom
- **Forms**: React Hook Form + Zod
- **HTTP**: Axios (wrapper en `api.ts`)
- **Storage**: AsyncStorage + expo-sqlite (offline)
- **Push**: expo-notifications + FCM
- **Testing**: Jest + React Native Testing Library

### Backend
- **Framework**: Node.js + Express + TypeScript
- **ORM**: Prisma
- **DB**: PostgreSQL
- **Auth**: JWT + OAuth2
- **Docs**: Swagger/OpenAPI
- **Testing**: Jest + Supertest

### DevOps
- **CI/CD**: GitHub Actions
- **Hosting**: AWS / Azure
- **Monitoring**: Sentry + Firebase Analytics
- **Stores**: Apple App Store + Google Play

---

## 🔗 Dependencias Críticas

1. **Acceso al backend Genexus existente**:
   - Documentación de APIs actuales
   - Schema de base de datos
   - Flujo de autenticación OAuth

2. **Credenciales y accesos**:
   - Cuentas de desarrollador Apple/Google
   - Firebase project
   - Tokens de CI/CD

3. **Recursos humanos**:
   - 1-2 devs React Native
   - 1 dev backend Node.js
   - 1 QA tester
   - 1 diseñador UI/UX (opcional)

---

## 📝 Notas Importantes

- **No reinventar la rueda**: usar librerías maduras (React Navigation, expo-notifications)
- **Testing desde el inicio**: configurar Jest + RTL ahora
- **Documentar decisiones**: cada endpoint backend debe tener spec OpenAPI
- **Seguridad**: nunca guardar contraseñas en código, usar variables de entorno
- **Accesibilidad**: seguir guías WCAG 2.1 (labels, contraste, navegación por teclado)

---

## 🚀 Cómo Continuar

### Opción A: Implementar backend real
1. Crear nuevo repo `backend-afiliados` (Node.js + Express + Prisma)
2. Definir schema en Prisma basado en análisis Genexus
3. Implementar endpoints P0-P1 (auth, trámites, perfil)
4. Conectar app móvil cambiando `USE_MOCK = false`

### Opción B: Ampliar pantallas móviles (con mock mejorado)
1. Crear `TramitesScreen.tsx` con datos mock
2. Mejorar `ProfileScreen.tsx` con más campos
3. Crear widgets para `HomeScreen.tsx`
4. Añadir tests unitarios

### Recomendación
**Ejecutar A y B en paralelo**:
- Un dev trabaja en backend real
- Otro dev amplía pantallas móviles con mock mejorado
- Integrar cuando el backend esté listo

---

## 📞 Contacto

Para preguntas sobre la migración, contactar al equipo de desarrollo.

**Próxima revisión**: 4 de diciembre de 2025
