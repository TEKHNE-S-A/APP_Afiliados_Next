---
name: apple-appstore-compliance
description: >
  Aplica todos los requisitos de las Apple App Store Review Guidelines a cualquier app
  que deba publicarse en el App Store de Apple. Activa este skill SIEMPRE que el usuario
  mencione: App Store, iOS, iPhone, iPad, Apple, publicar app, subir al store, review de
  Apple, TestFlight, App Store Connect, Xcode, Swift, SwiftUI, Capacitor, React Native,
  Expo, o cuando diga "quiero publicar esta app", "necesito que pase el review de Apple",
  "preparar para App Store", "cumplir con Apple", o cualquier variante. Tambien activa
  cuando se discuta privacidad en apps moviles, in-app purchase, suscripciones, politica
  de privacidad, eliminacion de cuenta, moderacion de contenido, o permisos de sistema
  (camara, microfono, ubicacion, contactos). No esperes que el usuario lo pida
  explicitamente: si la app va a iOS, aplica este skill desde el primer modulo.
  Basado en Apple App Store Review Guidelines 2025-2026 (ultima actualizacion: Nov 2025).
---

# Apple App Store Compliance — Directivas para Desarrollo

> Principio rector: **El reviewer de Apple es un usuario sin contexto, en un dispositivo
> limpio, con red lenta. Si necesita adivinar algo, rechaza la app.**
>
> En 2024-2025 Apple rechazo ~25% de todas las submissions. Las causas mas frecuentes:
> Performance (crashes/flujos rotos), Metadata inexacta, y problemas con IAP/privacidad.

---

## Las 5 Areas de Evaluacion de Apple

Las guidelines se organizan en 5 bloques. Toda app debe pasar los 5:

1. **Safety** — Contenido seguro, sin dano al usuario
2. **Performance** — App completa, funcional, sin crashes
3. **Business** — Pagos via IAP, suscripciones correctas
4. **Design** — Human Interface Guidelines, experiencia iOS nativa
5. **Legal** — Privacidad, datos, cumplimiento regional

---

## BLOQUE 1 — SAFETY (Seguridad del Contenido)

### 1.1 Contenido Objetable

**Directiva:** El contenido no puede ser ofensivo, discriminatorio, violento, sexual
explicito, o que incite a conductas ilegales.

```swift
// Si la app tiene contenido de terceros, implementar filtrado
// NO es suficiente con "los usuarios son responsables de su contenido"
```

**Checklist:**
- [ ] No hay contenido que discrimine por religion, raza, genero, origen nacional
- [ ] Violencia realista solo en contexto de juego, nunca dirigida a grupos reales
- [ ] Sin contenido sexual explicito (incluso si "solo adults")
- [ ] Sin informacion medica falsa o datos de dispositivo truchos

---

### 1.2 Contenido Generado por Usuarios (UGC)

**Si tu app permite que usuarios publiquen contenido** (comentarios, fotos, perfiles,
chat, foros), Apple exige los 4 elementos siguientes sin excepcion:

```typescript
// Estructura minima obligatoria para apps con UGC

// 1. FILTRADO DE CONTENIDO INAPROPIADO
interface SistemaModeracion {
  filtrarContenido(texto: string): boolean;      // keyword filter
  moderacionAutomatica: boolean;                  // para cuentas nuevas
  colaReviewManual: Queue<ContenidoReportado>;   // revision humana
}

// 2. REPORTAR CONTENIDO — en CADA item de contenido
<ContentItem>
  <ReportButton onPress={() => reportContent(item.id)} />
  {/* Visible en cada post, comentario, perfil */}
</ContentItem>

// 3. BLOQUEAR USUARIOS — en CADA perfil de usuario
<UserProfile>
  <BlockUserButton onPress={() => blockUser(user.id)} />
  {/* Bloqueo real: sin visibilidad mutua, no solo oculto localmente */}
</UserProfile>

// 4. INFORMACION DE CONTACTO PUBLICA
// En Settings/Ayuda de la app: email o formulario de soporte accesible
```

**Regla:** Sin estos 4 elementos, la app es rechazada automaticamente si tiene UGC.

---

### 1.3 Apps para Ninos (Kids Category)

Si la app es para menores:
- [ ] Sin links externos fuera de la app (sin parental gate)
- [ ] Sin compras sin parental gate
- [ ] Sin analytics de terceros que recojan IDFA o datos identificables
- [ ] Sin publicidad de terceros (salvo aprobacion especial con revision humana de creativos)
- [ ] Cumplir COPPA (EE.UU.), GDPR-K (EU), y normativas locales de cada region

---

### 1.4 Dano Fisico — Apps de Salud

Si la app toca salud/medicina:
- [ ] No afirmar que el iPhone mide presion arterial, temperatura, glucosa, oxigeno solo con sensores
- [ ] Siempre incluir disclaimer: "Consulta a un profesional de salud antes de tomar decisiones medicas"
- [ ] Si tiene clearance regulatoria (FDA, ANMAT, etc.), adjuntar documentacion en App Review Notes
- [ ] Calculadoras de dosis: solo de fabricantes farmaceuticos, hospitales, universidades, o farmacéuticas autorizadas

---

### 1.5 Informacion del Desarrollador

- [ ] URL de soporte valida y activa en App Store Connect
- [ ] Email de contacto accesible dentro de la app (Settings > Soporte)
- [ ] Informacion de contacto actualizada (no puede ser un formulario roto)

---

## BLOQUE 2 — PERFORMANCE (Funcionalidad Completa)

### 2.1 App Completa — La Regla mas Importante

**Apple rechaza inmediatamente:**
- Apps con flujos rotos o pantallas "Coming Soon"
- Placeholder text o datos de prueba visibles
- Backends apagados durante el review
- Features anunciados en screenshots que no funcionan

**Directiva pre-submission:**

```bash
# REVIEWER SIMULATION — Ejecutar antes de cada submission
# 1. Instalar desde cero (sin cache, sin cuenta de dev)
# 2. Completar el flujo principal de la app sin ayuda externa
# 3. Restaurar compras (si aplica)
# 4. Encontrar la politica de privacidad en menos de 10 segundos
# 5. Eliminar la cuenta (si la app tiene registro)

# Si cualquiera de estos pasos falla → NO SUBMITEAR
```

**App Review Notes — Siempre incluir:**
```
Si la app requiere login:
  - Usuario demo: demo@tuapp.com
  - Password: Demo1234!
  - Rol: [especificar si hay multiples roles]

Si hay features regionalizados:
  - Indicar que funciona en todas las regiones del store

Si hay hardware especifico necesario:
  - Describir como simularlo o que alternativa tiene el reviewer
```

---

### 2.3 Metadata Precisa

**Directiva:** Cada feature en screenshots y descripcion debe poder verificarse en <60 segundos.

```
PROHIBIDO en metadata:
- "La mejor app de X del mundo" (no verificable)
- Screenshots con UI que no existe en la version a reviewar
- Mencionar features de versiones futuras como actuales
- Ratings falsos o testimoniales inventados

REQUERIDO:
- Screenshots de la version exacta que se esta subiendo
- Descripcion con features reales y verificables
- Keywords relevantes (sin keyword stuffing)
- Categoria correcta
```

---

## BLOQUE 3 — BUSINESS (Pagos y Monetizacion)

### 3.1.1 In-App Purchase (IAP) — Regla sin Excepciones

**Si la app vende contenido o funcionalidades digitales, DEBE usar IAP de Apple.**

```swift
// OBLIGATORIO para:
// - Desbloquear features premium
// - Suscripciones con renovacion automatica
// - Contenido digital (cursos, templates, filtros, stickers)
// - Creditos o moneda virtual

// PERMITIDO sin IAP (se puede cobrar externamente):
// - Bienes fisicos (ecommerce real)
// - Servicios que se consumen fuera de la app (ride-sharing, delivery)
// - B2B / enterprise con contrato externo

// RESTORE PURCHASES — OBLIGATORIO si hay IAP no-consumibles o suscripciones
struct RestoreView: View {
    var body: some View {
        Button("Restaurar Compras") {
            Task {
                await StoreKitManager.shared.restorePurchases()
            }
        }
        // Colocar en: Settings Y en la pantalla de paywall
    }
}
```

**Checklist IAP:**
- [ ] Todos los unlocks digitales usan StoreKit / IAP
- [ ] "Restaurar Compras" visible en Settings y en paywall
- [ ] Restaurar funciona tras reinstalacion en dispositivo limpio
- [ ] Precios mostrados antes de confirmar compra
- [ ] Suscripciones muestran: precio, frecuencia, como cancelar

---

### 3.1.3 Links Externos (Actualizacion Mayo 2025 — Mercado EE.UU.)

Desde mayo 2025, en el storefront de EE.UU. se permiten botones/links a sitios externos
para compras. En otros paises las restricciones anteriores siguen vigentes.

```swift
// Si incluyes link externo (solo US storefront):
// - Debe ser claro que el usuario sale de la app
// - No puede ser engañoso o redirigir a flows confusos
// - Apple puede cobrar comision igual (verificar terminos vigentes)
```

---

## BLOQUE 4 — DESIGN (Human Interface Guidelines)

### Principios Obligatorios HIG

```swift
// 4.1 NAVEGACION — Usar patrones iOS nativos
// - NavigationStack para jerarquia de contenido
// - TabView para navegacion principal (max 5 tabs)
// - Sheet/FullScreenCover para modales
// NO inventar navegacion custom que confunda al usuario iOS

// 4.2 ICONOS DE APP
// - Sin usar iconos, nombres o branding de otras apps sin permiso (nueva regla Nov 2025)
// - Sin imitar iconos de apps del sistema (Settings, Safari, Mail, etc.)
// - Sin marcas de Apple en el icono

// 4.3 FEEDBACK VISUAL
// - Loading states para operaciones > 0.5 segundos
// - Error states con mensaje claro (no solo "Error 500")
// - Empty states con llamada a la accion

// 4.4 ACCESIBILIDAD — Obligatorio
struct AccesibilidadMinima: View {
    var body: some View {
        Image("logo")
            .accessibilityLabel("Logo de la empresa")   // Siempre en imagenes
        
        Button("Comprar") { }
            .accessibilityHint("Abre pantalla de pago")  // En acciones no obvias
        
        Text("Precio: $9.99")
            .dynamicTypeSize(.small ... .accessibility3)  // Soporte Dynamic Type
    }
}
```

**Checklist Design:**
- [ ] Soporte Dynamic Type (texto escalable por accesibilidad)
- [ ] VoiceOver funciona en flujos principales
- [ ] Contraste de color minimo 4.5:1 (WCAG AA)
- [ ] Touch targets minimo 44x44 puntos
- [ ] Dark Mode soportado (o al menos no roto en Dark Mode)
- [ ] Orientacion correcta (portrait / landscape segun tipo de app)
- [ ] No usar icono, nombre ni branding de otra app sin permiso

---

## BLOQUE 5 — LEGAL (Privacidad y Cumplimiento)

### 5.1.1 Privacy Policy — ABSOLUTAMENTE OBLIGATORIO

**Dos ubicaciones requeridas:**
1. URL en App Store Connect (campo de metadata)
2. Accesible dentro de la app (Settings > Privacidad o About)

**Contenido minimo de la politica:**

```markdown
La politica de privacidad DEBE declarar explicitamente:

1. QUE datos se recopilan (lista especifica, no vaga)
   - Nombre, email, datos de uso, ubicacion, etc.

2. COMO se recopilan
   - Formularios, automaticamente, de terceros, etc.

3. PARA QUE se usan
   - Mejorar la app, analytics, publicidad, etc.

4. CON QUIEN se comparten
   - Cada SDK de terceros, analytics, plataformas de ads
   - Si se envia a modelos de IA externos: DECLARARLO EXPLICITAMENTE

5. RETENCION y ELIMINACION
   - Cuanto tiempo se guardan los datos
   - Como el usuario puede solicitar eliminacion

6. DERECHOS DEL USUARIO
   - Como revocar consentimiento
   - Como solicitar copia de sus datos
   - Como solicitar eliminacion completa
```

---

### 5.1.2 Permisos del Sistema — Solo Pedir lo Necesario

**Cada permiso debe tener una justificacion clara en el Info.plist:**

```xml
<!-- Info.plist — Strings de justificacion OBLIGATORIOS -->

<key>NSCameraUsageDescription</key>
<string>Usamos la camara para que puedas escanear documentos y subir fotos de perfil.</string>

<key>NSLocationWhenInUseUsageDescription</key>
<string>Necesitamos tu ubicacion para mostrarte prestadores cercanos.</string>

<key>NSMicrophoneUsageDescription</key>
<string>El microfono se usa para grabar notas de voz en las consultas.</string>

<key>NSContactsUsageDescription</key>
<string>Accedemos a tus contactos para facilitar invitar a familiares al plan.</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>Accedemos a tus fotos para que puedas subir imagenes a tu perfil.</string>

<!-- REGLA: Solo pedir el permiso en el momento que se necesita,
     no al iniciar la app. El reviewer verifica esto. -->
```

**Regla critica:** Si el permiso no se usa en la version actual, NO declararlo.
Apple revisa que cada permiso declarado sea efectivamente utilizado.

---

### 5.1.1 App Privacy Labels (App Store Connect)

En App Store Connect, completar el cuestionario de privacidad:

```
CATEGORIAS A DECLARAR:
- Data Used to Track You (cross-app tracking)
- Data Linked to You (datos ligados a identidad del usuario)
- Data Not Linked to You (datos anonimos/analytics)

POR TIPO DE DATO:
- Contact Info (nombre, email, telefono, direccion)
- Health & Fitness
- Financial Info
- Location
- User Content (fotos, videos, audio, mensajes)
- Usage Data (historial de uso, interacciones)
- Identifiers (User ID, Device ID)

REGLA: Apple compara los privacy labels con el comportamiento real de la app
y con SDKs incluidos. Si un SDK recopila datos que no declaraste, es rechazo.
Auditar TODOS los SDKs de terceros antes de declarar.
```

---

### 5.1.1 Eliminacion de Cuenta — OBLIGATORIO si hay Registro

Si la app permite crear cuentas, el usuario DEBE poder eliminar su cuenta desde dentro de la app:

```swift
// SettingsView — Seccion de Cuenta
struct AccountDeletionView: View {
    @State private var showConfirmation = false
    
    var body: some View {
        Section("Datos y Cuenta") {
            // Link a politica de privacidad
            Link("Politica de Privacidad", destination: URL(string: "https://tuapp.com/privacy")!)
            
            // Eliminacion de cuenta — OBLIGATORIO
            Button("Eliminar mi cuenta", role: .destructive) {
                showConfirmation = true
            }
            .confirmationDialog(
                "Esta accion es permanente",
                isPresented: $showConfirmation,
                titleVisibility: .visible
            ) {
                Button("Eliminar cuenta permanentemente", role: .destructive) {
                    Task { await AccountService.deleteAccount() }
                }
                Button("Cancelar", role: .cancel) {}
            } message: {
                Text("Se eliminaran todos tus datos. Esta accion no puede deshacerse.")
            }
        }
    }
}

// El backend DEBE:
// 1. Eliminar o anonimizar datos personales del usuario
// 2. Cancelar suscripciones activas
// 3. Confirmar la eliminacion por email
// 4. Completar en un plazo razonable (max 30 dias)
```

---

### 5.3 Datos de Salud

Si la app accede a HealthKit o datos de salud:
- [ ] Solo recopilar datos necesarios para la funcionalidad declarada
- [ ] No usar datos de salud para publicidad o venta de datos
- [ ] No compartir con terceros sin consentimiento explicito
- [ ] Declarar en Privacy Labels bajo "Health & Fitness"

---

### Apps con IA — Requisitos Especificos 2025-2026

```
SI LA APP USA IA (Claude, GPT, Gemini, modelos propios):

1. DECLARAR en politica de privacidad:
   - Que datos del usuario se envian al modelo de IA
   - Que proveedor de IA se usa
   - Si los datos se usan para entrenar modelos

2. CONSENTIMIENTO PREVIO al enviar datos personales a IA externa:
   - Segun guideline 5.1.2, consentimiento explicito antes de transmitir a terceros

3. AGE RATING ajustado si el chatbot puede generar contenido sensible:
   - Evaluar frecuencia de generacion de contenido inapropiado
   - Ajustar rating de edad acorde

4. TRANSPARENCIA en la UI:
   - El usuario debe saber cuando interactua con IA
   - No pasar contenido generado por IA como creado por humanos sin disclosure
```

---

## Checklist Final Pre-Submission

### SUBMISSION READINESS — Ejecutar en orden

```
TECNICO
[ ] App compilada con Xcode 16+ y SDK iOS 18+
[ ] Probada en dispositivo fisico (no solo simulador)
[ ] Probada en red lenta (throttle a 3G en Charles/Network Link Conditioner)
[ ] Sin crashes en flujo principal (Xcode Instruments: Leaks, Time Profiler)
[ ] Sin crashes en flujo de borde (sin internet, sesion expirada, datos vacios)
[ ] Todos los backends ACTIVOS y accesibles desde redes externas

CONTENIDO
[ ] Sin placeholder text, "TODO", "Coming Soon" en features core
[ ] Screenshots actualizados a la UI real de esta version
[ ] Descripcion sin claims no verificables
[ ] Keywords sin stuffing ni mencionar nombres de competidores

PAGOS
[ ] IAP configurados en App Store Connect y en StoreKit
[ ] "Restaurar Compras" funciona en dispositivo limpio
[ ] Precios correctos y visibles antes de confirmar
[ ] Suscripciones con terminos claros (precio, renovacion, cancelacion)

PRIVACIDAD
[ ] Privacy Policy URL activa en App Store Connect
[ ] Privacy Policy accesible en Settings de la app (< 2 taps)
[ ] Privacy Labels completados y consistentes con SDKs incluidos
[ ] Permisos del sistema con NSUsageDescription claras
[ ] Eliminacion de cuenta funcional (si hay registro)
[ ] Consentimiento previo a datos enviados a IA externa

SEGURIDAD Y ACCESO PARA REVIEW
[ ] Demo account activo: usuario + password en App Review Notes
[ ] Si hay roles multiples: credentials para el rol que muestra mas features
[ ] Backend activo y accesible durante el review (puede durar 1-5 dias habiles)

ACCESIBILIDAD
[ ] Dynamic Type no rompe ninguna pantalla
[ ] VoiceOver funciona en flujo principal
[ ] Touch targets >= 44x44pt en todos los botones interactivos
[ ] Colores con contraste >= 4.5:1

UGC (si aplica)
[ ] Boton "Reportar" en cada item de contenido
[ ] Boton "Bloquear usuario" en cada perfil
[ ] Cola de moderacion operativa
[ ] Email de soporte accesible desde la app

LEGAL REGIONAL
[ ] Si distribuyes en EU: trader status completo en App Store Connect
[ ] Si hay menores: mecanismo de verificacion/declaracion de edad
[ ] Si es app de salud: disclaimers medicos presentes
```

---

## Causas de Rechazo mas Comunes (para evitar)

| Guideline | Causa | Solucion |
|---|---|---|
| 2.1 | Crash en flujo principal | Probar en dispositivo fisico antes de submitear |
| 2.1 | Backend apagado durante review | Mantener activo 5 dias habiles post-submission |
| 2.3 | Screenshots no coinciden con la app | Tomar screenshots de la version exacta a subir |
| 3.1.1 | Unlock digital sin IAP | Mover todos los unlocks digitales a StoreKit |
| 3.1.1 | Sin "Restaurar Compras" | Agregar boton en Settings y en paywall |
| 5.1.1 | Sin politica de privacidad | URL en metadata + link en Settings de la app |
| 5.1.1 | Sin eliminacion de cuenta | Implementar flujo de deletion en Settings |
| 5.1.2 | Permisos sin justificacion clara | NSUsageDescription especifica y honesta |
| 4.1 | Usar icono/nombre de otra app | Cambiar assets propios, no imitar competidores |
| 1.2 | UGC sin moderacion | 4 elementos: filter, report, block, contacto |

---

## Proceso de Rechazo — Como Recuperarse Rapido

```
1. Leer el mensaje de rechazo como un bug report
2. Identificar la guideline exacta citada
3. Reproducir el problema en instalacion limpia
4. Corregir SOLO lo que pide Apple (no agregar features nuevos)
5. Responder en App Store Connect con:
   "Que cambiamos: [descripcion especifica]
    Donde verificarlo: [pantalla exacta o flujo]"
6. No resubmitear sin corregir — cada rechazo adicional puede
   desencadenar revision mas exhaustiva
```

---

## Referencias Oficiales

- App Store Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Human Interface Guidelines: https://developer.apple.com/design/human-interface-guidelines/
- Account Deletion: https://developer.apple.com/support/offering-account-deletion-in-your-app/
- App Store Connect: https://developer.apple.com/help/app-store-connect/
- Proximos requisitos: https://developer.apple.com/news/upcoming-requirements/
- In-App Purchase: https://developer.apple.com/in-app-purchase/

> Ultima actualizacion de guidelines relevada: Noviembre 2025.
> Apple actualiza las guidelines periodicamente. Verificar cambios en:
> https://developer.apple.com/news/ antes de cada submission importante.
