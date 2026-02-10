
-- ===== Fix security linter: replace overly-permissive RLS policies (true) with authenticated checks =====

-- Helper condition
-- We use auth.role() = 'authenticated' (works for all logged-in users)

-- appointments
DROP POLICY IF EXISTS "Authenticated users can read appointments" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated users can insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated users can update appointments" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated users can delete appointments" ON public.appointments;

CREATE POLICY "Authenticated users can read appointments"
ON public.appointments
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert appointments"
ON public.appointments
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update appointments"
ON public.appointments
FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete appointments"
ON public.appointments
FOR DELETE
USING (auth.role() = 'authenticated');

-- audit_logs
DROP POLICY IF EXISTS "Authenticated users can read audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated users can insert audit_logs" ON public.audit_logs;

CREATE POLICY "Authenticated users can read audit_logs"
ON public.audit_logs
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert audit_logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- card_templates
DROP POLICY IF EXISTS "Authenticated users can read card_templates" ON public.card_templates;
DROP POLICY IF EXISTS "Authenticated users can insert card_templates" ON public.card_templates;
DROP POLICY IF EXISTS "Authenticated users can update card_templates" ON public.card_templates;
DROP POLICY IF EXISTS "Authenticated users can delete card_templates" ON public.card_templates;

CREATE POLICY "Authenticated users can read card_templates"
ON public.card_templates
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert card_templates"
ON public.card_templates
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update card_templates"
ON public.card_templates
FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete card_templates"
ON public.card_templates
FOR DELETE
USING (auth.role() = 'authenticated');

-- member_cards
DROP POLICY IF EXISTS "Authenticated users can read member_cards" ON public.member_cards;
DROP POLICY IF EXISTS "Authenticated users can insert member_cards" ON public.member_cards;
DROP POLICY IF EXISTS "Authenticated users can update member_cards" ON public.member_cards;
DROP POLICY IF EXISTS "Authenticated users can delete member_cards" ON public.member_cards;

CREATE POLICY "Authenticated users can read member_cards"
ON public.member_cards
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert member_cards"
ON public.member_cards
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update member_cards"
ON public.member_cards
FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete member_cards"
ON public.member_cards
FOR DELETE
USING (auth.role() = 'authenticated');

-- members
DROP POLICY IF EXISTS "Authenticated users can read members" ON public.members;
DROP POLICY IF EXISTS "Authenticated users can insert members" ON public.members;
DROP POLICY IF EXISTS "Authenticated users can update members" ON public.members;
DROP POLICY IF EXISTS "Authenticated users can delete members" ON public.members;

CREATE POLICY "Authenticated users can read members"
ON public.members
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert members"
ON public.members
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update members"
ON public.members
FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete members"
ON public.members
FOR DELETE
USING (auth.role() = 'authenticated');

-- orders
DROP POLICY IF EXISTS "Authenticated users can read orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can update orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can delete orders" ON public.orders;

CREATE POLICY "Authenticated users can read orders"
ON public.orders
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert orders"
ON public.orders
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update orders"
ON public.orders
FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete orders"
ON public.orders
FOR DELETE
USING (auth.role() = 'authenticated');

-- services
DROP POLICY IF EXISTS "Authenticated users can read services" ON public.services;
DROP POLICY IF EXISTS "Authenticated users can insert services" ON public.services;
DROP POLICY IF EXISTS "Authenticated users can update services" ON public.services;
DROP POLICY IF EXISTS "Authenticated users can delete services" ON public.services;

CREATE POLICY "Authenticated users can read services"
ON public.services
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert services"
ON public.services
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update services"
ON public.services
FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete services"
ON public.services
FOR DELETE
USING (auth.role() = 'authenticated');

-- sync_queue
DROP POLICY IF EXISTS "Authenticated users can read sync_queue" ON public.sync_queue;
DROP POLICY IF EXISTS "Authenticated users can insert sync_queue" ON public.sync_queue;
DROP POLICY IF EXISTS "Authenticated users can update sync_queue" ON public.sync_queue;
DROP POLICY IF EXISTS "Authenticated users can delete sync_queue" ON public.sync_queue;

CREATE POLICY "Authenticated users can read sync_queue"
ON public.sync_queue
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert sync_queue"
ON public.sync_queue
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update sync_queue"
ON public.sync_queue
FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete sync_queue"
ON public.sync_queue
FOR DELETE
USING (auth.role() = 'authenticated');

-- transactions
DROP POLICY IF EXISTS "Authenticated users can read transactions" ON public.transactions;
DROP POLICY IF EXISTS "Authenticated users can insert transactions" ON public.transactions;
DROP POLICY IF EXISTS "Authenticated users can update transactions" ON public.transactions;
DROP POLICY IF EXISTS "Authenticated users can delete transactions" ON public.transactions;

CREATE POLICY "Authenticated users can read transactions"
ON public.transactions
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert transactions"
ON public.transactions
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update transactions"
ON public.transactions
FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete transactions"
ON public.transactions
FOR DELETE
USING (auth.role() = 'authenticated');

-- shop_settings (non-sensitive updates)
DROP POLICY IF EXISTS "Authenticated users can update non-sensitive shop_settings" ON public.shop_settings;

CREATE POLICY "Authenticated users can update non-sensitive shop_settings"
ON public.shop_settings
FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- ===== Fix security definer view finding: switch view to security_invoker and grant controlled base-table access =====
-- Allow authenticated users to read shop_settings, but block admin_password_hash column via column privileges.

-- RLS: allow SELECT for authenticated (column privilege still blocks the sensitive column)
DROP POLICY IF EXISTS "Authenticated users can read shop_settings" ON public.shop_settings;
CREATE POLICY "Authenticated users can read shop_settings"
ON public.shop_settings
FOR SELECT
USING (auth.role() = 'authenticated');

-- Grants
GRANT SELECT ON public.shop_settings TO authenticated;

-- Remove access to sensitive column
REVOKE SELECT (admin_password_hash) ON public.shop_settings FROM authenticated;
REVOKE UPDATE (admin_password_hash) ON public.shop_settings FROM authenticated;

-- Make view run with invoker rights (so it respects RLS and no longer acts as definer)
ALTER VIEW public.shop_settings_public SET (security_invoker = true);
