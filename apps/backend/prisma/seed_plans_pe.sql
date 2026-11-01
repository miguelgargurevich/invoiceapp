-- Planes de Perú (precios en soles, incluyen IGV). Idempotente: se puede correr varias veces.
-- Los culqi_plan_id_* los llena scripts/culqi-crear-planes.js.
INSERT INTO plans (id, name, slug, description, price_monthly, price_yearly, currency, pais,
  max_invoices_per_month, max_clients, max_proposals_per_month, max_storage_mb,
  has_proposals, has_digital_signatures, has_reports, has_custom_branding, has_multi_currency,
  has_job_tracking, has_advanced_reports, has_priority_support, has_api_access, has_regimenes_sunat,
  is_active, display_order, is_popular, trial_days, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'Gratis', 'pe-gratis', 'Para empezar a emitir comprobantes electrónicos', 0, 0, 'PEN', 'PE',
   10, 10, 0, 100, false, false, false, false, false, false, false, false, false, false, true, 10, false, 0, now(), now()),
  (gen_random_uuid(), 'Emprendedor', 'pe-emprendedor', 'Para negocios que empiezan a crecer', 29, 279, 'PEN', 'PE',
   100, 100, 0, 500, false, false, true, false, false, false, false, false, false, false, true, 11, false, 0, now(), now()),
  (gen_random_uuid(), 'Negocio', 'pe-negocio', 'Todo lo que tu negocio necesita para facturar', 59, 569, 'PEN', 'PE',
   500, -1, -1, 2048, true, true, true, true, false, false, false, false, false, true, true, 12, true, 0, now(), now()),
  (gen_random_uuid(), 'Empresa', 'pe-empresa', 'Sin límites, con API y soporte prioritario', 119, 1149, 'PEN', 'PE',
   -1, -1, -1, 10240, true, true, true, true, true, false, true, true, true, true, true, 13, false, 0, now(), now())
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly, price_yearly = EXCLUDED.price_yearly,
  currency = EXCLUDED.currency, pais = EXCLUDED.pais,
  max_invoices_per_month = EXCLUDED.max_invoices_per_month, max_clients = EXCLUDED.max_clients,
  max_proposals_per_month = EXCLUDED.max_proposals_per_month, max_storage_mb = EXCLUDED.max_storage_mb,
  has_proposals = EXCLUDED.has_proposals, has_digital_signatures = EXCLUDED.has_digital_signatures,
  has_reports = EXCLUDED.has_reports, has_custom_branding = EXCLUDED.has_custom_branding,
  has_multi_currency = EXCLUDED.has_multi_currency, has_job_tracking = EXCLUDED.has_job_tracking,
  has_advanced_reports = EXCLUDED.has_advanced_reports, has_priority_support = EXCLUDED.has_priority_support,
  has_api_access = EXCLUDED.has_api_access, has_regimenes_sunat = EXCLUDED.has_regimenes_sunat,
  is_active = EXCLUDED.is_active, display_order = EXCLUDED.display_order, is_popular = EXCLUDED.is_popular,
  trial_days = EXCLUDED.trial_days, updated_at = now();
