-- Avisos push (app de Android/iPhone con FCM y navegador con Web Push). No destructiva: solo crea dos tablas nuevas.
-- Idempotente (IF NOT EXISTS / bloques DO): se puede correr dos veces sin error.

-- CreateTable: los dispositivos que reciben avisos (un token o una suscripción web por fila)
CREATE TABLE IF NOT EXISTS "dispositivos_push" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "plataforma" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "p256dh" TEXT,
    "auth" TEXT,
    "creado_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimo_uso_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispositivos_push_pkey" PRIMARY KEY ("id")
);

-- CreateTable: los avisos ya enviados (la clave única evita repetirlos)
CREATE TABLE IF NOT EXISTS "avisos_push_enviados" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "creado_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "avisos_push_enviados_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "dispositivos_push_token_key" ON "dispositivos_push"("token");
CREATE INDEX IF NOT EXISTS "idx_dispositivo_push_user_id" ON "dispositivos_push"("user_id");
CREATE INDEX IF NOT EXISTS "idx_dispositivo_push_empresa_id" ON "dispositivos_push"("empresa_id");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_aviso_push_usuario_clave" ON "avisos_push_enviados"("user_id", "clave");

-- AddForeignKey: ON DELETE CASCADE (si se borra el usuario o la empresa, se borran sus dispositivos y avisos)
DO $$ BEGIN
  ALTER TABLE "dispositivos_push" ADD CONSTRAINT "dispositivos_push_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "dispositivos_push" ADD CONSTRAINT "dispositivos_push_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "avisos_push_enviados" ADD CONSTRAINT "avisos_push_enviados_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
