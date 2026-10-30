-- LOCAL proposal 042: own-patient current hydration snapshots, bounded date range and UUID cursor.
BEGIN;
CREATE INDEX tm_hydration_records_own_id_idx ON public.tm_hydration_records(clinic_id,patient_id,id);
CREATE FUNCTION public.tm_list_own_hydration_records(p_clinic_id uuid,p_from timestamptz,p_until timestamptz,p_after uuid DEFAULT NULL,p_limit integer DEFAULT 25)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE own_patient uuid; item public.tm_hydration_records%ROWTYPE; result jsonb:='[]'::jsonb; seen integer:=0; last_id uuid; next_cursor uuid;
BEGIN
 own_patient:=public.tm_require_own_hydration_patient(p_clinic_id,'read');
 IF p_from IS NULL OR p_until IS NULL OR NOT isfinite(p_from) OR NOT isfinite(p_until) OR p_from>=p_until OR p_limit IS NULL OR p_limit<1 OR p_limit>100 THEN RAISE EXCEPTION 'Invalid range' USING ERRCODE='22023'; END IF;
 IF p_after IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.tm_hydration_records WHERE id=p_after AND clinic_id=p_clinic_id AND patient_id=own_patient AND patient_user_id=auth.uid() AND occurred_at>=p_from AND occurred_at<p_until) THEN RAISE EXCEPTION 'Invalid cursor' USING ERRCODE='22023'; END IF;
 FOR item IN SELECT * FROM public.tm_hydration_records WHERE clinic_id=p_clinic_id AND patient_id=own_patient AND patient_user_id=auth.uid() AND occurred_at>=p_from AND occurred_at<p_until AND (p_after IS NULL OR id>p_after) ORDER BY id LIMIT p_limit+1 LOOP
  seen:=seen+1;IF seen>p_limit THEN next_cursor:=last_id;EXIT;END IF;
  result:=result||jsonb_build_array(public.tm_hydration_snapshot(item));last_id:=item.id;
 END LOOP;
 RETURN jsonb_build_object('clinicId',p_clinic_id,'patientId',own_patient,'from',p_from,'until',p_until,'records',result,'nextCursor',next_cursor);
END; $$;
REVOKE ALL ON FUNCTION public.tm_list_own_hydration_records(uuid,timestamptz,timestamptz,uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tm_list_own_hydration_records(uuid,timestamptz,timestamptz,uuid,integer) TO authenticated;
COMMIT;
