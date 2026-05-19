# Propuesta de Diseno UI Mobile - APP_Afiliados

Fecha: 15 de abril de 2026
Estado: Documento de planificacion (sin implementacion)

## 1. Objetivo
Definir una propuesta visual y de experiencia de usuario para la app mobile, lista para handoff a desarrollo, sin cambios de codigo en esta etapa.

## 2. Herramientas recomendadas
1. Figma
- Diseno de pantallas, componentes, prototipos y handoff.
- Ideal para sistema visual y validacion temprana de UX.

2. Expo + React Native + Expo Go
- Vista real de interfaz en dispositivo para validar decisiones visuales.
- Util para verificar legibilidad, densidad y jerarquia en contexto real.

3. Storybook para React Native
- Construccion y validacion de componentes visuales de forma aislada.
- Ayuda a mantener consistencia entre pantallas.

4. UI Kit (React Native Paper o NativeBase)
- Acelera construccion de UI consistente.
- Recomendado si se prioriza velocidad y estandarizacion.

## 3. Alcance funcional de diseno
Pantallas prioritarias:
- Login
- Home
- Credencial (modal + QR)
- Credenciales del grupo familiar
- Perfil
- Estado offline (banner y variantes)

## 4. Estructura de trabajo en Figma
- Pagina 1: Wireframes low-fi
- Pagina 2: UI final high-fi
- Pagina 3: Componentes
- Pagina 4: Prototipo navegable
- Pagina 5: Estados y errores

## 5. Sistema visual minimo
Definir antes del detalle de pantallas:
- Paleta de colores: primario, secundario, exito, alerta, error, fondos, texto, bordes
- Tipografia: familia, tamanos, pesos, interlineado
- Espaciado: escala base 4/8/12/16/24/32
- Bordes y sombras: radios por nivel y elevaciones
- Iconografia: criterio unico (outline o filled)

## 6. Biblioteca minima de componentes
- Boton: primario, secundario, deshabilitado, loading
- Input: normal, foco, error, helper text
- Card de credencial: titular/familiar, vigente/expirada, token temporal
- Badge: TITULAR, VIGENTE, EXPIRADO, OFFLINE
- Header: saludo + acciones
- Banner offline: estado + accion de sincronizacion
- Modal base: titulo, contenido, acciones

## 7. Estados obligatorios por pantalla
- Cargando
- Vacio
- Error de red
- Offline con datos en cache
- Sesion expirada o reintento
- Exito de accion

## 8. Flujo UX a prototipar
- Login online exitoso
- Login offline con cache
- Home a modal de credencial con QR
- Home a grupo familiar
- Credenciales a compartir
- Perfil con cambio entre titular/familiar

## 9. Reglas de calidad visual
- Jerarquia clara de informacion
- Contraste minimo AA para texto
- Mensajes de error breves y directos
- Maximo 2 acentos de color por pantalla
- Espaciado consistente con la escala definida

## 10. Criterios mobile-first
- Frames de referencia: 360x800 y 412x915
- Respeto de zonas seguras superior e inferior
- Objetivos tactiles minimos 44x44
- Scroll y teclado contemplados en formularios

## 11. Plan de 3 dias

### Dia 1 - UX base + wireframes
Objetivo:
- Cerrar estructura y navegacion completa.

Tareas:
1. Definir objetivos por pantalla.
2. Dibujar wireframes low-fi con al menos 2 variantes en pantallas clave.
3. Cerrar flujo de navegacion principal y offline.

Entregable:
- Wireframes aprobados.
- Flujo principal aprobado.
- Lista de dudas UX acotada.

Criterios de aprobacion:
1. No hay pantallas huerfanas.
2. Cada pantalla tiene estado normal y error.
3. Flujo principal explicable en menos de 60 segundos.
4. Maximo 3 dudas UX abiertas con responsable.

Senales de rechazo:
- Falta flujo offline.
- Home sin foco en credencial principal.
- Modal de credencial sin QR y acciones.

### Dia 2 - UI final + sistema visual
Objetivo:
- Convertir wireframes aprobados en interfaz consistente.

Tareas:
1. Definir tokens visuales.
2. Crear biblioteca minima de componentes.
3. Disenar pantallas high-fi con variantes de estado.

Entregable:
- Sistema visual base terminado.
- Pantallas principales high-fi completas.
- Estados criticos cubiertos.

Criterios de aprobacion:
1. Todas las pantallas usan los mismos tokens.
2. Componentes criticos con variantes definidas.
3. Legibilidad y contraste correctos.
4. Consistencia de margenes, titulos y jerarquia.

Senales de rechazo:
- Estilos sueltos fuera del sistema.
- Componentes duplicados sin criterio.
- Estados offline/error incompletos.

### Dia 3 - Prototipo + microinteracciones + QA
Objetivo:
- Entregar handoff claro y accionable.

Tareas:
1. Armar prototipo navegable end-to-end.
2. Definir microinteracciones clave.
3. Ejecutar QA final de handoff.

Entregable:
- Prototipo validado.
- Biblioteca de componentes lista.
- Guia de comportamiento y uso visual.

Criterios de aprobacion:
1. Implementacion posible sin dudas visuales mayores.
2. Estados criticos cubiertos (loading, vacio, error, offline, exito).
3. Flujo completo sin cortes.
4. Reglas de uso de componentes y tokens documentadas.

Senales de rechazo:
- Sin notas de comportamiento.
- Errores de red no contemplados en flujo.
- Componentes sin especificacion de estados.

## 12. Revision diaria de 15 minutos

Bloque 1 (0-2 min):
- Que se completo ayer
- Que quedo bloqueado
- Que se cierra hoy

Bloque 2 (2-6 min):
- Verificacion de entregables del dia
- Cobertura de pantallas criticas
- Cobertura de estados criticos

Bloque 3 (6-10 min):
- QA visual rapido
- Consistencia de tipografia, espaciado y componentes
- Legibilidad y contraste

Bloque 4 (10-12 min):
- Riesgos y decisiones pendientes
- Dependencias externas

Bloque 5 (12-15 min):
- Top 3 tareas del dia con responsable
- Criterio de aceptacion por tarea
- Hora de checkpoint

## 13. Semaforo de avance
- Verde: avanzar
- Amarillo: avanzar con observaciones documentadas
- Rojo: no avanzar hasta resolver inconsistencia critica

## 14. Scorecard de cierre diario
Puntuar de 0 a 2 por categoria:
- Alcance
- Calidad visual y UX
- Consistencia
- Riesgos abiertos
- Listo para siguiente fase

Interpretacion:
- 8 a 10: aprobado
- 6 a 7: aprobado con observaciones
- 0 a 5: no aprobado

## 15. Entregable final esperado
- Sistema de diseno base (tokens + componentes)
- 6 pantallas principales en alta fidelidad
- Prototipo navegable completo
- Notas de comportamiento para handoff a desarrollo

## 16. Anexo A - Auditoria visual inicial (estado actual)
Fecha de auditoria: 16 de abril de 2026
Alcance: revision de tema global y pantallas clave (Login/Home)

Hallazgos positivos:
- Existe sistema de tema centralizado con soporte Light/Dark.
- Hay contrato tipado de colores (`ThemeColors`) y proveedor global de tema.
- La app ya consume `useTheme()` en componentes clave.
- La base actual permite escalar a design tokens sin rehacer arquitectura.

Deuda visual detectada:
- Mezcla de colores hardcodeados con colores del tema en estilos de pantalla.
- Falta escala tipografica formal (tamanos/pesos como tokens).
- Falta escala de espaciado unificada (padding/margin dispersos).
- Falta tokenizacion de radios y elevaciones para estandarizar componentes.

Riesgos UX si no se corrige:
- Inconsistencias visuales entre pantallas y estados.
- Mayor costo de mantenimiento al crecer funcionalidades.
- Dificultad para evolucionar identidad visual sin regresiones.

Prioridades de correccion (sin implementar aun):
1. Definir tokens de tipografia.
2. Definir tokens de espaciado.
3. Definir tokens de bordes/radios/sombras.
4. Eliminar hardcodes de color en pantallas prioritarias.
5. Validar contraste y legibilidad en estados de error/offline.

Pantallas con prioridad de normalizacion visual:
1. LoginScreen
2. HomeScreen
3. CredencialCard

Definicion propuesta de tokens base:
- Tipografia: xs (11), sm (13), base (15), md (17), lg (20), xl (24)
- Pesos: regular (400), medium (500), semibold (600), bold (700)
- Espaciado: 4, 8, 12, 16, 20, 24, 32, 48
- Radios: 6, 10, 16, 24, full

Criterio de salida del Paso 0:
- Documento validado por negocio/diseno.
- Tokens base aprobados.
- Lista de pantallas para refactor visual priorizada.
- Sin cambios de codigo en esta fase.

---
Documento orientado a ejecucion de diseno. No incluye implementacion tecnica en codigo.
