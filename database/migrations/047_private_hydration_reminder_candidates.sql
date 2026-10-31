-- LOCAL PROPOSAL ONLY. No worker role, scheduler or application grant.
BEGIN;
CREATE FUNCTION public.tm_list_hydration_reminder_candidates(p_after text DEFAULT NULL,p_limit integer DEFAULT 100)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE after_clinic uuid; after_patient uuid; result jsonb;
BEGIN
 IF p_limit IS NULL OR p_limit<1 OR p_limit>100 THEN RAISE EXCEPTION 'Invalid page size' USING ERRCODE='22023'; END IF;
 IF p_after IS NOT NULL THEN
  IF p_after !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN RAISE EXCEPTION 'Invalid cursor' USING ERRCODE='22023'; END IF;
  after_clinic:=split_part(p_after,':',1)::uuid;after_patient:=split_part(p_after,':',2)::uuid;
 END IF;
 WITH candidates AS MATERIALIZED (
  SELECT f.clinic_id,f.patient_id,f.revision,f.settings
  FROM public.tm_hydration_preferences f
  JOIN public.tm_clinics c ON c.id=f.clinic_id AND c.is_active
  JOIN public.tm_patients p ON p.id=f.patient_id AND p.clinic_id=f.clinic_id AND p.user_id=f.patient_user_id AND p.is_active
  JOIN public.tm_memberships m ON m.clinic_id=f.clinic_id AND m.patient_id=f.patient_id AND m.user_id=f.patient_user_id AND m.role='paciente' AND m.is_active
  JOIN public.tm_membership_grants g ON g.membership_id=m.id AND g.resource='hydration_records' AND g.action='read'
  WHERE f.settings->>'remindersEnabled'='true'
   AND (p_after IS NULL OR (f.clinic_id,f.patient_id)>(after_clinic,after_patient))
   AND (SELECT count(*) FROM public.tm_memberships x WHERE x.clinic_id=f.clinic_id AND x.user_id=f.patient_user_id AND x.is_active)=1
  ORDER BY f.clinic_id,f.patient_id LIMIT p_limit+1
 ), page AS MATERIALIZED (SELECT * FROM candidates ORDER BY clinic_id,patient_id LIMIT p_limit)
 SELECT jsonb_build_object('items',coalesce((SELECT jsonb_agg(jsonb_build_object('clinicId',clinic_id,'patientId',patient_id,'revision',revision,'settings',settings) ORDER BY clinic_id,patient_id) FROM page),'[]'::jsonb),
 'nextCursor',CASE WHEN (SELECT count(*) FROM candidates)>p_limit THEN (SELECT clinic_id::text||':'||patient_id::text FROM page ORDER BY clinic_id DESC,patient_id DESC LIMIT 1) ELSE NULL END) INTO result;
 RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.tm_list_hydration_reminder_candidates(text,integer) FROM PUBLIC,anon,authenticated;
-- Remove inherited default function ACLs for this object, without changing defaults.
DO $$
DECLARE granted record;
BEGIN
 FOR granted IN SELECT DISTINCT a.grantee,r.rolname FROM pg_catalog.pg_proc p CROSS JOIN LATERAL pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a LEFT JOIN pg_catalog.pg_roles r ON r.oid=a.grantee WHERE p.oid='public.tm_list_hydration_reminder_candidates(text,integer)'::regprocedure AND a.grantee<>p.proowner LOOP
  IF granted.grantee=0 THEN REVOKE ALL ON FUNCTION public.tm_list_hydration_reminder_candidates(text,integer) FROM PUBLIC;
  ELSE EXECUTE pg_catalog.format('REVOKE ALL ON FUNCTION public.tm_list_hydration_reminder_candidates(text,integer) FROM %I',granted.rolname); END IF;
 END LOOP;
END; $$;
COMMIT;
