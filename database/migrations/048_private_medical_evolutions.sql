-- LOCAL PROPOSAL. Ciphertext only; no app role/worker identity is provisioned.
BEGIN;
CREATE TABLE public.tm_medical_evolutions (
 id uuid PRIMARY KEY,
 clinic_id uuid NOT NULL REFERENCES public.tm_clinics(id),
 patient_id uuid NOT NULL REFERENCES public.tm_patients(id),
 author_user_id uuid NOT NULL,
 recorded_at timestamptz NOT NULL CHECK (isfinite(recorded_at)),
 supplements_id uuid REFERENCES public.tm_medical_evolutions(id),
 envelope jsonb NOT NULL CHECK (coalesce(jsonb_typeof(envelope)='object' AND envelope - ARRAY['version','alg','kid','iv','ciphertext']='{}'::jsonb AND envelope->'version'='1'::jsonb AND envelope->>'alg'='A256GCM' AND length(envelope->>'kid') BETWEEN 1 AND 256 AND envelope->>'iv' ~ '^[A-Za-z0-9+/]{16}$' AND envelope->>'ciphertext' ~ '^[A-Za-z0-9+/]+={0,2}$' AND length(envelope->>'ciphertext') BETWEEN 24 AND 349548,false)),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK (supplements_id IS NULL OR supplements_id<>id)
);
CREATE TABLE public.tm_medical_evolution_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),clinic_id uuid NOT NULL,patient_id uuid NOT NULL,record_id uuid NOT NULL REFERENCES public.tm_medical_evolutions(id),actor_user_id uuid NOT NULL,action text NOT NULL CHECK(action IN ('create','read','replay_lookup')),created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE public.tm_medical_evolution_audit ENABLE ROW LEVEL SECURITY;
CREATE INDEX tm_medical_evolutions_timeline ON public.tm_medical_evolutions(clinic_id,patient_id,recorded_at,id);
ALTER TABLE public.tm_medical_evolutions ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.tm_refuse_medical_evolution_change() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN RAISE EXCEPTION 'Medical evolutions are immutable' USING ERRCODE='55000'; END; $$;
CREATE TRIGGER tm_medical_evolution_immutable BEFORE UPDATE OR DELETE ON public.tm_medical_evolutions FOR EACH ROW EXECUTE FUNCTION public.tm_refuse_medical_evolution_change();
CREATE TRIGGER tm_medical_evolution_audit_immutable BEFORE UPDATE OR DELETE ON public.tm_medical_evolution_audit FOR EACH ROW EXECUTE FUNCTION public.tm_refuse_medical_evolution_change();
CREATE FUNCTION public.tm_require_medical_evolution_access(p_actor uuid,p_clinic uuid,p_patient uuid,p_action text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF p_actor IS NULL OR p_clinic IS NULL OR p_patient IS NULL OR p_action IS NULL OR p_action NOT IN ('read','create') THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.tm_memberships m
 JOIN public.tm_clinics c ON c.id=m.clinic_id AND c.is_active
 JOIN public.tm_patients p ON p.clinic_id=m.clinic_id AND p.id=p_patient AND p.is_active
 JOIN public.tm_membership_grants g ON g.membership_id=m.id AND g.resource='prontuario' AND g.action='read'
 WHERE m.user_id=p_actor AND m.clinic_id=p_clinic AND m.role='medico' AND m.is_active AND m.medical_identity_verified
 AND (p_action='read' OR EXISTS(SELECT 1 FROM public.tm_membership_grants w WHERE w.membership_id=m.id AND w.resource='prontuario' AND w.action='create'))
 FOR SHARE OF m,c,p,g;
 IF NOT FOUND THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 IF p_action='create' THEN
  PERFORM 1 FROM public.tm_membership_grants w JOIN public.tm_memberships m ON m.id=w.membership_id WHERE m.user_id=p_actor AND m.clinic_id=p_clinic AND w.resource='prontuario' AND w.action='create' FOR SHARE OF w;
  IF NOT FOUND THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 END IF;
END; $$;
CREATE FUNCTION public.tm_medical_evolution_json(p public.tm_medical_evolutions) RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT jsonb_build_object('id',p.id,'clinicId',p.clinic_id,'patientId',p.patient_id,'authorUserId',p.author_user_id,'recordedAt',to_char(p.recorded_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'supplementsId',p.supplements_id,'envelope',p.envelope);
$$;
CREATE FUNCTION public.tm_append_medical_evolution(p_actor uuid,p_record jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item public.tm_medical_evolutions%ROWTYPE; target public.tm_medical_evolutions%ROWTYPE; c uuid; p uuid; i uuid; supplement uuid; inserted boolean;
BEGIN
 c:=(p_record->>'clinicId')::uuid;p:=(p_record->>'patientId')::uuid;i:=(p_record->>'id')::uuid;supplement:=(p_record->>'supplementsId')::uuid;
 PERFORM public.tm_require_medical_evolution_access(p_actor,c,p,'create');
 IF (p_record->>'authorUserId')::uuid IS DISTINCT FROM p_actor THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 IF supplement IS NOT NULL THEN
  SELECT * INTO target FROM public.tm_medical_evolutions WHERE id=supplement AND clinic_id=c AND patient_id=p;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown original evolution' USING ERRCODE='22023'; END IF;
 END IF;
 INSERT INTO public.tm_medical_evolutions(id,clinic_id,patient_id,author_user_id,recorded_at,supplements_id,envelope)
 VALUES(i,c,p,p_actor,(p_record->>'recordedAt')::timestamptz,supplement,p_record->'envelope') ON CONFLICT(id) DO NOTHING RETURNING * INTO item;
 inserted:=FOUND;
 IF NOT inserted THEN
  SELECT * INTO item FROM public.tm_medical_evolutions WHERE id=i AND clinic_id=c AND patient_id=p AND author_user_id=p_actor;
  IF NOT FOUND THEN RAISE EXCEPTION 'Medical record conflict' USING ERRCODE='40001'; END IF;
 END IF;
 INSERT INTO public.tm_medical_evolution_audit(clinic_id,patient_id,record_id,actor_user_id,action) VALUES(c,p,i,p_actor,CASE WHEN inserted THEN 'create' ELSE 'replay_lookup' END);
 RETURN public.tm_medical_evolution_json(item);
END; $$;
CREATE FUNCTION public.tm_get_medical_evolution(p_actor uuid,p_clinic uuid,p_patient uuid,p_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item public.tm_medical_evolutions%ROWTYPE;
BEGIN
 PERFORM public.tm_require_medical_evolution_access(p_actor,p_clinic,p_patient,'read');
 SELECT * INTO item FROM public.tm_medical_evolutions WHERE id=p_id AND clinic_id=p_clinic AND patient_id=p_patient;
 IF NOT FOUND THEN RETURN NULL; END IF;
 INSERT INTO public.tm_medical_evolution_audit(clinic_id,patient_id,record_id,actor_user_id,action) VALUES(p_clinic,p_patient,p_id,p_actor,'read');
 RETURN public.tm_medical_evolution_json(item);
END; $$;
REVOKE ALL ON public.tm_medical_evolutions,public.tm_medical_evolution_audit FROM PUBLIC,anon,authenticated;
-- These new objects remain owner-only, including any inherited default ACL grants.
DO $$
DECLARE obj record; granted record;
BEGIN
 PERFORM pg_catalog.set_config('search_path','',true);
 FOR obj IN SELECT p.oid,p.oid::regprocedure::text AS signature,p.proowner FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('tm_refuse_medical_evolution_change','tm_require_medical_evolution_access','tm_medical_evolution_json','tm_append_medical_evolution','tm_get_medical_evolution') LOOP
  FOR granted IN SELECT DISTINCT a.grantee,r.rolname FROM aclexplode(coalesce((SELECT proacl FROM pg_proc WHERE oid=obj.oid),acldefault('f',obj.proowner))) a LEFT JOIN pg_roles r ON r.oid=a.grantee WHERE a.grantee<>obj.proowner LOOP
   IF granted.grantee=0 THEN EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC',obj.signature); ELSE EXECUTE format('REVOKE ALL ON FUNCTION %s FROM %I',obj.signature,granted.rolname); END IF;
  END LOOP;
 END LOOP;
 FOR granted IN SELECT DISTINCT a.grantee,r.rolname FROM pg_class c CROSS JOIN LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a LEFT JOIN pg_roles r ON r.oid=a.grantee WHERE c.oid IN ('public.tm_medical_evolutions'::regclass,'public.tm_medical_evolution_audit'::regclass) AND a.grantee<>c.relowner LOOP
  IF granted.grantee=0 THEN REVOKE ALL ON public.tm_medical_evolutions,public.tm_medical_evolution_audit FROM PUBLIC; ELSE EXECUTE format('REVOKE ALL ON public.tm_medical_evolutions,public.tm_medical_evolution_audit FROM %I',granted.rolname); END IF;
 END LOOP;
END; $$;
COMMIT;
