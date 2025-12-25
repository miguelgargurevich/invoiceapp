# Configuración de CORS para Múltiples Dominios

## Dominios Permitidos por Defecto

El backend está configurado para permitir CORS desde:

1. **Localhost (desarrollo):**
   - `http://localhost:3000`
   - `http://localhost:3001`
   - Cualquier puerto localhost en modo desarrollo

2. **Vercel (producción):**
   - `https://invoiceapp.vercel.app`
   - `https://invoice-app.vercel.app`
   - Todos los deployments de Vercel: `https://*.vercel.app`
   - Deployments con prefijo invoiceapp: `https://invoiceapp-*.vercel.app`

3. **Variable de entorno:**
   - `FRONTEND_URL` (configurar en Render o .env)

## Agregar Dominios Personalizados

### Opción 1: Variable de Entorno (Recomendado)

Configura la variable `ALLOWED_ORIGINS` con dominios separados por comas:

```env
ALLOWED_ORIGINS=https://midominio.com,https://app.midominio.com,https://facturacion.miempresa.com
```

### Opción 2: Modificar el Código

Edita `app.js` y agrega los dominios al array `allowedOrigins`:

```javascript
const allowedOrigins = [
  'http://localhost:3000',
  'https://invoiceapp.vercel.app',
  'https://tudominio.com',          // Agregar aquí
  'https://app.tudominio.com',       // Agregar aquí
];
```

### Opción 3: Usar Patrones Regex

Para dominios con patrones, agrega regex a `allowedPatterns`:

```javascript
const allowedPatterns = [
  /^https:\/\/.*\.vercel\.app$/,
  /^https:\/\/.*\.tudominio\.com$/,  // Permite todos los subdominios
  /^https:\/\/app-.*\.miempresa\.com$/,  // Permite app-*.miempresa.com
];
```

## Variables de Entorno en Render

Configura estas variables en tu servicio de Render:

```env
NODE_ENV=production
FRONTEND_URL=https://invoiceapp.vercel.app
ALLOWED_ORIGINS=https://midominio.com,https://app.midominio.com
```

## Verificar CORS

Para verificar que CORS funciona correctamente:

```bash
# Prueba desde tu dominio
curl -H "Origin: https://tudominio.com" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://tu-backend.onrender.com/api/empresas

# Debe responder con:
# Access-Control-Allow-Origin: https://tudominio.com
# Access-Control-Allow-Credentials: true
```

## Características de Seguridad

✅ **Whitelist explícita:** Solo dominios configurados tienen acceso  
✅ **Regex patterns:** Soporta patrones para subdominios dinámicos  
✅ **Credenciales:** `credentials: true` para cookies/auth  
✅ **Métodos HTTP:** GET, POST, PUT, DELETE, PATCH, OPTIONS  
✅ **Headers permitidos:** Content-Type, Authorization  
✅ **Cache preflight:** 24 horas (maxAge)  
✅ **Logs de bloqueo:** Registra origins bloqueados en consola  

## Troubleshooting

### Error: "Not allowed by CORS"

1. Verifica que tu dominio está en `allowedOrigins` o coincide con un patrón
2. Revisa los logs del backend: `CORS blocked origin: https://...`
3. Asegúrate que `FRONTEND_URL` y `ALLOWED_ORIGINS` están configurados en Render
4. Verifica que el origen incluye el protocolo completo (`https://`)

### Error: "No 'Access-Control-Allow-Origin' header"

1. El backend no está recibiendo el request
2. CORS middleware puede estar mal configurado
3. Verifica que el backend está corriendo y accesible

### Request funciona en desarrollo pero no en producción

1. Asegúrate de configurar `FRONTEND_URL` en Render
2. Agrega el dominio de producción a `ALLOWED_ORIGINS`
3. Verifica que el dominio usa HTTPS (no HTTP)

## Ejemplo de Configuración Completa

```env
# Render Environment Variables
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key

# Frontend URLs
FRONTEND_URL=https://invoiceapp.vercel.app

# Additional domains (comma-separated)
ALLOWED_ORIGINS=https://facturacion.miempresa.com,https://app.midominio.com,https://invoices.example.com

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db
```

## Múltiples Frontends

Si tienes múltiples aplicaciones frontend (ej: app principal, app móvil, panel admin):

```env
ALLOWED_ORIGINS=https://app.miempresa.com,https://admin.miempresa.com,https://mobile-api.miempresa.com
```

Todos estos dominios podrán hacer requests al backend con credenciales.
