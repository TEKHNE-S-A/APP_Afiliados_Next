
# Errores Comunes Devueltos por GAM (GeneXus Access Manager)

Este documento recopila los errores más frecuentes que puede devolver el sistema GAM durante los flujos de registro, login y recuperación de contraseña en la app de afiliados. Incluye los códigos exactos devueltos por GAM en el campo `ErrorMessages[].Code` o `error` del JSON de respuesta.

---

## 1. Errores de Registro


| Código Numérico | Código de Error GAM (`ErrorMessages[].Code`) | Mensaje GAM (`ErrorMessages[].Description`)           | Descripción Usuario                        | Acción recomendada                |
|-----------------|----------------------------------------------|------------------------------------------------------|--------------------------------------------|-----------------------------------|
| 1001            | `GXPL_GAM_UserAlreadyExists`                 | "El usuario ya existe"                               | Ya existe una cuenta registrada con este email.      | Ofrecer recuperación de contraseña|
| 1002            | `GXPL_GAM_EmailAlreadyExists`                | "El email ya está registrado"                        | Email ya registrado.                              | Ofrecer recuperación de contraseña|
| 1003            | `GXPL_GAM_InvalidCredentials`                | "Credenciales inválidas"                             | Email o contraseña incorrectos.                      | Solicitar reintento               |
| 1004            | `GXPL_GAM_InvalidEMail`                      | "Formato de email inválido"                          | El email ingresado no es válido.                     | Validar formato antes de enviar   |
| 1005            | `GXPL_GAM_PasswordTooShort`                  | "La contraseña es demasiado corta"                   | La contraseña debe tener al menos 8 caracteres.      | Solicitar contraseña más segura   |
| 1006            | `GXPL_GAM_PasswordTooSimple`                 | "La contraseña es demasiado simple"                  | La contraseña no cumple requisitos de seguridad.     | Solicitar contraseña más segura   |
| 1007            | `GXPL_GAM_CUILAlreadyExists`                 | "El CUIL ya está registrado"                         | Ya existe un usuario con ese CUIL.                   | Bloquear registro                 |
| 1008            | `GXPL_GAM_DNIAlreadyExists`                  | "El DNI ya está registrado"                          | Ya existe un usuario con ese DNI.                    | Bloquear registro                 |
| 1009            | `GXPL_GAM_UserDeactivated`                   | "El usuario está desactivado"                        | El usuario fue dado de baja en GAM.                  | Bloquear login/registro           |
| 1999            | `GXPL_GAM_UnknownError`                      | "Error desconocido en GAM"                           | Error inesperado.                                    | Revisar logs y contactar soporte  |


**Ejemplo de respuesta de error GAM (con código numérico):**
```json
{
	"isOK": false,
	"ErrorMessages": [
		{
			"Code": "GXPL_GAM_UserAlreadyExists",
			"Description": "El usuario ya existe",
			"NumericCode": 1001
		}
	]
}
```

---

## 2. Errores de Login


| Código Numérico | Código de Error GAM (`ErrorMessages[].Code` o `error`) | Mensaje GAM (`ErrorMessages[].Description`)           | Descripción Usuario                        | Acción recomendada                |
|-----------------|--------------------------------------------------------|------------------------------------------------------|--------------------------------------------|-----------------------------------|
| 1003            | `GXPL_GAM_InvalidCredentials`                          | "Credenciales inválidas"                             | Email o contraseña incorrectos.                      | Solicitar reintento               |
| 1010            | `GXPL_GAM_UserNotFound`                                | "Usuario no encontrado"                              | No existe un usuario con ese email.                  | Ofrecer registro                  |
| 1009            | `GXPL_GAM_UserDeactivated`                             | "El usuario está desactivado"                        | El usuario fue dado de baja en GAM.                  | Bloquear login                    |
| 1011            | `GXPL_GAM_UserBlocked`                                 | "La cuenta está bloqueada"                           | La cuenta fue bloqueada por múltiples intentos fallidos.| Esperar o contactar soporte   |
| 2001            | `invalid_token`                                        | "Token inválido o expirado"                          | La sesión ha expirado.                               | Solicitar login nuevamente        |
| 2002            | `network_error`                                        | "Error de red o timeout"                             | No se pudo conectar a GAM.                           | Reintentar más tarde              |


**Ejemplo de respuesta de error GAM (con código numérico):**
```json
{
	"error": "GXPL_GAM_InvalidCredentials",
	"error_description": "Credenciales inválidas",
	"numeric_code": 1003
}
```

---

## 3. Errores de Recuperación de Contraseña


| Código Numérico | Código de Error GAM (`ErrorMessages[].Code`) | Mensaje GAM (`ErrorMessages[].Description`)           | Descripción Usuario                        | Acción recomendada                |
|-----------------|----------------------------------------------|------------------------------------------------------|--------------------------------------------|-----------------------------------|
| 1010            | `GXPL_GAM_UserNotFound`                      | "Usuario no encontrado"                              | No existe un usuario con ese email.                  | Ofrecer registro                  |
| 1009            | `GXPL_GAM_UserDeactivated`                   | "El usuario está desactivado"                        | El usuario fue dado de baja en GAM.                  | Bloquear recuperación             |
| 1020            | `GXPL_GAM_SMTPError`                         | "Error enviando email"                               | No se pudo enviar el email de recuperación.          | Reintentar o contactar soporte    |
| 1999            | `GXPL_GAM_UnknownError`                      | "Error desconocido en GAM"                           | Error inesperado.                                    | Revisar logs y contactar soporte  |


**Ejemplo de respuesta de error GAM (con código numérico):**
```json
{
	"isOK": false,
	"ErrorMessages": [
		{
			"Code": "GXPL_GAM_SMTPError",
			"Description": "Error enviando email",
			"NumericCode": 1020
		}
	]
}
```

---

## 4. Notas Técnicas

- Los errores pueden venir en el campo `ErrorMessages[]` de la respuesta GAM o como campo `error`/`error_description` en OAuth2.
- Siempre registrar el error completo en logs para trazabilidad.
- En caso de error desconocido, mostrar mensaje genérico y registrar detalles para soporte.

---

**Última actualización:** 18/12/2025
