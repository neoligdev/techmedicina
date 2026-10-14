-- LOCAL ONLY. Append-only medical proposals, never live eligibility or prescriptions.
BEGIN;
CREATE TABLE public.tm_journey_goal_drafts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 clinic_id uuid NOT NULL, patient_id uuid NOT NULL, patient_user_id uuid NOT NULL,
 actor_user_id uuid NOT NULL, source_request_id uuid NOT NULL,
 kind text NOT NULL CHECK(kind IN ('hydration','nutrition','sleep','emotion','activity','check_in')),
 cadence text NOT NULL CHECK(cadence IN ('daily','weekly')),
 state text NOT NULL DEFAULT 'draft' CHECK(state='draft'),
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(patient_id,clinic_id,patient_user_id) REFERENCES public.tm_patients(id,clinic_id,user_id),
 UNIQUE(clinic_id,patient_id,actor_user_id,source_request_id)
);
ALTER TABLE public.tm_journey_goal_drafts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tm_journey_goal_drafts FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.tm_journey_goal_drafts TO authenticated;
CREATE POLICY tm_journey_goal_draft_read ON public.tm_journey_goal_drafts FOR SELECT TO authenticated
 USING(public.tm_can_read_journey_patient(clinic_id,patient_id,'journey_goals') AND EXISTS(
 SELECT 1 FROM public.tm_memberships m WHERE m.user_id=auth.uid() AND m.clinic_id=tm_journey_goal_drafts.clinic_id
 AND m.role='medico' AND m.is_active AND m.medical_identity_verified));
CREATE FUNCTION public.tm_create_journey_goal_draft(p_clinic_id uuid,p_patient_id uuid,
 p_source_request_id uuid,p_kind text,p_cadence text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE patient_user uuid; saved public.tm_journey_goal_drafts%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Draft denied' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.tm_memberships m JOIN public.tm_clinics c ON c.id=m.clinic_id
 JOIN public.tm_membership_grants r ON r.membership_id=m.id AND r.resource='journey_goals' AND r.action='read'
 JOIN public.tm_membership_grants w ON w.membership_id=m.id AND w.resource='journey_goals' AND w.action='create'
 WHERE m.user_id=auth.uid() AND m.clinic_id=p_clinic_id AND m.role='medico' AND m.is_active
 AND m.medical_identity_verified AND c.is_active FOR SHARE OF m,c,r,w;
 IF NOT FOUND THEN RAISE EXCEPTION 'Draft denied' USING ERRCODE='42501'; END IF;
 SELECT p.user_id INTO patient_user FROM public.tm_patients p
 WHERE p.id=p_patient_id AND p.clinic_id=p_clinic_id AND p.is_active FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Draft denied' USING ERRCODE='42501'; END IF;
 IF p_source_request_id IS NULL OR p_kind IS NULL OR p_cadence IS NULL
 OR p_kind NOT IN ('hydration','nutrition','sleep','emotion','activity','check_in')
 OR p_cadence NOT IN ('daily','weekly') THEN RAISE EXCEPTION 'Invalid draft' USING ERRCODE='22023'; END IF;
 INSERT INTO public.tm_journey_goal_drafts(clinic_id,patient_id,patient_user_id,actor_user_id,source_request_id,kind,cadence)
 VALUES(p_clinic_id,p_patient_id,patient_user,auth.uid(),p_source_request_id,p_kind,p_cadence)
 ON CONFLICT(clinic_id,patient_id,actor_user_id,source_request_id) DO NOTHING RETURNING * INTO saved;
 IF saved.id IS NULL THEN
  SELECT * INTO saved FROM public.tm_journey_goal_drafts WHERE clinic_id=p_clinic_id AND patient_id=p_patient_id
  AND actor_user_id=auth.uid() AND source_request_id=p_source_request_id;
  IF saved.id IS NULL OR saved.kind<>p_kind OR saved.cadence<>p_cadence THEN
   RAISE EXCEPTION 'Draft request conflict' USING ERRCODE='23505'; END IF;
 END IF;
 RETURN to_jsonb(saved);
END;
$$;
REVOKE ALL ON FUNCTION public.tm_create_journey_goal_draft(uuid,uuid,uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tm_create_journey_goal_draft(uuid,uuid,uuid,text,text) TO authenticated;
COMMIT;
