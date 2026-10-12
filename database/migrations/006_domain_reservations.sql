-- C036: reservations only; no DNS, TLS, activation or new clinical permissions.
BEGIN;
CREATE TABLE public.tm_clinic_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.tm_clinics(id),
  hostname text NOT NULL UNIQUE CHECK (
    char_length(hostname) <= 253 AND hostname = lower(hostname)
    AND hostname ~ '^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$'
    AND split_part(hostname,'.',1) NOT IN ('admin','super-admin','api','auth','login','cloud','internal','health','metrics','status','staus')
  ),
  environment text NOT NULL CHECK (environment IN ('clinic_portal','patient_pwa')),
  status text NOT NULL DEFAULT 'pending_verification' CHECK (status = 'pending_verification'),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.tm_domain_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid NOT NULL REFERENCES public.tm_clinic_domains(id),
  actor_user_id uuid NOT NULL,
  action text NOT NULL CHECK (action = 'domain_reserved'),
  occurred_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tm_clinic_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tm_domain_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tm_clinic_domains, public.tm_domain_audit FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.tm_clinic_domains, public.tm_domain_audit TO authenticated;
CREATE POLICY tm_domain_operator_read ON public.tm_clinic_domains FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tm_platform_operators o WHERE o.user_id=(SELECT auth.uid()) AND o.is_active));
CREATE POLICY tm_domain_audit_operator_read ON public.tm_domain_audit FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tm_platform_operators o WHERE o.user_id=(SELECT auth.uid()) AND o.is_active));
CREATE FUNCTION public.tm_reserve_domain(p_clinic_id uuid,p_hostname text,p_environment text)
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
  IF saved.id IS NULL THEN RAISE EXCEPTION 'Domain already reserved' USING ERRCODE='40001'; END IF;
  INSERT INTO public.tm_domain_audit(domain_id,actor_user_id,action) VALUES(saved.id,auth.uid(),'domain_reserved');
  RETURN jsonb_build_object('id',saved.id,'clinic_id',saved.clinic_id,'hostname',saved.hostname,'environment',saved.environment,'status',saved.status,'revision',saved.revision,'created_at',saved.created_at);
END;
$$;
REVOKE ALL ON FUNCTION public.tm_reserve_domain(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tm_reserve_domain(uuid,text,text) TO authenticated;
COMMIT;
