-- LOCAL proposal 026: minimal own-patient host lookup; no DML or public registry access.
BEGIN;
CREATE FUNCTION public.tm_resolve_patient_journey_host(p_hostname text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE instant timestamptz:=clock_timestamp(); result jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Session required' USING ERRCODE='42501'; END IF;
 IF p_hostname IS NULL OR char_length(p_hostname)>253 OR p_hostname<>lower(p_hostname)
   OR p_hostname !~ '^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$' THEN
  RAISE EXCEPTION 'Invalid hostname' USING ERRCODE='22023';
 END IF;
 SELECT jsonb_build_object('hostname',d.hostname,'clinicId',d.clinic_id,'environment',d.environment,'status',d.status) INTO result
 FROM public.tm_clinic_domains d
 JOIN public.tm_clinics clinic ON clinic.id=d.clinic_id AND clinic.is_active
 JOIN public.tm_domain_activations a ON a.domain_id=d.id AND a.activated_revision=d.revision
 JOIN public.tm_domain_routing_challenges r ON r.id=a.challenge_id AND r.domain_id=d.id AND r.domain_revision=a.source_revision
 JOIN public.tm_domain_routing_receipts saved ON saved.challenge_id=r.id
 JOIN public.tm_domain_challenges c ON c.id=r.dns_challenge_id AND c.domain_id=d.id AND c.domain_revision=a.source_revision
 JOIN public.tm_domain_dns_proofs p ON p.challenge_id=c.id AND p.domain_id=d.id AND p.domain_revision=a.source_revision
 JOIN public.tm_domain_routing_keys k ON k.project_id=r.project_id AND k.key_id=r.key_id AND k.public_key_digest=r.public_key_digest
 WHERE d.hostname=p_hostname AND d.environment='patient_pwa' AND d.status='active'
   AND a.activated_at<=instant AND a.valid_until>instant
   AND r.revoked_at IS NULL AND r.consumed_at IS NOT NULL AND r.created_at<=instant AND r.expires_at>instant
   AND r.challenge->>'hostname'=d.hostname AND r.challenge->>'environment'=d.environment
   AND (r.challenge->>'clinicId')::uuid=d.clinic_id
   AND c.revoked_at IS NULL AND c.consumed_at IS NOT NULL AND c.expires_at>instant
   AND p.verified_at<=instant AND p.expires_at>instant AND p.proof_digest=r.challenge->>'dnsProofDigest'
   AND k.is_active AND k.revoked_at IS NULL AND k.not_before<=r.created_at AND k.not_after>=r.expires_at
   AND k.not_before<=instant AND k.not_after>instant
   AND (SELECT count(*) FROM public.tm_memberships m WHERE m.user_id=auth.uid() AND m.clinic_id=d.clinic_id AND m.is_active)=1
   AND EXISTS(SELECT 1 FROM public.tm_memberships m
     JOIN public.tm_patients patient ON patient.id=m.patient_id AND patient.clinic_id=m.clinic_id AND patient.user_id=m.user_id AND patient.is_active
     JOIN public.tm_membership_grants g ON g.membership_id=m.id
     WHERE m.clinic_id=d.clinic_id AND m.user_id=auth.uid() AND m.is_active AND m.role='paciente'
       AND g.resource IN ('journey_goals','journey_events','journey_shields') AND g.action='read');
 RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.tm_resolve_patient_journey_host(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tm_resolve_patient_journey_host(text) TO authenticated;
COMMIT;
