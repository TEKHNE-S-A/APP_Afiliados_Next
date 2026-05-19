/**
 * BottomTabBarFigma — Barra de navegación inferior
 *
 * Migración fiel desde SVG Figma (viewBox 0 0 412 113).
 *
 * Estructura visual:
 *   - Barra pill (y=35, h=78, rx=39) con glassmorphism + gradiente angular
 *   - Pill activo azul (x=8.5, y=43.5, w=75.75, h=61, rx=30.5) — tab 0
 *   - FAB central elevado (x=176, y=1.5, Ø68) con fill #2A529C + stroke #91A9C8
 *   - 5 tabs: Inicio · Avisos · Credencial · Info útil · Más
 *
 * Implementación:
 *   - react-native-svg  → gradientes del contorno (barra + pill)
 *   - expo-blur         → glassmorphism detrás de la barra
 *   - TouchableOpacity  → área táctil de cada tab
 *   - Todo escala con screenWidth / 412
 */

import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native'
import { BlurView } from 'expo-blur'
import Svg, {
  Rect,
  Path,
  Defs,
  ClipPath,
  LinearGradient as SvgLinearGradient,
  Stop,
  G,
  Image as SvgImage,
} from 'react-native-svg'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { IcoInicio, IcoAvisos, IcoInfoUtil, IcoMas } from './BottomTabButton'
import { ds } from '../theme/ds'
import { API_BASE_URL } from '../config'

// ─── Escala desde el diseño Figma 412px ────────────────────────────────────

const { width: SW } = Dimensions.get('window')
const sc = (v: number) => (v * SW) / 412

// ─── Dimensiones clave (unidades Figma) ────────────────────────────────────

const COMP_H  = sc(113)  // altura total del componente
const BAR_Y   = sc(35)   // origen de la barra
const BAR_H   = sc(78)   // altura de la barra
const BAR_RX  = sc(39)   // radio pill de la barra
const FAB_Y   = sc(1.5)  // posición y del FAB
const FAB_W   = sc(68)   // diámetro del FAB

// Centro vertical de iconos y etiquetas en el diseño Figma
const ICON_CY_REG = sc(63)   // centro y de icono en tabs normales (casa apex=53, base=73)
const ICON_CY_FAB = sc(35.5) // centro y de icono en FAB (1.5+68/2)
const LABEL_Y     = sc(83)   // top de la etiqueta

// Tamaño de iconos
const ICON_SIZE_REG = sc(22)
const ICON_SIZE_FAB = sc(30)
// etiqueta: usa token DSO (ds.text.tabLabel → fontSize 12, weight '500')

// ─── Mapa de rutas → etiquetas ─────────────────────────────────────────────

const ROUTE_LABEL: Record<string, string> = {
  Home:          'Inicio',
  Notifications: 'Avisos',
  CredencialTab: 'Credencial',
  InfoUtil:      'Info útil',
  Profile:       'Más',
}

const BG_REMOTE_OPACITY = 1

function resolveRemoteImageUri(url: string | null | undefined): string | null {
  if (!url || !url.trim()) return null
  return url.startsWith('http') ? url : `${API_BASE_URL}${url}`
}

// ─── Iconos SVG — paths extraídos del Figma SVG original ───────────────────
// Cada icono usa el viewBox exacto que enmarca sus paths en la geometría Figma
// (coordenadas absolutas del SVG de 412×113)

/** Credencial — tarjeta con línea horizontal (coordenadas propias 0 0 37 28) */
const SvgIconCredencial = ({ color }: { color: string }) => (
  <Svg width={ICON_SIZE_FAB} height={ICON_SIZE_FAB} viewBox="0 0 37 28" fill="none">
    <Path
      d="M32.5 2H5.5C3.843 2 2.5 3.343 2.5 5V23C2.5 24.657 3.843 26 5.5 26H32.5C34.157 26 35.5 24.657 35.5 23V5C35.5 3.343 34.157 2 32.5 2Z"
      stroke={color} strokeWidth={2.47} strokeLinecap="round" strokeLinejoin="round"
    />
    <Path
      d="M2.5 11H35.5"
      stroke={color} strokeWidth={2.47} strokeLinecap="round" strokeLinejoin="round"
    />
  </Svg>
)

// ─── Pill activo — centrado en su tab ────────────────────────────────────
// Los íconos/labels usan flex:1 → se centran matemáticamente en cada tab
// (tab center = TAB_W * idx + TAB_W/2). El pill sigue la misma lógica para
// que ícono, label y pill compartan el mismo eje horizontal (sin offset).
// Margen izquierdo = margen derecho = (TAB_W - PILL_W) / 2 = 3.325 Figma units.
const TAB_W_FIGMA   = 412 / 5          // 82.4 (ancho de cada tab)
// Gap uniforme: mismo margen en los 4 lados (= diferencia de rx de la barra: 39 − 30.5 = 8.5)
// PILL_W = TAB_W − 2 × 8.5 = 82.4 − 17 = 65.4  →  margen izq/der = 8.5 px (igual que arriba/abajo)
const PILL_GAP      = 8.5              // gap uniforme horizontal y vertical
const PILL_W_FIGMA  = TAB_W_FIGMA - PILL_GAP * 2  // 65.4
const PILL_H_FIGMA  = 61
const PILL_RX_FIGMA = 30.5
const PILL_MARGIN   = PILL_GAP         // alias semántico

/** x del pill = borde izquierdo del tab + margen simétrico */
const getPillX = (idx: number) => TAB_W_FIGMA * idx + PILL_MARGIN

// FAB: tab 2, radio 34 → x = TAB_W_FIGMA*2 + TAB_W_FIGMA/2 - 34 = 172 (center=206)
const FAB_X_FIGMA = TAB_W_FIGMA * 2 + TAB_W_FIGMA / 2 - 34  // 172
// Gradiente FAB: calculado desde SVG aislado (FAB en x=1.5, grad x1=14, x2=62)
const FAB_GX1 = FAB_X_FIGMA - 1.5 + 14  // 184.5
const FAB_GX2 = FAB_X_FIGMA - 1.5 + 62  // 232.5

// ─── Capa decorativa SVG ───────────────────────────────────────────────────
// Renderiza: barra pill + contornos con gradiente + pill activo + FAB
// Usa coordenadas Figma originales dentro de viewBox="0 0 412 113"

interface DecoLayerProps {
  activeIndex: number
  backgroundImageUri?: string | null
}

const DecoLayer = React.memo(({ activeIndex, backgroundImageUri }: DecoLayerProps) => {
  // índice 2 = FAB Credencial → no muestra pill
  const showPill = activeIndex !== 2
  const px  = getPillX(activeIndex)
  const resolvedBackgroundImageUri = resolveRemoteImageUri(backgroundImageUri)
  const showVectorChrome = !resolvedBackgroundImageUri
  // Los extremos del gradiente del pill se desplazan junto con él.
  // En el SVG aislado del botón (77×62) el gradiente va de (13, 0) a (74.5, 64)
  // relativo al origen del pill (x=0.5, y=0.5), lo que equivale a +12.5 y +74 en coords absolutas.
  const pgx1 = px + 12.5
  const pgx2 = px + 74

  return (
  <Svg
    width={SW}
    height={COMP_H}
    viewBox="0 0 412 113"
    style={StyleSheet.absoluteFill}
    pointerEvents="none"
  >
    <Defs>
      {/* Recorte para confinar imagen remota al shape de la barra */}
      <ClipPath id="f_barClip">
        <Rect y={35} width={412} height={78} rx={39} />
      </ClipPath>

      {/* Contorno de la barra principal */}
      <SvgLinearGradient id="f_barBorder" x1="21" y1="37" x2="412" y2="110.5" gradientUnits="userSpaceOnUse">
        <Stop offset="0.0865" stopColor="#FFFFFF" />
        <Stop offset="0.389"  stopColor="#C8D8E6" />
        <Stop offset="0.898"  stopColor="#FFFFFF" />
        <Stop offset="0.996"  stopColor="#80A5C6" />
      </SvgLinearGradient>

      {/* Relleno de la barra (aproximación angular → lineal) */}
      <SvgLinearGradient id="f_barFill" x1="0" y1="35" x2="412" y2="113" gradientUnits="userSpaceOnUse">
        <Stop offset="0"    stopColor="#FFFFFF" stopOpacity="0.2" />
        <Stop offset="0.86" stopColor="#657FB8" stopOpacity="0.2" />
        <Stop offset="1"    stopColor="#3557A2" stopOpacity="0.2" />
      </SvgLinearGradient>

      {/* Contorno del pill activo — coordenadas dinámicas según tab */}
      <SvgLinearGradient id="f_pillBorder" x1={pgx1} y1={43} x2={pgx2} y2={107} gradientUnits="userSpaceOnUse">
        <Stop offset="0.120" stopColor="#FFFFFF" />
        <Stop offset="0.529" stopColor="#97A9D6" />
        <Stop offset="0.774" stopColor="#FFFFFF" />
      </SvgLinearGradient>

      {/* Contorno del FAB central — gradiente blanco→#B7CCFF→blanco (Figma) */}
      <SvgLinearGradient id="f_fabBorder" x1={FAB_GX1} y1="8.5" x2={FAB_GX2} y2="68" gradientUnits="userSpaceOnUse">
        <Stop offset="0.168" stopColor="#FFFFFF" />
        <Stop offset="0.443" stopColor="#B7CCFF" />
        <Stop offset="0.685" stopColor="#FFFFFF" />
      </SvgLinearGradient>
    </Defs>

    {/* ── Barra principal ── */}
    {resolvedBackgroundImageUri && (
      <G clipPath="url(#f_barClip)" opacity={BG_REMOTE_OPACITY}>
        <SvgImage
          x={0}
          y={35}
          width={412}
          height={78}
          preserveAspectRatio="none"
          href={{ uri: resolvedBackgroundImageUri }}
        />
      </G>
    )}
    {showVectorChrome && (
      <>
        <Rect y={35} width={412} height={78} rx={39} fill="url(#f_barFill)" />
        <Rect
          x={0.5} y={35.5} width={411} height={77} rx={38.5}
          stroke="url(#f_barBorder)" strokeOpacity={0.7} fill="none"
        />
      </>
    )}

    {/* ── Pill activo — centrado en el tab activo ── */}
    {showVectorChrome && showPill && (
      <G>
        <Rect x={px} y={43.5} width={PILL_W_FIGMA} height={PILL_H_FIGMA} rx={PILL_RX_FIGMA} fill="#2A529C" fillOpacity={0.4} />
        <Rect x={px} y={43.5} width={PILL_W_FIGMA} height={PILL_H_FIGMA} rx={PILL_RX_FIGMA} stroke="url(#f_pillBorder)" fill="none" />
      </G>
    )}

    {/* ── FAB central — centrado en tab 2 (x = TAB_W_FIGMA×2 + TAB_W_FIGMA/2 − 34 = 172) ── */}
    {showVectorChrome && (
      <>
        <Rect x={FAB_X_FIGMA} y={1.5} width={68} height={68} rx={34} fill="#2A529C" />
        <Rect x={FAB_X_FIGMA} y={1.5} width={68} height={68} rx={34} stroke="url(#f_fabBorder)" strokeWidth={3} fill="none" />
      </>
    )}
  </Svg>
  )
})

// ─── Componente principal ─────────────────────────────────────────────────

type BottomTabBarFigmaProps = BottomTabBarProps & {
  backgroundImageUri?: string | null
}

export default function BottomTabBarFigma({
  state,
  descriptors,
  navigation,
  backgroundImageUri,
}: BottomTabBarFigmaProps) {
  const insets = useSafeAreaInsets()
  const hasRemoteBackground = !!resolveRemoteImageUri(backgroundImageUri)

  return (
    <View style={[styles.wrapper, { height: COMP_H + insets.bottom }]}>

      {/* BlurView — el View wrapper con overflow:'hidden' fuerza el clip al shape pill
           (en Android, BlurView ignora borderRadius sin este wrapper)           */}
      {!hasRemoteBackground && (
        <View style={[styles.barBlurClip, { top: BAR_Y, height: BAR_H, borderRadius: BAR_RX }]}>
          <BlurView
            intensity={18}
            tint="default"
            style={StyleSheet.absoluteFill}
          />
        </View>
      )}

      {/* Capa decorativa SVG: gradientes + pill activo + FAB */}
      <DecoLayer
        activeIndex={state.index}
        backgroundImageUri={backgroundImageUri}
      />

      {/* ── Tabs — absolutos sobre el componente ── */}
      <View style={[styles.tabRow, { height: COMP_H }]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key]
          const isFocused  = state.index === index
          const isCenter   = index === 2
          const label      = ROUTE_LABEL[route.name] ?? route.name
          const iconColor  = 'white'
          const labelColor = isFocused ? 'white' : 'rgba(255,255,255,0.55)'

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            })
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate({ name: route.name, merge: true } as never)
            }
          }

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              style={styles.tab}
            >
              {/* Icono FAB — contenedor que cubre exactamente el círculo, flex-centrado */}
              {isCenter ? (
                <View style={styles.fabIconWrap}>
                  <SvgIconCredencial color={iconColor} />
                </View>
              ) : (
                <View style={[styles.iconAbs, { top: ICON_CY_REG - ICON_SIZE_REG / 2 }]}>
                  {index === 0 && <IcoInicio   color={iconColor} />}
                  {index === 1 && <IcoAvisos   color={iconColor} />}
                  {index === 3 && <IcoInfoUtil color={iconColor} />}
                  {index === 4 && <IcoMas      color={iconColor} />}
                </View>
              )}

              {/* Etiqueta */}
              <Text
                numberOfLines={1}
                style={[styles.label, { top: LABEL_Y, color: labelColor }]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Relleno de safe area inferior */}
      {insets.bottom > 0 && <View style={{ height: insets.bottom }} />}
    </View>
  )
}

// ─── Estilos ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'visible',
  },
  barBlurClip: {
    position: 'absolute',
    left: 0,
    right: 0,
    overflow: 'hidden',   // recorta el BlurView al shape pill en Android
  },
  tabRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    height: COMP_H,
    alignItems: 'center',
    position: 'relative',
  },
  iconAbs: {
    position: 'absolute',
    alignSelf: 'center',
  },
  /** Contenedor del ícono del FAB: coincide con el círculo, centra con flex */
  fabIconWrap: {
    position: 'absolute',
    top: FAB_Y,          // sc(1.5) — borde superior del círculo FAB
    alignSelf: 'center', // centra horizontalmente en el tab
    width: FAB_W,        // sc(68) — diámetro
    height: FAB_W,       // sc(68)
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    position: 'absolute',
    alignSelf: 'center',
    ...ds.text.tabLabel,
    letterSpacing: 0.1,
    textAlign: 'center',
    width: Math.floor(SW / 5) - 4,
  },
})
