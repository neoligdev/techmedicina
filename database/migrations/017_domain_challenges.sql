-- Local proposal only: audited challenge issuance/rotation, never domain activation.
BEGIN;
CREATE TABLE public.tm_domain_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid NOT NULL REFERENCES public.tm_clinic_domains(id),
  domain_revision integer NOT NULL CHECK (domain_revision > 0),
  token text NOT NULL UNIQUE CHECK (token ~ '^[a-f0-9]{64}$'),
  issued_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL CHECK (isfinite(expires_at) AND expires_at > created_at),
  revoked_at timestamptz CHECK (revoked_at >= created_at)
);
CREATE UNIQUE INDEX tm_domain_challenge_current ON public.tm_domain_challenges(domain_id)
  WHERE revoked_at IS NULL;
ALTER TABLE public.tm_domain_challenges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tm_domain_challenges FROM PUBLIC,anon,authenticated;
-- Tokens have no table SELECT grant, even for operators; issuance returns only the new one.
CREATE TABLE public.tm_domain_challenge_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid NOT NULL REFERENCES public.tm_clinic_domains(id),
  challenge_id uuid NOT NULL REFERENCES public.tm_domain_challenges(id),
  domain_revision integer NOT NULL CHECK (domain_revision>0),
  actor_user_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('challenge_issued','challenge_rotated')),
  occurred_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE public.tm_domain_challenge_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tm_domain_challenge_audit FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.tm_domain_challenge_audit TO authenticated;
CREATE POLICY tm_challenge_audit_operator_read ON public.tm_domain_challenge_audit
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.tm_platform_operators o
    WHERE o.user_id=(SELECT auth.uid()) AND o.is_active AND o.role='super_admin'));
-- Token and expiry must originate in reviewed server policy. No public HTTP handler is added.
CREATE FUNCTION public.tm_issue_domain_challenge(
  p_domain_id uuid,p_expected_revision integer,p_token text,p_expires_at timestamptz
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  domain_row public.tm_clinic_domains%ROWTYPE;
  saved public.tm_domain_challenges%ROWTYPE;
  had_previous boolean;
  issued_at timestamptz;
BEGIN
  -- Lock authorization before domain: revocation cannot race a protected write.
  PERFORM 1 FROM public.tm_platform_operators o
    WHERE o.user_id=auth.uid() AND o.is_active AND o.role='super_admin' FOR SHARE;
  IF auth.uid() IS NULL OR NOT FOUND THEN
    RAISE EXCEPTION 'Administrative access denied' USING ERRCODE='42501';
  END IF;
  IF p_domain_id IS NULL OR p_expected_revision IS NULL OR p_expected_revision<1
    OR p_token IS NULL OR p_token !~ '^[a-f0-9]{64}$' OR p_expires_at IS NULL
    OR NOT isfinite(p_expires_at) THEN
    RAISE EXCEPTION 'Invalid challenge input' USING ERRCODE='22023';
  END IF;
  SELECT * INTO domain_row FROM public.tm_clinic_domains WHERE id=p_domain_id FOR UPDATE;
  IF NOT FOUND OR domain_row.revision<>p_expected_revision
    OR domain_row.status<>'pending_verification' THEN
    RAISE EXCEPTION 'Domain challenge changed' USING ERRCODE='40001';
  END IF;
  -- DNS TXT prefix must fit. Reject IP literals, local and known preview suffixes.
  IF char_length('_plugpix-verification.'||domain_row.hostname)>253
    OR domain_row.hostname ~ '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$'
    OR domain_row.hostname ~ '(^|\.)(localhost|local|test|invalid|example)$'
    OR domain_row.hostname ~ '(^|\.)(lovable\.app|lovableproject\.com)$' THEN
    RAISE EXCEPTION 'Invalid verification hostname' USING ERRCODE='22023';
  END IF;
  issued_at := clock_timestamp();
  IF p_expires_at<=issued_at THEN
    RAISE EXCEPTION 'Challenge expiry must be future' USING ERRCODE='22023';
  END IF;
  UPDATE public.tm_domain_challenges SET revoked_at=issued_at
    WHERE domain_id=domain_row.id AND revoked_at IS NULL;
  had_previous := FOUND;
  UPDATE public.tm_clinic_domains SET revision=revision+1 WHERE id=domain_row.id
    RETURNING * INTO domain_row;
  INSERT INTO public.tm_domain_challenges(domain_id,domain_revision,token,issued_by,created_at,expires_at)
    VALUES(domain_row.id,domain_row.revision,p_token,auth.uid(),issued_at,p_expires_at)
    RETURNING * INTO saved;
  INSERT INTO public.tm_domain_challenge_audit(domain_id,actor_user_id,action,challenge_id,domain_revision)
    VALUES(domain_row.id,auth.uid(),CASE WHEN had_previous THEN 'challenge_rotated' ELSE 'challenge_issued' END,
      saved.id,domain_row.revision);
  RETURN jsonb_build_object('id',saved.id,'domainId',domain_row.id,'clinicId',domain_row.clinic_id,
    'hostname',domain_row.hostname,'environment',domain_row.environment,'revision',domain_row.revision,
    'token',saved.token,'createdAt',saved.created_at,'expiresAt',saved.expires_at);
END;
$$;
REVOKE ALL ON FUNCTION public.tm_issue_domain_challenge(uuid,integer,text,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tm_issue_domain_challenge(uuid,integer,text,timestamptz) TO authenticated;
COMMIT;
