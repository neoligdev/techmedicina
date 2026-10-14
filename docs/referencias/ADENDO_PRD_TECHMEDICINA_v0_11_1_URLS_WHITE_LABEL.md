# ADENDO INCREMENTAL AO PRD — PLUGPIX TECHMEDICINA / DR IA

**Versão proposta:** 0.11.1 | **Referência:** 09/10/2026 | **Documento-base:** `PRD_Techmedicina.md` v0.10

**Status:** requisitos de negócio definidos pelo proprietário; detalhes operacionais explicitamente indicados como PENDENTES ou RECOMENDADOS.

## 0. Regra obrigatória de integração ao desenvolvimento existente

Este documento é um **adendo** e não substitui o PRD atual. O Codex deverá localizar e ler `PRD_Techmedicina.md` e inspecionar o repositório antes de agir. Preservar estrutura, rotas existentes (`/super-admin`, `/clinica`, `/medico`, `/app`, se presentes), autenticação, banco, contratos, fluxos, funcionalidades e decisões já implementadas. Inserir os requisitos nas seções correlatas do PRD, preferencialmente como subseções e ajustes pontuais; manter histórico de alterações e decisões. **Não executar migrações, refatorações amplas, exclusões, integrações externas ou alterações no código-fonte automaticamente com base neste adendo.** Primeiro atualizar o PRD e apresentar análise de impacto, inventário do que já existe e plano incremental, com itens pendentes de aprovação. Nenhuma funcionalidade descrita deve ser anunciada como implementada sem evidência no repositório e testes.

## 1. Catálogo central de componentes comercializáveis — DEFINIDO

O Super ADM gerencia um **catálogo de itens-base independentes**, denominados componentes/ingredientes comerciais, com preço de fornecimento e regras próprias. Cada clínica autorizada poderá comercializá-los isoladamente (quando permitido) ou combiná-los em pacotes e planos de sua marca, com nome, preço final, descrição e condições comerciais próprias, respeitando benefícios e restrições centrais. **Não limitar a clínica a três planos**: os três níveis de oferta ao consumidor são estratégia inicial da PlugPix, não limite estrutural para o número de planos das clínicas.

### 1.1 Componentes iniciais

| Código comercial | Componente e escopo                                                                                                                       | Regra / observação                                                                                                                                                                                                                                                               |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TM-2             | **Telemedicina 2.0:** pronto atendimento online 24h com clínico geral ou pediatra                                                         | Distinguir atendimento 24h de consultas agendadas; especificar elegibilidade, canais, limites e dependentes no contrato                                                                                                                                                          |
| TM-3             | **Telemedicina 3.0:** pronto atendimento 24h **mais** consultas agendadas em até 32 especialidades/áreas previstas no catálogo contratado | Relação exata das 32 especialidades, limites e condições ainda requer validação; não presumir consultas ilimitadas                                                                                                                                                               |
| TM-4             | **Telemedicina 4.0:** concierge para agendamento de atendimento presencial                                                                | **Carência de 90 dias e fidelidade de 12 meses** como parâmetros comerciais iniciais; quantidade anual de consultas mencionada como “3, 4 ou 4” pelo proprietário: **PENDENTE de confirmação**, sem corrigir por suposição; esclarecer se TM-4 é complemento ou inclui TM-2/TM-3 |
| HW-PULSE         | Pulseira inteligente                                                                                                                      | Venda/cessão do hardware, ativação, reposição, suporte e vínculo com paciente definidos separadamente                                                                                                                                                                            |
| HW-SCALE         | Balança de bioimpedância                                                                                                                  | Integração técnica e métricas dependem do modelo e da validação BLE/API                                                                                                                                                                                                          |
| HW-RING          | Anel inteligente                                                                                                                          | Integração técnica e métricas dependem do modelo e da validação BLE/API                                                                                                                                                                                                          |
| AI-CARE          | Assistente de saúde IA proativa                                                                                                           | Motor central PlugPix; identidade White Label por clínica; acesso condicionado a autorização, contrato e consentimento                                                                                                                                                           |
| PROTOCOL         | Protocolos de acompanhamento médico                                                                                                       | Catálogo de protocolos por nicho, com profissionais, etapas, exames, acompanhamento e regras próprias                                                                                                                                                                            |
| SUPPLEMENT       | Suplementos                                                                                                                               | Marca PlugPix ou marca própria da clínica, com SKU, composição, lote, validade, estoque/logística, preço e regras de rotulagem e publicidade aplicáveis                                                                                                                          |

**Combinações comerciais exemplificadas pelo proprietário:** Pulseira + IA + TM-2/TM-3/TM-4; Balança + IA + TM-2/TM-3/TM-4; Anel + IA + TM-2/TM-3/TM-4. O catálogo deve permitir combinações sem exigir a criação de um módulo de software diferente para cada pacote. Cada item terá condições próprias de habilitação, quantidade, recorrência, carência, fidelidade, coparticipação, prazo e elegibilidade, quando aplicáveis.

### 1.2 Modelagem comercial recomendada

- Catálogo-base com identificador estável, categoria, descrição, custo/preço-base, moeda, vigência, tipo (serviço recorrente, consulta, dispositivo, produto físico, protocolo), módulos exigidos e estado ativo/inativo.
- Tabela de disponibilidade do componente por clínica, versionamento de condições e preço de fornecimento; Super ADM define elegibilidade e restrições.
- Construtor de produtos e planos da clínica com composição N:N, quantidade, periodicidade, preço de venda, custo previsto, margem estimada, vigência e versão publicada.
- Distinguir **contrato PlugPix↔clínica**, **catálogo PlugPix**, **oferta clínica↔consumidor**, **assinatura do paciente** e **dispositivo físico**; não misturar a cobrança por vida habilitada já definida no PRD com venda de hardware, consulta avulsa ou suplemento.
- Ao vender, congelar versão e condições da oferta; alterações futuras não modificarão retroativamente contratos, faturas e benefícios adquiridos.
- Entitlements/autorização do paciente são calculados pela interseção entre módulo liberado à clínica, item contratado, elegibilidade, carência e estado do serviço; validação no servidor.
- Os três planos de referência ao consumidor podem ser templates opcionais, editáveis pela clínica; não fixar preços ou composições até decisão comercial.

## 2. Públicos e propostas de valor — DEFINIDO

Segmentos prioritários: **alta performance, qualidade de vida, longevidade, sono de qualidade e emagrecimento**. O paciente seleciona objetivos, preferências e informações pertinentes, com possibilidade de alteração e revisão profissional. Um mesmo paciente pode ter vários objetivos. Protocolos, jornadas e conteúdos variam conforme o objetivo sem criar aplicativos separados.

Segmento profissional: médicos autônomos, consultórios e clínicas que desejam oferecer acompanhamento longitudinal, diferenciar serviços e monetizar assinaturas. O módulo Médico existente deverá evoluir incrementalmente para um **painel de acompanhamento**, com tendências, adesão aos protocolos, medições contextualizadas, pacientes que precisam de revisão, filtros por risco operacional e lista de pendências. Indicadores de prioridade são apoio à triagem, não diagnósticos automatizados. O médico deve ter acesso somente a pacientes autorizados da sua clínica e conforme regras clínicas do PRD.

## 3. Dr. IA — protagonismo e atuação proativa — DEFINIDO

O Dr. IA é o **núcleo funcional da experiência do paciente**, não apenas um chat sob demanda. Deve utilizar dados autorizados de dispositivos conectados, medições manuais, exames, objetivos, sintomas relatados, adesão a medicamentos/suplementos, protocolos, hidratação, sono, histórico de interações e contexto longitudinal.

**Identidade White Label:** cada clínica configura nome, avatar, identidade visual, apresentação e tom permitido. O motor, políticas de segurança, atualização tecnológica e governança permanecem centralizados na PlugPix. A IA sempre se identifica como assistente virtual, sem se passar por médico humano.

### 3.1 Ciclo proativo

1. **Ingestão:** receber evento/medição com `tenant_id`, `patient_id`, dispositivo/origem, valor, unidade, instante da coleta, instante de sincronização, qualidade, contexto e consentimento pertinente.
2. **Contextualização:** verificar confiabilidade, dados ausentes, atividade recente, tendências e histórico individual; não tratar ausência de dados como normalidade.
3. **Detecção:** motor determinístico de regras aprovadas e versionadas sinaliza evento elegível para ação; IA auxilia na linguagem e no contexto, sem ser única autoridade para decisões clínicas.
4. **Interação:** escolher ação permitida: registrar observação, fazer pergunta, sugerir hábito de baixo risco, lembrar compromisso, recomendar consulta ou orientar busca de atendimento imediato conforme protocolo.
5. **Memória:** registrar evento, mensagem, resposta, resumo, ação e resultado com trilha de auditoria e controles de retenção/correção.
6. **Reavaliação:** acompanhar respostas e novos dados sem mensagens excessivas, duplicadas ou fora de horário, salvo fluxos de segurança aprovados.

**Exemplo:** frequência cardíaca elevada no dispositivo deve ser interpretada considerando qualidade do sinal, esforço físico, persistência, sintomas e disponibilidade de confirmação. Não diagnosticar arritmia nem gerar alarme clínico a partir de leitura isolada de pulseira não validada. Escalonamento depende de regras clínicas aprovadas.

### 3.2 WhatsApp e PWA

- WhatsApp será canal prioritário de check-ins, lembretes e notificações, via integração oficial/provedor autorizado, com opt-in específico, modelos aprovados quando exigidos, identificação da clínica, preferência de canal e horários de silêncio.
- PWA será ambiente autenticado para detalhes sensíveis, gráficos, prontuários, configurações e gerenciamento de consentimento.
- Mensagens no WhatsApp devem minimizar exposição de dados de saúde; preferir notificação discreta com link autenticado para informação clínica detalhada.
- Integrar histórico de conversas do Dr. IA com memória longitudinal segregada por clínica/paciente; permitir revisão, correção, retenção e direitos do titular conforme LGPD. **Não** conferir acesso indiscriminado a todo dado da clínica, nem misturar histórico entre clínicas.
- Separar claramente o agente comercial do CRM da clínica e o agente de acompanhamento de saúde; credenciais, finalidades, memórias e permissões não são intercambiáveis.
- Sincronização contínua em segundo plano **não é garantida** no PWA via Web Bluetooth; ações devem depender de medições efetivamente recebidas. iOS/Safari exige estratégia de integração distinta, sujeita a estudo.

### 3.3 Segurança clínica e privacidade

A IA não pode emitir diagnóstico definitivo, prescrever ou ajustar medicamentos, interromper tratamentos nem determinar doses de suplementos autonomamente. Fluxos de alerta e aconselhamento devem ser revisados por responsáveis clínicos; avaliar enquadramento regulatório aplicável, incluindo software como dispositivo médico conforme finalidade efetiva. Dados de saúde são sensíveis: minimização, segregação multi-tenant, acesso por finalidade, criptografia, auditoria, retenção e bases legais apropriadas. O Super ADM não recebe automaticamente acesso ao conteúdo clínico por administrar a plataforma.

## 4. Pontuação e gamificação — DEFINIDO / nome PENDENTE

Criar um **sistema proprietário de score de hábitos e engajamento**, com pontuação, evolução e desafios, no app White Label. **Nome provisório recomendado: `Índice VIVA`** (Vitalidade, Inteligência, Vida Ativa); nome definitivo e disponibilidade marcária ainda pendentes de aprovação. A marca do score pode ser parametrizada pela clínica sem alterar o cálculo central versionado.

- Pontuar **ações e adesão verificáveis**: registro de hábitos, cumprimento de metas individualizadas, participação em protocolos, check-ins, regularidade de acompanhamento, metas de sono e atividade adequadas à condição individual; não premiar resultados clínicos ou estimular comportamento excessivo.
- Exibir score, critérios transparentes, histórico, conquistas e desafios opcionais; permitir desativação e ajustes de acessibilidade.
- Distinguir métricas observadas, auto-relato e metas pactuadas. Dados faltantes não equivalem a fracasso; não penalizar pacientes com deficiência, doença, limitações físicas ou menor acesso a dispositivos.
- **Score não é diagnóstico, risco cardiovascular validado, prognóstico, classificação médica nem substituto de avaliação profissional.** Evitar alegações de precisão ou efeitos terapêuticos não demonstrados.
- Cálculo reproduzível, versionado e auditável, com proteção contra duplicação/manipulação de eventos; revisão clínica e testes de viés antes de lançar.

## 5. Mercado corporativo — FUTURO / PREPARAÇÃO ARQUITETURAL

Permitir que clínicas futuramente ofertem programas de saúde a empresas. Não desenvolver agora portal corporativo completo sem priorização. Preparar separação de contratos e eventual vínculo de organização empregadora. Relatórios corporativos deverão ser **agregados e com proteção contra reidentificação**, sem acesso do empregador a prontuário, conversas, métricas individuais ou dados sensíveis por padrão. Avaliar base legal, finalidade, transparência, consentimento quando aplicável e risco de coerção em relações de trabalho.

## 6. Regras para suplementos — DEFINIDO / IMPLEMENTAÇÃO PENDENTE

Produtos físicos podem ter marca PlugPix ou marca própria da clínica. O catálogo comercial deve separar produto, marca, fabricante responsável, composição, lote, validade, disponibilidade, preço de fornecimento, preço de venda, logística e política de devolução. Não pressupor que toda fórmula é suplemento regularizado nem que o Dr. IA pode prescrevê-la. Aplicar regras sanitárias, publicidade, contraindicações, interações e avaliação profissional quando necessária.

## 7. Impacto mínimo sobre o PRD existente

**Seções a complementar, sem substituir:**

- Seção 2: ampliar visão com motor central Dr. IA, novos segmentos e componentes comerciais.
- Seções 3 e 8: acrescentar painel longitudinal médico, IA proativa, WhatsApp, score e gamificação.
- Seção 6: adicionar abstração de dispositivos (pulseira, balança e anel), sem declarar integração homologada.
- Seções 13 e 20: consolidar catálogo-base independente, composição de planos pela clínica, TM-2/TM-3/TM-4 e regras de preço/versionamento.
- Seções 4, 5 e 22: reforçar consentimento, segregação, auditoria e canais de comunicação, preservando a arquitetura existente.
- Roadmap: mercado corporativo como expansão futura.

**Conflitos a resolver antes de codificar:** a nomenclatura TM-3 é nova; não renomear serviços 2.0/4.0 já existentes automaticamente. Confirmar a quantidade anual de consultas do concierge (“3, 4 ou 4”), composição exata de TM-4, lista e franquias das 32 especialidades, condições dos três templates comerciais, limites de autonomia da clínica, titularidade e custo das APIs/WhatsApp, modelo de entrega de hardware, regras de suplementos e nome definitivo do score.

## 8. Critérios de aceite incrementais propostos

1. Super ADM cadastra itens-base separadamente com preço, disponibilidade e condições, sem sobrescrever ofertas já contratadas.
2. Clínica habilitada monta plano com múltiplos itens-base e preço próprio; não adiciona componente indisponível ou excede condições permitidas.
3. Uma assinatura concede somente os benefícios efetivamente contratados e vigentes; backend valida tenant, perfil, contrato, carência e restrições.
4. Paciente e médico visualizam dados com origem, instante e qualidade; nenhuma leitura sintética aparece como real.
5. IA usa somente dados autorizados e disponíveis; eventos são auditados, não duplicados e não dependem de coleta em segundo plano inexistente.
6. Notificações WhatsApp respeitam consentimento, política de envio, horário e privacidade; respostas são vinculadas ao paciente correto após validação de identidade.
7. Score é explicável e versionado, com ausência de dados tratada adequadamente, sem alegações diagnósticas.
8. Identidade da IA é personalizável por clínica sem alterar políticas centrais; isolamento de memória e dados é testado.
9. Painel Médico mostra tendências e prioridades operacionais somente dos pacientes autorizados.
10. Nenhum novo requisito autoriza alterar prontuário definitivo, remover controles de segurança ou reestruturar módulos existentes.

## 9. Entrega solicitada ao Codex

**Etapa 1 (documentação):** incorporar este adendo ao PRD existente com histórico de versão, mantendo conteúdo e decisões anteriores. Produzir mapa de requisitos: existente / parcial / ausente / pendente de definição.

**Etapa 2 (avaliação):** inspecionar código real e apresentar plano de implementação por dependências e menor risco, sem mudanças estruturais amplas.

**Etapa 3 (implementação):** somente após autorização expressa, realizar mudanças pequenas, verificáveis e compatíveis com a arquitetura atual, uma tarefa por vez, com testes, auditoria de segurança e atualização do PRD.

**Não gerar novo Prompt Zero. Não reiniciar o projeto. Não afirmar implementação de funcionalidades apenas por constarem neste adendo.**

## 9. Separação obrigatória de URLs, domínios e PWA por clínica — DEFINIDO (adicionado em 09/10/2026)

### 9.1 Correção do comportamento atual

**Situação relatada:** a implementação atual apresenta Super ADM, clínica, médico e paciente sob uma única URL, diferenciando os ambientes por um seletor no topo. Esse comportamento **não atende à experiência White Label exigida**. O seletor pode permanecer como recurso interno de navegação/inspeção do Super ADM, mas **não deve ser a forma de entrada ou troca de contexto para clínicas, médicos e pacientes**.

**Requisito:** cada clínica deve ter uma URL pública e própria para seu ambiente administrativo, inicialmente em subdomínio fornecido pela PlugPix, e possibilidade de vinculá-la posteriormente a domínio ou subdomínio personalizado, mediante validação de titularidade e configuração segura. O PWA do paciente deve ter **URL distinta** da administração da clínica, preferencialmente um subdomínio do endereço da clínica, com identidade e instalação PWA próprias. O médico poderá acessar o painel profissional no domínio administrativo da clínica, com rota e permissões próprias. O Super ADM deve possuir domínio administrativo central, independente das clínicas.

**Exemplos ilustrativos (não fixar como DNS existente):**

| Ambiente                 | Endereço inicial de exemplo            | Endereço personalizado de exemplo |
| ------------------------ | -------------------------------------- | --------------------------------- |
| Super ADM                | `admin.techmedicina.com.br`            | Marca PlugPix, sem White Label    |
| Clínica A — gestão       | `clinica-a.techmedicina.com.br`        | `gestao.clinica-a.com.br`         |
| Clínica A — PWA paciente | `app.clinica-a.techmedicina.com.br`    | `app.clinica-a.com.br`            |
| Clínica A — médico       | `clinica-a.techmedicina.com.br/medico` | `gestao.clinica-a.com.br/medico`  |
| Clínica B — gestão       | `clinica-b.techmedicina.com.br`        | `gestao.clinica-b.com.br`         |
| Clínica B — PWA paciente | `app.clinica-b.techmedicina.com.br`    | `app.clinica-b.com.br`            |

Os endereços acima são **exemplos de convenção**. Não pressupor que DNS, TLS, wildcard, roteamento, domínio próprio ou certificado estejam provisionados. Avaliar a viabilidade de subdomínios aninhados, provedores de hospedagem e certificados antes da implementação. Se necessário, usar convenção alternativa que mantenha **origens distintas** para gestão e PWA.

### 9.2 Regras funcionais

1. Ao criar uma clínica no Super ADM, provisionar um identificador imutável de tenant e reservar slugs/subdomínios únicos para gestão e PWA; informar as URLs no cadastro da clínica. Impedir colisões, nomes reservados e tomada de domínio de outra clínica.
2. A clínica poderá configurar domínio personalizado para gestão e subdomínio/domínio próprio para PWA; validar posse via DNS ou método seguro, provisionar HTTPS/TLS e confirmar ativação antes de redirecionar tráfego.
3. Ao acessar a URL, a aplicação deve resolver o tenant **no servidor a partir de host validado e cadastrado**; nunca confiar em `tenant_id` fornecido pelo navegador, seletor visual, parâmetro de URL ou cabeçalho não confiável como fonte de autorização.
4. Autenticação e permissões permanecem associadas ao tenant e ao papel (administrador, médico, paciente). O endereço não concede acesso: validar sessão, vínculo e permissões no backend em todas as rotas e APIs.
5. O portal do paciente deve apresentar apenas a identidade visual da clínica, seu catálogo e seus dados; **não exibir seletor de ambientes, clínicas ou perfil Super ADM**.
6. O portal médico pode compartilhar o domínio da clínica, mas exige área própria, sessão autorizada e segregação de dados clínicos conforme o PRD.
7. O Super ADM mantém visão global central e poderá abrir uma visão administrativa contextualizada de clínica, sem falsificar a identidade do administrador local e sem obter automaticamente acesso clínico. Essa operação deve ser auditada.
8. A troca do domínio da clínica não altera `tenant_id`, IDs de pacientes, prontuários, contratos, assinaturas, URLs internas de API nem vínculos de dispositivos. Definir migração/redirect controlado e continuidade de sessão com segurança.
9. O PWA terá manifesto, nome, ícones, `start_url`, `scope`, service worker e configuração de instalação **coerentes com sua origem e marca**; avaliar cache isolado por origem e invalidação ao mudar a identidade visual. O domínio da gestão não deve instalar por engano o PWA do paciente.
10. A comunicação entre origens (admin, PWA, APIs) deve ter política de CORS restrita a origens cadastradas e verificadas; cookies, sessões, OAuth, callbacks, links de e-mail e webhooks precisam ser revisados para múltiplos domínios. Evitar compartilhamento inseguro de cookies entre tenants.
11. Em domínio desconhecido, desativado ou não verificado, não inferir tenant nem apresentar dados; exibir resposta segura. Registrar tentativas de host inválido sem expor dados sensíveis.
12. Configurações de marca e conteúdo são resolvidas por tenant; falhas de carregamento nunca devem mostrar marca ou informações de outra clínica.

### 9.3 Estratégia de implementação incremental e baixo impacto — OBRIGATÓRIA

- **Não recriar o sistema, não duplicar projetos e não separar fisicamente o banco/backend por clínica** sem necessidade arquitetural demonstrada. Manter a estrutura multi-tenant, módulos, serviços e componentes existentes.
- Primeiro inventariar roteamento atual, mecanismo de seletor de ambiente, autenticação, gestão de `tenant_id`, hospedagem, deploy, domínio e suporte a múltiplos hosts.
- Propor um **resolvedor de tenant por host**, uma camada de configuração de domínios e layouts de entrada distintos (Super ADM, gestão clínica/médico, PWA paciente), reutilizando rotas e componentes internos sempre que possível.
- Preservar rotas atuais durante transição quando tecnicamente seguro; adicionar compatibilidade/redirecionamentos sem abrir acesso cruzado. Não executar alteração de DNS, domínio ou deploy de produção sem aprovação.
- Priorizar documentação, testes automatizados e plano de migração antes de mexer em código. O Codex deve apontar limitações reais do provedor de hospedagem/preview e dependências externas.
- Não permitir que o seletor de ambiente atual continue sendo mecanismo de autorização; se mantido para Super ADM, deve ser apenas um controle de contexto administrativo auditado.

### 9.4 Critérios de aceite

1. Clínica A e Clínica B possuem URLs de gestão diferentes e URLs de PWA diferentes, resolvidas corretamente, sem troca de tenant por parâmetro ou seletor.
2. O acesso direto ao host de outra clínica não dá acesso a seus dados, mesmo com manipulação de URLs, IDs, tokens e chamadas de API.
3. O paciente abre e instala o PWA com nome, ícone, cores e URL da sua clínica, sem ver seletor global.
4. O médico acessa o painel pela URL da clínica com permissões profissionais; não ganha acesso a outros tenants.
5. O Super ADM utiliza endereço central separado e mantém gestão global auditada.
6. A associação de domínio personalizado exige validação de titularidade, HTTPS e vínculo único a um tenant.
7. Domínios não reconhecidos não expõem dados; troca de domínio não altera registros nem identidade do tenant.
8. Testes cobrem roteamento multi-host, autorização cross-tenant, CORS/cookies, PWA/manifest, URLs antigas e regressões das funções já desenvolvidas.

### 9.5 Entrega solicitada ao Codex nesta fase

**Atualizar primeiro o PRD principal** com esta seção; produzir diagnóstico do código atual, análise de impacto, proposta incremental de roteamento multi-domínio, dependências de infraestrutura e plano de testes. **Não implementar alterações no código-fonte, DNS, hospedagem, banco ou produção sem aprovação explícita do proprietário.**
