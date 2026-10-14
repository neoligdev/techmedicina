-- VJE-5 LOCAL ONLY: Shield state persistence, immutable historical ledger and deterministic idempotent transitions.
BEGIN;

-- 1. Ampliar a constraint de recursos para incluir 'journey_shields'
ALTER TABLE public.tm_membership_grants DROP CONSTRAINT tm_membership_grants_resource_check;
ALTER TABLE public.tm_membership_grants ADD CONSTRAINT tm_membership_grants_resource_check
  CHECK (resource IN ('cadastro_clinica','prontuario','paciente','agenda','faturamento','journey_goals','journey_events','journey_shields'));

-- 2. Função de ranking determinístico para comparação de níveis de Escudos
CREATE OR REPLACE FUNCTION public.tm_shield_rank(s text)
RETURNS integer LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT CASE s
    WHEN 'origem' THEN 1
    WHEN 'ritmo' THEN 2
    WHEN 'avanco' THEN 3
    WHEN 'equilibrio' THEN 4
    WHEN 'plenitude' THEN 5
    ELSE 0
  END;
$$;

-- 3. Tabela de estado atual do Escudo do paciente (1 registro por paciente por clínica)
CREATE TABLE public.tm_patient_shield_states (
  clinic_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  patient_user_id uuid NOT NULL,
  active_shield text NOT NULL CHECK (active_shield IN ('origem','ritmo','avanco','equilibrio','plenitude')),
  highest_shield_earned text NOT NULL CHECK (highest_shield_earned IN ('origem','ritmo','avanco','equilibrio','plenitude')),
  is_provisional boolean NOT NULL DEFAULT true,
  score_average numeric(5,2),
  score_average_rounded integer,
  evaluable_days_count integer NOT NULL DEFAULT 0 CHECK (evaluable_days_count >= 0 AND evaluable_days_count <= 7),
  consecutive_low_days integer NOT NULL DEFAULT 0 CHECK (consecutive_low_days >= 0),
  last_evaluated_date date,
  evaluated_at timestamptz NOT NULL DEFAULT now(),
  rules_version text NOT NULL DEFAULT 'v0.11.3',
  recent_action text NOT NULL CHECK (recent_action IN ('initial','promotion','maintenance','regression','reacquisition')),
  reason text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (clinic_id, patient_id),
  FOREIGN KEY (patient_id, clinic_id, patient_user_id) REFERENCES public.tm_patients(id, clinic_id, user_id)
);

-- 4. Tabela de histórico permanente e imutável de conquistas, promoções e regressões
CREATE TABLE public.tm_shield_history_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  patient_user_id uuid NOT NULL,
  idempotency_key text NOT NULL,
  action text NOT NULL CHECK (action IN ('initial','promotion','maintenance','regression','reacquisition')),
  shield text NOT NULL CHECK (shield IN ('origem','ritmo','avanco','equilibrio','plenitude')),
  previous_shield text CHECK (previous_shield IS NULL OR previous_shield IN ('origem','ritmo','avanco','equilibrio','plenitude')),
  highest_shield_earned text NOT NULL CHECK (highest_shield_earned IN ('origem','ritmo','avanco','equilibrio','plenitude')),
  evaluated_date date NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  score_average numeric(5,2),
  evaluable_days_count integer NOT NULL CHECK (evaluable_days_count >= 0 AND evaluable_days_count <= 7),
  consecutive_low_days integer NOT NULL DEFAULT 0,
  vitality_snapshot text DEFAULT NULL,
  rules_version text NOT NULL DEFAULT 'v0.11.3',
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, patient_id, idempotency_key),
  FOREIGN KEY (patient_id, clinic_id, patient_user_id) REFERENCES public.tm_patients(id, clinic_id, user_id)
);

-- Trigger de imutabilidade estrita do ledger histórico
CREATE OR REPLACE FUNCTION public.tm_prevent_shield_history_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Historical shield events are strictly immutable' USING ERRCODE='42501';
END;
$$;

DROP TRIGGER IF EXISTS tm_shield_history_immutable_trg ON public.tm_shield_history_events;
CREATE TRIGGER tm_shield_history_immutable_trg
  BEFORE UPDATE OR DELETE ON public.tm_shield_history_events
  FOR EACH ROW EXECUTE FUNCTION public.tm_prevent_shield_history_mutation();

-- 5. Ativação de Row Level Security (RLS)
ALTER TABLE public.tm_patient_shield_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tm_shield_history_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.tm_patient_shield_states, public.tm_shield_history_events FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.tm_patient_shield_states, public.tm_shield_history_events TO authenticated;

-- 6. Atualizar função de permissão de leitura para contemplar journey_shields
CREATE OR REPLACE FUNCTION public.tm_can_read_journey_patient(p_clinic_id uuid, p_patient_id uuid, p_resource text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT p_resource IN ('journey_goals','journey_events','journey_shields') AND (
    EXISTS (
      SELECT 1 FROM public.tm_platform_operators o
      WHERE o.user_id = auth.uid() AND o.is_active AND o.role = 'super_admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.tm_memberships m
      JOIN public.tm_membership_grants g ON g.membership_id=m.id
      JOIN public.tm_clinics c ON c.id=m.clinic_id
      JOIN public.tm_patients p ON p.id=p_patient_id AND p.clinic_id=c.id
      WHERE m.user_id=auth.uid() AND m.clinic_id=p_clinic_id AND m.is_active AND c.is_active AND p.is_active
      AND g.resource IN (p_resource, 'journey_goals') AND g.action='read'
      AND ((m.role='paciente' AND m.patient_id=p.id) OR (m.role='medico' AND m.medical_identity_verified))
    )
  );
$$;

REVOKE ALL ON FUNCTION public.tm_can_read_journey_patient(uuid,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tm_can_read_journey_patient(uuid,uuid,text) TO authenticated;

-- Políticas de RLS para leitura
CREATE POLICY tm_patient_shield_state_read ON public.tm_patient_shield_states FOR SELECT TO authenticated
  USING (public.tm_can_read_journey_patient(clinic_id, patient_id, 'journey_shields'));

CREATE POLICY tm_shield_history_event_read ON public.tm_shield_history_events FOR SELECT TO authenticated
  USING (public.tm_can_read_journey_patient(clinic_id, patient_id, 'journey_shields'));

-- 7. RPC Segura de Transição e Gravação Atômica (SECURITY DEFINER)
-- Bloqueia categoricamente tentativas de clientes comuns forjarem escudos ou pontuações
CREATE OR REPLACE FUNCTION public.tm_save_patient_shield_transition(
  p_clinic_id uuid,
  p_patient_id uuid,
  p_active_shield text,
  p_highest_shield text,
  p_is_provisional boolean,
  p_score_average numeric,
  p_score_average_rounded integer,
  p_evaluable_days_count integer,
  p_consecutive_low_days integer,
  p_target_date date,
  p_recent_action text,
  p_reason text,
  p_history_event jsonb DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  v_patient_user uuid;
  saved_state public.tm_patient_shield_states%ROWTYPE;
  saved_event public.tm_shield_history_events%ROWTYPE;
  event_id uuid;
  event_idempotency_key text;
  v_is_authorized boolean := false;
BEGIN
  -- 1. Bloqueio transacional determinístico por clínica e paciente para eliminar qualquer corrida concorrente
  -- Protege mesmo a primeira criação antes que a linha exista fisicamente na tabela
  PERFORM pg_advisory_xact_lock(hashtext('shield_state:' || p_clinic_id::text || ':' || p_patient_id::text));

  -- 2. Validação estrita de autorização de escrita para escudos
  -- Clientes comuns (role = 'paciente') NUNCA podem chamar esta função diretamente ou gravar cálculos manuais
  IF auth.uid() IS NOT NULL THEN
    -- Operador da plataforma (Super Admin)
    IF EXISTS (SELECT 1 FROM public.tm_platform_operators o WHERE o.user_id = auth.uid() AND o.is_active AND o.role = 'super_admin') THEN
      v_is_authorized := true;
    -- Profissional médico verificado com grant específico de escrita em journey_shields
    ELSIF EXISTS (
      SELECT 1 FROM public.tm_memberships m
      JOIN public.tm_membership_grants g ON g.membership_id=m.id
      WHERE m.user_id=auth.uid() AND m.clinic_id=p_clinic_id AND m.is_active
      AND m.role IN ('medico','admin_clinica') AND m.medical_identity_verified
      AND g.resource='journey_shields' AND g.action IN ('create','write','manage')
    ) THEN
      v_is_authorized := true;
    END IF;
  ELSIF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    v_is_authorized := true;
  END IF;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Shield transition write denied: patients and unauthorized roles cannot mutate shield calculations or history directly' USING ERRCODE='42501';
  END IF;

  -- 3. Validação de integridade da clínica e do paciente
  SELECT p.user_id INTO v_patient_user FROM public.tm_patients p
    JOIN public.tm_clinics c ON c.id=p.clinic_id
    WHERE p.id=p_patient_id AND p.clinic_id=p_clinic_id AND p.is_active AND c.is_active FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shield transition denied: patient not found in clinic' USING ERRCODE='42501';
  END IF;

  -- 4. Upsert do estado consolidado com garantia de não-regressão do maior escudo histórico
  INSERT INTO public.tm_patient_shield_states(
    clinic_id, patient_id, patient_user_id, active_shield, highest_shield_earned,
    is_provisional, score_average, score_average_rounded, evaluable_days_count,
    consecutive_low_days, last_evaluated_date, evaluated_at, rules_version,
    recent_action, reason, updated_at
  )
  VALUES (
    p_clinic_id, p_patient_id, v_patient_user, p_active_shield, p_highest_shield,
    p_is_provisional, p_score_average, p_score_average_rounded, p_evaluable_days_count,
    p_consecutive_low_days, p_target_date, now(), 'v0.11.3',
    p_recent_action, p_reason, now()
  )
  ON CONFLICT (clinic_id, patient_id) DO UPDATE SET
    active_shield = EXCLUDED.active_shield,
    highest_shield_earned = CASE
      WHEN public.tm_shield_rank(EXCLUDED.highest_shield_earned) > public.tm_shield_rank(public.tm_patient_shield_states.highest_shield_earned)
      THEN EXCLUDED.highest_shield_earned
      ELSE public.tm_patient_shield_states.highest_shield_earned
    END,
    is_provisional = EXCLUDED.is_provisional,
    score_average = EXCLUDED.score_average,
    score_average_rounded = EXCLUDED.score_average_rounded,
    evaluable_days_count = EXCLUDED.evaluable_days_count,
    consecutive_low_days = EXCLUDED.consecutive_low_days,
    last_evaluated_date = EXCLUDED.last_evaluated_date,
    evaluated_at = now(),
    recent_action = EXCLUDED.recent_action,
    reason = EXCLUDED.reason,
    updated_at = now()
  RETURNING * INTO saved_state;

  -- 5. Inserção idempotente do evento histórico no ledger imutável se fornecido
  IF p_history_event IS NOT NULL AND (p_history_event->>'idempotencyKey') IS NOT NULL THEN
    event_idempotency_key := p_history_event->>'idempotencyKey';
    event_id := (p_history_event->>'id')::uuid;

    INSERT INTO public.tm_shield_history_events(
      id, clinic_id, patient_id, patient_user_id, idempotency_key, action, shield,
      previous_shield, highest_shield_earned, evaluated_date, occurred_at,
      score_average, evaluable_days_count, consecutive_low_days, vitality_snapshot,
      rules_version, reason
    )
    VALUES (
      event_id, p_clinic_id, p_patient_id, v_patient_user, event_idempotency_key,
      p_history_event->>'action', p_history_event->>'shield',
      NULLIF(p_history_event->>'previousShield', ''),
      p_history_event->>'highestShieldEarned',
      (p_history_event->>'evaluatedDate')::date,
      now(),
      (p_history_event->>'scoreAverage')::numeric,
      (p_history_event->>'evaluableDaysCount')::integer,
      COALESCE((p_history_event->>'consecutiveLowDays')::integer, 0),
      NULL, 'v0.11.3', p_history_event->>'reason'
    )
    ON CONFLICT (clinic_id, patient_id, idempotency_key) DO NOTHING
    RETURNING * INTO saved_event;

    -- Se já existia pela chave de idempotência, recupera para retorno consistente
    IF saved_event.id IS NULL THEN
      SELECT * INTO saved_event FROM public.tm_shield_history_events
        WHERE clinic_id=p_clinic_id AND patient_id=p_patient_id AND idempotency_key=event_idempotency_key;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'state', to_jsonb(saved_state),
    'event', CASE WHEN saved_event.id IS NOT NULL THEN to_jsonb(saved_event) ELSE NULL END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.tm_save_patient_shield_transition(uuid,uuid,text,text,boolean,numeric,integer,integer,integer,date,text,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tm_save_patient_shield_transition(uuid,uuid,text,text,boolean,numeric,integer,integer,integer,date,text,text,jsonb) TO authenticated;

-- 8. RPC Segura de Leitura Consolidada para o PWA (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.tm_get_patient_shield_overview(p_clinic_id uuid, p_patient_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE
  v_state jsonb;
  v_history jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE='42501';
  END IF;

  IF NOT public.tm_can_read_journey_patient(p_clinic_id, p_patient_id, 'journey_shields') THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE='42501';
  END IF;

  SELECT to_jsonb(s) INTO v_state FROM public.tm_patient_shield_states s
    WHERE s.clinic_id=p_clinic_id AND s.patient_id=p_patient_id;

  SELECT jsonb_agg(to_jsonb(h) ORDER BY h.occurred_at DESC) INTO v_history
    FROM public.tm_shield_history_events h
    WHERE h.clinic_id=p_clinic_id AND h.patient_id=p_patient_id;

  RETURN jsonb_build_object(
    'state', v_state,
    'history', COALESCE(v_history, '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.tm_get_patient_shield_overview(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tm_get_patient_shield_overview(uuid,uuid) TO authenticated;

COMMIT;
