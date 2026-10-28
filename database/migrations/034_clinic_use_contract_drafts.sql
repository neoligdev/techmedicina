-- LOCAL proposal 034: clinic use contract drafts only. No acceptance, billing or entitlements.
BEGIN;
CREATE TABLE public.tm_clinic_contract_drafts(
 id uuid PRIMARY KEY,clinic_id uuid NOT NULL REFERENCES public.tm_clinics(id),document jsonb NOT NULL,revision integer NOT NULL CHECK(revision>0),
 created_by uuid NOT NULL,updated_by uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.tm_clinic_contract_draft_versions(
 draft_id uuid NOT NULL REFERENCES public.tm_clinic_contract_drafts(id),revision integer NOT NULL CHECK(revision>0),
 document jsonb NOT NULL,actor_user_id uuid NOT NULL,occurred_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(draft_id,revision)
);
ALTER TABLE public.tm_clinic_contract_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tm_clinic_contract_draft_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tm_clinic_contract_drafts,public.tm_clinic_contract_draft_versions FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.tm_get_clinic_contract_draft(p_draft_id uuid,p_clinic_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item public.tm_clinic_contract_drafts%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.tm_platform_operators WHERE user_id=auth.uid() AND role='super_admin' AND is_active FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 IF p_draft_id IS NULL OR p_clinic_id IS NULL THEN RAISE EXCEPTION 'Invalid draft' USING ERRCODE='22023'; END IF;
 SELECT * INTO item FROM public.tm_clinic_contract_drafts WHERE id=p_draft_id AND clinic_id=p_clinic_id;
 IF NOT FOUND THEN RETURN NULL; END IF;
 RETURN jsonb_build_object('id',item.id,'clinicId',item.clinic_id,'status','draft','document',item.document,'revision',item.revision,'createdAt',item.created_at,'updatedAt',item.updated_at);
END; $$;
CREATE FUNCTION public.tm_save_clinic_contract_draft(p_draft_id uuid,p_clinic_id uuid,p_expected_revision integer,p_document jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item public.tm_clinic_contract_drafts%ROWTYPE; field text; stamp timestamptz;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.tm_platform_operators WHERE user_id=auth.uid() AND role='super_admin' AND is_active FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 IF p_draft_id IS NULL OR p_clinic_id IS NULL OR p_expected_revision IS NULL OR p_expected_revision<0 OR p_expected_revision>2147483646
 OR p_document IS NULL OR jsonb_typeof(p_document)<>'object' THEN RAISE EXCEPTION 'Invalid draft' USING ERRCODE='22023'; END IF;
 IF NOT (p_document ?& ARRAY['title','currency','setupCents','monthlyEnabled','monthlyCents','livesEnabled','livesCount','holderCents','dependentCents','notes'])
 OR (p_document-ARRAY['title','currency','setupCents','monthlyEnabled','monthlyCents','livesEnabled','livesCount','holderCents','dependentCents','notes'])<>'{}'::jsonb THEN RAISE EXCEPTION 'Invalid fields' USING ERRCODE='22023'; END IF;
 IF jsonb_typeof(p_document->'title')<>'string' OR char_length(p_document->>'title')>160 OR char_length(btrim(p_document->>'title',E' \t\r\n'))=0
 OR jsonb_typeof(p_document->'currency')<>'string' OR p_document->>'currency'<>'BRL' OR jsonb_typeof(p_document->'notes')<>'string' OR char_length(p_document->>'notes')>4000 THEN RAISE EXCEPTION 'Invalid document' USING ERRCODE='22023'; END IF;
 FOREACH field IN ARRAY ARRAY['setupCents','monthlyCents','holderCents','dependentCents','livesCount'] LOOP
  IF jsonb_typeof(p_document->field)<>'null' THEN
   IF jsonb_typeof(p_document->field)<>'number' OR (p_document->>field)!~'^[0-9]+$' THEN RAISE EXCEPTION 'Invalid number' USING ERRCODE='22023'; END IF;
   IF (p_document->>field)::numeric>(CASE WHEN field='livesCount' THEN 2147483647 ELSE 999999999999 END) THEN RAISE EXCEPTION 'Number exceeds limit' USING ERRCODE='22023'; END IF;
  END IF;
 END LOOP;
 FOREACH field IN ARRAY ARRAY['monthlyEnabled','livesEnabled'] LOOP
  IF jsonb_typeof(p_document->field) NOT IN ('boolean','null') THEN RAISE EXCEPTION 'Invalid choice' USING ERRCODE='22023'; END IF;
 END LOOP;
 PERFORM 1 FROM public.tm_clinics WHERE id=p_clinic_id FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Unknown clinic' USING ERRCODE='22023'; END IF;
 -- Serialize create/update/retry for the same UUID without granting table access.
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_draft_id::text,0));
 stamp:=clock_timestamp();
 SELECT * INTO item FROM public.tm_clinic_contract_drafts WHERE id=p_draft_id FOR UPDATE;
 IF FOUND THEN
  IF item.clinic_id<>p_clinic_id THEN RAISE EXCEPTION 'Wrong clinic' USING ERRCODE='42501'; END IF;
  IF p_expected_revision=0 AND item.revision=1 AND item.created_by=auth.uid() AND item.document=p_document THEN
   RETURN public.tm_get_clinic_contract_draft(item.id,item.clinic_id); END IF;
  IF p_expected_revision<>item.revision THEN RAISE EXCEPTION 'Revision conflict' USING ERRCODE='40001'; END IF;
  IF item.document=p_document THEN RETURN public.tm_get_clinic_contract_draft(item.id,item.clinic_id); END IF;
  UPDATE public.tm_clinic_contract_drafts SET document=p_document,revision=revision+1,updated_by=auth.uid(),updated_at=GREATEST(updated_at,stamp) WHERE id=p_draft_id RETURNING * INTO item;
 ELSE
  IF p_expected_revision<>0 THEN RAISE EXCEPTION 'Revision conflict' USING ERRCODE='40001'; END IF;
  INSERT INTO public.tm_clinic_contract_drafts(id,clinic_id,document,revision,created_by,updated_by,created_at,updated_at) VALUES(p_draft_id,p_clinic_id,p_document,1,auth.uid(),auth.uid(),stamp,stamp) RETURNING * INTO item;
 END IF;
 INSERT INTO public.tm_clinic_contract_draft_versions(draft_id,revision,document,actor_user_id,occurred_at) VALUES(item.id,item.revision,item.document,auth.uid(),item.updated_at);
 RETURN public.tm_get_clinic_contract_draft(item.id,item.clinic_id);
END; $$;
REVOKE ALL ON FUNCTION public.tm_get_clinic_contract_draft(uuid,uuid),public.tm_save_clinic_contract_draft(uuid,uuid,integer,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tm_get_clinic_contract_draft(uuid,uuid),public.tm_save_clinic_contract_draft(uuid,uuid,integer,jsonb) TO authenticated;
COMMIT;
