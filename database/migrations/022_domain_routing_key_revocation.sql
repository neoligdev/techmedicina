-- LOCAL proposal 022: private, audited key revocation; no provisioning/grants/activation.
BEGIN;
ALTER TABLE public.tm_domain_routing_keys
  ADD COLUMN revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
  ADD COLUMN revoked_at timestamptz CHECK(isfinite(revoked_at)),
  ADD COLUMN revoked_by uuid,
  ADD CONSTRAINT tm_routing_key_revocation_state CHECK(
    (revoked_at IS NULL AND revoked_by IS NULL) OR
    (NOT is_active AND revoked_at IS NOT NULL AND revoked_by IS NOT NULL));
CREATE TABLE public.tm_domain_routing_key_audit(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,key_id text NOT NULL,
  actor_user_id uuid NOT NULL,action text NOT NULL CHECK(action='routing_key_revoked'),
  previous_revision integer NOT NULL CHECK(previous_revision>0),
  revision integer NOT NULL CHECK(revision=previous_revision+1),
  was_active boolean NOT NULL,public_key_digest text NOT NULL CHECK(public_key_digest ~ '^[a-f0-9]{64}$'),
  occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY(project_id,key_id) REFERENCES public.tm_domain_routing_keys(project_id,key_id)
);
ALTER TABLE public.tm_domain_routing_key_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tm_domain_routing_key_audit FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.tm_revoke_routing_key(p_actor uuid,p_project uuid,p_key text,p_expected_revision integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE k public.tm_domain_routing_keys%ROWTYPE; prior_revision integer; prior_active boolean; changed boolean:=false;
BEGIN
  -- Never acquire domain/DNS locks after the key lock: existing proof writer order is preserved.
  PERFORM 1 FROM public.tm_platform_operators o WHERE o.user_id=p_actor AND o.is_active AND o.role='super_admin' FOR SHARE;
  IF p_actor IS NULL OR NOT FOUND THEN
    RAISE EXCEPTION 'Administrative access denied' USING ERRCODE='42501';
  END IF;
  IF p_project IS NULL OR p_key IS NULL OR p_key !~ '^[a-zA-Z0-9_-]{1,64}$'
    OR p_expected_revision IS NULL OR p_expected_revision<1 THEN
    RAISE EXCEPTION 'Invalid key revision' USING ERRCODE='22023';
  END IF;
  SELECT * INTO k FROM public.tm_domain_routing_keys WHERE project_id=p_project AND key_id=p_key FOR UPDATE;
  IF NOT FOUND OR k.revision<>p_expected_revision THEN
    RAISE EXCEPTION 'Routing key changed' USING ERRCODE='40001';
  END IF;
  IF k.revoked_at IS NULL THEN
    prior_revision:=k.revision;prior_active:=k.is_active;
    UPDATE public.tm_domain_routing_keys SET is_active=false,revision=revision+1,
      revoked_at=clock_timestamp(),revoked_by=p_actor
      WHERE project_id=p_project AND key_id=p_key RETURNING * INTO k;
    INSERT INTO public.tm_domain_routing_key_audit(project_id,key_id,actor_user_id,action,
      previous_revision,revision,was_active,public_key_digest)
      VALUES(p_project,p_key,p_actor,'routing_key_revoked',prior_revision,k.revision,prior_active,k.public_key_digest);
    changed:=true;
  END IF;
  RETURN jsonb_build_object('projectId',k.project_id,'keyId',k.key_id,'revision',k.revision,
    'isActive',k.is_active,'revokedAt',k.revoked_at,'revokedBy',k.revoked_by,'changed',changed);
END;
$$;
REVOKE ALL ON FUNCTION public.tm_revoke_routing_key(uuid,uuid,text,integer) FROM PUBLIC,anon,authenticated;
COMMIT;
