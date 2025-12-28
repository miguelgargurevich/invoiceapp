const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function deleteInvalidPhotos() {
  try {
    // Eliminar fotos con URL undefined
    const result = await prisma.jobPhoto.deleteMany({
      where: {
        url: { contains: 'undefined' }
      }
    });

    console.log(`✅ Se eliminaron ${result.count} fotos con URLs inválidas`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteInvalidPhotos();
