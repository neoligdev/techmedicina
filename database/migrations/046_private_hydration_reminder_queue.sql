-- LOCAL proposal 046. Private worker queue only; no role grants, scheduler or provider activation.
BEGIN;
CREATE TABLE public.tm_hydration_reminder_jobs(
 id uuid PRIMARY KEY,clinic_id uuid NOT NULL,patient_id uuid NOT NULL,patient_user_id uuid NOT NULL,
 slot_key text NOT NULL UNIQUE,local_date date NOT NULL,local_time text NOT NULL CHECK(local_time~'^([01][0-9]|2[0-3]):[0-5][0-9]$'),
 preferences_revision integer NOT NULL CHECK(preferences_revision>0),scheduled_at timestamptz NOT NULL,expires_at timestamptz NOT NULL,
 revision integer NOT NULL,status text NOT NULL,attempt_id uuid UNIQUE,reason text,provider_receipt_id text,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 FOREIGN KEY(patient_id,clinic_id,patient_user_id) REFERENCES public.tm_patients(id,clinic_id,user_id),
 UNIQUE(clinic_id,patient_id,local_date,local_time),
 CHECK(isfinite(scheduled_at) AND isfinite(expires_at) AND extract(epoch FROM scheduled_at)::numeric % 60=0 AND expires_at=scheduled_at+interval '1 minute'),
 CHECK(slot_key=clinic_id::text||':'||patient_id::text||':'||to_char(local_date,'YYYY-MM-DD')||':'||local_time),
 CHECK((status='queued' AND revision=1 AND attempt_id IS NULL) OR (status='claimed' AND revision=2 AND attempt_id IS NOT NULL) OR (status='dispatching' AND revision=3 AND attempt_id IS NOT NULL) OR (status IN ('accepted','rejected','uncertain') AND revision=4 AND attempt_id IS NOT NULL) OR (status IN ('cancelled','expired') AND revision IN (3,4) AND attempt_id IS NOT NULL)),
 CHECK(coalesce((status IN ('queued','claimed','dispatching') AND reason IS NULL AND provider_receipt_id IS NULL) OR (status='accepted' AND reason IS NULL AND length(provider_receipt_id) BETWEEN 1 AND 200) OR (status='rejected' AND reason='provider_rejected' AND provider_receipt_id IS NULL) OR (status='uncertain' AND reason='provider_uncertain' AND provider_receipt_id IS NULL) OR (status='cancelled' AND reason IN ('not_authorized','authorization_unavailable') AND provider_receipt_id IS NULL) OR (status='expired' AND reason='expired' AND provider_receipt_id IS NULL),false))
);
ALTER TABLE public.tm_hydration_reminder_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tm_hydration_reminder_jobs FROM PUBLIC,anon,authenticated;
CREATE INDEX tm_hydration_reminder_due_idx ON public.tm_hydration_reminder_jobs(scheduled_at,id) WHERE status='queued';
CREATE FUNCTION public.tm_hydration_reminder_job_json(p public.tm_hydration_reminder_jobs) RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT jsonb_build_object('id',p.id,'clinicId',p.clinic_id,'patientId',p.patient_id,'slotKey',p.slot_key,'preferencesRevision',p.preferences_revision,'scheduledAt',to_char(p.scheduled_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'expiresAt',to_char(p.expires_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'revision',p.revision,'status',p.status,'attemptId',p.attempt_id,'reason',p.reason,'providerReceiptId',p.provider_receipt_id);
$$;
CREATE FUNCTION public.tm_enqueue_hydration_reminder(p_id uuid,p_clinic_id uuid,p_patient_id uuid,p_scheduled_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE pref public.tm_hydration_preferences%ROWTYPE; item public.tm_hydration_reminder_jobs%ROWTYPE; target_date date; target_time text; target_key text;
BEGIN
 IF p_id IS NULL OR p_clinic_id IS NULL OR p_patient_id IS NULL OR p_scheduled_at IS NULL OR NOT isfinite(p_scheduled_at) OR extract(epoch FROM p_scheduled_at)::numeric % 60<>0 THEN RAISE EXCEPTION 'Invalid occurrence' USING ERRCODE='22023'; END IF;
 SELECT f.* INTO pref FROM public.tm_hydration_preferences f
 JOIN public.tm_clinics c ON c.id=f.clinic_id AND c.is_active
 JOIN public.tm_patients p ON p.id=f.patient_id AND p.clinic_id=f.clinic_id AND p.user_id=f.patient_user_id AND p.is_active
 JOIN public.tm_memberships m ON m.clinic_id=f.clinic_id AND m.patient_id=f.patient_id AND m.user_id=f.patient_user_id AND m.role='paciente' AND m.is_active
 JOIN public.tm_membership_grants g ON g.membership_id=m.id AND g.resource='hydration_records' AND g.action='read'
 WHERE f.clinic_id=p_clinic_id AND f.patient_id=p_patient_id
 AND (SELECT count(*) FROM public.tm_memberships x WHERE x.clinic_id=f.clinic_id AND x.user_id=f.patient_user_id AND x.is_active)=1 FOR SHARE OF f,c,p,m,g;
 IF NOT FOUND OR pref.settings->>'remindersEnabled'<>'true' THEN RAISE EXCEPTION 'Preferences not authorized' USING ERRCODE='42501'; END IF;
 IF pref.settings->>'timeZone' NOT IN ('America/Bahia','America/Sao_Paulo','UTC') THEN RAISE EXCEPTION 'Invalid timezone' USING ERRCODE='22023'; END IF;
 target_date:=(p_scheduled_at AT TIME ZONE (pref.settings->>'timeZone'))::date;target_time:=to_char(p_scheduled_at AT TIME ZONE (pref.settings->>'timeZone'),'HH24:MI');
 IF NOT((pref.settings->'reminderTimes') ? target_time) THEN RAISE EXCEPTION 'Time not configured' USING ERRCODE='22023'; END IF;
 target_key:=p_clinic_id::text||':'||p_patient_id::text||':'||to_char(target_date,'YYYY-MM-DD')||':'||target_time;
 INSERT INTO public.tm_hydration_reminder_jobs(id,clinic_id,patient_id,patient_user_id,slot_key,local_date,local_time,preferences_revision,scheduled_at,expires_at,revision,status)
 VALUES(p_id,p_clinic_id,p_patient_id,pref.patient_user_id,target_key,target_date,target_time,pref.revision,p_scheduled_at,p_scheduled_at+interval '1 minute',1,'queued')
 ON CONFLICT(slot_key) DO NOTHING RETURNING * INTO item;
 IF NOT FOUND THEN SELECT * INTO item FROM public.tm_hydration_reminder_jobs WHERE slot_key=target_key AND clinic_id=p_clinic_id AND patient_id=p_patient_id; IF NOT FOUND THEN RAISE EXCEPTION 'Occurrence not visible' USING ERRCODE='40001'; END IF; END IF;
 RETURN public.tm_hydration_reminder_job_json(item);
END; $$;
CREATE FUNCTION public.tm_get_hydration_reminder_job(p_id uuid) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 SELECT public.tm_hydration_reminder_job_json(j) FROM public.tm_hydration_reminder_jobs j WHERE j.id=p_id;
$$;
CREATE FUNCTION public.tm_list_due_hydration_reminders(p_now timestamptz,p_limit integer DEFAULT 25) RETURNS SETOF uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF p_now IS NULL OR NOT isfinite(p_now) OR p_limit IS NULL OR p_limit<1 OR p_limit>100 THEN RAISE EXCEPTION 'Invalid range' USING ERRCODE='22023'; END IF;
 RETURN QUERY SELECT j.id FROM public.tm_hydration_reminder_jobs j WHERE j.status='queued' AND j.scheduled_at<=p_now ORDER BY j.scheduled_at,j.id LIMIT p_limit;
END; $$;
CREATE FUNCTION public.tm_claim_hydration_reminder(p_id uuid,p_expected_revision integer,p_attempt_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item public.tm_hydration_reminder_jobs%ROWTYPE;
BEGIN
 IF p_id IS NULL OR p_expected_revision IS NULL OR p_expected_revision<>1 OR p_attempt_id IS NULL THEN RAISE EXCEPTION 'Invalid claim' USING ERRCODE='22023'; END IF;
 UPDATE public.tm_hydration_reminder_jobs SET status='claimed',revision=revision+1,attempt_id=p_attempt_id,updated_at=clock_timestamp() WHERE id=p_id AND revision=p_expected_revision AND status='queued' RETURNING * INTO item;
 IF NOT FOUND THEN RETURN NULL; END IF;RETURN public.tm_hydration_reminder_job_json(item);
END; $$;
CREATE FUNCTION public.tm_transition_hydration_reminder(p_id uuid,p_expected_revision integer,p_attempt_id uuid,p_status text,p_reason text DEFAULT NULL,p_provider_receipt_id text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item public.tm_hydration_reminder_jobs%ROWTYPE;
BEGIN
 IF p_id IS NULL OR p_expected_revision IS NULL OR p_expected_revision NOT IN (2,3) OR p_attempt_id IS NULL OR p_status IS NULL THEN RAISE EXCEPTION 'Invalid transition' USING ERRCODE='22023'; END IF;
 IF NOT coalesce((p_status='dispatching' AND p_reason IS NULL AND p_provider_receipt_id IS NULL) OR (p_status='accepted' AND p_reason IS NULL AND length(p_provider_receipt_id) BETWEEN 1 AND 200) OR (p_status='rejected' AND p_reason='provider_rejected' AND p_provider_receipt_id IS NULL) OR (p_status='uncertain' AND p_reason='provider_uncertain' AND p_provider_receipt_id IS NULL) OR (p_status='cancelled' AND p_reason IN ('not_authorized','authorization_unavailable') AND p_provider_receipt_id IS NULL) OR (p_status='expired' AND p_reason='expired' AND p_provider_receipt_id IS NULL),false) THEN RAISE EXCEPTION 'Invalid outcome' USING ERRCODE='22023'; END IF;
 UPDATE public.tm_hydration_reminder_jobs SET status=p_status,reason=p_reason,provider_receipt_id=p_provider_receipt_id,revision=revision+1,updated_at=clock_timestamp()
 WHERE id=p_id AND revision=p_expected_revision AND attempt_id=p_attempt_id AND ((status='claimed' AND p_status IN ('dispatching','cancelled','expired')) OR (status='dispatching' AND p_status IN ('accepted','rejected','uncertain','cancelled','expired'))) RETURNING * INTO item;
 IF NOT FOUND THEN RETURN NULL; END IF;RETURN public.tm_hydration_reminder_job_json(item);
END; $$;
REVOKE ALL ON FUNCTION public.tm_hydration_reminder_job_json(public.tm_hydration_reminder_jobs),public.tm_enqueue_hydration_reminder(uuid,uuid,uuid,timestamptz),public.tm_get_hydration_reminder_job(uuid),public.tm_list_due_hydration_reminders(timestamptz,integer),public.tm_claim_hydration_reminder(uuid,integer,uuid),public.tm_transition_hydration_reminder(uuid,integer,uuid,text,text,text) FROM PUBLIC,anon,authenticated;
-- Revoke implicit default ACL grants on these NEW objects only; do not change global defaults.
DO $$
DECLARE obj record; granted record;
BEGIN
 PERFORM pg_catalog.set_config('search_path','',true);
 FOR obj IN SELECT p.oid,p.oid::regprocedure::text AS signature,p.proowner FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('tm_hydration_reminder_job_json','tm_enqueue_hydration_reminder','tm_get_hydration_reminder_job','tm_list_due_hydration_reminders','tm_claim_hydration_reminder','tm_transition_hydration_reminder') LOOP
  FOR granted IN SELECT DISTINCT a.grantee,r.rolname FROM aclexplode(coalesce((SELECT proacl FROM pg_proc WHERE oid=obj.oid),acldefault('f',obj.proowner))) a LEFT JOIN pg_roles r ON r.oid=a.grantee WHERE a.grantee<>obj.proowner LOOP
   IF granted.grantee=0 THEN EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC',obj.signature); ELSE EXECUTE format('REVOKE ALL ON FUNCTION %s FROM %I',obj.signature,granted.rolname); END IF;
  END LOOP;
 END LOOP;
 FOR granted IN SELECT DISTINCT a.grantee,r.rolname FROM pg_class c CROSS JOIN LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a LEFT JOIN pg_roles r ON r.oid=a.grantee WHERE c.oid='public.tm_hydration_reminder_jobs'::regclass AND a.grantee<>c.relowner LOOP
  IF granted.grantee=0 THEN REVOKE ALL ON public.tm_hydration_reminder_jobs FROM PUBLIC; ELSE EXECUTE format('REVOKE ALL ON public.tm_hydration_reminder_jobs FROM %I',granted.rolname); END IF;
 END LOOP;
END; $$;
COMMIT;
