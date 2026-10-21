-- Local proposal: inspect an already-consumed DNS proof without replaying it.
BEGIN;
CREATE FUNCTION public.tm_read_domain_dns_proof(p_domain_id uuid,p_challenge_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE d public.tm_clinic_domains%ROWTYPE; c public.tm_domain_challenges%ROWTYPE; p public.tm_domain_dns_proofs%ROWTYPE;
  current_proof boolean;
BEGIN
  PERFORM 1 FROM public.tm_platform_operators o
    WHERE o.user_id=auth.uid() AND o.is_active AND o.role='super_admin' FOR SHARE;
  IF auth.uid() IS NULL OR NOT FOUND THEN
    RAISE EXCEPTION 'Administrative access denied' USING ERRCODE='42501';
  END IF;
  SELECT * INTO d FROM public.tm_clinic_domains WHERE id=p_domain_id FOR SHARE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO c FROM public.tm_domain_challenges WHERE id=p_challenge_id AND domain_id=d.id FOR SHARE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO p FROM public.tm_domain_dns_proofs WHERE challenge_id=c.id AND domain_id=d.id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  current_proof:=d.revision=p.domain_revision AND c.revoked_at IS NULL AND c.consumed_at IS NOT NULL;
  RETURN jsonb_build_object('proof',jsonb_build_object('challengeId',c.id,'domainId',d.id,
    'clinicId',d.clinic_id,'hostname',d.hostname,'environment',d.environment,
    'revision',p.domain_revision,'dnsVerifiedAt',p.verified_at,'expiresAt',p.expires_at,'proofDigest',p.proof_digest),
    'recordedAt',p.recorded_at,'recordedBy',p.actor_user_id,'isCurrent',current_proof,
    'isValid',current_proof AND p.verified_at<=clock_timestamp() AND p.expires_at>clock_timestamp());
END;
$$;
REVOKE ALL ON FUNCTION public.tm_read_domain_dns_proof(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tm_read_domain_dns_proof(uuid,uuid) TO authenticated;
COMMIT;
