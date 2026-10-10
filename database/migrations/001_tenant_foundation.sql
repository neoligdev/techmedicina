-- C013: additive tenant foundation. No accounts, memberships or privileges are seeded.
-- Applied through Lovable Cloud; keep generated drizzle files under Lovable management.
BEGIN;

CREATE TABLE public.tm_clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 160),
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Opaque patient/account association only; no medical or personal content in this foundation.
CREATE TABLE public.tm_patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.tm_clinics(id),
  user_id uuid REFERENCES auth.users(id),
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, clinic_id, user_id),
  UNIQUE (clinic_id, user_id)
);

CREATE TABLE public.tm_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.tm_clinics(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  role text NOT NULL CHECK (role IN ('admin', 'medico', 'paciente')),
  is_active boolean NOT NULL DEFAULT false,
  medical_identity_verified boolean NOT NULL DEFAULT false,
  patient_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, user_id),
  CHECK ((role = 'paciente' AND patient_id IS NOT NULL) OR (role <> 'paciente' AND patient_id IS NULL)),
  CHECK (role = 'medico' OR medical_identity_verified = false),
  FOREIGN KEY (patient_id, clinic_id, user_id) REFERENCES public.tm_patients(id, clinic_id, user_id)
);

CREATE TABLE public.tm_membership_grants (
  membership_id uuid NOT NULL REFERENCES public.tm_memberships(id),
  resource text NOT NULL CHECK (resource IN ('cadastro_clinica', 'prontuario', 'paciente', 'agenda', 'faturamento')),
  action text NOT NULL CHECK (action IN ('create', 'read', 'write', 'delete', 'manage')),
  PRIMARY KEY (membership_id, resource, action)
);

CREATE TABLE public.tm_platform_operators (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id),
  role text NOT NULL CHECK (role = 'super_admin'),
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tm_clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tm_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tm_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tm_membership_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tm_platform_operators ENABLE ROW LEVEL SECURITY;

-- No browser writes, no public/anonymous data, no self-promotion or role metadata trust.
REVOKE ALL ON public.tm_clinics, public.tm_patients, public.tm_memberships,
  public.tm_membership_grants, public.tm_platform_operators FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.tm_clinics, public.tm_patients, public.tm_memberships,
  public.tm_membership_grants, public.tm_platform_operators TO authenticated;

CREATE POLICY tm_membership_self_read ON public.tm_memberships FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY tm_operator_self_read ON public.tm_platform_operators FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY tm_grant_self_read ON public.tm_membership_grants FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tm_memberships m
    WHERE m.id = public.tm_membership_grants.membership_id AND m.user_id = (SELECT auth.uid())));
CREATE POLICY tm_clinic_read ON public.tm_clinics FOR SELECT TO authenticated
  USING ((is_active AND EXISTS (SELECT 1 FROM public.tm_memberships m
    WHERE m.clinic_id = public.tm_clinics.id AND m.user_id = (SELECT auth.uid()) AND m.is_active))
    OR EXISTS (SELECT 1 FROM public.tm_platform_operators o
      WHERE o.user_id = (SELECT auth.uid()) AND o.is_active));
CREATE POLICY tm_patient_self_read ON public.tm_patients FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) AND is_active AND EXISTS (
    SELECT 1 FROM public.tm_clinics c WHERE c.id = public.tm_patients.clinic_id AND c.is_active));

-- Invoker rights retain RLS; the caller cannot supply another user's ID.
CREATE FUNCTION public.tm_resolve_identity() RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'userId', auth.uid(),
    'globalRole', (SELECT o.role FROM public.tm_platform_operators o
      WHERE o.user_id = auth.uid() AND o.is_active),
    'links', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'clinicId', m.clinic_id, 'role', m.role, 'isActive', true,
      'medicalIdentityVerified', m.medical_identity_verified,
      'patientId', m.patient_id,
      'grants', COALESCE((SELECT jsonb_agg(jsonb_build_object('resource', g.resource, 'action', g.action))
        FROM public.tm_membership_grants g WHERE g.membership_id = m.id), '[]'::jsonb)
    ) ORDER BY m.clinic_id)
      FROM public.tm_memberships m JOIN public.tm_clinics c ON c.id = m.clinic_id
      WHERE m.user_id = auth.uid() AND m.is_active AND c.is_active
      AND (m.role <> 'paciente' OR EXISTS (SELECT 1 FROM public.tm_patients p
        WHERE p.id = m.patient_id AND p.clinic_id = m.clinic_id
        AND p.user_id = auth.uid() AND p.is_active))), '[]'::jsonb)
  ) WHERE auth.uid() IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.tm_resolve_identity() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tm_resolve_identity() TO authenticated;

COMMIT;
