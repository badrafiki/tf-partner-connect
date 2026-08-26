-- 1) Security definer view -> security invoker
ALTER VIEW public.products_partner_view SET (security_invoker = true);

-- 2) Pin search_path on queue helper functions
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;

-- 3) Revoke EXECUTE from client roles on internal/service-only functions
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_wake() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_order_status_change() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_quotation_issued() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_stock_change() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_erp_sync_log_direction() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_order_status() FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.email_queue_dispatch() TO service_role;

-- 4) Admin-only and partner-only RPCs: signed-in users only
REVOKE EXECUTE ON FUNCTION public.admin_email_log_stats() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_email_log_templates() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_email_log(integer, integer, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_email_dlq_stats() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_category_counts_for_partner(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_partner_visible_products(uuid) FROM anon;