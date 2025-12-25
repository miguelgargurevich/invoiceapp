# Deployment en Render

Este proyecto está configurado para desplegarse en Render usando el archivo `render.yaml`.

## Pasos para desplegar:

### 1. Conectar con GitHub

1. Ve a [Render Dashboard](https://dashboard.render.com/)
2. Click en "New +" → "Blueprint"
3. Conecta tu repositorio de GitHub
4. Render detectará automáticamente el archivo `render.yaml`

### 2. Configurar Variables de Entorno

En el dashboard de Render, configura las siguientes variables de entorno:

```env
DATABASE_URL=postgresql://postgres.cqvcauymipatkmckekrv:doqqyt-negtix-7hYwza@aws-0-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.cqvcauymipatkmckekrv:doqqyt-negtix-7hYwza@aws-0-us-east-2.pooler.supabase.com:5432/postgres
SUPABASE_URL=https://cqvcauymipatkmckekrv.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxdmNhdXltaXBhdGttY2tla3J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2ODYwNjEsImV4cCI6MjA4MjI2MjA2MX0.3-N7SPVSrkzKXMcXQo2AgVrH0xgdxip-btwp0z-hRPE
JWT_SECRET=tu_secreto_jwt_generado_automaticamente
NODE_ENV=production
PORT=4000
FRONTEND_URL=https://tu-app.vercel.app
```

### 3. Deploy

1. Click en "Apply" para crear el servicio
2. Render automáticamente:
   - Instalará las dependencias
   - Ejecutará `prisma generate`
   - Iniciará el servidor

### 4. Actualizar Frontend

Una vez que tu backend esté desplegado, actualiza la variable de entorno en Vercel:

```env
NEXT_PUBLIC_API_URL=https://tu-backend.onrender.com
```

## Estructura del Proyecto

```
apps/
  backend/
    app.js          # Servidor Express
    package.json    # Dependencias y scripts
    prisma/
      schema.prisma # Esquema de base de datos
    src/
      routes/       # Rutas de la API
      middleware/   # Middleware de autenticación
```

## Scripts Disponibles

- `npm start` - Inicia el servidor en producción
- `npm run dev` - Inicia el servidor en desarrollo con nodemon
- `npm run build` - Genera el cliente de Prisma
- `npm run deploy` - Ejecuta migraciones y arranca el servidor

## Notas

- El servicio gratuito de Render puede tardar ~1 minuto en arrancar después de inactividad
- Los archivos subidos se almacenan en el sistema de archivos (se pierden en cada deploy)
- Para producción, considera usar un servicio de almacenamiento como AWS S3 o Cloudinary
