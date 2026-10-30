# Hidratação — etapa 4: leitura por intervalo

Codex, 30/10/2026. PRD 8.3 permanece parcial. Não adiciona rota ativa nem troca o contexto de host da Jornada.

## Contratos e HTTP preparados

GET proposto /api/hydration/records aceita somente from/until, after opcional e limit 1–100 (25 padrão). Início inclusivo, fim exclusivo. Limites exigem ISO com offset e precisão máxima de milissegundos; ocorrências retornadas podem manter microssegundos. O limite em milissegundos mantém as comparações de fronteira exatas no JavaScript. UUID ordenado é cursor técnico, não ordenação cronológica apresentada ao paciente.

ResolveContext é dependência obrigatória sem implementação padrão; deverá verificar Auth, host e vínculo ativo. Fronteira revalida autorização hydration_records/read, paciente proprietário e metadados do vínculo. Corpo e clinicId/patientId na query são recusados. DTO rejeita escopo incorreto, fora do intervalo, duplicação, ordem/cursor inválidos e campos extras. Respostas privadas/no-store, Vary Authorization/Host, sem vazamento em erros. Adaptador futuro deverá traduzir erros de cursor do banco para erro HTTP controlado.

Cliente preparado para a futura rota; pega bearer atual em cada chamada, usa no-store, credentials omit e redirect error. Escopo esperado serve apenas para conferir resposta, não autoriza acesso. Não há cookies, localStorage ou cache de saúde. Ainda não conectado ao PWA: não confundir módulo preparado com leitura real.

## Proposta SQL 042 — somente local

Depende de 041. Cria índice clinic_id/patient_id/id e RPC de leitura com guarda própria, SECURITY DEFINER/search_path vazio, sem PUBLIC/anon. Cursor pertence ao paciente e intervalo. Retorna snapshots atuais, incluindo anulados para conferência; projeção exclui anulados sem inferir consumo zero. Não devolve recibos, conta Auth ou ator interno. Usa limite+1 para nextCursor.

Não oferece snapshot consistente entre páginas. Correção do horário pode tirar cursor do filtro e exigir reinício. Mudanças durante paginação exigem atualização explícita. Desempenho de intervalos grandes ainda precisa medição: não há promessa de escala baseada no índice. Não fornecer apenas uma página ao gráfico como se fosse todo o período; carregar integralmente ou sinalizar parcial antes de integrar.

## Revisão antes de aplicação futura

Confirmar 041, ausência/comparar RPC e índice e autorização própria. Preservar RLS e ACLs da etapa 3. Não reaplicar cegamente, não inserir grants/contas nem outros lotes pendentes. Homologação Cloud e contenção real permanecem pendentes. Timestamps da consulta não definem metas, alertas, IA ou pontuação.

Testes cobrem autorização, parâmetros/escopo, DTO, cliente e paginação PostgreSQL com limite do período, unidade anulada e cursor de outro paciente. Resultado final registrado após conclusão. Sem SQL remoto, main, Publish, DNS, infraestrutura ou permissões reais.

Fechamento: regressão de hidratação com 40 testes/6 arquivos aprovada. Após adicionar intervalo inválido, 20 testes em 3 arquivos (SQL, fronteira/cliente e status) aprovados. TypeScript, lint direcionado e build com saída 0. Hash SHA256 042: 8f341ecfdf6cc0e6512f319a17ebf5a7633f411fbf2df6c0f87e46f11448d24d. Nenhuma nova regressão global atribuída a este lote.
