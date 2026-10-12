-- C029: Suporte a seleção e envio de texturas para fundo do aplicativo do paciente.
-- Permite personalização com catálogo padrão e imagens associadas exclusivamente à clínica.
BEGIN;

CREATE OR REPLACE FUNCTION public.tm_valid_branding(value jsonb) RETURNS boolean
LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT COALESCE(
    jsonb_typeof(value) = 'object'
    AND value - ARRAY[
      'name', 'primary', 'secondary', 'mode', 'logo', 'favicon',
      'textureId', 'textureUrl', 'customTextures',
      'texture_id', 'texture_url', 'custom_textures'
    ] = '{}'::jsonb
    AND octet_length(value::text) <= 8000000
    AND jsonb_typeof(value->'name') = 'string'
    AND char_length(btrim(value->>'name')) >= 1
    AND char_length(value->>'name') <= 80
    AND jsonb_typeof(value->'primary') = 'string'
    AND value->>'primary' ~ '^#[0-9a-fA-F]{6}$'
    AND jsonb_typeof(value->'secondary') = 'string'
    AND value->>'secondary' ~ '^#[0-9a-fA-F]{6}$'
    AND jsonb_typeof(value->'mode') = 'string'
    AND value->>'mode' IN ('light', 'dark')
    AND (NOT value ? 'logo' OR jsonb_typeof(value->'logo') = 'string')
    AND (NOT value ? 'favicon' OR jsonb_typeof(value->'favicon') = 'string')
    AND public.tm_valid_branding_image(value->>'logo')
    AND public.tm_valid_branding_image(value->>'favicon')
    AND (NOT value ? 'textureId' OR (jsonb_typeof(value->'textureId') = 'string' AND char_length(value->>'textureId') <= 64))
    AND (NOT value ? 'texture_id' OR (jsonb_typeof(value->'texture_id') = 'string' AND char_length(value->>'texture_id') <= 64))
    AND (NOT value ? 'textureUrl' OR (jsonb_typeof(value->'textureUrl') = 'string' AND char_length(value->>'textureUrl') <= 7000000))
    AND (NOT value ? 'texture_url' OR (jsonb_typeof(value->'texture_url') = 'string' AND char_length(value->>'texture_url') <= 7000000))
    AND (NOT value ? 'customTextures' OR (jsonb_typeof(value->'customTextures') = 'array' AND jsonb_array_length(value->'customTextures') <= 20))
    AND (NOT value ? 'custom_textures' OR (jsonb_typeof(value->'custom_textures') = 'array' AND jsonb_array_length(value->'custom_textures') <= 20)),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.tm_save_branding(p_clinic_id uuid, p_preferences jsonb, p_expected_revision integer)
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
    FROM unnest(ARRAY[
      'name','primary','secondary','mode','logo','favicon',
      'textureId','textureUrl','customTextures'
    ]) AS key
    WHERE p_preferences->key IS DISTINCT FROM previous->key;
  INSERT INTO public.tm_admin_audit(actor_user_id,clinic_id,action,changed_fields)
    VALUES (auth.uid(),p_clinic_id,'branding_updated',fields);
  RETURN jsonb_build_object('clinic_id',saved.clinic_id,'preferences',saved.preferences,
    'revision',saved.revision,'updated_at',saved.updated_at);
END;
$$;

COMMIT;
