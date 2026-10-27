-- LOCAL proposal 028: minimal own goal snapshot; does not grant write eligibility.
BEGIN;
CREATE INDEX tm_journey_own_goal_page ON public.tm_journey_goals(clinic_id,patient_id,id);
CREATE FUNCTION public.tm_get_own_journey_goals(p_clinic_id uuid,p_after uuid DEFAULT NULL,p_limit integer DEFAULT 25)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE own_patient uuid; item public.tm_journey_goals%ROWTYPE;
 result jsonb:='[]'::jsonb; seen integer:=0; last_id uuid; next_cursor uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 IF p_clinic_id IS NULL OR p_limit IS NULL OR p_limit<1 OR p_limit>100 THEN
  RAISE EXCEPTION 'Invalid goals request' USING ERRCODE='22023'; END IF;
 IF (SELECT count(*) FROM public.tm_memberships WHERE clinic_id=p_clinic_id AND user_id=auth.uid() AND is_active)<>1 THEN
  RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 SELECT m.patient_id INTO own_patient FROM public.tm_memberships m
 JOIN public.tm_membership_grants g ON g.membership_id=m.id AND g.resource='journey_goals' AND g.action='read'
 JOIN public.tm_clinics c ON c.id=m.clinic_id AND c.is_active
 JOIN public.tm_patients p ON p.id=m.patient_id AND p.clinic_id=m.clinic_id AND p.user_id=m.user_id AND p.is_active
 WHERE m.clinic_id=p_clinic_id AND m.user_id=auth.uid() AND m.is_active AND m.role='paciente'
 FOR SHARE OF m,g,c,p;
 IF NOT FOUND THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 IF p_after IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.tm_journey_goals WHERE id=p_after
  AND clinic_id=p_clinic_id AND patient_id=own_patient AND patient_user_id=auth.uid()) THEN
  RAISE EXCEPTION 'Invalid goals cursor' USING ERRCODE='22023'; END IF;
 FOR item IN SELECT * FROM public.tm_journey_goals WHERE clinic_id=p_clinic_id AND patient_id=own_patient
  AND patient_user_id=auth.uid() AND (p_after IS NULL OR id>p_after) ORDER BY id LIMIT p_limit+1 LOOP
  seen:=seen+1; IF seen>p_limit THEN next_cursor:=last_id; EXIT; END IF;
  result:=result||jsonb_build_array(jsonb_build_object('id',item.id,'kind',item.kind,'cadence',item.cadence,
   'status',item.status,'version',item.version,'effectiveFrom',item.effective_from,'expiresAt',item.expires_at));
  last_id:=item.id;
 END LOOP;
 RETURN jsonb_build_object('clinicId',p_clinic_id,'patientId',own_patient,'goals',result,'nextCursor',next_cursor);
END;
$$;
REVOKE ALL ON FUNCTION public.tm_get_own_journey_goals(uuid,uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tm_get_own_journey_goals(uuid,uuid,integer) TO authenticated;
COMMIT;
