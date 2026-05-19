## 1. Reordenar secciones en HomeScreen.tsx

- [x] 1.1 En `mobile/src/screens/HomeScreen.tsx`, mover el bloque `<View style={styles.tramitesSection}>` para que quede inmediatamente después del bloque del dashboard (antes de `quickAccessSection`)
- [x] 1.2 Mover el bloque `<View style={styles.quickAccessSection}>` para que quede después del bloque `tramitesSection`
- [x] 1.3 Mover `<NoticiasSection offline={isOfflineMode} />` para que quede al final, después de `quickAccessSection`

## 2. Verificación

- [x] 2.1 Verificar visualmente en el emulador/dispositivo que el orden de scroll es: Credencial → Trámites → Acceso Rápido → Novedades
- [x] 2.2 Confirmar que no hay errores de compilación TypeScript en `HomeScreen.tsx`
