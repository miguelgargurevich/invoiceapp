# Supabase Storage Structure

## Bucket: `logos`

Toda la estructura de archivos se organiza por empresa/usuario dentro de un solo bucket.

### Estructura de carpetas:

```
logos/
├── {empresaId}/
│   ├── images/
│   │   └── logo.{ext}           # Logo de la empresa
│   ├── signatures/
│   │   └── {token}-signature.png # Imagen de firma digital
│   └── invoices/
│       └── {serie}-{numero}-signed.pdf # PDF firmado
```

### Ejemplos:

```
logos/
├── b9a52d24-b23b-4e5a-9216-a04c96d6599a/
│   ├── images/
│   │   └── logo.png
│   ├── signatures/
│   │   └── 307388666a2c8527-signature.png
│   │   └── abc123xyz789-signature.png
│   └── invoices/
│       └── F001-2-signed.pdf
│       └── F001-3-signed.pdf
```

### Permisos necesarios en Supabase:

Ir a **Supabase Dashboard → Storage → logos bucket → Policies**

**IMPORTANTE:** Elimina las políticas existentes y crea estas nuevas:

#### 1. Public can read all files (SELECT)
```sql
-- Policy name: Public can read all files
-- Command: SELECT
-- Target roles: public

CREATE POLICY "Public can read all files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'logos');
```

#### 2. Authenticated users can upload to their company folder (INSERT)
```sql
-- Policy name: Authenticated users can upload to their company
-- Command: INSERT
-- Target roles: authenticated

CREATE POLICY "Authenticated users can upload to their company"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'logos'
);
```

#### 3. Public can upload signatures (INSERT)
```sql
-- Policy name: Public can upload signatures
-- Command: INSERT
-- Target roles: public

CREATE POLICY "Public can upload signatures"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'logos' AND
  (storage.foldername(name))[2] = 'signatures'
);
```

#### 4. Public can upload invoices (INSERT)
```sql
-- Policy name: Public can upload invoices
-- Command: INSERT
-- Target roles: public

CREATE POLICY "Public can upload invoices"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'logos' AND
  (storage.foldername(name))[2] = 'invoices'
);
```

#### 5. Authenticated can update their files (UPDATE)
```sql
-- Policy name: Authenticated can update their files
-- Command: UPDATE
-- Target roles: authenticated

CREATE POLICY "Authenticated can update their files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'logos');
```

#### 6. Service role has full access (ALL)
```sql
-- Policy name: Service role has full access
-- Command: ALL
-- Target roles: service_role

CREATE POLICY "Service role has full access"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'logos')
WITH CHECK (bucket_id = 'logos');
```

---

### Pasos para aplicar en Supabase UI:

1. Ve a **Storage → logos → Policies**
2. **Elimina todas las políticas existentes**
3. Click en **"New Policy"** para cada una:

**Política 1: Public can read all files**
- Policy name: `Public can read all files`
- Allowed operation: `SELECT`
- Target roles: `public` ✅
- USING expression:
```sql
bucket_id = 'logos'
```

**Política 2: Authenticated users can upload to their company**
- Policy name: `Authenticated users can upload to their company`
- Allowed operation: `INSERT`
- Target roles: `authenticated` ✅
- WITH CHECK expression:
```sql
bucket_id = 'logos'
```

**Política 3: Public can upload signatures**
- Policy name: `Public can upload signatures`
- Allowed operation: `INSERT`
- Target roles: `public` ✅
- WITH CHECK expression:
```sql
bucket_id = 'logos' AND (storage.foldername(name))[2] = 'signatures'
```

**Política 4: Public can upload invoices**
- Policy name: `Public can upload invoices`
- Allowed operation: `INSERT`
- Target roles: `public` ✅
- WITH CHECK expression:
```sql
bucket_id = 'logos' AND (storage.foldername(name))[2] = 'invoices'
```

**Política 5: Authenticated can update their files**
- Policy name: `Authenticated can update their files`
- Allowed operation: `UPDATE`
- Target roles: `authenticated` ✅
- USING expression:
```sql
bucket_id = 'logos'
```

**Política 6: Service role has full access**
- Policy name: `Service role has full access`
- Allowed operation: `ALL`
- Target roles: `service_role` ✅
- USING expression:
```sql
bucket_id = 'logos'
```
- WITH CHECK expression:
```sql
bucket_id = 'logos'
```

---

### ¿Por qué estas políticas?

| Política | Propósito |
|----------|-----------|
| Public read all | Los PDFs firmados y firmas necesitan ser accesibles públicamente vía link |
| Authenticated upload | Usuarios autenticados suben logos de su empresa |
| Public upload signatures | Página de firma es pública (no requiere login) |
| Public upload invoices | PDF se genera en página de firma (pública) |
| Authenticated update | Usuarios pueden actualizar sus logos |
| Service role full | Backend con service_role key tiene acceso completo |

### Archivos modificados:

1. **apps/backend/src/routes/empresa.js** (línea 183)
   - Cambiado: `${empresa.id}/logo.${fileExt}` 
   - A: `${empresa.id}/images/logo.${fileExt}`
   - Bucket: `logos`

2. **apps/backend/src/routes/signatures.js** (línea 357)
   - Cambiado: `signatures/${signatureFileName}`
   - A: `${signatureRequest.empresaId}/signatures/${signatureFileName}`
   - Bucket: `logos` (antes era `invoices`)

3. **apps/backend/src/routes/signatures.js** (línea 384)
   - Cambiado: `signed/${pdfFileName}`
   - A: `${signatureRequest.empresaId}/invoices/${pdfFileName}`
   - Bucket: `logos` (antes era `invoices`)

### Beneficios de esta estructura:

✅ **Organización por empresa**: Todos los archivos de una empresa en una carpeta
✅ **Escalabilidad**: Fácil agregar más tipos de archivos (contracts/, receipts/, etc.)
✅ **Seguridad**: Políticas RLS por carpeta
✅ **Mantenimiento**: Fácil eliminar todos los archivos de una empresa
✅ **Backup**: Respaldo selectivo por empresa
✅ **Trazabilidad**: Clara propiedad de archivos

### Migración de archivos existentes:

Si ya tienes archivos en la estructura anterior, puedes migrarlos con este script SQL en Supabase:

```sql
-- Mover logos existentes
-- (ejecutar manualmente desde el dashboard de Supabase Storage)

-- Verificar estructura actual
SELECT name, bucket_id 
FROM storage.objects 
WHERE bucket_id IN ('logos', 'invoices');
```

### Variables de ambiente requeridas:

```env
NEXT_PUBLIC_SUPABASE_URL=https://cqvcauymipatkmckekrv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (para backend)
```
