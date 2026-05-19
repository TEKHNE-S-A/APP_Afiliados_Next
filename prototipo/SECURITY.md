# Política de Seguridad

## Reportar Vulnerabilidades

Si descubres una vulnerabilidad de seguridad, **no** abras un issue público. En su lugar:

1. Envía un correo a: **security@tudominio.com** (reemplaza con tu correo)
2. Incluye:
   - Descripción de la vulnerabilidad
   - Pasos para reproducir
   - Posible impacto
   - Sugerencias de fix (si aplica)

## Datos Sensibles

- **Nunca** commits tokens, credenciales o secretos
- Usa `.env.example` para documentar variables necesarias
- Todos los archivos `.env` están en `.gitignore`
- Si accidentalmente pusheaste secretos, avísanos inmediatamente

## Prácticas de Seguridad

- Las dependencias se actualizan regularmente
- Revisa las PRs antes de mergear código
- Usa variables de entorno para configuración sensible
- El backend mantiene tokens en memoria (no recomendado para producción)

## Actualizaciones de Seguridad

Subscríbete a notificaciones en GitHub para recibir alertas de vulnerabilidades.
