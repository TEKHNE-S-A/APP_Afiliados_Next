# Especificación Frontend - Credenciales Grupo Familiar

## Objetivo
Implementar la vista completa de credenciales del grupo familiar con funcionalidades de visualización, navegación, compartir y generación de QR.

## Componentes a Desarrollar

### 1. **CredencialCard.tsx** (Componente Reutilizable)
Tarjeta visual de credencial individual con toda la información del afiliado.

**Props:**
```typescript
interface CredencialCardProps {
  credencial: Credencial
  isTitular: boolean
  onShare?: () => void
  onRefresh?: () => void
  showQR?: boolean
}
```

**Funcionalidades:**
- Diseño visual tipo tarjeta credencial física
- Indicador visual de titular vs familiar (color/badge)
- Generación QR con AfiliadoId + nombre
- Botón compartir (imagen de credencial)
- Mostrar todos los datos:
  - Nombre y apellido
  - Número de afiliado
  - Parentesco
  - DNI
  - Fecha de nacimiento
  - CUIL
  - Sexo
  - Plan
  - Fecha vigencia
  - Línea

**Diseño:**
- Gradiente de fondo diferenciado (titular: azul/verde, familiares: gris/celeste)
- Avatar con iniciales
- QR code en esquina superior derecha
- Badges para "TITULAR" y estado de vigencia
- Iconos para cada campo de dato

---

### 2. **CredencialesCarousel.tsx**
Carrusel horizontal para navegar entre credenciales del grupo familiar.

**Funcionalidades:**
- Swipe horizontal entre credenciales
- Indicadores de paginación (dots)
- Titular siempre en primera posición
- Transiciones suaves
- Estado del carrusel persistente

**Librerías sugeridas:**
- `react-native-snap-carousel` o
- `react-native-pager-view` o
- Implementación custom con `ScrollView` + `Animated`

---

### 3. **HomeScreen.tsx** (Actualización)
Mostrar preview de credencial titular con acceso rápido al carrusel completo.

**Cambios:**
```typescript
// Agregar sección de credencial
<View style={styles.credencialPreview}>
  <CredencialCard 
    credencial={credencialTitular}
    isTitular={true}
    showQR={false}
  />
  
  {grupoFamiliar.length > 1 && (
    <TouchableOpacity onPress={() => navigation.navigate('Credenciales')}>
      <Text>Ver todas las credenciales ({grupoFamiliar.length})</Text>
    </TouchableOpacity>
  )}
</View>
```

**Funcionalidades:**
- Preview de credencial titular (sin QR, versión compacta)
- Contador de integrantes del grupo
- Botón "Ver todas" si hay más de 1 credencial
- Pull-to-refresh para actualizar credenciales

---

### 4. **CredencialesScreen.tsx** (Refactorización Completa)
Pantalla principal con carrusel y funcionalidades avanzadas.

**Estructura:**
```typescript
const CredencialesScreen = () => {
  const { user, credenciales } = useAuth()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  
  const handleShare = async (credencial: Credencial) => {
    // Generar imagen de credencial
    // Usar react-native-view-shot
    // Compartir con Share API
  }
  
  const handleRefresh = async () => {
    // Llamar a syncCredenciales desde backend
    // Actualizar contexto
  }
  
  return (
    <View>
      <Header title="Credenciales del Grupo Familiar" />
      
      <CredencialesCarousel
        credenciales={credenciales}
        currentIndex={currentIndex}
        onIndexChange={setCurrentIndex}
        renderItem={(credencial, index) => (
          <CredencialCard
            credencial={credencial}
            isTitular={credencial.crcrepropi === 'S'}
            onShare={() => handleShare(credencial)}
            showQR={true}
          />
        )}
      />
      
      <View style={styles.actions}>
        <Button title="Actualizar" onPress={handleRefresh} />
        <Button title="Compartir" onPress={() => handleShare(credenciales[currentIndex])} />
      </View>
    </View>
  )
}
```

---

### 5. **QRCodeGenerator.tsx**
Componente para generar código QR de credencial.

**Funcionalidades:**
- Usar `react-native-qrcode-svg`
- Datos QR: `{afiliadoId}|{nombreCompleto}|{plan}`
- Tamaño ajustable
- Color personalizado según titular/familiar

**Instalación:**
```bash
npm install react-native-qrcode-svg react-native-svg
```

---

### 6. **ShareCredencial.ts** (Utilidad)
Lógica para compartir credencial como imagen.

**Funcionalidades:**
```typescript
import ViewShot from 'react-native-view-shot'
import Share from 'react-native-share'

export async function shareCredencial(viewRef: RefObject<View>, credencial: Credencial) {
  try {
    // Capturar vista como imagen
    const uri = await viewRef.current.capture()
    
    // Compartir
    await Share.open({
      title: `Credencial de ${credencial.crcrenom}`,
      message: `Credencial ${credencial.crcreplan}`,
      url: uri,
      type: 'image/png'
    })
  } catch (error) {
    console.error('Error compartiendo credencial:', error)
  }
}
```

**Instalación:**
```bash
npm install react-native-view-shot react-native-share
```

---

### 7. **Backend - Endpoint de Actualización**
Endpoint para forzar sincronización de credenciales.

**Nuevo endpoint:**
```javascript
// GET /credenciales/sync
app.get('/credenciales/sync', requireAuth, async (req, res) => {
  try {
    const { username } = req.session
    const dbUser = await getUserByUsername(username)
    
    if (!dbUser || !dbUser.nuusuafili) {
      return res.status(400).json({ error: 'Usuario sin AfiliadoId' })
    }
    
    const syncResult = await syncCredencialesGrupoFamiliar(
      dbUser.nuusuid, 
      dbUser.nuusuafili
    )
    
    return res.json({
      success: true,
      credenciales: syncResult.credenciales,
      sync: syncResult.sync
    })
  } catch (error) {
    console.error('Error sync credenciales:', error)
    res.status(500).json({ error: 'Error sincronizando credenciales' })
  }
})
```

---

### 8. **AuthContext.tsx** (Actualización)
Agregar función de sincronización manual.

```typescript
const syncCredenciales = async () => {
  try {
    const response = await apiGet('/credenciales/sync')
    setUser(prev => ({
      ...prev,
      credenciales: response.credenciales
    }))
    return response
  } catch (error) {
    console.error('Error sincronizando:', error)
    throw error
  }
}

// Exportar en el contexto
return (
  <AuthContext.Provider value={{
    ...otherValues,
    syncCredenciales
  }}>
```

---

## Flujo de Navegación

```
HomeScreen
  ↓
  [Preview Credencial Titular]
  ↓
  [Botón "Ver todas (N)"]
  ↓
CredencialesScreen
  ↓
  [Carrusel con todas las credenciales]
  ↓
  [Swipe izquierda/derecha]
  ↓
  [Botones: Compartir | Actualizar]
```

---

## Tipos TypeScript

```typescript
// mobile/src/types/credencial.ts
export interface Credencial {
  crcreid: string        // AfiliadoId (PK)
  crcrenom: string       // Nombre y Apellido
  crcrenraf: string      // Número de afiliado
  crcreparen: string     // Parentesco
  crcredni: string       // Documento
  crcrefnac: string      // Fecha de nacimiento
  crcrecuil: string      // CUIL
  crcresexo: string      // Sexo
  crcreplan: string      // Plan
  crcrefvig: string      // Fecha vigencia
  crcrelinea: string     // Línea
  crcrepropi: string     // Es titular? ('S' o 'N')
  crcrehash: string      // Hash SHA-256
}

export interface GrupoFamiliar {
  titular: Credencial
  familiares: Credencial[]
  total: number
}
```

---

## Estilos Sugeridos

```typescript
// CredencialCard.tsx styles
const styles = StyleSheet.create({
  card: {
    width: width - 40,
    height: 220,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cardTitular: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  cardFamiliar: {
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  },
  qrContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'white',
    padding: 5,
    borderRadius: 8,
  },
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  // ... más estilos
})
```

---

## Librerías Necesarias

```bash
# Navegación (ya instalado)
npm install @react-navigation/native @react-navigation/native-stack

# QR Code
npm install react-native-qrcode-svg react-native-svg

# Compartir
npm install react-native-share react-native-view-shot

# Carrusel
npm install react-native-snap-carousel
# o
npm install react-native-pager-view
```

---

## Plan de Implementación

### Fase 1: Componentes Base
1. ✅ Crear `CredencialCard.tsx` con diseño visual
2. ✅ Implementar generación de QR
3. ✅ Agregar tipos TypeScript

### Fase 2: Navegación y Carrusel
4. ✅ Implementar `CredencialesCarousel.tsx`
5. ✅ Integrar en `CredencialesScreen.tsx`
6. ✅ Actualizar navegación desde `HomeScreen.tsx`

### Fase 3: Funcionalidades Avanzadas
7. ✅ Implementar compartir credencial
8. ✅ Agregar pull-to-refresh
9. ✅ Endpoint `/credenciales/sync` en backend

### Fase 4: Testing y Refinamiento
10. ✅ Probar con datos reales de SOAP
11. ✅ Ajustar estilos y UX
12. ✅ Optimizar performance del carrusel

---

## Notas Técnicas

- **QR Code**: Codificar `AfiliadoId|Nombre|Plan` para validación rápida
- **Compartir**: Capturar solo la credencial visible, no toda la pantalla
- **Actualización**: Mostrar loading spinner durante sync SOAP
- **Vigencia**: Colorear badge según fecha vencimiento (verde: vigente, rojo: vencida, amarillo: próxima a vencer)
- **Offline**: Credenciales en caché (AsyncStorage) para visualización sin conexión

---

## Próximos Pasos

1. ¿Empezamos por crear `CredencialCard.tsx` con el diseño visual?
2. ¿O prefieres comenzar por el backend con el endpoint `/credenciales/sync`?
3. ¿Necesitas ayuda con alguna librería específica?
