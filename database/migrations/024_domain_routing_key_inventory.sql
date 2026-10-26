-- LOCAL proposal 024: private project-scoped key metadata inventory. No provisioning.
BEGIN;
CREATE INDEX tm_routing_key_audit_page ON public.tm_domain_routing_key_audit(project_id,key_id,occurred_at DESC,id DESC);
CREATE FUNCTION public.tm_list_routing_keys(p_actor uuid,p_project uuid,p_after text DEFAULT NULL,p_limit integer DEFAULT 25)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
  PERFORM 1 FROM public.tm_platform_operators WHERE user_id=p_actor AND is_active AND role='super_admin';
  IF p_actor IS NULL OR NOT FOUND THEN RAISE EXCEPTION 'Administrative access denied' USING ERRCODE='42501'; END IF;
  IF p_project IS NULL OR p_limit IS NULL OR p_limit<1 OR p_limit>100 OR
    (p_after IS NOT NULL AND p_after !~ '^[a-zA-Z0-9_-]{1,64}$') THEN
    RAISE EXCEPTION 'Invalid key inventory request' USING ERRCODE='22023';
  END IF;
  SELECT coalesce(jsonb_agg(entry ORDER BY key_id COLLATE "C"),'[]'::jsonb) INTO result FROM (
    SELECT k.key_id,jsonb_build_object('keyId',k.key_id,'revision',k.revision,
      'publicKeyDigest',k.public_key_digest,'isActive',k.is_active,
      'notBefore',k.not_before,'notAfter',k.not_after,'revokedAt',k.revoked_at,'revokedBy',k.revoked_by) AS entry
    FROM public.tm_domain_routing_keys k WHERE k.project_id=p_project
      AND (p_after IS NULL OR k.key_id COLLATE "C">p_after COLLATE "C")
    ORDER BY k.key_id COLLATE "C" LIMIT p_limit
  ) page;
  RETURN jsonb_build_object('projectId',p_project,'keys',result);
END;
$$;
REVOKE ALL ON FUNCTION public.tm_list_routing_keys(uuid,uuid,text,integer) FROM PUBLIC,anon,authenticated;
COMMIT;
