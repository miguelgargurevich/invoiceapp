-- AlterTable
ALTER TABLE "empresas" ADD COLUMN     "pais" TEXT NOT NULL DEFAULT 'US';

-- AlterTable
ALTER TABLE "clientes" ADD COLUMN     "es_agente_retencion" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "facturas" ADD COLUMN     "cdr_key" TEXT,
ADD COLUMN     "codigo_respuesta_sunat" TEXT,
ADD COLUMN     "detraccion_codigo" TEXT,
ADD COLUMN     "detraccion_monto" DECIMAL(12,2),
ADD COLUMN     "detraccion_porcentaje" DECIMAL(5,2),
ADD COLUMN     "doc_relacionado_id" TEXT,
ADD COLUMN     "doc_relacionado_numero" INTEGER,
ADD COLUMN     "doc_relacionado_serie" TEXT,
ADD COLUMN     "doc_relacionado_tipo" TEXT,
ADD COLUMN     "estado_sunat" TEXT,
ADD COLUMN     "fecha_envio_sunat" TIMESTAMP(3),
ADD COLUMN     "intentos_envio" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "mensaje_respuesta_sunat" TEXT,
ADD COLUMN     "monto_en_letras" TEXT,
ADD COLUMN     "motivo_codigo" TEXT,
ADD COLUMN     "motivo_descripcion" TEXT,
ADD COLUMN     "neto_pendiente" DECIMAL(12,2),
ADD COLUMN     "observaciones_sunat" JSONB,
ADD COLUMN     "percepcion_base" DECIMAL(12,2),
ADD COLUMN     "percepcion_monto" DECIMAL(12,2),
ADD COLUMN     "percepcion_porcentaje" DECIMAL(5,2),
ADD COLUMN     "percepcion_regimen" TEXT,
ADD COLUMN     "retencion_monto" DECIMAL(12,2),
ADD COLUMN     "retencion_porcentaje" DECIMAL(5,2),
ADD COLUMN     "tipo_comprobante" TEXT NOT NULL DEFAULT '01',
ADD COLUMN     "tipo_operacion" TEXT NOT NULL DEFAULT '0101',
ADD COLUMN     "total_exoneradas" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "total_exportacion" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "total_gravadas" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "total_icbper" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "total_inafectas" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "xml_key" TEXT,
ALTER COLUMN "numero" DROP NOT NULL;

-- AlterTable
ALTER TABLE "detalles_factura" ADD COLUMN     "cantidad_bolsas_icbper" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "codigo_producto_sunat" TEXT,
ADD COLUMN     "codigo_unidad_sunat" TEXT NOT NULL DEFAULT 'NIU',
ADD COLUMN     "icbper" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "precio_incluye_igv" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "precio_unitario_igv" DECIMAL(22,10),
ADD COLUMN     "tipo_afectacion_igv" TEXT NOT NULL DEFAULT '10',
ADD COLUMN     "valor_unitario" DECIMAL(22,10);

-- CreateTable
CREATE TABLE "emisores_sunat" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "ubigeo" TEXT NOT NULL,
    "departamento" TEXT NOT NULL,
    "provincia" TEXT NOT NULL,
    "distrito" TEXT NOT NULL,
    "urbanizacion" TEXT,
    "direccion_fiscal" TEXT NOT NULL,
    "codigo_establecimiento" TEXT NOT NULL DEFAULT '0000',
    "ambiente" TEXT NOT NULL DEFAULT 'BETA',
    "sol_usuario" TEXT,
    "sol_clave_cifrada" TEXT,
    "certificado_cifrado" TEXT,
    "certificado_clave_cifrada" TEXT,
    "certificado_vence" TIMESTAMP(3),
    "cuenta_detracciones" TEXT,
    "es_agente_retencion" BOOLEAN NOT NULL DEFAULT false,
    "es_agente_percepcion" BOOLEAN NOT NULL DEFAULT false,
    "gre_client_id" TEXT,
    "gre_secret_cifrado" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emisores_sunat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cuotas_factura" (
    "id" TEXT NOT NULL,
    "factura_id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "fecha_vencimiento" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cuotas_factura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procesos_sunat" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "fecha_generacion" DATE NOT NULL,
    "fecha_referencia" DATE NOT NULL,
    "correlativo" INTEGER NOT NULL,
    "ticket" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'ENVIADO',
    "xml_key" TEXT,
    "cdr_key" TEXT,
    "codigo_respuesta" TEXT,
    "mensaje_respuesta" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procesos_sunat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proceso_sunat_items" (
    "id" TEXT NOT NULL,
    "proceso_id" TEXT NOT NULL,
    "factura_id" TEXT NOT NULL,
    "motivo" TEXT,
    "estado_previo" TEXT NOT NULL,

    CONSTRAINT "proceso_sunat_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "envios_sunat" (
    "id" TEXT NOT NULL,
    "factura_id" TEXT,
    "proceso_id" TEXT,
    "operacion" TEXT NOT NULL,
    "codigo" TEXT,
    "mensaje" TEXT,
    "exito" BOOLEAN NOT NULL,
    "duracion_ms" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "envios_sunat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "emisores_sunat_empresa_id_key" ON "emisores_sunat"("empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "cuotas_factura_factura_id_numero_key" ON "cuotas_factura"("factura_id", "numero");

-- CreateIndex
CREATE INDEX "procesos_sunat_estado_idx" ON "procesos_sunat"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "procesos_sunat_empresa_id_tipo_fecha_generacion_correlativo_key" ON "procesos_sunat"("empresa_id", "tipo", "fecha_generacion", "correlativo");

-- CreateIndex
CREATE INDEX "proceso_sunat_items_factura_id_idx" ON "proceso_sunat_items"("factura_id");

-- CreateIndex
CREATE INDEX "envios_sunat_factura_id_idx" ON "envios_sunat"("factura_id");

-- CreateIndex
CREATE INDEX "envios_sunat_proceso_id_idx" ON "envios_sunat"("proceso_id");

-- CreateIndex
CREATE INDEX "idx_factura_estado_sunat" ON "facturas"("estado_sunat");

-- AddForeignKey
ALTER TABLE "emisores_sunat" ADD CONSTRAINT "emisores_sunat_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuotas_factura" ADD CONSTRAINT "cuotas_factura_factura_id_fkey" FOREIGN KEY ("factura_id") REFERENCES "facturas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procesos_sunat" ADD CONSTRAINT "procesos_sunat_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proceso_sunat_items" ADD CONSTRAINT "proceso_sunat_items_proceso_id_fkey" FOREIGN KEY ("proceso_id") REFERENCES "procesos_sunat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proceso_sunat_items" ADD CONSTRAINT "proceso_sunat_items_factura_id_fkey" FOREIGN KEY ("factura_id") REFERENCES "facturas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "envios_sunat" ADD CONSTRAINT "envios_sunat_factura_id_fkey" FOREIGN KEY ("factura_id") REFERENCES "facturas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "envios_sunat" ADD CONSTRAINT "envios_sunat_proceso_id_fkey" FOREIGN KEY ("proceso_id") REFERENCES "procesos_sunat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

