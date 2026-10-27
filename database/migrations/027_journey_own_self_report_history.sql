-- LOCAL proposal 027: own self-report history, bounded and same-bearer.
BEGIN;
CREATE INDEX tm_journey_self_report_page ON public.tm_journey_events(clinic_id,patient_id,received_at DESC,id DESC);
CREATE FUNCTION public.tm_get_own_journey_self_reports(p_clinic_id uuid,p_before uuid DEFAULT NULL,p_limit integer DEFAULT 25)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE own_patient uuid; boundary public.tm_journey_events%ROWTYPE; item public.tm_journey_events%ROWTYPE;
 result jsonb:='[]'::jsonb; seen integer:=0; last_id uuid; next_cursor uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 IF p_clinic_id IS NULL OR p_limit IS NULL OR p_limit<1 OR p_limit>100 THEN
  RAISE EXCEPTION 'Invalid history request' USING ERRCODE='22023'; END IF;
 IF (SELECT count(*) FROM public.tm_memberships WHERE clinic_id=p_clinic_id AND user_id=auth.uid() AND is_active)<>1 THEN
  RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 SELECT m.patient_id INTO own_patient FROM public.tm_memberships m
 JOIN public.tm_membership_grants g ON g.membership_id=m.id AND g.resource='journey_events' AND g.action='read'
 JOIN public.tm_clinics c ON c.id=m.clinic_id AND c.is_active
 JOIN public.tm_patients p ON p.id=m.patient_id AND p.clinic_id=m.clinic_id AND p.user_id=m.user_id AND p.is_active
 WHERE m.clinic_id=p_clinic_id AND m.user_id=auth.uid() AND m.is_active AND m.role='paciente'
 FOR SHARE OF m,g,c,p;
 IF NOT FOUND THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 IF p_before IS NOT NULL THEN
  SELECT * INTO boundary FROM public.tm_journey_events WHERE id=p_before AND clinic_id=p_clinic_id
   AND patient_id=own_patient AND actor_user_id=auth.uid() AND source='self_report';
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid history cursor' USING ERRCODE='22023'; END IF;
 END IF;
 FOR item IN SELECT * FROM public.tm_journey_events WHERE clinic_id=p_clinic_id AND patient_id=own_patient
   AND actor_user_id=auth.uid() AND source='self_report'
   AND (p_before IS NULL OR (received_at,id)<(boundary.received_at,boundary.id))
   ORDER BY received_at DESC,id DESC LIMIT p_limit+1 LOOP
  seen:=seen+1;IF seen>p_limit THEN next_cursor:=last_id;EXIT;END IF;
  result:=result||jsonb_build_array(jsonb_build_object('id',item.id,'goalId',item.goal_id,
   'sourceEventId',item.source_event_id,'occurredAt',item.occurred_at,'receivedAt',item.received_at));
  last_id:=item.id;
 END LOOP;
 RETURN jsonb_build_object('clinicId',p_clinic_id,'patientId',own_patient,'events',result,'nextCursor',next_cursor);
END;
$$;
REVOKE ALL ON FUNCTION public.tm_get_own_journey_self_reports(uuid,uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tm_get_own_journey_self_reports(uuid,uuid,integer) TO authenticated;
COMMIT;
