## Why

El orden actual de secciones en el HomeScreen (Novedades → Acceso Rápido → Trámites) no refleja la prioridad real de uso del afiliado: las acciones de gestión (Trámites) son más relevantes que el contenido editorial (Novedades), y el acceso a herramientas (Acceso Rápido) debe actuar como puente entre ambos. Reorganizar el orden mejora la usabilidad y reduce la fricción para las tareas más frecuentes.

## What Changes

- La sección **Trámites** se mueve inmediatamente debajo de las credenciales (antes estaba al final).
- La sección **Acceso Rápido** pasa al segundo lugar (antes de Novedades).
- La sección **Novedades** (`NoticiasSection`) queda al final del scroll.
- No se modifica el contenido, estilos ni lógica de ninguna sección, solo el orden de renderizado en el JSX.

## Capabilities

### New Capabilities
- `homescreen-section-order`: Orden visual de secciones en HomeScreen reorganizado según prioridad funcional.

### Modified Capabilities

## Impact

- Archivo afectado: `mobile/src/screens/HomeScreen.tsx` (solo reordenamiento de bloques JSX).
- Sin cambios en componentes, estilos, hooks ni navegación.
- Sin cambios en backend ni APIs.
