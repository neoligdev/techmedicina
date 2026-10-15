-- LOCAL ONLY. Explicit availability intervals, not appointments or patient bookings.
BEGIN;
CREATE TABLE public.tm_doctor_availability (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 clinic_id uuid NOT NULL,
 doctor_user_id uuid NOT NULL,
 source_request_id uuid NOT NULL,
 starts_at timestamptz NOT NULL,
 ends_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK (isfinite(starts_at) AND isfinite(ends_at) AND ends_at > starts_at),
 FOREIGN KEY (clinic_id,doctor_user_id) REFERENCES public.tm_memberships(clinic_id,user_id),
 UNIQUE (clinic_id,doctor_user_id,source_request_id)
);
ALTER TABLE public.tm_doctor_availability ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tm_doctor_availability FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.tm_doctor_availability TO authenticated;
CREATE POLICY tm_doctor_availability_own_read ON public.tm_doctor_availability FOR SELECT TO authenticated
 USING(doctor_user_id=auth.uid() AND EXISTS(
  SELECT 1 FROM public.tm_memberships m JOIN public.tm_clinics c ON c.id=m.clinic_id
  JOIN public.tm_membership_grants g ON g.membership_id=m.id
  WHERE m.clinic_id=tm_doctor_availability.clinic_id AND m.user_id=auth.uid()
  AND m.role='medico' AND m.is_active AND m.medical_identity_verified AND c.is_active
  AND g.resource='agenda' AND g.action='read'));
CREATE FUNCTION public.tm_create_own_availability(p_clinic_id uuid,p_source_request_id uuid,p_starts_at timestamptz,p_ends_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE saved public.tm_doctor_availability%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Availability denied' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.tm_memberships m JOIN public.tm_clinics c ON c.id=m.clinic_id
 JOIN public.tm_membership_grants g ON g.membership_id=m.id
 WHERE m.clinic_id=p_clinic_id AND m.user_id=auth.uid() AND m.role='medico'
 AND m.is_active AND m.medical_identity_verified AND c.is_active
 AND g.resource='agenda' AND g.action='write' FOR SHARE OF m,c,g;
 IF NOT FOUND THEN RAISE EXCEPTION 'Availability denied' USING ERRCODE='42501'; END IF;
 IF p_source_request_id IS NULL OR p_starts_at IS NULL OR p_ends_at IS NULL
 OR NOT isfinite(p_starts_at) OR NOT isfinite(p_ends_at) OR p_ends_at<=p_starts_at THEN
 RAISE EXCEPTION 'Invalid availability' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('availability:'||p_clinic_id::text||':'||auth.uid()::text));
 SELECT * INTO saved FROM public.tm_doctor_availability WHERE clinic_id=p_clinic_id
 AND doctor_user_id=auth.uid() AND source_request_id=p_source_request_id;
 IF saved.id IS NOT NULL THEN
  IF saved.starts_at<>p_starts_at OR saved.ends_at<>p_ends_at THEN
   RAISE EXCEPTION 'Availability request conflict' USING ERRCODE='23505'; END IF;
  RETURN to_jsonb(saved);
 END IF;
 IF EXISTS(SELECT 1 FROM public.tm_doctor_availability WHERE clinic_id=p_clinic_id
 AND doctor_user_id=auth.uid() AND starts_at<p_ends_at AND p_starts_at<ends_at) THEN
 RAISE EXCEPTION 'Availability overlap' USING ERRCODE='23505'; END IF;
 INSERT INTO public.tm_doctor_availability(clinic_id,doctor_user_id,source_request_id,starts_at,ends_at)
 VALUES(p_clinic_id,auth.uid(),p_source_request_id,p_starts_at,p_ends_at) RETURNING * INTO saved;
 RETURN to_jsonb(saved);
END;
$$;
REVOKE ALL ON FUNCTION public.tm_create_own_availability(uuid,uuid,timestamptz,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tm_create_own_availability(uuid,uuid,timestamptz,timestamptz) TO authenticated;
COMMIT;
