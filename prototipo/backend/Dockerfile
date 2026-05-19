# ── Stage 1: build ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Dependencias primero para aprovechar cache de capas
COPY package*.json ./
RUN if [ -f package-lock.json ]; then \
      npm ci --omit=dev; \
    else \
      npm install --omit=dev --no-audit --no-fund; \
    fi

# Código fuente del backend
COPY . .

# Generar Prisma client en la etapa de build
RUN npx prisma generate

# ── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

# su-exec permite hacer drop de privilegios desde el entrypoint (root → appuser)
RUN apk add --no-cache su-exec \
 && addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copiar solo lo necesario desde el stage de build
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app .

# Copiar y preparar el entrypoint (debe pertenecer a root para que lo ejecute root)
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# No usamos USER appuser aquí: el entrypoint arranca como root,
# corrige permisos del volumen de uploads y luego cae a appuser via su-exec.

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "server-soap.js"]
