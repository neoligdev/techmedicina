# Dispositivos — etapa 1: rascunho de cadastro central

Executor Codex, 28/10/2026. PRD 25.1/25.2 parciais.

Tela Super ADM /super-admin/dispositivos preserva demonstração/design e adiciona cadastro administrativo de unidade. Guarda título administrativo, fabricante/modelo informados, identificador declarado, versão de firmware informada, lote e observações. Campos podem ficar em branco em rascunho, sem inventar informações do fabricante. Não é contagem física confirmada de estoque, expedição ou liberação de hardware.

UUID interno identifica o rascunho. O identificador declarado não é autenticador, e firmware pode se repetir em diversas unidades. Duplicatas declaradas podem existir em preparação: deduplicação/identificação física final dependem de documentação do modelo. Nunca registrar uma etiqueta como prova de autenticidade ou prometer bloqueio físico remoto.

API GET/PUT /api/platform/device-registration-draft exige sessão validada e Super ADM ativo. DTO estrito retorna draft e integrationAuthorized=false; alegação de true é rejeitada no servidor/cliente. Escrita não aceita liberação, clínica/paciente ou ator fornecidos pelo navegador. Resposta incerta exige releitura; não há retry automático. Texto de prévia é escapado e logout remove editor. Não grava metadados no localStorage.

## Revisão da proposta SQL 037

Local apenas, depende de 001. Cria tabelas de rascunhos e versões com RLS e sem acesso direto a anon/authenticated. RPCs SECURITY DEFINER/search_path vazio verificam operador ativo e tipos/limites. Escrita serializada por UUID com revisão otimista; retry idêntico e escrita sem mudança não criam novas versões. Snapshots com ator ficam na transação. Não há função ou tabela nova de autorização, vínculo, estoque disponível ou ingestão de medições.

Antes de qualquer aplicação remota futura: confirmar projeto/backend e ausência/comparar definições dos novos objetos; não reaplicar cegamente ou apagar tabelas como rollback. Não faz parte da autorização solicitada 034–035.

Validação: 10 testes SQL local/HTTP/clientes/UI; TypeScript, lint direcionado e build executados antes do commit. Cobra permissões, metadados inválidos, recusa de liberação falsa, UUID/versões e recuperação de recibo perdido. Não comprova hardware real nem Cloud.

Próxima etapa: biblioteca pesquisável de cadastros. Permanecem pendentes identificação/autenticação técnica, modelos homologados, conferência física, expedição/recebimento, venda/cessão, liberação para clínica e paciente, telemetria e revogação. Sem SQL remoto, main, Publish, DNS, credenciais ou grants clínicos.
