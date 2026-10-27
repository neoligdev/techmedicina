# B025 — ativação White Label transacional local

26/10/2026 · Codex. Trabalho iniciado antes da nova prioridade D125 de persistência de hábitos; preservado como incremento local antes de consolidar as branches.

Proposta 025 amplia estados locais para pending_verification/active, registra snapshot de ativação e auditoria atômica. Função privada exige Super ADM ativo, projeto/desafio/domínio corretos, revisão esperada, clínica ativa e recibo persistido consumido ainda válido. Reutiliza locks e verificador de escopo existentes, sem receber booleanos de prova do navegador. Incrementa revisão; repetição com revisão anterior é conflito. Prazo não é inventado: valid_until vem da validade da prova persistida. Adaptador server-only exige writer privado injetado e valida recibo estrito. Sem conexão privilegiada padrão ou endpoint.

46 testes direcionados aprovados: 39 SQL locais e sete de contrato. Abrange ativação válida com prova sintética, revisão/projeto incorretos, clínica inativa, chave revogada, expiração, papéis comuns negados e rollback quando auditoria falha. TypeScript e lint direcionado aprovados. Não comprova concorrência remota nem domínio real.

Limites importantes: resolver runtime precisa validar snapshot, validade, clínica e chave atuais antes de usar host; status active isolado nunca será suficiente. Suspensão/retirada/revalidação e instalação PWA por origem ainda pendentes. Nenhum domínio real ativado. Migração 025 somente local, sem Cloud/DNS/grants/Publish/main. Prioridade seguinte conforme instrução atual: consolidação e D125 operacional Jornada/hábitos, reutilizando APIs e persistência existentes.
