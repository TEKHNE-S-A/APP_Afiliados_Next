# Plan de Rediseño de Web Panels Admin (Accesibilidad + Navegación)

Fecha: 27/03/2026
Última actualización: 06/04/2026
Estado: En ejecución (Fase 0 cerrada, Fase 1 cumplida y Fase 1.1 Sprint 2 completado)
Objetivo: mejorar de forma sustancial la experiencia de uso de los paneles admin del backend, reduciendo fricción de navegación y elevando accesibilidad a un baseline WCAG AA.

## 1) Problema actual

Se detectan tres problemas principales:

- Navegación inconsistente entre paneles (cada HTML tiene su propio menu y estilos).
- Mala descubribilidad de funciones (no hay arquitectura de informacion unica).
- Accesibilidad insuficiente (foco, landmarks, formularios, modales, feedback dinamico).

## 2) Objetivos de la mejora

- Unificar la navegacion en todos los paneles admin.
- Mejorar la encontrabilidad de funciones (menu por dominios + breadcrumb).
- Reducir duplicacion tecnica de HTML/CSS/JS compartido.
- Garantizar navegacion por teclado y soporte semantico basico para lectores de pantalla.
- Permitir despliegue gradual sin romper rutas actuales.

## 3) Alcance inicial

Paneles a cubrir en la primera ola:

- `admin-usuarios.html`
- `admin-parametros.html`
- `admin-credenciales.html`

Paneles a migrar en segunda ola:

- `admin-noticias.html`
- `admin-planes.html`
- `admin-historial-atencion.html`
- `admin-info-util.html`
- `admin-cartilla.html`
- `admin-notificaciones.html`
- `admin-analytics.html`
- `admin-soporte.html`
- `admin-diagnostico.html`

## 4) Arquitectura objetivo

### 4.1 Shell comun de admin

Crear base reutilizable en `backend/public/admin-shell/`:

- `admin-shell.css` (layout, tipografia, colores, componentes base)
- `admin-shell.js` (auth fetch, toasts, estados globales, utilidades A11y)
- `admin-nav.js` (menu lateral, breadcrumb, item activo, favoritos/recentes)

### 4.2 Estructura de navegacion

Menu lateral por dominios:

- Operacion: Usuarios, Soporte, Diagnostico
- Contenido: Noticias, Info util, Cartilla
- Configuracion: Parametros, Planes, Credenciales
- Monitoreo: Notificaciones, Analitica, Historial

Topbar:

- Buscador de modulos
- Accesos recientes
- Acciones rapidas

### 4.3 Compatibilidad

- Mantener rutas actuales (`/admin/...`) para no romper bookmarks ni procesos de soporte.
- Cambiar solo el render/layout, no los endpoints de negocio.

## 5) Criterios de accesibilidad (baseline obligatorio)

- Landmarks semanticos: `header`, `nav`, `main`, `footer`.
- Link de salto: "Saltar al contenido principal".
- Navegacion por teclado completa (Tab, Shift+Tab, Enter, Escape).
- Foco visible consistente en enlaces, botones, inputs y tablas.
- Modales con trap de foco y cierre con Escape.
- Formularios con `label` asociado y mensajes de error por campo.
- `aria-live` para feedback de exito/error.
- Contraste minimo AA en textos e indicadores de estado.

## 6) Plan de implementacion por fases

### Actualización ejecutiva (30/03/2026)

- Cobertura transversal base (A11y shell): `skip-link`, `breadcrumb` y `footer role="contentinfo"` en 12/12 paneles.
- Navegación y sesión: menú/cabecera unificados por `admin-nav.js` + `admin-shared.js`.
- Logout: estandarizado visualmente en rojo y alineado a la derecha en los paneles principales.

Top 10 hallazgos vigentes (post normalización):

| ID | Hallazgo vigente | Sev | Plan técnico |
|----|------------------|-----|--------------|
| R01 | Alto uso de estilos inline en paneles de ola 2 | MEDIA | Extraer a `admin-shared.css` por lotes temáticos |
| R02 | Bloques `<style>` extensos por panel | MEDIA | Modularizar estilos por componentes (`cards`, `toolbar`, `tables`) |
| R03 | Variación de micro-layout en headers (`header-top`, wrappers inline) | MEDIA | Crear utilidades layout en CSS compartido y reemplazar inline |
| R04 | Confirm/prompt aún heterogéneo en algunos flujos | MEDIA | Forzar wrapper único `adminConfirm/adminPrompt` en todos los casos |
| R05 | Mensajes de error de login con estilos inline | BAJA | Componente `alert` compartido para login/error |
| R06 | Botones secundarios con colores inline en tablas | BAJA | Tokenizar variantes `btn-soft`, `btn-warn`, `btn-edit` |
| R07 | Métricas visuales no centralizadas (spacing/radius/shadows) | BAJA | Completar design tokens y usar sólo variables |
| R08 | Densidad visual alta en paneles grandes (Credenciales/Historial) | MEDIA | Ajustar jerarquía visual y responsive breakpoints |
| R09 | Inconsistencia menor en textos auxiliares del header | BAJA | Estandarizar subtítulos con clase `.muted` |
| R10 | Falta checklist de regresión visual automatizada | MEDIA | Agregar script visual smoke (capturas + diff básico) |

Plan técnico inmediato (sprint siguiente):

1. Sprint A: eliminar inline styles en `admin-noticias.html`, `admin-historial-atencion.html`, `admin-planes.html`.
2. Sprint B: eliminar inline styles en `admin-usuarios.html` y `admin-info-util.html`.
3. Sprint C: hardening final de estilos compartidos y cierre de deuda R01-R04.

## Fase 0 - Diagnostico (1 dia)

Entregables:

- Inventario de paneles y de componentes repetidos.
- Mapa de navegacion actual vs objetivo.
- Checklist A11y inicial por pantalla (estado base).

Pruebas:

- Recorrido manual de todas las rutas admin.
- Verificacion de flujo login y sesion.

Criterio de salida:

- Documento de brechas validado con equipo. ✅ **COMPLETADO** (27/03/2026 — ver ADMIN_WEBPANELS_PHASE0_CHECKLIST.md)

## Fase 1 - Fundacion UX tecnica (2 a 3 dias)

### Top 10 hallazgos que guían esta fase

| ID | Hallazgo | Sev | Tarea Fase 1 |
|----|----------|-----|--------------|
| H01 | Menú inconsistente (3 listas distintas, sin ítem activo) | ALTA | T1, T2 |
| H02 | admin-credenciales usa auth propio (doLogin) fuera de AdminSession | ALTA | T3 |
| H03 | Sin landmarks semánticos en ningún panel | ALTA | T4 |
| H04 | Sin skip link "Saltar al contenido" | MEDIA | T4 |
| H05 | Modales sin role=dialog, aria-modal, trap de foco ni Escape | ALTA | T5 |
| H06 | Sistema de feedback no unificado (3 patrones distintos) | ALTA | T6 |
| H07 | Tablas sin scope="col" en `<th>` | MEDIA | T7 |
| H08 | Sin breadcrumb de orientación | MEDIA | T2 |
| H09 | Sin variables CSS / design tokens | MEDIA | T8 |
| H10 | Sin aria-live para acciones dinámicas | MEDIA | T6 |

---

### Tareas concretas de Fase 1

#### T1 — Menú canónico en admin-nav.js

Estado: ✅ Implementado en paneles piloto usando `admin-shared.js` + `.nav-links` canónico (27/03/2026).

**Archivo**: `backend/public/admin-shell/admin-nav.js` (nuevo)

Items canónicos por dominio:
```
Operacion:    👥 Usuarios (/admin/usuarios), 🧾 Soporte (/admin/soporte), 🌐 Diagnóstico (/admin/diagnostico)
Contenido:    📣 Noticias (/admin/noticias), 📌 Info útil (/admin/info-util-ui), 🗺️ Cartilla (/admin/cartilla)
Config:       ⚙️ Parámetros (/admin), 📋 Planes (/admin/planes-ui), 🎨 Credenciales (/admin/credenciales)
Monitoreo:    🔔 Notificaciones (/admin/notificaciones), 📊 Analítica (/admin/analytics), 📜 Historial (/admin/historial-atencion)
```

Comportamiento:
- Detectar ruta actual con `window.location.pathname`
- Agregar clase `.nav-active` al ítem cuya href coincide
- Colapsar/expandir grupos en resoluciones < 900px

Criterio de aceptación: navegar a cualquiera de los 3 paneles piloto muestra el mismo menú con el ítem correcto activo.

---

#### T2 — Breadcrumb en admin-nav.js

Estado: ✅ Implementado con `renderBreadcrumb()` en `admin-shared.js` y placeholder `#adminBreadcrumb` en los 3 paneles piloto (27/03/2026).

**Archivo**: `backend/public/admin-shell/admin-nav.js` (en T1)

Mapa de rutas → etiquetas de breadcrumb:
```js
const BREADCRUMB_MAP = {
  '/admin':                   ['Admin', 'Parámetros'],
  '/admin/usuarios':          ['Admin', 'Operación', 'Usuarios'],
  '/admin/credenciales':      ['Admin', 'Configuración', 'Credenciales'],
  '/admin/cartilla':          ['Admin', 'Contenido', 'Cartilla'],
  // ... resto de paneles
};
```

Renderizado: `<nav aria-label="Migas de pan"><ol class="breadcrumb">...</ol></nav>`

Criterio de aceptación: cada panel piloto muestra breadcrumb correcto con landmark `aria-label`.

---

#### T3 — Migrar admin-credenciales a initAdminPanelAuth

Estado: ✅ Implementado en `admin-credenciales.html` con sesión compartida (`AdminSession` + `initAdminPanelAuth`) y logout centralizado (27/03/2026).

**Archivo**: `backend/public/admin-credenciales.html`

Cambios:
1. Eliminar funciones `doLogin()`, `doLogout()`, y bloque login local.
2. Reemplazar por `initAdminPanelAuth({ appId: 'credenciales', ... onReady(token, user) { ... } })`.
3. Reemplazar `authToken` local por el token que pasa `onReady`.
4. Verificar que al loguearse en cualquier otro panel, Credenciales también quede logueado (AdminSession compartida).

Criterio de aceptación: login en `/admin/usuarios` → navegar a `/admin/credenciales` sin pedir login nuevamente.

---

#### T4 — Landmarks semánticos + skip link en shell HTML

Estado: ✅ Implementado en los 3 paneles piloto (27/03/2026).

**Afecta**: los 3 paneles piloto (y todos los demás en ola 2).

Estructura objetivo de cada panel:
```html
<a href="#main-content" class="skip-link">Saltar al contenido principal</a>
<header role="banner"> ... </header>
<div class="admin-layout">
  <nav aria-label="Navegación principal"> ... menú canónico ... </nav>
  <main id="main-content"> ... contenido del panel ... </main>
</div>
<footer role="contentinfo"> ... </footer>
```

CSS para skip link (en admin-shell.css):
```css
.skip-link { position: absolute; top: -40px; left: 0; }
.skip-link:focus { top: 0; }
```

Criterio de aceptación: Tab desde inicio llega directo al skip link; activarlo salta a `#main-content`.

---

#### T5 — Helper de modales accesibles en admin-shell.js

Estado: ✅ Implementado en los modales de Usuarios y Parámetros (27/03/2026).

**Archivo**: `backend/public/admin-shell/admin-shell.js` (nuevo)

Función `openModal(modalEl, triggerEl)`:
- Agrega `role="dialog"`, `aria-modal="true"`, `aria-labelledby` al modal.
- Mueve foco al primer elemento focusable del modal.
- Encierra el foco dentro del modal (trap: Tab/Shift+Tab circulares).
- Listener `keydown: Escape` cierra el modal y devuelve foco a `triggerEl`.

Función `closeModal(modalEl, triggerEl)`:
- Oculta el modal.
- Devuelve foco a `triggerEl`.
- Elimina listeners temporales de trap.

Criterio de aceptación: abrir modal en Usuarios o Parámetros → Escape cierra → foco regresa al botón que lo abrió.

---

#### T6 — showToast unificado + aria-live en admin-shell.js

Estado: ✅ Implementado en paneles piloto: funciones compartidas en `admin-shared.js` + uso operativo en Usuarios, Parámetros y Credenciales (27/03/2026).

**Archivo**: `backend/public/admin-shell/admin-shell.js`

Rescatar implementación de admin-credenciales y generalizarla:
```js
// En init: inyectar en <body>
// <div id="toast-container" aria-live="polite" aria-atomic="false"></div>
// <div id="a11y-announcer" class="sr-only" aria-live="assertive" aria-atomic="true"></div>

function showToast(message, type = 'info', duration = 4200) { ... }
function announceA11y(message) { ... } // para lectores de pantalla
```

Tipos: `success`, `error`, `warning`, `info`.

Actualizar admin-usuarios y admin-parametros:
- Reemplazar `div#loginError` estático por `showToast(msg, 'error')`.
- Llamar `showToast('Usuario activado', 'success')` tras acciones CRUD exitosas.
- Llamar `showToast('Error al activar usuario', 'error')` en catch blocks (hoy solo van a `console.error`).

Criterio de aceptación: activar usuario en Usuarios muestra toast verde; error de backend muestra toast rojo.

---

#### T7 — scope="col" en tablas

Estado: ✅ Implementado en los 3 paneles piloto; además se agregaron `aria-label` a inputs inline en Credenciales (27/03/2026).

**Afecta**: todos los `<th>` de encabezado en los 3 paneles.

Cambio simple en cada panel:
```html
<!-- antes -->
<th>Nombre</th>
<!-- después -->
<th scope="col">Nombre</th>
```

Para tablas con inputs inline en admin-credenciales, agregar también `aria-label` a cada input:
```html
<input type="number" aria-label="Posición X para campo {{nombre}}">
```

Criterio de aceptación: 0 headers de tabla sin `scope` en los 3 paneles piloto.

---

#### T8 — Design tokens en admin-shell.css

Estado: ✅ Implementado en `admin-shared.css` con bloque `:root` + utilidades a11y/toast (27/03/2026).

**Archivo**: `backend/public/admin-shell/admin-shell.css` (nuevo)

Variables CSS basadas en la paleta existente (unificar inconsistencias):
```css
:root {
  /* Colores */
  --color-primary:     #667eea;
  --color-primary-dark:#5a67d8;
  --color-success:     #28a745;
  --color-danger:      #dc3545;
  --color-warning:     #ffc107;
  --color-info:        #3498db;
  --color-text:        #333;
  --color-text-muted:  #666;
  --color-border:      #dee2e6;
  --color-bg:          #f8f9fa;
  --color-surface:     #ffffff;

  /* Tipografía */
  --font-family:       'Segoe UI', system-ui, sans-serif;
  --font-size-sm:      0.875rem;
  --font-size-base:    1rem;
  --font-size-lg:      1.125rem;

  /* Espaciado */
  --space-xs:  0.25rem;
  --space-sm:  0.5rem;
  --space-md:  1rem;
  --space-lg:  1.5rem;
  --space-xl:  2rem;

  /* Bordes */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;

  /* Sombras */
  --shadow-sm: 0 1px 3px rgba(0,0,0,.1);
  --shadow-md: 0 4px 12px rgba(0,0,0,.15);

  /* Foco accesible */
  --focus-ring: 0 0 0 3px rgba(102,126,234,.45);
}
```

Reemplazar colores hardcodeados en los 3 paneles piloto por variables.

Criterio de aceptación: cambiar `--color-primary` afecta simultáneamente header, botones y badges en los 3 paneles.

---

### Orden de implementación sugerido

```
Día 1 (mañana):  T8 (admin-shell.css con tokens)
                 T4 (landmarks + skip link en los 3 paneles)
Día 1 (tarde):   T1 + T2 (admin-nav.js con menú canónico + breadcrumb)
Día 2 (mañana):  T5 (openModal/closeModal en admin-shell.js)
                 T6 (showToast + aria-live en admin-shell.js)
Día 2 (tarde):   T3 (migrar auth de admin-credenciales)
                 T7 (scope="col" en tablas)
Día 3:           Smoke test de los 3 paneles piloto (navegación, CRUD, teclado, screen reader básico)
                 Ajustes y documentación
```

### Criterio de salida de Fase 1

- [x] Shell común (admin-shared.css/admin-shared.js activos; navegación y breadcrumb unificados en pilotos).
- [x] Los 3 paneles piloto usan base compartida + landmarks + menú unificado.
- [x] Score de accesibilidad >= 7/10 en cada panel piloto.
- [x] Login unificado: sesión compartida entre los 3 paneles.
- [x] CRUD con feedback toast en Usuarios, Parámetros y Credenciales.
- [x] Modales accesibles (Escape + trap de foco) en Usuarios y Parámetros.
- [x] 0 errores JS reportados por analizador tras cambios.

Score post-implementación (27/03/2026):
- admin-usuarios: 8/10
- admin-parametros: 8/10
- admin-credenciales: 7.5/10
- promedio: 7.8/10

Entregables:

- Shell comun (`admin-shell.css`, `admin-shell.js`, `admin-nav.js`).
- Home de administracion con accesos por dominio.
- Sidebar + breadcrumb + topbar funcionando.

Pruebas:

- Carga de shell en desktop y resoluciones mobile/tablet.
- Navegacion entre modulos sin errores JS en consola.
- Verificacion de item activo y breadcrumb correcto.

Criterio de salida:

- Estructura comun estable para migrar paneles.

## Backlog Técnico Ejecutable (Post Fase 1)

Objetivo: convertir observaciones remanentes en tareas implementables para sprint inmediato.

### Tickets priorizados

| ID | Prioridad | Tarea | Archivos principales | Estimación | Dependencias | Criterio de aceptación |
|----|-----------|-------|----------------------|------------|--------------|------------------------|
| B001 | P0 | Reemplazar `confirm()` y `prompt()` por modal accesible reutilizable | `backend/public/admin-shared.js`, `backend/public/admin-usuarios.html`, `backend/public/admin-parametros.html` | 6h | Ninguna | 0 usos de `confirm/prompt` en pilotos; modal con Escape + trap + retorno de foco |
| B002 | P0 | Extraer estilos inline críticos de Credenciales a estilos compartidos | `backend/public/admin-credenciales.html`, `backend/public/admin-shared.css` | 8h | B001 recomendado | Reducir >=80% de inline styles del header/toolbar/login en Credenciales |
| B003 | P1 | Crear `admin-nav.js` dedicado y mover navegación/breadcrumb desde shared.js | `backend/public/admin-nav.js` (nuevo), `backend/public/admin-shared.js` | 4h | Ninguna | `renderBreadcrumb` y lógica de menú activo viven en `admin-nav.js` |
| B004 | P1 | Unificar estructura de login admin en paneles migrados (componente común) | `backend/public/admin-shared.js`, `backend/public/admin-usuarios.html`, `backend/public/admin-parametros.html`, `backend/public/admin-credenciales.html` | 6h | B001 | Login UI y comportamiento consistentes en los 3 paneles |
| B005 | P1 | Añadir estado de foco inicial post-login en `main-content` | `backend/public/admin-shared.js` | 2h | Ninguna | Tras login/restore, foco queda en `#main-content` o primer heading |
| B006 | P1 | Agregar métricas de UX/A11y en consola para smoke tests | `backend/public/admin-shared.js` | 3h | Ninguna | Log opcional (`window.__ADMIN_DEBUG`) con eventos: openModal, closeModal, toast, breadcrumb |
| B007 | P2 | Estandarizar naming de clases visuales por dominio (botones, chips, badges) | `backend/public/admin-shared.css`, pilotos HTML | 5h | B002 | Diccionario de clases único sin variantes ad-hoc por panel |
| B008 | P2 | Checklist QA automatizable (script) para validación de estructura mínima | `scripts/` (nuevo script ps1/js), docs existentes | 5h | B001-B003 recomendados | Script valida: skip-link, nav, main, footer, scope, modal ARIA |

### Estado de ejecución (27/03/2026)

| Ticket | Estado | Evidencia |
|--------|--------|-----------|
| B001 | ✅ Hecho | `adminConfirm/adminPrompt` en `admin-shared.js`; 0 usos de `confirm/prompt` en pilotos |
| B002 | ✅ Hecho | 0 atributos `style="..."` en `admin-credenciales.html`; clases movidas a `admin-shared.css` |
| B003 | ✅ Hecho | `admin-nav.js` creado y conectado en pilotos; `admin-shared.js` desacoplado de nav/breadcrumb |
| B004 | ✅ Hecho | `adminBindLoginForm` implementado y usado en los 3 pilotos |
| B005 | ✅ Hecho | Foco inicial post login/restore en `#main-content` vía `_focusMainContent()` |
| B006 | ✅ Hecho | Instrumentación opcional `window.__ADMIN_DEBUG` en `admin-shared.js` y `admin-nav.js` |
| B007 | ✅ Hecho | Clases visuales compartidas (`action-buttons`, `admin-chip`, `cell-actions`, `control-group-actions`) aplicadas en `admin-parametros.html` + primer pase ola 2 en `admin-info-util.html` y `admin-cartilla.html` |
| B008 | ✅ Hecho | Script `scripts/admin-panels-qa.js` ejecutado en verde para los 3 pilotos + regla anti regresión de clases legacy (`btn-edit`, `btn-delete`, `badge-grupo`, `actions`) + modo `--all` (higiene) en verde para todos los `admin-*.html` |

### Corte QA global estricto (27/03/2026)

- Comando: `node scripts/admin-panels-qa.js --all-strict`
- Resultado global: **OK (sin fallas)**.
- Paneles 100% OK en estricto: todos los `admin-*.html` activos del backend.
- Cierre de brecha estructural: shell semántico común + scripts compartidos + `scope="col"` completo en todas las tablas auditadas.
- Higiene ya cerrada transversalmente: 0 usos de `confirm()/prompt()` nativos y 0 clases visuales legacy (`btn-edit`, `btn-delete`, `badge-grupo`, `actions`) en todos los `admin-*.html`.

### Actualizacion Sprint de limpieza (30/03/2026)

- Sprint A: ✅ completado. Limpieza de inline styles en `admin-noticias.html`, `admin-historial-atencion.html` y `admin-planes.html`.
- Sprint B: ✅ completado. Limpieza de inline styles en `admin-usuarios.html` y `admin-info-util.html`.
- Sprint C: ✅ completado. Consolidacion de utilidades repetidas en `admin-shared.css` y remocion de duplicados locales en paneles ola 2.
- Post Sprint C: ✅ completado. Limpieza adicional de inline styles en `admin-cartilla.html` y `admin-notificaciones.html` (incluyendo templates JS), manteniendo QA estricto en verde.
- Post Sprint C.1: ✅ completado. Limpieza de inline styles remanentes en `admin-parametros.html` y `admin-soporte.html`.
- Post Sprint C.2: ✅ completado. Eliminado el último inline style de `admin-historial-atencion.html` usando `data-width` + variable CSS; estado final: 0 usos de `style="..."` en `backend/public/admin-*.html`.
- Validacion de cierre: `node scripts/admin-panels-qa.js --all-strict` con resultado global **OK (sin fallas)**.

### Actualización backlog vigente (31/03/2026)

Diagnóstico puntual sobre paneles piloto (`admin-usuarios`, `admin-parametros`, `admin-credenciales`):

- Lo crítico de Fase 1 quedó resuelto (navegación, sesión compartida, baseline a11y, toasts base).
- El backlog actual ya no es de features, sino de **consolidación técnica**: reducir duplicación JS/CSS y unificar capas de infraestructura UI.

Prioridades activas:

1. P0: unificar transporte HTTP y manejo de sesión en pilotos con `adminAuthFetch` (quitar `fetch` directo).
2. P0: centralizar completamente lógica modal/foco en shared para eliminar duplicados por panel.
3. P1: consolidar CSS de componentes recurrentes (login, stats, table, modal) y bajar tamaño de `<style>` locales.
4. P1: cerrar gaps A11y de detalle (`label for/id` en login de Credenciales; semántica de tags custom en Usuarios).
5. P1: resolver densidad/responsive de la tabla editable de Credenciales.
6. P1: agregar smoke visual automatizado de paneles admin para detectar regresiones de layout.

Plan de ejecución sugerido (Fase 1.1):

- Sprint 1 (3-4 días): P0 de JS compartido (`adminAuthFetch` + modal shared + errores visibles).
- Sprint 2 (2-3 días): P1 de CSS/A11y/responsive en pilotos.
- Sprint 3 (1-2 días): smoke visual automatizado + recertificación QA (`--all-strict` + teclado).

### Estado Sprint 2 (31/03/2026)

Completado en pilotos:

- Consolidación CSS compartida (R05, R06): se movieron reglas comunes a `admin-shared.css` y se recortaron bloques locales en Usuarios/Parámetros.
- Ajustes A11y/semántica (R07, R08): labels `for/id` en login de Credenciales y remoción de etiqueta custom `<value>` en Usuarios.
- Responsive de tabla densa (R09): mejora de usabilidad en Credenciales con primera columna sticky y pista visual de scroll.
- Validación final de sprint: `node scripts/admin-panels-qa.js --all-strict` en verde para 12/12 paneles.

Resultado:

- Sprint 2 cerrado.
- Fase 1.1 avanza a Sprint 3 con foco en regresión visual automatizada (R10).

### Inicio Sprint 3 (31/03/2026)

Acción inicial:

- Incorporar script `scripts/admin-panels-visual-smoke.js` para capturas por ruta admin y comparación contra baseline local.

Comandos base:

- `node scripts/admin-panels-visual-smoke.js --mode baseline`
- `node scripts/admin-panels-visual-smoke.js --mode compare`

### Cierre Sprint 3 (06/04/2026)

Resultado del sprint:

- Smoke visual habilitado y ejecutado con Playwright (baseline + compare).
- Compare en verde para paneles piloto (`/admin`, `/admin/usuarios`, `/admin/credenciales`).
- QA estructural `--all-strict` revalidado en verde para 12/12 paneles.

Estado de Fase 1.1:

- ✅ Cierre técnico automatizado completado.
- 🟡 Pendiente de registro operativo: checklist manual de teclado en pilotos.

### Plan de ejecución sugerido (2 sprints)

#### Sprint A (hardening inmediato)

1. B001
2. B002
3. B005
4. B008

Meta Sprint A:
- Cerrar observaciones pendientes de accesibilidad y consistencia visual en pilotos.

#### Sprint B (consolidación arquitectura)

1. B003
2. B004
3. B006
4. B007

Meta Sprint B:
- Dejar base reusable para ola 2 sin duplicación técnica.

### Definición de terminado (DoD) por ticket

- Código en paneles piloto sin errores de análisis estático.
- Prueba manual de teclado documentada (Tab, Shift+Tab, Enter, Escape).
- Evidencia funcional mínima: navegación, login, CRUD principal, feedback.
- Actualización de este plan con estado (`Pendiente`, `En progreso`, `Hecho`).

### Riesgos y mitigación

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Regresión al tocar login compartido | Alto | Feature flag local + prueba cruzada en los 3 pilotos |
| Inconsistencias visuales al extraer inline styles | Medio | Migración incremental por bloques (header, toolbar, tabla) |
| Reaparición de patrones legacy en nuevos paneles | Medio | Script B008 + checklist obligatorio en PR |

## Fase 2 - Migracion ola 1 (2 a 3 dias)

Entregables:

- Migracion de `admin-usuarios.html`, `admin-parametros.html`, `admin-credenciales.html` al shell.
- Unificacion de estilos de tablas, formularios, botones y toasts.

Pruebas:

- Smoke test de CRUD en cada panel migrado.
- Prueba de teclado completa en los 3 paneles.
- Prueba de mensajes de error y estados de carga.

Criterio de salida:

- 3 paneles productivos con nueva UX sin regresiones funcionales.

## Fase 3 - Migracion ola 2 (3 a 5 dias)

Entregables:

- Migracion del resto de paneles admin al shell.
- Buscador de modulos + recientes + acciones rapidas.

Pruebas:

- Smoke test por panel.
- Verificacion de navegacion cruzada y persistencia de estado de filtros donde aplique.

Criterio de salida:

- Todo el ecosistema admin bajo layout/navegacion unica.

## Fase 4 - Endurecimiento A11y + QA (2 dias)

Entregables:

- Correcciones A11y finales.
- Script/checklist de regresion visual y funcional.
- Recomendacion de automatizacion con Playwright + axe (si se habilita).

Pruebas:

- Checklist WCAG AA manual.
- Pruebas con solo teclado.
- Pruebas de contraste y estados de foco.

Criterio de salida:

- Aprobacion funcional + UX + accesibilidad.

## 7) Matriz de pruebas minima por cada panel

Funcional:

- Login admin exitoso.
- Listado carga correctamente.
- Crear/editar/eliminar (si aplica) sin romper flujo.
- Mensajes de error y exito coherentes.

Navegacion:

- Breadcrumb correcto.
- Item activo del menu correcto.
- Volver a inicio de admin conserva sesion.

Accesibilidad:

- Orden de tabulacion logico.
- Foco visible en todos los controles.
- Formularios con label + ayuda + error legible.
- Modal accesible con Escape y foco confinado.

Responsive:

- Desktop 1366x768.
- Laptop 1280x720.
- Tablet 1024x768.
- Mobile 390x844 (validacion de navegacion, no de uso operativo completo).

## 8) Riesgos y mitigacion

Riesgo: regresion funcional por refactor de HTML/JS.

- Mitigacion: migracion incremental por panel + smoke tests por cada merge.

Riesgo: inconsistencias de estilos heredados.

- Mitigacion: tokenizacion de colores/espaciados en CSS base y deprecacion progresiva de clases legacy.

Riesgo: crecimiento de alcance por mejoras visuales no criticas.

- Mitigacion: priorizar navegacion + accesibilidad + estabilidad antes de mejoras esteticas.

## 9) Definicion de terminado (DoD)

- Todos los paneles usan shell comun.
- Navegacion lateral y breadcrumb consistente.
- Login/sesion/redirect unificados.
- Checklist A11y baseline cumplido en todos los paneles.
- Evidencia de pruebas documentada (capturas + checklist firmado).

## 10) Proximo paso operativo

Comenzar por Fase 0 + Fase 1 y validar con usuarios internos antes de migrar mas paneles.

Sugerencia de orden inmediato:

1. Generar inventario tecnico de repeticion HTML/CSS/JS.
2. Construir shell comun.
3. Migrar `admin-usuarios.html` como panel piloto.
4. Ajustar segun feedback y continuar con `admin-parametros.html` y `admin-credenciales.html`.

## 11) Checklist operativo Fase 0

Para ejecutar y evidenciar el diagnostico inicial usar:

- `ADMIN_WEBPANELS_PHASE0_CHECKLIST.md`

Uso recomendado:

1. Completar una fila por panel evaluado.
2. Adjuntar evidencia breve (captura o nota) por cada hallazgo critico.
3. Marcar severidad (`Alta`, `Media`, `Baja`) para priorizar correcciones.
4. Consolidar top 10 problemas para planificar la Fase 1.

## 12) Resumen de entrega (listo para PR)

Estado actual:

- QA estricto global en verde: `node scripts/admin-panels-qa.js --all-strict`.
- QA de higiene global en verde: `node scripts/admin-panels-qa.js --all`.
- Cobertura total de paneles `admin-*.html` con:
  - shell semántico base (`skip-link`, `main#main-content`, `nav[aria-label]`, `#adminBreadcrumb`, `footer[role="contentinfo"]`)
  - scripts compartidos (`admin-shared.js`, `admin-nav.js`)
  - tablas con `th scope="col"`
  - cero `confirm()/prompt()` nativos
  - cero clases visuales legacy bloqueadas por QA (`btn-edit`, `btn-delete`, `badge-grupo`, `actions`)

Delta funcional del cierre:

- Migración incremental de ola 2 completada para:
  - `admin-noticias.html`
  - `admin-planes.html`
  - `admin-notificaciones.html`
  - `admin-diagnostico.html`
  - `admin-soporte.html`
  - `admin-historial-atencion.html`
  - `admin-info-util.html`
  - `admin-cartilla.html`
  - `admin-analytics.html`

## 13) Checklist smoke manual (post-merge)

Objetivo: validación funcional rápida en entorno local antes de despliegue.

Precondiciones:

1. Backend levantado en `http://localhost:3000`.
2. Login admin operativo (`/admin/login`).
3. Ejecutar QA automático:
  - `node scripts/admin-panels-qa.js --all`
  - `node scripts/admin-panels-qa.js --all-strict`

Recorrido mínimo:

1. Abrir cada panel admin y verificar:
  - navegación visible
  - breadcrumb renderizado
  - foco inicial y `skip-link`
2. Navegar con teclado (`Tab`, `Shift+Tab`, `Enter`, `Escape`) en:
  - `admin-usuarios.html`
  - `admin-parametros.html`
  - `admin-credenciales.html`
3. Ejecutar acciones críticas en paneles operativos:
  - Usuarios: ver detalle + activar/desactivar
  - Parámetros: editar + guardar
  - Cartilla: ver entidad + filtros + paginación
  - Info útil: crear/editar/eliminar item
  - Noticias: crear/editar/eliminar
  - Planes: editar imagen + eliminar imagen
4. Confirmar feedback no bloqueante:
  - toasts/alertas legibles
  - diálogos accesibles en acciones destructivas
5. Verificar cierre de sesión y reingreso en al menos 3 paneles.

Criterio de aceptación manual:

- Sin errores visibles en consola para el flujo principal de cada panel.
- Sin bloqueos de navegación por teclado.
- Sin regresiones de autenticación/sesión compartida.
