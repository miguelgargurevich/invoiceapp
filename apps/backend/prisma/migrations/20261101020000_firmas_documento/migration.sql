-- Firma digital: una solicitud liga su documento con dos columnas propias (factura_id o proforma_id).
-- Antes, document_id tenía dos FK (a facturas y a proformas) y ningún INSERT pasaba.
-- No destructiva: agrega columnas, rellena desde document_id, cambia FK e índices. document_id se conserva.

-- AlterTable: columnas nuevas, nulas
ALTER TABLE "signature_requests" ADD COLUMN IF NOT EXISTS "factura_id" TEXT,
ADD COLUMN IF NOT EXISTS "proforma_id" TEXT;

-- Relleno desde document_id según document_type (solo filas cuyo documento existe)
UPDATE "signature_requests" AS sr
SET "factura_id" = sr."document_id"
WHERE sr."document_type" = 'INVOICE'
  AND EXISTS (SELECT 1 FROM "facturas" f WHERE f."id" = sr."document_id");

UPDATE "signature_requests" AS sr
SET "proforma_id" = sr."document_id"
WHERE sr."document_type" = 'PROFORMA'
  AND EXISTS (SELECT 1 FROM "proformas" p WHERE p."id" = sr."document_id");

-- DropForeignKey: las dos relaciones sobre document_id
ALTER TABLE "signature_requests" DROP CONSTRAINT IF EXISTS "fk_signature_request_factura";
ALTER TABLE "signature_requests" DROP CONSTRAINT IF EXISTS "fk_signature_request_proforma";

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_signature_request_factura_id" ON "signature_requests"("factura_id");
CREATE INDEX IF NOT EXISTS "idx_signature_request_proforma_id" ON "signature_requests"("proforma_id");

-- AddForeignKey
ALTER TABLE "signature_requests" ADD CONSTRAINT "fk_signature_request_factura_id" FOREIGN KEY ("factura_id") REFERENCES "facturas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "signature_requests" ADD CONSTRAINT "fk_signature_request_proforma_id" FOREIGN KEY ("proforma_id") REFERENCES "proformas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
