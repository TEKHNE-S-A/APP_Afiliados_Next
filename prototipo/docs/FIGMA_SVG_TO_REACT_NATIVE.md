# Guía: Migración de objetos SVG desde Figma a React Native

> Referencia práctica para traducir código SVG exportado de Figma a componentes
> `react-native-svg` dentro de un proyecto Expo/React Native.

---

## Por qué el resultado no es pixel-perfect automáticamente

Figma exporta SVG con coordenadas **absolutas del canvas completo**, no relativas al
elemento individual. Además, varios efectos de Figma no tienen equivalente directo en
React Native. Esta guía documenta cada problema y su solución.

---

## Problema 1 — Coordenadas absolutas del canvas

### Qué ocurre

Figma exporta el path con las coordenadas de su posición dentro del canvas de diseño:

```svg
<!-- Figma exporta esto: el globo de chat vive en x=104..126 del canvas de 412px -->
<svg viewBox="104 12 22 22">
  <path d="M124.125 26C124.125 26.53..." stroke="#fff" strokeWidth="2"/>
</svg>
```

Si el `<Svg>` en React Native mide `sc(22)` px y el viewBox mide 22 unidades, el
escalado es 1:1 y los paths se ven en la posición correcta **dentro del elemento**.
Pero el **stroke** se extiende fuera del bounding box del path → queda a menos de 1 px
del borde del viewBox → **se recorta**.

### Solución: normalizar el viewBox a `(0, 0)` con 1 px de margen

1. Identificar el bounding box real de todos los paths del ícono (sin stroke):
   - `x_min`, `y_min`, `x_max`, `y_max`
2. Calcular el origen de normalización:
   - `ox = x_min - 1` (1 px de margen para el stroke)
   - `oy = y_min - 1`
3. Restar ese origen de **todas las coordenadas** del path.
4. Definir el viewBox como `"0 0 (x_max - ox + 1) (y_max - oy + 1)"`.

**Antes (coordenadas absolutas Figma):**
```tsx
<Svg width={sc(22)} height={sc(22)} viewBox="346 15 22 16">
  <Path d="M348.625 17H366.625" stroke={color} strokeWidth={2} />
  <Path d="M348.625 23H366.625" stroke={color} strokeWidth={2} />
  <Path d="M348.625 29H366.625" stroke={color} strokeWidth={2} />
</Svg>
```

**Después (normalizado, margen 1 px en todos los lados):**
```tsx
// ox = 348.625 - 1 = 347.625  →  restar 347.625 a cada x
// oy = 15       - 1 = 14       →  restar 14 a cada y
<Svg width={sc(22)} height={sc(22)} viewBox="0 0 22 16">
  <Path d="M2 2H20" stroke={color} strokeWidth={2} />
  <Path d="M2 8H20" stroke={color} strokeWidth={2} />
  <Path d="M2 14H20" stroke={color} strokeWidth={2} />
</Svg>
```

---

## Problema 2 — `strokeWidth` se encoge al escalar el viewBox

### Qué ocurre

En SVG, `strokeWidth` se expresa en **unidades del viewBox**, no en píxeles físicos.
Cuando el elemento en pantalla es más pequeño que el viewBox, el stroke se encoge
proporcionalmente:

```
stroke_físico = strokeWidth_svg × min(elem_w / vb_w, elem_h / vb_h)
```

Si el elemento mide `sc(22)` px en pantalla (≈ 22 px en 412 px de ancho) pero el
viewBox es `"0 0 24 24"`, la escala es `22/24 = 0.917` → un `strokeWidth=2` produce
**1.83 px físicos**, no 2.

### Solución: calcular `strokeWidth` con la fórmula inversa

Para obtener exactamente **N px físicos** en pantalla:

```
sw_svg = N × limiting_dim / min(elem_px, vb_dim)
```

Donde `limiting_dim` es la dimensión que limita el escalado (la más grande entre
viewBox y elemento, en la dimensión limitante).

**Fórmula simplificada** para `ICON_SZ = sc(22)` y pantalla de referencia 412 px:

| viewBox | Dimensión limitante | `sw` para 2 px físicos |
|---|---|---|
| `22 × 22` (cuadrado igual) | — | `2.0` |
| `24 × 24` (cuadrado mayor) | 24 | `2 × 24/22 = 2.18` |
| `22 × 24` (altura mayor) | 24 | `2 × 24/22 = 2.18` |
| `22 × 16` (ancho limitante) | 22 | `2.0` |
| `37 × 28` para `ICON_SZ = sc(30)` | 37 | `2 × 37/30 = 2.47` |

**Ejemplo aplicado:**
```tsx
// viewBox 24×24, elemento sc(22)×sc(22) → scale = 22/24 → sw = 2×24/22 = 2.18
<Svg width={sc(22)} height={sc(22)} viewBox="0 0 24 24" fill="none">
  <Path
    d="M12 16V12M12 8H12.01M22 12C22 17.5228..."
    stroke={color}
    strokeWidth={2.18}   // ← no "2"
  />
</Svg>
```

---

## Problema 3 — Gradientes angulares no existen en react-native-svg

### Qué ocurre

Figma soporta gradientes **angulares** (cónicos) y **de diamante**. `react-native-svg`
solo tiene `LinearGradient` y `RadialGradient`.

### Solución: aproximar con `LinearGradient`

Identificar la dirección dominante del gradiente angular y representarla como lineal.
Aceptar que la aproximación no será exacta en las esquinas.

```tsx
// Gradiente angular Figma aprox. 135° → lineal de esquina a esquina
<SvgLinearGradient id="grad" x1="0" y1="0" x2="412" y2="113" gradientUnits="userSpaceOnUse">
  <Stop offset="0"   stopColor="#FFFFFF" stopOpacity="0.2" />
  <Stop offset="0.86" stopColor="#657FB8" stopOpacity="0.2" />
  <Stop offset="1"   stopColor="#3557A2" stopOpacity="0.2" />
</SvgLinearGradient>
```

---

## Problema 4 — Glassmorphism / BlurView

### Qué ocurre

El blur de fondo en Figma es perfecto sobre cualquier capa. `expo-blur` (`BlurView`):
- **iOS**: razonablemente fiel al Figma.
- **Android**: puede verse plano o con artefactos según la versión de API del dispositivo.

### Solución

- Usar `intensity` bajo (8–15) para minimizar diferencias entre plataformas.
- Complementar con un `fill` semitransparente en el SVG para simular el tinte en Android.
- Testear siempre en dispositivo físico Android, no solo en AVD.

---

## Problema 5 — Efectos no soportados en React Native

| Efecto Figma | React Native | Alternativa |
|---|---|---|
| Inner shadow | ❌ no existe | Simular con pseudo-elemento o SVG |
| Drop shadow con blur | Parcial (`shadow*` iOS / `elevation` Android) | `react-native-shadow-2` |
| Blend modes (multiply, overlay…) | ❌ no existe | Pre-renderizar en el diseño |
| Backdrop filter / blur | Solo vía `BlurView` | Aceptar diferencia entre plataformas |
| Stroke align (inside/outside) | Solo `center` | Ajustar coordenadas del path manualmente |

---

## Problema 6 — Escalado dinámico vs canvas fijo

### Qué ocurre

Figma diseña en un canvas fijo (ej. 412 px de ancho). La app escala con:

```ts
const sc = (v: number) => v * SW / 412
```

En dispositivos con `SW ≠ 412`, todos los valores son fracciones. El sub-pixel
rendering varía según OS, densidad de pantalla y GPU.

### Solución

- Siempre redondear con `Math.floor` o `Math.round` los valores de layout que no sean
  tamaños de SVG (paddings, margins, posiciones absolutas de Views).
- Los valores dentro de `viewBox` y `strokeWidth` **no** deben redondearse; deben
  mantener precisión decimal para que el escalado SVG sea correcto.

---

## Checklist de migración de un ícono SVG de Figma

```
[ ] 1. Copiar el path(s) desde el SVG exportado de Figma
[ ] 2. Identificar bounding box real de los paths (sin stroke)
[ ] 3. Calcular origen de normalización: ox = x_min - 1, oy = y_min - 1
[ ] 4. Restar origen de todas las coordenadas del path
[ ] 5. Definir viewBox = "0 0 (ancho+2) (alto+2)"
[ ] 6. Calcular strokeWidth correcto: sw = N_px × limiting_dim / elem_sz
[ ] 7. Verificar que strokeLinecap y strokeLinejoin coinciden con Figma
[ ] 8. Testear en dispositivo real (iOS y Android)
```

---

## Referencia: función de escala y constantes del proyecto

```ts
const { width: SW } = Dimensions.get('window')
const sc = (v: number) => v * SW / 412   // escala desde canvas Figma 412px

// Tamaños de ícono en la barra inferior
const ICON_SZ     = sc(22)  // íconos regulares (Inicio, Avisos, InfoUtil, Más)
const ICON_SZ_FAB = sc(30)  // ícono del FAB central (Credencial)
```

---

## Ejemplo completo: IcoMas (antes y después)

**Figma exporta (coordenadas absolutas, stroke recortado):**
```tsx
<Svg width={sc(22)} height={sc(22)} viewBox="346 15 22 16" fill="none">
  <Path d="M348.625 17H366.625" stroke={color} strokeWidth={2} strokeLinecap="round" />
  <Path d="M348.625 23H366.625" stroke={color} strokeWidth={2} strokeLinecap="round" />
  <Path d="M348.625 29H366.625" stroke={color} strokeWidth={2} strokeLinecap="round" />
</Svg>
```

Problema: margen derecho del stroke = `368 - 367.625 = 0.375 px` → **clip severo**.

**Versión corregida (normalizada, sin clip, 2 px físicos exactos):**
```tsx
// Bounding box paths: x=[348.625, 366.625], y=[17, 29]
// ox = 348.625 - 1 = 347.625  |  oy = 17 - 1 = 16
// Nuevas coords: x=[2, 20], y=[2, 14]  →  viewBox "0 0 22 16"
// viewBox cuadrado igual al elemento → scale=1 → sw=2.0
<Svg width={sc(22)} height={sc(22)} viewBox="0 0 22 16" fill="none">
  <Path d="M2 2H20"  stroke={color} strokeWidth={2} strokeLinecap="round" />
  <Path d="M2 8H20"  stroke={color} strokeWidth={2} strokeLinecap="round" />
  <Path d="M2 14H20" stroke={color} strokeWidth={2} strokeLinecap="round" />
</Svg>
```
