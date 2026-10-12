-- C044: hostname collisions are uniqueness violations, not serialization failures.
-- Preserve the existing signature, authorization checks, pending-only state and grants.
BEGIN;
CREATE OR REPLACE FUNCTION public.tm_reserve_domain(p_clinic_id uuid,p_hostname text,p_environment text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE saved public.tm_clinic_domains%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.tm_platform_operators o WHERE o.user_id=auth.uid() AND o.is_active)
    THEN RAISE EXCEPTION 'Administrative access denied' USING ERRCODE='42501'; END IF;
  IF p_clinic_id IS NULL OR p_hostname IS NULL OR p_environment IS NULL
    OR NOT EXISTS (SELECT 1 FROM public.tm_clinics WHERE id=p_clinic_id)
    OR p_environment NOT IN ('clinic_portal','patient_pwa')
    OR char_length(p_hostname)>253
    OR p_hostname !~ '^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$'
    OR split_part(p_hostname,'.',1) IN ('admin','super-admin','api','auth','login','cloud','internal','health','metrics','status','staus')
    THEN RAISE EXCEPTION 'Invalid domain input' USING ERRCODE='22023'; END IF;
  INSERT INTO public.tm_clinic_domains(clinic_id,hostname,environment)
    VALUES(p_clinic_id,p_hostname,p_environment) ON CONFLICT(hostname) DO NOTHING RETURNING * INTO saved;
  IF saved.id IS NULL THEN RAISE EXCEPTION 'Domain already reserved' USING ERRCODE='23505'; END IF;
  INSERT INTO public.tm_domain_audit(domain_id,actor_user_id,action) VALUES(saved.id,auth.uid(),'domain_reserved');
  RETURN jsonb_build_object('id',saved.id,'clinic_id',saved.clinic_id,'hostname',saved.hostname,'environment',saved.environment,'status',saved.status,'revision',saved.revision,'created_at',saved.created_at);
END;
$$;
COMMIT;
