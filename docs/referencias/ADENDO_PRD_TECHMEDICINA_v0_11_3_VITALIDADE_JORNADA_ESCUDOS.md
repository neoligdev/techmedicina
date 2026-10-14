# ADENDO INCREMENTAL AO PRD — PLUGPIX TECHMEDICINA / DR IA

**Versão consolidada do adendo:** 0.11.3 | **Referência:** 12/10/2026 | **Documento-base:** `PRD_Techmedicina.md` v0.10

**Status:** requisitos de negócio definidos pelo proprietário; detalhes operacionais explicitamente indicados como PENDENTES ou RECOMENDADOS. A seção 11 abaixo PREVALECE sobre a terminologia e as regras de pontuação das seções 4 e 10, que são mantidas apenas para rastreabilidade histórica.

## 0. Regra obrigatória de integração ao desenvolvimento existente

Este documento é um **adendo** e não substitui o PRD atual. O Codex deverá localizar e ler `PRD_Techmedicina.md` e inspecionar o repositório antes de agir. Preservar estrutura, rotas existentes (`/super-admin`, `/clinica`, `/medico`, `/app`, se presentes), autenticação, banco, contratos, fluxos, funcionalidades e decisões já implementadas. Inserir os requisitos nas seções correlatas do PRD, preferencialmente como subseções e ajustes pontuais; manter histórico de alterações e decisões. **Não executar migrações, refatorações amplas, exclusões, integrações externas ou alterações no código-fonte automaticamente com base neste adendo.** Primeiro atualizar o PRD e apresentar análise de impacto, inventário do que já existe e plano incremental, com itens pendentes de aprovação. Nenhuma funcionalidade descrita deve ser anunciada como implementada sem evidência no repositório e testes.

## 1. Catálogo central de componentes comercializáveis — DEFINIDO

O Super ADM gerencia um **catálogo de itens-base independentes**, denominados componentes/ingredientes comerciais, com preço de fornecimento e regras próprias. Cada clínica autorizada poderá comercializá-los isoladamente (quando permitido) ou combiná-los em pacotes e planos de sua marca, com nome, preço final, descrição e condições comerciais próprias, respeitando benefícios e restrições centrais. **Não limitar a clínica a três planos**: os três níveis de oferta ao consumidor são estratégia inicial da PlugPix, não limite estrutural para o número de planos das clínicas.

### 1.1 Componentes iniciais

| Código comercial | Componente e escopo | Regra / observação |
|---|---|---|
| TM-2 | **Telemedicina 2.0:** pronto atendimento online 24h com clínico geral ou pediatra | Distinguir atendimento 24h de consultas agendadas; especificar elegibilidade, canais, limites e dependentes no contrato |
| TM-3 | **Telemedicina 3.0:** pronto atendimento 24h **mais** consultas agendadas em até 32 especialidades/áreas previstas no catálogo contratado | Relação exata das 32 especialidades, limites e condições ainda requer validação; não presumir consultas ilimitadas |
| TM-4 | **Telemedicina 4.0:** concierge para agendamento de atendimento presencial | **Carência de 90 dias e fidelidade de 12 meses** como parâmetros comerciais iniciais; quantidade anual de consultas mencionada como “3, 4 ou 4” pelo proprietário: **PENDENTE de confirmação**, sem corrigir por suposição; esclarecer se TM-4 é complemento ou inclui TM-2/TM-3 |
| HW-PULSE | Pulseira inteligente | Venda/cessão do hardware, ativação, reposição, suporte e vínculo com paciente definidos separadamente |
| HW-SCALE | Balança de bioimpedância | Integração técnica e métricas dependem do modelo e da validação BLE/API |
| HW-RING | Anel inteligente | Integração técnica e métricas dependem do modelo e da validação BLE/API |
| AI-CARE | Assistente de saúde IA proativa | Motor central PlugPix; identidade White Label por clínica; acesso condicionado a autorização, contrato e consentimento |
| PROTOCOL | Protocolos de acompanhamento médico | Catálogo de protocolos por nicho, com profissionais, etapas, exames, acompanhamento e regras próprias |
| SUPPLEMENT | Suplementos | Marca PlugPix ou marca própria da clínica, com SKU, composição, lote, validade, estoque/logística, preço e regras de rotulagem e publicidade aplicáveis |

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

| Ambiente | Endereço inicial de exemplo | Endereço personalizado de exemplo |
|---|---|---|
| Super ADM | `admin.techmedicina.com.br` | Marca PlugPix, sem White Label |
| Clínica A — gestão | `clinica-a.techmedicina.com.br` | `gestao.clinica-a.com.br` |
| Clínica A — PWA paciente | `app.clinica-a.techmedicina.com.br` | `app.clinica-a.com.br` |
| Clínica A — médico | `clinica-a.techmedicina.com.br/medico` | `gestao.clinica-a.com.br/medico` |
| Clínica B — gestão | `clinica-b.techmedicina.com.br` | `gestao.clinica-b.com.br` |
| Clínica B — PWA paciente | `app.clinica-b.techmedicina.com.br` | `app.clinica-b.com.br` |

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



## 10. Gamificação — Jornada dos Horizontes — DEFINIDO (12/10/2026)

### 10.1 Decisão de produto e identidade

**Nome aprovado da jornada:** **Jornada dos Horizontes**. É o sistema próprio de progressão e engajamento do paciente, com estética de horizontes, amanhecer, caminhos e evolução pessoal, **sem faixas de artes marciais**. Objetivo: estimular constância em hábitos e adesão aos protocolos com regras fáceis de entender, sem competição prejudicial, complexidade excessiva ou aparência de diagnóstico.

**Nome provisório do indicador geral de bem-estar:** **Índice VIVA**. Não tratar o nome como marca registrada ou denominação final antes de pesquisa de disponibilidade. **Jornada dos Horizontes (pontos de engajamento) e Índice VIVA (indicador de bem-estar) são sistemas distintos**, embora possam aparecer juntos na página inicial.

O modelo visual proposto possui **cinco níveis**, sujeitos à aprovação final dos nomes e dos limiares:

1. **Origem** — início da jornada; ícone semente/horizonte nascente.
2. **Ritmo** — construção de consistência; ícone céu abrindo.
3. **Avanço** — continuidade; ícone caminho/montanha.
4. **Equilíbrio** — manutenção de bons hábitos; ícone horizonte ao amanhecer.
5. **Plenitude** — marco de evolução; ícone sol/horizonte amplo.

**DEFINIDO:** jornada temática e progressão simples de cinco níveis. **RECOMENDADO/PENDENTE:** nomes individuais acima, identidade gráfica final, regras de progressão, pontos mínimos e política de manutenção/rebaixamento de nível. Não inventar números de corte como decisão aprovada.

### 10.2 Modelo de pontuação simples

A jornada deve atribuir pontos por **ações verificáveis de participação e adesão**, nunca por estar clinicamente “saudável”, ter peso baixo, frequência cardíaca menor, exame normal ou consumir bebidas alcoólicas. Eventos candidatos:

- Check-in com a IA (bem-estar, sintomas e contexto), com frequência limitada.
- Registro voluntário de hidratação, alimentação e sono; sem exigir divulgação excessiva de dados íntimos.
- Sincronização válida de pulseira, anel ou balança, sem premiar repetidas medições do mesmo período.
- Cumprimento confirmado de tarefa/etapa de protocolo e compromissos combinados com equipe assistencial.
- Registro de atividade física adequada ao plano individual; oferecer equivalentes acessíveis para quem possui limitações funcionais.
- Atualização de exame/documento solicitado, quando pertinente, sem estimular exames desnecessários.
- Registro de consumo de álcool, quando voluntário e clinicamente pertinente, **apenas como informação contextual**; não premiar consumo, abstinência declarada sem verificação ou omissão.

**RECOMENDADO:** poucos tipos de missão diária (até 3–5 visíveis por vez), valores de pontos simples, teto diário por categoria, deduplicação, validação por evento e configuração versionada no Super ADM. Os valores numéricos de exemplo apresentados em conversas anteriores eram ilustrativos e **não estão aprovados**. Não criar punição automática por falha em registro, doença, incapacidade, biometria desfavorável, interrupção de dispositivo ou tratamento. Evitar streaks punitivos e notificações insistentes; permitir pausa e desativação da gamificação.

### 10.3 Experiência do paciente (PWA e WhatsApp)

No início do PWA White Label, adicionar de modo incremental um cartão compacto com **nível atual, pontos de evolução, progresso para próximo nível e até três missões relevantes**. Tela de detalhes apresenta os cinco níveis, histórico resumido de pontos e motivo das conquistas. A IA pode reconhecer conquistas e sugerir pequenas missões adequadas ao objetivo escolhido (performance, qualidade de vida, longevidade, sono, emagrecimento). Nunca usar linguagem de culpa ou comparar pacientes entre si por estado de saúde.

No WhatsApp, a IA pode lembrar uma missão e reconhecer um marco **somente quando houver opt-in e observância das políticas do canal**; não divulgar indicadores sensíveis na notificação. Missões devem poder ser concluídas no PWA ou por respostas autorizadas à IA, com registro idempotente no backend.

A clínica pode aplicar nome, avatar e identidade visual da sua assistente e seu tema White Label ao módulo, mas **as regras centrais de segurança e o significado dos pontos são controlados pela PlugPix**. Eventual renomeação da jornada por clínica fica **PENDENTE**, não presumida.

### 10.4 Índice VIVA — indicador geral de bem-estar (nome provisório)

O Índice VIVA é **separado dos pontos da Jornada dos Horizontes**. Seu propósito inicial é sintetizar tendências de bem-estar e disponibilidade dos dados, com linguagem não diagnóstica. Fontes candidatas, quando confiáveis e pertinentes: sono, atividade, autorrelatos, hidratação, sinais de recuperação, histórico longitudinal e contexto clínico autorizado. Exames laboratoriais e biomarcadores não devem entrar na fórmula sem protocolo metodológico e avaliação regulatória apropriados.

**Não implementar nem apresentar um número clínico real de 0–100 antes de definir e validar:** finalidade de uso, população-alvo, variáveis, pesos, normalização, qualidade mínima dos dados, tratamento de ausências, diferenças por idade/condição, possibilidade de contestação, explicabilidade, limitações e enquadramento regulatório (incluindo avaliação de SaMD/Anvisa conforme funcionalidade). O exemplo 82/100 é apenas ilustrativo. Se a metodologia não estiver aprovada, apresentar no PWA apenas uma **prévia não numérica ou componente desativado**, sem fabricar pontuação.

Nunca transformar pontos de engajamento em suposta medida de saúde. O médico poderá consultar as tendências e fontes autorizadas, distinguindo dados brutos, relatos, métricas derivadas e pontuação de participação.

### 10.5 Regras técnicas e proteção de dados

- Reaproveitar `tenant_id`, `patient_id`, permissões, eventos e serviços existentes; não criar nova aplicação ou backend exclusivo para gamificação.
- Motor de pontos preferencialmente **determinístico, versionado e auditável**; a IA propõe missões e escreve mensagens, mas **não credita pontos livremente**.
- Registrar evento de origem, data, tipo de missão, pontos, regra aplicada, estado (pendente/confirmado/revertido) e motivo de estorno, sem replicar informações clínicas sensíveis no ledger de pontos.
- Aplicar deduplicação/idempotência por evento, limites de frequência e controles contra manipulação. Permitir correções auditadas.
- Garantir segregação por clínica/paciente, acesso restrito e respeito às preferências de comunicação; não criar ranking público de pacientes nem divulgar condições de saúde.
- Definir retenção, exportação, revisão e exclusão dos dados conforme base legal e obrigações aplicáveis; pontos não devem ser usados para negar serviços contratados ou atendimento médico.
- Pontuação não determina prioridade clínica, diagnóstico, elegibilidade assistencial ou preço de plano. Alertas clínicos usam protocolos próprios, não níveis do jogo.

### 10.6 Critérios de aceite propostos

1. Paciente vê somente seus próprios pontos, nível e missões, com identidade visual da clínica correta.
2. Cinco níveis configuráveis por regra central; não há faixas de artes marciais, ranking clínico ou cópia de identidade concorrente.
3. Eventos duplicados não geram pontos duplicados; regras têm versão e rastreabilidade.
4. Leituras de dispositivo ou exames alterados não retiram pontos por resultado clínico; dados ausentes não são tratados como resultados normais.
5. IA pode propor missão, mas crédito de pontos exige evento e regra autorizados no servidor.
6. Paciente pode pausar gamificação e notificações; ausência de dispositivo não impede alternativas de participação.
7. Pontos de jornada não são confundidos com Índice VIVA. Índice VIVA numérico permanece inativo até validação específica.
8. Nenhum paciente, médico ou administrador de outra clínica acessa dados de evolução indevidamente.
9. Funcionalidades já existentes (telemedicina, prontuário, pagamentos, PWA, WhatsApp, autenticação) passam nos testes de regressão.

### 10.7 Orientação de implementação ao Codex — documentação primeiro

1. Incorporar esta seção ao `PRD_Techmedicina.md` sem remover requisitos das versões 0.10–0.11.1.
2. Mapear componentes e eventos já existentes que podem alimentar a gamificação e identificar lacunas reais.
3. Apresentar proposta mínima de tabelas/serviços/telas e migrações, preservando a arquitetura atual e URLs White Label descritas na seção 9.
4. Marcar explicitamente **DEFINIDO, RECOMENDADO e PENDENTE**, especialmente nomenclatura dos cinco níveis, limiares, valores por missão e metodologia do Índice VIVA.
5. **Não alterar código, banco, DNS ou deploy nesta etapa sem autorização explícita. Não gerar Prompt Zero.**


## 11. VITALIDADE + JORNADA + ESCUDOS — DECISÃO APROVADA EM 12/10/2026 (SUBSTITUI SEÇÕES 4 E 10 EM CASO DE CONFLITO)

### 11.1 Nomes e fronteiras conceituais — DEFINIDO

- **VITALIDADE** substitui integralmente o nome provisório “Índice VIVA”. É um índice multidimensional de tendências de saúde/bem-estar em escala proposta 0–100, que pode subir ou descer. **A fórmula, os pesos, limiares e a alegação de validade científica estão PENDENTES de avaliação metodológica, clínica e regulatória**. Até aprovação, não exibir nota numérica real ou afirmar que o índice é validado.
- **JORNADA** substitui “Jornada dos Horizontes” como nome exibido ao paciente. É a mecânica gamificada de **adesão às metas individualmente aplicáveis**, independente da VITALIDADE, com pontos diários 0–100 e Escudo ativo determinado pelo desempenho recente.
- **ESCUDOS** são distintivos com arte própria. Cinco níveis iniciais: **Origem, Ritmo, Avanço, Equilíbrio, Plenitude**. O Super ADM cadastra, carrega, versiona, aprova, ordena, ativa/inativa e publica as artes e metadados dos Escudos no sistema. A clínica aplica o tema White Label sem alterar a lógica central. O histórico de Escudos conquistados é permanente conforme as políticas de retenção e direitos aplicáveis.
- Pontos da JORNADA não entram diretamente no cálculo da VITALIDADE. Um paciente pode ter alta adesão e indicadores desfavoráveis, ou vice-versa. **HRV** significa variabilidade da frequência cardíaca e é apenas um sinal fisiológico opcional, não o nome do índice geral.

### 11.2 Fontes e equidade entre planos — DEFINIDO

- O catálogo de planos/entitlements determina **quais recursos e fontes estão disponíveis**, não um teto menor de pontuação. Paciente sem dispositivo pode atingir 100 na JORNADA e alcançar Plenitude; dispositivo não concede bônus automático por posse ou sincronização.
- Fontes manuais: hidratação, alimentação, qualidade/duração do sono, estado emocional, exames enviados ou resultados estruturados, adesão à medicação **quando prescrita**, treinos, academia, esportes e frequência semanal, tabagismo, álcool, sintomas, consultas e acompanhamento de protocolos.
- Fontes automáticas **somente quando tecnicamente suportadas e confiáveis**: pulseira (atividade/passos, sono, frequência cardíaca, eventualmente HRV); balança (peso e estimativas de composição corporal); outros dispositivos futuros (p.ex. anel). Não presumir que H59MAX, balanças ou anéis oferecem APIs/BLE, HRV ou qualidade clínica sem testes.
- Todos os dados **pertinentes** podem ser candidatos à avaliação, mas **não somar diretamente cada entrada**: consolidar por domínios, evitar dupla contagem de passos+treino e peso+IMC+bioimpedância, respeitar unidades, temporalidade, proveniência, precisão, outliers e consentimentos.
- Exames e dados fisiológicos não devem ser inferidos como normais quando ausentes. Exibir **cobertura/completude** e origem (manual, dispositivo, exame, profissional). Sem dados mínimos para cálculo confiável, mostrar **“avaliação parcial”** ou **“dados insuficientes”**, sem nota enganosa. Pacientes com planos distintos não devem receber comparação pública ou classificação discriminatória.
- Dados de autorrelato são válidos para participação e acompanhamento, com rótulo de autorrelato; não devem ser tratados como equivalentes a medição clínica confirmada. Coleta de álcool/tabaco deve ser não punitiva, confidencial e sem incentivo a consumo.

### 11.3 VITALIDADE — desenho metodológico para validação (NÃO É FÓRMULA APROVADA)

- Domínios candidatos: **cardiometabólico** (pressão, glicemia, lipídios, peso e contexto), **atividade/capacidade física**, **sono/recuperação**, **hábitos/alimentação/hidratação/tabaco/álcool** e **bem-estar emocional**. Adesão à medicação, exames realizados e check-ins são prioritariamente medidas de processo/adesão e não evidência direta de melhora clínica.
- Pesos **30% cardiometabólico, 20% atividade, 20% sono, 20% hábitos e 10% bem-estar emocional** são apenas **hipótese de pesquisa**, NÃO regra de produção, NÃO comprovação científica. Pesos devem ser definidos após revisão bibliográfica, escolha de instrumentos e avaliação de especialistas; considerar populações, comorbidades, idade, acessibilidade e objetivos.
- Referências candidatas: *Life's Essential 8* (AHA) para saúde cardiovascular, PSQI para sono, WHO-5 para bem-estar, instrumentos alimentares validados e diretrizes de atividade física. São **referências para estudo**, não autorização para afirmar que uma nova combinação é validada, nem para reproduzir questionários protegidos sem verificar licença.
- Especificar finalidade de uso, população-alvo, interpretação, pesos, normalização, limites, missingness, confiança, sensibilidade, variabilidade biológica, diferenças por perfil, testes de confiabilidade, validade e equidade, revisão médica, versionamento e eventual enquadramento de software como dispositivo médico. Antes disso, usar interface informativa sem escore clínico numérico.
- Uma alteração crítica de sinais ou sintomas gera fluxo clínico próprio, independente do escore agregado. Nunca usar VITALIDADE para diagnosticar, prescrever, negar serviço ou classificar urgência sem protocolo clínico aprovado.

### 11.4 JORNADA — pontuação diária e metas aplicáveis — DEFINIDO / parâmetros RECOMENDADOS

- A JORNADA mede **cumprimento de metas personalizadas**, não gravidade da doença. **Pontuação diária normalizada de 0 a 100 = 100 × soma dos pesos de metas elegíveis cumpridas / soma dos pesos das metas elegíveis**, com tratamento explícito de metas parciais e validação de evidências; fórmula funcional **RECOMENDADA**, sujeita a testes e decisão final do Super ADM.
- Exemplos **não vinculantes** de pesos por missão: registrar água 10; alimentação 10; sono 15; check-in emocional 10; adesão a medicação prescrita 20; atividade física indicada 20; check-in Dr. IA 15. **Não publicar estes pesos como regra definitiva.** A meta é atribuída conforme plano, perfil, periodicidade e orientação profissional. Exercício 3x/semana não gera falta nos dias de descanso; ausência de prescrição elimina missão de medicação do denominador.
- Metas não aplicáveis são retiradas do denominador **por regra controlada e auditada**, nunca manipuláveis livremente pelo paciente. Se não houver metas elegíveis, registrar **dia não avaliável**, sem atribuir zero ou 100 arbitrariamente.
- Missões concluídas via PWA, WhatsApp ou dispositivo devem gerar evento idempotente; leitura automática pode comprovar uma meta elegível, **sem duplicar** registro manual. Pontos variam diariamente. Ausência de sincronização, internet ou dispositivo não significa não adesão: permitir alternativas, reconciliação e período de tolerância. Não premiar medição excessiva nem hábitos nocivos.
- Paciente pode pausar gamificação; metas e alertas devem respeitar preferência, acessibilidade, horário e situação clínica. Nenhuma pontuação restringe benefícios contratados.

### 11.5 Escudo ativo, regressão e conquistas históricas — DEFINIDO / limiares RECOMENDADOS

- Escudo ativo calculado a partir de **média móvel dos últimos sete dias avaliáveis**, com política explícita para dias não avaliáveis, pausas e histórico insuficiente. Não preencher dias ausentes com zero; se amostra insuficiente, manter estado anterior ou exibir estado provisório, conforme regra a aprovar.
- Limiares **iniciais para teste, não definitivos**: Origem 0–29; Ritmo 30–54; Avanço 55–74; Equilíbrio 75–89; Plenitude 90–100.
- Promoção: ao alcançar o limiar do próximo Escudo segundo a média elegível, observada a regra de estabilidade aprovada. **Regressão:** após **três avaliações diárias consecutivas válidas** com média abaixo do limiar do Escudo ativo; não regredir por um único dia ruim. Regras de estabilidade, histórico mínimo e desempate são **RECOMENDADAS** para homologação.
- **Escudos já conquistados nunca desaparecem do histórico por regressão.** A pessoa pode exibir Escudo ativo inferior ao máximo histórico. Tela própria **“Meus Escudos”** no PWA apresenta arte, nome, estado atual/histórico, data e hora da conquista com fuso horário, pontos JORNADA, **VITALIDADE no instante da conquista se houver índice validado e calculável**, ou “indisponível/não calculada” — **jamais inventar valor**. Mostrar próximos Escudos bloqueados e critérios simples de progresso.
- Registrar eventos de conquista, promoção, regressão, reaquisição e correção com IDs estáveis, timestamp UTC + apresentação em fuso local, versão da regra, `tenant_id`, `patient_id`, escudo, pontuação JORNADA e referência a snapshot VITALIDADE quando existente; evitar duplicação de dados clínicos sensíveis no ledger de gamificação. Correções preservam trilha de auditoria.

### 11.6 Cuidado adaptado e proteção contra punição injusta — DEFINIDO

- Se o paciente relata doença aguda, internação, cirurgia, acamamento, tratamento intenso ou limitação funcional, o Dr. IA deve oferecer **revisão contextual de metas**, respeitando orientações clínicas e fluxos de escalonamento quando necessário.
- Ajustar **missões elegíveis, frequência e esforço apropriado**, em vez de ocultamente diminuir o limiar do Escudo ou presumir que o paciente deixou de se cuidar. Repouso indicado, seguimento de orientações e atividades adaptadas podem ser metas válidas. Em internação, priorizar equipe assistencial e permitir pausa sem perda histórica.
- A IA não altera prescrição, intensidade de exercício clinicamente contraindicada nem parâmetros médicos de forma autônoma. Mudanças clínicas relevantes requerem protocolo autorizado ou avaliação do profissional responsável.
- Interface do paciente deve ser **simples e não estigmatizante**; não expor coeficientes matemáticos desnecessários, **mas explicar claramente que metas foram adaptadas, quais estão vigentes, o que afeta a pontuação e como contestar correções**. Não ocultar mudança material das regras.
- Pausa médica ou técnica e períodos não avaliáveis **não causam regressão automática**. Propor estado protegido/pausado com registro de motivo e controle de acesso; especificação operacional detalhada PENDENTE.

### 11.7 Administração, White Label, telas e segurança — DEFINIDO

- Super ADM: **biblioteca central de Escudos** com upload de SVG/PNG/WebP permitido por política, verificação de tipo real, sanitização rigorosa de SVG (ou preferência por raster), limite de tamanho, armazenamento seguro, versões, pré-visualização, ordem, nome, descrição, critérios, estado de publicação, rollback e auditoria. Arte de Escudo é controlada pelo Super ADM; clínica não altera critérios nem substitui a arte oficial, apenas aplica seu tema e identidade White Label no restante da interface.
- PWA paciente, sob **URL própria por clínica** conforme seção 9: cartões separados VITALIDADE (quando validada) e JORNADA; Escudo ativo, tendência, próximas missões e Escudo seguinte; tela de histórico com conquistas e respectivas datas/horas e snapshot de VITALIDADE, inclusive após regressão.
- Painel médico da clínica: visualizar dados de origem, tendências, cobertura, contexto de adaptações e adesão, com separação inequívoca de dados clínicos e gamificação. Somente dados de pacientes autorizados. Super ADM não obtém acesso clínico irrestrito por gerenciar Escudos.
- Backend multi-tenant, RBAC, validação server-side, versionamento de regras, auditoria, idempotência, limites contra fraude e segregação de dados; reaproveitar módulos/rotas existentes. Não duplicar backend por clínica. Dados clínicos sensíveis seguem LGPD e controles de acesso do PRD principal.
- O Dr. IA pode **explicar tendências e propor missões**; o motor determinístico autoriza pontuação e alteração de Escudo. Não confundir alertas clínicos com regressão de jogo.

### 11.8 Critérios mínimos de aceite — DEFINIDO

1. Paciente só com app, sem dispositivo ou exame, consegue participar integralmente da JORNADA, atingir 100 e alcançar Plenitude com metas aplicáveis; VITALIDADE informa cobertura parcial ou insuficiência quando necessário.
2. Planos com pulseira e/ou balança usam fontes extras sem duplicar eventos, dar vantagem automática por hardware ou presumir capacidades não homologadas.
3. Medicação só é meta se prescrita; descanso, esporte semanal e restrições médicas são respeitados.
4. VITALIDADE e JORNADA são exibidas separadamente; índice clínico numérico permanece indisponível até validação formal.
5. Média móvel de sete dias e regra de três avaliações consecutivas para regressão são testáveis; dia sem dados e pausa protegida não equivalem a fracasso.
6. Tela Meus Escudos mantém conquistas antigas mesmo após regressão e mostra data/hora, pontos da JORNADA e snapshot de VITALIDADE **somente se disponível**.
7. Super ADM cadastra/publica artes dos Escudos com segurança, versionamento e auditoria; clínicas não conseguem alterar regras globais.
8. Dr. IA adapta missões a situações de doença e tratamento sem prometer autonomia clínica; mudanças e explicações são auditáveis.
9. Sem vazamento entre clínicas, sem regressões de autenticação, telemedicina, prontuário, pagamentos, domínios próprios e PWA.

### 11.9 Diretriz ao Codex — DOCUMENTAÇÃO APENAS

1. Ler `AGENTS.md`, PRD vigente, decisões e código existente; incorporar esta seção como **substituição lógica** das terminologias “Índice VIVA” e “Jornada dos Horizontes”, preservando histórico de versões e demais requisitos anteriores.
2. Documentar explicitamente o que já existe, parcialmente existe ou falta: cadastro de metas, fontes manuais, integrações de equipamentos, histórico, gamificação, biblioteca de artes e telas PWA.
3. Propor plano incremental de menor impacto, migrações futuras, dependências, testes, riscos e rollback, sem reconstruir o projeto e sem duplicar estruturas já existentes.
4. **Não alterar código-fonte, banco, migrações, deploy ou DNS nesta etapa sem autorização expressa. Não gerar Prompt Zero.**
5. Manter a distinção **DEFINIDO** (identidade, separação, proteção, histórico, gestão central), **RECOMENDADO** (normalização, média e limiares operacionais) e **PENDENTE** (algoritmo VITALIDADE validado, parâmetros definitivos, dispositivos homologados, condições clínicas específicas).
