-- C024: visual identity only. No accounts, memberships or clinical grants are seeded.
BEGIN;
CREATE FUNCTION public.tm_valid_branding_image(value text) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path = '' AS $$
DECLARE parts text[]; payload bytea;
BEGIN
  IF value IS NULL THEN RETURN true; END IF;
  IF char_length(value) > 275000 THEN RETURN false; END IF;
  parts := regexp_match(value, '^data:image/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$');
  IF parts IS NULL THEN RETURN false; END IF;
  payload := decode(parts[2], 'base64');
  IF octet_length(payload) > 204800 OR replace(encode(payload,'base64'), E'\n','') <> parts[2] THEN RETURN false; END IF;
  RETURN CASE parts[1]
    WHEN 'png' THEN encode(substring(payload FROM 1 FOR 8),'hex') = '89504e470d0a1a0a'
    WHEN 'jpeg' THEN encode(substring(payload FROM 1 FOR 3),'hex') = 'ffd8ff'
    WHEN 'webp' THEN encode(substring(payload FROM 1 FOR 4),'hex') = '52494646'
      AND encode(substring(payload FROM 9 FOR 4),'hex') = '57454250'
    ELSE false END;
EXCEPTION WHEN OTHERS THEN RETURN false;
END;
$$;
CREATE FUNCTION public.tm_valid_branding(value jsonb) RETURNS boolean
LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT COALESCE(jsonb_typeof(value) = 'object'
    AND value - ARRAY['name','primary','secondary','mode','logo','favicon'] = '{}'::jsonb
    AND octet_length(value::text) <= 560000
    AND jsonb_typeof(value->'name') = 'string' AND char_length(btrim(value->>'name')) >= 1 AND char_length(value->>'name') <= 80
    AND jsonb_typeof(value->'primary') = 'string' AND value->>'primary' ~ '^#[0-9a-fA-F]{6}$'
    AND jsonb_typeof(value->'secondary') = 'string' AND value->>'secondary' ~ '^#[0-9a-fA-F]{6}$'
    AND jsonb_typeof(value->'mode') = 'string' AND value->>'mode' IN ('light','dark')
    AND (NOT value ? 'logo' OR jsonb_typeof(value->'logo') = 'string')
    AND (NOT value ? 'favicon' OR jsonb_typeof(value->'favicon') = 'string')
    AND public.tm_valid_branding_image(value->>'logo') AND public.tm_valid_branding_image(value->>'favicon'), false);
$$;
CREATE TABLE public.tm_clinic_branding (
  clinic_id uuid PRIMARY KEY REFERENCES public.tm_clinics(id),
  preferences jsonb NOT NULL CHECK (public.tm_valid_branding(preferences)),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.tm_clinic_branding FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.tm_clinic_branding TO authenticated;
ALTER TABLE public.tm_clinic_branding ENABLE ROW LEVEL SECURITY;
CREATE POLICY tm_branding_read ON public.tm_clinic_branding FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.tm_platform_operators o WHERE o.user_id = (SELECT auth.uid()) AND o.is_active)
  OR EXISTS (SELECT 1 FROM public.tm_clinics c JOIN public.tm_memberships m ON m.clinic_id = c.id
    WHERE c.id = tm_clinic_branding.clinic_id AND c.is_active AND m.user_id = (SELECT auth.uid()) AND m.is_active
    AND (m.role <> 'paciente' OR EXISTS (SELECT 1 FROM public.tm_patients p
      WHERE p.id = m.patient_id AND p.clinic_id = c.id AND p.user_id = m.user_id AND p.is_active))));
ALTER TABLE public.tm_admin_audit DROP CONSTRAINT tm_admin_audit_action_check;
ALTER TABLE public.tm_admin_audit ADD CONSTRAINT tm_admin_audit_action_check
  CHECK (action IN ('clinic_created','clinic_updated','branding_updated'));
CREATE FUNCTION public.tm_save_branding(p_clinic_id uuid, p_preferences jsonb, p_expected_revision integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE saved public.tm_clinic_branding%ROWTYPE; previous jsonb; fields text[];
BEGIN
  IF auth.uid() IS NULL OR NOT (
    EXISTS (SELECT 1 FROM public.tm_platform_operators o WHERE o.user_id = auth.uid() AND o.is_active)
    OR EXISTS (SELECT 1 FROM public.tm_memberships m JOIN public.tm_clinics c ON c.id=m.clinic_id
      JOIN public.tm_membership_grants g ON g.membership_id=m.id
      WHERE m.user_id=auth.uid() AND m.clinic_id=p_clinic_id AND m.role='admin' AND m.is_active AND c.is_active
      AND g.resource='cadastro_clinica' AND g.action='write')) THEN
    RAISE EXCEPTION 'Administrative access denied' USING ERRCODE='42501';
  END IF;
  IF p_clinic_id IS NULL OR p_expected_revision IS NULL OR p_expected_revision < 0 OR p_expected_revision > 2147483646
    OR NOT public.tm_valid_branding(p_preferences) THEN
    RAISE EXCEPTION 'Invalid branding input' USING ERRCODE='22023';
  END IF;
  -- One lock per clinic serializes initial insert and updates without trusting caller-supplied actor.
  PERFORM 1 FROM public.tm_clinics WHERE id=p_clinic_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Clinic unavailable' USING ERRCODE='22023'; END IF;
  SELECT preferences INTO previous FROM public.tm_clinic_branding WHERE clinic_id=p_clinic_id;
  IF p_expected_revision=0 THEN
    INSERT INTO public.tm_clinic_branding(clinic_id,preferences) VALUES (p_clinic_id,p_preferences)
      ON CONFLICT (clinic_id) DO NOTHING RETURNING * INTO saved;
  ELSE
    UPDATE public.tm_clinic_branding SET preferences=p_preferences, revision=revision+1, updated_at=now()
      WHERE clinic_id=p_clinic_id AND revision=p_expected_revision RETURNING * INTO saved;
  END IF;
  IF saved.clinic_id IS NULL THEN RAISE EXCEPTION 'Branding changed' USING ERRCODE='40001'; END IF;
  SELECT COALESCE(array_agg(key ORDER BY key), ARRAY[]::text[]) INTO fields
    FROM unnest(ARRAY['name','primary','secondary','mode','logo','favicon']) AS key
    WHERE p_preferences->key IS DISTINCT FROM previous->key;
  INSERT INTO public.tm_admin_audit(actor_user_id,clinic_id,action,changed_fields)
    VALUES (auth.uid(),p_clinic_id,'branding_updated',fields);
  RETURN jsonb_build_object('clinic_id',saved.clinic_id,'preferences',saved.preferences,
    'revision',saved.revision,'updated_at',saved.updated_at);
END;
$$;
REVOKE ALL ON FUNCTION public.tm_valid_branding_image(text), public.tm_valid_branding(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tm_save_branding(uuid,jsonb,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tm_save_branding(uuid,jsonb,integer) TO authenticated;
COMMIT;
