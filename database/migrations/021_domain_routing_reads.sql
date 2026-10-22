-- RESERVED 021 by Codex, 22/10/2026. LOCAL proposal, not applied to Cloud.
-- Private worker reads only: no browser grants, proof writes, consumption or activation.
BEGIN;
CREATE FUNCTION public.tm_read_routing_challenge(p_actor uuid,p_domain uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE d public.tm_clinic_domains%ROWTYPE; result jsonb;
BEGIN
  PERFORM 1 FROM public.tm_platform_operators o WHERE o.user_id=p_actor AND o.is_active
    AND o.role='super_admin' FOR SHARE;
  IF p_actor IS NULL OR NOT FOUND THEN
    RAISE EXCEPTION 'Administrative access denied' USING ERRCODE='42501';
  END IF;
  IF p_domain IS NULL THEN RAISE EXCEPTION 'Invalid domain' USING ERRCODE='22023'; END IF;
  SELECT * INTO d FROM public.tm_clinic_domains WHERE id=p_domain FOR SHARE;
  IF NOT FOUND OR d.status<>'pending_verification' THEN RETURN NULL; END IF;
  SELECT jsonb_build_object('domain',to_jsonb(d),'challenge',r.challenge) INTO result
    FROM public.tm_domain_routing_challenges r
    JOIN public.tm_domain_challenges c ON c.id=r.dns_challenge_id AND c.domain_id=d.id
    JOIN public.tm_domain_dns_proofs p ON p.challenge_id=c.id AND p.domain_id=d.id
    JOIN public.tm_domain_routing_keys k ON k.project_id=r.project_id AND k.key_id=r.key_id
    WHERE r.domain_id=d.id AND r.domain_revision=d.revision
      AND r.challenge->>'hostname'=d.hostname AND r.challenge->>'environment'=d.environment
      AND (r.challenge->>'clinicId')::uuid=d.clinic_id
      AND r.revoked_at IS NULL AND r.consumed_at IS NULL
      AND r.created_at<=clock_timestamp() AND r.expires_at>clock_timestamp()
      AND c.domain_revision=d.revision AND c.revoked_at IS NULL AND c.consumed_at IS NOT NULL
      AND c.expires_at>clock_timestamp() AND p.domain_revision=d.revision
      AND p.verified_at<=clock_timestamp() AND p.expires_at>clock_timestamp()
      AND p.proof_digest=r.challenge->>'dnsProofDigest' AND r.expires_at<=p.expires_at
      AND k.is_active AND k.public_key_digest=r.public_key_digest
      AND k.not_before<=r.created_at AND k.not_after>=r.expires_at
      AND k.not_before<=clock_timestamp() AND k.not_after>clock_timestamp()
    FOR SHARE OF r,c,p,k;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.tm_read_routing_challenge(uuid,uuid) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.tm_read_routing_receipt(p_actor uuid,p_domain uuid,p_challenge uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE d public.tm_clinic_domains%ROWTYPE; r public.tm_domain_routing_challenges%ROWTYPE;
  saved public.tm_domain_routing_receipts%ROWTYPE; c public.tm_domain_challenges%ROWTYPE;
  p public.tm_domain_dns_proofs%ROWTYPE; k public.tm_domain_routing_keys%ROWTYPE;
  current_proof boolean; valid_proof boolean; instant timestamptz;
BEGIN
  PERFORM 1 FROM public.tm_platform_operators o WHERE o.user_id=p_actor AND o.is_active
    AND o.role='super_admin' FOR SHARE;
  IF p_actor IS NULL OR NOT FOUND THEN
    RAISE EXCEPTION 'Administrative access denied' USING ERRCODE='42501';
  END IF;
  IF p_domain IS NULL OR p_challenge IS NULL THEN
    RAISE EXCEPTION 'Invalid receipt request' USING ERRCODE='22023';
  END IF;
  SELECT * INTO d FROM public.tm_clinic_domains WHERE id=p_domain FOR SHARE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  -- Same order as writers after the domain lock: DNS, key, routing challenge.
  SELECT * INTO r FROM public.tm_domain_routing_challenges WHERE id=p_challenge AND domain_id=d.id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO c FROM public.tm_domain_challenges WHERE id=r.dns_challenge_id AND domain_id=d.id FOR SHARE;
  SELECT * INTO p FROM public.tm_domain_dns_proofs WHERE challenge_id=r.dns_challenge_id AND domain_id=d.id FOR SHARE;
  SELECT * INTO k FROM public.tm_domain_routing_keys WHERE project_id=r.project_id AND key_id=r.key_id FOR SHARE;
  SELECT * INTO r FROM public.tm_domain_routing_challenges WHERE id=p_challenge AND domain_id=d.id FOR SHARE;
  SELECT * INTO saved FROM public.tm_domain_routing_receipts WHERE challenge_id=r.id FOR SHARE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  instant:=clock_timestamp();
  current_proof:=coalesce(d.status='pending_verification' AND r.domain_revision=d.revision
    AND r.challenge->>'hostname'=d.hostname AND r.challenge->>'environment'=d.environment
    AND (r.challenge->>'clinicId')::uuid=d.clinic_id
    AND r.revoked_at IS NULL AND r.consumed_at IS NOT NULL
    AND c.revoked_at IS NULL AND c.consumed_at IS NOT NULL AND c.domain_revision=d.revision
    AND p.domain_revision=d.revision AND p.proof_digest=r.challenge->>'dnsProofDigest'
    AND k.public_key_digest=r.public_key_digest,false);
  valid_proof:=coalesce(current_proof AND k.is_active AND r.created_at>=k.not_before
    AND r.expires_at<=k.not_after AND k.not_before<=instant AND k.not_after>instant
    AND r.expires_at>instant AND c.expires_at>instant AND p.expires_at>instant
    AND p.verified_at<=instant AND (saved.receipt->>'routingVerifiedAt')::timestamptz<=instant,false);
  RETURN jsonb_build_object('receipt',saved.receipt,'recordedAt',saved.recorded_at,
    'recordedBy',saved.recorded_by,'isCurrent',current_proof,'isValid',valid_proof);
END;
$$;
REVOKE ALL ON FUNCTION public.tm_read_routing_receipt(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
COMMIT;
