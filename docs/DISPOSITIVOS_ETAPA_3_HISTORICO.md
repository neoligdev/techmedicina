# Dispositivos — etapa 3: metadados históricos somente leitura

Codex, 29/10/2026. PRD 25.1/25.2 continuam parciais.

GET /api/platform/device-registration-version exige UUID e revisão inteira positiva, parâmetros únicos e nenhum campo extra. Servidor resolve sessão e Super ADM e consulta a RPC com o mesmo bearer. Validação estrita impede retornar outra unidade/revisão, autor interno ou integrationAuthorized=true. Respostas privadas/no-store, inclusive erros. Cliente obtém token atual e não usa cookies, cache ou redirecionamento.

Painel consulta revisão exata dos metadados declarados, com título, fabricante/modelo, identificador, firmware, lote e observações. Texto escapado; sem restauração, PUT ou liberação. Mudança de unidade/revisão descarta resposta antiga. Falha é diferente de versão ausente; permite nova tentativa. Consulta não modifica edição suja.

## Revisão SQL 039 — somente local

Depende da tabela versionada 037. Uma função SECURITY DEFINER/search_path vazio, com operador ativo revalidado em cada chamada sob bloqueio compartilhado. EXECUTE negado a PUBLIC/anon e permitido a authenticated, que ainda passa pela guarda de operador. Não cria tabelas, vínculos, alterações de estado ou registros. Não expõe actor_user_id. Teste local PostgreSQL cobre revisão imutável, unidade inexistente, operador inativo, usuário alheio, anônimo e ausência de leitura direta da tabela.

Antes de eventual aplicação remota: revisar 037 e comparar ausência/assinatura da RPC. Não reaplicar nem apagar objetos. Não foi solicitada ou inferida autorização para SQL remoto; não aplicar 036–039 junto com o lote 034–035 já concluído.

Não representa estoque verificado, autenticidade do hardware ou integração real. Estados de expedição e regras finais dependem de definição do proprietário conforme o PRD. Nenhuma alteração visual global ou de personalização.

Validação concluída: 16 testes direcionados em 4 arquivos, mais 4 de status/cobertura. TypeScript, lint direcionado e build aprovados. Teste integrado confirma consulta de revisão antiga sem apagar edição suja nem emitir PUT. Navegador local confirma tela protegida preservada sem sessão. Sem homologação autenticada no Cloud.
