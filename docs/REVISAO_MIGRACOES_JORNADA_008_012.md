# Revisão para eventual homologação Cloud — Jornada

Codex, 13/10/2026. Documento de revisão; não autoriza implantação. A autorização vigente exclui Cloud, DNS, infraestrutura e commit/push/deploy.

## Lote concreto

Aplicar em ordem, uma transação por arquivo, somente após autorização e preflight:

1. 008: metas, preferência inicial e ledger; amplia enum de recursos preservando os anteriores; vínculos compostos, RLS e autorrelato idempotente.
2. 009: revisão otimista e auditoria de preferência, leitura inicial desligada e RPC de habilitar/pausar participação própria.
3. 010: suspensão por médico verificado, grants read/write, versão e auditoria atômica. Não altera prescrição.
4. 011: consulta médica da meta com clínica explícita, sem escrita.
5. 012: clínica explícita para autorrelato; verifica meta/paciente sob lock e reutiliza controles anteriores. Revoga chamada direta da RPC antiga para clientes.

Fontes em database/migrations; SHA256 em docs/evidencias/vje2_migracoes_hashes.json. Não concatenar nem editar SQL no painel. Não criar usuários, metas, concessões ou dados clínicos nesta aplicação. Nenhum cálculo de VITALIDADE/JORNADA ou publicação de regras está incluído.

## Preflight e dependências

Conferir projeto Cloud e estado existente por catálogo PostgreSQL, antes de executar: fundação 001 aplicada; tabelas tm_clinics/tm_patients/memberships/grants, constraints compostas e auth.uid presentes; nomes tm_journey_* e funções novas ausentes, ou migrações já registradas exatamente equivalentes. Se já aplicadas, não reaplicar. Comparar nomes/definições reais, owner e privilégios; PGlite não comprova compatibilidade do gateway e das roles gerenciadas remotas. Divergência interrompe somente a aplicação e exige reconciliação.

Verificar dependentes/clientes da RPC antiga antes de revogar EXECUTE em 012. Nesta base o novo runtime está desmontado e nenhum endpoint público usa a RPC antiga; no Cloud isso precisa ser confirmado. Não elevar grants globais ou conceder acesso clínico ao Super ADM.

## Validação posterior em leitura

Conferir cinco tabelas novas com RLS habilitada; authenticated sem INSERT/UPDATE/DELETE diretos e anon sem SELECT. Conferir EXECUTE das RPCs novas, RPC antiga inacessível a anon/authenticated após 012, search_path vazio e definições iguais aos arquivos. Tabelas devem continuar sem dados adicionados pelo lote. Revisar constraint de recursos para preservar cadastro/prontuário/paciente/agenda/faturamento.

Não simular Auth remoto por set_config no SQL Editor como evidência de JWT/RLS real. Homologação clínica requer contas QA verificadas e concessões específicas autorizadas separadamente, contexto de host confiável e transportes da mesma sessão. Posse/TLS/ativação de domínios e endpoints continuam fora do lote.

## Riscos e recuperação

008 altera constraint de grants existentes e cria recursos: lock e compatibilidade precisam de inspeção. 009 adiciona revisão inicial 1 às linhas existentes, se houver; não assumir banco vazio sem consulta. 012 quebra clientes antigos deliberadamente para fechar gravação cross-host; revisar dependentes antes de executar. Cada arquivo tem BEGIN/COMMIT: falha exige inspecionar estado e registro, não repetir cegamente.

Se migração falhar, preservar logs sem segredos e verificar rollback da transação. Se implantada e problemática, manter recursos/ledger/auditorias, desativar runtime e usar correção aditiva revisada; não excluir tabelas ou restaurar EXECUTE sem clínica. Não reverter histórico Git nem apagar dados de pacientes.

## Evidência e limites

516 testes/62 arquivos da base anterior aprovados; incrementos posteriores de autorrelato têm 32 testes/7 arquivos direcionados e tipos aprovados. Build anterior aprovado. Teste adicional da sequência 001→008→009→010→011→012 aprovado em PostgreSQL isolado, incluindo recusa cross-host, replay idempotente e bloqueio após pausa/suspensão. Nenhum resultado local comprova execução remota, autenticação clínica real, concorrência multiusuário real ou instalação PWA.

## Aplicação posterior autorizada

Proprietário autorizou especificamente aplicação 008–012 no Cloud. Execução e conferência concluídas em RELATORIO_JORNADA_CLOUD_008_012.md. Não reaplicar. Autorização não inclui contas/grants clínicos, DNS, endpoints, commit/push/deploy.
