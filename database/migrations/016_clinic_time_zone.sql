-- D110: persistência do fuso horário IANA por clínica no cadastro oficial.
-- Additive migration. Coluna time_zone nullable, sem fuso automático para clínicas existentes.
BEGIN;

ALTER TABLE public.tm_clinics ADD COLUMN IF NOT EXISTS time_zone text DEFAULT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tm_clinics_time_zone_check'
  ) THEN
    ALTER TABLE public.tm_clinics ADD CONSTRAINT tm_clinics_time_zone_check
      CHECK (time_zone IS NULL OR (char_length(btrim(time_zone)) BETWEEN 1 AND 64 AND time_zone ~ '^[A-Za-z0-9_+\-]+(/[A-Za-z0-9_+\-]+)*$'));
  END IF;
END $$;

-- Atualização da função de auditoria para incluir time_zone nos campos modificados
CREATE OR REPLACE FUNCTION public.tm_audit_clinic_change() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE fields text[] := ARRAY[]::text[];
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.tm_platform_operators o
    WHERE o.user_id = auth.uid() AND o.is_active) THEN
    RAISE EXCEPTION 'Administrative access denied' USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'INSERT' THEN
    fields := ARRAY['name', 'is_active'];
    IF NEW.time_zone IS NOT NULL THEN
      fields := array_append(fields, 'time_zone');
    END IF;
  ELSE
    IF NEW.name IS DISTINCT FROM OLD.name THEN fields := array_append(fields, 'name'); END IF;
    IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN fields := array_append(fields, 'is_active'); END IF;
    IF NEW.time_zone IS DISTINCT FROM OLD.time_zone THEN fields := array_append(fields, 'time_zone'); END IF;
  END IF;
  INSERT INTO public.tm_admin_audit(actor_user_id, clinic_id, action, changed_fields)
    VALUES (auth.uid(), NEW.id, CASE WHEN TG_OP = 'INSERT' THEN 'clinic_created' ELSE 'clinic_updated' END, fields);
  RETURN NEW;
END;
$$;

-- Remove a sobrecarga anterior de 4 argumentos para evitar ambiguidade de resolução
DROP FUNCTION IF EXISTS public.tm_save_clinic(text, boolean, uuid, integer);

-- Cria a RPC segura com suporte a time_zone e proteção contra escrita concorrente
CREATE OR REPLACE FUNCTION public.tm_save_clinic(
  p_name text,
  p_is_active boolean,
  p_clinic_id uuid DEFAULT NULL,
  p_expected_revision integer DEFAULT NULL,
  p_time_zone text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  saved public.tm_clinics%ROWTYPE;
  v_time_zone text;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.tm_platform_operators o
    WHERE o.user_id = auth.uid() AND o.is_active) THEN
    RAISE EXCEPTION 'Administrative access denied' USING ERRCODE = '42501';
  END IF;

  IF p_name IS NULL OR char_length(btrim(p_name)) NOT BETWEEN 2 AND 160 OR p_is_active IS NULL
    OR (p_clinic_id IS NULL AND p_expected_revision IS NOT NULL)
    OR (p_clinic_id IS NOT NULL AND (p_expected_revision IS NULL OR p_expected_revision < 1)) THEN
    RAISE EXCEPTION 'Invalid clinic input' USING ERRCODE = '22023';
  END IF;

  IF p_time_zone IS NOT NULL THEN
    v_time_zone := btrim(p_time_zone);
    IF char_length(v_time_zone) NOT BETWEEN 1 AND 64
      OR v_time_zone !~ '^[A-Za-z0-9_+\-]+(/[A-Za-z0-9_+\-]+)*$'
      OR NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_timezone_names WHERE name = v_time_zone
      ) THEN
      RAISE EXCEPTION 'Invalid clinic input' USING ERRCODE = '22023';
    END IF;
  ELSE
    v_time_zone := NULL;
  END IF;

  IF p_clinic_id IS NULL THEN
    INSERT INTO public.tm_clinics(name, is_active, time_zone)
      VALUES (btrim(p_name), p_is_active, v_time_zone)
      RETURNING * INTO saved;
  ELSE
    -- Em atualizações, preserva o fuso horário existente se p_time_zone for NULL ou omitido
    UPDATE public.tm_clinics
      SET name = btrim(p_name),
          is_active = p_is_active,
          time_zone = CASE
            WHEN v_time_zone IS NOT NULL THEN v_time_zone
            ELSE public.tm_clinics.time_zone
          END,
          revision = revision + 1
      WHERE id = p_clinic_id AND revision = p_expected_revision
      RETURNING * INTO saved;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Clinic changed or unavailable' USING ERRCODE = '40001';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'id', saved.id,
    'name', saved.name,
    'is_active', saved.is_active,
    'time_zone', saved.time_zone,
    'created_at', saved.created_at,
    'revision', saved.revision
  );
END;
$$;

REVOKE ALL ON FUNCTION public.tm_save_clinic(text, boolean, uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tm_save_clinic(text, boolean, uuid, integer, text) TO authenticated;

COMMIT;
