# Blog central — etapa 3B: consulta histórica no editor

Executor: Codex. Data: 28/10/2026.

O editor de rascunho salvo oferece consulta explícita por número de revisão, limitada à revisão confirmada. Conteúdo histórico aparece em painel somente leitura separado dos campos atuais. Metadados editoriais, referências, licença e data são mostrados como texto; HTML não é executado. Não há restauração ou publicação.

O cliente exige token atual, prazo máximo, ausência de cache/credenciais implícitas e resposta estrita correspondente ao rascunho e revisão solicitados. Falha e inexistência têm mensagens distintas; repetir a consulta é uma leitura. Troca de rascunho, revisão, cliente ou desmontagem descarta respostas antigas. O AbortController do painel é marcador de escopo; a rede possui seu próprio prazo, sem promessa de cancelamento imediato. A chave de usuário existente remove o editor no logout.

Testes incluem texto escapado, falha/retry/ausência, resposta de escopo errado, sessão ausente, resposta atrasada após troca de rascunho e preservação real de edição não salva enquanto consulta uma revisão antiga. 13 testes direcionados em 3 arquivos aprovados; 9 testes de interface repetidos após ajuste de ciclo de vida. TypeScript, lint direcionado e build aprovados.

## Limites e próxima etapa

Este painel consulta revisão exata; não lista metadados paginados de todas as versões. Essa listagem continua pendente. Depende da proposta 032, ainda não aplicada no Cloud por este lote; não se declara homologação remota ou atualização do preview. PRD §15 continua parcial: revisão editorial/clínica, mídias, seleção e publicação pelas clínicas e PWA permanecem abertos. Nenhum SQL remoto, main, Publish, DNS ou infraestrutura alterado.
