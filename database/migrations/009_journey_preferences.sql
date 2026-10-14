-- LOCAL ONLY. Participation preference is not clinical consent or a protected clinical pause.
BEGIN;
ALTER TABLE public.tm_journey_preferences ADD COLUMN revision integer NOT NULL DEFAULT 1 CHECK(revision>0);
CREATE TABLE public.tm_journey_preference_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 clinic_id uuid NOT NULL, patient_id uuid NOT NULL, actor_user_id uuid NOT NULL,
 is_enabled boolean NOT NULL, revision integer NOT NULL CHECK(revision>0),
 occurred_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(clinic_id,patient_id) REFERENCES public.tm_journey_preferences(clinic_id,patient_id),
 UNIQUE(clinic_id,patient_id,revision)
);
ALTER TABLE public.tm_journey_preference_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tm_journey_preference_audit FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.tm_journey_preference_audit TO authenticated;
CREATE POLICY tm_journey_preference_audit_read ON public.tm_journey_preference_audit
 FOR SELECT TO authenticated USING(EXISTS(
 SELECT 1 FROM public.tm_journey_preferences pref WHERE pref.clinic_id=tm_journey_preference_audit.clinic_id
 AND pref.patient_id=tm_journey_preference_audit.patient_id AND pref.patient_user_id=auth.uid()));

CREATE FUNCTION public.tm_set_journey_preference(p_patient_id uuid,p_is_enabled boolean,p_expected_revision integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE patient public.tm_patients%ROWTYPE; saved public.tm_journey_preferences%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL OR p_is_enabled IS NULL OR p_expected_revision IS NULL OR p_expected_revision<0 THEN
  RAISE EXCEPTION 'Invalid preference input' USING ERRCODE='22023'; END IF;
 SELECT * INTO patient FROM public.tm_patients WHERE id=p_patient_id AND user_id=auth.uid() AND is_active FOR UPDATE;
 IF patient.id IS NULL THEN RAISE EXCEPTION 'Participation denied' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.tm_memberships m JOIN public.tm_clinics c ON c.id=m.clinic_id
 WHERE m.user_id=auth.uid() AND m.patient_id=patient.id AND m.clinic_id=patient.clinic_id
 AND m.role='paciente' AND m.is_active AND c.is_active FOR SHARE OF m,c;
 IF NOT FOUND THEN RAISE EXCEPTION 'Participation denied' USING ERRCODE='42501'; END IF;
 -- Revoking event permission must not prevent a patient from disabling participation.
 IF p_is_enabled THEN
  PERFORM 1 FROM public.tm_memberships m JOIN public.tm_membership_grants g ON g.membership_id=m.id
  WHERE m.user_id=auth.uid() AND m.patient_id=patient.id AND m.clinic_id=patient.clinic_id
  AND m.role='paciente' AND m.is_active AND g.resource='journey_events' AND g.action='create' FOR SHARE OF m,g;
  IF NOT FOUND THEN RAISE EXCEPTION 'Participation denied' USING ERRCODE='42501'; END IF;
 END IF;
 SELECT * INTO saved FROM public.tm_journey_preferences WHERE clinic_id=patient.clinic_id AND patient_id=patient.id FOR UPDATE;
 IF (saved.patient_id IS NULL AND p_expected_revision<>0)
 OR (saved.patient_id IS NOT NULL AND saved.revision<>p_expected_revision) THEN
  RAISE EXCEPTION 'Preference changed; reload' USING ERRCODE='40001'; END IF;
 IF saved.patient_id IS NOT NULL AND saved.is_enabled=p_is_enabled THEN RETURN to_jsonb(saved); END IF;
 IF saved.patient_id IS NULL THEN
  INSERT INTO public.tm_journey_preferences(clinic_id,patient_id,patient_user_id,is_enabled)
  VALUES(patient.clinic_id,patient.id,auth.uid(),p_is_enabled) RETURNING * INTO saved;
 ELSE
  UPDATE public.tm_journey_preferences SET is_enabled=p_is_enabled,revision=revision+1
  WHERE clinic_id=patient.clinic_id AND patient_id=patient.id RETURNING * INTO saved;
 END IF;
 INSERT INTO public.tm_journey_preference_audit(clinic_id,patient_id,actor_user_id,is_enabled,revision)
 VALUES(patient.clinic_id,patient.id,auth.uid(),saved.is_enabled,saved.revision);
 RETURN to_jsonb(saved);
END;
$$;
REVOKE ALL ON FUNCTION public.tm_set_journey_preference(uuid,boolean,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tm_set_journey_preference(uuid,boolean,integer) TO authenticated;
CREATE FUNCTION public.tm_get_journey_preference(p_patient_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE patient public.tm_patients%ROWTYPE; saved public.tm_journey_preferences%ROWTYPE;
BEGIN
 SELECT * INTO patient FROM public.tm_patients WHERE id=p_patient_id AND user_id=auth.uid() AND is_active FOR SHARE;
 IF auth.uid() IS NULL OR patient.id IS NULL THEN
  RAISE EXCEPTION 'Participation denied' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.tm_memberships m JOIN public.tm_clinics c ON c.id=m.clinic_id
 WHERE m.user_id=auth.uid() AND m.patient_id=patient.id AND m.clinic_id=patient.clinic_id
 AND m.role='paciente' AND m.is_active AND c.is_active FOR SHARE OF m,c;
 IF NOT FOUND THEN RAISE EXCEPTION 'Participation denied' USING ERRCODE='42501'; END IF;
 SELECT * INTO saved FROM public.tm_journey_preferences WHERE clinic_id=patient.clinic_id AND patient_id=patient.id;
 IF saved.patient_id IS NOT NULL THEN RETURN to_jsonb(saved); END IF;
 RETURN jsonb_build_object('clinic_id',patient.clinic_id,'patient_id',patient.id,
  'patient_user_id',auth.uid(),'is_enabled',false,'revision',0);
END;
$$;
REVOKE ALL ON FUNCTION public.tm_get_journey_preference(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tm_get_journey_preference(uuid) TO authenticated;
COMMIT;
