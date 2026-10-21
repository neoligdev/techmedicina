-- Local proposal: read current challenges; only a trusted database owner may persist DNS observations.
BEGIN;
ALTER TABLE public.tm_domain_challenges ADD COLUMN consumed_at timestamptz
  CHECK (consumed_at>=created_at AND consumed_at<expires_at);
CREATE TABLE public.tm_domain_dns_proofs (
  challenge_id uuid PRIMARY KEY REFERENCES public.tm_domain_challenges(id),
  domain_id uuid NOT NULL REFERENCES public.tm_clinic_domains(id),
  domain_revision integer NOT NULL CHECK (domain_revision>0),
  verified_at timestamptz NOT NULL CHECK (isfinite(verified_at)),
  expires_at timestamptz NOT NULL CHECK (isfinite(expires_at) AND expires_at>verified_at),
  proof_digest text NOT NULL CHECK (proof_digest ~ '^[a-f0-9]{64}$'),
  actor_user_id uuid NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE public.tm_domain_dns_proofs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tm_domain_dns_proofs FROM PUBLIC,anon,authenticated;
-- No browser-writable proof flags and no new service account or grants.
CREATE FUNCTION public.tm_read_domain_challenge(p_domain_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE d public.tm_clinic_domains%ROWTYPE; c public.tm_domain_challenges%ROWTYPE;
BEGIN
  PERFORM 1 FROM public.tm_platform_operators o
    WHERE o.user_id=auth.uid() AND o.is_active AND o.role='super_admin' FOR SHARE;
  IF auth.uid() IS NULL OR NOT FOUND THEN
    RAISE EXCEPTION 'Administrative access denied' USING ERRCODE='42501';
  END IF;
  SELECT * INTO d FROM public.tm_clinic_domains WHERE id=p_domain_id FOR SHARE;
  IF NOT FOUND OR d.status<>'pending_verification' THEN RETURN NULL; END IF;
  SELECT * INTO c FROM public.tm_domain_challenges
    WHERE domain_id=d.id AND domain_revision=d.revision AND revoked_at IS NULL
      AND consumed_at IS NULL AND created_at<=clock_timestamp() AND expires_at>clock_timestamp();
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('domain',jsonb_build_object('id',d.id,'clinic_id',d.clinic_id,'hostname',d.hostname,
    'environment',d.environment,'status',d.status,'revision',d.revision,'created_at',d.created_at),'challenge',jsonb_build_object(
    'id',c.id,'domainId',d.id,'clinicId',d.clinic_id,'hostname',d.hostname,
    'environment',d.environment,'revision',d.revision,'token',c.token,
    'createdAt',c.created_at,'expiresAt',c.expires_at));
END;
$$;
REVOKE ALL ON FUNCTION public.tm_read_domain_challenge(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tm_read_domain_challenge(uuid) TO authenticated;

-- Private persistence boundary: worker identity/deployment must be reviewed before any grant.
CREATE FUNCTION public.tm_record_domain_dns_proof(
  p_actor_user_id uuid,p_domain_id uuid,p_challenge_id uuid,p_expected_revision integer,
  p_verified_at timestamptz,p_proof_digest text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE d public.tm_clinic_domains%ROWTYPE; c public.tm_domain_challenges%ROWTYPE; checked_at timestamptz;
BEGIN
  PERFORM 1 FROM public.tm_platform_operators o
    WHERE o.user_id=p_actor_user_id AND o.is_active AND o.role='super_admin' FOR SHARE;
  IF p_actor_user_id IS NULL OR NOT FOUND THEN
    RAISE EXCEPTION 'Administrative access denied' USING ERRCODE='42501';
  END IF;
  IF p_domain_id IS NULL OR p_challenge_id IS NULL OR p_expected_revision IS NULL
    OR p_verified_at IS NULL OR NOT isfinite(p_verified_at)
    OR p_proof_digest IS NULL OR p_proof_digest !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'Invalid observation' USING ERRCODE='22023';
  END IF;
  SELECT * INTO d FROM public.tm_clinic_domains WHERE id=p_domain_id FOR UPDATE;
  IF NOT FOUND OR d.status<>'pending_verification' OR d.revision<>p_expected_revision THEN
    RAISE EXCEPTION 'Domain challenge changed' USING ERRCODE='40001';
  END IF;
  SELECT * INTO c FROM public.tm_domain_challenges
    WHERE id=p_challenge_id AND domain_id=d.id AND domain_revision=d.revision FOR UPDATE;
  checked_at:=clock_timestamp();
  IF NOT FOUND OR c.revoked_at IS NOT NULL OR c.consumed_at IS NOT NULL
    OR c.created_at>checked_at OR c.expires_at<=checked_at
    OR p_verified_at<c.created_at OR p_verified_at>=c.expires_at OR p_verified_at>checked_at THEN
    RAISE EXCEPTION 'Domain challenge changed' USING ERRCODE='40001';
  END IF;
  INSERT INTO public.tm_domain_dns_proofs(challenge_id,domain_id,domain_revision,verified_at,expires_at,proof_digest,actor_user_id)
    VALUES(c.id,d.id,d.revision,p_verified_at,c.expires_at,p_proof_digest,p_actor_user_id);
  UPDATE public.tm_domain_challenges SET consumed_at=checked_at WHERE id=c.id;
  RETURN jsonb_build_object('challengeId',c.id,'domainId',d.id,'clinicId',d.clinic_id,
    'hostname',d.hostname,'environment',d.environment,'revision',d.revision,
    'dnsVerifiedAt',p_verified_at,'expiresAt',c.expires_at,'proofDigest',p_proof_digest);
END;
$$;
REVOKE ALL ON FUNCTION public.tm_record_domain_dns_proof(uuid,uuid,uuid,integer,timestamptz,text)
  FROM PUBLIC,anon,authenticated;
COMMIT;
