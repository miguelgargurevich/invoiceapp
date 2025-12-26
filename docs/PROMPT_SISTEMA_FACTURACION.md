# 📋 PROMPT PARA CREAR SISTEMA DE FACTURACIÓN

> **Objetivo**: Crear una aplicación web completa para gestión de facturación empresarial con la misma arquitectura del proyecto Dashboard-LLM.

---

## 🏗️ ARQUITECTURA DEL PROYECTO

### Estructura de carpetas:

```
facturacion-app/
├── apps/
│   ├── backend/          # API REST con Express.js
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── middleware/
│   │   │   ├── services/
│   │   │   └── utils/
│   │   ├── prisma/       # ORM y migraciones
│   │   ├── uploads/      # Archivos subidos
│   │   ├── app.js
│   │   └── package.json
│   │
│   └── frontend/         # Next.js 14 App Router
│       ├── app/
│       │   ├── components/
│       │   │   ├── common/      # Componentes reutilizables
│       │   │   ├── facturas/    # Componentes de facturas
│       │   │   ├── proformas/   # Componentes de proformas
│       │   │   ├── clientes/    # Componentes de clientes
│       │   │   └── global/      # Layout, sidebar, etc.
│       │   ├── contexts/
│       │   ├── hooks/
│       │   ├── lib/
│       │   ├── login/
│       │   ├── dashboard/
│       │   ├── facturas/
│       │   ├── proformas/
│       │   ├── clientes/
│       │   ├── productos/
│       │   ├── reportes/
│       │   └── configuracion/
│       └── package.json
│
├── supabase/
│   └── migrations/
└── docs/
```

---

## 🔧 STACK TECNOLÓGICO

### Frontend:

| Tecnología | Versión | Uso |
|------------|---------|-----|
| Next.js | 14.x | Framework React con App Router |
| TypeScript | 5.x | Tipado estático |
| TailwindCSS | 3.x | Estilos con tema oscuro/claro |
| Lucide React | 0.294.x | Iconos |
| Framer Motion | 12.x | Animaciones |
| React Hot Toast | 2.x | Notificaciones |
| cmdk | 1.x | Command Palette (Cmd+K) |
| Recharts | 2.x | Gráficos y reportes |
| React Hook Form | 7.x | Manejo de formularios |
| Zod | 3.x | Validación de schemas |
| @tanstack/react-table | 8.x | Tablas con virtualización |
| @react-pdf/renderer | 3.x | Generación de PDFs |
| @supabase/ssr | 0.6.x | Auth SSR |
| @supabase/supabase-js | 2.x | Cliente Supabase |
| xlsx | 0.18.x | Importación/exportación Excel |
| date-fns | 2.x | Manejo de fechas |
| clsx + tailwind-merge | 2.x | Utilidades de clases |

### Backend:

| Tecnología | Versión | Uso |
|------------|---------|-----|
| Express.js | 4.x | Framework HTTP |
| Prisma | 5.x | ORM |
| PostgreSQL | 15.x | Base de datos (Supabase) |
| Supabase Storage | - | Almacenamiento de archivos |
| Helmet | 7.x | Seguridad HTTP |
| CORS | 2.x | Cross-Origin |
| Morgan | 1.x | Logging |
| JSON Web Token | 9.x | Autenticación |
| Multer | 1.x | Upload de archivos |
| Express Rate Limit | 7.x | Rate limiting |
| Zod | 3.x | Validación |

### Base de Datos (Supabase):

- PostgreSQL hospedado en Supabase
- Supabase Storage para logos, adjuntos de facturas
- Supabase Auth para autenticación
- Row Level Security (RLS) para multi-tenancy

---

## 📊 MODELOS DE BASE DE DATOS (Prisma Schema)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// 🏢 Empresa/Organización del usuario
model Empresa {
  id              String    @id @default(uuid())
  nombre          String
  ruc             String    @unique
  direccion       String?
  telefono        String?
  email           String?
  logoUrl         String?   @map("logo_url")
  moneda          String    @default("PEN")
  serieFactura    String    @default("F001") @map("serie_factura")
  serieProforma   String    @default("P001") @map("serie_proforma")
  userId          String    @map("user_id")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  
  clientes        Cliente[]
  productos       Producto[]
  facturas        Factura[]
  proformas       Proforma[]
  categorias      Categoria[]
  
  @@index([userId], map: "idx_empresa_user_id")
  @@map("empresas")
}

// 👥 Clientes
model Cliente {
  id              String    @id @default(uuid())
  empresaId       String    @map("empresa_id")
  tipoDocumento   String    @map("tipo_documento") // RUC, DNI, CE
  numeroDocumento String    @map("numero_documento")
  razonSocial     String    @map("razon_social")
  nombreComercial String?   @map("nombre_comercial")
  direccion       String?
  email           String?
  telefono        String?
  contacto        String?   // Persona de contacto
  notas           String?
  activo          Boolean   @default(true)
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  
  empresa         Empresa   @relation(fields: [empresaId], references: [id], onDelete: Cascade)
  facturas        Factura[]
  proformas       Proforma[]
  
  @@unique([empresaId, numeroDocumento])
  @@index([empresaId], map: "idx_cliente_empresa_id")
  @@index([numeroDocumento], map: "idx_cliente_documento")
  @@map("clientes")
}

// 📦 Productos/Servicios
model Producto {
  id              String    @id @default(uuid())
  empresaId       String    @map("empresa_id")
  codigo          String?
  nombre          String
  descripcion     String?
  unidadMedida    String    @default("UND") @map("unidad_medida")
  precioUnitario  Decimal   @map("precio_unitario") @db.Decimal(10, 2)
  precioConIgv    Boolean   @default(true) @map("precio_con_igv")
  categoriaId     String?   @map("categoria_id")
  stockActual     Int?      @map("stock_actual")
  stockMinimo     Int?      @map("stock_minimo")
  activo          Boolean   @default(true)
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  
  empresa         Empresa    @relation(fields: [empresaId], references: [id], onDelete: Cascade)
  categoria       Categoria? @relation(fields: [categoriaId], references: [id])
  detallesFactura DetalleFactura[]
  detallesProforma DetalleProforma[]
  
  @@unique([empresaId, codigo])
  @@index([empresaId], map: "idx_producto_empresa_id")
  @@index([categoriaId], map: "idx_producto_categoria_id")
  @@map("productos")
}

// 🏷️ Categorías de productos
model Categoria {
  id          String    @id @default(uuid())
  empresaId   String    @map("empresa_id")
  nombre      String
  descripcion String?
  color       String?
  activo      Boolean   @default(true)
  createdAt   DateTime  @default(now()) @map("created_at")
  
  empresa     Empresa   @relation(fields: [empresaId], references: [id], onDelete: Cascade)
  productos   Producto[]
  
  @@unique([empresaId, nombre])
  @@map("categorias")
}

// 🧾 Facturas
model Factura {
  id                String    @id @default(uuid())
  empresaId         String    @map("empresa_id")
  clienteId         String    @map("cliente_id")
  serie             String
  numero            Int
  fechaEmision      DateTime  @map("fecha_emision")
  fechaVencimiento  DateTime? @map("fecha_vencimiento")
  
  // Montos
  subtotal          Decimal   @db.Decimal(10, 2)
  descuento         Decimal   @default(0) @db.Decimal(10, 2)
  igv               Decimal   @db.Decimal(10, 2)
  total             Decimal   @db.Decimal(10, 2)
  moneda            String    @default("PEN")
  tipoCambio        Decimal?  @map("tipo_cambio") @db.Decimal(10, 4)
  
  // Estado
  estado            String    @default("emitida") // emitida, pagada, anulada, vencida
  formaPago         String?   @map("forma_pago") // contado, credito_30, credito_60
  observaciones     String?
  
  // SUNAT (opcional para integración futura)
  enviadoSunat      Boolean   @default(false) @map("enviado_sunat")
  cdrSunat          String?   @map("cdr_sunat")
  hashSunat         String?   @map("hash_sunat")
  
  // Archivos adjuntos (Supabase Storage)
  pdfUrl            String?   @map("pdf_url")
  xmlUrl            String?   @map("xml_url")
  
  proformaOrigenId  String?   @map("proforma_origen_id")
  userId            String    @map("user_id")
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")
  
  empresa           Empresa   @relation(fields: [empresaId], references: [id])
  cliente           Cliente   @relation(fields: [clienteId], references: [id])
  proformaOrigen    Proforma? @relation(fields: [proformaOrigenId], references: [id])
  detalles          DetalleFactura[]
  pagos             PagoFactura[]
  
  @@unique([empresaId, serie, numero])
  @@index([empresaId], map: "idx_factura_empresa_id")
  @@index([clienteId], map: "idx_factura_cliente_id")
  @@index([fechaEmision(sort: Desc)], map: "idx_factura_fecha")
  @@index([estado], map: "idx_factura_estado")
  @@map("facturas")
}

// 📝 Detalle de Factura
model DetalleFactura {
  id              String   @id @default(uuid())
  facturaId       String   @map("factura_id")
  productoId      String?  @map("producto_id")
  descripcion     String
  cantidad        Decimal  @db.Decimal(10, 3)
  unidadMedida    String   @map("unidad_medida")
  precioUnitario  Decimal  @map("precio_unitario") @db.Decimal(10, 4)
  descuento       Decimal  @default(0) @db.Decimal(10, 2)
  subtotal        Decimal  @db.Decimal(10, 2)
  igv             Decimal  @db.Decimal(10, 2)
  total           Decimal  @db.Decimal(10, 2)
  orden           Int      @default(0)
  
  factura         Factura   @relation(fields: [facturaId], references: [id], onDelete: Cascade)
  producto        Producto? @relation(fields: [productoId], references: [id])
  
  @@index([facturaId], map: "idx_detalle_factura_id")
  @@map("detalles_factura")
}

// 💵 Pagos de Factura
model PagoFactura {
  id            String   @id @default(uuid())
  facturaId     String   @map("factura_id")
  fecha         DateTime
  monto         Decimal  @db.Decimal(10, 2)
  metodoPago    String   @map("metodo_pago") // efectivo, transferencia, tarjeta, cheque
  referencia    String?  // Número de operación, cheque, etc.
  observaciones String?
  createdAt     DateTime @default(now()) @map("created_at")
  
  factura       Factura  @relation(fields: [facturaId], references: [id], onDelete: Cascade)
  
  @@index([facturaId], map: "idx_pago_factura_id")
  @@map("pagos_factura")
}

// 📋 Proformas/Cotizaciones
model Proforma {
  id                String    @id @default(uuid())
  empresaId         String    @map("empresa_id")
  clienteId         String    @map("cliente_id")
  serie             String
  numero            Int
  fechaEmision      DateTime  @map("fecha_emision")
  fechaValidez      DateTime? @map("fecha_validez")
  
  // Montos
  subtotal          Decimal   @db.Decimal(10, 2)
  descuento         Decimal   @default(0) @db.Decimal(10, 2)
  igv               Decimal   @db.Decimal(10, 2)
  total             Decimal   @db.Decimal(10, 2)
  moneda            String    @default("PEN")
  tipoCambio        Decimal?  @map("tipo_cambio") @db.Decimal(10, 4)
  
  // Estado
  estado            String    @default("pendiente") // pendiente, aceptada, rechazada, vencida, facturada
  condiciones       String?   // Condiciones de pago/entrega
  observaciones     String?
  
  // Archivos (Supabase Storage)
  pdfUrl            String?   @map("pdf_url")
  
  userId            String    @map("user_id")
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")
  
  empresa           Empresa   @relation(fields: [empresaId], references: [id])
  cliente           Cliente   @relation(fields: [clienteId], references: [id])
  detalles          DetalleProforma[]
  facturasGeneradas Factura[]
  
  @@unique([empresaId, serie, numero])
  @@index([empresaId], map: "idx_proforma_empresa_id")
  @@index([clienteId], map: "idx_proforma_cliente_id")
  @@index([fechaEmision(sort: Desc)], map: "idx_proforma_fecha")
  @@index([estado], map: "idx_proforma_estado")
  @@map("proformas")
}

// 📝 Detalle de Proforma
model DetalleProforma {
  id              String    @id @default(uuid())
  proformaId      String    @map("proforma_id")
  productoId      String?   @map("producto_id")
  descripcion     String
  cantidad        Decimal   @db.Decimal(10, 3)
  unidadMedida    String    @map("unidad_medida")
  precioUnitario  Decimal   @map("precio_unitario") @db.Decimal(10, 4)
  descuento       Decimal   @default(0) @db.Decimal(10, 2)
  subtotal        Decimal   @db.Decimal(10, 2)
  igv             Decimal   @db.Decimal(10, 2)
  total           Decimal   @db.Decimal(10, 2)
  orden           Int       @default(0)
  
  proforma        Proforma  @relation(fields: [proformaId], references: [id], onDelete: Cascade)
  producto        Producto? @relation(fields: [productoId], references: [id])
  
  @@index([proformaId], map: "idx_detalle_proforma_id")
  @@map("detalles_proforma")
}

// 📊 Configuración de numeración
model ConfiguracionSeries {
  id              String   @id @default(uuid())
  empresaId       String   @map("empresa_id")
  tipoDocumento   String   @map("tipo_documento") // factura, proforma, boleta
  serie           String
  ultimoNumero    Int      @default(0) @map("ultimo_numero")
  activa          Boolean  @default(true)
  
  @@unique([empresaId, tipoDocumento, serie])
  @@map("configuracion_series")
}
```

---

## 🔐 AUTENTICACIÓN Y SEGURIDAD

### AuthContext (Frontend)

```typescript
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { apiClient } from '@/lib/api'

interface AuthContextType {
  user: User | null
  loading: boolean
  empresa: Empresa | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [empresa, setEmpresa] = useState<Empresa | null>(null)

  useEffect(() => {
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        if (session?.access_token) {
          apiClient.setToken(session.access_token);
        }
      } catch (err) {
        console.error('[AuthContext] Error getting initial session:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        if (session?.access_token) {
          apiClient.setToken(session.access_token);
        }
        setLoading(false);
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  // Cargar empresa del usuario
  useEffect(() => {
    const loadEmpresa = async () => {
      if (!user) {
        setEmpresa(null);
        return;
      }
      try {
        const response = await apiClient.get('/empresas/mi-empresa');
        setEmpresa(response.data);
      } catch (error) {
        console.error('Error cargando empresa:', error);
      }
    };
    loadEmpresa();
  }, [user]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signUp = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } }
    })
    if (error) throw error
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setEmpresa(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, empresa, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
```

### Middleware Auth (Backend)

```javascript
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acceso requerido' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(403).json({ error: 'Token inválido' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.email
    };

    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido' });
  }
};

module.exports = { authenticateToken, supabase };
```

---

## 🎨 FUNCIONALIDADES DEL FRONTEND

### 1. Dashboard Principal

- Resumen de ventas del mes/año
- Facturas pendientes de cobro
- Gráficos de ingresos (Recharts)
- Últimas facturas emitidas
- Alertas de facturas vencidas
- Métricas: Total facturado, cobrado, pendiente

### 2. Módulo de Clientes

- CRUD completo de clientes
- Búsqueda y filtros avanzados
- Consulta RUC/DNI (API SUNAT/RENIEC)
- Historial de compras por cliente
- Exportación a Excel

### 3. Módulo de Productos/Servicios

- CRUD de productos y servicios
- Categorización
- Manejo de precios con/sin IGV
- Control de stock opcional
- Importación masiva desde Excel

### 4. Módulo de Facturas

- Creación de facturas con autocompletado
- Selección de cliente y productos
- Cálculo automático de IGV (18%)
- Descuentos por ítem y global
- Vista previa en tiempo real
- Generación de PDF descargable
- Estado de pago y seguimiento
- Registro de pagos parciales
- Anulación de facturas

### 5. Módulo de Proformas

- Similar a facturas pero como cotización
- Conversión de proforma a factura
- Fecha de validez
- Condiciones comerciales
- Envío por email al cliente

### 6. Reportes

- Ventas por período
- Ventas por cliente
- Productos más vendidos
- Facturas pendientes de cobro
- Exportación a Excel/PDF

### 7. Configuración

- Datos de la empresa
- Logo de empresa (Supabase Storage)
- Series de facturación
- Usuarios y permisos (opcional)

---

## 📱 COMPONENTES UI REQUERIDOS

### Command Palette (Cmd+K)

```typescript
// Implementar con cmdk
// Acciones:
- Ir a Dashboard
- Nueva Factura
- Nueva Proforma
- Nuevo Cliente
- Nuevo Producto
- Buscar factura por número
- Buscar cliente por RUC/nombre
- Ver reportes
- Configuración
```

### Componentes comunes

| Componente | Descripción |
|------------|-------------|
| Sidebar | Navegación principal colapsable |
| Header | Usuario, empresa activa, notificaciones |
| DataTable | Tablas con paginación, filtros, ordenamiento |
| Modal | Modales reutilizables con framer-motion |
| Toast | Notificaciones con react-hot-toast |
| Form | Formularios con react-hook-form + zod |
| DatePicker | Selector de fechas |
| Select | Select con búsqueda para clientes/productos |
| ThemeToggle | Cambio entre tema oscuro/claro |
| LoadingSpinner | Indicadores de carga |
| EmptyState | Estados vacíos con ilustraciones |
| ConfirmDialog | Confirmación de acciones destructivas |

---

## � DISEÑO RESPONSIVE (Mobile, Tablet, Desktop)

### Breakpoints de TailwindCSS

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    screens: {
      'xs': '375px',    // iPhone SE, móviles pequeños
      'sm': '640px',    // Móviles grandes
      'md': '768px',    // iPad Mini, tablets pequeñas
      'lg': '1024px',   // iPad Pro, tablets grandes
      'xl': '1280px',   // Laptops
      '2xl': '1536px',  // Monitores grandes
    },
  },
}
```

### 📱 Móvil (< 640px)

| Componente | Comportamiento |
|------------|----------------|
| **Sidebar** | Oculto por defecto, se muestra como drawer desde la izquierda con hamburger menu |
| **Header** | Compacto: logo + hamburger + avatar usuario |
| **Tablas** | Vista de tarjetas (cards) en lugar de tabla, una tarjeta por registro |
| **Formularios** | Campos en una sola columna, botones full-width |
| **Modales** | Full screen (pantalla completa) |
| **Acciones** | Bottom sheet para acciones contextuales |
| **Command Palette** | Full width con padding reducido |
| **Gráficos** | Apilados verticalmente, scroll horizontal si necesario |
| **Facturas/Proformas** | Detalle en accordion/expandible |

```tsx
// Ejemplo: Sidebar responsive
<aside className={`
  fixed inset-y-0 left-0 z-50
  transform transition-transform duration-300
  w-64 bg-gray-900
  ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
  md:translate-x-0 md:static md:inset-auto
`}>
  {/* Contenido del sidebar */}
</aside>

// Overlay para cerrar sidebar en móvil
{sidebarOpen && (
  <div 
    className="fixed inset-0 bg-black/50 z-40 md:hidden"
    onClick={() => setSidebarOpen(false)}
  />
)}
```

```tsx
// Ejemplo: Tabla responsive con vista de tarjetas
<div className="hidden md:block">
  <Table>{/* Vista tabla normal */}</Table>
</div>

<div className="md:hidden space-y-3">
  {facturas.map((factura) => (
    <div key={factura.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-semibold">{factura.serie}-{factura.numero}</p>
          <p className="text-sm text-gray-500">{factura.cliente.razonSocial}</p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs ${getEstadoColor(factura.estado)}`}>
          {factura.estado}
        </span>
      </div>
      <div className="mt-3 flex justify-between items-center">
        <p className="text-lg font-bold">S/ {factura.total}</p>
        <button className="text-blue-500">Ver detalle →</button>
      </div>
    </div>
  ))}
</div>
```

### 📱 Tablet / iPad (768px - 1024px)

| Componente | Comportamiento |
|------------|----------------|
| **Sidebar** | Colapsado a iconos (60px), expandible on hover o click |
| **Header** | Completo con búsqueda visible |
| **Tablas** | Tabla normal pero con columnas priorizadas (ocultar menos importantes) |
| **Formularios** | 2 columnas para campos |
| **Modales** | Centrados con max-width: 600px |
| **Dashboard** | Grid de 2 columnas para métricas |
| **Gráficos** | 2 por fila |

```tsx
// Ejemplo: Sidebar colapsable para tablet
<aside className={`
  fixed inset-y-0 left-0 z-50
  transition-all duration-300
  bg-gray-900 text-white
  ${sidebarCollapsed ? 'w-16' : 'w-64'}
  hover:w-64 group
`}>
  <nav className="mt-8">
    {menuItems.map((item) => (
      <Link 
        key={item.href}
        href={item.href}
        className="flex items-center px-4 py-3 hover:bg-gray-800"
      >
        <item.icon className="w-5 h-5 shrink-0" />
        <span className={`ml-3 whitespace-nowrap ${sidebarCollapsed ? 'opacity-0 group-hover:opacity-100' : ''}`}>
          {item.label}
        </span>
      </Link>
    ))}
  </nav>
</aside>

// Contenido principal con margen dinámico
<main className={`transition-all duration-300 ${sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'}`}>
  {children}
</main>
```

```tsx
// Ejemplo: Grid responsive para dashboard
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  <MetricCard title="Ventas del Mes" value="S/ 45,230" icon={DollarSign} />
  <MetricCard title="Facturas Emitidas" value="127" icon={FileText} />
  <MetricCard title="Por Cobrar" value="S/ 12,450" icon={Clock} />
  <MetricCard title="Clientes Activos" value="48" icon={Users} />
</div>
```

### 💻 Desktop (> 1024px)

| Componente | Comportamiento |
|------------|----------------|
| **Sidebar** | Siempre visible, expandido (240px-280px) |
| **Header** | Completo con búsqueda, notificaciones, accesos rápidos |
| **Tablas** | Todas las columnas visibles, acciones inline |
| **Formularios** | 2-3 columnas según el formulario |
| **Modales** | Centrados con tamaños variados (sm, md, lg, xl) |
| **Dashboard** | Grid completo 4 columnas |
| **Split View** | Lista + Detalle lado a lado |

```tsx
// Ejemplo: Vista split para facturas en desktop
<div className="flex h-[calc(100vh-64px)]">
  {/* Lista de facturas */}
  <div className="w-full lg:w-1/3 xl:w-1/4 border-r overflow-y-auto">
    <FacturasList 
      facturas={facturas} 
      selectedId={selectedId}
      onSelect={setSelectedId}
    />
  </div>
  
  {/* Detalle de factura - solo en desktop */}
  <div className="hidden lg:block lg:w-2/3 xl:w-3/4 overflow-y-auto">
    {selectedId ? (
      <FacturaDetail facturaId={selectedId} />
    ) : (
      <EmptyState message="Selecciona una factura para ver el detalle" />
    )}
  </div>
</div>
```

### 🎨 Componentes Responsive Reutilizables

```tsx
// components/common/ResponsiveTable.tsx
interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  renderCard: (item: T) => React.ReactNode;
  onRowClick?: (item: T) => void;
}

export function ResponsiveTable<T>({ data, columns, renderCard, onRowClick }: ResponsiveTableProps<T>) {
  return (
    <>
      {/* Vista Desktop: Tabla */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {data.map((item, idx) => (
              <tr 
                key={idx} 
                onClick={() => onRowClick?.(item)}
                className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 whitespace-nowrap">
                    {col.render ? col.render(item) : item[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Vista Móvil: Tarjetas */}
      <div className="md:hidden space-y-3 p-4">
        {data.map((item, idx) => (
          <div 
            key={idx}
            onClick={() => onRowClick?.(item)}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4"
          >
            {renderCard(item)}
          </div>
        ))}
      </div>
    </>
  );
}
```

```tsx
// components/common/ResponsiveModal.tsx
interface ResponsiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export function ResponsiveModal({ isOpen, onClose, title, children, size = 'md' }: ResponsiveModalProps) {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={`
              fixed z-50 bg-white dark:bg-gray-900 rounded-t-2xl md:rounded-2xl shadow-xl
              
              /* Móvil: Full screen desde abajo */
              inset-x-0 bottom-0 max-h-[90vh]
              
              /* Desktop: Centrado */
              md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2
              md:max-h-[85vh] md:w-full ${sizeClasses[size]}
            `}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h2 className="text-lg font-semibold">{title}</h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Content */}
            <div className="overflow-y-auto p-4 max-h-[calc(90vh-120px)] md:max-h-[calc(85vh-120px)]">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

```tsx
// components/common/ResponsiveForm.tsx
interface ResponsiveFormGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3;
}

export function ResponsiveFormGrid({ children, columns = 2 }: ResponsiveFormGridProps) {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  };

  return (
    <div className={`grid ${gridClasses[columns]} gap-4`}>
      {children}
    </div>
  );
}

// Uso
<ResponsiveFormGrid columns={2}>
  <FormField label="RUC" name="ruc" />
  <FormField label="Razón Social" name="razonSocial" />
  <FormField label="Dirección" name="direccion" className="md:col-span-2" />
  <FormField label="Email" name="email" />
  <FormField label="Teléfono" name="telefono" />
</ResponsiveFormGrid>
```

### 📊 Gráficos Responsive

```tsx
// components/charts/ResponsiveChart.tsx
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export function SalesChart({ data }: { data: any[] }) {
  return (
    <div className="w-full h-64 md:h-80 lg:h-96">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis 
            dataKey="mes" 
            tick={{ fontSize: 12 }}
            // Ocultar algunas etiquetas en móvil
            interval={'preserveStartEnd'}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            // Formato corto para móvil
            tickFormatter={(value) => 
              value >= 1000 ? `${(value/1000).toFixed(0)}k` : value
            }
          />
          <Tooltip />
          <Legend 
            wrapperStyle={{ fontSize: '12px' }}
            // En móvil, leyenda abajo
            layout="horizontal"
            verticalAlign="bottom"
          />
          <Line type="monotone" dataKey="ventas" stroke="#3B82F6" strokeWidth={2} />
          <Line type="monotone" dataKey="cobrado" stroke="#10B981" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

### 🔧 Hooks para Responsive

```tsx
// hooks/useMediaQuery.ts
import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

// hooks/useBreakpoint.ts
export function useBreakpoint() {
  const isMobile = useMediaQuery('(max-width: 639px)');
  const isTablet = useMediaQuery('(min-width: 640px) and (max-width: 1023px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  return { isMobile, isTablet, isDesktop };
}

// Uso
function FacturasPage() {
  const { isMobile, isDesktop } = useBreakpoint();

  return (
    <div>
      {isMobile && <MobileFacturasList />}
      {!isMobile && <DesktopFacturasTable />}
      
      {isDesktop && <FacturaPreviewPanel />}
    </div>
  );
}
```

### 📋 Checklist de Responsive

- [ ] **Navegación**: Sidebar colapsable/drawer en móvil
- [ ] **Tablas**: Vista cards en móvil, tabla en desktop
- [ ] **Formularios**: 1 columna móvil, 2-3 columnas desktop
- [ ] **Modales**: Full screen móvil, centrado desktop
- [ ] **Botones**: Full width en móvil, auto en desktop
- [ ] **Tipografía**: Tamaños adaptativos (text-sm md:text-base)
- [ ] **Espaciado**: Padding reducido en móvil (p-4 md:p-6)
- [ ] **Imágenes**: Lazy loading + srcset para diferentes densidades
- [ ] **Touch**: Áreas de toque mínimo 44x44px en móvil
- [ ] **Gráficos**: Usar ResponsiveContainer de Recharts
- [ ] **Print**: Estilos para impresión de facturas

---

## �📁 SUPABASE STORAGE

### Buckets requeridos

```sql
-- Crear buckets en Supabase
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('logos', 'logos', true),
  ('facturas-pdf', 'facturas-pdf', false),
  ('adjuntos', 'adjuntos', false);
```

### Políticas RLS

```sql
-- Política para logos (público)
CREATE POLICY "Logos públicos"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos');

-- Política para facturas (solo usuario dueño)
CREATE POLICY "Usuario puede ver sus facturas"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'facturas-pdf' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Usuario puede subir sus facturas"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'facturas-pdf' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

---

## 🔌 API ENDPOINTS (Backend)

### Autenticación

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/login` | Iniciar sesión |
| POST | `/api/auth/register` | Registrar usuario |
| POST | `/api/auth/logout` | Cerrar sesión |
| GET | `/api/auth/me` | Usuario actual |

### Empresas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/empresas/mi-empresa` | Obtener empresa del usuario |
| PUT | `/api/empresas/mi-empresa` | Actualizar empresa |
| POST | `/api/empresas/logo` | Subir logo |

### Clientes

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/clientes` | Listar clientes |
| GET | `/api/clientes/:id` | Obtener cliente |
| POST | `/api/clientes` | Crear cliente |
| PUT | `/api/clientes/:id` | Actualizar cliente |
| DELETE | `/api/clientes/:id` | Eliminar cliente |
| GET | `/api/clientes/buscar-ruc/:ruc` | Consultar SUNAT |

### Productos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/productos` | Listar productos |
| GET | `/api/productos/:id` | Obtener producto |
| POST | `/api/productos` | Crear producto |
| PUT | `/api/productos/:id` | Actualizar producto |
| DELETE | `/api/productos/:id` | Eliminar producto |
| POST | `/api/productos/importar` | Importar desde Excel |

### Categorías

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/categorias` | Listar categorías |
| POST | `/api/categorias` | Crear categoría |
| PUT | `/api/categorias/:id` | Actualizar categoría |
| DELETE | `/api/categorias/:id` | Eliminar categoría |

### Facturas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/facturas` | Listar facturas |
| GET | `/api/facturas/:id` | Obtener factura |
| POST | `/api/facturas` | Crear factura |
| PUT | `/api/facturas/:id` | Actualizar factura |
| DELETE | `/api/facturas/:id` | Anular factura |
| POST | `/api/facturas/:id/pagos` | Registrar pago |
| GET | `/api/facturas/:id/pdf` | Generar PDF |
| POST | `/api/facturas/:id/enviar-email` | Enviar por email |

### Proformas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/proformas` | Listar proformas |
| GET | `/api/proformas/:id` | Obtener proforma |
| POST | `/api/proformas` | Crear proforma |
| PUT | `/api/proformas/:id` | Actualizar proforma |
| DELETE | `/api/proformas/:id` | Eliminar proforma |
| POST | `/api/proformas/:id/convertir-factura` | Convertir a factura |
| GET | `/api/proformas/:id/pdf` | Generar PDF |

### Reportes

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/reportes/ventas` | Reporte de ventas |
| GET | `/api/reportes/clientes` | Reporte por cliente |
| GET | `/api/reportes/productos` | Productos más vendidos |
| GET | `/api/reportes/cuentas-por-cobrar` | Facturas pendientes |

### Dashboard

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/dashboard/resumen` | Resumen general |
| GET | `/api/dashboard/graficos` | Datos para gráficos |

---

## 🎯 VARIABLES DE ENTORNO

### Frontend (.env.local)

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### Backend (.env)

```env
# Base de datos
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Servidor
PORT=4000
NODE_ENV=development

# JWT (opcional, Supabase maneja auth)
JWT_SECRET=tu_secreto_jwt_muy_largo_y_seguro
```

---

## 📦 DEPENDENCIAS (package.json)

### Frontend

```json
{
  "name": "facturacion-frontend",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@supabase/ssr": "^0.6.0",
    "@supabase/supabase-js": "^2.55.0",
    "@tanstack/react-table": "^8.0.0",
    "@react-pdf/renderer": "^3.0.0",
    "react-hook-form": "^7.50.0",
    "@hookform/resolvers": "^3.3.0",
    "zod": "^3.22.0",
    "lucide-react": "^0.294.0",
    "framer-motion": "^12.0.0",
    "react-hot-toast": "^2.6.0",
    "cmdk": "^1.0.0",
    "recharts": "^2.15.0",
    "date-fns": "^2.30.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

### Backend

```json
{
  "name": "facturacion-backend",
  "version": "1.0.0",
  "main": "app.js",
  "scripts": {
    "start": "node app.js",
    "dev": "nodemon app.js",
    "prisma:generate": "npx prisma generate",
    "prisma:migrate": "npx prisma migrate dev",
    "prisma:studio": "npx prisma studio"
  },
  "dependencies": {
    "express": "^4.21.0",
    "@prisma/client": "^5.22.0",
    "@supabase/supabase-js": "^2.55.0",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "morgan": "^1.10.0",
    "dotenv": "^16.3.0",
    "jsonwebtoken": "^9.0.0",
    "multer": "^1.4.5-lts.2",
    "zod": "^3.22.0",
    "express-rate-limit": "^7.1.0",
    "nodemailer": "^6.9.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.0",
    "prisma": "^5.22.0"
  }
}
```

---

## ✅ ORDEN DE IMPLEMENTACIÓN SUGERIDO

### Fase 1: Setup Inicial (Día 1-2)

1. Crear estructura de carpetas
2. Configurar Next.js 14 con TypeScript
3. Configurar Express.js
4. Configurar Prisma con Supabase
5. Crear schema de base de datos
6. Ejecutar migraciones

### Fase 2: Autenticación (Día 2-3)

1. Configurar Supabase Auth
2. Crear páginas de login/registro
3. Implementar AuthContext
4. Crear middleware de autenticación backend
5. Proteger rutas

### Fase 3: Layout Base (Día 3-4)

1. Crear Sidebar con navegación
2. Crear Header con usuario
3. Implementar tema oscuro/claro
4. Crear Command Palette (Cmd+K)
5. Crear componentes comunes (Modal, Toast, etc.)

### Fase 4: Módulo Empresas (Día 4-5)

1. CRUD de empresa
2. Subida de logo a Supabase Storage
3. Configuración de series

### Fase 5: Módulo Clientes (Día 5-7)

1. CRUD completo
2. Tabla con filtros y paginación
3. Modal de creación/edición
4. Búsqueda por RUC/DNI
5. Exportación Excel

### Fase 6: Módulo Productos (Día 7-9)

1. CRUD completo
2. Categorías
3. Tabla con filtros
4. Importación desde Excel

### Fase 7: Módulo Proformas (Día 9-12)

1. CRUD completo
2. Formulario de creación con líneas dinámicas
3. Cálculos automáticos
4. Generación de PDF
5. Lista con filtros

### Fase 8: Módulo Facturas (Día 12-16)

1. CRUD completo
2. Conversión desde proforma
3. Registro de pagos
4. Estados y seguimiento
5. Generación de PDF
6. Envío por email

### Fase 9: Dashboard (Día 16-18)

1. Métricas principales
2. Gráficos con Recharts
3. Listados resumidos
4. Alertas de vencimientos

### Fase 10: Reportes (Día 18-20)

1. Reporte de ventas
2. Reporte por cliente
3. Cuentas por cobrar
4. Exportación Excel/PDF

### Fase 11: Pulido Final (Día 20-22)

1. Responsive design
2. Animaciones
3. Manejo de errores
4. Loading states
5. Testing
6. Documentación

---

## 🚀 COMANDOS PARA INICIAR

```bash
# Crear proyecto
mkdir facturacion-app && cd facturacion-app
mkdir -p apps/frontend apps/backend supabase/migrations docs

# Frontend
cd apps/frontend
npx create-next-app@14 . --typescript --tailwind --app --src-dir=false
npm install @supabase/ssr @supabase/supabase-js @tanstack/react-table lucide-react framer-motion react-hot-toast cmdk recharts react-hook-form @hookform/resolvers zod date-fns clsx tailwind-merge xlsx @react-pdf/renderer

# Backend
cd ../backend
npm init -y
npm install express @prisma/client @supabase/supabase-js cors helmet morgan dotenv jsonwebtoken multer zod express-rate-limit nodemailer
npm install -D nodemon prisma
npx prisma init

# Crear schema y migrar
npx prisma migrate dev --name init
npx prisma generate
```

---

## 📝 NOTAS IMPORTANTES

1. **Seguir la misma estructura de carpetas** del proyecto base Dashboard-LLM
2. **Usar los mismos patrones de código** (contexts, hooks, api client)
3. **Implementar manejo de errores** consistente con try/catch
4. **Agregar loading states** en todas las operaciones async
5. **Hacer responsive** para móviles y tablets
6. **Documentar endpoints** en README
7. **Usar TypeScript** estrictamente tipado
8. **Implementar RLS** en Supabase para seguridad multi-tenant

---

*Documento generado el 25 de diciembre de 2025*
*Basado en la arquitectura del proyecto Dashboard-LLM v4*
