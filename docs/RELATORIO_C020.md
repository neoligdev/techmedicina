# C020 — Paginação de auditoria administrativa

Executor: Codex. 10/10/2026.

A consulta global não fica mais limitada aos primeiros 100 eventos: o botão Eventos anteriores pede a próxima página pelo horário e ID do último evento. A ordenação descendente usa ambos os campos, preservando desempate para horários iguais. Cada requisição confirma identidade e papel persistido; cursores incompletos, duplicados ou campos extras são recusados antes da leitura. Valores de cursor são restritos a data ISO e UUID; não aceitam sintaxe de filtro livre. Sem service_role, novas permissões ou migração SQL.

A tela mantém a página atual em falha temporária, limpa resultados quando recebe 401/403 e permite voltar aos mais recentes pela consulta inicial. As requisições continuam sem cache, com token de sessão, bloqueio de duplicação e abort ao desmontar. A resposta limitada continua sem dados clínicos ou valores do cadastro.

Validação: 232 testes/25 arquivos aprovados; TypeScript e build aprovados; lint 0 erros, 7 avisos existentes. Dois testes adicionados cobrem cursor inválido/duplicado/extra, precedência da autenticação, cursor de continuação e falha temporária no painel. Evidências em docs/evidencias/c020_*.txt. A logo C019 foi conferida no navegador e registrada em c019_logo_super_adm.jpg.

Limites: E2E autenticado e volume real remoto ainda não homologados; depende da entrada do titular. Paginação não congela um snapshot da base: novos eventos podem aparecer no topo ao reiniciar a consulta. Demais requisitos do PRD continuam parciais. Alterações antigas fora deste escopo preservadas.
