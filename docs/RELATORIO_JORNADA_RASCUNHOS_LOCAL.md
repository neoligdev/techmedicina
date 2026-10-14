# Jornada — rascunhos médicos locais

Codex, 13/10/2026. Migração 013 somente local: propostas separadas de tm_journey_goals, estado imutável draft, sem regra/índice/eligibilidade ou aprovação. Autor e horário derivados no SQL, vínculo composto ao paciente, chave idempotente clínica/paciente/autor/request e RLS somente médico verificado com leitura. RPC exige médico ativo/verificado, clínica/paciente ativos e grants read/write sob locks. Escrita direta e DELETE negados. Super ADM/paciente não leem/criam.

Tipos de propostas correspondem às seis categorias não prescritivas já existentes, com cadence daily/weekly apenas como sugestão. Medicação/protocolo não aceitos nesta fundação; frequência proposta não constitui orientação aprovada, dias de descanso ou plano clínico validado. Não há promoção de proposta para meta vigente nem consentimento presumido.

Três testes PGlite aprovados: criação/reenvio/conflito/auditoria mínima, meta vigente intacta, escrita direta e papéis negados, tipo prescrito/contexto alheio recusados. Tipos em execução handle 9321 nesta anotação. Lint do teste corrigido sem erros registrados. Não há aplicação Cloud; autorização do lote 008–012 não inclui 013.

Próximos passos: servidor/HTTP/formulário de proposta e revisão profissional com rastreabilidade; parâmetros e fontes clínicas precisam de validação própria. Publicação/ativação de metas e pontuação não fazem parte deste incremento.
Conclusão da checagem: TypeScript aprovado (handle 9321, exit 0). SQL permanece local, sem migração remota ou concessão de acesso.

14/10/2026: contrato e serviço local preparados com clínica/autor do contexto médico verificado, paciente da proposta e recibo estrito. Entrada não aceita tenant/estado/elegibilidade nem medicação/protocolo. Fronteira POST local limita corpo e recusa método/query/sessão/erros, sem exposição do SQL. Doze testes servidor/SQL e quinze servidor/HTTP passaram separadamente; checagem do serviço tipos/lint aprovada no handle 81441. Lote completo agora em validação para commit/push expressamente autorizados pelo proprietário. 013 não aplicada no Cloud. Domínio do e-mail do paciente confirmado sem correção automática; cadastro Auth ainda não comprovado.

Revisão pré-commit 14/10: criação de rascunho exige grants read/create, separados de write usado para suspensão. SQL 013 e serviço alinhados; vinte testes direcionados aprovados, incluindo write sem create negado e replay após revogação. Primeira regressão geral leu fixtures antigas durante alteração e falhou em oito casos do servidor; não usada como aprovação. Nova execução com fonte congelado em andamento. 013 permanece não aplicada no Cloud.

Conclusão da revisão pré-commit: regressão completa final 567/71 aprovada, tipos/lint aprovados. SQL 013 exige read/create e não foi aplicada no Cloud. Resultados em codex_20261014_*.txt.
