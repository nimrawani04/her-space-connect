REVOKE EXECUTE ON FUNCTION public.is_journey_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_journey_member(uuid, uuid) TO authenticated, service_role;