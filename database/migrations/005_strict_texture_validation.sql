-- C032: correção aditiva de presença/tipo e allowlist de texturas.
-- Permite catálogo padrão e imagens exclusivas da clínica com validação de assinatura e base64; não equivale a decodificação integral.
BEGIN;

-- Função auxiliar para validar URLs/imagens de textura (padrão ou base64 seguro até 5MB)
CREATE OR REPLACE FUNCTION public.tm_valid_branding_texture(value text) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path = '' AS $$
DECLARE parts text[]; payload bytea;
BEGIN
  IF value IS NULL THEN RETURN true; END IF;
  -- URLs padrão conhecidas e controladas da aplicação
  IF value IN ('/textures/texture-1.jpg','/textures/texture-2.jpg','/textures/texture-3.jpg','/textures/texture-4.jpg','/patient-mobile-texture.jpg','/patient-mobile-texture.jpg?v=2') THEN
    RETURN char_length(value) <= 128;
  END IF;
  -- Imagens personalizadas enviadas pela clínica em base64 (até 7.000.000 caracteres base64 ~ 5.242.880 bytes decodificados)
  IF char_length(value) > 7000000 THEN RETURN false; END IF;
  parts := regexp_match(value, '^data:image/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$');
  IF parts IS NULL THEN RETURN false; END IF;
  payload := decode(parts[2], 'base64');
  IF octet_length(payload) > 5242880 OR replace(encode(payload,'base64'), E'\n','') <> parts[2] THEN
    RETURN false;
  END IF;
  RETURN CASE parts[1]
    WHEN 'png' THEN encode(substring(payload FROM 1 FOR 8),'hex') = '89504e470d0a1a0a'
    WHEN 'jpeg' THEN encode(substring(payload FROM 1 FOR 3),'hex') = 'ffd8ff'
    WHEN 'webp' THEN encode(substring(payload FROM 1 FOR 4),'hex') = '52494646'
      AND encode(substring(payload FROM 9 FOR 4),'hex') = '57454250'
    ELSE false END;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$;

-- Função auxiliar para validar item individual de textura personalizada
CREATE OR REPLACE FUNCTION public.tm_valid_custom_texture_item(item jsonb) RETURNS boolean
LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT COALESCE(
    jsonb_typeof(item) = 'object'
    AND item - ARRAY['id', 'name', 'url', 'createdAt'] = '{}'::jsonb
    AND jsonb_typeof(item->'id') = 'string'
    AND char_length(item->>'id') >= 1 AND char_length(item->>'id') <= 64
    AND jsonb_typeof(item->'name') = 'string'
    AND char_length(item->>'name') >= 1 AND char_length(item->>'name') <= 60
    AND jsonb_typeof(item->'url') = 'string'
    AND public.tm_valid_branding_texture(item->>'url')
    AND jsonb_typeof(item->'createdAt') = 'string'
    AND char_length(item->>'createdAt') >= 10 AND char_length(item->>'createdAt') <= 40,
    false
  );
$$;

-- Função principal de validação de preferências institucionais da clínica
CREATE OR REPLACE FUNCTION public.tm_valid_branding(value jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  elem jsonb;
  arr jsonb;
BEGIN
  IF value IS NULL OR jsonb_typeof(value) IS DISTINCT FROM 'object' THEN
    RETURN false;
  END IF;

  -- Apenas chaves estritamente autorizadas
  IF value - ARRAY[
    'name', 'primary', 'secondary', 'mode', 'logo', 'favicon',
    'textureId', 'textureUrl', 'customTextures',
    'texture_id', 'texture_url', 'custom_textures'
  ] <> '{}'::jsonb THEN
    RETURN false;
  END IF;

  IF octet_length(value::text) > 8000000 THEN RETURN false; END IF;

  IF jsonb_typeof(value->'name') IS DISTINCT FROM 'string'
    OR char_length(btrim(value->>'name')) < 1
    OR char_length(value->>'name') > 80 THEN
    RETURN false;
  END IF;

  IF jsonb_typeof(value->'primary') IS DISTINCT FROM 'string' OR value->>'primary' !~ '^#[0-9a-fA-F]{6}$' THEN
    RETURN false;
  END IF;

  IF jsonb_typeof(value->'secondary') IS DISTINCT FROM 'string' OR value->>'secondary' !~ '^#[0-9a-fA-F]{6}$' THEN
    RETURN false;
  END IF;

  IF jsonb_typeof(value->'mode') IS DISTINCT FROM 'string' OR value->>'mode' NOT IN ('light', 'dark') THEN
    RETURN false;
  END IF;

  IF value ? 'logo' AND (jsonb_typeof(value->'logo') IS DISTINCT FROM 'string' OR NOT public.tm_valid_branding_image(value->>'logo')) THEN
    RETURN false;
  END IF;

  IF value ? 'favicon' AND (jsonb_typeof(value->'favicon') IS DISTINCT FROM 'string' OR NOT public.tm_valid_branding_image(value->>'favicon')) THEN
    RETURN false;
  END IF;

  IF value ? 'textureId' AND (jsonb_typeof(value->'textureId') IS DISTINCT FROM 'string' OR char_length(value->>'textureId') > 64) THEN
    RETURN false;
  END IF;

  IF value ? 'texture_id' AND (jsonb_typeof(value->'texture_id') IS DISTINCT FROM 'string' OR char_length(value->>'texture_id') > 64) THEN
    RETURN false;
  END IF;

  IF value ? 'textureUrl' AND (jsonb_typeof(value->'textureUrl') IS DISTINCT FROM 'string' OR NOT public.tm_valid_branding_texture(value->>'textureUrl')) THEN
    RETURN false;
  END IF;

  IF value ? 'texture_url' AND (jsonb_typeof(value->'texture_url') IS DISTINCT FROM 'string' OR NOT public.tm_valid_branding_texture(value->>'texture_url')) THEN
    RETURN false;
  END IF;

  IF value ? 'customTextures' THEN
    arr := value->'customTextures';
    IF jsonb_typeof(arr) IS DISTINCT FROM 'array' OR jsonb_array_length(arr) > 20 THEN
      RETURN false;
    END IF;
    FOR elem IN SELECT * FROM jsonb_array_elements(arr) LOOP
      IF NOT public.tm_valid_custom_texture_item(elem) THEN
        RETURN false;
      END IF;
    END LOOP;
  END IF;

  IF value ? 'custom_textures' THEN
    arr := value->'custom_textures';
    IF jsonb_typeof(arr) IS DISTINCT FROM 'array' OR jsonb_array_length(arr) > 20 THEN
      RETURN false;
    END IF;
    FOR elem IN SELECT * FROM jsonb_array_elements(arr) LOOP
      IF NOT public.tm_valid_custom_texture_item(elem) THEN
        RETURN false;
      END IF;
    END LOOP;
  END IF;

  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$;

-- Atualização da RPC protegida de gravação de preferências com auditoria completa
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
