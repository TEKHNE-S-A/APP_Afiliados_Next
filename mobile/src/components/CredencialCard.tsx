import React, { useRef, useState, useEffect } from 'react'
import { View, Text, StyleSheet, Dimensions, ImageBackground, TouchableOpacity, TextStyle } from 'react-native'
import { CredencialCardProps } from '../types/credencial'
import { formatFecha } from '../utils/dateUtils'
import { useTheme } from '../theme'
import { API_BASE_URL } from '../config'

const { width } = Dimensions.get('window')

interface FieldLayout {
  x?: number
  y?: number
  fontFamily?: string
  fontSize?: number
  fontWeight?: string
  fontStyle?: string
  color?: string
  hidden?: boolean
  allowEyeToggle?: boolean
  titlePosition?: string
  titleFontSize?: number
}

const defaultFieldLayout: Record<string, FieldLayout> = {
  nombre: { x: 16, y: 96, fontFamily: 'System', fontSize: 20, fontWeight: '700', fontStyle: 'normal', color: '#FFFFFF', hidden: false, allowEyeToggle: false, titlePosition: 'invisible', titleFontSize: 10 },
  parentesco: { x: 16, y: 126, fontFamily: 'System', fontSize: 13, fontWeight: '600', fontStyle: 'normal', color: '#E5E7EB', hidden: false, allowEyeToggle: false, titlePosition: 'invisible', titleFontSize: 10 },
  nroAfiliado: { x: 16, y: 162, fontFamily: 'System', fontSize: 12, fontWeight: '600', fontStyle: 'normal', color: '#FFFFFF', hidden: false, allowEyeToggle: true, titlePosition: 'izquierda', titleFontSize: 10 },
  dni: { x: 16, y: 186, fontFamily: 'System', fontSize: 12, fontWeight: '600', fontStyle: 'normal', color: '#FFFFFF', hidden: false, allowEyeToggle: true, titlePosition: 'izquierda', titleFontSize: 10 },
  cuil: { x: 16, y: 210, fontFamily: 'System', fontSize: 12, fontWeight: '600', fontStyle: 'normal', color: '#FFFFFF', hidden: false, allowEyeToggle: true, titlePosition: 'izquierda', titleFontSize: 10 },
  plan: { x: 196, y: 162, fontFamily: 'System', fontSize: 12, fontWeight: '600', fontStyle: 'normal', color: '#FFFFFF', hidden: false, allowEyeToggle: false, titlePosition: 'izquierda', titleFontSize: 10 },
  fechaNacimiento: { x: 196, y: 186, fontFamily: 'System', fontSize: 12, fontWeight: '600', fontStyle: 'normal', color: '#FFFFFF', hidden: false, allowEyeToggle: true, titlePosition: 'izquierda', titleFontSize: 10 },
  vigencia: { x: 196, y: 210, fontFamily: 'System', fontSize: 12, fontWeight: '700', fontStyle: 'normal', color: '#FFFFFF', hidden: false, allowEyeToggle: false, titlePosition: 'izquierda', titleFontSize: 10 },
  token: { x: 286, y: 234, fontFamily: 'System', fontSize: 28, fontWeight: '700', fontStyle: 'normal', color: '#F59E0B', hidden: false, allowEyeToggle: false, titlePosition: 'invisible', titleFontSize: 10 },
}

const SAFE_FONT_FAMILIES = new Set(['System', 'sans-serif', 'serif', 'monospace'])
const FONT_FAMILY_ALIASES: Record<string, string> = {
  'arial': 'sans-serif',
  'helvetica': 'sans-serif',
  'verdana': 'sans-serif',
  'trebuchet ms': 'sans-serif',
  'times new roman': 'serif',
  'georgia': 'serif',
  'courier new': 'monospace',
}

const resolveSafeFontFamily = (rawValue: unknown): string => {
  const raw = String(rawValue || 'System').trim()
  if (!raw) return 'System'
  if (SAFE_FONT_FAMILIES.has(raw)) return raw
  const mapped = FONT_FAMILY_ALIASES[raw.toLowerCase()]
  return mapped || 'System'
}

const TITLE_VERTICAL_GAP = 6

const FIELD_TITLES: Record<string, string> = {
  nombre: 'Nombre completo',
  parentesco: 'Parentesco',
  nroAfiliado: 'N° Afiliado',
  dni: 'DNI',
  cuil: 'CUIL',
  plan: 'Plan',
  fechaNacimiento: 'F. Nac',
  vigencia: 'Vigencia',
}

const normalizeCredencialImageUrl = (rawUrl: string | null | undefined): string | null => {
  const value = String(rawUrl || '').trim()
  if (!value) return null
  if (value.startsWith('http://') || value.startsWith('https://')) return value
  if (value.startsWith('gxdbfile:')) return null
  if (value.startsWith('/')) return `${API_BASE_URL}${value}`
  return `${API_BASE_URL}/${value}`
}

const CredencialCard: React.FC<CredencialCardProps> = ({ 
  credencial, 
  isTitular, 
  compact = false,
  showToken = false,
  showToggleDatos = false,
  planImageUrl,
}) => {
  const viewRef = useRef<View>(null)
  const [countdown, setCountdown] = useState<string>('')
  const [tokenExpired, setTokenExpired] = useState<boolean>(false)
  const [imageError, setImageError] = useState<boolean>(false)
  // Si no tiene toggle, los datos siempre se muestran visibles
  const [datosVisibles, setDatosVisibles] = useState<boolean>(!showToggleDatos)
  const { colors } = useTheme()

  const layoutFields = {
    ...defaultFieldLayout,
    ...(credencial.credencialLayout?.fields || {}),
  }

  const resolvedPlanImageUrl = planImageUrl || normalizeCredencialImageUrl(credencial.crcrelin)

  useEffect(() => {
    setImageError(false)
  }, [resolvedPlanImageUrl])

  const isFieldHidden = (fieldKey: string) => !!layoutFields?.[fieldKey]?.hidden
  const canHideWithEye = (fieldKey: string) => !!layoutFields?.[fieldKey]?.allowEyeToggle

  const getMaskedValue = (fieldKey: string, rawValue: string | number | undefined | null, isDate = false) => {
    const value = rawValue == null ? '' : String(rawValue)
    const shouldMask = showToggleDatos && !datosVisibles && canHideWithEye(fieldKey)

    if (!shouldMask) {
      if (isDate) return formatFecha(value)
      return value || 'N/A'
    }

    if (isDate) return '**/**/****'
    if (!value) return '***'
    if (value.length <= 3) return '***'
    return '***' + value.slice(-3)
  }

  const getFieldTextStyle = (fieldKey: string): TextStyle => {
    const cfg = layoutFields[fieldKey] || {}
    return {
      position: 'absolute',
      left: Number(cfg.x || 0),
      top: Number(cfg.y || 0),
      color: String(cfg.color || '#FFFFFF'),
      fontSize: Number(cfg.fontSize || 12),
      fontFamily: resolveSafeFontFamily(cfg.fontFamily),
      fontWeight: String(cfg.fontWeight || '600') as TextStyle['fontWeight'],
      fontStyle: (cfg.fontStyle === 'italic' ? 'italic' : 'normal') as TextStyle['fontStyle'],
      textShadowColor: 'rgba(0, 0, 0, 0.75)',
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 3,
    }
  }

  const getTitleTextStyle = (fieldKey: string, cfg: FieldLayout, valueText: string): TextStyle => {
    const titlePos = String(cfg?.titlePosition || 'izquierda').toLowerCase()
    const titleFontSize = Number(cfg?.titleFontSize || 10)
    const valueFontSize = Number(cfg?.fontSize || 12)
    const x = Number(cfg?.x || 0)
    const y = Number(cfg?.y || 0)

    const estimatedValueWidth = Math.max(28, Math.round(valueText.length * (valueFontSize * 0.55)))

    let left = x
    let top = y

    if (titlePos === 'superior') {
      top = y - titleFontSize - TITLE_VERTICAL_GAP
    } else if (titlePos === 'inferior') {
      top = y + valueFontSize + TITLE_VERTICAL_GAP
    } else if (titlePos === 'derecha') {
      left = x + estimatedValueWidth + 8
    }

    return {
      position: 'absolute',
      left,
      top,
      color: String(cfg?.color || '#FFFFFF'),
      fontSize: titleFontSize,
      fontFamily: resolveSafeFontFamily(cfg?.fontFamily),
      fontWeight: '600',
      fontStyle: 'normal',
      textShadowColor: 'rgba(0, 0, 0, 0.75)',
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 3,
    }
  }

  const renderFieldWithTitle = (fieldKey: string, rawValue: string, maskedValue: string) => {
    const cfg = layoutFields[fieldKey] || {}
    const title = FIELD_TITLES[fieldKey] || ''
    const titlePos = String(cfg?.titlePosition || 'izquierda').toLowerCase()

    if (!title || titlePos === 'invisible') {
      return (
        <Text style={getFieldTextStyle(fieldKey)}>
          {maskedValue}
        </Text>
      )
    }

    if (titlePos === 'izquierda') {
      return (
        <Text style={getFieldTextStyle(fieldKey)}>
          {title}: {maskedValue}
        </Text>
      )
    }

    return (
      <>
        <Text style={getTitleTextStyle(fieldKey, cfg, rawValue)}>{title}</Text>
        <Text style={getFieldTextStyle(fieldKey)}>{maskedValue}</Text>
      </>
    )
  }
  
  const toYmd = (value: string | undefined | null) => {
    if (!value) return null
    const s = String(value).slice(0, 10)
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s

    const d = new Date(String(value))
    if (isNaN(d.getTime())) return null
    return d.toISOString().slice(0, 10)
  }
  
  
  // Determinar si credencial está vigente
  const isVigente = () => {
    const vigenciaYmd = toYmd(credencial.crcrefecvi)
    if (!vigenciaYmd) return false
    const hoyYmd = new Date().toISOString().slice(0, 10)
    return vigenciaYmd >= hoyYmd
  }
  
  // Calcular días hasta vencimiento
  const diasHastaVencimiento = () => {
    const vigenciaYmd = toYmd(credencial.crcrefecvi)
    if (!vigenciaYmd) return null

    const [y, m, d] = vigenciaYmd.split('-').map(Number)
    const vigenciaUtc = Date.UTC(y, m - 1, d)

    const hoy = new Date()
    const hoyUtc = Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate())

    const diff = vigenciaUtc - hoyUtc
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }
  
  const vigente = isVigente()
  const dias = diasHastaVencimiento()
  
  // Estilo de badge de vigencia
  const badgeVigenciaColor = () => {
    if (!vigente) return '#EF4444' // Rojo - vencida
    if (dias && dias <= 7) return '#F59E0B' // Amarillo - próxima a vencer
    return '#10B981' // Verde - vigente
  }
  
  const badgeVigenciaText = () => {
    if (!vigente) return 'VENCIDA'
    if (dias && dias <= 7) return `${dias} DÍAS`
    return 'VIGENTE'
  }
  
  // Calcular countdown del token
  useEffect(() => {
    if (!credencial.tokenTemporalVenceEn) return

    const updateCountdown = () => {
      const now = new Date().getTime()
      const expiry = new Date(credencial.tokenTemporalVenceEn!).getTime()
      const diff = expiry - now

      if (diff <= 0) {
        setCountdown('EXPIRADO')
        setTokenExpired(true)
        return
      }

      setTokenExpired(false)
      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      setCountdown(`${minutes}:${seconds.toString().padStart(2, '0')}`)
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [credencial.tokenTemporalVenceEn])
  
  return (
    <View 
      ref={viewRef}
      style={[
        styles.card,
        { shadowColor: colors.shadow },
        compact ? styles.cardCompact : null
      ]}
    >
      <ImageBackground
        key={resolvedPlanImageUrl || 'credencial-default-bg'}
        source={resolvedPlanImageUrl && !imageError ? { uri: resolvedPlanImageUrl } : require('../../assets/credencial-fondo-2.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
        imageStyle={styles.imageStyle}
        onError={() => setImageError(true)}
      >
        {/* Row superior con badges */}
        <View style={styles.topRow}>
          {/* Badge Titular centrado */}
          {isTitular && (
            <View style={styles.badgeTitular}>
              <Text style={styles.badgeTitularText}>★ TITULAR</Text>
            </View>
          )}
          
          {/* Badge Vigencia - arriba a la derecha */}
          <View style={[styles.badgeVigencia, { backgroundColor: badgeVigenciaColor() }]}>
            <Text style={styles.badgeVigenciaText}>{badgeVigenciaText()}</Text>
          </View>
        </View>
        
        {/* Badge Token - vértice inferior derecho (solo si showToken=true y no está oculto por layout) */}
        {showToken && credencial.tokenTemporal && !isFieldHidden('token') && (
          <View style={[styles.badgeToken, tokenExpired && styles.badgeTokenExpired]}>
            <Text style={styles.badgeTokenLabel}>TOKEN</Text>
            <Text style={[styles.badgeTokenValue, { color: layoutFields.token?.color || 'white', fontSize: Number(layoutFields.token?.fontSize || 32), fontWeight: String(layoutFields.token?.fontWeight || '700') as TextStyle['fontWeight'], fontFamily: String(layoutFields.token?.fontFamily || 'System'), fontStyle: (layoutFields.token?.fontStyle === 'italic' ? 'italic' : 'normal') as TextStyle['fontStyle'] }]}>{credencial.tokenTemporal}</Text>
            {countdown && (
              <Text style={[styles.badgeTokenExpiry, tokenExpired && styles.badgeTokenExpiryRed]}>
                {countdown}
              </Text>
            )}
          </View>
        )}

      {/* Campos dinámicos configurables por layout */}
      {!isFieldHidden('nombre') && (
        renderFieldWithTitle(
          'nombre',
          String(credencial.crcreapeno || ''),
          String(credencial.crcreapeno || '')
        )
      )}

      {!isFieldHidden('parentesco') && !!credencial.crcreparen && (
        renderFieldWithTitle(
          'parentesco',
          String(credencial.crcreparen || ''),
          String(credencial.crcreparen || '')
        )
      )}

      {!compact && !isFieldHidden('nroAfiliado') && (
        renderFieldWithTitle(
          'nroAfiliado',
          String(credencial.crcrenroaf || ''),
          getMaskedValue('nroAfiliado', credencial.crcrenroaf)
        )
      )}

      {!compact && !isFieldHidden('dni') && (
        renderFieldWithTitle(
          'dni',
          String(credencial.crcredocum || ''),
          getMaskedValue('dni', credencial.crcredocum)
        )
      )}

      {!compact && !isFieldHidden('cuil') && (
        renderFieldWithTitle(
          'cuil',
          String(credencial.crcrecuil || ''),
          getMaskedValue('cuil', credencial.crcrecuil)
        )
      )}

      {!compact && !isFieldHidden('plan') && (
        renderFieldWithTitle(
          'plan',
          String(credencial.crcrepladesc || credencial.crcreplaid || 'N/A'),
          String(credencial.crcrepladesc || credencial.crcreplaid || 'N/A')
        )
      )}

      {!compact && !isFieldHidden('fechaNacimiento') && (
        renderFieldWithTitle(
          'fechaNacimiento',
          String(credencial.crcrefecha || ''),
          getMaskedValue('fechaNacimiento', credencial.crcrefecha, true)
        )
      )}

      {!compact && !isFieldHidden('vigencia') && (
        renderFieldWithTitle(
          'vigencia',
          String(formatFecha(credencial.crcrefecvi)),
          String(formatFecha(credencial.crcrefecvi))
        )
      )}

        {/* Botón mostrar/ocultar datos - inferior derecho (solo en Home) */}
        {showToggleDatos && (
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setDatosVisibles(prev => !prev)}
            activeOpacity={0.7}
          >
            <Text style={styles.eyeIcon}>{datosVisibles ? '👁️' : '🙈'}</Text>
          </TouchableOpacity>
        )}

      </ImageBackground>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    width: width - 40,
    height: 280,
    borderRadius: 16,
    marginHorizontal: 20,
    marginVertical: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cardCompact: {
    minHeight: 200,
  },
  backgroundImage: {
    flex: 1,
    padding: 16,
  },
  imageStyle: {
    borderRadius: 16,
    resizeMode: 'cover',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginBottom: 8,
  },
  badgeTitular: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeTitularText: {
    color: '#1F2937',
    fontSize: 12,
    fontWeight: 'bold',
  },
  badgeVigencia: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeVigenciaText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  eyeButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeIcon: {
    fontSize: 16,
  },
  badgeToken: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FF9800',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  badgeTokenLabel: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  badgeTokenValue: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 36,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  badgeTokenExpiry: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  badgeTokenExpired: {
    backgroundColor: '#EF4444',
  },
  badgeTokenExpiryRed: {
    color: '#FFE5E5',
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  button: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
})

export default CredencialCard
