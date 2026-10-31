-- LOCAL PROPOSAL. Requires 048; no application role or endpoint granted.
BEGIN;
-- Cursor serialization is millisecond-precise: reject precision loss instead of skipping rows.
ALTER TABLE public.tm_medical_evolutions ADD CONSTRAINT tm_medical_evolution_millisecond_precision CHECK(recorded_at=date_trunc('milliseconds',recorded_at));
CREATE FUNCTION public.tm_list_medical_evolutions(p_actor uuid,p_clinic uuid,p_patient uuid,p_before_recorded_at timestamptz DEFAULT NULL,p_before_id uuid DEFAULT NULL,p_limit integer DEFAULT 100)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 PERFORM public.tm_require_medical_evolution_access(p_actor,p_clinic,p_patient,'read');
 IF p_limit IS NULL OR p_limit<1 OR p_limit>100 OR (p_before_recorded_at IS NULL)<>(p_before_id IS NULL) OR (p_before_recorded_at IS NOT NULL AND (NOT isfinite(p_before_recorded_at) OR p_before_recorded_at<>date_trunc('milliseconds',p_before_recorded_at))) THEN RAISE EXCEPTION 'Invalid page' USING ERRCODE='22023'; END IF;
 WITH candidates AS MATERIALIZED (
  SELECT * FROM public.tm_medical_evolutions e WHERE e.clinic_id=p_clinic AND e.patient_id=p_patient AND (p_before_id IS NULL OR (e.recorded_at,e.id)<(p_before_recorded_at,p_before_id)) ORDER BY e.recorded_at DESC,e.id DESC LIMIT p_limit+1
 ), page AS MATERIALIZED (SELECT * FROM candidates ORDER BY recorded_at DESC,id DESC LIMIT p_limit), audited AS (
  INSERT INTO public.tm_medical_evolution_audit(clinic_id,patient_id,record_id,actor_user_id,action) SELECT clinic_id,patient_id,id,p_actor,'read' FROM page RETURNING record_id
 )
 SELECT jsonb_build_object('items',coalesce((SELECT jsonb_agg(public.tm_medical_evolution_json(page) ORDER BY recorded_at DESC,id DESC) FROM page),'[]'::jsonb),
 'nextCursor',CASE WHEN (SELECT count(*) FROM candidates)>p_limit THEN (SELECT jsonb_build_object('recordedAt',to_char(recorded_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'id',id) FROM page ORDER BY recorded_at,id LIMIT 1) ELSE NULL END) INTO result;
 RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.tm_list_medical_evolutions(uuid,uuid,uuid,timestamptz,uuid,integer) FROM PUBLIC,anon,authenticated;
DO $$
DECLARE granted record;
BEGIN
 FOR granted IN SELECT DISTINCT a.grantee,r.rolname FROM pg_catalog.pg_proc p CROSS JOIN LATERAL pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a LEFT JOIN pg_catalog.pg_roles r ON r.oid=a.grantee WHERE p.oid='public.tm_list_medical_evolutions(uuid,uuid,uuid,timestamptz,uuid,integer)'::regprocedure AND a.grantee<>p.proowner LOOP
  IF granted.grantee=0 THEN REVOKE ALL ON FUNCTION public.tm_list_medical_evolutions(uuid,uuid,uuid,timestamptz,uuid,integer) FROM PUBLIC;
  ELSE EXECUTE pg_catalog.format('REVOKE ALL ON FUNCTION public.tm_list_medical_evolutions(uuid,uuid,uuid,timestamptz,uuid,integer) FROM %I',granted.rolname); END IF;
 END LOOP;
END; $$;
COMMIT;
