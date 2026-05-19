# Diagnostico CLI

Se identificaron **6 issues sustantivos** en los cambios actuales.

1. **Critico - el flujo de autenticacion por cookie esta incompleto**  
   `backend/server-soap.js:163` usa `res.cookie()` / `res.clearCookie()`, pero la app no instala ni configura `cookie-parser`, y la autenticacion sigue dependiendo de parseo manual de cookies. Esa mezcla vuelve fragil el nuevo flujo de autenticacion para admin y facilita que se rompa.

2. **Alto - se agrego un `tsconfig` incorrecto en backend**  
   `backend/tsconfig.json` extiende `expo/tsconfig.base`, pero el backend es una app Node/Express en JavaScript, no un proyecto Expo. Parece un copy/paste desde `mobile/` y puede confundir a las herramientas.

3. **Alto - se cambio la URL base del emulador Android a un host que no funciona**  
   `mobile/.env.avd:3` ahora usa `http://127.0.0.1:3000`. En el emulador Android eso apunta al propio emulador, no a la maquina host. Deberia seguir usando `http://10.0.2.2:3000`.

4. **Medio - se elimino la proteccion de login offline por un workaround solo de desarrollo**  
   `mobile/src/contexts/AuthContext.tsx:613` ahora intenta login online incluso cuando NetInfo reporta offline. Eso puede ayudar en escenarios de emulador o tunel, pero en dispositivos reales convierte una falla offline rapida en una espera larga por timeout.

5. **Medio - se agregaron tipos de React innecesarios en backend**  
   `backend/package.json` ahora incluye `@types/react`, pero el backend no tiene codigo React. Probablemente fue agregado por accidente y deberia eliminarse.

6. **Alto - la sesion de Basic Auth no incluye `email` y deja inconsistente la autorizacion admin**  
   `backend/server-soap.js:7903` arma `req.session` para Basic Auth sin campo `email`, mientras que otros flujos de autenticacion si lo setean y `requireAdmin` usa `req.session.email || req.session.username` en `backend/server-soap.js:8106`. Hoy funciona solo porque `username` contiene el email, pero cualquier middleware o ruta que espere `req.session.email` puede fallar para usuarios autenticados por Basic Auth. La sesion deberia incluir `email: user.nuusumail || username` para mantener una estructura consistente.

Esos son los issues relevantes detectados. No se observaron otras regresiones de alta senal por fuera de estos puntos.

## Estado de correccion (2026-04-14)

- Issue 1: Corregido. Se agrego `cookie-parser` en backend, middleware global y lectura prioritaria de `req.cookies` en autenticacion admin.
- Issue 2: Corregido. Se elimino `backend/tsconfig.json` (era un archivo accidental no aplicable al backend).
- Issue 3: Corregido. `mobile/.env.avd` volvio a `API_BASE_URL_ANDROID=http://10.0.2.2:3000`.
- Issue 4: Corregido parcialmente con criterio. Se restauro la proteccion offline para produccion y se dejo bypass acotado a desarrollo local/emulador.
- Issue 5: Corregido. Se elimino `@types/react` de `backend/package.json`.
- Issue 6: Corregido. La rama de Basic Auth en `requireAuth` ahora agrega `email` a `req.session` usando `user.nuusumail || null`, manteniendo compatibilidad con logins por DNI/CUIL y alineando la forma de sesion con los demas flujos.
