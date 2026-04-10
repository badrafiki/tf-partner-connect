-- 1. Prevent non-admin users from inserting into user_roles (privilege escalation fix)
CREATE POLICY "Only admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

-- 2. Fix has_role to prevent cross-user role enumeration
CREATE OR REPLACE FUNCTION public.has_role(uid uuid, r text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT uid = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = uid AND role = r
    );
$$;

-- 3. Fix quotation PDF storage policy - scope to partner's own folder
-- Drop existing overly-permissive policy
DROP POLICY IF EXISTS "Partners read quotation PDFs" ON storage.objects;

-- Create scoped policy using partner_id folder structure
CREATE POLICY "Partners read own quotation PDFs"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'quotation-pdfs'
  AND has_role(auth.uid(), 'partner')
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM partners WHERE user_id = auth.uid()
  )
);