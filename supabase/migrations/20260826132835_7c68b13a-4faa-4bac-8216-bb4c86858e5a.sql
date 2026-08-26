-- Remove default PUBLIC execute on all privileged functions
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.email_queue_wake() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_order_status_change() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_quotation_issued() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_stock_change() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_erp_sync_log_direction() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_order_status() FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.admin_email_log_stats() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_email_log_templates() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_list_email_log(integer, integer, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_email_dlq_stats() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_category_counts_for_partner(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_partner_visible_products(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, text) FROM PUBLIC, anon;

-- Re-grant only what the app actually needs
GRANT EXECUTE ON FUNCTION public.admin_email_log_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_email_log_templates() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_email_log(integer, integer, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_email_dlq_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_category_counts_for_partner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_partner_visible_products(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO authenticated, service_role;