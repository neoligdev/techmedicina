# Revisão da proposta 041 — hidratação própria

Codex, 29/10/2026. Somente revisão local, não autoriza SQL remoto.

Arquivo: database/migrations/041_own_hydration_records.sql.
SHA256: 9d35e45d6a5974690c9a25fa7b0f3bbb6e709a30dcff66eacb741e5cb1cf3f32.

## Pré-condições

Confirmar backend Techmedicina e inventariar tabelas/funções/constraint existentes. Fundação 001, auth.uid e roles anon/authenticated necessários. Comparar todos os recursos da constraint tm_membership_grants_resource_check; o arquivo preserva valores até journey_shields e adiciona hydration_records. Qualquer valor adicional exige revisão antes de aplicar. Seguir ordem de migrações planejadas; não executar posteriormente constraint antiga que remova o recurso novo. Não aplicar outros lotes pendentes por inferência.

Objetos novos devem estar ausentes ou ter definição comparada: tm_hydration_records, tm_hydration_receipts, helper tm_require_own_hydration_patient(uuid,text), serializer tm_hydration_snapshot(tm_hydration_records), RPC tm_mutate_own_hydration_record(uuid,jsonb) e tm_get_own_hydration_record(uuid,uuid). Sem DROP de dados ou reaplicação cega.

## Riscos e limites

Amplia o vocabulário de recursos, sem inserir grant ou usuário. Runtime correspondente deve reconhecer hydration_records antes de qualquer provisionamento futuro; main 5b4ff09 não inclui esse suporte. Provisionar grants antecipadamente pode fazer a identidade antiga falhar fechada. Não conceder grants neste lote.

Somente paciente ativo, clínica ativa e vínculo explícito, com read + create/write conforme operação. Médico, ADM e Super ADM não têm acesso automático. Leitura médica e rotas White Label são etapas distintas. A RPC deriva o paciente de Auth, nunca de UUID do navegador. Não reutilizar grants de Jornada ou prontuário.

Tabelas sem acesso direto para papéis da aplicação, RLS ativo. Helpers sem EXECUTE para PUBLIC/anon/authenticated. Duas RPCs de aplicação autenticadas ainda exigem guarda, search_path vazio e locks compartilhados nos vínculos/grants. Bloqueio transacional por UUID, revisão otimista, recibo único e snapshot atômico. Não cria cron, notificações, meta, diagnóstico, score ou VITALIDADE. Não ativa endpoint nem armazena saúde no navegador.

mL inteiro e teto de precisão são propostas técnicas documentadas, não limites clínicos. Datas exigem offset; política de horário futuro, correções retroativas e apresentação de fuso ainda deve ser fechada na API/UI. SQL rejeita formato/tipos inválidos, mas não prescreve consumo. Anulação não apaga histórico nem atende por si só pedidos legais de exclusão.

## Verificações após eventual aplicação autorizada

Conferir RLS, ACLs de tabelas e funções, SECURITY DEFINER/search_path, constraint, chaves e ausência de contas/grants semeados. Homologar com contas e permissões específicas aprovadas, fixtures fictícias e isolamento entre pacientes/clínicas. Não confundir testes PGlite com homologação Cloud. Testar contenção real entre conexões e comportamento de recibo incerto na API.

Falha no próprio arquivo reverte sua transação. Após aplicação confirmada, não executar rollback destrutivo; revisar suspensão de RPCs como ação própria. Preservar registros/snapshots existentes.
