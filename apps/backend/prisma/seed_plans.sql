-- Seed initial plans with Stripe IDs
-- Run this after creating products in Stripe

-- First, clean existing plans (optional, only if you want to start fresh)
-- DELETE FROM plans;

-- Insert Free Plan (no Stripe needed)
INSERT INTO plans (
  id, name, slug, description,
  price_monthly, price_yearly, currency,
  stripe_price_id_monthly, stripe_price_id_yearly, stripe_product_id,
  max_invoices_per_month, max_clients, max_proposals_per_month, max_storage_mb,
  has_proposals, has_digital_signatures, has_reports, has_custom_branding,
  has_multi_currency, has_job_tracking, has_advanced_reports, has_priority_support, has_api_access,
  is_active, display_order, is_popular, trial_days,
  created_at, updated_at
) VALUES (
  gen_random_uuid()::text,
  'Free',
  'free',
  'Perfect for getting started - 5 invoices, 5 clients, basic features',
  0.00, 0.00, 'USD',
  NULL,
  NULL,
  NULL,
  5, 5, 0, 50,
  false, false, true, false,
  false, false, false, false, false,
  true, 0, false, 0,
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT (slug) DO UPDATE SET
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  max_invoices_per_month = EXCLUDED.max_invoices_per_month,
  max_clients = EXCLUDED.max_clients,
  updated_at = CURRENT_TIMESTAMP;

-- Insert Starter Plan
INSERT INTO plans (
  id, name, slug, description,
  price_monthly, price_yearly, currency,
  stripe_price_id_monthly, stripe_price_id_yearly, stripe_product_id,
  max_invoices_per_month, max_clients, max_proposals_per_month, max_storage_mb,
  has_proposals, has_digital_signatures, has_reports, has_custom_branding,
  has_multi_currency, has_job_tracking, has_advanced_reports, has_priority_support, has_api_access,
  is_active, display_order, is_popular, trial_days,
  created_at, updated_at
) VALUES (
  gen_random_uuid()::text,
  'Starter',
  'starter',
  'Perfect for freelancers just getting started - Invoices, Clients, PDF & EN/ES',
  15.00, 144.00, 'USD',
  'price_1Sl1dvRdSQ4MB9AnSOy4RkhN',
  'price_1Sl1dvRdSQ4MB9An0Y4FUQ0m',
  'prod_TiSZnH62CusUxi',
  20, 10, 0, 100,
  false, false, true, false,
  false, false, false, false, false,
  true, 1, false, 14,
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT (slug) DO UPDATE SET
  stripe_price_id_monthly = EXCLUDED.stripe_price_id_monthly,
  stripe_price_id_yearly = EXCLUDED.stripe_price_id_yearly,
  stripe_product_id = EXCLUDED.stripe_product_id,
  updated_at = CURRENT_TIMESTAMP;

-- Insert Pro Plan (Popular)
INSERT INTO plans (
  id, name, slug, description,
  price_monthly, price_yearly, currency,
  stripe_price_id_monthly, stripe_price_id_yearly, stripe_product_id,
  max_invoices_per_month, max_clients, max_proposals_per_month, max_storage_mb,
  has_proposals, has_digital_signatures, has_reports, has_custom_branding,
  has_multi_currency, has_job_tracking, has_advanced_reports, has_priority_support, has_api_access,
  is_active, display_order, is_popular, trial_days,
  created_at, updated_at
) VALUES (
  gen_random_uuid()::text,
  'Pro',
  'pro',
  'For growing businesses - Proposals, Digital Signatures, Branding & Job Tracking',
  29.00, 278.00, 'USD',
  'price_1Sl1dvRdSQ4MB9Anpf9MWjvS',
  'price_1Sl1dwRdSQ4MB9An7fJOPLXf',
  'prod_TiSZV5Hg0JS88y',
  100, 50, 30, 500,
  true, true, true, true,
  false, true, false, false, false,
  true, 2, true, 14,
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT (slug) DO UPDATE SET
  stripe_price_id_monthly = EXCLUDED.stripe_price_id_monthly,
  stripe_price_id_yearly = EXCLUDED.stripe_price_id_yearly,
  stripe_product_id = EXCLUDED.stripe_product_id,
  updated_at = CURRENT_TIMESTAMP;

-- Insert Business Plan
INSERT INTO plans (
  id, name, slug, description,
  price_monthly, price_yearly, currency,
  stripe_price_id_monthly, stripe_price_id_yearly, stripe_product_id,
  max_invoices_per_month, max_clients, max_proposals_per_month, max_storage_mb,
  has_proposals, has_digital_signatures, has_reports, has_custom_branding,
  has_multi_currency, has_job_tracking, has_advanced_reports, has_priority_support, has_api_access,
  is_active, display_order, is_popular, trial_days,
  created_at, updated_at
) VALUES (
  gen_random_uuid()::text,
  'Business',
  'business',
  'Enterprise solution - Unlimited usage, Multi-Currency, Advanced Reports & Priority Support',
  49.00, 470.00, 'USD',
  'price_1Sl1dwRdSQ4MB9AnK5F4few0',
  'price_1Sl1dwRdSQ4MB9AnN74eWiuw',
  'prod_TiSZ1elClzWgU3',
  -1, -1, -1, 2000,
  true, true, true, true,
  true, true, true, true, true,
  true, 3, false, 14,
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT (slug) DO UPDATE SET
  stripe_price_id_monthly = EXCLUDED.stripe_price_id_monthly,
  stripe_price_id_yearly = EXCLUDED.stripe_price_id_yearly,
  stripe_product_id = EXCLUDED.stripe_product_id,
  updated_at = CURRENT_TIMESTAMP;

-- Verify the data
SELECT 
  name,
  slug,
  price_monthly,
  price_yearly,
  stripe_product_id,
  is_popular
FROM plans
ORDER BY display_order;
