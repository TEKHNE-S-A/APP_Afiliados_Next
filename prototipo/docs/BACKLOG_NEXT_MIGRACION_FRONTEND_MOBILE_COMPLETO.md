# Backlog de Evolucion Frontend Mobile (Expo/React Native)

## Objetivo
Evolucionar y consolidar el frontend mobile completo en Expo/React Native, manteniendo integracion con backend Node/Express/SOAP/GAM, mejorando calidad, rendimiento, seguridad y experiencia de usuario.

## Alcance
- Incluido:
  - Login dual online/offline
  - Home, Credenciales, Perfil
  - Tramites, Notificaciones, Transacciones
  - Token temporal, QR y compartir credencial
  - Robustez offline y sincronizacion
  - Hardening de seguridad en cliente
- Excluido por ahora:
  - Migracion total del canal mobile a stack web
  - Reescritura completa del backend

## Stack objetivo (mobile)
- App: Expo + React Native + TypeScript
- Estado servidor: TanStack Query (cuando aplique)
- Estado cliente: Context API actual + posibilidad de Zustand gradual
- Validacion: Zod (gradual)
- Persistencia local: AsyncStorage
- Red: capa API central en mobile/src/services/api.ts

## Como usar este backlog
- Marcar cada tarea con [x] al finalizar.
- Mantener cada tarea en una sola columna del Kanban.
- Registrar fecha y responsable al cerrar tareas.

Ejemplo:
- [x] M0-INV-01 Inventario de pantallas mobile (2026-05-15, Ana)

## Estado general por fase
- [ ] Fase 0 Descubrimiento y priorizacion
- [ ] Fase 1 Base tecnica y arquitectura mobile
- [ ] Fase 2 Auth, sesion y offline
- [ ] Fase 3 Credenciales, token y QR
- [ ] Fase 4 Modulos funcionales (Tramites, Notificaciones, Transacciones)
- [ ] Fase 5 UX, performance y accesibilidad
- [ ] Fase 6 Calidad, testing y observabilidad
- [ ] Fase 7 Release y estabilizacion

## Tablero Kanban operativo
Usar este tablero para seguimiento diario/semanal.

### To Do
- [ ] M0-INV-01 Inventariar pantallas y flujos actuales del mobile
- [ ] M0-INV-02 Mapear dependencias de cada pantalla con servicios
- [ ] M1-ARC-01 Definir arquitectura objetivo de frontend mobile
- [ ] M1-API-01 Fortalecer cliente API centralizado (errores y timeouts)
- [ ] M2-AUT-01 Revisar flujo login dual online/offline end-to-end
- [ ] M2-OFF-01 Revisar estrategia de cache y sincronizacion en AsyncStorage
- [ ] M3-CRE-01 Revisar modulo de credenciales titular/grupo familiar
- [ ] M3-TOK-01 Validar token temporal y countdown en todas las pantallas
- [ ] M4-TRA-01 Relevar gap funcional de tramites/autorizaciones
- [ ] M6-TST-01 Definir matriz de pruebas mobile por modulo

### In Progress
- [ ] (vacio)

### Done
- [ ] (vacio)

### Reglas del tablero
- Mover a In Progress solo tareas con duenio y criterio de cierre.
- Mover a Done solo con validacion funcional.
- Si hay bloqueo, documentarlo en Registro de avances.

---

## Fase 0 Descubrimiento y priorizacion
### Epic 0.1 Inventario funcional
- [ ] M0-INV-01 Inventariar pantallas y flujos actuales del mobile
- [ ] M0-INV-02 Mapear dependencias de cada pantalla con servicios
- [ ] M0-INV-03 Identificar funcionalidades criticas por modulo
- [ ] M0-INV-04 Definir matriz de prioridad (alto/medio/bajo)

### Epic 0.2 Priorizacion y plan
- [ ] M0-PLA-01 Definir roadmap de evolucion por olas
- [ ] M0-PLA-02 Definir criterios de aceptacion por modulo
- [ ] M0-PLA-03 Definir riesgos y mitigaciones tecnicas

### Criterios de cierre Fase 0
- [ ] Inventario funcional aprobado
- [ ] Prioridades definidas por modulo
- [ ] Plan de trabajo aprobado

---

## Fase 1 Base tecnica y arquitectura mobile
### Epic 1.1 Arquitectura de codigo
- [ ] M1-ARC-01 Definir arquitectura objetivo de frontend mobile
- [ ] M1-ARC-02 Estandarizar convenciones de carpetas y naming
- [ ] M1-ARC-03 Separar claramente capas ui/hooks/services/utils

### Epic 1.2 API y manejo de errores
- [ ] M1-API-01 Fortalecer cliente API centralizado (errores y timeouts)
- [ ] M1-API-02 Homogeneizar manejo de NetworkError y TimeoutError
- [ ] M1-API-03 Definir politica de retries por endpoint

### Epic 1.3 Validacion y tipado
- [ ] M1-TYP-01 Revisar tipos TypeScript de entidades criticas
- [ ] M1-TYP-02 Introducir Zod en contratos prioritarios
- [ ] M1-TYP-03 Reducir any y mejorar inferencia de tipos

### Criterios de cierre Fase 1
- [ ] Arquitectura y convenciones estabilizadas
- [ ] Capa API robusta y uniforme
- [ ] Tipado y validacion base mejorados

---

## Fase 2 Auth, sesion y offline
### Epic 2.1 Autenticacion
- [ ] M2-AUT-01 Revisar login dual online/offline end-to-end
- [ ] M2-AUT-02 Validar soporte de login por email, DNI y CUIL
- [ ] M2-AUT-03 Verificar logout seguro y limpieza de sesion

### Epic 2.2 Persistencia y cache
- [ ] M2-OFF-01 Revisar estrategia de cache y sincronizacion en AsyncStorage
- [ ] M2-OFF-02 Endurecer manejo de datos de usuario por sesion
- [ ] M2-OFF-03 Validar preservacion controlada de USER_CREDENTIALS

### Epic 2.3 Sincronizacion y resiliencia
- [ ] M2-SYN-01 Definir politica de sync en background
- [ ] M2-SYN-02 Manejar estados sin conectividad intermitente
- [ ] M2-SYN-03 Agregar telemetria minima de fallos de sync

### Criterios de cierre Fase 2
- [ ] Auth estable en escenarios online/offline
- [ ] Cache segura y consistente
- [ ] Sync resiliente en condiciones reales

---

## Fase 3 Credenciales, token y QR
### Epic 3.1 Credenciales
- [ ] M3-CRE-01 Revisar modulo credenciales titular/grupo familiar
- [ ] M3-CRE-02 Corregir gaps de layout en tarjetas
- [ ] M3-CRE-03 Alinear comportamiento entre Home, Credenciales y Perfil

### Epic 3.2 Token temporal
- [ ] M3-TOK-01 Validar token temporal y countdown en todas las pantallas
- [ ] M3-TOK-02 Verificar refresh antes de expiracion
- [ ] M3-TOK-03 Validar timeout configurable sincronizado con backend

### Epic 3.3 QR y compartir
- [ ] M3-QR-01 Verificar consistencia de payload QR
- [ ] M3-QR-02 Validar render QR en modal y perfil
- [ ] M3-SHR-01 Validar compartir credencial via captureRef + sharing
- [ ] M3-SHR-02 Verificar flujo de compartir desde carrusel

### Criterios de cierre Fase 3
- [ ] Credenciales estables en todas las vistas
- [ ] Token temporal confiable
- [ ] QR y compartir funcionando sin regresiones

---

## Fase 4 Modulos funcionales (Tramites, Notificaciones, Transacciones)
### Epic 4.1 Tramites y autorizaciones
- [ ] M4-TRA-01 Relevar gap funcional de tramites/autorizaciones
- [ ] M4-TRA-02 Integrar flujos pendientes con endpoints SIA
- [ ] M4-TRA-03 Validar formularios y reglas por tipo de solicitud

### Epic 4.2 Notificaciones
- [ ] M4-NOT-01 Revisar experiencia actual de notificaciones
- [ ] M4-NOT-02 Mejorar estados de lectura/no lectura
- [ ] M4-NOT-03 Agregar manejo robusto de errores

### Epic 4.3 Transacciones
- [ ] M4-TRX-01 Revisar modulo transacciones y filtros
- [ ] M4-TRX-02 Mejorar performance en listados
- [ ] M4-TRX-03 Estandarizar formato y estados de operaciones

### Criterios de cierre Fase 4
- [ ] Tramites funcionales y estables
- [ ] Notificaciones funcionales
- [ ] Transacciones funcionales

---

## Fase 5 UX, performance y accesibilidad
### Epic 5.1 UX y consistencia visual
- [ ] M5-UX-01 Estandarizar componentes y estilos comunes
- [ ] M5-UX-02 Unificar patrones de feedback (loading, empty, error)
- [ ] M5-UX-03 Mejorar microinteracciones en pantallas clave

### Epic 5.2 Performance
- [ ] M5-PER-01 Medir tiempos de carga por pantalla
- [ ] M5-PER-02 Optimizar render y re-render de listas
- [ ] M5-PER-03 Reducir trabajo en background innecesario

### Epic 5.3 Accesibilidad
- [ ] M5-ACC-01 Revisar legibilidad y contraste
- [ ] M5-ACC-02 Mejorar etiquetas y jerarquia de elementos
- [ ] M5-ACC-03 Revisar navegacion tactil y targets

### Criterios de cierre Fase 5
- [ ] UX consistente en modulos principales
- [ ] Performance aceptable
- [ ] Accesibilidad base mejorada

---

## Fase 6 Calidad, testing y observabilidad
### Epic 6.1 Testing
- [ ] M6-TST-01 Definir matriz de pruebas mobile por modulo
- [ ] M6-TST-02 Agregar pruebas unitarias de utilidades criticas
- [ ] M6-TST-03 Agregar pruebas de integracion en auth y credenciales
- [ ] M6-TST-04 Definir smoke tests manuales de release

### Epic 6.2 Observabilidad
- [ ] M6-OBS-01 Estandarizar logs funcionales de front mobile
- [ ] M6-OBS-02 Definir eventos criticos para diagnostico
- [ ] M6-OBS-03 Crear checklist de debugging operativo

### Epic 6.3 Hardening
- [ ] M6-HAR-01 Revisar gestion de errores no controlados
- [ ] M6-HAR-02 Revisar fugas de datos sensibles en logs
- [ ] M6-HAR-03 Revisar escenarios de recovery ante fallos

### Criterios de cierre Fase 6
- [ ] Calidad minima aprobada
- [ ] Observabilidad util para soporte
- [ ] Hardening tecnico aplicado

---

## Fase 7 Release y estabilizacion
### Epic 7.1 Pre-release
- [ ] M7-REL-01 Ejecutar checklist funcional completo
- [ ] M7-REL-02 Ejecutar checklist tecnico pre-release
- [ ] M7-REL-03 Preparar notas de version

### Epic 7.2 Release controlado
- [ ] M7-ROL-01 Publicar release en entorno controlado
- [ ] M7-ROL-02 Monitorear incidencias iniciales
- [ ] M7-ROL-03 Ajustar bugs P1/P2

### Epic 7.3 Cierre operativo
- [ ] M7-CIE-01 Actualizar documentacion final
- [ ] M7-CIE-02 Definir backlog de evolucion continua
- [ ] M7-CIE-03 Formalizar handover operativo

### Criterios de cierre Fase 7
- [ ] Release estable
- [ ] Incidencias criticas resueltas
- [ ] Hoja de ruta siguiente definida

---

## Riesgos y mitigaciones
- [ ] RSK-01 Regresiones en login offline/online
  - Mitigacion: pruebas de regresion por tipo de usuario
- [ ] RSK-02 Inconsistencias en token temporal y countdown
  - Mitigacion: pruebas cruzadas Home/Credenciales/Perfil
- [ ] RSK-03 Divergencia de comportamiento entre pantallas
  - Mitigacion: contratos de componente y checklist UX comun
- [ ] RSK-04 Deuda tecnica por cambios rapidos
  - Mitigacion: sprint fijo de hardening y limpieza

---

## Registro de avances
- [ ] Completar seguimiento semanal

| Semana | Tareas cerradas | Bloqueos | Proximo foco |
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
