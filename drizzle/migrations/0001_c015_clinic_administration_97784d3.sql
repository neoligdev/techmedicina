-- C015: protected clinic writes and append-only administrative audit. No operator seed.
BEGIN;
ALTER TABLE public.tm_clinics ADD COLUMN revision integer NOT NULL DEFAULT 1 CHECK (revision > 0);

CREATE TABLE public.tm_admin_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NOT NULL,
  clinic_id uuid NOT NULL REFERENCES public.tm_clinics(id),
  action text NOT NULL CHECK (action IN ('clinic_created', 'clinic_updated')),
  changed_fields text[] NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.tm_admin_audit FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.tm_admin_audit TO authenticated;
ALTER TABLE public.tm_admin_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY tm_admin_audit_operator_read ON public.tm_admin_audit FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tm_platform_operators o
    WHERE o.user_id = (SELECT auth.uid()) AND o.is_active));

-- Invoker trigger runs with the protected write function's privileges. Audit cannot be supplied by caller.
CREATE FUNCTION public.tm_audit_clinic_change() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE fields text[] := ARRAY[]::text[];
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.tm_platform_operators o
    WHERE o.user_id = auth.uid() AND o.is_active) THEN
    RAISE EXCEPTION 'Administrative access denied' USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'INSERT' THEN
    fields := ARRAY['name', 'is_active'];
  ELSE
    IF NEW.name IS DISTINCT FROM OLD.name THEN fields := array_append(fields, 'name'); END IF;
    IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN fields := array_append(fields, 'is_active'); END IF;
  END IF;
  INSERT INTO public.tm_admin_audit(actor_user_id, clinic_id, action, changed_fields)
    VALUES (auth.uid(), NEW.id, CASE WHEN TG_OP = 'INSERT' THEN 'clinic_created' ELSE 'clinic_updated' END, fields);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.tm_audit_clinic_change() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER tm_clinic_audit AFTER INSERT OR UPDATE ON public.tm_clinics
  FOR EACH ROW EXECUTE FUNCTION public.tm_audit_clinic_change();

-- Definer is necessary for bounded writes: browser retains no direct INSERT/UPDATE privileges.
-- Every invocation checks persisted operator activity, never metadata/email or a supplied actor ID.
CREATE FUNCTION public.tm_save_clinic(p_name text, p_is_active boolean,
  p_clinic_id uuid DEFAULT NULL, p_expected_revision integer DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE saved public.tm_clinics%ROWTYPE;
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
  IF p_clinic_id IS NULL THEN
    INSERT INTO public.tm_clinics(name, is_active) VALUES (btrim(p_name), p_is_active) RETURNING * INTO saved;
  ELSE
    UPDATE public.tm_clinics SET name = btrim(p_name), is_active = p_is_active, revision = revision + 1
      WHERE id = p_clinic_id AND revision = p_expected_revision RETURNING * INTO saved;
    IF NOT FOUND THEN RAISE EXCEPTION 'Clinic changed or unavailable' USING ERRCODE = '40001'; END IF;
  END IF;
  RETURN jsonb_build_object('id', saved.id, 'name', saved.name, 'is_active', saved.is_active,
    'created_at', saved.created_at, 'revision', saved.revision);
END;
$$;
REVOKE ALL ON FUNCTION public.tm_save_clinic(text, boolean, uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tm_save_clinic(text, boolean, uuid, integer) TO authenticated;
COMMIT;
