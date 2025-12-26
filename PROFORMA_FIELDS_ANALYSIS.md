# Análisis de Campos de Proforma - Comparación con Template

## Campos Solicitados vs Campos Actuales

### ✅ Campos que YA EXISTEN en la BD (mapeados)

| Campo Solicitado | Campo en BD | Tipo | Notas |
|-----------------|-------------|------|-------|
| `job_name` | `jobName` | string | ✅ Existe |
| `job_location` | `jobLocation` | string | ✅ Existe |
| `job_phone` | ❌ | string | ⚠️ **FALTA - AGREGAR** |
| `work_description` | `workDescription` | multiline | ✅ Existe |
| `payment_terms` | `paymentTerms` | multiline | ✅ Existe |
| `proposal_date` | `fechaEmision` | date | ✅ Existe |
| `total_amount` | `total` | currency | ✅ Existe |
| `client_name` | `cliente.razonSocial` | string | ✅ Existe (relación) |
| `client_phone` | `cliente.telefono` | string | ✅ Existe (relación) |
| `client_street` | `cliente.direccion` | string | ✅ Existe (relación) |

### ❌ Campos FALTANTES que deben agregarse

| Campo Solicitado | Nombre en BD | Tipo | Ubicación |
|-----------------|--------------|------|-----------|
| `architect_name` | `arquitectoNombre` | string? | Proforma |
| `plans_date` | `fechaPlanos` | DateTime? | Proforma |
| `job_phone` | `telefonoTrabajo` | string? | Proforma |
| `authorized_signature` | `firmaAutorizada` | string? | Proforma |
| `validity_days` | `diasValidez` | int? | Proforma |
| `acceptance_signature` | `firmaAceptacion` | string? | Proforma |
| `acceptance_date` | `fechaAceptacion` | DateTime? | Proforma |

### 📋 Campos de Empresa

| Campo Template | Campo BD | Notas |
|----------------|----------|-------|
| `company_name` | `empresa.nombre` | ✅ Existe |
| `company_role` | `empresa.tituloProfesional` | ⚠️ **AGREGAR** (ej: "MASTER ELECTRICIAN") |
| `company_phone` | `empresa.telefono` | ✅ Existe |
| `company_address` | `empresa.direccion` | ✅ Existe |
| `company_license` | `empresa.licencia` | ✅ Existe (número de licencia) |

### 📄 Campos Metadata (calcular en frontend)

| Campo Template | Cálculo |
|----------------|---------|
| `page_number` | Generado en PDF |
| `total_pages` | Generado en PDF |
| `insured_flag` | `empresa.licencia !== null` |

## Campos a Agregar

### Tabla Empresa
```sql
-- Agregar título profesional a empresa
ALTER TABLE empresas ADD COLUMN titulo_profesional VARCHAR(255);
```

### Tabla Proforma
```sql
-- Campos adicionales para template de contractor
ALTER TABLE proformas ADD COLUMN arquitecto_nombre VARCHAR(255);
ALTER TABLE proformas ADD COLUMN fecha_planos DATE;
ALTER TABLE proformas ADD COLUMN telefono_trabajo VARCHAR(50);
ALTER TABLE proformas ADD COLUMN firma_autorizada TEXT;
ALTER TABLE proformas ADD COLUMN dias_validez INTEGER;
ALTER TABLE proformas ADD COLUMN firma_aceptacion TEXT;
ALTER TABLE proformas ADD COLUMN fecha_aceptacion DATE;
```

## Migración de Prisma

```prisma
model Proforma {
  // ... campos existentes ...
  
  // Contractor-specific additional fields
  arquitectoNombre  String?   @map("arquitecto_nombre")
  fechaPlanos       DateTime? @map("fecha_planos")
  telefonoTrabajo   String?   @map("telefono_trabajo")
  firmaAutorizada   String?   @map("firma_autorizada") @db.Text
  diasValidez       Int?      @map("dias_validez")
  firmaAceptacion   String?   @map("firma_aceptacion") @db.Text
  fechaAceptacion   DateTime? @map("fecha_aceptacion")
}
```

## Estructura del PDF Actualizada

### Secciones del PDF:

1. **Header** (Fila 1-3)
   - ✅ "PROPOSAL" - título fijo
   - ✅ "Licensed" / "Insured" - calculado de `empresa.licencia`
   - ✅ Datos de empresa (nombre, rol, teléfono, dirección)

2. **Metadata** (Fila 4)
   - ✅ Page numbers - generado
   - ✅ Insured flag - calculado

3. **Client/Job Info** (Fila 5-9)
   - ✅ Client name, phone, date
   - ✅ Street, city/state/zip
   - ✅ Job name, location
   - ⚠️ **AGREGAR**: Architect name, plans date, job phone

4. **Work Description** (Fila 10-18)
   - ✅ Multiline textarea
   - ✅ "We hereby submit specifications and estimates for:"

5. **Total Amount** (Fila 19)
   - ✅ Total en formato currency

6. **Payment Terms** (Fila 20)
   - ✅ "Payment to be made as follows"
   - ✅ Campo multiline

7. **Legal Conditions** (Fixed text)
   - ✅ Warranty, Insurance, Accidents, Workman's Comp

8. **Signatures** (Fila 21-23)
   - ⚠️ **AGREGAR**: Authorized signature
   - ⚠️ **AGREGAR**: Validity days
   - ⚠️ **AGREGAR**: Client signature
   - ⚠️ **AGREGAR**: Acceptance date

## Prioridades de Implementación

### 🔴 Alta Prioridad (Funcionalidad básica)
1. Agregar campos a BD: `arquitectoNombre`, `fechaPlanos`, `telefonoTrabajo`
2. Actualizar formulario de creación de proforma
3. Actualizar PDF template con nueva estructura

### 🟡 Media Prioridad (Firmas digitales)
4. Agregar campos de firma: `firmaAutorizada`, `firmaAceptacion`
5. Implementar funcionalidad de firma digital
6. Agregar `fechaAceptacion` con auto-update

### 🟢 Baja Prioridad (Optimizaciones)
7. Calcular `diasValidez` automáticamente desde `fechaValidez`
8. Agregar validación de fechas
9. Implementar preview en tiempo real
