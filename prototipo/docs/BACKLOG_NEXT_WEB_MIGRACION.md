# Backlog de Implementación Web (Next.js)

## Objetivo
Implementar frontend web en paralelo al mobile existente, usando Next.js App Router, Tailwind CSS, TanStack Query, Zustand, Zod, y adopción progresiva de Auth.js y Prisma.

## Cómo usar este backlog
- Marcar cada tarea con [x] cuando esté completada.
- No iniciar una tarea bloqueada por dependencias.
- Registrar fecha y responsable al cerrar cada tarea.

Ejemplo de cierre:
- [x] WK1-ARC-01 Definir arquitectura base (2026-05-15, Juan)

## Estado general
- [ ] Fase 0 Descubrimiento
- [ ] Fase 1 Base técnica Next
- [ ] Fase 2 Seguridad y autenticación
- [ ] Fase 3 Módulo credenciales
- [ ] Fase 4 Módulo admin
- [ ] Fase 5 Calidad, testing y observabilidad
- [ ] Fase 6 Go-live y estabilización

## Tablero Kanban operativo
Usar este tablero para el seguimiento diario/semanal. Mantener la tarea en una sola columna y moverla por estado.

### To Do
- [ ] WK0-INV-01 Relevar endpoints backend usados por mobile
- [ ] WK0-INV-02 Clasificar endpoints por dominio: auth, credenciales, admin, SIA
- [ ] WK0-ARC-01 Definir arquitectura Next App Router para web
- [ ] WK0-ARC-05 Definir matriz SSR/SSG por ruta
- [ ] WK0-ARC-06 Validar matriz SSR/SSG con negocio y seguridad
- [ ] WK1-SET-01 Crear app Next.js con TypeScript y App Router
- [ ] WK1-DAT-01 Implementar cliente HTTP centralizado para backend actual
- [ ] WK1-DAT-03 Configurar TanStack Query (provider, defaults, retries)
- [ ] WK1-DAT-04 Modelar esquemas Zod de auth y credenciales
- [ ] WK1-REN-01 Implementar rutas iniciales con estrategia SSR/SSG definida
- [ ] WK1-REN-04 Documentar estrategia final SSR/SSG por ruta implementada
- [ ] WK2-AUT-01 Implementar pantalla de login web
- [ ] WK2-AUT-02 Integrar login contra backend existente
- [ ] WK3-CRE-01 Crear listado de credenciales titular/grupo
- [ ] WK5-QUA-05 Medir TTFB y LCP en rutas SSR vs SSG

### In Progress
- [ ] (vacío)

### Done
- [ ] (vacío)

### Reglas de uso
- Al iniciar una tarea, moverla de To Do a In Progress.
- Al terminarla y validar resultado, moverla a Done y registrar fecha/responsable.
- Si una tarea se bloquea, mantenerla en In Progress y registrar bloqueo en "Registro de avances".

---

## Fase 0 Descubrimiento
### Epic 0.1 Inventario funcional
- [ ] WK0-INV-01 Relevar endpoints backend usados por mobile
- [ ] WK0-INV-02 Clasificar endpoints por dominio: auth, credenciales, admin, SIA
- [ ] WK0-INV-03 Identificar contratos de request/response críticos
- [ ] WK0-INV-04 Definir qué módulos van al MVP web y cuáles quedan fuera

### Epic 0.2 Arquitectura objetivo
- [ ] WK0-ARC-01 Definir arquitectura Next App Router para web
- [ ] WK0-ARC-02 Definir estrategia de sesión web (cookie segura o JWT)
- [ ] WK0-ARC-03 Definir política de manejo de errores y timeouts
- [ ] WK0-ARC-04 Definir convenciones de carpetas y naming
- [ ] WK0-ARC-05 Definir matriz SSR/SSG por ruta (qué va SSR, qué va SSG)

### Criterios de cierre Fase 0
- [ ] Documento de arquitectura aprobado
- [ ] Scope del MVP web acordado
- [ ] Mapa de dependencias técnicas validado

---

## Fase 1 Base técnica Next
### Epic 1.1 Proyecto base
- [ ] WK1-SET-01 Crear app Next.js con TypeScript y App Router
- [ ] WK1-SET-02 Configurar Tailwind CSS y tokens base de diseño
- [ ] WK1-SET-03 Configurar linting y formateo
- [ ] WK1-SET-04 Configurar variables de entorno por ambiente

### Epic 1.2 Capa de datos y validación
- [ ] WK1-DAT-01 Implementar cliente HTTP centralizado para backend actual
- [ ] WK1-DAT-02 Implementar manejo de errores de red y timeout
- [ ] WK1-DAT-03 Configurar TanStack Query (provider, defaults, retries)
- [ ] WK1-DAT-04 Modelar esquemas Zod de auth y credenciales

### Epic 1.3 Base de estado cliente
- [ ] WK1-STA-01 Crear stores Zustand mínimos (ui/session)
- [ ] WK1-STA-02 Definir reglas: qué va en Query vs Zustand
- [ ] WK1-STA-03 Implementar guard de rutas privadas

### Epic 1.4 Estrategia de renderizado (SSR/SSG)
- [ ] WK1-REN-01 Implementar rutas iniciales con estrategia SSR/SSG definida
- [ ] WK1-REN-02 Configurar revalidación para rutas SSG con contenido cambiante
- [ ] WK1-REN-03 Validar hidratación y manejo de estados en SSR

### Criterios de cierre Fase 1
- [ ] App Next levanta en local
- [ ] Flujo básico de navegación funcional
- [ ] Cliente API y validaciones base operativas
- [ ] Estrategia SSR/SSG aplicada y validada en rutas iniciales

---

## Fase 2 Seguridad y autenticación
### Epic 2.1 Login y sesión
- [ ] WK2-AUT-01 Implementar pantalla de login web
- [ ] WK2-AUT-02 Integrar login contra backend existente
- [ ] WK2-AUT-03 Persistir sesión segura y expiración
- [ ] WK2-AUT-04 Implementar logout y limpieza de sesión

### Epic 2.2 Protección de rutas
- [ ] WK2-SEC-01 Proteger rutas por sesión activa
- [ ] WK2-SEC-02 Redireccionar no autenticados a login
- [ ] WK2-SEC-03 Implementar control de acceso para vistas admin

### Epic 2.3 Endurecimiento de seguridad
- [ ] WK2-HAR-01 Validar entradas con Zod en formularios
- [ ] WK2-HAR-02 Evitar exposición de secretos en cliente
- [ ] WK2-HAR-03 Definir política de manejo de errores sin filtrar datos sensibles

### Criterios de cierre Fase 2
- [ ] Login/logout estables
- [ ] Rutas protegidas funcionando
- [ ] Validaciones y seguridad mínima aprobadas

---

## Fase 3 Módulo credenciales
### Epic 3.1 Vista principal de credenciales
- [ ] WK3-CRE-01 Crear listado de credenciales titular/grupo
- [ ] WK3-CRE-02 Mostrar estado de vigencia y datos principales
- [ ] WK3-CRE-03 Manejar loading/empty/error states

### Epic 3.2 Token temporal y detalle
- [ ] WK3-TOK-01 Mostrar token temporal en UI web
- [ ] WK3-TOK-02 Implementar countdown de vencimiento
- [ ] WK3-TOK-03 Refrescar datos con políticas de Query

### Epic 3.3 UX y responsive
- [ ] WK3-UX-01 Diseñar layout desktop/mobile web
- [ ] WK3-UX-02 Implementar accesibilidad básica (focus, labels)
- [ ] WK3-UX-03 Ajustar feedback visual para acciones críticas

### Criterios de cierre Fase 3
- [ ] Credenciales visibles y actualizables
- [ ] Token temporal estable
- [ ] Responsive verificado

---

## Fase 4 Módulo admin web
### Epic 4.1 Usuarios
- [ ] WK4-ADM-01 Listado paginado de usuarios
- [ ] WK4-ADM-02 Filtros por estado/tipo/búsqueda
- [ ] WK4-ADM-03 Vista detalle de usuario

### Epic 4.2 Parámetros
- [ ] WK4-PAR-01 Listar parámetros por grupo
- [ ] WK4-PAR-02 Editar parámetro con validación
- [ ] WK4-PAR-03 Crear y eliminar parámetro con confirmación

### Epic 4.3 Roles administrativos
- [ ] WK4-ROL-01 Listar admins backend actuales
- [ ] WK4-ROL-02 Dar/quitar rol admin con guardas de seguridad
- [ ] WK4-ROL-03 Registrar auditoría mínima de cambios críticos

### Criterios de cierre Fase 4
- [ ] Gestión básica de usuarios operativa
- [ ] Gestión de parámetros operativa
- [ ] Roles admin con controles mínimos

---

## Fase 5 Calidad, testing y observabilidad
### Epic 5.1 Testing
- [ ] WK5-TST-01 Definir estrategia de testing por capa
- [ ] WK5-TST-02 Agregar tests unitarios de utilidades críticas
- [ ] WK5-TST-03 Agregar tests de integración de flujos auth
- [ ] WK5-TST-04 Agregar smoke E2E de rutas críticas

### Epic 5.2 Calidad técnica
- [ ] WK5-QUA-01 Revisar performance de pantallas principales
- [ ] WK5-QUA-02 Revisar accesibilidad mínima AA en pantallas críticas
- [ ] WK5-QUA-03 Corregir deuda técnica priorizada
- [ ] WK5-QUA-04 Medir impacto SSR/SSG en performance (TTFB/LCP) por rutas clave

### Epic 5.3 Observabilidad
- [ ] WK5-OBS-01 Implementar logging estructurado de frontend
- [ ] WK5-OBS-02 Implementar monitoreo de errores de runtime
- [ ] WK5-OBS-03 Definir alertas básicas de disponibilidad

### Criterios de cierre Fase 5
- [ ] Suite mínima de testing activa
- [ ] Observabilidad base habilitada
- [ ] Performance aceptable en flujos críticos

---

## Fase 6 Go-live y estabilización
### Epic 6.1 Release
- [ ] WK6-REL-01 Preparar build de producción
- [ ] WK6-REL-02 Configurar despliegue por ambiente
- [ ] WK6-REL-03 Ejecutar checklist de pre-release

### Epic 6.2 Lanzamiento gradual
- [ ] WK6-ROL-01 Habilitar release controlado a usuarios internos
- [ ] WK6-ROL-02 Monitorear errores y tiempos de respuesta
- [ ] WK6-ROL-03 Ajustar incidencias de alta prioridad

### Epic 6.3 Cierre de ciclo
- [ ] WK6-CLO-01 Cerrar pendientes P1/P2
- [ ] WK6-CLO-02 Actualizar documentación final
- [ ] WK6-CLO-03 Definir backlog post-MVP

### Criterios de cierre Fase 6
- [ ] Producción estable
- [ ] Incidencias críticas resueltas
- [ ] Backlog de evolución definido

---

## Backlog técnico diferido (adopción progresiva)
### Auth.js
- [ ] DIF-AUTH-01 Evaluar integración con flujo GAM actual
- [ ] DIF-AUTH-02 Probar estrategia híbrida con backend existente
- [ ] DIF-AUTH-03 Definir decisión: adoptar completo o mantener sesión custom

### Prisma
- [ ] DIF-PRIS-01 Identificar módulos nuevos aptos para Prisma
- [ ] DIF-PRIS-02 Evitar migración masiva temprana de SQL legacy
- [ ] DIF-PRIS-03 Diseñar plan de coexistencia Prisma + acceso actual

---

## Matriz inicial SSR/SSG recomendada

### Rutas privadas y operativas
| Ruta/Modulo | Estrategia recomendada | Motivo |
|---|---|---|
| Login | SSR | Permite control de sesión/redirección temprana y menor exposición de estado auth en cliente. |
| Home autenticada | SSR | Muestra datos de usuario y estado de sesión que cambian por request. |
| Credenciales | SSR | Depende de sesión activa y datos sensibles con cambios frecuentes. |
| Perfil | SSR | Contenido personalizado por usuario autenticado. |
| Admin usuarios | SSR | Datos dinámicos, filtros y permisos por rol. |
| Admin parámetros | SSR | Operación interna con información dinámica y sensible. |

### Rutas públicas o de contenido estable
| Ruta/Modulo | Estrategia recomendada | Motivo |
|---|---|---|
| Landing pública | SSG | Contenido de marketing/informativo, alta velocidad y buen SEO. |
| Ayuda/FAQ | SSG con revalidación | Cambios ocasionales, ideal para cache CDN y refresco programado. |
| Documentación pública | SSG con revalidación | Contenido editorial estable con actualizaciones periódicas. |

### Criterios de decisión rápidos
- Usar SSR cuando la ruta dependa de sesión, permisos o datos sensibles por usuario.
- Usar SSG cuando el contenido sea mayormente estático y orientado a SEO/performance.
- Usar SSG con revalidación cuando el contenido cambie cada cierto tiempo pero no por usuario.
- Evitar mezclar estrategias sin documentar decisión en la matriz por ruta.

### Tareas de adopción de la matriz
- [ ] WK0-ARC-06 Validar esta matriz con negocio y seguridad.
- [ ] WK1-REN-04 Documentar estrategia final SSR/SSG por cada ruta implementada.
- [ ] WK5-QUA-05 Medir TTFB y LCP comparando rutas SSR vs SSG en entorno real.

---

## Registro de avances
- [ ] Completar tabla de avances semanales

| Semana | Tareas cerradas | Bloqueos | Próximo foco |
|---|---|---|---|
| Semana 1 |  |  |  |
| Semana 2 |  |  |  |
| Semana 3 |  |  |  |
| Semana 4 |  |  |  |
| Semana 5 |  |  |  |
| Semana 6 |  |  |  |
| Semana 7 |  |  |  |
| Semana 8 |  |  |  |
| Semana 9 |  |  |  |
| Semana 10 |  |  |  |
| Semana 11 |  |  |  |
| Semana 12 |  |  |  |
