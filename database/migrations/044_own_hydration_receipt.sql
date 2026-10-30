-- LOCAL proposal 044. Read confirmation never retries a write or grants access.
BEGIN;
CREATE FUNCTION public.tm_get_own_hydration_receipt(p_clinic_id uuid,p_record_id uuid,p_source_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE own_patient uuid; current_value jsonb; receipt_value jsonb;
BEGIN
 own_patient:=public.tm_require_own_hydration_patient(p_clinic_id,'read');
 IF p_record_id IS NULL OR p_source_request_id IS NULL THEN RAISE EXCEPTION 'Invalid identifier' USING ERRCODE='22023'; END IF;
 -- One statement snapshot keeps current record and accepted receipt mutually consistent.
 SELECT public.tm_hydration_snapshot(r),s.snapshot INTO current_value,receipt_value
 FROM public.tm_hydration_records r
 LEFT JOIN public.tm_hydration_receipts s ON s.record_id=r.id AND s.source_request_id=p_source_request_id
 WHERE r.id=p_record_id AND r.clinic_id=p_clinic_id AND r.patient_id=own_patient AND r.patient_user_id=auth.uid();

 RETURN jsonb_build_object('clinicId',p_clinic_id,'patientId',own_patient,'record',current_value,'receipt',receipt_value);
END; $$;
REVOKE ALL ON FUNCTION public.tm_get_own_hydration_receipt(uuid,uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tm_get_own_hydration_receipt(uuid,uuid,uuid) TO authenticated;
COMMIT;

