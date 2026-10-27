# Blog central — etapa 1: rascunhos protegidos (PRD §15)

Executor: Codex. Nova frente do PRD, distinta da D125/Jornada. A prévia visual anterior permanece em /super-admin/blog; a área “Rascunhos editoriais protegidos” foi acrescentada com os componentes e tokens existentes, mantendo a identidade PlugPix.

## Entregue no código e nos testes locais

- Editor de texto, título/resumo, categoria e metadados de autoria, referências e licença; prévia renderizada como texto React, sem interpretar HTML. Nenhum upload, player, busca externa ou publicação automática.
- Criação por UUID estável, leitura pelo identificador e salvamento somente após recibo estrito do servidor. Revisão esperada evita sobrescrever edição concorrente. Em resposta incerta, bloqueia nova gravação até reler o servidor.
- Estado de edição exclusivamente em memória, descartado na troca de conta/logout. Sem cache editorial em localStorage ou confirmação falsa quando a API está indisponível.
- GET/PUT /api/platform/blog-draft, usando Auth verificado e o mesmo bearer/publishable transport já existente. Exige papel global Super ADM no handler e operador ativo no SQL; não concede acesso clínico.
- Proposta local 030: rascunhos e snapshots de versões, ator real e timestamps, criação idempotente na mesma revisão, atualização auditada e bloqueio de escritas diretas. Não existe estado publicado ou retirada nesta primeira etapa.
- JSON transmitido limitado a 128 KiB pelo fluxo real, sem confiar em Content-Length. Leitor JSON e prazo de 20 s extraídos para utilitários HTTP compartilhados; comandos Jornada preservam 4 KiB, prazo e mensagens anteriores.

## Validação e limites

45 testes direcionados em oito arquivos aprovados: SQL PostgreSQL local/PGlite, API, cliente, editor, resposta perdida, logout, texto com marcação e regressões dos utilitários usados pela Jornada. TypeScript confirmado com saída zero, lint direcionado e build final aprovados. Não foi repetida uma regressão global nem atribuído a este lote o total histórico 1.204/136.

Navegador local: página carregou com demonstração e marca preservadas, novo painel exigindo conta, sem controles de gravação para a sessão anônima. Evidência: docs/evidencias/blog-drafts/blog-central.png. Não é homologação de salvamento Cloud: a migração 030 não foi aplicada. URL local: http://127.0.0.1:8082/super-admin/blog.

Próximas etapas: lista/busca paginada dos rascunhos e recuperação de versões; política de revisão editorial/clínica; formatos/hospedagem e acessibilidade de mídias; disponibilização central separada da seleção/publicação por clínica e consumo no PWA. Neutralidade, licenças e conteúdo sem dados de pacientes exigem revisão humana: campos de autoria/referências não constituem aprovação editorial ou clínica. Abertura por UUID nesta etapa é provisória, não substitui a futura biblioteca navegável.

SQL remoto, contas/grants, DNS, infraestrutura, main e Publish não alterados. PRD §15 passa a parcial, nunca concluído. README/roadmap têm descrições históricas da demonstração e não são prova de prontidão desta funcionalidade; PRD prevalece.
