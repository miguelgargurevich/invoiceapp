const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function revertToSigned() {
  try {
    console.log('Reverting enum from ACCEPTED to SIGNED...');
    
    // Remove default value first
    await prisma.$executeRaw`
      ALTER TABLE signature_requests 
      ALTER COLUMN status DROP DEFAULT;
    `;
    console.log('✓ Removed default value');
    
    // Change column to text
    await prisma.$executeRaw`
      ALTER TABLE signature_requests 
      ALTER COLUMN status TYPE TEXT;
    `;
    console.log('✓ Changed column to TEXT');
    
    // Update existing records from ACCEPTED to SIGNED (now they are text)
    await prisma.$executeRaw`
      UPDATE signature_requests
      SET status = 'SIGNED'
      WHERE status = 'ACCEPTED';
    `;
    console.log('✓ Updated existing records from ACCEPTED to SIGNED');
    
    // Drop old enum
    await prisma.$executeRaw`DROP TYPE IF EXISTS "SignatureRequestStatus";`;
    console.log('✓ Dropped old enum');
    
    // Create new enum with SIGNED
    await prisma.$executeRaw`
      CREATE TYPE "SignatureRequestStatus" AS ENUM ('PENDING', 'SIGNED', 'EXPIRED', 'CANCELLED');
    `;
    console.log('✓ Created new enum with SIGNED');
    
    // Change column back to enum
    await prisma.$executeRaw`
      ALTER TABLE signature_requests 
      ALTER COLUMN status TYPE "SignatureRequestStatus" 
      USING status::"SignatureRequestStatus";
    `;
    console.log('✓ Changed column back to enum');
    
    console.log('✅ Migration completed successfully! Reverted to SIGNED.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

revertToSigned();
