# 🚀 InvoiceApp - Sistema de Facturación

Sistema completo de facturación electrónica con Next.js 14 (App Router) y Express.js.

## 📋 Requisitos Previos

- Node.js 18+ 
- npm o yarn
- PostgreSQL (Supabase configurado)

## 🏗️ Estructura del Proyecto

```
InvoiceApp/
├── apps/
│   ├── frontend/          # Next.js 14 App Router
│   │   ├── app/          # Rutas y páginas
│   │   ├── components/   # Componentes reutilizables
│   │   ├── contexts/     # Context API (Auth, Theme)
│   │   └── lib/          # Utilidades y API
│   │
│   └── backend/          # Express.js API
│       ├── src/
│       │   ├── routes/   # Endpoints
│       │   ├── middleware/
│       │   └── utils/
│       └── prisma/       # Esquema y migraciones
│
├── docs/                 # Documentación
└── supabase/            # Migraciones de Supabase
```

## 🚀 Inicio Rápido

### 1. Instalar Dependencias

```bash
# Instalar todas las dependencias (frontend + backend)
npm install
```

### 2. Configurar Variables de Entorno

Ya están configuradas en:
- `apps/frontend/.env.local`
- `apps/backend/.env`

### 3. Iniciar Aplicación (Frontend + Backend)

```bash
# Inicia ambos servidores simultáneamente
npm run dev
```

Esto iniciará:
- **Backend**: http://localhost:4000
- **Frontend**: http://localhost:3000

### 4. Comandos Individuales

```bash
# Solo backend
npm run dev:backend

# Solo frontend  
npm run dev:frontend
```

## 🗄️ Base de Datos

### Estado Actual
✅ Estructura creada en PostgreSQL (Supabase)  
✅ Datos de prueba cargados  

Ver detalles en: [DATOS_PRUEBA.md](DATOS_PRUEBA.md)

### Comandos Prisma

```bash
cd apps/backend

# Ver estado de migraciones
npx prisma migrate status

# Crear nueva migración
npx prisma migrate dev --name nombre_migracion

# Regenerar cliente Prisma
npx prisma generate

# Abrir Prisma Studio (GUI para BD)
npx prisma studio

# Resetear BD (¡cuidado!)
npx prisma migrate reset

# Cargar datos de prueba
node prisma/seed.js
```

## 🔐 Autenticación

El sistema usa **Supabase Auth**. 

⚠️ **Antes de usar el sistema, debes**:
1. Crear un usuario en Supabase Auth
2. Vincular el UUID del usuario con la empresa

Ver instrucciones completas en [DATOS_PRUEBA.md](DATOS_PRUEBA.md#-autenticación)

## 📦 Scripts Disponibles

### Raíz del proyecto
```bash
npm run dev              # Inicia frontend + backend
npm run dev:frontend     # Solo frontend (Next.js)
npm run dev:backend      # Solo backend (Express)
npm run build            # Build de ambos proyectos
npm run start            # Inicia ambos en modo producción
```

### Backend (apps/backend)
```bash
npm run dev              # Desarrollo con nodemon
npm start                # Producción
```

### Frontend (apps/frontend)
```bash
npm run dev              # Desarrollo
npm run build            # Build para producción
npm start                # Servidor de producción
npm run lint             # ESLint
```

## 🌐 URLs del Sistema

| Servicio | URL | Descripción |
|----------|-----|-------------|
| Frontend | http://localhost:3000 | Aplicación Next.js |
| Backend API | http://localhost:4000 | API REST Express |
| Health Check | http://localhost:4000/health | Estado del backend |
| Supabase | https://cqvcauymipatkmckekrv.supabase.co | Base de datos |

## 📱 Rutas Principales

### Frontend
- `/es/login` - Login
- `/es/dashboard` - Panel principal
- `/es/clientes` - Gestión de clientes
- `/es/productos` - Gestión de productos
- `/es/facturas` - Gestión de facturas
- `/es/reportes` - Reportes y estadísticas
- `/es/configuracion` - Configuración

### Backend API
- `GET /health` - Health check
- `POST /api/auth/login` - Login
- `GET /api/empresas` - Empresas
- `GET /api/clientes` - Clientes
- `GET /api/productos` - Productos
- `GET /api/facturas` - Facturas
- `GET /api/dashboard` - Datos del dashboard

## 🛠️ Stack Tecnológico

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS
- **Internacionalización**: next-intl
- **Formularios**: React Hook Form
- **Gráficos**: Recharts
- **Iconos**: Lucide React
- **Auth**: Supabase Auth

### Backend
- **Framework**: Express.js 5
- **ORM**: Prisma 7
- **Base de Datos**: PostgreSQL (Supabase)
- **Auth**: Supabase + JWT
- **Validación**: Zod
- **Seguridad**: Helmet, CORS, Rate Limiting

## 🔧 Desarrollo

### Hot Reload
Ambos servidores soportan hot reload:
- **Frontend**: Actualización automática de Next.js
- **Backend**: Nodemon reinicia al detectar cambios

### Logs
Los logs se muestran con prefijos de color:
- 🔵 **backend**: Azul
- 🟣 **frontend**: Magenta

### Reiniciar Servidores
En la terminal donde corre `npm run dev`, presiona:
- `Ctrl + C` para detener
- `npm run dev` para reiniciar

## 📝 Notas Importantes

1. **Puerto 3000 y 4000**: Asegúrate de que estén disponibles
2. **Variables de entorno**: Ya configuradas, no las subas a Git
3. **Prisma 7**: Requiere adapter de PostgreSQL (`@prisma/adapter-pg`)
4. **CORS**: Configurado para `http://localhost:3000`

## 🐛 Problemas Comunes

### Error: Puerto en uso
```bash
# MacOS/Linux
lsof -ti:3000 | xargs kill -9
lsof -ti:4000 | xargs kill -9
```

### Error: Prisma Client no generado
```bash
cd apps/backend
npx prisma generate
```

### Error: Cannot connect to database
Verifica las variables en `apps/backend/.env`

## 📚 Documentación Adicional

- [Datos de Prueba](DATOS_PRUEBA.md)
- [Prompt del Sistema](PROMPT_SISTEMA_FACTURACION.md)

## 🤝 Contribuir

1. Crea una rama: `git checkout -b feature/nueva-funcionalidad`
2. Commit: `git commit -m 'Agrega nueva funcionalidad'`
3. Push: `git push origin feature/nueva-funcionalidad`
4. Pull Request

## 📄 Licencia

ISC

---

Desarrollado con ❤️ usando Next.js 14 y Express.js
