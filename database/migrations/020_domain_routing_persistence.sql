-- RESERVED 020 by Codex, 22/10/2026; backend-local proposal, NOT applied to Cloud.
-- Private worker boundary. No key provisioning, public writer or domain activation.
BEGIN;
CREATE TABLE public.tm_domain_routing_keys (
  project_id uuid NOT NULL, key_id text NOT NULL CHECK(key_id ~ '^[a-zA-Z0-9_-]{1,64}$'),
  public_key_digest text NOT NULL CHECK(public_key_digest ~ '^[a-f0-9]{64}$'),
  is_active boolean NOT NULL DEFAULT false,
  not_before timestamptz NOT NULL CHECK(isfinite(not_before)),
  not_after timestamptz NOT NULL CHECK(isfinite(not_after) AND not_after>not_before),
  PRIMARY KEY(project_id,key_id)
);
CREATE TABLE public.tm_domain_routing_challenges (
  id uuid PRIMARY KEY, domain_id uuid NOT NULL REFERENCES public.tm_clinic_domains(id),
  domain_revision integer NOT NULL CHECK(domain_revision>0),
  project_id uuid NOT NULL, key_id text NOT NULL,
  public_key_digest text NOT NULL CHECK(public_key_digest ~ '^[a-f0-9]{64}$'),
  dns_challenge_id uuid NOT NULL REFERENCES public.tm_domain_dns_proofs(challenge_id),
  challenge jsonb NOT NULL CHECK(jsonb_typeof(challenge)='object'),
  issued_by uuid NOT NULL, created_at timestamptz NOT NULL CHECK(isfinite(created_at)),
  expires_at timestamptz NOT NULL CHECK(isfinite(expires_at) AND expires_at>created_at),
  revoked_at timestamptz CHECK(revoked_at>=created_at),
  consumed_at timestamptz CHECK(consumed_at>=created_at AND consumed_at<expires_at),
  FOREIGN KEY(project_id,key_id) REFERENCES public.tm_domain_routing_keys(project_id,key_id)
);
CREATE UNIQUE INDEX tm_domain_routing_current ON public.tm_domain_routing_challenges(domain_id)
  WHERE revoked_at IS NULL;
CREATE UNIQUE INDEX tm_domain_routing_nonce ON public.tm_domain_routing_challenges((challenge->>'nonce'));
CREATE TABLE public.tm_domain_routing_receipts (
  challenge_id uuid PRIMARY KEY REFERENCES public.tm_domain_routing_challenges(id),
  receipt jsonb NOT NULL CHECK(jsonb_typeof(receipt)='object'),
  recorded_by uuid NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE public.tm_domain_routing_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid NOT NULL REFERENCES public.tm_clinic_domains(id),
  challenge_id uuid NOT NULL REFERENCES public.tm_domain_routing_challenges(id),
  actor_user_id uuid NOT NULL,
  action text NOT NULL CHECK(action IN('routing_issued','routing_rotated','routing_recorded')),
  occurred_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE public.tm_domain_routing_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tm_domain_routing_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tm_domain_routing_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tm_domain_routing_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tm_domain_routing_keys,public.tm_domain_routing_challenges,
  public.tm_domain_routing_receipts,public.tm_domain_routing_audit FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.tm_domain_routing_audit TO authenticated;
CREATE POLICY tm_routing_audit_operator_read ON public.tm_domain_routing_audit FOR SELECT TO authenticated
  USING(EXISTS(SELECT 1 FROM public.tm_platform_operators o WHERE o.user_id=(SELECT auth.uid())
    AND o.role='super_admin' AND o.is_active));

-- Lock ordering: operator -> domain -> DNS challenge -> DNS proof -> key -> routing challenge.
-- Only private functions call this helper; digest NULL is allowed exclusively at issuance.
CREATE FUNCTION public.tm_lock_routing_scope(p_actor uuid,p_domain uuid,p_revision integer,
  p_dns uuid,p_dns_digest text,p_project uuid,p_key text,p_key_digest text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE d public.tm_clinic_domains%ROWTYPE; c public.tm_domain_challenges%ROWTYPE;
  p public.tm_domain_dns_proofs%ROWTYPE; k public.tm_domain_routing_keys%ROWTYPE; instant timestamptz;
BEGIN
  PERFORM 1 FROM public.tm_platform_operators o WHERE o.user_id=p_actor AND o.is_active
    AND o.role='super_admin' FOR SHARE;
  IF p_actor IS NULL OR NOT FOUND THEN
    RAISE EXCEPTION 'Administrative access denied' USING ERRCODE='42501';
  END IF;
  SELECT * INTO d FROM public.tm_clinic_domains WHERE id=p_domain FOR UPDATE;
  IF NOT FOUND OR d.status<>'pending_verification' OR p_revision IS NULL OR d.revision<>p_revision THEN
    RAISE EXCEPTION 'Routing scope changed' USING ERRCODE='40001';
  END IF;
  SELECT * INTO c FROM public.tm_domain_challenges WHERE id=p_dns AND domain_id=d.id FOR SHARE;
  IF NOT FOUND OR c.domain_revision<>d.revision OR c.revoked_at IS NOT NULL OR c.consumed_at IS NULL THEN
    RAISE EXCEPTION 'DNS proof changed' USING ERRCODE='40001';
  END IF;
  SELECT * INTO p FROM public.tm_domain_dns_proofs WHERE challenge_id=c.id AND domain_id=d.id FOR SHARE;
  IF NOT FOUND OR p.domain_revision<>d.revision OR p.proof_digest IS DISTINCT FROM p_dns_digest THEN
    RAISE EXCEPTION 'DNS proof changed' USING ERRCODE='40001';
  END IF;
  SELECT * INTO k FROM public.tm_domain_routing_keys WHERE project_id=p_project AND key_id=p_key FOR SHARE;
  instant:=clock_timestamp();
  IF NOT FOUND OR NOT k.is_active OR instant<k.not_before OR instant>=k.not_after
    OR (p_key_digest IS NOT NULL AND k.public_key_digest IS DISTINCT FROM p_key_digest) THEN
    RAISE EXCEPTION 'Routing key unavailable' USING ERRCODE='40001';
  END IF;
  IF p.verified_at>instant OR p.expires_at<=instant OR c.expires_at<=instant THEN
    RAISE EXCEPTION 'DNS proof expired' USING ERRCODE='40001';
  END IF;
  RETURN jsonb_build_object('domain',to_jsonb(d),'dnsExpiresAt',p.expires_at,
    'keyNotBefore',k.not_before,'keyNotAfter',k.not_after,'publicKeyDigest',k.public_key_digest);
END;
$$;
REVOKE ALL ON FUNCTION public.tm_lock_routing_scope(uuid,uuid,integer,uuid,text,uuid,text,text)
  FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.tm_issue_routing_challenge(p_actor uuid,p_challenge jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE state jsonb; d jsonb; instant timestamptz; start_at timestamptz; end_at timestamptz;
  changed boolean; challenge_id uuid; domain_id uuid; project_id uuid; dns_id uuid; revision integer;
BEGIN
  IF p_challenge IS NULL OR jsonb_typeof(p_challenge)<>'object' THEN
    RAISE EXCEPTION 'Invalid routing challenge' USING ERRCODE='22023';
  END IF;
  IF (SELECT count(*) FROM jsonb_object_keys(p_challenge))<>13
    OR NOT p_challenge ?& ARRAY['id','nonce','projectId','keyId','domainId','clinicId','hostname',
      'environment','revision','dnsChallengeId','dnsProofDigest','createdAt','expiresAt']
    OR EXISTS(SELECT 1 FROM jsonb_each(p_challenge) e WHERE
      (e.key='revision' AND jsonb_typeof(e.value)<>'number') OR
      (e.key<>'revision' AND jsonb_typeof(e.value)<>'string'))
    OR p_challenge->>'nonce' !~ '^[a-f0-9]{64}$'
    OR p_challenge->>'dnsProofDigest' !~ '^[a-f0-9]{64}$'
    OR p_challenge->>'keyId' !~ '^[a-zA-Z0-9_-]{1,64}$' THEN
    RAISE EXCEPTION 'Invalid routing challenge' USING ERRCODE='22023';
  END IF;
  challenge_id:=(p_challenge->>'id')::uuid; domain_id:=(p_challenge->>'domainId')::uuid;
  project_id:=(p_challenge->>'projectId')::uuid; dns_id:=(p_challenge->>'dnsChallengeId')::uuid;
  revision:=(p_challenge->>'revision')::integer;
  start_at:=(p_challenge->>'createdAt')::timestamptz; end_at:=(p_challenge->>'expiresAt')::timestamptz;
  state:=public.tm_lock_routing_scope(p_actor,domain_id,revision,dns_id,
    p_challenge->>'dnsProofDigest',project_id,p_challenge->>'keyId',NULL);
  d:=state->'domain'; instant:=clock_timestamp();
  IF (p_challenge->>'clinicId')::uuid<>(d->>'clinic_id')::uuid
    OR p_challenge->>'hostname'<>d->>'hostname' OR p_challenge->>'environment'<>d->>'environment'
    OR NOT isfinite(start_at) OR NOT isfinite(end_at) OR start_at>instant OR end_at<=instant
    OR end_at<=start_at OR end_at>(state->>'dnsExpiresAt')::timestamptz
    OR start_at<(state->>'keyNotBefore')::timestamptz OR end_at>(state->>'keyNotAfter')::timestamptz THEN
    RAISE EXCEPTION 'Routing scope changed' USING ERRCODE='40001';
  END IF;
  UPDATE public.tm_domain_routing_challenges SET revoked_at=instant WHERE tm_domain_routing_challenges.domain_id=(p_challenge->>'domainId')::uuid AND revoked_at IS NULL;
  changed:=FOUND;
  INSERT INTO public.tm_domain_routing_challenges(id,domain_id,domain_revision,project_id,key_id,
    public_key_digest,dns_challenge_id,challenge,issued_by,created_at,expires_at)
    VALUES(challenge_id,(p_challenge->>'domainId')::uuid,revision,project_id,p_challenge->>'keyId',
      state->>'publicKeyDigest',dns_id,p_challenge,p_actor,start_at,end_at);
  INSERT INTO public.tm_domain_routing_audit(domain_id,challenge_id,actor_user_id,action)
    VALUES((p_challenge->>'domainId')::uuid,challenge_id,p_actor,
      CASE WHEN changed THEN 'routing_rotated' ELSE 'routing_issued' END);
  RETURN p_challenge;
END;
$$;
REVOKE ALL ON FUNCTION public.tm_issue_routing_challenge(uuid,jsonb) FROM PUBLIC,anon,authenticated;

-- Only the reviewed private verifier supplies candidates. SQL does not verify signatures itself.
CREATE FUNCTION public.tm_record_routing_receipt(p_actor uuid,p_receipt jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE state jsonb; d jsonb; c public.tm_domain_routing_challenges%ROWTYPE;
  instant timestamptz; verified_at timestamptz;
BEGIN
  IF p_receipt IS NULL OR jsonb_typeof(p_receipt)<>'object'
    OR NOT p_receipt ?& ARRAY['challengeId','domainId','clinicId','hostname','environment','revision',
      'projectId','keyId','dnsChallengeId','dnsProofDigest','routingVerifiedAt','expiresAt',
      'signatureDigest','publicKeyDigest','certificateFingerprint'] THEN
    RAISE EXCEPTION 'Invalid routing receipt' USING ERRCODE='22023';
  END IF;
  IF (SELECT count(*) FROM jsonb_object_keys(p_receipt))<>15
    OR EXISTS(SELECT 1 FROM jsonb_each(p_receipt) e WHERE
      (e.key='revision' AND jsonb_typeof(e.value)<>'number') OR
      (e.key<>'revision' AND jsonb_typeof(e.value)<>'string'))
    OR p_receipt->>'signatureDigest' !~ '^[a-f0-9]{64}$'
    OR p_receipt->>'publicKeyDigest' !~ '^[a-f0-9]{64}$'
    OR p_receipt->>'certificateFingerprint' !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'Invalid routing receipt' USING ERRCODE='22023';
  END IF;
  state:=public.tm_lock_routing_scope(p_actor,(p_receipt->>'domainId')::uuid,
    (p_receipt->>'revision')::integer,(p_receipt->>'dnsChallengeId')::uuid,
    p_receipt->>'dnsProofDigest',(p_receipt->>'projectId')::uuid,p_receipt->>'keyId',p_receipt->>'publicKeyDigest');
  d:=state->'domain';
  SELECT * INTO c FROM public.tm_domain_routing_challenges
    WHERE id=(p_receipt->>'challengeId')::uuid AND domain_id=(p_receipt->>'domainId')::uuid FOR UPDATE;
  instant:=clock_timestamp(); verified_at:=(p_receipt->>'routingVerifiedAt')::timestamptz;
  IF NOT FOUND OR c.revoked_at IS NOT NULL OR c.consumed_at IS NOT NULL
    OR c.domain_revision<>(p_receipt->>'revision')::integer
    OR c.project_id<>(p_receipt->>'projectId')::uuid OR c.key_id<>p_receipt->>'keyId'
    OR c.created_at<(state->>'keyNotBefore')::timestamptz
    OR c.expires_at>(state->>'keyNotAfter')::timestamptz
    OR c.public_key_digest<>p_receipt->>'publicKeyDigest'
    OR c.dns_challenge_id<>(p_receipt->>'dnsChallengeId')::uuid
    OR c.challenge->>'dnsProofDigest'<>p_receipt->>'dnsProofDigest'
    OR p_receipt->>'hostname'<>d->>'hostname' OR p_receipt->>'environment'<>d->>'environment'
    OR (p_receipt->>'clinicId')::uuid<>(d->>'clinic_id')::uuid
    OR NOT isfinite(verified_at) OR verified_at<c.created_at OR verified_at>instant
    OR c.expires_at<=instant OR verified_at>=c.expires_at
    OR (p_receipt->>'expiresAt')::timestamptz<>c.expires_at THEN
    RAISE EXCEPTION 'Routing challenge changed' USING ERRCODE='40001';
  END IF;
  INSERT INTO public.tm_domain_routing_receipts(challenge_id,receipt,recorded_by)
    VALUES(c.id,p_receipt,p_actor);
  UPDATE public.tm_domain_routing_challenges SET consumed_at=instant WHERE id=c.id;
  INSERT INTO public.tm_domain_routing_audit(domain_id,challenge_id,actor_user_id,action)
    VALUES(c.domain_id,c.id,p_actor,'routing_recorded');
  RETURN p_receipt;
END;
$$;
REVOKE ALL ON FUNCTION public.tm_record_routing_receipt(uuid,jsonb) FROM PUBLIC,anon,authenticated;
COMMIT;
