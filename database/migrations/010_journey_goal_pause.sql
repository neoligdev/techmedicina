-- LOCAL ONLY. Audited goal suspension; does not enable eligibility or change prescriptions.
BEGIN;
CREATE TABLE public.tm_journey_goal_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), goal_id uuid NOT NULL,
 clinic_id uuid NOT NULL, patient_id uuid NOT NULL, actor_user_id uuid NOT NULL,
 action text NOT NULL CHECK(action='goal_paused'),
 previous_version integer NOT NULL CHECK(previous_version>0),
 goal_version integer NOT NULL CHECK(goal_version=previous_version+1),
 occurred_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(goal_id,clinic_id,patient_id) REFERENCES public.tm_journey_goals(id,clinic_id,patient_id),
 UNIQUE(goal_id,goal_version)
);
ALTER TABLE public.tm_journey_goal_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tm_journey_goal_audit FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.tm_journey_goal_audit TO authenticated;
CREATE POLICY tm_journey_goal_audit_read ON public.tm_journey_goal_audit FOR SELECT TO authenticated
 USING(public.tm_can_read_journey_patient(clinic_id,patient_id,'journey_goals'));

CREATE FUNCTION public.tm_pause_journey_goal(p_goal_id uuid,p_expected_version integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE goal public.tm_journey_goals%ROWTYPE; old_version integer;
BEGIN
 SELECT * INTO goal FROM public.tm_journey_goals WHERE id=p_goal_id FOR UPDATE;
 IF auth.uid() IS NULL OR goal.id IS NULL THEN
  RAISE EXCEPTION 'Goal access denied' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.tm_memberships m JOIN public.tm_membership_grants g ON g.membership_id=m.id
 JOIN public.tm_clinics c ON c.id=m.clinic_id JOIN public.tm_patients p ON p.id=goal.patient_id AND p.clinic_id=c.id
 WHERE m.user_id=auth.uid() AND m.clinic_id=goal.clinic_id AND m.role='medico'
 AND m.is_active AND m.medical_identity_verified AND c.is_active AND p.is_active
 AND g.resource='journey_goals' AND g.action='write' FOR SHARE OF m,g,c,p;
 IF NOT FOUND THEN RAISE EXCEPTION 'Goal access denied' USING ERRCODE='42501'; END IF;
 IF p_expected_version IS NULL OR p_expected_version<1 THEN
  RAISE EXCEPTION 'Invalid goal version' USING ERRCODE='22023'; END IF;
 IF goal.version<>p_expected_version THEN
  RAISE EXCEPTION 'Goal changed; reload' USING ERRCODE='40001'; END IF;
 IF goal.status='paused' THEN RETURN to_jsonb(goal); END IF;
 old_version := goal.version;
 UPDATE public.tm_journey_goals SET status='paused',version=version+1 WHERE id=goal.id RETURNING * INTO goal;
 INSERT INTO public.tm_journey_goal_audit(goal_id,clinic_id,patient_id,actor_user_id,action,previous_version,goal_version)
 VALUES(goal.id,goal.clinic_id,goal.patient_id,auth.uid(),'goal_paused',old_version,goal.version);
 RETURN to_jsonb(goal);
END;
$$;
REVOKE ALL ON FUNCTION public.tm_pause_journey_goal(uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tm_pause_journey_goal(uuid,integer) TO authenticated;
COMMIT;
