const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixEnum() {
  try {
    console.log('Checking current enum values...');
    
    // Check current enum values
    const result = await prisma.$queryRaw`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'SignatureRequestStatus')
      ORDER BY enumsortorder;
    `;
    
    console.log('Current enum values:', result);
    
    // Check if ACCEPTED exists
    const hasAccepted = result.some(r => r.enumlabel === 'ACCEPTED');
    const hasSigned = result.some(r => r.enumlabel === 'SIGNED');
    
    if (hasAccepted) {
      console.log('✓ ACCEPTED already exists in enum');
    } else if (hasSigned) {
      console.log('⚠ SIGNED exists but ACCEPTED does not. Running migration...');
      
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
      
      // Update existing records from SIGNED to ACCEPTED (now they are text)
      await prisma.$executeRaw`
        UPDATE signature_requests
        SET status = 'ACCEPTED'
        WHERE status = 'SIGNED';
      `;
      console.log('✓ Updated existing records from SIGNED to ACCEPTED');
      
      // Drop old enum
      await prisma.$executeRaw`DROP TYPE IF EXISTS "SignatureRequestStatus";`;
      console.log('✓ Dropped old enum');
      
      // Create new enum with ACCEPTED
      await prisma.$executeRaw`
        CREATE TYPE "SignatureRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED');
      `;
      console.log('✓ Created new enum with ACCEPTED');
      
      // Change column back to enum
      await prisma.$executeRaw`
        ALTER TABLE signature_requests 
        ALTER COLUMN status TYPE "SignatureRequestStatus" 
        USING status::"SignatureRequestStatus";
      `;
      console.log('✓ Changed column back to enum');
      
      console.log('✅ Migration completed successfully!');
    } else {
      console.log('⚠ Neither ACCEPTED nor SIGNED found. Enum might be corrupted.');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixEnum();
