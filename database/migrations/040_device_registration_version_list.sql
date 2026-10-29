-- LOCAL proposal 040: device historical metadata only; no release, restoration or inventory.
BEGIN;
CREATE FUNCTION public.tm_list_device_registration_draft_versions(p_draft_id uuid,p_before integer DEFAULT NULL,p_limit integer DEFAULT 10)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item public.tm_device_registration_draft_versions%ROWTYPE; result jsonb:='[]'::jsonb; seen integer:=0; last_revision integer; next_cursor integer;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.tm_platform_operators WHERE user_id=auth.uid() AND role='super_admin' AND is_active FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 IF p_draft_id IS NULL OR p_limit IS NULL OR p_limit<1 OR p_limit>50 OR (p_before IS NOT NULL AND p_before<1) THEN RAISE EXCEPTION 'Invalid request' USING ERRCODE='22023'; END IF;
 IF p_before IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.tm_device_registration_draft_versions WHERE draft_id=p_draft_id AND revision=p_before) THEN RAISE EXCEPTION 'Invalid cursor' USING ERRCODE='22023'; END IF;
 FOR item IN SELECT * FROM public.tm_device_registration_draft_versions WHERE draft_id=p_draft_id AND (p_before IS NULL OR revision<p_before) ORDER BY revision DESC LIMIT p_limit+1 LOOP
  seen:=seen+1;IF seen>p_limit THEN next_cursor:=last_revision;EXIT;END IF;
  result:=result||jsonb_build_array(jsonb_build_object('revision',item.revision,'title',item.document->>'title','occurredAt',item.occurred_at));last_revision:=item.revision;
 END LOOP;
 RETURN jsonb_build_object('draftId',p_draft_id,'items',result,'nextCursor',next_cursor);
END; $$;
REVOKE ALL ON FUNCTION public.tm_list_device_registration_draft_versions(uuid,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tm_list_device_registration_draft_versions(uuid,integer,integer) TO authenticated;
COMMIT;
