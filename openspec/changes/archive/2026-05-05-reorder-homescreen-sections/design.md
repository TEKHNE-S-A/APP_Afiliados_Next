## Context

`HomeScreen.tsx` renderiza actualmente las secciones en este orden dentro del `<ScrollView>`:
1. Credencial del titular (con modal de QR)
2. Estadísticas del dashboard (saldo, próximo turno)
3. `<NoticiasSection>` — Novedades
4. `<View quickAccessSection>` — Acceso Rápido
5. `<View tramitesSection>` — Trámites

El cambio consiste exclusivamente en reordenar los bloques JSX correspondientes a esas secciones.

## Goals / Non-Goals

**Goals:**
- Mover el bloque `tramitesSection` para que aparezca después del dashboard y antes de `quickAccessSection`.
- Mover `quickAccessSection` para que aparezca después de `tramitesSection`.
- Dejar `NoticiasSection` al final del scroll.

**Non-Goals:**
- No modificar estilos, props, lógica de negocio ni navegación de ninguna sección.
- No agregar ni eliminar secciones.
- No cambiar el comportamiento del modal de credencial.

## Decisions

**Decisión única**: Reordenar bloques JSX en el archivo `HomeScreen.tsx`.

Nuevo orden de renderizado dentro del `<ScrollView>`:
1. Credencial del titular + estadísticas del dashboard (sin cambios)
2. `<View tramitesSection>` — Trámites
3. `<View quickAccessSection>` — Acceso Rápido
4. `<NoticiasSection>` — Novedades

No se evalúan alternativas porque el cambio es exclusivamente visual/orden de JSX.

## Risks / Trade-offs

- [Riesgo mínimo]: El cambio es de bajo riesgo al ser solo reordenamiento de JSX sin modificar lógica.
- [Scroll position]: Los usuarios habituados al orden anterior deberán adaptarse al nuevo orden — se acepta como mejora de UX.
