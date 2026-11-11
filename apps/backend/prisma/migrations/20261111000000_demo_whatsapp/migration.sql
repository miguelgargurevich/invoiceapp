-- WhatsApp de la franja de la demo (opcional): una columna nueva en la tabla de una sola fila. No destructiva:
-- solo agrega una columna que admite NULL; sin valor, la demo no muestra el botón de WhatsApp.

-- AlterTable
ALTER TABLE "configuracion_sitio" ADD COLUMN IF NOT EXISTS "demo_whatsapp" TEXT;
