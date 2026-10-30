-- LOCAL proposal 041: own-patient hydration, no memberships or grants are provisioned.
BEGIN;
ALTER TABLE public.tm_membership_grants DROP CONSTRAINT tm_membership_grants_resource_check;
ALTER TABLE public.tm_membership_grants ADD CONSTRAINT tm_membership_grants_resource_check CHECK(resource IN ('cadastro_clinica','prontuario','paciente','agenda','faturamento','journey_goals','journey_events','journey_shields','hydration_records'));
CREATE TABLE public.tm_hydration_records(
 id uuid PRIMARY KEY,clinic_id uuid NOT NULL,patient_id uuid NOT NULL,patient_user_id uuid NOT NULL,
 revision integer NOT NULL CHECK(revision>0),status text NOT NULL CHECK(status IN ('active','voided')),
 volume_ml bigint NOT NULL CHECK(volume_ml BETWEEN 0 AND 9007199254740991),occurred_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(patient_id,clinic_id,patient_user_id) REFERENCES public.tm_patients(id,clinic_id,user_id)
);
CREATE TABLE public.tm_hydration_receipts(
 record_id uuid NOT NULL REFERENCES public.tm_hydration_records(id),revision integer NOT NULL CHECK(revision>0),
 source_request_id uuid NOT NULL,command jsonb NOT NULL,snapshot jsonb NOT NULL,actor_user_id uuid NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(record_id,revision),UNIQUE(record_id,source_request_id)
);
ALTER TABLE public.tm_hydration_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tm_hydration_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tm_hydration_records,public.tm_hydration_receipts FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.tm_require_own_hydration_patient(p_clinic_id uuid,p_action text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE own_patient uuid;
BEGIN
 IF auth.uid() IS NULL OR p_clinic_id IS NULL OR p_action IS NULL OR p_action NOT IN ('read','create','write') THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 IF (SELECT count(*) FROM public.tm_memberships WHERE clinic_id=p_clinic_id AND user_id=auth.uid() AND is_active)<>1 THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 SELECT m.patient_id INTO own_patient FROM public.tm_memberships m
 JOIN public.tm_clinics c ON c.id=m.clinic_id AND c.is_active
 JOIN public.tm_patients p ON p.id=m.patient_id AND p.clinic_id=m.clinic_id AND p.user_id=m.user_id AND p.is_active
 JOIN public.tm_membership_grants g ON g.membership_id=m.id AND g.resource='hydration_records' AND g.action=p_action
 JOIN public.tm_membership_grants r ON r.membership_id=m.id AND r.resource='hydration_records' AND r.action='read'
 WHERE m.clinic_id=p_clinic_id AND m.user_id=auth.uid() AND m.role='paciente' AND m.is_active FOR SHARE OF m,c,p,g,r;
 IF NOT FOUND THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 RETURN own_patient;
END; $$;
REVOKE ALL ON FUNCTION public.tm_require_own_hydration_patient(uuid,text) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.tm_hydration_snapshot(p public.tm_hydration_records) RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT jsonb_build_object('id',p.id,'clinicId',p.clinic_id,'patientId',p.patient_id,'revision',p.revision,'status',p.status,'volumeMl',p.volume_ml,'occurredAt',p.occurred_at);
$$;
REVOKE ALL ON FUNCTION public.tm_hydration_snapshot(public.tm_hydration_records) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.tm_mutate_own_hydration_record(p_clinic_id uuid,p_command jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE own_patient uuid; target uuid; request_id uuid; expected integer; operation text; volume bigint; occurred timestamptz;
 item public.tm_hydration_records%ROWTYPE; receipt public.tm_hydration_receipts%ROWTYPE; original jsonb; required text[];
BEGIN
 IF p_command IS NULL OR jsonb_typeof(p_command)<>'object' THEN RAISE EXCEPTION 'Invalid command' USING ERRCODE='22023'; END IF;
 operation:=p_command->>'kind';
 IF operation IS NULL OR operation NOT IN ('create','correct','void') THEN RAISE EXCEPTION 'Invalid operation' USING ERRCODE='22023'; END IF;
 required:=CASE WHEN operation='void' THEN ARRAY['kind','recordId','sourceRequestId','expectedRevision'] ELSE ARRAY['kind','recordId','sourceRequestId','expectedRevision','document'] END;
 IF NOT(p_command ?& required) OR (p_command-required)<>'{}'::jsonb THEN RAISE EXCEPTION 'Invalid fields' USING ERRCODE='22023'; END IF;
 IF jsonb_typeof(p_command->'kind')<>'string' OR jsonb_typeof(p_command->'recordId')<>'string' OR jsonb_typeof(p_command->'sourceRequestId')<>'string' OR jsonb_typeof(p_command->'expectedRevision')<>'number' OR (p_command->>'expectedRevision')!~'^[0-9]+$' OR (p_command->>'expectedRevision')::numeric>2147483646 THEN RAISE EXCEPTION 'Invalid command types' USING ERRCODE='22023'; END IF;
 target:=(p_command->>'recordId')::uuid;request_id:=(p_command->>'sourceRequestId')::uuid;expected:=(p_command->>'expectedRevision')::integer;
 IF (operation='create' AND expected<>0) OR (operation<>'create' AND expected<1) THEN RAISE EXCEPTION 'Invalid revision' USING ERRCODE='22023'; END IF;
 IF operation<>'void' THEN
  IF jsonb_typeof(p_command->'document')<>'object' OR NOT((p_command->'document') ?& ARRAY['volumeMl','occurredAt']) OR ((p_command->'document')-ARRAY['volumeMl','occurredAt'])<>'{}'::jsonb THEN RAISE EXCEPTION 'Invalid document' USING ERRCODE='22023'; END IF;
  IF jsonb_typeof(p_command->'document'->'volumeMl')<>'number' OR (p_command->'document'->>'volumeMl')!~'^[0-9]+$' OR (p_command->'document'->>'volumeMl')::numeric>9007199254740991 OR jsonb_typeof(p_command->'document'->'occurredAt')<>'string' OR (p_command->'document'->>'occurredAt')!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]+)?(Z|[+-][0-9]{2}:[0-9]{2})$' THEN RAISE EXCEPTION 'Invalid measurement' USING ERRCODE='22023'; END IF;
  volume:=(p_command->'document'->>'volumeMl')::bigint;occurred:=(p_command->'document'->>'occurredAt')::timestamptz;
 END IF;
 own_patient:=public.tm_require_own_hydration_patient(p_clinic_id,CASE WHEN operation='create' THEN 'create' ELSE 'write' END);
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(target::text,0));
 SELECT * INTO item FROM public.tm_hydration_records WHERE id=target FOR UPDATE;
 IF FOUND AND (item.clinic_id<>p_clinic_id OR item.patient_id<>own_patient OR item.patient_user_id<>auth.uid()) THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 SELECT * INTO receipt FROM public.tm_hydration_receipts WHERE record_id=target AND source_request_id=request_id;
 IF FOUND THEN
  IF receipt.command<>p_command THEN RAISE EXCEPTION 'Request conflict' USING ERRCODE='40001'; END IF;
  RETURN jsonb_build_object('receipt',receipt.snapshot,'record',public.tm_hydration_snapshot(item),'replayed',true);
 END IF;
 IF operation='create' THEN
  IF item.id IS NOT NULL THEN RAISE EXCEPTION 'Revision conflict' USING ERRCODE='40001'; END IF;
  INSERT INTO public.tm_hydration_records(id,clinic_id,patient_id,patient_user_id,revision,status,volume_ml,occurred_at) VALUES(target,p_clinic_id,own_patient,auth.uid(),1,'active',volume,occurred) RETURNING * INTO item;
 ELSE
  IF item.id IS NULL OR item.revision<>expected OR item.status<>'active' THEN RAISE EXCEPTION 'Revision conflict' USING ERRCODE='40001'; END IF;
  UPDATE public.tm_hydration_records SET revision=revision+1,status=CASE WHEN operation='void' THEN 'voided' ELSE 'active' END,volume_ml=CASE WHEN operation='void' THEN volume_ml ELSE volume END,occurred_at=CASE WHEN operation='void' THEN occurred_at ELSE occurred END,updated_at=GREATEST(updated_at,clock_timestamp()) WHERE id=target RETURNING * INTO item;
 END IF;
 original:=jsonb_build_object('scope',jsonb_build_object('clinicId',p_clinic_id,'patientId',own_patient),'command',p_command,'record',public.tm_hydration_snapshot(item));
 INSERT INTO public.tm_hydration_receipts(record_id,revision,source_request_id,command,snapshot,actor_user_id) VALUES(target,item.revision,request_id,p_command,original,auth.uid());
 RETURN jsonb_build_object('receipt',original,'record',public.tm_hydration_snapshot(item),'replayed',false);
END; $$;
CREATE FUNCTION public.tm_get_own_hydration_record(p_clinic_id uuid,p_record_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE own_patient uuid; item public.tm_hydration_records%ROWTYPE; value jsonb;
BEGIN
 own_patient:=public.tm_require_own_hydration_patient(p_clinic_id,'read');
 IF p_record_id IS NULL THEN RAISE EXCEPTION 'Invalid record' USING ERRCODE='22023'; END IF;
 SELECT * INTO item FROM public.tm_hydration_records WHERE id=p_record_id AND clinic_id=p_clinic_id AND patient_id=own_patient AND patient_user_id=auth.uid();
 IF FOUND THEN value:=public.tm_hydration_snapshot(item); END IF;
 RETURN jsonb_build_object('clinicId',p_clinic_id,'patientId',own_patient,'record',value);
END; $$;
REVOKE ALL ON FUNCTION public.tm_mutate_own_hydration_record(uuid,jsonb),public.tm_get_own_hydration_record(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tm_mutate_own_hydration_record(uuid,jsonb),public.tm_get_own_hydration_record(uuid,uuid) TO authenticated;
COMMIT;
