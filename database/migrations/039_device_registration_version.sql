-- LOCAL proposal 039: declared device snapshot only; no hardware authorization or restoration.
BEGIN;
CREATE FUNCTION public.tm_get_device_registration_draft_version(p_draft_id uuid,p_revision integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item public.tm_device_registration_draft_versions%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.tm_platform_operators WHERE user_id=auth.uid() AND role='super_admin' AND is_active FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 IF p_draft_id IS NULL OR p_revision IS NULL OR p_revision<1 THEN RAISE EXCEPTION 'Invalid version' USING ERRCODE='22023'; END IF;
 SELECT * INTO item FROM public.tm_device_registration_draft_versions WHERE draft_id=p_draft_id AND revision=p_revision;
 IF NOT FOUND THEN RETURN NULL; END IF;
 RETURN jsonb_build_object('integrationAuthorized',false,'draftId',item.draft_id,'revision',item.revision,'document',item.document,'occurredAt',item.occurred_at);
END; $$;
REVOKE ALL ON FUNCTION public.tm_get_device_registration_draft_version(uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tm_get_device_registration_draft_version(uuid,integer) TO authenticated;
COMMIT;
