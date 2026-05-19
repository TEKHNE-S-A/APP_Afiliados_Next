# Plantilla de Credencial (Admin)

Fecha: 27/03/2026
Estado: Implementado

## Objetivo

Configurar la visual de la credencial desde backend, con alcance:

- General (aplica a todos los planes)
- Por plan (override sobre general)

No se permite edicion por afiliado individual.

## Backend

### Persistencia

- Tabla: `app_credencial_layout`
- Script: `backend/db/create_app_credencial_layout.sql`
- Alcances soportados: `GENERAL` y `PLAN`

### Endpoints

- `GET /admin/credenciales-layout?scope=GENERAL|PLAN&planId=`
- `PUT /admin/credenciales-layout/general`
- `PUT /admin/credenciales-layout/plan/:id`
- `DELETE /admin/credenciales-layout/plan/:id`

Notas:

- Todas las modificaciones quedan auditadas en `audit_logs`.
- Endpoints de edicion por afiliado en admin credenciales fueron deshabilitados (respuesta `410 Gone`).

## Panel Admin

- UI: `backend/public/admin-credenciales.html`
- URL: `http://localhost:3000/admin/credenciales-ui`

### Funciones principales

- Modo de trabajo General / Plan
- Grilla por campo configurable:
  - `visible`
  - `allowEyeToggle`
  - `x`, `y`
  - `fontFamily`, `fontSize`, `fontWeight`, `fontStyle`, `color`
  - `titlePosition`: `izquierda | superior | inferior | derecha | invisible`
  - `titleFontSize`
- Vista previa en vivo
- Boton para quitar override de plan
- Presets rapidos:
  - `Clasico`
  - `Compacto`
  - `Minimal`

## Mobile

- Componente: `mobile/src/components/CredencialCard.tsx`
- Tipo de datos: `mobile/src/types/credencial.ts`

### Comportamiento

- La card consume `credencialLayout` por campo y aplica posicion, estilo, visibilidad y titulos.
- Se aplica normalizacion de `fontFamily` para Android usando familias seguras (`System`, `sans-serif`, `serif`, `monospace`) para evitar warnings en runtime.
- El plan mostrado en la card usa `crcrepladesc` (descripcion), con fallback al ID tecnico.

## Flujo recomendado de uso

1. Ingresar al panel admin y seleccionar alcance (General o Plan).
2. Editar campos o aplicar preset rapido.
3. Guardar configuracion.
4. Validar en preview web.
5. Validar en app mobile (credenciales y modal).

## Validaciones funcionales minimas

- Cambios de layout general impactan en credenciales sin override de plan.
- Override por plan impacta solo en ese plan.
- Quitar override vuelve a plantilla general.
- `titlePosition=invisible` oculta el titulo en preview y mobile.
- Fuentes no seguras no generan warning visible en Android.
