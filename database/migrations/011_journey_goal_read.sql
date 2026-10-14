-- LOCAL ONLY. Doctor read bound to an explicit host clinic; no writes or account seeds.
BEGIN;
CREATE FUNCTION public.tm_get_journey_goal_for_doctor(p_goal_id uuid,p_clinic_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE goal public.tm_journey_goals%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL OR p_clinic_id IS NULL THEN
  RAISE EXCEPTION 'Goal access denied' USING ERRCODE='42501'; END IF;
 SELECT * INTO goal FROM public.tm_journey_goals WHERE id=p_goal_id AND clinic_id=p_clinic_id FOR SHARE;
 IF goal.id IS NULL THEN RAISE EXCEPTION 'Goal access denied' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.tm_memberships m JOIN public.tm_membership_grants g ON g.membership_id=m.id
 JOIN public.tm_clinics c ON c.id=m.clinic_id JOIN public.tm_patients p ON p.id=goal.patient_id AND p.clinic_id=c.id
 WHERE m.user_id=auth.uid() AND m.clinic_id=p_clinic_id AND m.role='medico' AND m.is_active
 AND m.medical_identity_verified AND c.is_active AND p.is_active
 AND g.resource='journey_goals' AND g.action='read' FOR SHARE OF m,g,c,p;
 IF NOT FOUND THEN RAISE EXCEPTION 'Goal access denied' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object('goal',to_jsonb(goal),'patientLink',jsonb_build_object(
  'clinicId',goal.clinic_id,'patientId',goal.patient_id,'isActive',true));
END;
$$;
REVOKE ALL ON FUNCTION public.tm_get_journey_goal_for_doctor(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tm_get_journey_goal_for_doctor(uuid,uuid) TO authenticated;
COMMIT;
