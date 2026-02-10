
-- Fix linter: RLS enabled with no policies on rate_limits
-- We keep RLS enabled and add explicit deny-all policies (service role bypasses RLS).

DROP POLICY IF EXISTS "No access - select" ON public.rate_limits;
DROP POLICY IF EXISTS "No access - insert" ON public.rate_limits;
DROP POLICY IF EXISTS "No access - update" ON public.rate_limits;
DROP POLICY IF EXISTS "No access - delete" ON public.rate_limits;

CREATE POLICY "No access - select"
ON public.rate_limits
FOR SELECT
USING (false);

CREATE POLICY "No access - insert"
ON public.rate_limits
FOR INSERT
WITH CHECK (false);

CREATE POLICY "No access - update"
ON public.rate_limits
FOR UPDATE
USING (false)
WITH CHECK (false);

CREATE POLICY "No access - delete"
ON public.rate_limits
FOR DELETE
USING (false);
