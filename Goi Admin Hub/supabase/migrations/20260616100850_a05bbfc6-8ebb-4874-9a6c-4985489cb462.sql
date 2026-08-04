
REVOKE EXECUTE ON FUNCTION public.recompute_courier_stats(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_record_offer_from_whatsapp() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_update_offers_on_job_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_recompute_stats_offer() FROM PUBLIC, anon, authenticated;
