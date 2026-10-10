# C018 — Cloud C015, sincronização e primeiro operador

10/10/2026. Executores: Lovable (migração/tipos/cadastro) e Codex (revisão, testes, correção de lint, status e provisionamento autorizado).

- Incorporados por fast-forward os commits Lovable até bedb68a, sem reescrever histórico. Cadastro por e-mail/Google e botão de conta foram adicionados por Lovable, ainda sem homologação real completa.
- C015 aplicada via migração gerenciada 0001_c015_clinic_administration_97784d3.sql. Fonte e migração são idênticas após normalização CRLF/LF. SQL editor carregou; consulta remota confirmou RLS ativa e escrita direta authenticated negada em tm_clinics/tm_admin_audit; anon sem SELECT.
- Lovable corrigiu TS2322 omitindo parâmetros opcionais na criação, usando os defaults NULL do SQL. Sem alteração das permissões ou identidade do ator.
- Codex corrigiu apenas formatação dos tipos/armazenamento gerados e declaração const do temporizador. Segredos não foram versionados.
- Conta inicial verificada pelo Auth, com e-mail confirmado. Papel Super ADM persistido ativado somente após confirmação específica do titular nesta sessão. Não foram criados vínculos clínicos, pacientes ou grants médicos. Identificadores privados não constam deste relatório.
- Verificações locais: 230/230 testes, 25 arquivos; TypeScript e build aprovados; lint sem erros, sete avisos Fast Refresh existentes; cobertura do status 3/3.

## Pendências e limites

Login/JWT/gateway/RLS ponta a ponta exige entrada do titular com a senha própria. Criar/editar clínica, conflito de revisão e consulta da auditoria não foram homologados remotamente nesta entrega. OAuth e recebimento de confirmação por e-mail não foram testados com conta real. Nenhum dado clínico real foi usado. O PRD continua parcial.

Divergências documentais: o prompt antigo determina Antigravity como executor e o README histórico descreve ausência de backend; instruções humanas posteriores e registros atuais prevalecem. PRD preservado, sem descartar requisitos. Alterações antigas alheias à C018 permanecem fora do commit.
