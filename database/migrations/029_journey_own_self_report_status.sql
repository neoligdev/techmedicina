-- LOCAL proposal 029: exact own self-report lookup using existing unique event key.
BEGIN;
CREATE FUNCTION public.tm_get_own_journey_self_report(p_clinic_id uuid,p_source_event_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE own_patient uuid; item public.tm_journey_events%ROWTYPE; result jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 IF p_clinic_id IS NULL OR p_source_event_id IS NULL THEN RAISE EXCEPTION 'Invalid lookup' USING ERRCODE='22023'; END IF;
 IF (SELECT count(*) FROM public.tm_memberships WHERE clinic_id=p_clinic_id AND user_id=auth.uid() AND is_active)<>1 THEN
  RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 SELECT m.patient_id INTO own_patient FROM public.tm_memberships m
 JOIN public.tm_membership_grants g ON g.membership_id=m.id AND g.resource='journey_events' AND g.action='read'
 JOIN public.tm_clinics c ON c.id=m.clinic_id AND c.is_active
 JOIN public.tm_patients p ON p.id=m.patient_id AND p.clinic_id=m.clinic_id AND p.user_id=m.user_id AND p.is_active
 WHERE m.clinic_id=p_clinic_id AND m.user_id=auth.uid() AND m.is_active AND m.role='paciente'
 FOR SHARE OF m,g,c,p;
 IF NOT FOUND THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;

 SELECT * INTO item FROM public.tm_journey_events WHERE clinic_id=p_clinic_id AND patient_id=own_patient
 AND actor_user_id=auth.uid() AND source='self_report' AND source_event_id=p_source_event_id;
 IF FOUND THEN result:=jsonb_build_object('id',item.id,'goalId',item.goal_id,'sourceEventId',item.source_event_id,'occurredAt',item.occurred_at,'receivedAt',item.received_at); END IF;
 RETURN jsonb_build_object('clinicId',p_clinic_id,'patientId',own_patient,'event',result);
END;
$$;
REVOKE ALL ON FUNCTION public.tm_get_own_journey_self_report(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tm_get_own_journey_self_report(uuid,uuid) TO authenticated;
COMMIT;
