-- Datos legales del servicio: tabla de una sola fila (id "global"). No destructiva: solo crea una tabla.
-- La fila inicial la siembra prisma/seed_sitio.sql en el arranque (sin pisar una fila existente).

-- CreateTable
CREATE TABLE IF NOT EXISTS "configuracion_sitio" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "legal_marca" TEXT,
    "legal_razon_social" TEXT,
    "legal_ruc" TEXT,
    "legal_domicilio" TEXT,
    "legal_correo" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracion_sitio_pkey" PRIMARY KEY ("id")
);
