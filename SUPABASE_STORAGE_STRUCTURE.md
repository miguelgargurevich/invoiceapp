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

**Política para imágenes (logos):**
```sql
-- Allow authenticated users to upload their own company logos
CREATE POLICY "Users can upload company logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow public read access to logos
CREATE POLICY "Public can view logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'logos' AND (storage.foldername(name))[2] = 'images');
```

**Política para firmas:**
```sql
-- Allow public insert for signatures (signing page is public)
CREATE POLICY "Public can upload signatures"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'logos' AND (storage.foldername(name))[2] = 'signatures');

-- Allow public read for signatures
CREATE POLICY "Public can view signatures"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'logos' AND (storage.foldername(name))[2] = 'signatures');
```

**Política para facturas:**
```sql
-- Allow public insert for invoices (generated from signing page)
CREATE POLICY "Public can upload invoices"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'logos' AND (storage.foldername(name))[2] = 'invoices');

-- Allow public read for invoices
CREATE POLICY "Public can view invoices"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'logos' AND (storage.foldername(name))[2] = 'invoices');
```

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
