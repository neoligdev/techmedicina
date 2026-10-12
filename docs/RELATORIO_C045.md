# C045 — Fronteira entre host e autorização

12/10/2026. Codex. Novo contrato server-only createHostAuthContext recebe exclusivamente resolução de registro confiável no servidor e identidade previamente validada pelo Auth. Não extrai cabeçalhos nem aceita seleção do navegador. Nega sessão ausente, host pendente/desconhecido/demo, clínica inválida, vínculo ausente/suspenso/duplicado e papel incompatível. Portal admite admin ou médico com identidade verificada; PWA admite paciente com ID válido. Em origem tenant retira papel global e todos os vínculos alheios. Central exige Super ADM e remove vínculos clínicos. Preserva grants existentes, sem criar autorização nova.

43 testes da fronteira/host/core aprovados, incluindo conta multivínculo, cargo global sem vínculo, papéis e metadados de outra clínica. TypeScript e lint registrados. Ainda não integrado ao SSR/APIs: depende de registro e ingresso confiáveis. Não ativou hosts, não mudou componentes/design e não comprova isolamento multi-host em produção.

Homologação C044: preview restaurou sessão real e exibiu Este hostname já está reservado após reenvio do hostname QA existente, mantendo lista. Evidência c045_collision_preview.png. A correção semântica funciona no fluxo atual; causa específica da demora antiga permanece não demonstrada.

Regressão completa encerrada: 38 arquivos, 363 testes aprovados; evidência c045_regression.txt.
