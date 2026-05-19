# Mejoras en Sistema de Credenciales - Grupo Familiar

## 📋 Resumen de Cambios

### 🎯 Objetivo
Mejorar la visualización de credenciales del grupo familiar diferenciando visualmente al titular de los miembros, y mostrando información de parentesco.

### ✅ Cambios Implementados

#### 1. **Backend** (`backend/server-soap.js`)
- ✅ Agregado campo `crcreparen` (parentesco) en INSERT de credenciales
- ✅ Agregado campo `crcreparen` en UPDATE de credenciales
- ✅ Valor por defecto: "Titular" para facilitar identificación
- ✅ Logs detallados de sincronización ya existentes

#### 2. **Base de Datos**
- ✅ Script SQL creado: `backend/db/add_crcreparen_column.sql`
- ✅ Columna nueva: `crcreparen VARCHAR(50)` en tabla `crcreden`
- ✅ Migraciones automáticas para datos existentes:
  - Titulares (crcrepropi='S') → "Titular"
  - Miembros (crcrepropi='N') → "Familiar"

#### 3. **Mobile - HomeScreen** (`mobile/src/screens/HomeScreen.tsx`)
- ✅ Separación de credenciales: titular vs miembros del grupo
- ✅ Banner visual: "👨‍👩‍👧‍👦 Grupo familiar: X miembros adicionales"
- ✅ Estilos nuevos:
  - `grupoFamiliarBanner`: fondo verde claro (#e8f5e9)
  - Border izquierdo verde (#4caf50)
  - Icono de familia emoji

#### 4. **Mobile - CredencialesScreen** (`mobile/src/screens/CredencialesScreen.tsx`)
- ✅ Diferenciación visual mejorada:
  - **Titular**: Card con border azul (#2196f3), fondo celeste (#f0f8ff)
  - **Miembros**: Card estándar
- ✅ Badges mejorados:
  - Badge "TITULAR" azul con letras blancas
  - Badge gris con parentesco para miembros (ej: "Cónyuge", "Hijo/a")
- ✅ Nombre del titular en azul con emoji ⭐ al inicio
- ✅ Type Credencial: agregado campo opcional `crcreparen?: string`

### 📊 Flujo Completo

```
1. Login → POST /auth/login
   ↓
2. Backend → syncCredencialesGrupoFamiliar()
   ↓
3. SOAP APPDATOSCREDENCIALES (10 campos incluye PARENTESCO)
   ↓
4. parseDatosCredencial() + normalizeCredencial()
   ↓
5. INSERT/UPDATE crcreden con parentesco
   ↓
6. INSERT crcredus con flag crcrepropi (S/N)
   ↓
7. Retorna credenciales[] + sync stats
   ↓
8. Mobile → AuthContext.signIn()
   ↓
9. setCredenciales() + setSyncStats()
   ↓
10. HomeScreen: muestra titular + banner grupo
    CredencialesScreen: lista completa con badges
```

### 🔧 Aplicar Cambios en BD

✅ **COMPLETADO** - Columna `crcreparen` agregada exitosamente:
```sql
ALTER TABLE public.crcreden ADD COLUMN IF NOT EXISTS crcreparen VARCHAR(50);
-- 0 filas actualizadas (tabla vacía o sin registros previos)
```

### 🧪 Testing

1. ✅ **Backend reiniciado** - Corriendo en puerto 3000
   - Columna `crcreparen` agregada exitosamente
   - 115 parámetros cargados
   - Cliente SOAP conectado
   - PostgreSQL: `postgres` / `12345678`

2. **Testing desde mobile**:
   ```powershell
   cd mobile
   npx expo start
   # Presionar 'a' para Android AVD
   ```

3. **Login con usuario que tenga grupo familiar**:
   - Usuario: DNI/CUIL/email registrado
   - Password: password configurado
   - Verificar logs en backend:
     - `🔄 Sincronizando credenciales...`
     - `📋 X credenciales obtenidas desde SOAP`
     - `✅ INSERTED/UPDATED: Apellido, Nombre`
     - `✅ Sincronización completa: +X ↻X =X`

4. **Verificar UI mobile**:
   - HomeScreen: debe mostrar preview del titular + banner "Grupo familiar: X miembros"
   - CredencialesScreen: lista completa con:
     - Card azul para titular con badge "TITULAR"
     - Cards blancos para miembros con badge de parentesco
     - Stats de sincronización en header

### 📦 Archivos Modificados

```
backend/
  server-soap.js (lines 390-470: INSERT/UPDATE con crcreparen)
  db/add_crcreparen_column.sql (nuevo)

mobile/src/
  screens/HomeScreen.tsx (banner grupo familiar, estilos)
  screens/CredencialesScreen.tsx (diferenciación visual titular, badges)
```

### 📖 Próximos Pasos Recomendados

1. ⏳ **Testing end-to-end**: Login → Sincronización → Visualización
2. ⏳ **Validar datos SOAP**: Verificar que PARENTESCO viene correctamente en respuesta
3. ⏳ **Mejorar mapeo de parentesco**: Normalizar valores (ej: "HIJO" → "Hijo/a")
4. ⏳ **Caché de credenciales**: Evitar sync si no hay cambios (usar hash)
5. ⏳ **Pantalla de detalle**: Tap en credencial → ver QR, compartir, etc.

### 🐛 Troubleshooting

**Error: column "crcreparen" does not exist**
- Ejecutar script `add_crcreparen_column.sql` en PostgreSQL

**No se muestran miembros del grupo**
- Verificar logs de sincronización en backend
- Comprobar que SOAP retorna múltiples credenciales
- Revisar que `crcrepropi` se asigna correctamente (S para titular, N para miembros)

**Badge "TITULAR" no aparece**
- Verificar que `crcrepropi === 'S'` en datos de credenciales
- Revisar consulta SQL en `syncCredencialesGrupoFamiliar` incluye JOIN con crcredus

---

**Documentado**: 2025-01-XX  
**Autor**: GitHub Copilot Assistant  
**Estado**: ✅ Completado - Pendiente testing
