# Hidratação — etapa 1: contratos e projeção temporal

Codex, 29/10/2026. PRD 8.3 iniciado, parcial. Não muda a rota do paciente nem o design global.

## Escopo implementado

Contratos estritos de snapshots atuais: UUID do registro, clínica e paciente, revisão, active/voided, volume e instante com offset. Proposta técnica local de armazenamento em mL inteiro, zero explícito permitido; não é prescrição, limite clínico ou decisão final sobre unidades/UX. Intervalo inteiro seguro e teto de 100 mil snapshots são limites técnicos.

Projeção recusa qualquer escopo diferente, duplicação de UUID e overflow de soma. As identidades recebidas não são autorização: futuros endpoints devem resolvê-las no servidor pelo contexto próprio, nunca usar o seletor demonstrativo ou IDs informados como permissão. Recebe somente a versão atual de cada registro, já autorizada; não mescla eventos de correção. Revisão corrigida conta uma vez; voided não conta.

Fuso IANA obrigatório, sem herdar silenciosamente o computador. Dia é a data local de asOf; semana são as sete datas locais terminando nela; mês são os dias decorridos do mês civil; ano são os meses decorridos do ano civil. As convenções são proposta técnica explícita, não regra clínica. Não fabrica dias futuros. O filtro asOf considera ocorrência, não representa leitura histórica das versões no passado. Mesma data local em mudança de DST preserva ambos os registros sem duplicar volume.

Ausência de registro: total/bucket null e evidence missing. Zero explicitamente informado: 0 e evidence recorded. Nenhum desses valores comprova quanto a pessoa de fato bebeu. Não calcula média, adesão, percentual de meta, pontuação, VITALIDADE ou alerta clínico.

Gráfico reutilizável com tokens semânticos existentes e tabela acessível; barras comparam volumes registrados entre buckets, sem meta. Sem escrita, localStorage ou cache de saúde. Ainda não integrado à rota: não há fonte autorizada de dados quantitativos de hidratação implementada.

## Continuidade e dependências

1. Confirmar convenções/unidades de produção, origem da meta e restrições profissionais conforme pendências do PRD.
2. Contratos de criação/correção/anulação idempotentes, revisão otimista e histórico preservado.
3. Proposta de persistência isolada por tenant/paciente, usando contexto próprio no servidor e regras de acesso explícitas. SQL remoto exige autorização própria.
4. API, UI conectada e homologação entre contas, clínicas e fusos, sem payload de saúde no navegador persistente.
5. Metas/restrições, consentimentos e lembretes dependem das definições e canais; nenhuma notificação ou IA ativada aqui.

Testes: 12 direcionados, calendário/fuso/DST, limite exato de soma, escopo, duplicação, snapshots corrigidos/anulados, ausência/zero e gráfico acessível. Não são nova execução da regressão global anterior de 1.335 testes. Tipos/lint/build registrados após confirmação. Sem main, Cloud, DNS, infraestrutura, grants ou Publish.

Fechamento: 12 testes de domínio/gráfico e 4 de cobertura/status aprovados. TypeScript corrigido e confirmado com saída 0, lint direcionado sem erros e build concluído com saída 0. Sem integração na rota, sem gravação real e sem alteração no Cloud.
