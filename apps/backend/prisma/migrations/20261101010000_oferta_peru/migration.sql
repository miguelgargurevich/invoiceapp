-- AlterTable
ALTER TABLE "plans" ADD COLUMN "pais" TEXT NOT NULL DEFAULT 'US',
ADD COLUMN "culqi_plan_id_mensual" TEXT,
ADD COLUMN "culqi_plan_id_anual" TEXT,
ADD COLUMN "has_regimenes_sunat" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN "proveedor_pago" TEXT NOT NULL DEFAULT 'stripe',
ADD COLUMN "culqi_customer_id" TEXT,
ADD COLUMN "culqi_card_id" TEXT,
ADD COLUMN "culqi_subscription_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_culqi_subscription_id_key" ON "subscriptions"("culqi_subscription_id");

-- CreateTable
CREATE TABLE "eventos_culqi" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "procesado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "eventos_culqi_pkey" PRIMARY KEY ("id")
);
