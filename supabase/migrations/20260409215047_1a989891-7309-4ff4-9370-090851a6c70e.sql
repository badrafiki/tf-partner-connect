
-- Add admin_notes column
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS admin_notes text;

-- Create partner view excluding admin_notes
CREATE OR REPLACE VIEW quotations_partner_view
  WITH (security_invoker = true)
AS
  SELECT
    id, enquiry_id, partner_id, pdf_url,
    issued_at, expires_at, status, notes
  FROM quotations;

-- Create storage bucket for quotation PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('quotation-pdfs', 'quotation-pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: admin upload/manage
CREATE POLICY "Admin manages quotation PDFs"
ON storage.objects
FOR ALL
USING (bucket_id = 'quotation-pdfs' AND public.has_role(auth.uid(), 'admin'));

-- Storage policies: partner can read their quotation PDFs
CREATE POLICY "Partners read quotation PDFs"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'quotation-pdfs'
  AND public.has_role(auth.uid(), 'partner')
);
