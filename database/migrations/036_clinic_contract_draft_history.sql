-- LOCAL proposal 036: historical contract drafts only, no acceptance or billing.
BEGIN;
CREATE FUNCTION public.tm_get_clinic_contract_draft_version(p_draft_id uuid,p_clinic_id uuid,p_revision integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item public.tm_clinic_contract_draft_versions%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.tm_platform_operators WHERE user_id=auth.uid() AND role='super_admin' AND is_active FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 IF p_draft_id IS NULL OR p_clinic_id IS NULL OR p_revision IS NULL OR p_revision<1 THEN RAISE EXCEPTION 'Invalid version' USING ERRCODE='22023'; END IF;
 SELECT * INTO item FROM public.tm_clinic_contract_draft_versions WHERE draft_id=p_draft_id AND revision=p_revision AND EXISTS(SELECT 1 FROM public.tm_clinic_contract_drafts d WHERE d.id=p_draft_id AND d.clinic_id=p_clinic_id);
 IF NOT FOUND THEN RETURN NULL; END IF;
 RETURN jsonb_build_object('draftId',item.draft_id,'clinicId',p_clinic_id,'revision',item.revision,'document',item.document,'occurredAt',item.occurred_at);
END; $$;
REVOKE ALL ON FUNCTION public.tm_get_clinic_contract_draft_version(uuid,uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tm_get_clinic_contract_draft_version(uuid,uuid,integer) TO authenticated;
CREATE FUNCTION public.tm_list_clinic_contract_draft_versions(p_draft_id uuid,p_clinic_id uuid,p_before integer DEFAULT NULL,p_limit integer DEFAULT 10)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item public.tm_clinic_contract_draft_versions%ROWTYPE; result jsonb:='[]'::jsonb; seen integer:=0; last_revision integer; next_cursor integer;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.tm_platform_operators WHERE user_id=auth.uid() AND role='super_admin' AND is_active FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 IF p_draft_id IS NULL OR p_clinic_id IS NULL OR p_limit IS NULL OR p_limit<1 OR p_limit>50 OR (p_before IS NOT NULL AND p_before<1) THEN RAISE EXCEPTION 'Invalid request' USING ERRCODE='22023'; END IF;
 IF p_before IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.tm_clinic_contract_draft_versions WHERE draft_id=p_draft_id AND revision=p_before AND EXISTS(SELECT 1 FROM public.tm_clinic_contract_drafts d WHERE d.id=p_draft_id AND d.clinic_id=p_clinic_id)) THEN RAISE EXCEPTION 'Invalid cursor' USING ERRCODE='22023'; END IF;
 FOR item IN SELECT * FROM public.tm_clinic_contract_draft_versions WHERE draft_id=p_draft_id AND EXISTS(SELECT 1 FROM public.tm_clinic_contract_drafts d WHERE d.id=p_draft_id AND d.clinic_id=p_clinic_id) AND (p_before IS NULL OR revision<p_before) ORDER BY revision DESC LIMIT p_limit+1 LOOP
  seen:=seen+1;IF seen>p_limit THEN next_cursor:=last_revision;EXIT;END IF;
  result:=result||jsonb_build_array(jsonb_build_object('revision',item.revision,'title',item.document->>'title','occurredAt',item.occurred_at));last_revision:=item.revision;
 END LOOP;
 RETURN jsonb_build_object('draftId',p_draft_id,'clinicId',p_clinic_id,'items',result,'nextCursor',next_cursor);
END; $$;
REVOKE ALL ON FUNCTION public.tm_list_clinic_contract_draft_versions(uuid,uuid,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tm_list_clinic_contract_draft_versions(uuid,uuid,integer,integer) TO authenticated;
COMMIT;
