# Retomada Codex — 20/10/2026

Executor único: Codex, por transferência humana explícita. Antigravity preservado como autor D108–D112. Design e PRD preservados; sem Prompt Zero ou Ask Lovable.

Pasta Git: techmedicina/techmedicina. Remoto neoligdev/techmedicina. Branch checkpoint/d69-d74; HEAD inicial a9b8597. D112 consolidada em 93c45de125d93d54b61cf93e18625ed532e97895 e confirmada no remoto pelo mesmo SHA. Inclui os dois commits do Antigravity antes não enviados. Main permanece 111b397.

Validação executada nesta retomada: 876 testes aprovados em 109 arquivos, Vitest com um worker; duração 315,03s. Lint dos três arquivos TypeScript D112 aprovado, TypeScript completo e build aprovados. Varredura de padrões de tokens/chaves privadas nos cinco arquivos D112 não encontrou ocorrências; não é prova de ausência de todo segredo no histórico. Não foram adicionados scripts avulsos, package-lock.json ou last_commit_sha.txt.

## Cloud e Lovable — evidência atual, não somente relato anterior

Projeto 75200069-2ce5-40c9-a874-f12db50531be, aberto no navegador. SQL Editor acessível e usado apenas para SELECT em metadados:

- tm_patient_shield_states e tm_shield_history_events: ausentes (to_regclass retornou NULL).
- tm_doctor_availability: ausente.
- tm_clinics.time_zone: ausente.
- tm_save_clinic: quatro argumentos (text, boolean, uuid, integer).
- tm_clinic_domains: CHECK status = pending_verification.
- Painel de tabelas mostra fundação e Jornada até rascunhos; isso não revalida todas as políticas/RPC 001–013.

Git do Lovable mostrou neoligdev/techmedicina, branch main, Connected e In sync with GitHub. Último sync exibido: seis dias antes. Nenhuma troca de branch, Publish, migração, DNS ou grant foi executada. Capturas em evidencias/retomada_cloud_schema_20261020.png e retomada_lovable_branch_20261020.png. O preview permanece no lote D85; não confundir push do checkpoint com sincronização do preview.

## Bloqueios de código confirmados

1. Reserva não é ativação: schema 006 só permite pending_verification, enquanto resolvedores exigem active.
2. Leitura do catálogo de domínios pela tabela atualmente restrita a operadores; médico necessita resolução mínima autorizada pelo servidor, sem conceder leitura global da tabela.
3. availability-runtime.server.ts tem leitor padrão que lança 503 mesmo quando a flag está ligada. Não ativar AGENDA_OPERATIONAL_ENABLED antes de substituir esse placeholder e homologar todas as dependências.
4. Migração 016 substitui assinatura administrativa: comparar dependências reais, preparar backup/recuperação e aplicação revisada; não aplicar automaticamente.

## Próximo passo exato

Implementar verificação de posse White Label no servidor e desenhar persistência aditiva: desafio vinculado a domínio/clínica/revisão/ambiente, validade explícita, DNS TXT exato, prova TLS vinculada ao host e roteamento real da hospedagem. Ativação somente após evidência confiável e autorização; cliente não informa flags de verificação. Suspensão/revogação auditadas e sem transferência de tenant. Testar localmente antes de migração Cloud.

Plano global em PLANO_MESTRE_EXECUCAO_PRD.md: 101 fichas mais grupos dos adendos. É inventário de implementação e pendências, não conformidade final. Manter cadastro, prontuário/documentos, protocolos, PWA, comercial/financeiro, conteúdo, dispositivos e IA no escopo integral. Regras comerciais e clínicas ainda pendentes não são inventadas para encerrar módulos.
