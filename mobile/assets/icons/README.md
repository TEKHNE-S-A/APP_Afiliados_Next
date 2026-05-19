# Íconos SVG

Carpeta para archivos `.svg` exportados directamente desde Figma.

## Cómo agregar un ícono

1. En Figma: seleccionar el frame/componente del ícono → Export → SVG → Export
2. Guardar el archivo `.svg` en esta carpeta (nombre en kebab-case, ej: `ico-inicio.svg`)
3. Importar en el componente:

```tsx
import IcoInicio from '../../assets/icons/ico-inicio.svg'

// Uso (acepta cualquier prop de react-native-svg SvgProps)
<IcoInicio width={22} height={22} color="white" />
// o con fill:
<IcoInicio width={22} height={22} fill="white" />
```

## Notas importantes

- El transformer (`react-native-svg-transformer`) convierte el SVG automáticamente.
- Para stroke dinámico (color del tema), el SVG debe exportarse con `stroke="currentColor"`
  o editar el archivo para reemplazar el color hardcodeado por `{props.color}` NO es posible directamente;
  en ese caso usar la técnica manual documentada en `DOCS/FIGMA_SVG_TO_REACT_NATIVE.md`.
- Para íconos que necesitan `strokeWidth` exacto de 2px físicos, consultar la guía de migración.
