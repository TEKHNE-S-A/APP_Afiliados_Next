# Backlog de Migracion Backend Tecnologica

## Objetivo
Evolucionar el backend actual de forma incremental para alinearlo con las premisas tecnologicas y compatibilizarlo con los backlogs de frontend web (Next) y frontend mobile (Expo/React Native), sin romper produccion.

## Premisas de migracion
- Migracion incremental, no big bang.
- Mantener compatibilidad con integraciones criticas (GAM, SOAP, auth dual, credenciales).
- Priorizar contratos estables para frontend web y mobile.
- Introducir Prisma y mejoras de auth de forma progresiva y controlada.

## Alcance
- Incluido:
  - Estandarizacion de contratos API
  - Validacion de payloads con esquemas
  - Endurecimiento de seguridad y sesiones
  - Migracion gradual de modulos a Prisma
  - Observabilidad, testing y release controlado
- Excluido por ahora:
  - Reescritura total del backend en una sola fase
  - Desactivar integraciones legacy sin plan de reemplazo

## Estado general por fase
- [ ] Fase 0 Descubrimiento y arquitectura objetivo
- [ ] Fase 1 Contratos API y validacion
- [ ] Fase 2 Seguridad y sesiones
- [ ] Fase 3 Datos y Prisma incremental
- [ ] Fase 4 Integraciones externas (GAM/SOAP/SIA)
- [ ] Fase 5 Calidad, testing y observabilidad
- [ ] Fase 6 Release gradual y estabilizacion

## Tablero Kanban operativo
Usar este tablero para seguimiento diario/semanal.

### To Do
- [ ] B0-INV-01 Inventariar endpoints existentes por dominio funcional
- [ ] B0-INV-02 Detectar endpoints criticos para web y mobile
- [ ] B0-ARC-01 Definir arquitectura objetivo incremental del backend
- [ ] B1-API-01 Definir contratos API canonicos por modulo
- [ ] B1-VAL-01 Introducir validacion de entrada en endpoints prioritarios
- [ ] B2-SEC-01 Revisar modelo de sesiones para web y mobile
- [ ] B3-DB-01 Seleccionar primer modulo candidato para Prisma
- [ ] B4-INT-01 Revisar puntos de falla actuales en GAM/SOAP
- [ ] B5-TST-01 Definir matriz de pruebas backend
- [ ] B6-REL-01 Definir estrategia de deploy gradual

### In Progress
- [ ] (vacio)

### Done
- [ ] (vacio)

### Reglas del tablero
- Mover tarea a In Progress solo si tiene duenio y criterio de cierre.
- Mover tarea a Done solo con evidencia de validacion.
- Registrar bloqueos en la seccion Registro de avances.

---

## Fase 0 Descubrimiento y arquitectura objetivo
### Epic 0.1 Inventario tecnico
- [ ] B0-INV-01 Inventariar endpoints existentes por dominio
- [ ] B0-INV-02 Mapear dependencias de frontend web/mobile por endpoint
- [ ] B0-INV-03 Identificar endpoints con mayor tasa de error
- [ ] B0-INV-04 Detectar deuda tecnica prioritaria por modulo

### Epic 0.2 Arquitectura incremental
- [ ] B0-ARC-01 Definir arquitectura objetivo incremental del backend
- [ ] B0-ARC-02 Definir estrategia de coexistencia legacy + nuevo
- [ ] B0-ARC-03 Definir politica de versionado de API
- [ ] B0-ARC-04 Definir criterios de migracion por modulo

### Criterios de cierre Fase 0
- [ ] Inventario tecnico aprobado
- [ ] Arquitectura incremental aprobada
- [ ] Plan de migracion por olas definido

---

## Fase 1 Contratos API y validacion
### Epic 1.1 Estandar de contratos
- [ ] B1-API-01 Definir contratos canonicos request/response
- [ ] B1-API-02 Estandarizar codigos de error por dominio
- [ ] B1-API-03 Definir formato uniforme de errores

### Epic 1.2 Validacion de entradas
- [ ] B1-VAL-01 Introducir validacion de entrada en endpoints prioritarios
- [ ] B1-VAL-02 Agregar validacion de query params criticos
- [ ] B1-VAL-03 Agregar validacion de payloads anidados complejos

### Epic 1.3 Compatibilidad con fronts
- [ ] B1-CMP-01 Verificar compatibilidad con frontend web Next
- [ ] B1-CMP-02 Verificar compatibilidad con frontend mobile Expo
- [ ] B1-CMP-03 Publicar changelog de contratos para consumo front

### Criterios de cierre Fase 1
- [ ] Contratos API principales estandarizados
- [ ] Validacion aplicada en endpoints criticos
- [ ] Compatibilidad confirmada con ambos frontends

---

## Fase 2 Seguridad y sesiones
### Epic 2.1 Sesiones y autenticacion
- [ ] B2-SEC-01 Revisar modelo de sesiones para web y mobile
- [ ] B2-SEC-02 Definir estrategia de expiracion y refresh
- [ ] B2-SEC-03 Estandarizar middleware de autenticacion

### Epic 2.2 Seguridad operativa
- [ ] B2-HAR-01 Revisar exposicion de datos sensibles en respuestas
- [ ] B2-HAR-02 Revisar logging para evitar filtrado de secretos
- [ ] B2-HAR-03 Definir politicas de rate limiting basico

### Epic 2.3 Gobierno de acceso
- [ ] B2-ROL-01 Revisar control de roles admin backend
- [ ] B2-ROL-02 Endurecer endpoints de administracion critica
- [ ] B2-ROL-03 Registrar auditoria minima de cambios sensibles

### Criterios de cierre Fase 2
- [ ] Sesiones estables para web y mobile
- [ ] Riesgos de seguridad principales mitigados
- [ ] Control de acceso endurecido

---

## Fase 3 Datos y Prisma incremental
### Epic 3.1 Preparacion de migracion de datos
- [ ] B3-DB-01 Seleccionar primer modulo candidato para Prisma
- [ ] B3-DB-02 Definir estrategia de coexistencia SQL actual + Prisma
- [ ] B3-DB-03 Definir rollback por modulo migrado

### Epic 3.2 Implementacion gradual
- [ ] B3-PRIS-01 Implementar Prisma en modulo piloto de bajo riesgo
- [ ] B3-PRIS-02 Medir impacto en performance y mantenibilidad
- [ ] B3-PRIS-03 Ajustar patrones de repositorio para coexistencia

### Epic 3.3 Escalado de adopcion
- [ ] B3-ESC-01 Definir criterios para migrar segundo modulo
- [ ] B3-ESC-02 Priorizar modulos siguientes segun impacto/riesgo
- [ ] B3-ESC-03 Documentar lecciones y anti patrones detectados

### Criterios de cierre Fase 3
- [ ] Piloto Prisma en produccion controlada
- [ ] Coexistencia estable con capa legacy
- [ ] Decision de expansion validada

---

## Fase 4 Integraciones externas (GAM/SOAP/SIA)
### Epic 4.1 GAM
- [ ] B4-GAM-01 Revisar flujo register/login/userinfo y obtencion GUID
- [ ] B4-GAM-02 Estandarizar manejo de errores de GAM
- [ ] B4-GAM-03 Endurecer sincronizacion de usuarios GAM a BD local

### Epic 4.2 SOAP beneficiarios
- [ ] B4-SOAP-01 Revisar formato por servicio (envoltura/plano)
- [ ] B4-SOAP-02 Validar headers dinamicos desde parametros
- [ ] B4-SOAP-03 Mejorar estrategia de retry/fallback y timeouts

### Epic 4.3 SIA
- [ ] B4-SIA-01 Revisar contratos de endpoints SIA clave
- [ ] B4-SIA-02 Estandarizar validaciones y formatos de fecha
- [ ] B4-SIA-03 Reducir errores operativos en servicios criticos

### Criterios de cierre Fase 4
- [ ] Integraciones externas estabilizadas
- [ ] Errores recurrentes reducidos
- [ ] Contratos consistentes para consumo front

---

## Fase 5 Calidad, testing y observabilidad
### Epic 5.1 Testing
- [ ] B5-TST-01 Definir matriz de pruebas backend
- [ ] B5-TST-02 Agregar pruebas unitarias de utilidades criticas
- [ ] B5-TST-03 Agregar pruebas de integracion por dominio
- [ ] B5-TST-04 Agregar smoke tests de endpoints principales

### Epic 5.2 Observabilidad
- [ ] B5-OBS-01 Estandarizar logs estructurados
- [ ] B5-OBS-02 Definir metricas clave por endpoint
- [ ] B5-OBS-03 Definir alertas minimas de disponibilidad y error rate

### Epic 5.3 Calidad operativa
- [ ] B5-QUA-01 Definir SLO basicos de latencia y error
- [ ] B5-QUA-02 Medir baseline y comparar por fase
- [ ] B5-QUA-03 Cerrar deuda tecnica prioritaria de alto impacto

### Criterios de cierre Fase 5
- [ ] Cobertura de pruebas minima alcanzada
- [ ] Observabilidad operativa activa
- [ ] Indicadores de calidad dentro de umbral

---

## Fase 6 Release gradual y estabilizacion
### Epic 6.1 Release
- [ ] B6-REL-01 Definir estrategia de deploy gradual
- [ ] B6-REL-02 Ejecutar checklist pre-release backend
- [ ] B6-REL-03 Publicar notas de version por ola

### Epic 6.2 Estabilizacion
- [ ] B6-STB-01 Monitorear incidencias post deploy
- [ ] B6-STB-02 Corregir bugs P1/P2 con prioridad
- [ ] B6-STB-03 Validar no regresion en web y mobile

### Epic 6.3 Cierre
- [ ] B6-CIE-01 Documentar arquitectura final y pendientes
- [ ] B6-CIE-02 Definir backlog de evolucion continua
- [ ] B6-CIE-03 Formalizar handover operativo

### Criterios de cierre Fase 6
- [ ] Backend estable en produccion
- [ ] Sin regresiones criticas en frontends
- [ ] Roadmap de evolucion aprobado

---

## Riesgos y mitigaciones
- [ ] RSK-BE-01 Romper compatibilidad con mobile
  - Mitigacion: contratos versionados y pruebas de regresion mobile
- [ ] RSK-BE-02 Inestabilidad por migracion de datos temprana
  - Mitigacion: Prisma solo en modulos de bajo riesgo + rollback
- [ ] RSK-BE-03 Fallas en integraciones externas
  - Mitigacion: circuit breakers, retries controlados y monitoreo
- [ ] RSK-BE-04 Sobrecarga del equipo por frentes simultaneos
  - Mitigacion: plan por olas, limites de WIP y criterios de prioridad

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
