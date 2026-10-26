-- LOCAL proposal 023: private key audit reader. No browser grants or remote application.
BEGIN;
CREATE FUNCTION public.tm_read_routing_key_audit(p_actor uuid,p_project uuid,p_key text,p_before uuid DEFAULT NULL,p_limit integer DEFAULT 25)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE boundary public.tm_domain_routing_key_audit%ROWTYPE; result jsonb;
BEGIN
  PERFORM 1 FROM public.tm_platform_operators WHERE user_id=p_actor AND is_active AND role='super_admin';
  IF p_actor IS NULL OR NOT FOUND THEN
    RAISE EXCEPTION 'Administrative access denied' USING ERRCODE='42501';
  END IF;
  IF p_project IS NULL OR p_key IS NULL OR p_key !~ '^[a-zA-Z0-9_-]{1,64}$'
    OR p_limit IS NULL OR p_limit<1 OR p_limit>100 THEN
    RAISE EXCEPTION 'Invalid audit request' USING ERRCODE='22023';
  END IF;
  IF p_before IS NOT NULL THEN
    SELECT * INTO boundary FROM public.tm_domain_routing_key_audit
      WHERE id=p_before AND project_id=p_project AND key_id=p_key;
    IF NOT FOUND THEN RAISE EXCEPTION 'Invalid audit cursor' USING ERRCODE='22023'; END IF;
  END IF;
  SELECT coalesce(jsonb_agg(entry ORDER BY occurred_at DESC,id DESC),'[]'::jsonb) INTO result FROM (
    SELECT a.id,a.occurred_at,jsonb_build_object(
      'id',a.id,'actorUserId',a.actor_user_id,'action',a.action,
      'previousRevision',a.previous_revision,'revision',a.revision,
      'wasActive',a.was_active,'publicKeyDigest',a.public_key_digest,'occurredAt',a.occurred_at) AS entry
    FROM public.tm_domain_routing_key_audit a
    WHERE a.project_id=p_project AND a.key_id=p_key
      AND (p_before IS NULL OR (a.occurred_at,a.id)<(boundary.occurred_at,boundary.id))
    ORDER BY a.occurred_at DESC,a.id DESC LIMIT p_limit
  ) page;
  RETURN jsonb_build_object('projectId',p_project,'keyId',p_key,'entries',result);
END;
$$;
REVOKE ALL ON FUNCTION public.tm_read_routing_key_audit(uuid,uuid,text,uuid,integer) FROM PUBLIC,anon,authenticated;
COMMIT;
