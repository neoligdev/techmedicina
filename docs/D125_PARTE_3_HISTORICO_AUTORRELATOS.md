# D125 — Parte 3: recuperação dos autorrelatos próprios

Codex · base anterior 1ec288b, cuja integração na main foi autorizada e confirmada no preview. Este incremento posterior não está incluído naquela autorização de main.

Implementados contrato/cliente de histórico, handler e rota GET /api/journey/self-reports. Reutiliza host/sessão/RLS e transporte same-bearer. Aceita somente cursor e limite; IDs de clínica/paciente vêm do vínculo servidor. RPC proposta local 027 consulta o ledger existente, não cria outro armazenamento de hábitos. Ordenação por recebimento/UUID e cursor validado no escopo preservam microssegundos e empates. Respostas privadas/no-store, DTO mínimo, IDs únicos, tamanho limitado, cursor coerente; falha não vira sucesso nem demo.

49 testes direcionados aprovados em dois arquivos: 44 testes SQL de roteamento/host/runtime (um novo de paginação e teste integrado ampliado para gravar/reler) e cinco de contrato/cliente/handler. O teste integrado usa RPCs PostgreSQL reais locais: salva, repete, recupera o evento e nega após revogação. Auth e ingresso simulados; não é homologação Cloud. Quatro testes do runtime também passaram na execução direcionada anterior. TypeScript completo e lint direcionado aprovados. Este lote não é nova execução dos 1.175 testes globais históricos da parte 2.

HTTP local /api/journey/self-reports respondeu 403 com private/no-store em 127.0.0.1, conforme a separação entre demo e operação clínica. Build de produção e rotas geradas validados. Nenhum CSS global, dependência ou tipo gerenciado alterado. Sem SQL remoto, grant clínico, DNS ou Publish.

Ainda falta leitura de metas próprias elegíveis e UI de registro/histórico real ligada a elas. O ledger atual registra cumprimento de meta, não volumes arbitrários de água/sono nem prescrições fictícias. A D125 completa continua parcial e será homologada no Cloud somente após as autorizações e dependências reais. O status oficial desta parte será consolidado na develop; preview permanece com as 131 entregas da versão autorizada até nova decisão de main.

Validação ampliada: segunda clínica/paciente/evento sintéticos não são acessíveis nem aceitos como cursor; paginação com quatro registros cobre empate exato e diferença de microssegundo. 49 testes direcionados novamente aprovados.
