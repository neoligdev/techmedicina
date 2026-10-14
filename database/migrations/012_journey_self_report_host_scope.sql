-- LOCAL ONLY. Bind self-report writes to the server-resolved host clinic.
BEGIN;
CREATE FUNCTION public.tm_submit_journey_self_report_for_clinic(
 p_clinic_id uuid,p_goal_id uuid,p_source_event_id uuid,p_occurred_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR p_clinic_id IS NULL THEN
  RAISE EXCEPTION 'Participation denied' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.tm_journey_goals
 WHERE id=p_goal_id AND clinic_id=p_clinic_id AND patient_user_id=auth.uid() FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Participation denied' USING ERRCODE='42501'; END IF;
 -- Existing RPC rechecks active membership/grant/preference, eligibility and idempotency.
 -- Owner executes this internal call; clients can no longer call the unscoped RPC.
 RETURN public.tm_submit_journey_self_report(p_goal_id,p_source_event_id,p_occurred_at);
END;
$$;
REVOKE ALL ON FUNCTION public.tm_submit_journey_self_report(uuid,uuid,timestamptz) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.tm_submit_journey_self_report_for_clinic(uuid,uuid,uuid,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tm_submit_journey_self_report_for_clinic(uuid,uuid,uuid,timestamptz) TO authenticated;
COMMIT;
