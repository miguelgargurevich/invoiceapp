# 🧪 Datos de Prueba - InvoiceApp

## ✅ Base de datos creada exitosamente

La estructura de la base de datos ha sido creada en PostgreSQL (Supabase) y poblada con datos de prueba.

## 📊 Datos de Prueba Creados

### 🏢 Empresa
- **Nombre**: Mi Empresa SAC
- **RUC**: 20123456789
- **Dirección**: Av. Los Pinos 123, San Isidro, Lima
- **Email**: contacto@miempresa.com
- **Teléfono**: 987654321
- **Serie Factura**: F001
- **Serie Proforma**: P001

### 🏷️ Categorías (3)
1. **Servicios** - Servicios profesionales (#3b82f6)
2. **Productos** - Productos físicos (#10b981)
3. **Tecnología** - Equipos y tecnología (#8b5cf6)

### 📦 Productos (4)
1. **SERV001** - Consultoría de Negocios
   - Precio: S/ 150.00 por HORA (sin IGV)
   - Categoría: Servicios

2. **PROD001** - Laptop HP ProBook 450 G10
   - Precio: S/ 3,500.00 por UND (con IGV)
   - Stock: 10 unidades (mínimo: 2)
   - Categoría: Tecnología

3. **SERV002** - Desarrollo Web
   - Precio: S/ 5,000.00 por UND (sin IGV)
   - Categoría: Servicios

4. **PROD002** - Licencia Microsoft Office 365
   - Precio: S/ 280.00 por UND (con IGV)
   - Stock: 50 unidades
   - Categoría: Tecnología

### 👥 Clientes (3)
1. **Tech Solutions Peru SAC**
   - RUC: 20456789123
   - Email: contacto@techsolutions.pe
   - Teléfono: 987123456
   - Contacto: Juan Pérez
   - Dirección: Av. Javier Prado 567, San Isidro
   - Notas: Cliente premium

2. **Comercial Lima EIRL**
   - RUC: 20789456123
   - Email: ventas@comerciallima.com
   - Teléfono: 987654789
   - Contacto: María García
   - Dirección: Jr. Los Andes 234, Lima

3. **Carlos Rodriguez Mendoza**
   - DNI: 12345678
   - Email: carlos.rodriguez@email.com
   - Teléfono: 999888777
   - Dirección: Calle Las Flores 456, Miraflores

### 📋 Proformas (1)
- **P001-001** - Tech Solutions Peru SAC
  - Fecha: Hoy
  - Válida: 30 días
  - Total: S/ 5,000.00
  - Estado: Pendiente
  - Detalle: 1x Desarrollo Web

### 🧾 Facturas (1)
- **F001-001** - Comercial Lima EIRL
  - Fecha: Hace 10 días
  - Vencimiento: En 20 días
  - Total: S/ 7,000.00
  - Estado: Emitida
  - Forma de Pago: Crédito 30 días
  - Detalle: 2x Laptop HP ProBook 450 G10

---

## 🔐 Autenticación

### ⚠️ Importante: Crear Usuario en Supabase Auth

Para poder usar el sistema, necesitas crear un usuario en Supabase Auth:

1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard/project/cqvcauymipatkmckekrv
2. Navega a **Authentication** → **Users**
3. Click en **Add user** → **Create new user**
4. Crea un usuario con:
   - Email: tu_email@ejemplo.com
   - Password: tu_contraseña_segura
   - Confirmar email automáticamente

5. Copia el **UUID** del usuario creado
6. Actualiza el seed o vincula este usuario con la empresa usando este query en SQL Editor:

```sql
UPDATE empresas 
SET user_id = 'UUID_DEL_USUARIO_DE_SUPABASE'
WHERE ruc = '20123456789';
```

### 📝 Usuario ID de Prueba Actual

El seed creó datos vinculados al userId temporal:
- **userId**: `00000000-0000-0000-0000-000000000001`

**Debes reemplazarlo** con el UUID real de tu usuario de Supabase Auth.

---

## 🚀 Próximos Pasos

1. ✅ Base de datos creada
2. ✅ Datos de prueba insertados
3. ⏳ Crear usuario en Supabase Auth
4. ⏳ Vincular usuario con empresa
5. ⏳ Iniciar backend: `npm run dev`
6. ⏳ Iniciar frontend: `npm run dev`
7. ⏳ Login con el usuario creado
8. ⏳ Probar el sistema

---

## 🗂️ Estructura de Tablas Creadas

- ✅ `empresas` - Organizaciones/empresas
- ✅ `clientes` - Clientes de la empresa
- ✅ `productos` - Productos y servicios
- ✅ `categorias` - Categorías de productos
- ✅ `facturas` - Facturas emitidas
- ✅ `detalles_factura` - Líneas de detalle de facturas
- ✅ `pagos_factura` - Pagos realizados a facturas
- ✅ `proformas` - Cotizaciones/Proformas
- ✅ `detalles_proforma` - Líneas de detalle de proformas
- ✅ `configuracion_series` - Configuración de numeración

---

## 📍 Conexión a la Base de Datos

**PostgreSQL (Supabase)**:
- Host: `aws-0-us-west-2.pooler.supabase.com`
- Port: `5432` (directo) / `6543` (pooler)
- Database: `postgres`
- User: `postgres.cqvcauymipatkmckekrv`
- Password: `doqqyt-negtix-7hYwza`

---

## 🔄 Recrear Datos de Prueba

Si necesitas recrear los datos de prueba:

```bash
cd apps/backend
node prisma/seed.js
```

## 🗑️ Limpiar Base de Datos

Para empezar de cero:

```bash
cd apps/backend
npx prisma migrate reset
```

Esto eliminará todos los datos y recreará la estructura.
