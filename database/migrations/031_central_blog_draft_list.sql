-- LOCAL proposal 031: protected central draft metadata list, no publishing.
BEGIN;
CREATE FUNCTION public.tm_list_blog_drafts(p_query text DEFAULT '',p_after uuid DEFAULT NULL,p_limit integer DEFAULT 25)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item public.tm_blog_drafts%ROWTYPE; result jsonb:='[]'::jsonb; seen integer:=0; last_id uuid; next_cursor uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.tm_platform_operators WHERE user_id=auth.uid() AND role='super_admin' AND is_active FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 IF p_query IS NULL OR char_length(p_query)>160 OR p_limit IS NULL OR p_limit<1 OR p_limit>50 THEN RAISE EXCEPTION 'Invalid list request' USING ERRCODE='22023'; END IF;
 IF p_after IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.tm_blog_drafts WHERE id=p_after AND position(lower(p_query) in lower(document->>'title'))>0) THEN RAISE EXCEPTION 'Invalid cursor' USING ERRCODE='22023'; END IF;
 FOR item IN SELECT * FROM public.tm_blog_drafts WHERE (p_after IS NULL OR id>p_after)
 AND position(lower(p_query) in lower(document->>'title'))>0 ORDER BY id LIMIT p_limit+1 LOOP
  seen:=seen+1;IF seen>p_limit THEN next_cursor:=last_id;EXIT;END IF;
  result:=result||jsonb_build_array(jsonb_build_object('id',item.id,'status','draft','title',item.document->>'title','category',item.document->>'category','revision',item.revision,'updatedAt',item.updated_at));last_id:=item.id;
 END LOOP;
 RETURN jsonb_build_object('query',p_query,'items',result,'nextCursor',next_cursor);
END; $$;
REVOKE ALL ON FUNCTION public.tm_list_blog_drafts(text,uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tm_list_blog_drafts(text,uuid,integer) TO authenticated;
COMMIT;
