#!/bin/bash
# Script to apply SQL migrations directly to the database
# Run this instead of npx prisma db push

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

echo "🔄 Applying migrations to database..."

# Apply the setup wizard fields migration
echo "📦 Adding setup wizard fields..."
psql "$DATABASE_URL" -f prisma/migrations/20260101_add_setup_wizard_fields.sql

# Apply the document hash audit trail migration (if not already applied)
echo "📦 Adding document hash audit trail..."
psql "$DATABASE_URL" -f prisma/migrations/20260101_add_document_hash_audit_trail.sql

echo "✅ Migrations applied successfully!"
echo ""
echo "Now run: npx prisma generate"
echo "to update the Prisma client"
