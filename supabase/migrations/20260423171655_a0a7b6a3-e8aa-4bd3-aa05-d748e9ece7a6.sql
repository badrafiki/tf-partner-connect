
-- Allow admins to read DLQ counts and recent emails for the admin dashboard.
CREATE OR REPLACE FUNCTION public.get_email_dlq_stats()
RETURNS TABLE(queue_name text, dlq_count bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, pgmq
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  SELECT 'auth_emails'::text, count(*)::bigint FROM pgmq.q_auth_emails_dlq
  UNION ALL
  SELECT 'transactional_emails'::text, count(*)::bigint FROM pgmq.q_transactional_emails_dlq;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_dlq_stats() TO authenticated;

-- Allow admins to read the email send log via a security-definer function
-- (the table itself is restricted to service_role only).
CREATE OR REPLACE FUNCTION public.admin_list_email_log(
  p_limit int DEFAULT 200,
  p_offset int DEFAULT 0,
  p_search text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_template text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  message_id text,
  template_name text,
  recipient_email text,
  status text,
  error_message text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  WITH latest AS (
    SELECT DISTINCT ON (l.message_id)
      l.id, l.message_id, l.template_name, l.recipient_email,
      l.status, l.error_message, l.created_at
    FROM public.email_send_log l
    WHERE l.message_id IS NOT NULL
    ORDER BY l.message_id, l.created_at DESC
  )
  SELECT * FROM latest
  WHERE
    (p_search IS NULL OR recipient_email ILIKE '%' || p_search || '%' OR template_name ILIKE '%' || p_search || '%')
    AND (p_status IS NULL OR status = p_status)
    AND (p_template IS NULL OR template_name = p_template)
  ORDER BY created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_email_log(int, int, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_email_log_stats()
RETURNS TABLE(status text, total bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  WITH latest AS (
    SELECT DISTINCT ON (l.message_id) l.status
    FROM public.email_send_log l
    WHERE l.message_id IS NOT NULL
    ORDER BY l.message_id, l.created_at DESC
  )
  SELECT status, count(*)::bigint FROM latest GROUP BY status;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_email_log_stats() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_email_log_templates()
RETURNS TABLE(template_name text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  SELECT DISTINCT l.template_name FROM public.email_send_log l ORDER BY l.template_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_email_log_templates() TO authenticated;
