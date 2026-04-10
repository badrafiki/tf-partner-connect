-- 1. Revoke SELECT on cost_price_usd from authenticated role
-- This ensures partners querying the base products table cannot see cost data
REVOKE SELECT (cost_price_usd) ON public.products FROM authenticated;
REVOKE SELECT (cost_price_usd) ON public.products FROM anon;

-- 2. Fix user_roles "Users read own role" policy: change from public to authenticated
DROP POLICY IF EXISTS "Users read own role" ON public.user_roles;
CREATE POLICY "Users read own role"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());