-- =====================================================
-- SECURITY FIX: Require authentication for all tables
-- =====================================================

-- 1. Create view for shop_settings without admin_password_hash
CREATE OR REPLACE VIEW public.shop_settings_public AS
SELECT 
  id,
  shop_name,
  shop_address,
  shop_phone,
  theme,
  font_size,
  sidebar_collapsed,
  sync_config,
  updated_at
FROM public.shop_settings;

-- 2. Drop all existing permissive RLS policies
DROP POLICY IF EXISTS "Allow all operations on appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow all operations on audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow all operations on card_templates" ON public.card_templates;
DROP POLICY IF EXISTS "Allow all operations on member_cards" ON public.member_cards;
DROP POLICY IF EXISTS "Allow all operations on members" ON public.members;
DROP POLICY IF EXISTS "Allow all operations on orders" ON public.orders;
DROP POLICY IF EXISTS "Allow all operations on services" ON public.services;
DROP POLICY IF EXISTS "Allow reading non-sensitive shop settings" ON public.shop_settings;
DROP POLICY IF EXISTS "Allow updating non-sensitive shop settings" ON public.shop_settings;
DROP POLICY IF EXISTS "Allow all operations on sync_queue" ON public.sync_queue;
DROP POLICY IF EXISTS "Allow all operations on transactions" ON public.transactions;

-- 3. Create new authenticated-only RLS policies for all tables

-- appointments: authenticated users only
CREATE POLICY "Authenticated users can read appointments"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert appointments"
  ON public.appointments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update appointments"
  ON public.appointments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete appointments"
  ON public.appointments FOR DELETE
  TO authenticated
  USING (true);

-- audit_logs: authenticated users can read, insert only (no update/delete)
CREATE POLICY "Authenticated users can read audit_logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert audit_logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- card_templates: authenticated users only
CREATE POLICY "Authenticated users can read card_templates"
  ON public.card_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert card_templates"
  ON public.card_templates FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update card_templates"
  ON public.card_templates FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete card_templates"
  ON public.card_templates FOR DELETE
  TO authenticated
  USING (true);

-- member_cards: authenticated users only
CREATE POLICY "Authenticated users can read member_cards"
  ON public.member_cards FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert member_cards"
  ON public.member_cards FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update member_cards"
  ON public.member_cards FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete member_cards"
  ON public.member_cards FOR DELETE
  TO authenticated
  USING (true);

-- members: authenticated users only
CREATE POLICY "Authenticated users can read members"
  ON public.members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert members"
  ON public.members FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update members"
  ON public.members FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete members"
  ON public.members FOR DELETE
  TO authenticated
  USING (true);

-- orders: authenticated users only
CREATE POLICY "Authenticated users can read orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert orders"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete orders"
  ON public.orders FOR DELETE
  TO authenticated
  USING (true);

-- services: authenticated users only
CREATE POLICY "Authenticated users can read services"
  ON public.services FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert services"
  ON public.services FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update services"
  ON public.services FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete services"
  ON public.services FOR DELETE
  TO authenticated
  USING (true);

-- shop_settings: authenticated users can read non-sensitive fields via view, update non-sensitive fields
-- No direct SELECT policy - use view instead
-- Keep admin_password_hash completely hidden from client

CREATE POLICY "Authenticated users can update shop_settings"
  ON public.shop_settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- sync_queue: authenticated users only
CREATE POLICY "Authenticated users can read sync_queue"
  ON public.sync_queue FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert sync_queue"
  ON public.sync_queue FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update sync_queue"
  ON public.sync_queue FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete sync_queue"
  ON public.sync_queue FOR DELETE
  TO authenticated
  USING (true);

-- transactions: authenticated users only
CREATE POLICY "Authenticated users can read transactions"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert transactions"
  ON public.transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update transactions"
  ON public.transactions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete transactions"
  ON public.transactions FOR DELETE
  TO authenticated
  USING (true);

-- 4. Grant access to the view for authenticated users
GRANT SELECT ON public.shop_settings_public TO authenticated;

-- 5. Update SECURITY DEFINER functions to use service role context
-- (They already have SECURITY DEFINER so they bypass RLS)