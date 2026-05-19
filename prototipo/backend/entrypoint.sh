#!/bin/sh
# entrypoint.sh — Corrige permisos del volumen de uploads y cae a appuser
set -e

# Crear subdirectorios necesarios (por si el volumen está vacío)
mkdir -p /app/uploads/planes \
         /app/uploads/noticias \
         /app/uploads/tmp \
         /app/uploads/info-util

# Corregir ownership del directorio de uploads al usuario de la app
# Esto es necesario porque el bind-mount puede haber sido creado por root en el host
chown -R appuser:appgroup /app/uploads
chmod -R 775 /app/uploads

# Ejecutar el comando como appuser (su-exec es el equivalente a gosu en Alpine)
exec su-exec appuser "$@"
