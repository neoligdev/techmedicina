# Hidratação — etapa 2: transições e recibos

Codex, 29/10/2026. Núcleo de referência exclusivo de servidor; não é persistência em produção. PRD 8.3 permanece parcial.

## Comportamento

Comandos create/correct/void estritos, UUID do registro e sourceRequestId. Identidade de clínica/paciente vem do contexto externo resolvido pelo servidor, nunca do corpo; campos extras como ator, clínica, meta ou documento de anulação são rejeitados. O núcleo não autentica o contexto: isso é obrigação do futuro adaptador.

Criação exige revisão zero e ausência do registro. Correção/anulação exigem a revisão atual. Cada comando novo aceito gera uma revisão/recibo, inclusive correção para o mesmo conteúdo; anulação preserva valores e marca voided. Não há restauração, exclusão física, prescrição ou pontuação. Correções não alteram snapshots anteriores.

Idempotência por escopo + registro + sourceRequestId: comando igual retorna recibo original; mesmo ID com conteúdo diferente conflita. Reenvio de uma operação antiga depois de correção posterior retorna recibo antigo sem voltar o estado atual. Comparação usa comando normalizado pelo contrato, preservando diferenças textuais entre timestamps com offsets distintos.

Histórico recebido é validado: escopo uniforme, IDs/revisões contíguos, solicitação única, criação inicial, sequência sem reativação e snapshot coerente com cada comando. Recusa histórico incompleto/adulterado. Entradas não são mutadas. Limite de 100 mil recibos é técnico do núcleo de referência, não uma regra clínica ou retenção aprovada. Não se recomenda carregar todo o histórico em produção: o adaptador SQL deverá consultar recibo/chave/revisão de forma indexada.

## Dependências para escrita real

Autorização específica de hidratação ainda não existe no modelo de recursos. Não reutilizar grants de Jornada/prontuário para conceder acesso automaticamente. Preparar política própria, com paciente ativo/tenant/host e permissões explícitas, e revisar a leitura médica separadamente. Não provisionar contas ou grants por inferência.

Persistência futura deve executar autorização, trava por registro, comparação de revisão, recibo e snapshot numa transação. Função pura não garante concorrência entre processos nem durabilidade. Retentativa e recibo incerto exigem consulta pelo ID exato; nenhum armazenamento local de saúde foi adicionado. Timestamps de recebimento/ator deverão vir do servidor; não inventados neste núcleo.

Sem SQL, API ou UI nova ativada. Não houve gravação Cloud, nova permissão, main, DNS, infraestrutura ou Publish. A proposta técnica mL inteiro segue documentada na etapa 1, sem metas clínicas automáticas.

Testes: 21 direcionados em 3 arquivos de hidratação, incluindo recibo repetido, conflito, recuperação antiga, correção, anulação e integração com a projeção que exclui anulados. Não são nova execução da regressão global anterior de 1.335 testes. Tipos/lint/build registrados após confirmação.

Fechamento: 21 testes de hidratação e 4 de status aprovados; após o reforço da cadeia de recibos, os 9 testes de mutação e 4 de status foram repetidos com sucesso. TypeScript, lint direcionado e build finais com saída 0. Próxima etapa: política de acesso e adaptador transacional, sem presumir que essa função pura já grave no Cloud.
