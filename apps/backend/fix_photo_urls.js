const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const prisma = new PrismaClient();

async function fixPhotoUrls() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Obtener todas las fotos con URL undefined o que contengan "undefined"
    const photosToFix = await prisma.jobPhoto.findMany({
      where: {
        url: { contains: 'undefined' }
      },
      include: {
        factura: {
          include: {
            empresa: true
          }
        },
        proforma: {
          include: {
            empresa: true
          }
        }
      }
    });

    console.log(`Encontradas ${photosToFix.length} fotos con URLs incorrectas`);

    for (const photo of photosToFix) {
      const empresaId = photo.factura?.empresaId || photo.proforma?.empresaId;
      
      if (!empresaId) {
        console.log(`⚠️  Foto ${photo.id} no tiene factura ni proforma asociada, saltando...`);
        continue;
      }

      console.log(`\n📸 Procesando foto ${photo.id}`);
      console.log(`   URL actual: ${photo.url}`);
      console.log(`   EmpresaId: ${empresaId}`);

      // Extraer el nombre del archivo de la URL incorrecta si existe
      let fileName = null;
      if (photo.url && photo.url.includes('undefined/job-photos/')) {
        const match = photo.url.match(/undefined\/job-photos\/(.+)$/);
        if (match) {
          fileName = match[1];
        }
      }

      if (!fileName) {
        console.log(`   ⚠️  No se pudo extraer el nombre del archivo, saltando...`);
        continue;
      }

      console.log(`   Nombre archivo: ${fileName}`);

      // Path antiguo y nuevo
      const oldPath = `undefined/job-photos/${fileName}`;
      const newPath = `invoices/${empresaId}/job-photos/${fileName}`;

      console.log(`   Moviendo de: ${oldPath}`);
      console.log(`   A: ${newPath}`);

      try {
        // Intentar mover el archivo en Supabase
        const { data: moveData, error: moveError } = await supabase.storage
          .from('logos')
          .move(oldPath, newPath);

        if (moveError) {
          console.log(`   ⚠️  Error moviendo archivo: ${moveError.message}`);
          
          // Intentar copiar en lugar de mover
          const { data: downloadData, error: downloadError } = await supabase.storage
            .from('logos')
            .download(oldPath);
          
          if (downloadError) {
            console.log(`   ❌ No se pudo descargar el archivo: ${downloadError.message}`);
            continue;
          }

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('logos')
            .upload(newPath, downloadData, {
              contentType: 'image/jpeg',
              upsert: true
            });

          if (uploadError) {
            console.log(`   ❌ Error subiendo archivo: ${uploadError.message}`);
            continue;
          }

          // Eliminar archivo antiguo
          await supabase.storage.from('logos').remove([oldPath]);
          console.log(`   ✅ Archivo copiado y eliminado correctamente`);
        } else {
          console.log(`   ✅ Archivo movido correctamente`);
        }

        // Obtener nueva URL pública
        const { data: urlData } = supabase.storage
          .from('logos')
          .getPublicUrl(newPath);

        const newUrl = urlData.publicUrl;
        console.log(`   Nueva URL: ${newUrl}`);

        // Actualizar en la base de datos
        await prisma.jobPhoto.update({
          where: { id: photo.id },
          data: { url: newUrl }
        });

        console.log(`   ✅ URL actualizada en base de datos`);

      } catch (error) {
        console.log(`   ❌ Error procesando foto: ${error.message}`);
      }
    }

    console.log('\n✅ Proceso completado');

  } catch (error) {
    console.error('Error en el script:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPhotoUrls();
