# Deployment & Environment Guide

Esta guía explica cómo desplegar APP Afiliados en diferentes entornos.

## 🌍 Entornos Soportados

- **Development** (LOCAL): Mock mode activado, backend en localhost
- **Staging** (TESTING): Backend en servidor test
- **Production** (LIVE): Backend en servidor producción

## 📱 Mobile App (Expo)

### Development (Windows/PowerShell)

```powershell
cd mobile

# Instalar dependencias
npm install --legacy-peer-deps

# Modo mock (sin backend real)
Set-Item -Path Env:REACT_APP_USE_MOCK -Value "true"
npm start

# Presionar 'a' para Android o 'i' para iOS
```

### Staging / Production

```powershell
cd mobile

# Cambiar config
# 1. Editar mobile/.env:
#    - USE_MOCK=false
#    - API_BASE_URL_ANDROID="tu_url_staging_o_prod"
#    - API_BASE_URL_IOS="tu_url_staging_o_prod"
#    - USE_MOCK_LOCATION=false

# 2. Build para producción
npm run build:web

# 3. O construir para Android/iOS (si tienes EAS)
npx eas build --platform android --profile production
npx eas build --platform ios --profile production
```

## 🖥️ Backend (Node.js)

### Development (Windows/PowerShell)

```powershell
cd backend

# Instalar
npm install

# Ejecutar en modo SOAP (producción)
npm start

# O ejecutar mock (sin SOAP real)
npm run start:mock

# Por defecto escucha en http://localhost:3000
```

### Environment Variables

```powershell
# Crear archivo .env en backend/
$env:SOAP_URL = "http://tu-servidor-soap:port/service"
$env:API_PORT = "3000"
$env:NODE_ENV = "production"

npm start
```

## 📊 Scripts de Análisis (Python)

### Setup Python

```powershell
# Crear virtualenv (si no existe)
python -m venv venv
.\venv\Scripts\Activate.ps1

# Instalar dependencias (si existen)
# pip install -r requirements.txt
```

### Usar Scripts

```powershell
# Extraer XPZ (Windows)
.\scripts\extract_xpz.ps1 -Input .\xpz\PRODUCTO_APP_SHEMA_DESA1.xpz -Out .\build\xpz_extracted

# Analizar
python .\scripts\parse_xpz_deep.py -i .\build\xpz_extracted\PRODUCTO_APP_SHEMA_DESA1.xml -o .\build\xpz_deep_inventory

# Generar resumen de migración
python .\scripts\generate_migration_summary.py -i .\build\xpz_deep_inventory.json -o .\build\MIGRATION_SUMMARY.json
```

## 🚀 Deployment a Producción

### Paso 1: Publicar Mobile App

#### Opción A: Expo (Recomendado para MVP)
```powershell
cd mobile

# Login a Expo
npx expo login

# Publicar
npx expo publish

# O construir para stores
npx eas build --platform android --profile production
npx eas build --platform ios --profile production
```

#### Opción B: Google Play Store
```powershell
# Generar APK o AAB
npx eas build --platform android --profile production

# Subir a Google Play Console
# (requiere configuración de signing keys)
```

#### Opción C: Apple App Store
```powershell
# Generar IPA
npx eas build --platform ios --profile production

# Subir a App Store Connect
# (requiere cuenta de desarrollador Apple)
```

### Paso 2: Desplegar Backend

#### Docker (Recomendado)

```dockerfile
# Crear Dockerfile en backend/
FROM node:18-slim

WORKDIR /app
COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000
CMD ["npm", "start"]
```

```powershell
# Build y push
docker build -t appmovilrn-backend:latest .
docker tag appmovilrn-backend:latest your-registry/appmovilrn-backend:latest
docker push your-registry/appmovilrn-backend:latest

# Deploy en servidor
docker run -d -p 3000:3000 \
  -e SOAP_URL=http://tu-servidor-soap \
  -e NODE_ENV=production \
  your-registry/appmovilrn-backend:latest
```

#### PM2 (Node.js nativo)

```powershell
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar backend
cd backend
pm2 start server-soap.js --name "app-afiliados"

# Configurar para reinicio automático
pm2 startup
pm2 save

# Monitorear
pm2 logs app-afiliados
pm2 monit
```

### Paso 3: Variables de Entorno en Producción

```bash
# backend/.env (producción)
NODE_ENV=production
API_PORT=3000
SOAP_URL=https://produccion-soap-server/service
SOAP_USERNAME=user_produccion
SOAP_PASSWORD=pass_produccion
LOG_LEVEL=info
```

## 📊 Monitoreo

### Logs

```powershell
# Local
npm start 2>&1 | Tee-Object -FilePath logs.txt

# PM2
pm2 logs
pm2 logs app-afiliados

# Docker
docker logs container-name
```

### Health Check

```powershell
# Verificar backend activo
curl http://localhost:3000/health

# Esperado:
# {"status":"ok","uptime":"120s"}
```

## 🔒 Checklist Pre-Producción

- [ ] .env no incluye datos sensibles en git
- [ ] USE_MOCK=false en mobile/.env
- [ ] API_BASE_URL_ANDROID/API_BASE_URL_IOS apuntan a backend de producción
- [ ] SOAP_URL apunta a servidor correcto
- [ ] Certificados SSL configurados
- [ ] Logs configurados (no verbose en prod)
- [ ] Database backups activos
- [ ] Monitoreo y alertas setup
- [ ] Rollback plan en caso de problemas

## 🐛 Troubleshooting

### Mobile no conecta al backend
```powershell
# 1. Verificar variables en mobile/.env
# 2. Verificar que backend está corriendo
curl http://10.0.2.2:3000/auth/login

# 3. Si usas AVD:
#    - 10.0.2.2 = localhost del host
#    - Desde host: http://localhost:3000
#    - Desde AVD: http://10.0.2.2:3000

# 4. Si usas dispositivo real:
#    - Por USB: adb reverse tcp:3000 tcp:3000
#    - O usar IP de la máquina: http://192.168.x.x:3000
```

### Backend no inicia
```powershell
# 1. Verificar dependencias
npm install

# 2. Ver errores
node server-soap.js

# 3. Verificar puerto disponible
netstat -ano | findstr :3000
```

## 📚 Recursos Útiles

- [Expo Docs](https://docs.expo.dev/)
- [React Native Deployment](https://reactnative.dev/docs/publishing-to-app-stores)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Docker Node.js](https://github.com/nodejs/docker-node)

---

**Última actualización**: 2 de diciembre de 2025
