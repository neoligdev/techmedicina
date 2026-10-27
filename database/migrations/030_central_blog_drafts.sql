-- LOCAL proposal 030: central plain-text drafts only. No publishing or clinic/patient access.
BEGIN;
CREATE TABLE public.tm_blog_drafts(
 id uuid PRIMARY KEY,document jsonb NOT NULL,revision integer NOT NULL CHECK(revision>0),
 created_by uuid NOT NULL,updated_by uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.tm_blog_draft_versions(
 draft_id uuid NOT NULL REFERENCES public.tm_blog_drafts(id),revision integer NOT NULL CHECK(revision>0),
 document jsonb NOT NULL,actor_user_id uuid NOT NULL,occurred_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(draft_id,revision)
);
ALTER TABLE public.tm_blog_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tm_blog_draft_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tm_blog_drafts,public.tm_blog_draft_versions FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.tm_get_blog_draft(p_draft_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item public.tm_blog_drafts%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.tm_platform_operators WHERE user_id=auth.uid() AND role='super_admin' AND is_active FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 IF p_draft_id IS NULL THEN RAISE EXCEPTION 'Invalid draft' USING ERRCODE='22023'; END IF;
 SELECT * INTO item FROM public.tm_blog_drafts WHERE id=p_draft_id;
 IF NOT FOUND THEN RETURN NULL; END IF;
 RETURN jsonb_build_object('id',item.id,'status','draft','document',item.document,'revision',item.revision,'createdAt',item.created_at,'updatedAt',item.updated_at);
END; $$;
CREATE FUNCTION public.tm_save_blog_draft(p_draft_id uuid,p_expected_revision integer,p_document jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item public.tm_blog_drafts%ROWTYPE; field text; max_length integer; stamp timestamptz;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.tm_platform_operators WHERE user_id=auth.uid() AND role='super_admin' AND is_active FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 IF p_draft_id IS NULL OR p_expected_revision IS NULL OR p_expected_revision<0 OR p_expected_revision>2147483646
 OR p_document IS NULL OR jsonb_typeof(p_document)<>'object' THEN RAISE EXCEPTION 'Invalid draft' USING ERRCODE='22023'; END IF;
 IF NOT (p_document ?& ARRAY['title','summary','body','category','authorName','references','license'])
 OR (p_document-ARRAY['title','summary','body','category','authorName','references','license'])<>'{}'::jsonb THEN RAISE EXCEPTION 'Invalid fields' USING ERRCODE='22023'; END IF;
 FOREACH field IN ARRAY ARRAY['title','summary','body','category','authorName','references','license'] LOOP
  max_length:=CASE field WHEN 'title' THEN 160 WHEN 'summary' THEN 1200 WHEN 'body' THEN 20000 WHEN 'category' THEN 80 WHEN 'authorName' THEN 200 WHEN 'references' THEN 4000 ELSE 400 END;
  IF jsonb_typeof(p_document->field)<>'string' OR char_length(p_document->>field)>max_length THEN RAISE EXCEPTION 'Invalid text' USING ERRCODE='22023'; END IF;
 END LOOP;
 IF char_length(btrim(p_document->>'title',E' \t\r\n'))=0 THEN RAISE EXCEPTION 'Title required' USING ERRCODE='22023'; END IF;
 -- Serialize create/update/retry for the same UUID without granting table access.
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_draft_id::text,0));
 stamp:=clock_timestamp();
 SELECT * INTO item FROM public.tm_blog_drafts WHERE id=p_draft_id FOR UPDATE;
 IF FOUND THEN
  IF p_expected_revision=0 AND item.revision=1 AND item.created_by=auth.uid() AND item.document=p_document THEN
   RETURN public.tm_get_blog_draft(item.id); END IF;
  IF p_expected_revision<>item.revision THEN RAISE EXCEPTION 'Revision conflict' USING ERRCODE='40001'; END IF;
  IF item.document=p_document THEN RETURN public.tm_get_blog_draft(item.id); END IF;
  UPDATE public.tm_blog_drafts SET document=p_document,revision=revision+1,updated_by=auth.uid(),updated_at=GREATEST(updated_at,stamp) WHERE id=p_draft_id RETURNING * INTO item;
 ELSE
  IF p_expected_revision<>0 THEN RAISE EXCEPTION 'Revision conflict' USING ERRCODE='40001'; END IF;
  INSERT INTO public.tm_blog_drafts(id,document,revision,created_by,updated_by,created_at,updated_at) VALUES(p_draft_id,p_document,1,auth.uid(),auth.uid(),stamp,stamp) RETURNING * INTO item;
 END IF;
 INSERT INTO public.tm_blog_draft_versions(draft_id,revision,document,actor_user_id,occurred_at) VALUES(item.id,item.revision,item.document,auth.uid(),item.updated_at);
 RETURN public.tm_get_blog_draft(item.id);
END; $$;
REVOKE ALL ON FUNCTION public.tm_get_blog_draft(uuid),public.tm_save_blog_draft(uuid,integer,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tm_get_blog_draft(uuid),public.tm_save_blog_draft(uuid,integer,jsonb) TO authenticated;
COMMIT;
