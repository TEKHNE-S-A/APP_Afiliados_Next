# Error Detectado: Registro de usuario existente en GAM pero no en local

**Fecha:** 18/12/2025

---

## Descripción del Problema

Al intentar registrar un usuario que ya existe en GAM pero no en la base de datos local, el sistema muestra el cartel **"REGISTRO EXITOSO"**. Sin embargo, al intentar hacer login:

- Si uso el email y la contraseña ingresados en el registro (que son distintos a los de GAM real), el backend responde **401 Unauthorized**.
- Si uso el usuario y contraseña reales de GAM, también responde **401 Unauthorized**.

---

## Pasos para Reproducir

1. El usuario ya existe en GAM (por ejemplo, creado desde la web de GAM).
2. Intento registrar ese mismo email desde la app móvil, con una contraseña diferente a la real de GAM.
3. El sistema responde **"REGISTRO EXITOSO"** y permite finalizar el flujo.
4. Intento hacer login con:
   - Email + contraseña usada en el registro → **401 Unauthorized**
   - Email + contraseña real de GAM → **401 Unauthorized**

---

## Comportamiento Esperado

- Si el usuario ya existe en GAM, el registro NO debe permitir ingresar una contraseña diferente ni mostrar "registro exitoso".
- Debe informar claramente que el usuario ya existe y ofrecer solo la opción de login o recuperación de contraseña.
- Si se sincroniza el usuario a la base local, debe requerir la contraseña real de GAM para login.

---

## Causa Técnica Probable

- El endpoint `/gam/register` detecta que el usuario existe en GAM, pero permite registrar en local con la contraseña ingresada (no la real de GAM).
- Al guardar la contraseña en la tabla `nuusuauth`, se almacena un hash que no corresponde a la real de GAM.
- El login posterior falla porque la contraseña no coincide ni con la de GAM ni con la local.

---

## Recomendación de Solución

- En el flujo de **usuario existente en GAM**:
  - NO permitir registrar con una contraseña diferente.
  - Obligar a que el usuario ingrese la contraseña real de GAM (validar con login real antes de sincronizar a local).
  - Si el login a GAM falla, abortar el registro y mostrar mensaje de error: "La contraseña no coincide con la registrada en GAM."
  - Solo sincronizar a local si el login a GAM es exitoso.

---

## Ejemplo de Respuesta Incorrecta

```json
{
  "success": true,
  "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "case": "2.1",
  "message": "Usuario sincronizado desde GAM (ya existía en GAM)",
  "userExistedInGAM": true,
  "createdInGAM": false,
  "syncedToLocalDB": true
}
```

**Pero el usuario no puede loguearse con ninguna contraseña.**

---

## Ejemplo de Respuesta Esperada ante contraseña incorrecta

```json
{
  "error": "Usuario existe en GAM pero la contraseña no coincide.",
  "code": "GAM_USER_EXISTS_LOGIN_FAILED",
  "suggestion": "Ingrese la contraseña real registrada en GAM o recupérela."
}
```

---

## Estado

- **BUG ABIERTO**
- Requiere ajuste en el endpoint `/gam/register` para validar login real a GAM antes de sincronizar a local.

---

**Reportado por:** GitHub Copilot
