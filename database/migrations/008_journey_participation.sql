-- VJE-2 LOCAL ONLY: participation ledger, no points, prescriptions or clinical index.
BEGIN;
ALTER TABLE public.tm_membership_grants DROP CONSTRAINT tm_membership_grants_resource_check;
ALTER TABLE public.tm_membership_grants ADD CONSTRAINT tm_membership_grants_resource_check CHECK (resource IN ('cadastro_clinica','prontuario','paciente','agenda','faturamento','journey_goals','journey_events'));
CREATE TABLE public.tm_journey_goals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), clinic_id uuid NOT NULL, patient_id uuid NOT NULL, patient_user_id uuid NOT NULL,
 version integer NOT NULL CHECK(version>0), policy_version_id uuid NOT NULL,
 kind text NOT NULL CHECK(kind IN ('hydration','nutrition','sleep','emotion','medication','activity','check_in','protocol')),
 cadence text NOT NULL CHECK(cadence IN ('daily','weekly')),
 status text NOT NULL DEFAULT 'not_applicable' CHECK(status IN ('eligible','not_applicable','paused')),
 effective_from timestamptz NOT NULL, expires_at timestamptz,
 CHECK(expires_at IS NULL OR expires_at>effective_from),
 UNIQUE(id,clinic_id,patient_id),
 FOREIGN KEY(patient_id,clinic_id,patient_user_id) REFERENCES public.tm_patients(id,clinic_id,user_id)
);
CREATE TABLE public.tm_journey_preferences (
 clinic_id uuid NOT NULL, patient_id uuid NOT NULL, patient_user_id uuid NOT NULL, is_enabled boolean NOT NULL DEFAULT false,
 PRIMARY KEY(clinic_id,patient_id),
 FOREIGN KEY(patient_id,clinic_id,patient_user_id) REFERENCES public.tm_patients(id,clinic_id,user_id)
);
CREATE TABLE public.tm_journey_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), clinic_id uuid NOT NULL, patient_id uuid NOT NULL, goal_id uuid NOT NULL,
 source_event_id uuid NOT NULL, source text NOT NULL CHECK(source='self_report'), actor_user_id uuid NOT NULL,
 goal_version integer NOT NULL CHECK(goal_version>0), policy_version_id uuid NOT NULL,
 occurred_at timestamptz NOT NULL, received_at timestamptz NOT NULL DEFAULT now(),
 CHECK(occurred_at<=received_at), UNIQUE(clinic_id,patient_id,source,source_event_id),
 FOREIGN KEY(goal_id,clinic_id,patient_id) REFERENCES public.tm_journey_goals(id,clinic_id,patient_id)
);
ALTER TABLE public.tm_journey_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tm_journey_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tm_journey_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tm_journey_goals, public.tm_journey_preferences, public.tm_journey_events FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.tm_journey_goals, public.tm_journey_preferences, public.tm_journey_events TO authenticated;
CREATE FUNCTION public.tm_can_read_journey_patient(p_clinic_id uuid,p_patient_id uuid,p_resource text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT p_resource IN ('journey_goals','journey_events') AND EXISTS (
 SELECT 1 FROM public.tm_memberships m JOIN public.tm_membership_grants g ON g.membership_id=m.id
 JOIN public.tm_clinics c ON c.id=m.clinic_id JOIN public.tm_patients p ON p.id=p_patient_id AND p.clinic_id=c.id
 WHERE m.user_id=auth.uid() AND m.clinic_id=p_clinic_id AND m.is_active AND c.is_active AND p.is_active
 AND g.resource=p_resource AND g.action='read'
 AND ((m.role='paciente' AND m.patient_id=p.id) OR (m.role='medico' AND m.medical_identity_verified)))
$$;
REVOKE ALL ON FUNCTION public.tm_can_read_journey_patient(uuid,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tm_can_read_journey_patient(uuid,uuid,text) TO authenticated;
CREATE POLICY tm_journey_goal_read ON public.tm_journey_goals FOR SELECT TO authenticated
 USING(public.tm_can_read_journey_patient(clinic_id,patient_id,'journey_goals'));
CREATE POLICY tm_journey_preference_read ON public.tm_journey_preferences FOR SELECT TO authenticated USING (
 patient_user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.tm_memberships m JOIN public.tm_clinics c ON c.id=m.clinic_id
 JOIN public.tm_patients p ON p.id=tm_journey_preferences.patient_id AND p.clinic_id=c.id
 WHERE m.user_id=auth.uid() AND m.clinic_id=tm_journey_preferences.clinic_id AND m.patient_id=p.id
 AND m.role='paciente' AND m.is_active AND c.is_active AND p.is_active)
);
CREATE POLICY tm_journey_event_read ON public.tm_journey_events FOR SELECT TO authenticated
 USING(public.tm_can_read_journey_patient(clinic_id,patient_id,'journey_events'));
CREATE FUNCTION public.tm_submit_journey_self_report(p_goal_id uuid,p_source_event_id uuid,p_occurred_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE goal public.tm_journey_goals%ROWTYPE; saved public.tm_journey_events%ROWTYPE;
BEGIN
 SELECT * INTO goal FROM public.tm_journey_goals WHERE id=p_goal_id FOR SHARE;
 IF auth.uid() IS NULL OR goal.id IS NULL OR goal.patient_user_id<>auth.uid() THEN
  RAISE EXCEPTION 'Participation denied' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.tm_memberships m JOIN public.tm_membership_grants g ON g.membership_id=m.id
  JOIN public.tm_clinics c ON c.id=m.clinic_id JOIN public.tm_patients p ON p.id=goal.patient_id AND p.clinic_id=c.id
  JOIN public.tm_journey_preferences pref ON pref.patient_id=p.id AND pref.clinic_id=c.id
  WHERE m.user_id=auth.uid() AND m.patient_id=p.id AND m.clinic_id=c.id AND m.role='paciente' AND m.is_active
  AND c.is_active AND p.is_active AND pref.is_enabled AND pref.patient_user_id=auth.uid()
  AND g.resource='journey_events' AND g.action='create' FOR SHARE OF m,g,c,p,pref;
 IF NOT FOUND THEN RAISE EXCEPTION 'Participation denied' USING ERRCODE='42501'; END IF;
 IF goal.status<>'eligible' OR goal.kind IN ('medication','protocol') THEN
  RAISE EXCEPTION 'Goal requires a supported eligibility flow' USING ERRCODE='42501'; END IF;
 IF p_source_event_id IS NULL OR p_occurred_at IS NULL OR p_occurred_at<goal.effective_from OR p_occurred_at>now()
 OR (goal.expires_at IS NOT NULL AND p_occurred_at>=goal.expires_at) THEN
  RAISE EXCEPTION 'Invalid event input' USING ERRCODE='22023'; END IF;
 INSERT INTO public.tm_journey_events(clinic_id,patient_id,goal_id,source_event_id,source,actor_user_id,goal_version,policy_version_id,occurred_at)
 VALUES(goal.clinic_id,goal.patient_id,goal.id,p_source_event_id,'self_report',auth.uid(),goal.version,goal.policy_version_id,p_occurred_at)
 ON CONFLICT(clinic_id,patient_id,source,source_event_id) DO NOTHING RETURNING * INTO saved;
 IF saved.id IS NULL THEN
  SELECT * INTO saved FROM public.tm_journey_events WHERE clinic_id=goal.clinic_id AND patient_id=goal.patient_id AND source='self_report' AND source_event_id=p_source_event_id;
  IF saved.id IS NULL OR saved.goal_id<>goal.id OR saved.occurred_at<>p_occurred_at THEN RAISE EXCEPTION 'Event key conflict' USING ERRCODE='23505'; END IF;
 END IF;
 RETURN to_jsonb(saved);
END;
$$;
REVOKE ALL ON FUNCTION public.tm_submit_journey_self_report(uuid,uuid,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tm_submit_journey_self_report(uuid,uuid,timestamptz) TO authenticated;
COMMIT;
