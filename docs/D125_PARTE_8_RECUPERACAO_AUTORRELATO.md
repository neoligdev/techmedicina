# D125 — Parte 8: conferir autorrelato incerto no histórico

Executor: Codex. Recuperação somente de leitura, reutilizando o histórico próprio protegido da parte 3; sem nova migração ou concessão de acesso.

O formulário oferece “Conferir no histórico” quando um envio tem resposta incerta e o identificador original continua em memória. A consulta verifica até 100 eventos recentes do próprio paciente. Somente a correspondência de sourceEventId, meta e instante confirma o registro já persistido; dados de outra clínica/paciente são recusados pelo cliente existente. Conflito de meta ou de instante impede novo envio e solicita revisão. A comparação mantém a precisão abaixo de milissegundos, normalizando offsets e zeros finais.

A conferência não exige permissão de criar evento: a permissão de leitura é verificada pelo endpoint/SQL. Portanto um registro já salvo pode ser confirmado mesmo após a participação ter sido pausada. Não há segundo POST nessa operação. Ausência na página limitada ou falha de leitura nunca é tratada como prova de que a escrita falhou; o estado continua incerto e o ID original permanece disponível para reenvio seguro.

Limites: não há outbox persistente ou recuperação automática do identificador após recarregar/fechar a tela; consulta não é busca exaustiva do ledger; a confirmação não atribui pontos nem VITALIDADE. Cloud, domínio, grants, main e Publish não são alterados. A versão de preview proposta d823544 não inclui automaticamente esta parte posterior.

Validação: testes de cliente e interface conferem resposta perdida, confirmação por histórico após pausa, ausência inconclusiva, isolamento, conflito temporal e normalização de fuso. Resultados finais registrados no fechamento deste lote.

Fechamento: 20 testes direcionados aprovados em quatro arquivos; TypeScript confirmado com código de saída zero, lint direcionado e build aprovados. A regressão global anterior de 1.204 testes/136 arquivos não foi repetida nem atribuída à parte 8.
