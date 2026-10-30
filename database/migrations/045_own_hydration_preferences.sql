-- LOCAL proposal 045. Patient preferences only; does not send reminders or prescribe a goal.
BEGIN;
CREATE TABLE public.tm_hydration_preferences(
 clinic_id uuid NOT NULL,patient_id uuid NOT NULL,patient_user_id uuid NOT NULL,
 revision integer NOT NULL CHECK(revision>0),settings jsonb NOT NULL,
 PRIMARY KEY(clinic_id,patient_id),
 FOREIGN KEY(patient_id,clinic_id,patient_user_id) REFERENCES public.tm_patients(id,clinic_id,user_id)
);
CREATE TABLE public.tm_hydration_preference_receipts(
 clinic_id uuid NOT NULL,patient_id uuid NOT NULL,source_request_id uuid NOT NULL,
 command jsonb NOT NULL,snapshot jsonb NOT NULL,
 PRIMARY KEY(clinic_id,patient_id,source_request_id),
 FOREIGN KEY(clinic_id,patient_id) REFERENCES public.tm_hydration_preferences(clinic_id,patient_id)
);
ALTER TABLE public.tm_hydration_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tm_hydration_preference_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tm_hydration_preferences,public.tm_hydration_preference_receipts FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.tm_get_own_hydration_preferences(p_clinic_id uuid,p_source_request_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE own_patient uuid; current_value jsonb; receipt_value jsonb;
BEGIN
 own_patient:=public.tm_require_own_hydration_patient(p_clinic_id,'read');
 SELECT jsonb_build_object('clinicId',p.clinic_id,'patientId',p.patient_id,'revision',p.revision,'settings',p.settings),
 CASE WHEN r.source_request_id IS NULL THEN NULL ELSE jsonb_build_object('command',r.command,'snapshot',r.snapshot) END
 INTO current_value,receipt_value FROM public.tm_hydration_preferences p LEFT JOIN public.tm_hydration_preference_receipts r
 ON r.clinic_id=p.clinic_id AND r.patient_id=p.patient_id AND r.source_request_id=p_source_request_id
 WHERE p.clinic_id=p_clinic_id AND p.patient_id=own_patient AND p.patient_user_id=auth.uid();
 RETURN jsonb_build_object('clinicId',p_clinic_id,'patientId',own_patient,'preferences',current_value,'receipt',receipt_value);
END; $$;
CREATE FUNCTION public.tm_save_own_hydration_preferences(p_clinic_id uuid,p_command jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE own_patient uuid; request_id uuid; expected integer; doc jsonb; current_item public.tm_hydration_preferences%ROWTYPE;
 accepted public.tm_hydration_preference_receipts%ROWTYPE; current_value jsonb; original jsonb;
BEGIN
 IF p_command IS NULL OR jsonb_typeof(p_command)<>'object' OR NOT(p_command ?& ARRAY['sourceRequestId','expectedRevision','settings']) OR (p_command-ARRAY['sourceRequestId','expectedRevision','settings'])<>'{}'::jsonb
 THEN RAISE EXCEPTION 'Invalid command' USING ERRCODE='22023'; END IF;
 IF jsonb_typeof(p_command->'sourceRequestId')<>'string' OR jsonb_typeof(p_command->'expectedRevision')<>'number' OR (p_command->>'expectedRevision')!~'^[0-9]+$' OR (p_command->>'expectedRevision')::numeric>2147483646 THEN RAISE EXCEPTION 'Invalid revision' USING ERRCODE='22023'; END IF;
 request_id:=(p_command->>'sourceRequestId')::uuid;expected:=(p_command->>'expectedRevision')::integer;doc:=p_command->'settings';
 IF jsonb_typeof(doc)<>'object' OR NOT(doc ?& ARRAY['dailyGoalMl','timeZone','remindersEnabled','reminderTimes']) OR (doc-ARRAY['dailyGoalMl','timeZone','remindersEnabled','reminderTimes'])<>'{}'::jsonb THEN RAISE EXCEPTION 'Invalid settings' USING ERRCODE='22023'; END IF;
 IF jsonb_typeof(doc->'dailyGoalMl')<>'null' AND (jsonb_typeof(doc->'dailyGoalMl')<>'number' OR (doc->>'dailyGoalMl')!~'^[1-9][0-9]*$' OR (doc->>'dailyGoalMl')::numeric>9007199254740991) THEN RAISE EXCEPTION 'Invalid goal' USING ERRCODE='22023'; END IF;
 IF jsonb_typeof(doc->'timeZone')<>'string' OR doc->>'timeZone' NOT IN ('America/Bahia','America/Sao_Paulo','UTC') OR jsonb_typeof(doc->'remindersEnabled')<>'boolean' OR jsonb_typeof(doc->'reminderTimes')<>'array' THEN RAISE EXCEPTION 'Invalid reminders' USING ERRCODE='22023'; END IF;
 IF jsonb_array_length(doc->'reminderTimes')>24 OR ((doc->>'remindersEnabled')::boolean AND jsonb_array_length(doc->'reminderTimes')=0) THEN RAISE EXCEPTION 'Invalid schedule' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(doc->'reminderTimes') t WHERE jsonb_typeof(t)<>'string' OR (t#>>'{}')!~'^([01][0-9]|2[0-3]):[0-5][0-9]$') OR (SELECT count(*)<>count(DISTINCT t) FROM jsonb_array_elements(doc->'reminderTimes') t) THEN RAISE EXCEPTION 'Invalid time' USING ERRCODE='22023'; END IF;
 own_patient:=public.tm_require_own_hydration_patient(p_clinic_id,'write');
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('hydration_preferences:'||p_clinic_id::text||':'||own_patient::text,0));
 SELECT * INTO current_item FROM public.tm_hydration_preferences WHERE clinic_id=p_clinic_id AND patient_id=own_patient FOR UPDATE;
 SELECT * INTO accepted FROM public.tm_hydration_preference_receipts WHERE clinic_id=p_clinic_id AND patient_id=own_patient AND source_request_id=request_id;
 IF FOUND THEN
  IF accepted.command<>p_command THEN RAISE EXCEPTION 'Request conflict' USING ERRCODE='40001'; END IF;
 ELSE
  IF coalesce(current_item.revision,0)<>expected THEN RAISE EXCEPTION 'Revision conflict' USING ERRCODE='40001'; END IF;
  INSERT INTO public.tm_hydration_preferences(clinic_id,patient_id,patient_user_id,revision,settings) VALUES(p_clinic_id,own_patient,auth.uid(),expected+1,doc)
  ON CONFLICT(clinic_id,patient_id) DO UPDATE SET revision=excluded.revision,settings=excluded.settings RETURNING * INTO current_item;
  original:=jsonb_build_object('clinicId',p_clinic_id,'patientId',own_patient,'revision',current_item.revision,'settings',current_item.settings);
  INSERT INTO public.tm_hydration_preference_receipts VALUES(p_clinic_id,own_patient,request_id,p_command,original);
 END IF;
 RETURN public.tm_get_own_hydration_preferences(p_clinic_id,request_id);
END; $$;
REVOKE ALL ON FUNCTION public.tm_get_own_hydration_preferences(uuid,uuid),public.tm_save_own_hydration_preferences(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tm_get_own_hydration_preferences(uuid,uuid),public.tm_save_own_hydration_preferences(uuid,jsonb) TO authenticated;
COMMIT;
