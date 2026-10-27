-- LOCAL proposal 025: private activation with persisted, current proofs. No endpoint or grants.
BEGIN;
ALTER TABLE public.tm_clinic_domains DROP CONSTRAINT tm_clinic_domains_status_check;
ALTER TABLE public.tm_clinic_domains ADD CONSTRAINT tm_clinic_domains_status_check CHECK(status IN ('pending_verification','active'));
ALTER TABLE public.tm_domain_audit DROP CONSTRAINT tm_domain_audit_action_check;
ALTER TABLE public.tm_domain_audit ADD CONSTRAINT tm_domain_audit_action_check CHECK(action IN ('domain_reserved','domain_activated'));
CREATE TABLE public.tm_domain_activations(
 domain_id uuid PRIMARY KEY REFERENCES public.tm_clinic_domains(id),
 challenge_id uuid NOT NULL UNIQUE REFERENCES public.tm_domain_routing_receipts(challenge_id),
 source_revision integer NOT NULL CHECK(source_revision>0),
 activated_revision integer NOT NULL CHECK(activated_revision=source_revision+1),
 actor_user_id uuid NOT NULL,activated_at timestamptz NOT NULL CHECK(isfinite(activated_at)),
 valid_until timestamptz NOT NULL CHECK(isfinite(valid_until) AND valid_until>activated_at)
);
ALTER TABLE public.tm_domain_activations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tm_domain_activations FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.tm_activate_domain(p_actor uuid,p_domain uuid,p_revision integer,p_project uuid,p_challenge uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.tm_domain_routing_challenges%ROWTYPE; state jsonb; proof jsonb; d jsonb;
 instant timestamptz; valid_until timestamptz;
BEGIN
 -- Scope helper locks operator -> domain -> DNS -> key; do not invert this order.
 PERFORM 1 FROM public.tm_platform_operators WHERE user_id=p_actor AND is_active AND role='super_admin' FOR SHARE;
 IF p_actor IS NULL OR NOT FOUND THEN RAISE EXCEPTION 'Administrative access denied' USING ERRCODE='42501'; END IF;
 IF p_domain IS NULL OR p_revision IS NULL OR p_revision<1 OR p_project IS NULL OR p_challenge IS NULL THEN
  RAISE EXCEPTION 'Invalid activation request' USING ERRCODE='22023';
 END IF;
 SELECT * INTO r FROM public.tm_domain_routing_challenges WHERE id=p_challenge AND domain_id=p_domain AND project_id=p_project;
 IF NOT FOUND THEN RAISE EXCEPTION 'Routing proof changed' USING ERRCODE='40001'; END IF;
 state:=public.tm_lock_routing_scope(p_actor,p_domain,p_revision,r.dns_challenge_id,
   r.challenge->>'dnsProofDigest',p_project,r.key_id,r.public_key_digest);
 d:=state->'domain';
 -- Clinic lock is acquired after domain scope; this function never writes clinic state.
 PERFORM 1 FROM public.tm_clinics WHERE id=(d->>'clinic_id')::uuid AND is_active FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Clinic unavailable' USING ERRCODE='40001'; END IF;
 proof:=public.tm_read_routing_receipt(p_actor,p_domain,p_challenge);
 IF proof IS NULL OR NOT coalesce((proof->>'isValid')::boolean,false) THEN
  RAISE EXCEPTION 'Routing proof unavailable' USING ERRCODE='40001';
 END IF;
 instant:=clock_timestamp();valid_until:=(proof->'receipt'->>'expiresAt')::timestamptz;
 IF valid_until<=instant THEN RAISE EXCEPTION 'Routing proof expired' USING ERRCODE='40001'; END IF;
 INSERT INTO public.tm_domain_activations(domain_id,challenge_id,source_revision,activated_revision,actor_user_id,activated_at,valid_until)
  VALUES(p_domain,p_challenge,p_revision,p_revision+1,p_actor,instant,valid_until);
 UPDATE public.tm_clinic_domains SET status='active',revision=revision+1 WHERE id=p_domain;
 INSERT INTO public.tm_domain_audit(domain_id,actor_user_id,action) VALUES(p_domain,p_actor,'domain_activated');
 RETURN jsonb_build_object('domainId',p_domain,'clinicId',d->>'clinic_id','hostname',d->>'hostname',
  'environment',d->>'environment','projectId',p_project,'challengeId',p_challenge,
  'status','active','revision',p_revision+1,'activatedAt',instant,'validUntil',valid_until);
END;
$$;
REVOKE ALL ON FUNCTION public.tm_activate_domain(uuid,uuid,integer,uuid,uuid) FROM PUBLIC,anon,authenticated;
COMMIT;
