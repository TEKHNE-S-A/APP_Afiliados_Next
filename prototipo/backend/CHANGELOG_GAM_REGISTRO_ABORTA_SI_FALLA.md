# CAMBIO CRÍTICO: Registro abortado si GAM falla

**Fecha:** 18/12/2025

## Descripción
A partir de este cambio, si ocurre cualquier error durante el registro en GAM (por ejemplo, contraseña inválida, email ya registrado, reglas de password, etc.), el backend aborta el flujo y NO crea el usuario localmente (ni en `nuusuari` ni en `nuusuauth`).

## Motivo
Evitar usuarios huérfanos en la base de datos y garantizar que solo existan usuarios válidos y sincronizados con GAM. Antes, si GAM rechazaba el registro, el backend continuaba y creaba un usuario "legacy" que nunca podría loguearse correctamente.

## Implementación
- Se modificó el bloque de manejo de errores en el registro GAM dentro de `backend/server-soap.js`.
- Ahora, ante cualquier excepción o error en el registro GAM, se responde con error HTTP 400 y se detiene el flujo.
- No se ejecuta ningún guardado en la base de datos local si GAM falla.

## Ejemplo de respuesta ante error GAM
```json
{
  "error": "Error en registro GAM",
  "message": "La contraseña debe contener números (cantidad minima de numeros 2). (GAM)",
  "code": "GAM_REGISTRATION_FAILED"
}
```

## Validación
- Probar registro con contraseña inválida: debe devolver error y NO crear usuario local.
- Probar registro con email ya registrado en GAM: debe devolver error y NO crear usuario local.

---

> Cambio realizado por GitHub Copilot a pedido del equipo de desarrollo.
