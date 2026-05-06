-- Local auth user profiles migration (idempotent)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'UserRole' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "user_profiles" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "email" TEXT NOT NULL,
  "password_hash" TEXT,
  "name" TEXT,
  "role" "UserRole" NOT NULL DEFAULT 'USER',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "last_login" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
      AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE "user_profiles" ADD COLUMN "password_hash" TEXT;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'user_profiles_email_key'
  ) THEN
    CREATE UNIQUE INDEX "user_profiles_email_key" ON "user_profiles"("email");
  END IF;
END
$$;
