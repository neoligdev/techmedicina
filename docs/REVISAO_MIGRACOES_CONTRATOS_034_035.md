# Revisão para futura homologação Cloud — contratos 034/035

28/10/2026, Codex. Propostas locais; não aplicadas por este lote.

## Objetos e dependências

034 depende de 001 e cria tm_clinic_contract_drafts, tm_clinic_contract_draft_versions e RPCs get/save de rascunhos. 035 depende de 034 e cria índice (clinic_id,id) e RPC de listagem administrativa paginada. Não depende das migrações clínicas/Jornada/domínios 014–033.

Nenhum usuário, membership, grant clínico, contrato aceito, fatura, pagamento, cron, endpoint externo ou configuração de DNS é criado. Não altera tabelas de pacientes, prontuário ou dados clínicos. Somente operador global ativo pode usar as RPCs; as novas tabelas não têm acesso direto do navegador. Identidade e ator vêm de auth.uid, não do corpo do pedido.

## Conferência obrigatória antes de aplicar

Confirmar projeto Techmedicina e backend correto; presença de tm_clinics e tm_platform_operators; roles anon/authenticated e auth.uid; ausência dos novos objetos/assinaturas e índice. Se qualquer objeto já existe, interromper a aplicação e comparar definições, sem DROP ou reaplicação cega. Não inserir dados para simular que uma clínica já existe ou uma conta tem papel. Usar arquivos SQL versionados, na ordem 034 → 035, por ferramenta gerenciada. Conferir execução/transação e políticas/ACL depois.

## Riscos e mitigação

Rascunhos podem conter propostas incompletas: estado permanece draft e não há consumidor de cobrança/benefícios. Limites são técnicos (centavos inteiros até 999999999999, vidas até 2147483647), não políticas comerciais. BRL é a moeda inicial do editor. Valores em branco são null, distintos de zero/false. Clinica inativa pode preparar proposta, sem ativação.

Concorrência exige expectedRevision e bloqueio de UUID. Repetição idêntica da criação pelo criador e gravação sem mudanças não multiplicam versões. Clínica não muda pelo update. Resposta incerta exige GET; não há retry automático de PUT. Snapshots não podem ser editados pelas contas de aplicação, mas não são WORM contra administradores do banco.

Busca literal case-insensitive por título, sem promessa de remoção de acentos ou escala de full-text. Cursor pertence à clínica e filtro; troca de título pode invalidar cursor e exigir reinício. Logs/evidências não devem conter tokens nem termos comerciais reais.

## Testes e rollback

SQL local cobre gravação, snapshot, concorrência, tipos independentes, acesso revogado, anonimato, clínica incorreta, paginação e cursor estrangeiro. HTTP/UI cobrem escopo, recibo, dinheiro, falha/retry e troca de clínica. Isso não substitui homologação autenticada Cloud.

Em falha de DDL, transação de cada arquivo reverte. Se já aplicado e precisar suspender, revisar revogação de EXECUTE como ação própria; não apagar tabelas com dados ou snapshots. Não criar script destrutivo de rollback.

## Autorização

Aplicação remota requer autorização específica. Este documento não autoriza SQL, contas, vínculos/grants, DNS, main, Publish, gateway ou cobrança.
