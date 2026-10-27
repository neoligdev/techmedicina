# Status Temporário do Projeto

Atualizado em 26/10/2026. Gerado a partir do catálogo; verde descreve somente o escopo entregue.

## 1 - Processo e estado das decisões 🔵

- **Status**: 🔵 Em implementação / parcial
- **Autores**: Antigravity, Codex
- **Entregue**: PRD preservado, matriz de requisitos e registros de continuidade criados.
- **Próximo Passo**: Consolidar decisões abertas e manter este relatório a cada etapa.

**Requisitos**:

- DEFINIDO: requisito expresso pelo usuário nesta conversa ou retomado do histórico disponível.
- RECOMENDADO: detalhamento proposto para avaliação do usuário.
- PENDENTE: escolha, integração ou validação ainda necessária.
- A construção dos comandos para Lovable e Antigravity só começa quando o usuário declarar que as especificações estão prontas.
- O PRD deve estabelecer funções, atores, permissões, regras, dependências e critérios de aceite. Os critérios abaixo são propostos e deverão ser consolidados ao concluir as regras.

## 2 - Visão e arquitetura funcional 🔵

- **Status**: 🔵 Em implementação / parcial
- **Autores**: Lovable, Antigravity, Codex, OpenCode
- **Entregue**: Quatro áreas demonstrativas e design preservados. Cloud multi-tenant com Auth, RLS, cadastro/auditoria e marca por UUID; Super ADM e salvar/recarregar marca QA homologados. Reservas White Label pendentes persistem no Cloud, com mensagem de duplicidade verificada. Paginação e contratos locais de host/rota/identidade testados. Domínio techmedicina.com.br e Registro.br informados pelo proprietário; sugestões de hosts implementadas sem ativação. Em 22/10/2026, o backend local avançou com prova assinada e proposta transacional 020 (D119/D120), integrados localmente em develop após autorização específica; sem ativação ou alteração da main.
- **Próximo Passo**: Backend de roteamento D119/D120 integrado e validado localmente em develop. Homologar worker/chaves, SQL, ingresso, DNS/TLS e contexto SSR antes de ativar hosts; autorização específica para mudanças remotas. A demo unificada continua disponível.

**Requisitos**:

- Plataforma por assinatura (SaaS), completa e robusta, com prioridade alta em segurança de dados. Hierarquia: Super ADM → CMDs/clínicas → pacientes. Dentro do ambiente da clínica haverá um módulo Médico com acesso profissional próprio.
- Super ADM utiliza PlugPix Techmedicina; cria e administra clínicas e habilita módulos.
- Módulos habilitáveis inicialmente definidos: Telemedicina 2.0/4.0, Pulseira Inteligente e Protocolos. Os demais módulos descritos nas seções posteriores ampliam o escopo; suas regras de liberação por contrato ainda serão consolidadas.
- Clínica tem ambiente isolado e identidade própria (white label).
- Personalização: nome, domínio, logomarca, tela de abertura, ícone da aba do navegador, ícone de instalação do PWA, cores dos menus e temas claro/escuro. Aplicativo do paciente segue a identidade da clínica.
- Administração da clínica adaptada a computador e celular, com perfis e permissões por menu/função.
- Autorizações verificadas no servidor, negadas por padrão quando não concedidas.
- Registros de auditoria da operação; consulta global dos registros exclusiva do Super ADM. Isso não estabelece acesso administrativo automático ao conteúdo clínico.
- Evitar marcas, comentários e referências desnecessárias a Lovable/Antigravity no código, respeitando obrigações aplicáveis às dependências utilizadas.
- Adendo v0.11.1 §9: Super ADM em host central; gestão e PWA em origens próprias por clínica; médico no host da clínica. Resolver host cadastrado no servidor, cruzar sessão/vínculo/permissão, validar domínio próprio e TLS; PWA sem seletor global. Reutilizar backend e componentes.

## 3 - Módulo Médico 🔵

- **Status**: 🔵 Em implementação / parcial
- **Autores**: Lovable, Antigravity, Codex
- **Entregue**: Prévia médica navegável e painel de indicadores demonstrativos compartilhado com o cliente.
- **Próximo Passo**: Concluir identificação, prontuário, exames, agenda e comunicação com segurança real.

**Requisitos**:

- O módulo integra prontuário, dados de saúde, exames, agenda, consultas agendadas, chat, documentos e chamada de vídeo. O acesso clínico descrito é exclusivo do perfil médico identificado por seu registro no conselho profissional.

## 3.1 - Identificação e autorização 🔵

- **Status**: 🔵 Em implementação / parcial
- **Autores**: Antigravity, OpenCode, Codex, Lovable
- **Entregue**: Auth getUser e identidade persistida com vínculos/grants e RLS implementados. Login real do Super ADM homologado, sem acesso clínico automático. Contrato local por host restringe clínica/papel e conta multivínculo; ainda sem integração ao SSR. Validação de registro médico produtiva não implementada.
- **Próximo Passo**: Provisionar vínculos somente após verificar contas e aprovar concessões específicas; homologar médico/paciente e isolamento real entre clínicas, além da verificação profissional e contexto por domínio.

**Requisitos**:

- DEFINIDO: associar o profissional à sua identidade e número de conselho; as evoluções exibem nome e CRM do autor.
- RECOMENDADO: cadastro de CRM e UF, validação da identidade e situação profissional antes da liberação, conta individual e autenticação com segundo fator. O CRM identifica o profissional; não funciona como senha ou prova suficiente de identidade.
- RECOMENDADO: administradores e Super ADM não recebem permissão de leitura clínica pelo simples cargo administrativo. Acesso de suporte, se futuramente necessário, exige regra específica.
- DEFINIDO posteriormente: Super ADM pode editar/inativar médicos e atribuí-los a novas clínicas (seção 12.2). PENDENTE: validação/aprovação, permissões locais e alcance da suspensão.
- PENDENTE: distinguir médicos com CRM de outros profissionais de saúde com seus próprios conselhos, caso sejam incluídos. Não equiparar automaticamente competências nem acessos.

## 3.2 - Prontuário e evoluções 🔵

- **Status**: 🔵 Em implementação / parcial
- **Autores**: OpenCode
- **Entregue**: Ainda não há prontuário funcional validado. C010 (executor OpenCode) implementa unidade de criptografia server-only AES-256-GCM para o texto clínico, com testes unitários e endurecimento R1 (snapshot de contexto, IV/limites estritos); sem persistência, guarda, UI ou assinatura.
- **Próximo Passo**: Falta implementar e validar prontuário e evoluções, respeitando as decisões pendentes do PRD.

**Requisitos**:

- Caixa de texto onde o médico escreve orientações e conclusões e salva um novo registro.
- Histórico cronológico com data, hora, nome do médico e CRM. RECOMENDADO: registrar também UF e identidade interna imutável do autor.
- Depois de salvo, o registro não pode ser editado ou apagado por usuários. A interface e o servidor devem aplicar essa regra.
- Histórico compartilhado entre médicos cadastrados e com acesso ativo na mesma clínica do paciente, conforme seção 5. Médicos de outras clínicas não têm acesso.
- Todo texto médico deve estar criptografado e protegido no banco de dados.
- RECOMENDADO: permitir correção/complemento por nova evolução vinculada à anterior, preservando o original, a autoria e o momento de cada registro.
- RECOMENDADO: distinguir rascunho de registro definitivo, se houver rascunhos. Nunca alterar silenciosamente uma evolução definitiva.
- PENDENTE: fluxo de assinatura das evoluções, campos clínicos adicionais, anamnese e demais elementos do prontuário. O campo de texto é a experiência de escrita solicitada; não se presume que ele isoladamente cubra todos os requisitos de um prontuário eletrônico.

## 3.3 - Dados de saúde e IA 🔵

- **Status**: 🔵 Em implementação / parcial
- **Autores**: Codex
- **Entregue**: Bioimpedância e pulseira com números fictícios, gráficos, histórico e tabelas na visão médica.
- **Próximo Passo**: Integrar coleta real e IA validada; estados emocionais e análise clínica ainda pendentes.

**Requisitos**:

- Ao abrir o paciente, o médico acessa junto ao prontuário:
- Indicadores efetivamente coletados pela pulseira e sincronizados ao sistema.
- Dados inseridos pelo paciente no aplicativo.
- Estado emocional do dia e relato de como está se sentindo.
- Conversas do paciente com a IA Médica, cujo nome será definido posteriormente.
- Exames e demais documentos clínicos recebidos.
- RECOMENDADO: exibir origem, data/hora da coleta e recebimento, unidade e informação de qualidade disponível; separar relatos do paciente, medições do dispositivo, conteúdo de IA e conclusões assinadas pelo médico. A IA não altera registros definitivos em nome do profissional.
- PENDENTE: indicadores suportados, gráficos, frequência de sincronização, tratamento de dados ausentes/inconsistentes e alcance de acesso da IA. Não foi definida gravação ou transcrição automática de consultas.

## 3.4 - Exames e documentos 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar exames e documentos, respeitando as decisões pendentes do PRD.

**Requisitos**:

- Paciente envia exames de sangue e de imagem pelo aplicativo.
- Médico consulta os arquivos ao lado do prontuário, no contexto do paciente.
- Médico envia arquivos de orientação ao paciente e recebe arquivos dele pelo chat.
- Médico anexa receitas, pedidos de exames e atestados emitidos em plataforma externa de emissão e assinatura ICP-Brasil.
- DEFINIDO neste momento: anexação de documentos externos. Integração automática com a plataforma emissora não foi definida.
- RECOMENDADO: preservar o arquivo originalmente assinado; registrar tipo, autor, paciente, consulta e momento do envio. Fazer checagem técnica da assinatura antes de apresentar um documento como verificado.
- PENDENTE: fornecedor de emissão/assinatura, formatos e tamanhos aceitos, apresentação ao paciente e suporte a imagens médicas DICOM ou apenas arquivos/laudos comuns.

## 3.5 - Agenda e pacientes 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar agenda e pacientes, respeitando as decisões pendentes do PRD.

**Requisitos**:

- Médico disponibiliza horários de atendimento.
- Possui lista de todos os pacientes da mesma clínica, com prontuários e dados de saúde compartilhados entre os médicos dela, conforme seção 5.
- Possui área com os pacientes agendados para ele.
- Ao abrir um agendamento, acessa o prontuário, dados de saúde, exames, botão para iniciar chamada, chat e anexos/documentos.
- PENDENTE: duração de consulta, recorrência de horários, bloqueios, quem agenda, reagendamento, cancelamento, faltas e notificações.
- RECOMENDADO: impedir sobreposição de agendamentos do mesmo médico e definir tratamento de fuso horário.

## 3.6 - Chat e vídeo 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar chat e vídeo, respeitando as decisões pendentes do PRD.

**Requisitos**:

- Chat escrito entre médico e paciente, com envio/recebimento de arquivos nos dois sentidos.
- Área de chamada de vídeo ao vivo por transmissão de áudio e vídeo (stream).
- RECOMENDADO: sessão restrita aos participantes autorizados, credenciais temporárias para entrada e proteção dos arquivos; tratamento claro de queda e retorno da conexão.
- PENDENTE: fornecedor da chamada, espera do paciente, disponibilidade do chat antes/depois da consulta, retenção das mensagens e limites dos anexos.
- Gravação de áudio/vídeo não faz parte do escopo definido. Caso seja solicitada, terá requisitos próprios.

## 4 - Segurança — definição e recomendações 🔵

- **Status**: 🔵 Em implementação / parcial
- **Autores**: Antigravity, OpenCode, Codex, Lovable
- **Entregue**: Negação por padrão, Auth verificado, RLS nas fundações Cloud, escritas administrativas por RPC e auditoria, revisão de marca e validação de texturas implementados. Cadastro/marca/reserva QA testados com sessão real. Contratos locais de host/rota/identidade e criptografia AES-256-GCM unitária testados. Revisão de dependências registrada; isso não atesta segurança integral ou conformidade.
- **Próximo Passo**: Concluir contexto de host no runtime, keystore/rotação/backup reais, recursos clínicos autorizados e auditados, retenção e validações de produção. Criptografia unitária não equivale a prontuário implantado.

**Requisitos**:

- DEFINIDO: proteção de dados como prioridade, isolamento entre clínicas, autorização no servidor, prontuário criptografado e registros clínicos definitivos sem edição/exclusão.
- RECOMENDADO para detalhamento técnico futuro:
- Criptografia dos textos clínicos na aplicação antes de persistir; chaves administradas separadamente do banco, sem segredos no navegador ou código-fonte. Definir rotação, cópias de segurança e recuperação de chaves.
- Criptografia dos demais dados sensíveis e arquivos armazenados, cópias de segurança protegidas e transmissão por canais seguros.
- Decifrar conteúdo somente após autorização no servidor. Criptografia não substitui controle de acesso.
- Armazenamento privado dos anexos, acesso temporário autorizado e verificação de arquivos potencialmente maliciosos.
- Auditoria de leitura, escrita, download e tentativas recusadas, com médico, paciente, clínica e data/hora, sem copiar textos clínicos para registros técnicos comuns.
- Proteção de integridade dos registros definitivos e respectivos anexos. Identificação de alterações indevidas além de bloqueios de interface.
- Regras para processamento externo por IA e fornecedores, minimização de dados e restrição do uso ao propósito autorizado.
- PENDENTE: arquitetura de chaves, fornecedores, retenção legal, recuperação, exportação ao paciente, encerramento de contas/clínicas e plano operacional de segurança. A regra de não apagar registros pela interface não equivale a retenção indiscriminada de todos os dados para sempre.

## 5 - Compartilhamento dentro da mesma clínica 🔵

- **Status**: 🔵 Em implementação / parcial
- **Autores**: OpenCode, Codex, Lovable
- **Entregue**: Ainda não há implementação funcional validada; C009 (executor OpenCode) registrou apenas auditoria local. Compartilhamento isolado por clínica permanece sem camada real. C013 (Codex): migração aditiva de clínicas/vínculos/grants, RLS de leitura própria e resolvedor persistido com testes PostgreSQL em memória; aplicação C013 verificada no Cloud, sem E2E com conta real.
- **Próximo Passo**: Falta implementar e validar compartilhamento dentro da mesma clínica, respeitando as decisões pendentes do PRD.

**Requisitos**:

- O usuário esclareceu que o compartilhamento se limita aos médicos da mesma clínica. O prontuário, seu histórico, os dados de saúde, as conversas com a IA Médica e os exames do paciente são acessíveis aos médicos cadastrados e com acesso ativo nessa clínica.
- O médico pode consultar o histórico produzido pelos demais médicos da mesma clínica, com preservação da autoria de cada registro.
- Ser médico cadastrado em outra clínica da plataforma não concede acesso aos pacientes dessa clínica.
- O servidor verifica o vínculo ativo entre médico e clínica e a associação do paciente à clínica em cada acesso clínico, inclusive aos anexos.
- Compartilhamento entre clínicas não faz parte desta regra de acesso.
- RECOMENDADO: se um médico atuar em várias clínicas, cada acesso permanece restrito ao ambiente da clínica correspondente; não haverá reunião automática de históricos entre clínicas.
- RECOMENDADO: auditar as consultas ao conteúdo clínico e formalizar os fundamentos e informações ao paciente aplicáveis à operação assistencial.
- PENDENTE: condições operacionais de cadastro, aprovação e suspensão do vínculo médico; acesso administrativo ao cadastro sem leitura clínica; atendimento aos direitos do próprio paciente de obter seus dados/cópia do prontuário.
- Referências consultadas para orientar a decisão, sem presumir conformidade concluída:
- LGPD, especialmente arts. 5º, 6º, 11 e 46: https://planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm
- Resolução CFM nº 2.314/2022, preservação, segurança e consentimento no contexto da telemedicina: https://www.sistemas.cfm.org.br/normas/visualizar/resolucoes/BR/2022/2314
- Resumo oficial do CFM: https://portal.cfm.org.br/noticias/apos-amplo-debate-cfm-regulamenta-pratica-da-telemedicina-no-brasil/

## 6 - Dispositivo e contexto anterior 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar dispositivo e contexto anterior, respeitando as decisões pendentes do PRD.

**Requisitos**:

- Integração planejada: H59MAX → Bluetooth BLE → aplicativo → API → banco → IA.
- Compatibilidade H59MAX, protocolo e viabilidade da conexão no PWA ainda não confirmados. OpenH59 é referência a investigar, não prova de compatibilidade.
- Contexto anterior do Doutor IA: coleta/organização de dados para acompanhamento médico, prontuário e WhatsApp. Segunda IA para atendimento, dúvidas, cadastro e acesso a serviços. Validar a relação desse contexto com a IA Médica recém-descrita antes de fixar arquitetura ou nomes.

## 7 - Critérios de aceite propostos para o módulo Médico 🔵

- **Status**: 🔵 Em implementação / parcial
- **Autores**: OpenCode
- **Entregue**: Ainda não há implementação funcional validada; critério 3 (texto clínico cifrado em repouso) iniciado parcialmente por C010 (executor OpenCode), com unidade de criptografia sem persistência. Demais critérios pendentes.
- **Próximo Passo**: Falta implementar e validar critérios de aceite propostos para o módulo médico, respeitando as decisões pendentes do PRD.

**Requisitos**:

- 1. Usuário sem perfil médico autorizado não lê prontuários, dados clínicos ou exames, mesmo tentando acessar diretamente a API ou endereço de arquivo.
- 2. CRM informado sem validação de identidade/conta não libera acesso médico, conforme regra de verificação a definir.
- 3. Ao salvar uma evolução, o servidor registra autoria, paciente, clínica, data/hora e texto protegido; leitura direta da coluna clínica não revela o texto em claro quando a criptografia na aplicação for adotada.
- 4. Tentativas de alterar/apagar evolução definitiva são recusadas pelo servidor. Correção gera novo registro e mantém o anterior íntegro.
- 5. O médico autorizado vê o histórico, dados com suas origens e exames do paciente correto, sem mistura de pacientes ou clínicas.
- 6. Médicos com acesso ativo na mesma clínica consultam o histórico compartilhado. Médicos de outras clínicas têm acesso recusado pelo servidor, inclusive por API, identificadores diretos e endereços de anexos.
- 7. Horários disponibilizados e pacientes agendados são apresentados no contexto do médico correto; prevenção de conflitos depende da regra de agenda consolidada.
- 8. Médico e paciente autorizados trocam mensagens e arquivos da consulta; terceiros não entram na sessão nem acessam os anexos.
- 9. Documentos externos assinados mantêm os bytes originais e a associação correta ao paciente; anexar documento não o transforma automaticamente em documento com assinatura verificada.
- 10. Chamada de vídeo conecta apenas participantes autorizados e informa falhas de conexão; provedor e comportamento de recuperação a definir.

## 8 - Aplicativo do cliente/paciente 🔵

- **Status**: 🔵 Em implementação / parcial
- **Autores**: Lovable, Antigravity, Codex
- **Entregue**: Aplicativo navegável, design responsivo, seis gráficos, histórico fictício e base PWA sem cache de saúde. C028 (Antigravity): novo visual resumido mobile-first com topo limpo, fontes ampliadas (28–32px), avisos compactos, protocolo, plano e score lado a lado, humor e sono interativos independentes com 5 emojis, água com ação rápida '+ Água', grade de 12 atalhos rigorosamente quadrados (1:1) em 3 colunas mobile com textura e vidro fosco translúcido, seção expansível 'Mais recursos' e rodapé fixo de 6 destinos com modais interativos e suporte a tema claro e escuro e bloqueio por inadimplência.
- **Próximo Passo**: Integrar telemetria real dos dispositivos (pulseira/balança), serviços de telemedicina e sincronização em nuvem quando as APIs de produção forem liberadas.

## 8.1 - Experiência e dados de saúde 🔵

- **Status**: 🔵 Em implementação / parcial
- **Autores**: Codex
- **Entregue**: Painel do cliente com oito indicadores principais, tabelas, filtro e os mesmos dados demonstrativos vistos pelo médico.
- **Próximo Passo**: Coleta/sincronização real, estado emocional e permissões do paciente ainda não implementados.

**Requisitos**:

- Aplicativo da clínica, com a personalização descrita na seção 2. O paciente consulta todas as informações efetivamente coletadas e sincronizadas da pulseira, seus dados de saúde e gráficos, e informa seu estado emocional e como está se sentindo. Os dados ficam disponíveis aos médicos da mesma clínica conforme a seção 5.
- RECOMENDADO: apresentar origem, data/hora, unidades, período e última sincronização. Um período sem dados não representa resultado zero ou normal. Métricas da pulseira dependem de compatibilidade e validação do dispositivo; não presumir medições que ele não disponibilize com qualidade suficiente.
- PENDENTE: tela inicial, navegação, indicadores disponíveis, cadastro, responsáveis/dependentes, sincronização, correção dos dados inseridos e permissões de notificações.

## 8.2 - Exames e histórico 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar exames e histórico, respeitando as decisões pendentes do PRD.

**Requisitos**:

- Envio de PDF ou imagem de exames pelo paciente.
- IA organiza os documentos, gera histórico, interpreta e explica os resultados em linguagem compreensível.
- Quando houver resultados alterados, recomenda consulta médica para apresentação dos resultados ao médico.
- A IA nunca recomenda ou prescreve medicamentos nem emite receitas.
- Os exames e dados correspondentes ficam acessíveis no módulo Médico da mesma clínica.
- RECOMENDADO para a organização e explicação:
- Preservar o arquivo original e vincular a extração ao documento, paciente, clínica, data do exame e laboratório quando identificáveis.
- Separar o resultado original, o texto extraído, eventual confirmação/correção do paciente e a explicação gerada pela IA.
- Usar unidades e intervalos de referência do próprio exame; não inventar valores, referências ou conclusões quando o arquivo não permita leitura segura. Não comparar séries com unidades incompatíveis sem conversão validada.
- Solicitar confirmação das informações duvidosas e permitir correções auditadas da extração, sem modificar o documento original.
- Para exames de imagem, explicar o laudo fornecido. Leitura diagnóstica autônoma das imagens médicas não fica presumida pela expressão “interpretação”. Essa função exigiria definição e validação específicas.
- Explicações educativas não confirmam nem descartam doenças. Encaminhamento médico e mensagens para resultados críticos dependem de protocolo clínico aprovado; não tranquilizar o paciente apenas por ausência de alterações na extração.
- PENDENTE: tipos de exame, formatos/tamanhos, leitura de arquivos protegidos ou ilegíveis, critérios clínicos de alteração/urgência, revisão humana e avaliação do enquadramento regulatório da finalidade efetiva de interpretação. Não concluir que a ausência de prescrição torna qualquer interpretação automaticamente isenta de requisitos regulatórios.

## 8.3 - Hidratação 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar hidratação, respeitando as decisões pendentes do PRD.

**Requisitos**:

- Meta diária de água.
- Lembretes configurados pelo cliente.
- Registro do consumo e histórico diário, semanal, mensal e anual, com gráficos.
- IA acompanha e faz observações quando o paciente estiver esquecendo de beber água.
- RECOMENDADO: registrar volume e horário, permitir correção dos registros e distinguir “não registrou” de “não bebeu”. Mensagens baseadas nos registros podem dizer que o consumo registrado está abaixo da meta; não afirmar consumo real desconhecido.
- RECOMENDADO: meta configurável pelo paciente conforme orientação recebida, respeitando eventual restrição de líquidos documentada pelo profissional. IA não aumenta metas em conflito com essa orientação.
- PENDENTE: origem/definição inicial da meta, unidades, intervalos de lembrete, horários de silêncio, fuso horário e canal de notificação.

## 8.4 - Medicamentos e adesão 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar medicamentos e adesão, respeitando as decisões pendentes do PRD.

**Requisitos**:

- Paciente anexa a prescrição médica no aplicativo.
- IA organiza os medicamentos conforme a prescrição, cria os lembretes nos horários correspondentes e explica a importância da regularidade.
- IA explica por que o medicamento foi prescrito, sem recomendar alteração de dose, cancelamento, substituição ou nova prescrição sem consulta ao médico.
- RECOMENDADO para realizar essa função com fidelidade:
- Extrair medicamento, apresentação/concentração, dose, via, frequência, duração e instruções quando esses elementos estiverem legíveis no documento.
- Mostrar os dados extraídos para confirmação antes de ativar lembretes. Se dose, frequência ou instrução for ilegível/ambígua, não completar por suposição; orientar confirmação com o profissional.
- Quando o documento trouxer a indicação clínica, explicá-la. Se não trouxer, apresentar apenas usos gerais do medicamento e dizer que o motivo específico da prescrição deve ser confirmado com o médico; não inventar diagnóstico ou intenção do prescritor.
- Permitir registrar “tomei”, “não tomei” e “adiar lembrete”, mantendo histórico. Adiar uma notificação não altera a posologia prescrita. Confirmar recebimento de uma notificação não prova ingestão.
- Quando houver nova prescrição, exigir reconciliação explícita com a anterior; não duplicar tratamentos nem interromper automaticamente um medicamento por inferência da IA.
- Em caso de esquecimento ou dúvida, não recomendar dobrar, compensar ou ajustar doses por conta própria.
- PENDENTE: fluxo de conferência pelo médico/paciente, horários derivados de intervalos, prescrições “se necessário”, fim de tratamento, notificações, medicamentos sem documento e coexistência de prescrições.

## 8.5 - Chat da IA Médica e chat com o profissional 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar chat da ia médica e chat com o profissional, respeitando as decisões pendentes do PRD.

**Requisitos**:

- DEFINIDO: área dedicada à conversa com a IA Médica, de nome ainda a definir. A expressão “chat médico para conversar com ela” foi interpretada como referência à IA; esclarecer se o usuário desejar outro sentido.
- DEFINIDO anteriormente: chat com o médico humano no contexto do atendimento, com arquivos nos dois sentidos.
- RECOMENDADO: distinguir claramente IA Médica, médico humano e agente de suporte, com identidade visível de quem responde.
- DEFINIDO: IA acompanha dados e hábitos para observações e orientações de saúde; não prescreve medicamentos/receitas e não modifica tratamentos.
- RECOMENDADO: respostas contextualizadas apenas com os dados autorizados do paciente; supervisão e encaminhamento humano conforme o assunto. Conteúdo da IA não é evolução assinada do médico.
- PENDENTE: canais, disponibilidade, limites do chat médico humano, base clínica da IA, memória, retenção, consentimentos/informações e protocolo de situações urgentes.

## 8.6 - Vencer hábitos 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar vencer hábitos, respeitando as decisões pendentes do PRD.

**Requisitos**:

- Paciente escolhe um hábito ruim que quer vencer.
- Mecânica de jogo com pontuação dia a dia e a cada ação vencida.
- Histórico do progresso e estímulo à continuidade.
- RECOMENDADO: regras de pontos explícitas, metas configuráveis e retomada acolhedora após recaídas. Pontuação não mede valor pessoal nem confirma melhora clínica. Evitar premiar consumo excessivo de água, doses adicionais, restrição alimentar ou treino excessivo.
- PENDENTE: hábitos aceitos, ações, frequência de registro, pontos, níveis, recompensas e limites. Hábitos envolvendo dependência/risco exigem orientação assistencial pertinente; não prometer resolução apenas pelo jogo.

## 8.7 - Benefícios e atendimento 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar benefícios e atendimento, respeitando as decisões pendentes do PRD.

**Requisitos**:

- Clube de vantagens com descontos nacionais.
- Acesso à telemedicina 24 horas.
- Agendamento em 32 áreas de atendimento, incluindo psicologia e nutrição. Esta é a quantidade solicitada para este aplicativo; não importar automaticamente quantidades de outras ofertas PlugPix.
- Acesso ao agente de suporte do serviço da clínica.
- WhatsApp de suporte da clínica.
- Acesso ao Instagram da clínica.
- RECOMENDADO: contatos e links configuráveis no ADM da clínica; mostrar disponibilidade dos serviços de acordo com a contratação/liberação, sem prometer acesso a benefício não ativo.
- PENDENTE: fornecedor do clube e da rede de atendimento, lista nominal das 32 áreas, elegibilidade, limites/carências/cobranças quando aplicáveis, tipo de integração e vínculo dos profissionais externos. A rede de benefícios não recebe automaticamente acesso ao prontuário da clínica por existir uma integração.

## 8.8 - Alimentação 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar alimentação, respeitando as decisões pendentes do PRD.

**Requisitos**:

- Paciente envia foto do prato/refeição.
- IA identifica e registra os alimentos, mantém histórico e mostra textos e gráficos de consumo diário, semanal e mensal.
- Exibe o que mais consome e composição, incluindo fibras, frutas, carboidratos e calorias.
- RECOMENDADO: separar frequência de frutas/alimentos e estimativas de nutrientes. Confirmar alimentos, porções, preparo e ingredientes que a foto não revele; calorias e nutrientes calculados a partir de foto são estimativas, não medições exatas.
- RECOMENDADO: usar tabela nutricional de referência definida e versionada; permitir correções; comparar somente os registros disponíveis. Refeição não registrada não equivale a jejum e quantidade estimada não comprova ingestão total.
- PENDENTE: tabela nutricional, porções, tipos de refeição, nutrientes adicionais, exportação, objetivos e regras para orientação individualizada/nutricionista.

## 8.9 - Treino de academia 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar treino de academia, respeitando as decisões pendentes do PRD.

**Requisitos**:

- Treino do dia e da semana, podendo ser montado com ajuda da IA.
- Exercícios, séries, repetições, peso/carga e histórico de carga.
- Registro dos dias em que treinou e faltou.
- Tempo de treino e histórico.
- RECOMENDADO: explicitar que “peso” nesta área é a carga do exercício; acompanhamento de peso corporal, se desejado, exige campo separado. Definir ausência por sessão planejada, não pela simples inexistência de registro.
- RECOMENDADO: assistência da IA respeita experiência, objetivo e limitações declaradas; progressão e treino individualizado exigem critérios profissionais, sem aumentar carga automaticamente por pontuação. Alertas de dor/limitação orientam procurar profissional pertinente.
- PENDENTE: catálogo de exercícios, divisão semanal, montagem por profissional/IA, ajustes, cronômetro, pausas, regras de progressão e supervisão.

## 8.10 - Visão integrada, índices e incentivo 🔵

- **Status**: 🔵 Em implementação / parcial
- **Autores**: Codex, Antigravity
- **Entregue**: Contratos, metas/eventos idempotentes, preferências, suspensão e rascunhos possuem implementação local e fundação Cloud histórica 008–013. Motores JORNADA/Escudos e ledger 014 locais; biblioteca de artes ainda demonstrativa. Antigravity criou galeria e estados PWA D122–D124, preservados por Codex. D125 agora registra rotas same-bearer, contexto próprio derivado do host/vínculo e conexão da galeria. Integração SQL local confirma reenvio sem duplicar evento e ausência de score inventado. Isso não é homologação de contas/dados clínicos reais.
- **Próximo Passo**: Concluir leitura própria de metas e eventos, ligar formulários às metas elegíveis e homologar persistência real após autorização das migrações e permissões QA específicas. VITALIDADE permanece sem fórmula numérica. Cloud verificado em leitura: tabelas 014 ausentes na lista; pacientes/vínculos/grants com zero registros.

**Requisitos**:

- Cruzar dados dos módulos, inclusive pulseira, saúde, exames, hidratação, medicamentos, estado emocional, alimentação, treino e hábitos.
- Gerar índices de saúde e qualidade de vida com pontuações (scores), jogos, dicas e recomendações de saúde.
- RECOMENDADO: começar distinguindo pontuação de constância dos hábitos, adesão registrada e indicadores clínicos. Definir fórmulas, origem dos dados, pesos, períodos, mínimos de dados, explicação e versão de cada índice. Não atribuir automaticamente uma nota de saúde a partir de pontos de participação.
- RECOMENDADO: dados ausentes e atrasados ficam explícitos; ausência de registro não é doença nem prova de falta de adesão. Uma pontuação boa não neutraliza resultado crítico. Correlações entre módulos não demonstram causa.
- PENDENTE: modelos dos índices, interpretação, validação clínica, limites de uso, critérios de alerta e regras de recomendação. Índices com finalidade clínica não serão apresentados como validados antes da validação correspondente.
- - **VITALIDADE** substitui integralmente o nome provisório “Índice VIVA”. É um índice multidimensional de tendências de saúde/bem-estar em escala proposta 0–100, que pode subir ou descer. **A fórmula, os pesos, limiares e a alegação de validade científica estão PENDENTES de avaliação metodológica, clínica e regulatória**. Até aprovação, não exibir nota numérica real ou afirmar que o índice é validado.
- **JORNADA** substitui “Jornada dos Horizontes” como nome exibido ao paciente. É a mecânica gamificada de **adesão às metas individualmente aplicáveis**, independente da VITALIDADE, com pontos diários 0–100 e Escudo ativo determinado pelo desempenho recente.
- **ESCUDOS** são distintivos com arte própria. Cinco níveis iniciais: **Origem, Ritmo, Avanço, Equilíbrio, Plenitude**. O Super ADM cadastra, carrega, versiona, aprova, ordena, ativa/inativa e publica as artes e metadados dos Escudos no sistema. A clínica aplica o tema White Label sem alterar a lógica central. O histórico de Escudos conquistados é permanente conforme as políticas de retenção e direitos aplicáveis.
- Pontos da JORNADA não entram diretamente no cálculo da VITALIDADE. Um paciente pode ter alta adesão e indicadores desfavoráveis, ou vice-versa. **HRV** significa variabilidade da frequência cardíaca e é apenas um sinal fisiológico opcional, não o nome do índice geral.
- - O catálogo de planos/entitlements determina **quais recursos e fontes estão disponíveis**, não um teto menor de pontuação. Paciente sem dispositivo pode atingir 100 na JORNADA e alcançar Plenitude; dispositivo não concede bônus automático por posse ou sincronização.
- Fontes manuais: hidratação, alimentação, qualidade/duração do sono, estado emocional, exames enviados ou resultados estruturados, adesão à medicação **quando prescrita**, treinos, academia, esportes e frequência semanal, tabagismo, álcool, sintomas, consultas e acompanhamento de protocolos.
- Fontes automáticas **somente quando tecnicamente suportadas e confiáveis**: pulseira (atividade/passos, sono, frequência cardíaca, eventualmente HRV); balança (peso e estimativas de composição corporal); outros dispositivos futuros (p.ex. anel). Não presumir que H59MAX, balanças ou anéis oferecem APIs/BLE, HRV ou qualidade clínica sem testes.
- Todos os dados **pertinentes** podem ser candidatos à avaliação, mas **não somar diretamente cada entrada**: consolidar por domínios, evitar dupla contagem de passos+treino e peso+IMC+bioimpedância, respeitar unidades, temporalidade, proveniência, precisão, outliers e consentimentos.
- Exames e dados fisiológicos não devem ser inferidos como normais quando ausentes. Exibir **cobertura/completude** e origem (manual, dispositivo, exame, profissional). Sem dados mínimos para cálculo confiável, mostrar **“avaliação parcial”** ou **“dados insuficientes”**, sem nota enganosa. Pacientes com planos distintos não devem receber comparação pública ou classificação discriminatória.
- Dados de autorrelato são válidos para participação e acompanhamento, com rótulo de autorrelato; não devem ser tratados como equivalentes a medição clínica confirmada. Coleta de álcool/tabaco deve ser não punitiva, confidencial e sem incentivo a consumo.
- - Domínios candidatos: **cardiometabólico** (pressão, glicemia, lipídios, peso e contexto), **atividade/capacidade física**, **sono/recuperação**, **hábitos/alimentação/hidratação/tabaco/álcool** e **bem-estar emocional**. Adesão à medicação, exames realizados e check-ins são prioritariamente medidas de processo/adesão e não evidência direta de melhora clínica.
- Pesos **30% cardiometabólico, 20% atividade, 20% sono, 20% hábitos e 10% bem-estar emocional** são apenas **hipótese de pesquisa**, NÃO regra de produção, NÃO comprovação científica. Pesos devem ser definidos após revisão bibliográfica, escolha de instrumentos e avaliação de especialistas; considerar populações, comorbidades, idade, acessibilidade e objetivos.
- Referências candidatas: *Life's Essential 8* (AHA) para saúde cardiovascular, PSQI para sono, WHO-5 para bem-estar, instrumentos alimentares validados e diretrizes de atividade física. São **referências para estudo**, não autorização para afirmar que uma nova combinação é validada, nem para reproduzir questionários protegidos sem verificar licença.
- Especificar finalidade de uso, população-alvo, interpretação, pesos, normalização, limites, missingness, confiança, sensibilidade, variabilidade biológica, diferenças por perfil, testes de confiabilidade, validade e equidade, revisão médica, versionamento e eventual enquadramento de software como dispositivo médico. Antes disso, usar interface informativa sem escore clínico numérico.
- Uma alteração crítica de sinais ou sintomas gera fluxo clínico próprio, independente do escore agregado. Nunca usar VITALIDADE para diagnosticar, prescrever, negar serviço ou classificar urgência sem protocolo clínico aprovado.
- - A JORNADA mede **cumprimento de metas personalizadas**, não gravidade da doença. **Pontuação diária normalizada de 0 a 100 = 100 × soma dos pesos de metas elegíveis cumpridas / soma dos pesos das metas elegíveis**, com tratamento explícito de metas parciais e validação de evidências; fórmula funcional **RECOMENDADA**, sujeita a testes e decisão final do Super ADM.
- Exemplos **não vinculantes** de pesos por missão: registrar água 10; alimentação 10; sono 15; check-in emocional 10; adesão a medicação prescrita 20; atividade física indicada 20; check-in Dr. IA 15. **Não publicar estes pesos como regra definitiva.** A meta é atribuída conforme plano, perfil, periodicidade e orientação profissional. Exercício 3x/semana não gera falta nos dias de descanso; ausência de prescrição elimina missão de medicação do denominador.
- Metas não aplicáveis são retiradas do denominador **por regra controlada e auditada**, nunca manipuláveis livremente pelo paciente. Se não houver metas elegíveis, registrar **dia não avaliável**, sem atribuir zero ou 100 arbitrariamente.
- Missões concluídas via PWA, WhatsApp ou dispositivo devem gerar evento idempotente; leitura automática pode comprovar uma meta elegível, **sem duplicar** registro manual. Pontos variam diariamente. Ausência de sincronização, internet ou dispositivo não significa não adesão: permitir alternativas, reconciliação e período de tolerância. Não premiar medição excessiva nem hábitos nocivos.
- Paciente pode pausar gamificação; metas e alertas devem respeitar preferência, acessibilidade, horário e situação clínica. Nenhuma pontuação restringe benefícios contratados.
- - Escudo ativo calculado a partir de **média móvel dos últimos sete dias avaliáveis**, com política explícita para dias não avaliáveis, pausas e histórico insuficiente. Não preencher dias ausentes com zero; se amostra insuficiente, manter estado anterior ou exibir estado provisório, conforme regra a aprovar.
- Limiares **iniciais para teste, não definitivos**: Origem 0–29; Ritmo 30–54; Avanço 55–74; Equilíbrio 75–89; Plenitude 90–100.
- Promoção: ao alcançar o limiar do próximo Escudo segundo a média elegível, observada a regra de estabilidade aprovada. **Regressão:** após **três avaliações diárias consecutivas válidas** com média abaixo do limiar do Escudo ativo; não regredir por um único dia ruim. Regras de estabilidade, histórico mínimo e desempate são **RECOMENDADAS** para homologação.
- **Escudos já conquistados nunca desaparecem do histórico por regressão.** A pessoa pode exibir Escudo ativo inferior ao máximo histórico. Tela própria **“Meus Escudos”** no PWA apresenta arte, nome, estado atual/histórico, data e hora da conquista com fuso horário, pontos JORNADA, **VITALIDADE no instante da conquista se houver índice validado e calculável**, ou “indisponível/não calculada” — **jamais inventar valor**. Mostrar próximos Escudos bloqueados e critérios simples de progresso.
- Registrar eventos de conquista, promoção, regressão, reaquisição e correção com IDs estáveis, timestamp UTC + apresentação em fuso local, versão da regra, `tenant_id`, `patient_id`, escudo, pontuação JORNADA e referência a snapshot VITALIDADE quando existente; evitar duplicação de dados clínicos sensíveis no ledger de gamificação. Correções preservam trilha de auditoria.
- - Se o paciente relata doença aguda, internação, cirurgia, acamamento, tratamento intenso ou limitação funcional, o Dr. IA deve oferecer **revisão contextual de metas**, respeitando orientações clínicas e fluxos de escalonamento quando necessário.
- Ajustar **missões elegíveis, frequência e esforço apropriado**, em vez de ocultamente diminuir o limiar do Escudo ou presumir que o paciente deixou de se cuidar. Repouso indicado, seguimento de orientações e atividades adaptadas podem ser metas válidas. Em internação, priorizar equipe assistencial e permitir pausa sem perda histórica.
- A IA não altera prescrição, intensidade de exercício clinicamente contraindicada nem parâmetros médicos de forma autônoma. Mudanças clínicas relevantes requerem protocolo autorizado ou avaliação do profissional responsável.
- Interface do paciente deve ser **simples e não estigmatizante**; não expor coeficientes matemáticos desnecessários, **mas explicar claramente que metas foram adaptadas, quais estão vigentes, o que afeta a pontuação e como contestar correções**. Não ocultar mudança material das regras.
- Pausa médica ou técnica e períodos não avaliáveis **não causam regressão automática**. Propor estado protegido/pausado com registro de motivo e controle de acesso; especificação operacional detalhada PENDENTE.
- - Super ADM: **biblioteca central de Escudos** com upload de SVG/PNG/WebP permitido por política, verificação de tipo real, sanitização rigorosa de SVG (ou preferência por raster), limite de tamanho, armazenamento seguro, versões, pré-visualização, ordem, nome, descrição, critérios, estado de publicação, rollback e auditoria. Arte de Escudo é controlada pelo Super ADM; clínica não altera critérios nem substitui a arte oficial, apenas aplica seu tema e identidade White Label no restante da interface.
- PWA paciente, sob **URL própria por clínica** conforme seção 9: cartões separados VITALIDADE (quando validada) e JORNADA; Escudo ativo, tendência, próximas missões e Escudo seguinte; tela de histórico com conquistas e respectivas datas/horas e snapshot de VITALIDADE, inclusive após regressão.
- Painel médico da clínica: visualizar dados de origem, tendências, cobertura, contexto de adaptações e adesão, com separação inequívoca de dados clínicos e gamificação. Somente dados de pacientes autorizados. Super ADM não obtém acesso clínico irrestrito por gerenciar Escudos.
- Backend multi-tenant, RBAC, validação server-side, versionamento de regras, auditoria, idempotência, limites contra fraude e segregação de dados; reaproveitar módulos/rotas existentes. Não duplicar backend por clínica. Dados clínicos sensíveis seguem LGPD e controles de acesso do PRD principal.
- O Dr. IA pode **explicar tendências e propor missões**; o motor determinístico autoriza pontuação e alteração de Escudo. Não confundir alertas clínicos com regressão de jogo.
- 1. Paciente só com app, sem dispositivo ou exame, consegue participar integralmente da JORNADA, atingir 100 e alcançar Plenitude com metas aplicáveis; VITALIDADE informa cobertura parcial ou insuficiência quando necessário.
2. Planos com pulseira e/ou balança usam fontes extras sem duplicar eventos, dar vantagem automática por hardware ou presumir capacidades não homologadas.
3. Medicação só é meta se prescrita; descanso, esporte semanal e restrições médicas são respeitados.
4. VITALIDADE e JORNADA são exibidas separadamente; índice clínico numérico permanece indisponível até validação formal.
5. Média móvel de sete dias e regra de três avaliações consecutivas para regressão são testáveis; dia sem dados e pausa protegida não equivalem a fracasso.
6. Tela Meus Escudos mantém conquistas antigas mesmo após regressão e mostra data/hora, pontos da JORNADA e snapshot de VITALIDADE **somente se disponível**.
7. Super ADM cadastra/publica artes dos Escudos com segurança, versionamento e auditoria; clínicas não conseguem alterar regras globais.
8. Dr. IA adapta missões a situações de doença e tratamento sem prometer autonomia clínica; mudanças e explicações são auditáveis.
9. Sem vazamento entre clínicas, sem regressões de autenticação, telemedicina, prontuário, pagamentos, domínios próprios e PWA.
- 1. Ler `AGENTS.md`, PRD vigente, decisões e código existente; incorporar esta seção como **substituição lógica** das terminologias “Índice VIVA” e “Jornada dos Horizontes”, preservando histórico de versões e demais requisitos anteriores.
2. Documentar explicitamente o que já existe, parcialmente existe ou falta: cadastro de metas, fontes manuais, integrações de equipamentos, histórico, gamificação, biblioteca de artes e telas PWA.
3. Propor plano incremental de menor impacto, migrações futuras, dependências, testes, riscos e rollback, sem reconstruir o projeto e sem duplicar estruturas já existentes.
4. **Não alterar código-fonte, banco, migrações, deploy ou DNS nesta etapa sem autorização expressa. Não gerar Prompt Zero.**
5. Manter a distinção **DEFINIDO** (identidade, separação, proteção, histórico, gestão central), **RECOMENDADO** (normalização, média e limiares operacionais) e **PENDENTE** (algoritmo VITALIDADE validado, parâmetros definitivos, dispositivos homologados, condições clínicas específicas).

## 9 - Loja do Super ADM e loja da clínica 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar loja do super adm e loja da clínica, respeitando as decisões pendentes do PRD.

## 9.1 - Catálogo central 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar catálogo central, respeitando as decisões pendentes do PRD.

**Requisitos**:

- Super ADM possui módulo Loja para cadastrar produtos e serviços.
- Define preço-base e libera itens para clínicas disponibilizarem aos seus clientes.
- Clínica pode selecionar os itens liberados e acrescentar seu lucro ao preço-base.
- PENDENTE: liberação global ou por clínica, categorias, estoque, variantes, imagens, descrição, entrega, disponibilidade e permissões de edição dos itens centrais.

## 9.2 - Catálogo e venda da clínica 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar catálogo e venda da clínica, respeitando as decisões pendentes do PRD.

**Requisitos**:

- ADM da clínica pode disponibilizar produtos próprios.
- Pode oferecer produtos/serviços liberados pelo Super ADM.
- Pode aplicar acréscimo sobre o preço-base (markup) e/ou receber comissão, conforme modelo comercial a definir.
- Cliente acessa a loja no aplicativo da clínica.
- PENDENTE: se o ganho sobre item central é a diferença entre preço-base e preço final, uma comissão configurada ou a combinação explícita dos dois. Não presumir acumulação das remunerações.
- Exemplo exclusivamente ilustrativo: base R$100 e preço final R$130 geram diferença bruta de R$30. Isso é acréscimo de 30% sobre a base e margem bruta de aproximadamente 23,08% sobre a venda, antes de custos. Nenhuma taxa, valor ou fórmula comercial foi aprovada pelo usuário.

## 9.3 - Operação comercial 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar operação comercial, respeitando as decisões pendentes do PRD.

**Requisitos**:

- Definir quem vende e emite o documento fiscal, recebe o pagamento, entrega e atende o comprador; meios de pagamento; taxa de processamento; comissão e repasse; responsabilidade por frete, estoque e serviços; cancelamentos, devoluções, estornos e disputas; preço-base alterado e efeito em itens já publicados/pedidos; regras de desconto; devolução da comissão em venda estornada.
- RECOMENDADO: separar produto central e produto próprio, preservar autoria/fornecedor, manter preço e condições contratadas no pedido e registrar pedidos, pagamentos e remunerações com trilha de auditoria. Uma clínica não consulta pedidos ou resultados comerciais de outra.
- RECOMENDADO: explicações clínicas da IA não são influenciadas pela comissão ou margem dos produtos. Definir os tipos de produto permitidos; não presumir comercialização de medicamentos ou outros itens regulados.

## 10 - Integração dos módulos e notificações 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar integração dos módulos e notificações, respeitando as decisões pendentes do PRD.

**Requisitos**:

- Dados vinculados ao paciente e clínica, com origem, momento do evento e do recebimento; separar arquivo original, registro do paciente, extração da IA, interpretação e registro profissional.
- Processamento de documentos/fotos indica andamento, sucesso ou falha e evita duplicar históricos/lembretes em tentativas repetidas.
- Ao corrigir uma extração ou registro, atualizar gráficos/índices dependentes sem alterar o arquivo original ou evoluções médicas definitivas.
- Preferências de notificações por paciente e módulo, com fuso e horários de silêncio; mensagens em tela bloqueada evitam detalhes clínicos sensíveis por padrão.
- Definir canais, permissão do sistema operacional e comportamento com aplicativo fechado ou dispositivo sem conexão. Lembrete configurado, envio, recebimento e confirmação são eventos distintos; não prometer entrega garantida.
- Aplicativo paciente expõe os dados próprios autorizados, sem permitir consulta a dados de outros pacientes; administração comercial não ganha acesso clínico por gerir loja/benefícios.
- Definir o mapa de dados visíveis aos médicos, IA Médica, agente de suporte e administradores. Suporte não herda autorização médica.

## 11 - Critérios de aceite propostos — aplicativo e loja 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar critérios de aceite propostos — aplicativo e loja, respeitando as decisões pendentes do PRD.

**Requisitos**:

- 1. Paciente acessa apenas seus dados no ambiente da clínica; tentativa de acesso a outro paciente ou clínica é recusada no servidor e nos anexos.
- 2. Arquivo de exame original é preservado; sua extração, interpretação e histórico são rastreáveis. Falhas de leitura não geram resultados inventados.
- 3. Testes clínicos e de limites da IA verificam ausência de prescrição, recomendação de novos medicamentos e alteração/suspensão de tratamento. Resultado alterado segue o protocolo de encaminhamento aprovado.
- 4. Dados extraídos da receita precisam de confirmação conforme fluxo a definir. Instrução ambígua/ilegível impede ativação do lembrete correspondente até esclarecimento; não se cria dose ou frequência por suposição.
- 5. Hidratação apresenta meta, registros e gráficos nos quatro períodos solicitados; ausência de registro é tratada como desconhecida.
- 6. Calendário de medicamentos respeita prescrição confirmada, fuso e duração definidos; notificações e ingestão declarada ficam diferenciadas.
- 7. Foto de alimentação gera identificação corrigível e estimativas nutricionais identificadas como tais; diário, semana e mês refletem os registros disponíveis.
- 8. Treino mostra dia/semana, séries, repetições, carga, evolução de carga, sessões previstas/realizadas e duração conforme regras consolidadas.
- 9. Hábitos contabilizam pontos e ações pelas regras aprovadas; índices integrados revelam método e cobertura dos dados, sem prometer validação clínica inexistente.
- 10. Benefícios mostram a rede de 32 áreas, telemedicina 24h, clube e canais da clínica conforme a integração/contratação aprovada.
- 11. IA Médica, médico humano e suporte são identificados e seus dados/permissões separados.
- 12. Super ADM cadastra/libera item com base; clínica seleciona, configura seu ganho e publica. Venda registra condições e calcula remuneração conforme fórmula finalmente aprovada, sem duplicar comissão.
- 13. Produtos próprios, centrais e pedidos permanecem vinculados à clínica/fornecedor corretos; alterações futuras de preço não reescrevem pedidos existentes.
- 14. Reprocessamento de documento/foto, duplicidade de retorno de pagamento e estorno não duplicam registro, cobrança ou remuneração, conforme mecanismos a definir.
- Referências técnicas consultadas para orientar recomendações, sem presumir validação/conformidade concluída:
- OMS, riscos de respostas falsas/incompletas e governança da IA em saúde: https://www.who.int/news/item/18-01-2024-who-releases-ai-ethics-and-governance-guidance-for-large-multi-modal-models
- Anvisa, perguntas e respostas de software como dispositivo médico, incluindo distinção entre comunicação em telemedicina e finalidade diagnóstica: https://www.gov.br/anvisa/pt-br/assuntos/noticias-anvisa/2022/software-como-dispositivo-medico-perguntas-e-respostas/

## 12 - Super ADM — gestão global e visão da clínica 🔵

- **Status**: 🔵 Em implementação / parcial
- **Autores**: Lovable, Antigravity, Codex
- **Entregue**: Lista/busca de clínicas e gráficos administrativos derivados dos cadastros fictícios.
- **Próximo Passo**: Implementar gestão, vínculos, agenda e fechamento financeiro reais.

## 12.1 - Clínicas e acesso administrativo 🔵

- **Status**: 🔵 Em implementação / parcial
- **Autores**: Lovable, Antigravity, Codex
- **Entregue**: Duas clínicas demonstrativas, busca, seleção e personalização por ID imutável; Super ADM conserva PlugPix. C014 (Codex): consulta real de clínicas no login do operador, API autenticada com papel persistido e RLS, campos administrativos validados e sem dados clínicos. C015 (Codex): migração de criação/edição com revisão otimista, auditoria atômica e API POST validadas localmente; C015 agora aplicada no Cloud. C016 (Codex): formulário real de criação/edição integrado ao login do operador, carregamento de revisão no servidor e testes de conflito/duplicação/logout; C015 aplicada no Cloud; E2E pendente. C018 (Codex/Lovable): C015 gerenciada idêntica ao SQL revisado, RLS remota ativa e escrita direta negada em clínicas/auditoria. Cadastro por e-mail/Google incorporado do Lovable; 230 testes locais aprovados. Primeira conta Auth verificada e Super ADM ativado após autorização específica do titular. C021: rede administrativa consultável por páginas de até 100, com cursor validado no servidor, revisão da lista após salvar e respostas após logout ignoradas; validação local.
- **Próximo Passo**: Homologar login, cadastro, edição e auditoria reais com o primeiro Super ADM ativo. Seguir vínculos e isolamento entre clínicas; integrações, chaves e decisões do PRD continuam pendentes.

**Requisitos**:

- Super ADM visualiza todas as clínicas.
- Ao selecionar uma clínica, pode entrar no ambiente e ter a visão do ADM daquela clínica.
- Mantém visão global e visão individual por clínica.
- RECOMENDADO: modo explícito de administração da clínica, com identificação visível da clínica selecionada e botão de retorno ao painel global. Manter a identidade real do Super ADM na sessão e auditoria; não usar a senha nem fingir ser a conta de um administrador local. Toda ação verifica no servidor a clínica alvo.
- Essa visão é administrativa: não concede, por si só, acesso ao prontuário, exames ou conversas clínicas. Preserva a exclusividade do acesso profissional médico definida anteriormente. Se o Super ADM também for médico, o acesso clínico depende de perfil e vínculo médico próprios.
- PENDENTE: se o modo da clínica permite todas as alterações administrativas ou somente parte delas, limites das ações e necessidade de justificativa em operações específicas.

## 12.2 - Médicos, cadastro e vínculos 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar médicos, cadastro e vínculos, respeitando as decisões pendentes do PRD.

**Requisitos**:

- Ver todos os médicos de uma clínica ou todos os médicos de todas as clínicas.
- Atribuir um médico a uma nova clínica.
- Editar o cadastro do médico.
- Inativar o médico.
- RECOMENDADO: identidade profissional única com vínculos separados por clínica. Vincular a uma nova clínica não transfere prontuários nem histórico de pacientes entre clínicas.
- RECOMENDADO: distinguir inativação global da conta profissional e inativação de apenas um vínculo com uma clínica. A inativação bloqueia novos acessos conforme seu alcance, preserva autoria, registros definitivos e histórico. Alterar o cadastro do profissional não reescreve os dados de autoria armazenados nas evoluções antigas.
- PENDENTE: alcance padrão da inativação, permissões do ADM da clínica sobre médicos, validação do cadastro/CRM, quem aprova vínculos e tratamento de consultas futuras, disponibilidade e sessões já abertas quando ocorrer inativação.

## 12.3 - Clientes, uso, agenda e pagamentos 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar clientes, uso, agenda e pagamentos, respeitando as decisões pendentes do PRD.

**Requisitos**:

- Super ADM vê os clientes de uma clínica e uma tabela global de clientes de todas as clínicas, organizada com:
- Clínica à qual o cliente pertence.
- Médicos pelos quais já foi atendido.
- Quantidade de vezes que acessou telemedicina 24h.
- Quantidade de vezes que acessou atendimento agendado.
- Agenda atual do cliente.
- Se está online naquele momento e quando esteve online pela última vez.
- Pagamentos, histórico de pagamentos e pendências.
- RECOMENDADO: distinguir acesso/abertura do serviço, pedido de atendimento, agendamento e consulta realizada. Mostrar contadores identificados; não contar uma abertura de página como consulta concluída. Guardar identificadores e origem dos eventos, evitando duplicidade de retornos de integração.
- RECOMENDADO: presença online derivada de atividade/sinal recente de sessão, com janela de tempo definida. Exibir última atividade e disponibilidade da informação; não tratar ausência de sinal como prova exata de ausência do usuário.
- RECOMENDADO: permitir filtros por clínica, médico, período, situação financeira e presença. Na tabela global, dados assistenciais são metadados administrativos de uso/agenda, sem revelar texto clínico. Se uma pessoa tiver vínculos com mais de uma clínica, preservar o contexto de cada vínculo.
- PENDENTE: definição de “acessou”, indicadores disponíveis na integração 24h/agendada, período dos contadores, fuso/janela de presença e alcance de “histórico” além do financeiro. Não presumir acesso a diagnósticos ou conteúdo do prontuário.

## 12.4 - Vidas e faturamento mensal da clínica 🔵

- **Status**: 🔵 Em implementação / parcial
- **Autores**: Lovable, Codex
- **Entregue**: Contagens demonstrativas de vidas habilitadas e distribuição por clínica; nenhum faturamento inventado.
- **Próximo Passo**: Implementar fechamento mensal, cobrança por vida e registros financeiros persistentes.

**Requisitos**:

- Uma vida representa uma pessoa.
- Super ADM acompanha quantas vidas a clínica possui.
- Sistema identifica as vidas que estiveram ativas no período de um mês.
- Vida ativa para cobrança é a pessoa com serviço habilitado no sistema no período, independentemente de login, presença online, consulta ou uso de qualquer recurso. O usuário confirmou que o fato gerador é a habilitação.
- A partir da apuração, sistema emite a fatura para a clínica.
- Existem preços configuráveis para vida/titular e dependente.
- RECOMENDADO: cada dependente é uma pessoa/vida, com vínculo ao titular e regra de preço própria. Contabilizar a pessoa uma vez na clínica por regra/período de cobrança, sem duplicar por sessões, múltiplos serviços ou troca de titular/dependente. Identificação e deduplicação precisam considerar menores e pessoas sem CPF informado.
- DEFINIDO: a cobrança por vida considera a habilitação no sistema, e não a utilização. Eventos de habilitação e desabilitação devem permitir apurar os períodos ativos; ausência de uso não isenta uma vida habilitada de cobrança.
- PENDENTE: cobrança integral de quem teve qualquer dia ativo no mês ou proporcional por dias; mês civil ou ciclo contratual; data de corte; vida recém-ativada, reativada, cancelada ou transferida; quantidade contratada/mínima e faixas de volume; regra para dependentes; inadimplência; múltiplos planos/módulos; mesma pessoa em clínicas diferentes.
- RECOMENDADO: conservar eventos de ativação/inativação e emitir demonstrativo por competência com pessoas consideradas, categoria, períodos ativos, preços aplicados e totais. Fechamento usa regras e preços vigentes daquele período, sem recalcular faturas antigas por alteração posterior do plano.
- RECOMENDADO: emissão repetida da mesma competência não gera duplicidade; ajustes posteriores têm registro próprio. Regras de emissão fiscal e cobrança permanecem pendentes.

## 13 - Planos comerciais e configuração dos serviços 🔵

- **Status**: 🔵 Em implementação / parcial
- **Autores**: Antigravity, Codex
- **Entregue**: Catálogo local de rascunhos de telemedicina e pulseira com validação e tratamento de erro no navegador.
- **Próximo Passo**: Implementar contratos, venda e ativação real; consolidar condições comerciais pendentes.

## 13.1 - Contrato de uso da clínica com a PlugPix 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar contrato de uso da clínica com a plugpix, respeitando as decisões pendentes do PRD.

**Requisitos**:

- Super ADM cria o plano de uso da clínica, configurando:
- Valor do setup de implementação.
- Se existe mensalidade e seu valor.
- Se há cobrança por volume de vidas.
- Quantidade de vidas.
- Preço de cada vida/titular e de cada dependente.
- PENDENTE: modelos exclusivos ou acumuláveis (mensalidade mais vidas, por exemplo), franquia/mínimo, faixas de preço, prazo e parcelamento do setup, vencimento, vigência de alterações, fidelidade do contrato da clínica, tributos/taxas e consequências de atraso.
- RECOMENDADO: distinguir valores únicos e recorrentes. Cada contrato guarda a versão das condições aceitas; mudança no catálogo não altera silenciosamente contratos existentes.

## 13.2 - Catálogo-base de telemedicina e venda pela clínica 🔵

- **Status**: 🔵 Em implementação / parcial
- **Autores**: Antigravity, Codex
- **Entregue**: CRUD local de rascunhos, sete opções de serviço, coparticipação e condições opcionais sem ativação comercial.
- **Próximo Passo**: Consolidar Grupo32, carência/fidelidade e implementar venda e persistência no servidor.

**Requisitos**:

- Super ADM cria planos-base de telemedicina 24h e agendada.
- Clínica aplica seu preço e vende os planos aos clientes.
- No escopo descrito pelo usuário como Telemedicina 2.0, planos podem habilitar/desabilitar:
- - Atendimento 24h/clínico geral.
- - Conjunto das 32 especialidades/áreas médicas.
- - Nutrição.
- - Psicologia.
- - Educador físico.
- - Atendimento presencial com concierge.
- Configurar valor de coparticipação, carência e fidelidade para todos os itens.
- RECOMENDADO: representar serviços separadamente, com preço-base, disponibilidade, coparticipação, carência e fidelidade por item; permitir padrões no plano com exceções explícitas por serviço. Benefícios e acesso no aplicativo refletem a contratação efetiva do cliente, além da liberação para a clínica.
- PENDENTE: composição exata e lista das 32 áreas. Nutrição/psicologia já foram descritas como incluídas entre as 32 e agora como opções separadas; definir agrupamento e contagem sem cobrar ou contar o mesmo serviço duas vezes. Educador físico possui acesso profissional a especificar, sem equivalência automática ao perfil Médico.
- PENDENTE: distinguir “atendimento 24h” e “clínico geral” se forem opções independentes. Não publicar uma combinação que prometa 24h sem serviço correspondente.
- PENDENTE: preço-base e regra de remuneração por serviço/plano; limites de consultas, dependentes, recorrência de pagamento, fornecedor do presencial/concierge, utilização da coparticipação, início da carência, unidade dos prazos, eventos de fidelidade/cancelamento e coparticipação variável por item.
- PENDENTE: nomenclatura comercial entre 2.0/4.0 para os itens presenciais. Preservar o escopo solicitado para 2.0 nesta conversa sem substituir silenciosamente pelo catálogo histórico de outra oferta.

## 13.3 - Pulseira inteligente — plano-base 🔵

- **Status**: 🔵 Em implementação / parcial
- **Autores**: Antigravity, Codex
- **Entregue**: Rascunhos com preço de ativação/mensalidade e opções independentes de médico, IA e fidelidade.
- **Próximo Passo**: Definir modalidades e condições pendentes e integrar plano comercial e dispositivo reais.

**Requisitos**:

- Super ADM configura planos-base com:
- Preço-base de ativação.
- Preço-base de mensalidade.
- Com ou sem médico.
- Com ou sem IA.
- Com ou sem fidelidade.
- RECOMENDADO: explicar, no plano, quais funções ficam disponíveis em cada combinação. Sem IA pode manter os recursos de registro/visualização contratados, mas não prometer interpretação ou assistência automática. Sem médico não prometer acompanhamento médico incluído. Isso não decide automaticamente o acesso a outros serviços de telemedicina contratados separadamente.
- PENDENTE: o que a ativação inclui (serviço, dispositivo físico, pareamento ou outro), aquisição/entrega/reposição da pulseira, quantidade e modalidade de atendimentos no plano com médico, recursos do plano sem IA, prazo de fidelidade, preço final aplicado pela clínica e tratamento de dependentes.

## 13.4 - Três camadas comerciais 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar três camadas comerciais, respeitando as decisões pendentes do PRD.

**Requisitos**:

- 1. Contrato da clínica com a PlugPix: setup, mensalidade e cobrança por vidas.
- 2. Catálogo-base: produtos/serviços/planos disponibilizados pelo Super ADM à clínica.
- 3. Oferta ao paciente: seleção de serviços pela clínica e preço final vendido ao cliente.
- Não presumir que cobrança de vidas para a clínica seja o mesmo valor ou fato gerador da cobrança ao paciente. O modelo de comissão/acréscimo da loja continua pendente; não estender automaticamente essa fórmula a todo plano sem definição.
- RECOMENDADO: autorização do recurso depende tanto da habilitação na clínica quanto da contratação do paciente e condições do serviço. A IA respeita a disponibilidade comercial sem alterar decisões clínicas em razão da margem.

## 14 - Critérios de aceite propostos — Super ADM e planos 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar critérios de aceite propostos — super adm e planos, respeitando as decisões pendentes do PRD.

**Requisitos**:

- 1. Super ADM lista clínicas e seleciona uma visão administrativa; identidade do operador e clínica alvo permanecem explícitas e auditáveis.
- 2. Visão administrativa não libera leitura de prontuário/exames; controles de acesso continuam aplicados pelo servidor.
- 3. Listas global/por clínica de médicos e pacientes respeitam filtros e mostram vínculos corretos; ADM local não obtém alcance global.
- 4. Atribuir médico a nova clínica não copia prontuários ou permite acesso cruzado. Inativação aplica seu alcance e mantém registros históricos, conforme regra consolidada.
- 5. Tabela de clientes apresenta clínica, médicos que atenderam, contadores identificados de uso 24h/agendado, agenda, presença recente e financeiro. Ausência de evento de integração não é apresentada como certeza de zero uso.
- 6. Contagem de vidas representa pessoas habilitadas por clínica/período, independentemente de utilização; titular/dependente têm preços e classificação rastreáveis. Uma vida habilitada sem login ou consulta continua incluída na apuração; acessos repetidos não geram vidas adicionais.
- 7. Fatura da clínica é explicável por demonstrativo e versão do contrato; não duplica em repetição de emissão e mantém preços históricos.
- 8. Setup, mensalidade e cobrança por vidas são calculados conforme combinações aprovadas, sem somar componentes por suposição.
- 9. Plano-base permite configurar os serviços e coparticipação/carência/fidelidade por item; interface e servidor respeitam as condições no acesso do cliente.
- 10. Agendamento/benefício não é liberado por simples visibilidade do botão quando o serviço estiver indisponível no contrato.
- 11. Combinações de pulseira com/sem médico, IA e fidelidade respeitam os recursos incluídos e os valores configurados.
- 12. Alteração de preço/plano não muda retrospectivamente faturas, vendas ou condições contratuais sem fluxo definido de alteração.

## 15 - Blog central e blog no aplicativo 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar blog central e blog no aplicativo, respeitando as decisões pendentes do PRD.

**Requisitos**:

- Super ADM possui módulo Blog e disponibiliza conteúdos neutros, reutilizáveis por clínicas com marca própria.
- Conteúdo pode conter imagem e texto, vídeo ou áudio de podcast.
- Clínica escolhe os conteúdos que deseja disponibilizar aos clientes.
- Aplicativo do cliente possui módulo Blog para consumir os conteúdos publicados pela clínica.
- RECOMENDADO: separar disponibilização central de publicação pela clínica; item no catálogo central não aparece automaticamente em todo aplicativo. Conteúdo neutro não inclui marca da clínica de origem nem dados de pacientes. Manter autoria, referências e licenças quando exigidas.
- RECOMENDADO: título, resumo, capa, categoria, tipo de mídia, conteúdo, estado editorial, data e versão. Exibir os estados de rascunho, publicado e retirado; validar mídia e acessibilidade. Atualização de conteúdo central deve ter regra explícita para publicações já selecionadas.
- PENDENTE: definição de neutralidade, revisão editorial/clínica, hospedagem e formatos/tamanhos das mídias, publicação agendada, busca/categorias, métricas de consumo, efeitos de retirada central e possibilidade de conteúdo próprio/adaptação pela clínica. Não foi solicitado acesso do paciente à Academy.

## 16 - Academy para clínicas 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar academy para clínicas, respeitando as decisões pendentes do PRD.

**Requisitos**:

- Super ADM possui módulo Academy para disponibilizar vídeos e treinamentos.
- Finalidade: ensinar a clínica a utilizar a plataforma e vender seus produtos/serviços.
- RECOMENDADO: organizar cursos, aulas, materiais e progresso do usuário, com diferenciação entre capacitação operacional e comercial.
- PENDENTE: perfis da clínica com acesso (ADM, equipe comercial, profissionais), estrutura de cursos, acompanhamento de conclusão, materiais adicionais e eventual certificação. Academy não entra automaticamente no aplicativo do paciente.

## 17 - Indique e Ganhe 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar indique e ganhe, respeitando as decisões pendentes do PRD.

## 17.1 - Configuração da clínica 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar configuração da clínica, respeitando as decisões pendentes do PRD.

**Requisitos**:

- Clínica pode ativar/desativar o programa para todos os clientes ou somente clientes selecionados e definir:
- Valor pago pela indicação.
- Quantidade de indicações permitidas.
- Prazo de validade.
- Forma de recompensa: dinheiro ou desconto na mensalidade.
- PENDENTE: quantidade por cliente/período/campanha ou global; validade da campanha, link, indicação ou crédito; planos/produtos elegíveis; valor por indicação ou outra base; condição de qualificação; quando crédito é liberado; mudança das regras e clientes já participantes.

## 17.2 - Aplicativo do cliente 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar aplicativo do cliente, respeitando as decisões pendentes do PRD.

**Requisitos**:

- Quando ativado e autorizado para o cliente, o módulo aparece no aplicativo.
- Mostra quanto já ganhou, saldo, histórico e lista de indicados.
- Desativação/inelegibilidade bloqueia o programa no servidor, não somente oculta o menu.
- RECOMENDADO: distinguir saldo em análise, disponível, usado/pago e estornado. Gerar link/código individual de indicação, registrar origem e vincular a regra vigente na conversão. Mostrar ao indicador apenas identificação mínima e status da indicação; não expor dados clínicos ou situação financeira detalhada do indicado.
- RECOMENDADO: autorreferência, cadastros duplicados e reprocessamentos não geram recompensa múltipla. Definir restrições para indicação de dependentes/pessoas já cadastradas.
- RECOMENDADO: crédito condicionado ao evento aprovado (por exemplo, primeiro pagamento confirmado), sem presumir esta condição como decisão do usuário. Estorno/cancelamento trata o crédito por regras explícitas.
- PENDENTE: fluxo e dados para pagamento em dinheiro, solicitação/aprovação de saque, valor mínimo, prazo, descontos parciais ou saldo excedente, impacto da desativação sobre créditos já adquiridos e validade do crédito. Pagamento automático em dinheiro não foi definido.

## 18 - Dependentes e plano familiar 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar dependentes e plano familiar, respeitando as decisões pendentes do PRD.

**Requisitos**:

- Aplicativo tem módulo Dependentes.
- Titular agrega e cadastra dependentes que recebem os benefícios do seu plano dentro do mesmo pagamento.
- Cliente possui um plano ativo por vez, podendo ampliar benefícios por upgrade.
- RECOMENDADO: dependentes têm identificação própria, vínculo ao titular e habilitação individual. Um pagamento familiar pode reunir várias vidas; cada pessoa habilitada é contada segundo a regra de faturamento da clínica, inclusive quando não utiliza os serviços.
- RECOMENDADO: relação financeira com o titular não concede automaticamente leitura dos dados clínicos de um dependente adulto. Definir acesso próprio e representação legal de menores/incapazes. Não misturar históricos individuais.
- PENDENTE: número de dependentes por plano, critérios de vínculo/idade, documentação, preços adicionais/inclusos, login próprio, direitos do responsável, alteração de titular, remoção e efeito de suspensão/cancelamento/upgrade sobre os dependentes.

## 19 - Financeiro do cliente, inadimplência e plano ativo 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar financeiro do cliente, inadimplência e plano ativo, respeitando as decisões pendentes do PRD.

## 19.1 - Financeiro no aplicativo 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar financeiro no aplicativo, respeitando as decisões pendentes do PRD.

**Requisitos**:

- Cliente consulta fatura do mês e histórico de cobranças.
- Pagamento familiar reúne o titular e dependentes conforme o plano.
- Cliente inadimplente, ao entrar, acessa apenas o módulo Financeiro.
- Demais módulos ficam automaticamente desabilitados até que o pagamento seja realizado.
- RECOMENDADO: financeiro mostra cobranças, vencimentos, estados, itens, valores, pagamentos/créditos e meios disponíveis de regularização. Aplicar bloqueio no servidor e em sessões já existentes quando a condição mudar; não limitar a proteção a esconder menus.
- RECOMENDADO: estados distintos para regular, vencido, suspenso, pagamento em processamento e regularizado. Pagamento confirmado pelo servidor integra a regra de desbloqueio; comprovante enviado, clique em “paguei” ou retorno do navegador não são confirmação suficiente.
- RECOMENDADO: bloqueio preserva registros e prontuários; não apaga dados nem faz a IA recomendar suspensão de tratamento. Definir fluxo próprio para direitos de acesso/cópia dos dados, ainda que os módulos comerciais estejam bloqueados.
- PENDENTE: vencimento versus prazo de tolerância, quantidade/valor de parcelas em aberto que bloqueia, pagamento parcial, crédito de indicação, alcance sobre dependentes, estorno posterior e funcionamento quando a integração de cobrança estiver indisponível.
- PENDENTE: relação entre bloqueio comercial do paciente e desabilitação da vida para faturamento da clínica. Não considerar que inadimplência, por si só, encerra automaticamente o período de vida habilitada sem regra aprovada.

## 19.2 - Um plano ativo e upgrade 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar um plano ativo e upgrade, respeitando as decisões pendentes do PRD.

**Requisitos**:

- Cada cliente possui somente um plano ativo por vez.
- Pode fazer upgrade para outro plano com mais benefícios.
- Acesso aos módulos/benefícios depende dos itens efetivamente contratados nesse plano.
- RECOMENDADO: plano novo só substitui o anterior após as condições aprovadas da mudança; transição atômica evita dois planos ativos e preserva o histórico. Compra isolada de produto da loja não cria automaticamente segundo plano.
- PENDENTE: vigência imediata ou próxima competência, cobrança de diferença/proporcionalidade, carências/fidelidade preservadas ou novas, saldo/créditos, tratamento de dependentes, plano inadimplente e downgrade, que não foi solicitado neste bloco.

## 20 - Planos & Produtos do ADM da clínica 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar planos & produtos do adm da clínica, respeitando as decisões pendentes do PRD.

**Requisitos**:

- Clínica monta seus próprios planos selecionando itens-base disponibilizados pelo Super ADM para ela.
- Pode criar diversos planos e configurar seu preço final.
- Sistema libera ao cliente somente os recursos/benefícios incluídos no plano contratado e com condições válidas.
- ADM cria produtos/planos e atribui a oferta aos vendedores que selecionar.
- RECOMENDADO: catálogo da clínica conserva vínculo/versionamento dos itens-base e seus limites; não permite adicionar benefício central que não foi liberado. Produtos próprios seguem o fluxo da loja já definido. Definir disponibilidade por plano, contrato, clínica e usuário no servidor.
- PENDENTE: campos editáveis pela clínica, preços mínimos/limites de alteração, atribuição direta a diretores/coordenadores, mudanças nos planos já vendidos e reflexos em carência, fidelidade, coparticipação, comissões e dependentes.

## 21 - CRM de vendas e agente de IA 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar crm de vendas e agente de ia, respeitando as decisões pendentes do PRD.

## 21.1 - Funis e leads 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar funis e leads, respeitando as decisões pendentes do PRD.

**Requisitos**:

- ADM da clínica possui CRM de vendas com quadro de etapas (Kanban).
- Pode criar funis de venda.
- Tem agente de IA integrado ao WhatsApp da clínica para vendas e gestão de contatos comerciais (leads).
- Agente usa integração OpenAI específica por clínica.
- RECOMENDADO: contatos, origem, responsável, funil/etapa, histórico de interação e relação com eventual venda/cliente. Separar lead, comprador e paciente; registrar a conversão sem duplicar identidades. Agente pode qualificar e auxiliar a venda conforme regras, produtos, preços e permissões vigentes.
- RECOMENDADO: passagem clara para atendimento humano e identificação de quem responde. Agente comercial não recebe autorização clínica da IA Médica nem consulta prontuários automaticamente.
- PENDENTE: etapas, campos, distribuição de leads, ações automáticas permitidas, mensagens iniciadas pela clínica, horários, consentimentos/informações, transferência ao humano e integração da atribuição de leads com a atribuição de comissões. Encaminhar planos/produtos não autoriza alterar preço ou promessa clínica por inferência.

## 22 - Integrações por clínica 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar integrações por clínica, respeitando as decisões pendentes do PRD.

**Requisitos**:

- Cada clínica possui módulo Integrações.
- Integrações iniciais: Asaas, OpenAI e API de WhatsApp.
- Estrutura permite outras integrações a especificar.
- A chave/token OpenAI utilizada pelo agente é específica da clínica.
- RECOMENDADO: credenciais separadas por clínica, armazenadas com proteção no servidor, sem exposição no aplicativo, código-fonte ou registros comuns. Tela permite configurar, testar estado, substituir/revogar e ver falhas sem revelar a chave completa.
- RECOMENDADO: uso, custos/limites e erros atribuídos à clínica correta. Em caso de falha, não usar silenciosamente a chave de outra clínica. Permissões de alteração e ação do Super ADM são auditadas.
- RECOMENDADO para Asaas: eventos de pagamento autenticados, persistidos e processados sem duplicação. Distinguir pagamento confirmado de saldo recebido, pois esses eventos representam momentos diferentes. Identificar inequivocamente clínica e cobrança; impedir reaproveitamento de evento em outro ambiente.
- PENDENTE: conta Asaas própria por clínica ou outra estrutura de contas, fornecedor/modalidade do WhatsApp, titularidade das contas/chaves, emissão de cobranças/assinaturas, meios aceitos, ambientes de teste/produção, evento exato de desbloqueio, transferência/repasse automático e integrações adicionais.
- PENDENTE: separar integração financeira da clínica que cobra pacientes da eventual integração PlugPix que cobra as clínicas. Uma conta configurada para um propósito não é usada no outro automaticamente.

## 23 - Equipe de vendas, hierarquia e comissões 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar equipe de vendas, hierarquia e comissões, respeitando as decisões pendentes do PRD.

## 23.1 - Estrutura 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar estrutura, respeitando as decisões pendentes do PRD.

**Requisitos**:

- Três níveis: Diretor → Coordenador → Vendedor.
- Diretor pode ter vários coordenadores abaixo dele.
- Coordenador pode ter várias equipes de vendedores.
- Equipe permanece vinculada à clínica.
- Cada diretor, coordenador e vendedor possui acesso próprio e link rastreável de vendas.
- Comissões são definidas em percentual ou valor fixo em reais e associadas a plano/produto.
- RECOMENDADO: cadastrar pessoas, equipes, vínculos hierárquicos, datas de vigência e ofertas autorizadas. Não permitir ciclos de hierarquia ou vínculos entre clínicas. Uma venda preserva a cadeia de participantes existente na data da atribuição; troca de equipe não reescreve comissão antiga.
- PENDENTE: quem cadastra/edita cada nível, participação em várias equipes/coordenadores, substituição de diretor, inativação e consequências para leads, links, clientes e comissões existentes.

## 23.2 - Links, ofertas e atribuição 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar links, ofertas e atribuição, respeitando as decisões pendentes do PRD.

**Requisitos**:

- Cada participante possui link pessoal rastreável de cada produto/plano disponível para ele.
- ADM da clínica cria a oferta e pode atribuí-la aos vendedores selecionados.
- Compra por link registra automaticamente as comissões dos participantes da cadeia comercial correspondente.
- RECOMENDADO: link identifica clínica, oferta e participante, sem permitir adulterar valor ou destinatário da comissão. Na venda por vendedor, registrar vendedor, coordenador e diretor de sua cadeia válida. Não remunerar todos os membros da clínica: somente participantes elegíveis daquela venda.
- RECOMENDADO: compra por diretor/coordenador usa a cadeia pertinente à origem da venda; não inventa vendedor subordinado. A política exata para essas vendas diretas permanece pendente.
- PENDENTE: duração do rastreamento; primeiro/último link; troca de dispositivo; compra posterior pelo WhatsApp; venda manual; disputa de atribuição; link inativo; herança de ofertas para chefias; regras para link de indicação e link comercial usados na mesma compra.

## 23.3 - Cálculo e estados da comissão 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar cálculo e estados da comissão, respeitando as decisões pendentes do PRD.

**Requisitos**:

- DEFINIDO: comissões em percentual ou reais, relacionadas ao produto/plano; registro automático quando a compra pelo link ocorre. Participantes consultam valores, histórico e se a comissão foi paga.
- RECOMENDADO: distinguir comissão registrada/prevista, em análise, liberada, paga e estornada. Registro na compra não significa liberação imediata de dinheiro. Definir critério de liberação, preferencialmente vinculado à confirmação financeira segundo a regra escolhida.
- RECOMENDADO: salvar base de cálculo, regra/versão, valor, beneficiário, venda e pagamento correspondente. Cálculo repetido por retorno duplicado não cria nova comissão. Estorno, cancelamento, inadimplência e upgrade seguem regras explícitas.
- PENDENTE: comissão por pessoa, nível ou equipe; base bruta/líquida; incidência em implantação, primeira mensalidade, recorrência, dependentes, upgrades e coparticipações; arredondamento; valores máximos; coexistência de percentual/valor fixo; elegibilidade de chefias; prazo e modo de pagamento; retenções; efeitos de reembolso total/parcial e contestação. Pagamento automático/split não foi definido.
- PENDENTE: acúmulo de comissão comercial, prêmio de Indique e Ganhe e ganho da loja na mesma transação. Não excluir nem somar remunerações sem política aprovada.

## 23.4 - Painéis e alcance 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar painéis e alcance, respeitando as decisões pendentes do PRD.

**Requisitos**:

- Diretor vê vendas próprias e as dos coordenadores/vendedores abaixo dele.
- Coordenador vê vendas próprias e as de seus vendedores.
- Vendedor vê suas próprias vendas.
- Cada participante vê clientes relacionados às vendas dentro desse alcance, contatos básicos, planos contratados, status de pagamento dos clientes, suas comissões, histórico e indicação de comissão paga/não paga.
- Cada participante vê seus links pessoais por plano/produto autorizado.
- RECOMENDADO: acesso aplicado no servidor também a buscas, detalhes e exportações. “Todos veem” refere-se a participantes vendo os clientes do seu alcance comercial, não a uma lista irrestrita de pacientes da clínica ou plataforma.
- RECOMENDADO: separar contatos/dados comerciais de prontuários, exames, métricas de saúde e conversas clínicas; perfil comercial não concede acesso clínico.
- PENDENTE: diretor/coordenador podem consultar valores de comissão dos subordinados ou somente totais e próprias comissões; acesso após transferência de equipe; edição de dados do cliente; relatórios, exportação e informações financeiras que ficam visíveis.

## 24 - Critérios de aceite propostos — conteúdo, indicações e operação comercial 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar critérios de aceite propostos — conteúdo, indicações e operação comercial, respeitando as decisões pendentes do PRD.

**Requisitos**:

- 1. Super ADM disponibiliza mídia/texto no blog; clínica seleciona/publica e somente o conteúdo publicado no contexto correto aparece no aplicativo.
- 2. Academy apresenta treinamentos aos perfis autorizados da clínica; não concede automaticamente acesso a pacientes.
- 3. Indique e Ganhe pode ser ativado globalmente na clínica ou para clientes selecionados; cliente elegível consulta saldo, histórico, ganhos e indicados com privacidade.
- 4. Limite, validade, qualificação e remuneração de indicação seguem a versão da campanha aprovada; repetição de evento não duplica crédito.
- 5. Dependentes recebem os benefícios permitidos pelo plano familiar, com identidades e históricos separados. Todas as pessoas habilitadas entram na apuração de vidas conforme contrato.
- 6. Existe no máximo um plano ativo por cliente no contexto contratual definido. Upgrade mantém histórico e aplica preço/benefícios/carência conforme política aprovada.
- 7. Inadimplência aplica acesso somente ao financeiro na interface e servidor, segundo critérios aprovados; pagamento confirmado regulariza de forma consistente, preservando registros.
- 8. Suspensão comercial não é tratada automaticamente como desabilitação faturável da vida até aprovação dessa relação.
- 9. Clínica só compõe planos a partir de itens-base liberados e produtos próprios permitidos; acesso do cliente respeita a oferta vigente contratada.
- 10. CRM/funis/contatos e agente WhatsApp são exclusivos da clínica; IA comercial respeita catálogo, atribuição e permissões sem acesso clínico automático.
- 11. Credenciais Asaas/OpenAI/WhatsApp não são expostas nem reutilizadas entre clínicas. Retorno autenticado e duplicado não duplica cobrança, desbloqueio, crédito ou comissão.
- 12. Link de venda registra oferta, clínica, participante e cadeia corretos; usuário não autorizado não acessa oferta restrita nem altera destinatários pelo endereço.
- 13. Comissões são calculadas pela regra aprovada e preservam a cadeia histórica. Compra, pagamento, liberação e repasse são estados distintos.
- 14. Diretor/coordenador/vendedor veem apenas seus respectivos alcances comerciais, inclusive por chamadas diretas ao servidor; nenhuma chefia ganha acesso clínico.
- 15. Mudança/inativação de equipe ou regra não modifica retroativamente comissões já registradas; efeitos futuros obedecem à política definida.
- 16. Estorno/reembolso e coexistência de recompensas obedecem às decisões comerciais, com demonstrativo e trilha de auditoria.
- Referências técnicas consultadas:
- Asaas, autenticação e repetição de eventos: https://docs.asaas.com/docs/sobre-os-webhooks
- Asaas, estados de pagamento confirmado/recebido: https://docs.asaas.com/docs/webhook-para-cobrancas
- OpenAI, proteção de chave de API no servidor: https://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety

## 25 - Pulseira Inteligente — gestão central no Super ADM 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar pulseira inteligente — gestão central no super adm, respeitando as decisões pendentes do PRD.

## 25.1 - Cadastro, estoque e expedição 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar cadastro, estoque e expedição, respeitando as decisões pendentes do PRD.

**Requisitos**:

- Super ADM possui módulo Pulseira Inteligente para gerenciar o ciclo operacional dos dispositivos.
- Cadastra pulseiras novas e gerencia o estoque.
- Gerencia envio para a clínica e status de expedição.
- Mantém lista/informações de firmware associadas às pulseiras cadastradas.
- Apenas pulseiras cadastradas e liberadas pelo Super ADM podem acessar a plataforma.
- RECOMENDADO: cadastro por unidade física com modelo, fabricante, lote quando disponível, identificador individual, versão de firmware, condição, localização e situação. Registrar entradas, reservas, saídas, expedições e recebimentos, sem confundir quantidade física com quantidade de vidas contratadas.
- RECOMENDADO: expedição possui unidades enviadas, clínica destinatária, data, responsável, transportadora/código de rastreio quando disponível e histórico de status. Exemplos de estados a aprovar: disponível, reservado, expedido, recebido, atribuído ao paciente, devolvido/manutenção e retirado de uso.
- PENDENTE: campos definitivos, importação em lote, conferência de recebimento, integração com transportadora, venda/cessão/aluguel, estoque em poder da clínica, devoluções, garantias e reposições. Estados de exemplo não foram aprovados como lista final.

## 25.2 - Firmware, identificação e autorização 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar firmware, identificação e autorização, respeitando as decisões pendentes do PRD.

**Requisitos**:

- DEFINIDO: liberação central pelo Super ADM, com cadastro/informações do firmware de cada pulseira. Pulseira não liberada não participa da integração do sistema.
- RECOMENDADO: separar versão do programa interno (firmware) e identificador da unidade. Versão de firmware identifica uma revisão de software e pode se repetir em várias unidades; não é, por si só, identificação individual nem prova de autenticidade.
- RECOMENDADO: cadastro de modelos/versões homologados mais autorização de cada unidade física e vinculação válida ao paciente/clínica. A autenticação técnica do dispositivo deve ser validada com o fabricante/protocolo; número de série, etiqueta ou código de ativação, isoladamente, não comprovam que um equipamento não foi clonado.
- PENDENTE: identificar qual dado o usuário chama de “firmware” e quais identificadores estáveis a H59MAX realmente expõe; obter documentação ou validar uma unidade real. Se o termo estiver sendo usado para um código individual de fábrica, mapear o campo à sua função real sem eliminar o requisito de cadastro da versão.
- RECOMENDADO: pareamento/vínculo exigem autorização de servidor para unidade, usuário, clínica e contratação correspondente. Bloquear nova ativação e aceitação de novos dados de dispositivo não cadastrado, não liberado ou revogado. Nome Bluetooth, versão, endereço informado pelo aplicativo ou identificador local do navegador não constituem, isoladamente, autenticação suficiente.
- PENDENTE: mecanismo de autenticação e garantia contra falsificação, segredo/certificado do fabricante se suportado, código de ativação e transferência/repareamento. Não prometer autenticação forte de hardware se o dispositivo não oferecer capacidade suficiente.
- Não foi solicitado desenvolvimento, instalação ou atualização remota de firmware; cadastro e lista de versões não incluem automaticamente essas operações.

## 25.3 - Monitoramento e vínculo 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar monitoramento e vínculo, respeitando as decisões pendentes do PRD.

**Requisitos**:

- Super ADM visualiza:
- Pulseiras ativas no momento.
- Status/nível da bateria de cada pulseira.
- Cliente que usa cada unidade.
- Clínica vinculada ao cliente/unidade.
- RECOMENDADO: separar os estados de autorização (liberada/inativada), vínculo (sem paciente/atribuída) e conectividade (conectada ao aplicativo, sincronização recente ou sem sinal recente). “Ativa” no cadastro não significa conectada neste instante.
- RECOMENDADO: mostrar bateria com valor e data/hora da última leitura, último recebimento/sincronização e origem do dado. Campo sem leitura disponível deve mostrar desconhecido, não zero. Um valor antigo não é apresentado como bateria atual confirmada.
- RECOMENDADO: visão global com filtros por clínica, cliente, unidade, modelo/firmware, estoque, autorização, conectividade e bateria. Metadados de equipamento não concedem acesso administrativo ao prontuário.
- PENDENTE: quais dados de bateria/conexão a H59MAX realmente oferece, frequência, janela de presença, alertas de bateria, funcionamento com aplicativo fechado e suporte a segundo plano. No fluxo BLE → aplicativo → servidor, observabilidade depende do aplicativo transmitir os dados; não pressupor comunicação direta permanente da pulseira com a nuvem.
- RECOMENDADO: manter um paciente ativo por unidade em cada momento. Histórico de atribuições permite troca/reposição e evita misturar medições de pacientes. Dados antigos são atribuídos pelo vínculo no momento de coleta; troca de dono não reassocia o histórico.
- DEFINIDO posteriormente: ADM da clínica pode ativar unidades liberadas para ela e acompanhar seus clientes, conforme seção 25.5. PENDENTE: uso de várias pulseiras por paciente, unidade de dependente, transferência/reutilização, limpeza de dados e tratamento de medições armazenadas no dispositivo antes da atribuição.

## 25.4 - Inativação e cancelamento 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar inativação e cancelamento, respeitando as decisões pendentes do PRD.

**Requisitos**:

- Super ADM pode inativar uma pulseira em caso de cancelamento do plano.
- A inativação impede o uso autorizado da integração dessa unidade na plataforma.
- RECOMENDADO: registrar data/hora, operador, motivo e vínculo afetado, bloquear pareamento/reativação não autorizados e novas sincronizações segundo a política definida. Preservar histórico já recebido; inativação não apaga prontuários nem transfere dados.
- PENDENTE: cancelamento gera inativação automática ou ação manual; início da efetividade; tratamento de dados coletados antes e enviados depois; retorno ao plano, reativação, devolução/reposição e efeito em plano familiar ou outro serviço ativo.
- RECOMENDADO: revogação aplicada no servidor e aplicativo, não somente na tela do Super ADM. Definir comportamento sem conexão e prazo de revalidação; não garantir bloqueio instantâneo de ações locais em um aplicativo desconectado.
- Limite técnico registrado: inativar o acesso à plataforma não significa desligar ou inutilizar fisicamente a pulseira nem impedir seu uso em aplicações de terceiros. Controle físico/remoto só poderá entrar no escopo após comprovação de suporte do fabricante.

## 25.5 - Pulseiras e estoque no ADM da clínica 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar pulseiras e estoque no adm da clínica, respeitando as decisões pendentes do PRD.

**Requisitos**:

- ADM da clínica possui visão operacional das pulseiras liberadas para sua clínica pelo Super ADM.
- Pode ativar essas unidades para seus clientes, respeitando a liberação central e as condições do serviço contratado.
- Acompanha, por cliente, status da pulseira ativada, bateria e uso.
- Possui controle de estoque baseado nas unidades individualmente liberadas para a clínica pelo Super ADM.
- A clínica não cadastra por conta própria uma unidade externa como autorizada nem acessa o estoque/pulseiras de outra clínica.
- RECOMENDADO: apresentar identificador da unidade, modelo/firmware, cliente vinculado, estado de autorização/ativação, última conexão/sincronização e bateria com data/hora da leitura. A ausência de dados recentes não comprova bateria zero, equipamento desligado ou falta de uso.
- RECOMENDADO: separar unidade liberada, expedida, recebida e atribuída ao cliente. O estoque local tem as mesmas unidades e movimentações do cadastro central, com visão limitada à clínica; não manter inventários independentes que possam divergir. Ativação de uma unidade é atômica para evitar atribuição simultânea a dois clientes.
- RECOMENDADO: tela mostra totais de unidades liberadas, em trânsito, disponíveis para ativação, atribuídas e inativas/devolvidas, conforme estados operacionais a aprovar. Inativação não significa automaticamente retorno físico ao estoque disponível.
- RECOMENDADO: “uso” administrativo inicialmente representa atividade de integração, conexões/sincronizações e vínculo. Leitura de indicadores clínicos individuais, exames e prontuário permanece no perfil Médico conforme definido; acompanhamento de equipamento não concede essas permissões ao ADM.
- PENDENTE: definição precisa de uso (sincronização, frequência, tempo de utilização se o dispositivo fornecer), confirmação de recebimento necessária para ativar, campos e filtros, permissões da equipe local, transferência entre clientes, reposição e se o ADM local também pode inativar/reativar. A inativação pelo Super ADM continua definida.

## 26 - Critérios de aceite propostos — ciclo da pulseira 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar critérios de aceite propostos — ciclo da pulseira, respeitando as decisões pendentes do PRD.

**Requisitos**:

- 1. Cadastro individual relaciona unidade, modelo/firmware, estoque e autorização; versão repetida de firmware não impede distinguir unidades.
- 2. Movimentação/expedição identifica as unidades e clínica destinatária, mantém histórico e não duplica baixa de estoque em repetição da operação.
- 3. Apenas unidades autorizadas podem ser vinculadas/sincronizadas, com verificações no servidor e mecanismo de identificação/autenticação validado para o hardware escolhido.
- 4. Aplicativo e servidor não aceitam autorização baseada somente em versão de firmware; tentativas de identidade adulterada são tratadas conforme a capacidade técnica validada.
- 5. Visão global mostra cliente/clínica corretos por unidade, bateria com data da leitura e conectividade/presença conforme definições aprovadas.
- 6. Pulseira sem telemetria recente não é apresentada como seguramente conectada nem com bateria atual conhecida.
- 7. Inativação revoga a integração conforme o fluxo aprovado, preserva o histórico e impede reativação não autorizada; limites de operação local/desconectada ficam documentados.
- 8. Transferência/reposição não mistura pacientes, não reatribui históricos e aplica regra para medições anteriores armazenadas na pulseira.
- 9. Médico/ADM da clínica não acessa unidades/pacientes de outra clínica por manipular identificadores; Super ADM mantém alcance operacional global auditado.
- 10. Cancelamento, dependentes e reativação seguem vínculo e condições comerciais aprovados, sem desativar outros beneficiários/serviços por suposição.
- 11. ADM da clínica lista e ativa somente unidades liberadas pelo Super ADM para ela; tentativa de ativar unidade externa, revogada ou de outra clínica é recusada no servidor.
- 12. Estoque local e central refletem as mesmas unidades/movimentações. Ativação concorrente não atribui uma unidade a dois clientes; inativação não a torna disponível fisicamente por suposição.
- 13. ADM acompanha bateria, status e uso das unidades de seus clientes com identificação de atualização e sem acesso clínico automático. Permissões e isolamento continuam aplicados em API, buscas e exportações.
- Referências técnicas consultadas, sem comprovar implementação pela H59MAX:
- Bluetooth SIG, Device Information Service: distingue número de série da unidade e versão de firmware: https://www.bluetooth.com/wp-content/uploads/Files/Specification/HTML/DIS_v1.2/out/en/index-en.html
- Bluetooth SIG, Battery Service: descreve leitura/notificação do nível de bateria: https://www.bluetooth.com/wp-content/uploads/Files/Specification/HTML/BAS_v1.1/out/en/index-en.html

## 27 - Bioimpedância — balança integrada 🔵

- **Status**: 🔵 Em implementação / parcial
- **Autores**: Codex
- **Entregue**: Interface de bioimpedância com medições fictícias compartilhada entre cliente e médico.
- **Próximo Passo**: Escolher balança, validar protocolo, integrar medidas e implementar gestão operacional e acesso real.

## 27.1 - Escopo e aplicativo do paciente 🔵

- **Status**: 🔵 Em implementação / parcial
- **Autores**: Codex
- **Entregue**: Oito medições fictícias, três gráficos de composição corporal, unidades, horários, filtro e tabelas.
- **Próximo Passo**: Integrar uma balança homologada e apresentar somente métricas efetivamente suportadas.

**Requisitos**:

- Incluir módulo Bioimpedância com integração a balança.
- Aplicativo apresenta todas as informações efetivamente coletadas e disponibilizadas pela integração da balança para aquele paciente.
- Dados compõem o histórico de saúde individual, com consulta e evolução.
- Integração não tem modelo/fabricante escolhido nesta conversa; nenhuma compatibilidade está garantida.
- RECOMENDADO: exibir cada medição com unidade, data/hora da coleta e do recebimento, origem, identificador da balança e condições/dados de perfil necessários ao cálculo quando disponíveis. Não inventar métricas para preencher campos ausentes.
- RECOMENDADO: separar grandezas medidas, como peso, de estimativas calculadas pelo equipamento/algoritmo. Exemplos condicionais, não lista garantida: percentual/massa de gordura, massa magra/muscular e água corporal. Exibir somente métricas que o modelo e a interface realmente entreguem, com descrição das limitações.
- RECOMENDADO: histórico e gráficos de evolução, sem transformar estimativa de composição corporal em diagnóstico; distinguir entrada manual, cálculo do sistema e dado recebido do dispositivo. Mudança de modelo, perfil ou algoritmo é identificada para comparações.
- PENDENTE: modelo(s), métricas/unidades, períodos dos gráficos, requisitos do perfil, qualidade/validação, orientações e restrições do fabricante, limites de interpretação pela IA e exportação.

## 27.2 - Histórico clínico, IA e visibilidade administrativa 🔵

- **Status**: 🔵 Em implementação / parcial
- **Autores**: Codex
- **Entregue**: Médico e cliente consomem o mesmo componente e a mesma fonte estática de dados demonstrativos.
- **Próximo Passo**: Implementar histórico persistente, autorização clínica, auditoria e IA; alcance administrativo clínico permanece pendente.

**Requisitos**:

- DEFINIDO: dados da balança ficam no histórico de saúde do paciente no acesso Médico da mesma clínica, junto dos demais indicadores; interpretação contextual de “acesso pedido da clínica” conforme os módulos previamente descritos.
- DEFINIDO: Super ADM e ADM da clínica possuem gestão operacional dos equipamentos, com alcance global e local respectivamente, conforme seções 27.3 e 27.4.
- SOLICITADO, A ESCLARECER: usuário disse que as informações “aparecem para o Super ADM também”. Registrar a intenção sem decidir se isso significa metadados de gestão ou valores individuais de saúde. Acesso aos valores clínicos pelo perfil administrativo precisa ser conciliado com a exclusividade de acesso profissional Médico definida anteriormente; nenhuma permissão clínica nova é concedida implicitamente.
- RECOMENDADO: dados da balança podem participar da visão integrada de saúde e dos índices/observações da IA já previstos, mantendo as regras de autorização, confiabilidade, origem, finalidade e ausência de prescrição. Coleta de uma nova métrica não valida automaticamente uma pontuação clínica.
- PENDENTE: confirmar alcance clínico solicitado ao Super ADM e, se houver nova regra, dados específicos, finalidade, perfis e controles. Não presumir que ADM da clínica também recebe acesso clínico pelo controle do equipamento.

## 27.3 - Gestão central no Super ADM 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar gestão central no super adm, respeitando as decisões pendentes do PRD.

**Requisitos**:

- Aplicar à balança a gestão operacional equivalente à das pulseiras:
- Cadastro individual, modelo, informações de firmware quando disponíveis e autorização/liberação central.
- Gestão de estoque e unidades.
- Expedição/envio para clínicas e status do envio.
- Clínica responsável, vínculo de uso e paciente(s) conforme modelo individual/compartilhado a definir.
- Status de uso em tempo real.
- Bateria, se o equipamento expuser essa informação, com horário da última leitura.
- Inativação/revogação da integração conforme regras de cancelamento e utilização.
- RECOMENDADO: reutilizar um cadastro operacional de dispositivos com tipos “pulseira” e “balança”, sem impor à balança o vínculo exclusivo de um paciente por unidade antes de definir seu uso.
- RECOMENDADO: identificação individual e versões homologadas são campos diferentes. Aplicar autorização de unidade e validação no servidor; versão de firmware ou leitura enviada pelo aplicativo não comprovam, isoladamente, autenticidade.
- PENDENTE: identificadores/autenticação oferecidos pelo modelo; significado de status de uso; operação doméstica/compartilhada; regras de inativação, reposição, devolução, manutenção e atualização de firmware, não solicitada automaticamente.

## 27.4 - Gestão no ADM da clínica 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar gestão no adm da clínica, respeitando as decisões pendentes do PRD.

**Requisitos**:

- Clínica acompanha apenas balanças liberadas para ela pelo Super ADM.
- Possui estoque local vinculado ao cadastro central.
- Consulta envio/expedição, status e uso dos equipamentos no seu ambiente.
- Pode ativar/vincular unidades autorizadas para utilização pelos seus clientes, conforme modelo operacional a definir.
- Consulta bateria quando disponível, atualização e sincronização.
- Não vê nem ativa equipamento liberado somente a outra clínica.
- RECOMENDADO: distinguir unidade liberada, enviada, recebida, disponível, atribuída/em uso e inativa/devolvida. Inativação não implica devolução física. Ativação local respeita liberação central e benefícios contratados.
- PENDENTE: quem confirma recebimento, atribuição/remoção de usuários, equipes locais com permissão e se clínica pode inativar/reativar a unidade.

## 27.5 - Uso individual ou compartilhado e identificação do paciente 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar uso individual ou compartilhado e identificação do paciente, respeitando as decisões pendentes do PRD.

**Requisitos**:

- PENDENTE PRIORITÁRIO: definir se balança é pessoal, compartilhada pela família, utilizada na clínica ou suporta mais de um desses modos.
- RECOMENDADO: cada medição tem paciente/clinica inequivocamente identificados por sessão/perfil autorizado. Peso semelhante não é identificação suficiente. Dado sem paciente confirmado fica em fluxo restrito de atribuição, não entra automaticamente em prontuário/histórico/IA.
- RECOMENDADO: uso compartilhado tem sessões/perfis separados e não expõe resultados de outro paciente. Troca de usuário ou unidade preserva históricos e não associa leituras antigas ao usuário novo. Definir tratamento de medições armazenadas no dispositivo e enviadas posteriormente.
- RECOMENDADO: em unidade compartilhada, cancelamento de um paciente revoga o acesso dele conforme sua contratação, sem bloquear os demais usuários por suposição. Revogação da unidade inteira e revogação de um vínculo são operações distintas.
- PENDENTE: número de usuários, dependentes, modo de identificação, representação de menores, convivência de vários planos e eventual uso do equipamento por mais de uma clínica. Não permitir compartilhamento entre clínicas até definição explícita.

## 27.6 - Integração e status em tempo real 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar integração e status em tempo real, respeitando as decisões pendentes do PRD.

**Requisitos**:

- DEFINIDO: objetivo de mostrar status de uso em tempo real na gestão global/local.
- RECOMENDADO: especificar separadamente autorizado, conectado, medição em andamento, leitura concluída e última sincronização. Disponibilidade desses eventos depende do protocolo. “Sem evento recente” não significa equipamento certamente desligado.
- PENDENTE: interface oficial de programação (API), biblioteca do fabricante (SDK) ou protocolo Bluetooth validado, acesso aos dados brutos versus calculados, licença/condições da integração, conexão direta ou por nuvem, compatibilidade com PWA e comportamento com aplicativo fechado.
- RECOMENDADO: medir atraso da informação e definir meta de atualização. Via Bluetooth e aplicativo, a gestão recebe eventos transmitidos por esse aplicativo; via nuvem, recebe eventos/consultas suportados pelo fornecedor. Uma balança que transmite somente ao concluir a pesagem não oferece necessariamente presença contínua.
- RECOMENDADO: registrar coleta/recebimento, normalizar unidades e evitar duplicidade em reenvios. Interface mostra atualização, sem conexão, aguardando sincronização ou desconhecido conforme o dado efetivamente disponível. Não apresentar valores antigos como acompanhamento contínuo em tempo real.
- PENDENTE: validação de unidade real, frequência/latência, bateria, perda de conexão, modo offline, segurança do transporte, limitação de chamadas e custo do fornecedor.

## 27.7 - Plano, habilitação e cobrança 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar plano, habilitação e cobrança, respeitando as decisões pendentes do PRD.

**Requisitos**:

- Definir em quais planos a bioimpedância entra, se há ativação/mensalidade específica, preço-base, preço final da clínica, entrega/cessão da balança e cobrança por unidade/uso. O número de balanças não representa quantidade de vidas; cada pessoa habilitada continua sendo uma vida conforme regra contratual definida.
- Cancelamento/inadimplência aplica a política consolidada de benefícios e vínculos; não apagar histórico nem presumir desativação física remota.

## 28 - Critérios de aceite propostos — bioimpedância 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar critérios de aceite propostos — bioimpedância, respeitando as decisões pendentes do PRD.

**Requisitos**:

- 1. Paciente consulta apenas suas medições da balança, métricas efetivamente disponibilizadas e histórico, com origem, unidades e datas.
- 2. Médico autorizado da mesma clínica vê esses dados no histórico de saúde; novas permissões administrativas clínicas dependem de decisão explícita.
- 3. Super ADM vê gestão global e clínica vê somente suas unidades autorizadas, com estoque/expedição e status coerentes.
- 4. Cadastro/ativação não aceita unidade não liberada; identificadores de outra clínica não permitem acesso direto ou sincronização indevida.
- 5. Uma pesagem é atribuída ao paciente confirmado; uso compartilhado não mistura históricos nem se apoia somente no peso para identificação.
- 6. Reenvio de leitura não duplica medição, gráfico ou resultado de índice; unidades/valores são normalizados sem fabricar dados ausentes.
- 7. Estimativas de composição corporal são identificadas como tais; suporte a uma métrica é comprovado na integração validada.
- 8. Status em tempo real cumpre a latência e eventos definidos para o modelo escolhido; ausência de conectividade e dados antigos ficam explícitos.
- 9. Bateria é mostrada somente quando disponível, com data da leitura; ausência não é convertida em zero.
- 10. Revogação de unidade/vínculo e reatribuição preservam históricos e não bloqueiam outros usuários autorizados por suposição.
- 11. Operação doméstica/compartilhada, plano e cancelamento obedecem às decisões comerciais e assistenciais aprovadas.
- Referências consultadas exclusivamente para orientar a especificação; não representam escolha de Withings nem prova de integração dos modelos pesquisados em outro chat:
- Fabricante Withings, bioimpedância e estimativas de composição: https://support.withings.com/hc/en-us/articles/218970957-Body-How-does-the-scale-measure-my-body-composition
- Documentação de API Withings, medidas e disponibilidade após sincronização: https://developer.withings.com/api-reference/

## 29 - Inovações aprovadas — Super ADM 🔵

- **Status**: 🔵 Em implementação / parcial
- **Autores**: Antigravity
- **Entregue**: Simulador de rentabilidade (29.1) concluído em modo didático local.
- **Próximo Passo**: Faltam fórmulas oficiais, custos homologados, persistência/exportação e uso produtivo. Finalizar as demais inovações.

**Requisitos**:

- Todas as recomendações apresentadas na resposta anterior foram aprovadas pelo usuário para inclusão no PRD. As funções abaixo passam a ser requisitos definidos; fórmulas, telas e políticas operacionais ainda precisam ser especificadas. A aprovação não resolve pendências anteriores nem comprova conformidade, compatibilidade ou validação clínica.

## 29.1 - Simulador de rentabilidade 🔵

- **Status**: 🔵 Em implementação / parcial
- **Autores**: Antigravity
- **Entregue**: Simulador didático puro com validações e gráfico em barras proporcionais integrado à UI (C008).
- **Próximo Passo**: Faltam fórmulas oficiais, custos homologados, persistência/exportação e uso produtivo.

**Requisitos**:

- Antes de liberar/ofertar um plano, simular vidas, dependentes, preços, custos médicos, IA, dispositivos e comissões. Mostrar resultados em diferentes cenários para identificar ofertas de baixo resultado financeiro.
- RECOMENDADO: cenários conservador/base/expansão, entradas rastreáveis, custos únicos versus recorrentes, receita bruta/líquida, resultado de contribuição e ponto de equilíbrio. Não rotular diferença entre preço-base e venda como lucro líquido sem considerar demais custos.
- PENDENTE: fórmulas, custos reais por fornecedor/serviço, impostos/taxas, amortização de dispositivos, tratamento de uso variável, número de cenários e persistência/exportação. Projeção é estimativa baseada em premissas, não garantia de resultado.

## 29.2 - Central de funcionamento da plataforma 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar central de funcionamento da plataforma, respeitando as decisões pendentes do PRD.

**Requisitos**:

- Painel global com clínicas afetadas por integração interrompida, pagamento sem conciliação, mensagens não entregues, dispositivos sem sincronizar e falhas da IA. Finalidade: ajudar a identificar e resolver problemas antes de reclamações.
- Metadados operacionais não dão acesso automático aos resultados individuais de saúde; alcance clínico do Super ADM permanece pendente na seção 27.2.
- PENDENTE: estados de incidente, prioridades, responsáveis, limiares, notificações, ações de recuperação e tempos de atendimento. Falha operacional é diferente de alerta clínico.

## 29.3 - Implantação guiada de clínicas 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar implantação guiada de clínicas, respeitando as decisões pendentes do PRD.

**Requisitos**:

- Modelos de configuração por tipo de operação, com etapas de domínio, marca, planos, integrações, equipe e testes, para reduzir trabalho manual e padronizar implantação.
- RECOMENDADO: progresso por etapa e verificação de configurações; copiar somente configuração permitida, nunca credenciais, pacientes ou dados de outra clínica. Aplicar processo de forma repetível sem duplicar planos/vínculos.
- PENDENTE: modelos iniciais, campos obrigatórios, verificações automáticas/manuais, quem acompanha e critério de conclusão. Conclusão do roteiro não declara conformidade legal completa.

## 29.4 - Laboratório de qualidade da IA 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar laboratório de qualidade da ia, respeitando as decisões pendentes do PRD.

**Requisitos**:

- Testar versões/modelos/configurações antes de sua liberação, com casos sintéticos de receita ilegível, pedido de medicamento, exame ambíguo, dúvidas comerciais e tentativa de acesso a outra clínica. Evitar introdução silenciosa de falhas.
- RECOMENDADO: conjuntos de casos e critérios de aprovação versionados, registro de resultados, comparação entre versões e retorno à anterior quando necessário. Dados reais identificáveis não são usados no laboratório por padrão.
- PENDENTE: avaliadores, métricas de qualidade/segurança, revisão clínica, critérios mínimos, modelos/provedores e política de liberação por clínica.

## 30 - Inovações aprovadas — clínica e equipe 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar inovações aprovadas — clínica e equipe, respeitando as decisões pendentes do PRD.

## 30.1 - Jornadas configuráveis 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar jornadas configuráveis, respeitando as decisões pendentes do PRD.

**Requisitos**:

- Clínica monta sequência de entrada, avaliação inicial, consulta, registros periódicos e retorno, com responsável, prazo e condição de conclusão por etapa. Vincular essas jornadas ao módulo Protocolos da seção 32, evitando criação de dois mecanismos desconectados.

## 30.2 - Fila de próximos passos 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar fila de próximos passos, respeitando as decisões pendentes do PRD.

**Requisitos**:

- Exibir pendências como primeira consulta não agendada, retorno vencido, receita aguardando conferência e entrada no serviço não concluída. Pendências clínicas ficam com o profissional autorizado; administrativas com equipe permitida.
- RECOMENDADO: responsável, prazo, motivo, status e vínculo ao próximo passo. Ausência de registro/sincronização não comprova abandono nem urgência médica.
- PENDENTE: critérios de inclusão, prioridade, redistribuição e encerramento; alcance de visualização. Título/resumo da tarefa administrativa não revela conteúdo clínico.

## 30.3 - Resumo preparatório da consulta 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar resumo preparatório da consulta, respeitando as decisões pendentes do PRD.

**Requisitos**:

- No acesso Médico, reunir mudanças recentes, exames novos, relatos e registros de adesão, com origem e link ao dado/documento original, reduzindo procura manual.
- RECOMENDADO: distinguir fatos registrados, relatos e interpretação da IA; profissional verifica o resumo. Não incluir diagnóstico inventado, substituir o prontuário ou inserir automaticamente texto na evolução definitiva.
- DEFINIDO como direção de estudo: considerar interoperabilidade com padrões de resumo de paciente, como HL7 FHIR/International Patient Summary. PENDENTE: decidir adoção técnica, campos e integração; não presumir conformidade ao padrão.

## 30.4 - Retenção orientada por relacionamento 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar retenção orientada por relacionamento, respeitando as decisões pendentes do PRD.

**Requisitos**:

- Identificar sinais comerciais de afastamento, como falta de utilização, atendimento de suporte sem solução, consultas canceladas e reclamações, sugerindo ação ao responsável.
- RECOMENDADO: sugestões explicáveis com eventos e período, sem usar diagnósticos/dados clínicos privados para influenciar vendas. Separar comunicação assistencial de oferta comercial.
- PENDENTE: regras/modelo, prioridades, janela de análise, canais e avaliação das ações. Sinal comercial não é certeza de cancelamento.

## 31 - Inovações aprovadas — aplicativo do cliente 🔵

- **Status**: 🔵 Em implementação / parcial
- **Autores**: Lovable, Antigravity, Codex
- **Entregue**: Novo painel Meu dia e navegação móvel adaptada ao acompanhamento demonstrativo.
- **Próximo Passo**: Integrar rotina real, preparação da consulta, linha do tempo, metas e privacidade.

## 31.1 - Meu dia 🔵

- **Status**: 🔵 Em implementação / parcial
- **Autores**: Codex
- **Entregue**: Meu dia apresenta composição corporal, atividade e descanso fictícios com acesso aos demais módulos.
- **Próximo Passo**: Conectar agenda, medicamentos, hidratação e demais próximos passos reais do paciente.

**Requisitos**:

- Tela reúne próximos lembretes, consulta, treino previsto e ações do acompanhamento em sequência simples, reduzindo navegação entre módulos. Exibe somente recursos/ações autorizados pelo plano e estado de acesso, respeitando bloqueio financeiro e protocolo ainda não liberado.
- PENDENTE: posição na navegação, ordenação/prioridades, personalização e interação com notificações.

## 31.2 - Preparação para a consulta 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar preparação para a consulta, respeitando as decisões pendentes do PRD.

**Requisitos**:

- Antes do atendimento, perguntar o que mudou, quais dúvidas o paciente quer levar e quais documentos deseja apresentar; informações ficam disponíveis ao profissional autorizado.
- PENDENTE: momento do convite, perguntas, prazo, edição e vínculo à consulta. Não criar evolução definitiva em nome do médico.

## 31.3 - Linha do tempo contextual 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar linha do tempo contextual, respeitando as decisões pendentes do PRD.

**Requisitos**:

- Sobrepor registros de alimentação, treino, estado emocional, peso e eventos do acompanhamento para ajudar a compreender a evolução. Apresentar padrões observados sem afirmar causalidade.
- RECOMENDADO: sinalizar períodos incompletos, mudanças de dispositivo/algoritmo e origem dos dados; acesso apenas ao próprio paciente/representante autorizado e equipe clínica autorizada.
- PENDENTE: métricas, períodos, filtros, visualização e regras da análise.

## 31.4 - Metas pequenas e adaptáveis 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar metas pequenas e adaptáveis, respeitando as decisões pendentes do PRD.

**Requisitos**:

- Propor poucos compromissos por vez, dentro das orientações profissionais, com frequência/horários ajustados às preferências do cliente.
- Pontuação valoriza constância, aprendizado e execução das ações, com retomada acolhedora após interrupções. Peso perdido, volume de água e intensidade de treino não são critérios isolados para premiação.
- PENDENTE: número de metas, algoritmos de adaptação, aprovação profissional quando pertinente e convivência com as metas de protocolos. Adaptação de rotina não autoriza mudança de medicamento, dose ou conduta clínica.

## 31.5 - Central de privacidade 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar central de privacidade, respeitando as decisões pendentes do PRD.

**Requisitos**:

- Paciente vê quem acessou seus dados, consulta autorizações e solicita/exporta informações próprias.
- RECOMENDADO: trilha com ator, data/hora e categoria de acesso, sem expor segredos de segurança ou dados de outras pessoas; compartilhamento explícito e rastreável. A inclusão não cria compartilhamento automático entre clínicas.
- PENDENTE: granularidade, identificação dos acessos de sistema/IA, formatos, atendimento de solicitações, representação de dependentes e fluxo acessível durante bloqueio comercial, conforme direitos aplicáveis.

## 32 - Protocolos de acompanhamento da clínica 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar protocolos de acompanhamento da clínica, respeitando as decisões pendentes do PRD.

## 32.1 - Criação e composição 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar criação e composição, respeitando as decisões pendentes do PRD.

**Requisitos**:

- ADM da clínica possui módulo Protocolos de acompanhamento.
- Cria cada protocolo e sua composição.
- Primeira etapa é consulta agendada com médico de avaliação.
- Médico avalia se o paciente está apto ou não para aquele protocolo.
- Se apto, sistema libera no aplicativo o módulo Protocolo de acompanhamento correspondente.
- Se não apto, paciente é encaminhado a outro plano mais simples de acompanhamento.
- RECOMENDADO: composição organiza objetivo, público/condições, duração, consultas/retornos, profissionais, tarefas, metas, registros, dispositivos e benefícios a partir dos itens disponíveis à clínica. Esses são campos propostos, não composição clínica prescrita para um protocolo específico.
- RECOMENDADO: usar o mecanismo de jornadas com etapas, responsáveis, prazos e condições de conclusão. ADM configura a oferta/estrutura; avaliação e decisão de aptidão são do médico autorizado.
- PENDENTE: campos obrigatórios, protocolos iniciais, responsável técnico, aprovação de critérios clínicos/composição e diferença entre protocolo padrão e adaptações individuais. A edição administrativa não inclui emitir prescrição nem determinar aptidão.

## 32.2 - Avaliação e decisão médica 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar avaliação e decisão médica, respeitando as decisões pendentes do PRD.

**Requisitos**:

- Agendar consulta de avaliação inicial antes da liberação do acompanhamento.
- Médico acessa o histórico/dados disponíveis do paciente no ambiente clínico autorizado.
- Registra decisão de aptidão específica para o protocolo e orientações correspondentes, identificadas por médico, CRM, paciente, clínica e data/hora.
- A liberação depende de decisão médica registrada, não de avaliação automática da IA ou escolha do ADM/paciente.
- RECOMENDADO: relacionar a avaliação ao protocolo/versão e consulta; preservar registro definitivo e autoria conforme regras do prontuário. Correção/reavaliação gera novo registro sem sobrescrever decisão anterior.
- PENDENTE: campos da avaliação, requisitos/documentos/exames, assinatura, se existe decisão pendente por falta de informação, validade da aptidão e reavaliação. Falta à consulta ou pendência não equivale automaticamente a “não apto”.

## 32.3 - Apto — liberação do acompanhamento 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar apto — liberação do acompanhamento, respeitando as decisões pendentes do PRD.

**Requisitos**:

- Após decisão “apto”, liberar o módulo correspondente no aplicativo. Mostrar acompanhamento, etapas, próximas ações, metas e retornos conforme composição/jornada contratada.
- RECOMENDADO: estado clínico de aptidão separado de contratação, vigência e situação financeira. Aprovação clínica não regulariza inadimplência nem concede benefícios não contratados. A decisão é preservada mesmo quando acesso comercial estiver temporariamente bloqueado.
- RECOMENDADO: paciente vê linguagem clara sobre aprovação e próximos passos; tarefas/resumos usam as permissões dos módulos associados. Aptidão não é garantia de resultado.
- PENDENTE: quando o paciente adere/paga, data de início, aceite/consentimento, responsáveis, frequência, acompanhamento médico incluído, conclusão/pausa/reavaliação, encerramento e fluxo de segurança clínica.

## 32.4 - Não apto — encaminhamento 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar não apto — encaminhamento, respeitando as decisões pendentes do PRD.

**Requisitos**:

- Se não apto, encaminhar o paciente para outro plano mais simples de acompanhamento, sem liberar o protocolo recusado.
- RECOMENDADO: médico registra a orientação clínica/encaminhamento; equipe comercial organiza adesão ao plano indicado dentro das suas permissões. Não atribuir o motivo clínico aos vendedores nem deixar a IA selecionar tratamento por margem de venda.
- PENDENTE: quem escolhe o plano alternativo, opções elegíveis, se encaminhamento depende de avaliação adicional, comunicação ao paciente, cobrança da avaliação, valores já pagos e cancelamento/reembolso. Encaminhamento não significa contratação automática ou alteração de cobrança sem fluxo definido.

## 32.5 - Estados, plano ativo e evolução 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar estados, plano ativo e evolução, respeitando as decisões pendentes do PRD.

**Requisitos**:

- RECOMENDADO: acompanhar estados “aguardando agendamento”, “avaliação agendada”, “avaliação pendente”, “apto”, “não apto/encaminhado”, “acompanhamento liberado”, “em acompanhamento” e “concluído/pausado/cancelado”, distinguindo estado clínico e comercial. Lista final de estados ainda será aprovada.
- PENDENTE PRIORITÁRIO: protocolo é composição do único plano ativo, benefício dentro de um plano ou contratação complementar? Consolidar modelo sem violar a regra de um plano ativo por cliente e sem presumir segundo plano ativo. Encaminhamento ao plano simples e upgrade preservam histórico.
- RECOMENDADO: mudanças na composição são versionadas e não reescrevem jornadas/condições já contratadas. Mudanças clínicas individuais precisam do profissional competente; IA auxilia registros/organização dentro dos limites existentes.
- RECOMENDADO: ADM acompanha inscrição, agenda, etapas e pendências administrativas. Médico acompanha aptidão e conteúdo clínico. Super ADM acompanha operação/qualidade com permissões definidas, sem resolver implicitamente o acesso clínico pendente.

## 32.6 - Critérios de aceite propostos — protocolos 🟡

- **Status**: 🟡 Não implementado / pendente
- **Autores**: Sem implementação
- **Entregue**: Ainda não há implementação funcional deste requisito validada.
- **Próximo Passo**: Falta implementar e validar critérios de aceite propostos — protocolos, respeitando as decisões pendentes do PRD.

**Requisitos**:

- 1. ADM cria protocolo com composição e etapa inicial de avaliação agendada; itens indisponíveis à clínica não são concedidos por essa configuração.
- 2. Sem decisão médica de aptidão para o protocolo, cliente não acessa seu acompanhamento, inclusive por endereço/API direto. A consulta inicial permanece acessível por fluxo definido fora do acompanhamento bloqueado.
- 3. Somente médico autorizado registra aptidão; ADM, paciente, IA e equipe de vendas não conseguem liberar por alteração direta do estado.
- 4. Registro de decisão preserva identidade, protocolo/versão, data/hora e histórico. Reavaliação não apaga a anterior.
- 5. Decisão apto libera somente o protocolo/benefícios correspondentes, observadas as condições comerciais aprovadas.
- 6. Não apto não libera o protocolo original e cria o encaminhamento conforme regra aprovada, sem contratação ou cobrança automática presumida.
- 7. Jornada possui etapas, responsáveis e prazos; tarefas administrativas/clínicas respeitam seus perfis.
- 8. Paciente em um protocolo continua com no máximo um plano ativo conforme modelo final; encaminhamento, upgrade e alteração de composição não duplicam contrato/benefícios/cobranças.
- 9. Falta, documento incompleto e bloqueio financeiro não são gravados como inaptidão clínica por suposição.
- 10. Aplicativo e histórico preservam dados entre avaliação, acompanhamento e encaminhamento, sem acesso entre clínicas.

## 33 - Critérios de aceite propostos — inovações aprovadas 🔵

- **Status**: 🔵 Em implementação / parcial
- **Autores**: Antigravity
- **Entregue**: Critério 1 resolvido apenas no escopo do cálculo didático em frontend.
- **Próximo Passo**: Faltam fórmulas oficiais, custos homologados, persistência/exportação e uso produtivo. Demais critérios pendentes.

**Requisitos**:

- 1. Simulador mostra premissas e cenários; repetir cálculo com mesmas entradas/versão produz resultado consistente e custos/receitas não são contados duas vezes.
- 2. Central operacional mostra incidentes e atualização por clínica/integração sem expor conteúdo clínico indevidamente.
- 3. Implantação guiada copia configuração autorizada, nunca dados ou segredos de outra clínica, e registra progresso/verificações.
- 4. Laboratório de IA registra versões/resultados e aplica os critérios de liberação aprovados, com casos sintéticos cobrindo limites e isolamento.
- 5. Fila de próximos passos atribui pendências ao perfil certo e não revela informação clínica em tarefa comercial.
- 6. Resumo da consulta tem origem/documentos verificáveis e não altera automaticamente evolução médica definitiva.
- 7. Retenção apresenta sinais explicáveis de relacionamento sem uso clínico indevido para venda.
- 8. Meu dia respeita plano, jornada, permissões, estado de protocolo e bloqueio financeiro.
- 9. Preparação da consulta, linha do tempo e metas mantêm o paciente correto, dados incompletos explícitos e ausência de causalidade/prescrição indevida.
- 10. Central de privacidade mostra acessos/autorizações e permite solicitações/exportação conforme fluxo aprovado, sem liberar dados de terceiros.

## 34 - Prioridade recomendada e decisões pendentes 🔵

- **Status**: 🔵 Em implementação / parcial
- **Autores**: Antigravity, Codex, OpenCode, Lovable
- **Entregue**: PRD v0.11.3 e adendos preservados, com execução direta Codex e design existente mantido. Administração e marca QA têm homologações Cloud históricas; White Label mantém reservas pendentes e contratos locais, sem DNS/ativação. Jornada avançou localmente até preferências, suspensão auditada e autorrelatos idempotentes ligados ao host. Regressão da base anterior: 516 testes/62 arquivos; autorrelato posterior: 32 testes/7 arquivos e sequência SQL 008–012 aprovados. Esses resultados não concluem fluxos produtivos do PRD. Em 14/10, Codex recebeu autorização expressa para commit/push ao preview. Lote revisado: 567 testes em 71 arquivos e tipos/lint aprovados. Cloud 008–012 conferido; 013 e criação de rascunhos somente locais. Status atualizado em 22/10/2026 com entregas locais D119/D120, distinguindo validação unitária, integração e operação real. O proprietário autorizou commit e integração locais; D119/D120 integradas em develop, com 1.040 testes em 119 arquivos aprovados. Nenhum requisito produtivo foi concluído por esse registro; main/Cloud preservados.
- **Próximo Passo**: Continuar auditoria e contexto White Label e recursos independentes. Hospedagem/DNS/TLS, contas QA clínicas, keystore, protocolo H59MAX/balança, fornecedores e condições comerciais/clínicas abertas exigem definição antes dos respectivos fluxos produtivos.

**Requisitos**:

- As 13 inovações foram aprovadas para o escopo. Prioridade sugerida na resposta anterior, sem cronograma fechado: Meu dia; jornadas configuráveis/protocolos; resumo preparatório da consulta; central de funcionamento; simulador de rentabilidade. Demais funções permanecem incluídas, com sequência de implementação a definir.
- Novas prioridades de decisão: composição/validação dos protocolos, avaliação e registros, cobrança/adesão, alternativa para não apto, protocolo versus único plano ativo, critérios de aptidão/reavaliação e etapas do acompanhamento.
- Permanecem pendentes os detalhes de cada módulo e as decisões anteriores: balança/modelo/uso compartilhado/acesso clínico do Super ADM; dispositivos/estoque/telemetria; indicação/dependentes; inadimplência/cobrança por vidas; upgrade; integrações; vendas/comissões; 32 áreas; loja; IA/índices e segurança.
- PRD permanece em construção. Comandos Lovable/Antigravity só serão gerados quando o usuário declarar as especificações prontas.

# Entregas validadas

## D1 - Quatro áreas e navegação demonstrativa 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Lovable, Antigravity
- **Entregue**: Base Super ADM, clínica, médico e cliente criada e navegável.
- **Próximo Passo**: Módulos funcionais produtivos continuam nas pendências do PRD.

## D2 - Personalização visual no navegador 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Lovable, Antigravity
- **Entregue**: Nome, cores, tema, logomarca e favicon salvos por clínica; Super ADM preserva PlugPix.
- **Próximo Passo**: Domínio, identidade de instalação e persistência real ainda pendentes no item2.

## D3 - Design global azul marinho e superfícies foscas 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Lovable, Codex
- **Entregue**: Cartões, campos, navegação e gráficos com tokens semânticos e tema claro preservado.
- **Próximo Passo**: Manter o padrão nos próximos módulos.

## D4 - Catálogo demonstrativo de planos 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Antigravity, Codex
- **Entregue**: Salvar, recarregar, editar e excluir rascunhos locais de telemedicina/pulseira; validação e falhas cobertas.
- **Próximo Passo**: Ativação, venda e cobrança real permanecem nos itens13 e20.

## D5 - Painéis de saúde com números fictícios 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Cliente e médico usam a mesma fonte de medições, seis gráficos e tabelas, com QA móvel e desktop.
- **Próximo Passo**: Integração H59/H59MAX e balança real permanecem nos itens6,25 e27.

## D6 - Base PWA de rede sem cache de saúde 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Manifest, ícone SVG, service worker e mensagem de desconexão implementados e testados unitariamente.
- **Próximo Passo**: Homologar instalação em aparelhos e ícones por clínica; histórico clínico offline não implementado.

## D7 - Verificação local da entrega C006 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: 64 testes passaram; tipos e build válidos; lint sem erros e7avisos Fast Refresh.
- **Próximo Passo**: Build remoto Lovable ainda apresenta aviso, apesar de recebimento/renderização do commit.

## D8 - Relatório temporário Status do projeto 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: 101 títulos do PRD organizados com requisitos, situações, executores, busca e filtros na rota /staus.
- **Próximo Passo**: Atualizar em cada entrega; excluir página, botão e catálogo ao concluir o projeto.

## D9 - Simulador local de estimativas 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Antigravity
- **Entregue**: Escopo limitado, três cenários/barras e campos explícitos.
- **Próximo Passo**: Homologar visual, fórmulas/custos oficiais e persistência futura.

## D10 - Unidade de criptografia clínica server-only 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: OpenCode
- **Entregue**: Módulo AES-256-GCM server-only com WebCrypto nativa, envelope tipado v1, AAD (clínica/paciente/registro/tipo/kid) e KeyProvider injetado; 23 testes unitários em Node. Apenas escopo unitário.
- **Próximo Passo**: Keystore real, guardas, persistência, auditoria, backup e rotação de produção permanecem pendentes; PRD 3.2/4/7 seguem parciais.

## D11 - Adaptador Auth Server-only 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Antigravity
- **Entregue**: Implementado adaptador server-only request-bound src/lib/auth/supabase-adapter.server.ts e testes isolados. getUser(token) aplicado sem trust no client.
- **Próximo Passo**: Conectar autenticação real, E2E login, RLS e isolamento.

## D12 - Login Cloud com UI premium e validação no servidor 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Antigravity, Codex, Lovable
- **Entregue**: Antigravity criou a base inicial. Codex corrigiu diretamente: login e restauração confirmados por HTTP200/JSON ok no servidor; revalidação do token renovado, proteção contra respostas atrasadas, logout local com tratamento de falhas, configurações ausentes contidas, UI sem permissões clínicas e API sem cache. 22 testes de login; suíte completa 137/137. Escopo de código e testes com mocks. Lovable estendeu o cadastro sem perfil adicional com confirmação de e-mail, Google habilitado, indicação de sessão validada por getUser e limpeza de consultas no logout. Tela verificada no navegador; suíte 230/230, incluindo quatro novos testes. Nenhuma conta ou permissão criada automaticamente.
- **Próximo Passo**: Homologar confirmação por e-mail e OAuth com conta real; preservar vínculos e isolamento negados por padrão. Isso não conclui autenticação/isolamento clínico de produção.

## D13 - Fundação SQL e resolvedor — aplicação Cloud verificada 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex, Lovable
- **Entregue**: Codex concluiu e revisou o SQL (d70f8de), com suíte local 166/166. Lovable aplicou exatamente a revisão no Cloud existente e registrou migração/tipos gerenciados: cinco tabelas vazias com RLS, SELECT restrito, escrita de anon/authenticated negada, associação composta e RPC invoker com search_path vazio confirmados por consultas remotas. Sem contas ou vínculos criados.
- **Próximo Passo**: Homologar login/JWT/gateway/RLS ponta a ponta com conta e vínculos reais; não atestado nesta aplicação. Provisionamento futuro deverá verificar existência/status da conta pelo Auth. C014: administração e auditoria com escrita autorizada no servidor.

## D14 - Consulta administrativa persistida — código e testes 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex implementou API de leitura global exclusiva do operador persistido, cliente por requisição sujeito a RLS, resumo de acesso sem dados sensíveis e lista de clínicas reais no login. Banco vazio não gera registros demonstrativos. Homologação com operador real pendente.
- **Próximo Passo**: Paginação adicionada em C021. Homologar gateway/listagem e cadastro com operador real; administração completa e vínculos permanecem em desenvolvimento.

## D15 - Cadastro auditado — migração Cloud aplicada 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex, Lovable
- **Entregue**: Codex implementou SQL/API de criação e edição administrativas com ator verificado, auditoria atômica, revisão otimista e limites de payload. Testes locais aprovados; C015 aplicada no Cloud por Lovable; formulário C016 e consulta C017 implementados.
- **Próximo Passo**: Primeiro Super ADM ativo por autorização específica. Homologar criação, edição, conflito e auditoria com login real; OAuth, paginação e demais requisitos produtivos permanecem pendentes.

## D16 - Formulário administrativo — integração local 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex, Lovable
- **Entregue**: Codex integrou criar/editar clínica ao login verificado, campos foscos e controles sem duplicação, leitura de revisão por ID protegido, respostas tardias invalidadas e conflitos sem sobrescrita. Código e testes locais; não homologado com conta real.
- **Próximo Passo**: Primeiro Super ADM ativo por autorização específica. Homologar criação, edição, conflito e auditoria com login real; OAuth, paginação e demais requisitos produtivos permanecem pendentes.

## D17 - Consulta global de auditoria — integração local 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex, Lovable
- **Entregue**: Codex implementou API/painel da auditoria de cadastro exclusiva do Super ADM persistido. Consulta explícita com RLS, limite de 100 eventos, origem/ator/horário/campos alterados e sem textos ou valores clínicos. Testes locais; C015 aplicada no Cloud; E2E com conta real pendente.
- **Próximo Passo**: Paginação administrativa implementada em C020. Homologação com sessão real e auditoria dos demais recursos permanecem pendentes.

## D18 - Sincronização Cloud, cadastro e validação — escopo C018 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex, Lovable
- **Entregue**: Lovable aplicou C015 e regenerou tipos, adicionou cadastro e entrada por e-mail/Google. Codex incorporou commits, confirmou SQL equivalente e RLS remota, corrigiu formatação dos arquivos gerados e validou 230 testes, TypeScript, lint e build. Primeira conta Auth confirmada; Super ADM ativado após autorização específica do titular, sem permissões clínicas.
- **Próximo Passo**: Primeiro Super ADM ativo por autorização específica. Homologar criação, edição, conflito e auditoria com login real; OAuth, paginação e demais requisitos produtivos permanecem pendentes.

## D19 - Logo oficial no topo do Super ADM 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex adicionou a imagem oficial fornecida pelo titular ao cabeçalho do Super ADM, com proporção preservada, tamanho responsivo, descrição acessível e link para início. Personalização das clínicas permanece independente.
- **Próximo Passo**: Prosseguir homologação autenticada e demais requisitos do PRD.

## D20 - Paginação da auditoria administrativa — código e testes 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex implementou consulta de eventos anteriores por cursor de horário/ID, páginas limitadas a 100, validação do cursor após autorização e antes da leitura, acesso via cliente sujeito a RLS e limpeza da página em acesso negado. Suíte local 232/232, TypeScript, build e lint sem erros. Não homologado com sessão real.
- **Próximo Passo**: Homologar auditoria autenticada no Cloud com o titular e ampliar auditoria para os próximos recursos do PRD; sem acesso clínico automático.

## D21 - Consulta de toda a rede por páginas — código e testes 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex adicionou paginação do cadastro real de clínicas por horário/ID, consulta de páginas anteriores e retorno aos cadastros recentes. Servidor autoriza antes de validar cursor e consultar com RLS; lista é recarregada após gravação confirmada. 234 testes locais aprovados; homologação autenticada pendente.
- **Próximo Passo**: Validar navegação e gravações com sessão real do primeiro Super ADM; seguir vínculos e recursos administrativos do PRD.

## D22 - Revisão das dependências registradas — auditoria e testes 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex, Lovable
- **Entregue**: Codex unificou esbuild na versão corrigida 0.28.2 e atualizou somente dependências transitivas sinalizadas no lockfile: brace-expansion, js-yaml, nanoid, shell-quote e source-map-js. Instalação frozen do Bun e auditoria do lockfile sem alertas; 234 testes, TypeScript, build e lint sem erros. Não comprova segurança integral ou recuperação do preview remoto. R1: Codex incorporou por merge normal a regeneração Lovable 095f9d1 e limitou exceções de estilo aos dois arquivos gerados, mantendo verificações de correção e autorização.
- **Próximo Passo**: C023 recuperou runtime do preview, com build 7a6e6cc informado succeeded/in_sync e formulário de login confirmado no navegador. Homologar login e operações com sessão real; dependências não comprovam segurança integral.

## D23 - Recuperação e validação do preview — sem publicação 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex, Lovable
- **Entregue**: Codex reconectou Chrome, confirmou C022 R1 renderizada e diagnosticou falha de importação do cliente TanStack. Lovable reiniciou somente o runtime; informou build 7a6e6cc succeeded/in_sync, módulo HTTP 200 e hidratação após Refresh. Codex confirmou campos E-mail/Senha, Entrar habilitado e espera de sessão ausente. Sem alteração de banco, permissões ou publicação.
- **Próximo Passo**: Titular entrar no preview para homologar JWT/gateway, criação/edição de clínica QA e auditoria; continuar persistência e vínculos do PRD.

## D24 - Identidade visual por clínica — fundação SQL validada localmente 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex preparou tabela com RLS, gravação por RPC autorizada, revisão contra sobrescritas, validação de preferências e auditoria de campos. 243 testes, TypeScript, lint dos arquivos alterados e compilação aprovados. Nenhuma migração aplicada no Cloud nesta etapa.
- **Próximo Passo**: Aplicar migração revisada pelo fluxo gerenciado, regenerar tipos e integrar API/formulário com sessão real. Personalização atual continua salva no navegador.

## D25 - Homologação administrativa com sessão real no Cloud 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex verificou login real do primeiro Super ADM, criou uma clínica QA inativa, alterou seu nome e confirmou os dois eventos de auditoria com a conta autora correta no preview Lovable. Sem dados clínicos, contas ou concessões adicionais.
- **Próximo Passo**: Integrar persistência de identidade visual; testar isolamento com contas e vínculos próprios antes de declarar autorização clínica homologada.

## D26 - Personalização no Cloud — migração e API protegida 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex aplicou a migração 003 diretamente no SQL Editor e verificou RLS, bloqueio de acesso anônimo e ausência de escrita direta. Implementou API GET/PUT com sessão validada, limites, autorização por clínica, revisão e DTOs estritos. Sem prompts ao Lovable; formulário ainda não conectado.
- **Próximo Passo**: Conectar editor autenticado e homologar salvar/recarregar com a clínica QA. Regeneração gerenciada dos tipos ainda pendente; transporte PostgREST usa DTOs estritos sem alterar arquivos gerados.

## D27 - Incorporação documental do adendo v0.11.1 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex incorporou o adendo v0.11.1 ao PRD com catálogo comercial, públicos, Dr. IA proativo, score e diretrizes White Label preservando seções anteriores e IDs.
- **Próximo Passo**: Implementação dos requisitos operacionais aprovados no adendo conforme autorização.

## D28 - Novo visual resumido do aplicativo do paciente 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Antigravity
- **Entregue**: Antigravity implementou tela inicial resumida (PatientHome) com topo limpo, saudação grande (28–32px), avisos compactos, card de protocolo, plano e score lado a lado, humor e sono interativos independentes com 5 emojis, água com ação única '+ Água', grade de 12 atalhos rigorosamente quadrados (1:1) em três colunas mobile com textura e vidro fosco translúcido, seção expansível 'Mais recursos' e rodapé fixo de 6 destinos (Início, Telemedicina, Água, IA, Alimentação, Perfil) com suporte a tema claro e escuro e bloqueio por inadimplência. 273 testes aprovados.
- **Próximo Passo**: Integrar telemetria real dos dispositivos (pulseira/balança), serviços de telemedicina e sincronização em nuvem quando as APIs de produção forem liberadas.

## D29 - Seleção e envio de texturas por clínica no app do paciente 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Antigravity
- **Entregue**: Antigravity implementou seleção e envio de texturas de fundo para o app do paciente na personalização do ADM da clínica. Inclui catálogo padrão com 5 opções (4 texturas reais fornecidas: Luzes Bokeh, Brilho Esmeralda, Azul Meia-Noite, Vidro Água, e 5ª opção registrada como pendente de anexo sem dados fictícios), destaque de textura salva vs selecionada em edição, seção 'Minhas texturas' com upload de até 5MB (JPG/PNG/WebP, validando magic bytes, rejeitando SVG/executáveis), botões 'Salvar alterações' e 'Cancelar', simulação de smartphone com cards e vidro fosco no painel ADM, migração incremental 004_clinic_texture_branding.sql com suporte a textureId, textureUrl e customTextures no banco e isolamento rigoroso por clínica. 282 testes aprovados.
- **Próximo Passo**: Auditoria C030 (Codex): armazenamento atual é local ao navegador. Migração 004 não foi homologada remotamente; validação SQL de texturas precisa ser reforçada e eventos de auditoria precisam aceitar os novos campos antes da implantação. Concluir persistência real e teste entre dispositivos.

## D30 - Auditoria de retomada, menu fixo e progresso visual 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex corrigiu regra CSS da textura que sobrescrevia a posição fixa do menu, corrigiu papel inexistente em teste herdado e adicionou barras de conclusão integral e cobertura iniciada calculadas sem duplicar seções pais. Revisou limites reais da personalização e manteve autoria das entregas Antigravity.
- **Próximo Passo**: Reforçar validação das texturas no servidor, contrato de auditoria e persistência Cloud; avançar White Label e demais dependências aprovadas do PRD.

## D31 - Auditoria de texturas compatível e homologação do preview 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex acrescentou os campos de textura ao contrato e às descrições da auditoria, limitou nove campos e recusou duplicação. Quinze testes de auditoria aprovados. Preview Lovable confirmou barras de progresso C030 e menu fixed com base alinhada ao viewport; capturas registradas, sem Ask Lovable.
- **Próximo Passo**: Reforçar SQL de validação das texturas, verificar implantação real e integrar persistência Cloud; não declarar upload remoto concluído.

## D32 - Validação SQL de texturas, Persistência Cloud de Branding e Gate WL-1 White Label 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Antigravity
- **Entregue**: Antigravity reforçou a validação SQL em 004_clinic_texture_branding.sql (rejeição de SVG, checagem estrita de magic bytes PNG/JPEG/WebP até 5MB, validação de schema e chaves estritas de customTextures). Conectou o formulário PersonalizationPage à API /api/platform/branding com sessão Supabase, detecção de conflitos de concorrência (HTTP 409), botão de recarga da nuvem, persistência isolada por tenant UUID e fallback local para modo demonstrativo. Implementou o Gate WL-1 do plano incremental White Label (host-resolver.ts) com normalização estrita RFC 1123, confiança de proxy anti-spoofing, subdomínios reservados e matriz de rotas seguras por ambiente (Central, Gestão Clínica, Médico e PWA Paciente). 318 testes aprovados em 33 arquivos (100% de sucesso), tsc, eslint e build de produção exit 0.
- **Próximo Passo**: C033 corrigiu tipos obrigatórios ausentes no SQL, restringiu caminhos de textura e separou dados Cloud da demo. WL-1 permanece contrato local; integração SSR, tabela de domínios, sessão por origem e DNS ainda pendentes.

## D33 - Validação Cloud de texturas e separação da demonstração 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex revisou C032, preservou design e migrações anteriores, incorporou migração 005 e aplicou pelo SQL Editor. Cloud recusou objeto vazio e caminho arbitrário, manteve RPC anônima e escrita direta bloqueadas. Formulário valida retorno/ID, não grava marca real na demo e não cai em salvamento local quando a rede falha. 319 testes, tipos, lint da alteração e build aprovados.
- **Próximo Passo**: Homologar salvar/recarregar com sessão real e múltiplas clínicas; integrar contexto White Label e identidade produtiva. Assinatura binária não comprova decodificação integral nem bucket de arquivos.

## D34 - Homologação real: salvar e recarregar marca no Cloud 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex abriu a personalização da clínica QA inativa com sessão existente no preview Lovable, salvou nome visual e recebeu confirmação Cloud. Após Refresh, o formulário recuperou o mesmo nome. Evidência de ponta a ponta desse fluxo, sem modificar o design, conceder acesso ou publicar.
- **Próximo Passo**: Homologar múltiplas clínicas, conflito de revisão e uploads personalizados reais; integrar identidade no contexto White Label. Não comprova distribuição da marca aos portais dos pacientes.

## D35 - White Label: rejeição de hosts ambíguos e colisões 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex endureceu o contrato local WL-1: portas somente em dígitos, FQDN com porta normalizado, cabeçalhos duplicados/listas de proxy recusados e registro de domínio existente não sobrescreve clínica. Catálogo inicial duplicado falha explicitamente. Dezesseis testes passaram; tipos e lint aprovados. Layout, DNS e servidor produtivo preservados.
- **Próximo Passo**: Construir catálogo persistido de domínios com unicidade e estados, depois integrar contexto confiável ao SSR/APIs. Contrato local não comprova isolamento multi-host de produção.

## D36 - White Label: fundação local de reserva de domínios 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex preparou migração aditiva 006 com hostname único, vínculo ao UUID da clínica, finalidade gestão/PWA, reserva pendente, RLS e auditoria. RPC exclusiva de operador ativo recusa colisões e não ativa hosts. Sete testes PostgreSQL aprovados. Sem alterações de design, DNS ou Cloud nesta etapa.
- **Próximo Passo**: Criar contratos/API/UI de reserva, revisar posse e TLS antes de ativação; aplicar migração somente no fluxo validado e integrar contexto SSR. Domínios centrais e configuração de produção ainda pendentes.

## D37 - Reservas de domínio: contratos e fronteira HTTP local 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex preparou DTOs estritos e handlers GET/POST injetáveis de reservas, com autorização de Super ADM antes da leitura, hostname canônico, limite real de corpo, resposta sem cache e validação de clínica/destino retornados. Dez testes aprovados; não há endpoint operacional integrado nesta entrega.
- **Próximo Passo**: Conectar transporte autenticado ao backend e rota, depois UI. Migração 006, DNS, prova de posse e ativação ainda pendentes.

## D38 - Reservas: rota e transporte autenticado integrados no código 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex ligou GET/POST /api/platform/domains ao transporte da sessão verificada, com chave pública, RLS/RPC, limite por consulta e indicação hasMore. Reutilização do transporte validada em 22 testes; tipos, lint e build aprovados. Código integrado; migração 006 ainda não aplicada no Cloud.
- **Próximo Passo**: Aplicar e conferir 006 no Cloud, criar UI administrativa e homologar reserva. Paginação de resultados anteriores e ativação/posse/TLS ainda pendentes; não há domínio ativo.

## D39 - Painel autenticado de reservas de domínios 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex integrou painel de reservas à administração com sessão verificada. Seleção de clínica/finalidade, lista de reservas pendentes, formulário e recarga, com bloqueio de envio sem consulta válida e recusa de retorno de outra clínica. Não transforma hostname em link ativo. 34 testes de painel/login e tipos/lint/build aprovados; CSS e assets preservados.
- **Próximo Passo**: Aplicar migração 006, conferir RLS/RPC e homologar reserva no Cloud. Ativação, prova de posse, TLS, paginação completa e integração SSR continuam pendentes.

## D40 - Reservas White Label no Cloud: persistência e RLS verificadas 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex aplicou a migração 006 revisada no SQL Editor. RLS nas duas tabelas, inserção direta bloqueada e RPC anônima bloqueada. Conta Super ADM reservou hostname fictício da clínica QA; Refresh recuperou a reserva, com uma entrada de auditoria. Regressão completa: 346 testes aprovados. Design preservado.
- **Próximo Passo**: Corrigir demora na resposta de duplicidade observada no preview e homologar erro. Prova de posse, TLS, ativação, paginação completa e integração SSR continuam pendentes.

## D41 - Reservas: limite de espera e recarga após resultado incerto 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex limitou a espera de consulta e reserva a 20 segundos. Falha ou resultado de gravação incerto não anuncia sucesso e bloqueia reenvio até recarga. Teste simula ausência de resposta e confirma liberação da interface, recarga disponível e gravação bloqueada. Controles e design preservados.
- **Próximo Passo**: Homologar no preview o comportamento da correção e investigar resposta de colisão. Posse, TLS, ativação, paginação e contexto SSR permanecem pendentes.

## D42 - White Label: contrato de rotas com negação por padrão 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex corrigiu o resolvedor local para negar caminhos desconhecidos, APIs não declaradas, prefixos semelhantes, codificação e caminhos ambíguos. Área exige segmento exato; status temporário permitido somente em central/demo. Dezoito testes de host/rotas aprovados. Sem ativação de hosts ou mudança no design.
- **Próximo Passo**: Integrar contrato ao servidor após contexto de host/registro confiável; assets e APIs exigem políticas explícitas próprias. Não representa isolamento multi-host em produção já homologado.

## D43 - Reservas: paginação por cursor e recuperação homologada 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex implementou páginas de até cem reservas com cursor de hostname validado, filtro obrigatório da clínica e controles Próxima/Primeira página. Reserva confirmada recarrega a primeira página, preservando ordem do servidor. 24 testes de painel/handlers/transporte aprovados; tipos e build aprovados. Preview comprovou timeout C041 e recuperação por recarga.
- **Próximo Passo**: Homologar paginação remota com massa QA apropriada e investigar demora do erro de duplicidade. Prova de posse, TLS, ativação e contexto SSR continuam pendentes; nenhum domínio foi ativado.

## D44 - Reservas: colisão como violação de unicidade 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex criou e aplicou migração aditiva 007, alterando somente o código SQL de colisão para 23505. Transporte mapeia esse código para HTTP 409 sem expor detalhes internos. Dezesseis testes SQL/transporte, tipos e build aprovados. Cloud confirmou novo código, uma reserva/uma auditoria e manutenção dos bloqueios de escrita direta e RPC anônima.
- **Próximo Passo**: Após sincronização, homologar mensagem específica de duplicidade no preview. A causa da demora anterior não foi comprovada. Posse, TLS, ativação e contexto SSR continuam pendentes.

## D45 - White Label: fronteira entre domínio, clínica e identidade 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex preparou contrato server-only que exige domínio ativo e sessão verificada, cruza clínica/papel com vínculo ativo e remove vínculos de outras clínicas e privilégio global em origem tenant. Central exige Super ADM sem importar vínculos clínicos. 43 testes de host/autorização aprovados. Preview confirmou mensagem específica de duplicidade da C044. Regressão completa aprovada: 38 arquivos e 363 testes.
- **Próximo Passo**: Acoplar ao SSR/APIs somente com registro e ingresso de host confiáveis; contrato ainda não está integrado ao runtime. Posse, TLS e ativação de domínios continuam pendentes. Não há isolamento multi-host produtivo homologado.

## D46 - White Label: sugestão de hosts no domínio informado 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex documentou o domínio techmedicina.com.br e o provedor Registro.br informados pelo proprietário e implementou sugestão opcional de hostname para gestão/médico e PWA. Identificador canônico recusa nomes reservados; botão somente preenche e mantém domínio próprio livre, sem envio automático. Oito testes aprovados, tipos/build registrados. Design preservado pelos controles existentes.
- **Próximo Passo**: Convenção é proposta, sem DNS/TLS/ativação. Validar hospedagem e ingresso; inspeção Domains bloqueada por falha de controle. Sugestão e paginação ainda exigem homologação visual da versão sincronizada.

## D47 - Relatório de status: síntese atual e conferência local 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex atualizou os resumos atuais de arquitetura, identificação, segurança e prioridades para refletir as homologações já feitas e os limites que permanecem. Clarificou que o domínio foi informado/documentado, sem registro ou alteração externa pelo agente. Página local exibiu 46 entregas antes desta revisão, 101 itens e barras de progresso sem contabilizar etapas parciais como conclusão integral.
- **Próximo Passo**: Continuar atualização por entrega e remover o relatório temporário somente ao concluir o PRD. Homologação visual da sugestão de hosts permanece pendente.

## D48 - Auditoria protegida de reservas de domínio 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex implementou GET /api/platform/domain-audit e painel por reserva, com Super ADM verificado, filtros de clínica/ID, DTOs estritos, consulta sem cache, autor/horário e paginação por cursor. Respostas de outra clínica/reserva são recusadas. Vinte testes, tipos e build aprovados. Sem migração ou novas permissões. Configurações Domains do Lovable inspecionadas em leitura.
- **Próximo Passo**: Homologar auditoria com sessão real no preview. Configuração de domínio principal/redirecionamentos precisa ser revisada antes de conectar hosts; DNS, TLS, posse e integração SSR continuam pendentes.

## D49 - Adendo v0.11.3: incorporação documental e plano 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex incorporou seções 10 histórica e 11 vigente ao PRD, preservando todos os requisitos anteriores e 101 identificadores. Fonte e PRD anterior preservados; inventário, dependências, riscos, testes e rollback documentados. Sem alteração funcional nessa revisão.
- **Próximo Passo**: Documento preservado; continuidade posterior avançou localmente por D50–D56. Metodologia, parâmetros e aplicação remota mantêm gates próprios.

## D50 - VJE-1 local: contratos, permissões e isolamento 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex implementou contratos locais e montagem de autorrelato com IDs/autor/versões da fonte confiável. Novos recursos de autorização exigem grants e vínculo ativo; paciente atua apenas no próprio contexto, médico verificado nas metas, ADM sem acesso clínico. Parser Cloud permanece sem grants novos. Testes locais registrados. Regressão completa: 397 testes em 43 arquivos aprovados; tipos, lint e compilação local aprovados.
- **Próximo Passo**: VJE-1 mantém o escopo validado nesta entrega; persistência e integrações locais posteriores estão em D51–D56. Cloud, DNS, commit/push/deploy não liberados; prescrição/consentimento e cálculos continuam pendentes.

## D51 - VJE-2: fundação local da persistência de participação 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex preparou migração 008 local com metas/preferências/ledger, vínculo composto, RLS, RPC restrita ao próprio paciente com grant e preferência habilitada, snapshots de versão e reenvio idempotente. Medicação/protocolo sem fluxo validado bloqueados. 38 testes direcionados aprovados, incluindo dois tenants. Nada aplicado no Cloud. Continuidade: contrato estrito de resposta com horários UTC e bloqueios clínicos alinhados entre SQL e montagem local. Tipos e lint direcionado aprovados; 30 testes adicionais de contratos, mapper e status aprovados. Regressão posterior da base concluída: 416 testes em 45 arquivos passaram; resultados mais recentes estão em D53.
- **Próximo Passo**: D56 reforçou localmente a RPC com clínica explícita na transação e integrou autorrelato em testes. Faltam metas configuradas/revisadas, consentimentos/prescrições, concorrência e homologação reais. Sem pontos/Escudos/VITALIDADE e sem implantação remota.

## D52 - Jornada: preferência de participação auditada local 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex implementou migração 009 local: paciente próprio habilita/pausa com revisão esperada, registro de ator e horário, bloqueio de sobrescrita e auditoria append-only. Revogar envio não impede desligar participação. Nove testes SQL passaram em banco isolado, incluindo isolamento e histórico preservado. Sem aplicação no Cloud. Mais 31 testes de contratos/mapper/status e lint passaram; TypeScript aprovado. Camada servidor local preparada: contexto de host/paciente verificado, argumentos mínimos e resposta estrita. Dez testes adicionais, tipos e lint aprovados. Leitura inicial desligada sem gravar e handlers HTTP locais GET/PUT preparados, com query/JSON/links ambíguos recusados, no-store e conflito 409. 31 testes SQL/repositório/HTTP, tipos e lint aprovados. Regressão anterior terminou: 416 testes/45 arquivos; adições HTTP verificadas separadamente.
- **Próximo Passo**: Cartão e HTTP locais avançaram em D53; homologação produtiva e concorrência real continuam pendentes. Preferência não equivale a consentimento clínico ou pausa médica. Sem commit/push/deploy.

## D53 - Jornada: cartão e integração HTTP local 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex ligou o cartão fosco de participação ao transporte HTTP autenticado, com estado confirmado, recarga, conflito de revisão, sessão perdida e proteção contra respostas de outro paciente. Fluxo cliente/handler/RPC/SQL isolado testado; onze testes de integração e dois do cartão conectado passaram. Mantido o design atual. Tipos, lint da Jornada sem avisos e compilação local aprovados. Cartão ligado ao contrato HTTP em testes; rota/runtime real não ativados. Regressão final: 451 testes em 51 arquivos aprovados; status conferido no navegador local em 13/10/2026. Recuperação de rede: prazo de 20 segundos, cancelamento e recarga obrigatória após gravação incerta. Resposta perdida após commit testada, sem envio duplicado ou falso sucesso; 17 testes direcionados passaram.
- **Próximo Passo**: Ativar no PWA real somente após contexto de host confiável, revisão/aplicação das migrações e conta/vínculo QA. Sem Cloud, DNS, commit/push/deploy ou cálculo de pontos/VITALIDADE.

## D54 - Jornada: suspensão auditada de metas — integração local 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex preparou SQL 010, servidor/HTTP, transporte e cartão médico conectado localmente. Médico verificado com grants da clínica suspende meta existente com versão e auditoria; outros papéis/tenants recusados. UI exige confirmação e recarga após conflito ou resultado incerto, sem anunciar estado não validado. Histórico preservado. SQL testado separadamente; 40 testes locais de UI/cliente/handler/repositório e prazo compartilhado passaram, com tipos, lint e build aprovados. Consulta/recarga locais completadas: SQL 011 médico com clínica explícita, projeção mínima no servidor, GET/cliente autenticados e recarga padrão do cartão. Conflito→GET atual→nova confirmação testado; 23 testes direcionados, tipos/lint/build aprovados. Revisão local de consulta: cartão oculta suspensão por padrão e exige canPause explícito da composição autorizada; revogação fecha confirmação sem enviar. 14 testes direcionados aprovados.
- **Próximo Passo**: Conectar runtime servidor ao registro confiável de hosts e à mesma sessão; revisão/aplicação remota das migrações e QA real dependem de autorização. Cartão não montado na demo; endpoints não ativados. Faltam criação/revisão de metas, consentimento/prescrição e pausa clínica protegida completa. Sem Cloud, DNS, commit/push/deploy ou novos cálculos.

## D55 - White Label/Jornada: vínculo local entre host, sessão e clínica 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex compôs contratos existentes para exigir hostname/URL coerentes, registro canônico ativo e sessão verificada da mesma requisição. Contexto conserva somente a clínica do domínio, sem cargo global como atalho; médico verificado no portal e paciente no PWA. Host demo/pendente/suspenso ou spoofing negados. Seleção de clínica do navegador ignorada. 49 testes direcionados, tipos e lint aprovados; fontes simuladas, sem ativação real. Composição local dos handlers de participação, leitura e suspensão exige o resolvedor do ambiente correto antes de criar transporte com a mesma sessão verificada. 12 testes de composição/host passaram. Participação recusa método trocado antes de Auth/banco; 13 testes HTTP/fluxo passaram. Adaptador RPC local preparado para preferências e metas, com clínica explícita na leitura, resposta/associação estritas e classificação segura dos erros SQL; seis testes de adaptador/composição passaram. Compilação de produção local aprovada após composição e adaptador RPC (log vje2_build_atual.txt). Regressão completa posterior concluída: 516 testes/62 arquivos aprovados; não inclui migração 012 e servidor de autorrelato adicionados depois.
- **Próximo Passo**: Conectar fonte persistida confiável de hosts ativos e transporte/session reais após gates de posse/TLS/proxy/hospedagem. Reservas atuais são somente pendentes; nenhum host ou endpoint foi ativado. Cloud, DNS, commit/push/deploy preservados.

## D56 - Jornada: autorrelato vinculado à clínica na transação local 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex preparou migração aditiva 012: RPC exige clínica do host, trava e verifica a meta antes de delegar às regras existentes. Chamada antiga sem clínica revogada para clientes. Teste PostgreSQL com mesma conta em dois tenants recusou gravação cross-host, manteve zero eventos no erro e um evento após reenvio idempotente correto. Somente banco isolado. Servidor local deriva clínica/paciente/autor do contexto, valida input mínimo e recibo da RPC e não expõe versões/ator internos. Adaptador oferece somente a RPC vinculada à clínica. Nove testes posteriores de servidor/SQL passaram. Fronteira POST local e composição patient_pwa preparadas: método/query/JSON/limite de 4KB/sessão validados, recibo mínimo sem cache e conflito sem confirmação falsa. Sete testes HTTP/composição passaram. Rotas públicas não montadas. Cliente local PWA com token renovado por chamada, prazo compartilhado de 20 segundos, POST relativo sem cache/cookies/redirect e recibo estrito. Reenvio conserva sourceEventId/horário originais. Treze testes de cliente/HTTP aprovados. Cartão local preserva Card/Button existentes: confirmação por recibo validado, reenvio do mesmo evento após falha e conflito bloqueado. Ação indisponível por padrão; autorização continua no servidor. Dez testes cartão/cliente aprovados. Fluxo cliente→host/sessão→HTTP→adaptador→SQL 012 testado em PostgreSQL isolado: perda da resposta após commit seguida de reenvio mantém exatamente um evento. Auth/registro simulados, sem backend remoto. Cartão conectado ao cliente preparado localmente. Revisão de segurança concluída em 32 testes/7 arquivos: pausa da participação e suspensão da meta negam replay pela RPC nova sem apagar histórico; resposta atrasada após troca de paciente não confirma a nova tela. Cobertura local com mocks Auth e PostgreSQL isolado. Sequência completa 008–012 validada em PostgreSQL isolado; lote revisado com hashes, preflight, riscos, validação e recuperação documental.
- **Próximo Passo**: Lote aplicado e conferido em D60. Homologação clínica requer contas/vínculos/grants QA autorizados e hosts confiáveis; endpoints permanecem desmontados. Metas, consentimentos e parâmetros operacionais pendentes. Sem DNS/commit/push/deploy.

## D57 - Paciente: limites explícitos do score demonstrativo 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex preservou o design e o valor fictício do card existente, acrescentando identificação demonstrativa e explicação no modal. Retirou alegações de adesão real/prescrição e bônus por aferição/sincronização. VITALIDADE numérica indisponível e JORNADA real não calculada; dez testes da tela aprovados. Conferência no navegador local confirmou rótulo, abertura/fechamento do modal, aviso e preservação visual; captura score_demo_local.png registrada.
- **Próximo Passo**: Homologar responsividade em aparelhos e integrar metas/pontuação aprovadas somente após gates clínicos e operacionais. Sem índice real ou ativação remota nesta entrega.

## D58 - Paciente: teclado nos cartões interativos 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex adicionou ativação por Enter/Espaço aos seis cartões interativos, sem alterar layout. Teclas de controles internos e repetição não disparam ação do cartão pai; Espaço não rola a página durante ativação. Treze testes do PatientHome aprovados, incluindo score por teclado e botão de água sem navegação indevida. Navegador local confirmou Espaço abrindo score e Enter no botão de água abrindo somente modal, sem sair de /app. Rodapé medido fixed, base 884px igual ao viewport 884px; captura local preservada.
- **Próximo Passo**: Homologar múltiplas larguras, aparelhos e demais controles. Medição atual somente no viewport local; fluxos produtivos e backend não ativados. Sem Cloud/DNS/GitHub.

## D59 - PWA: modais limitados ao viewport compacto 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex corrigiu modais do paciente que ultrapassavam tela 320×568: largura/altura limitadas, margens e rolagem interna. Navegador mediu topo 16px, base 552px, largura 288px e overflow auto após correção. Visual preservado; viewport restaurado.
- **Próximo Passo**: Homologar demais modais, teclado virtual e aparelhos reais. Lote SQL 008–012 agora autorizado pelo proprietário para preflight/aplicação Cloud; não inclui contas/grants/DNS/endpoints/GitHub.

## D60 - Jornada: lote 008–012 aplicado e conferido no Cloud 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Após autorização específica do proprietário, Codex aplicou os cinco arquivos pelo SQL Editor, sem Ask Lovable. Catálogo remoto confirmou cinco tabelas vazias com RLS, escrita direta authenticated e SELECT anon bloqueados; sete funções com corpos equivalentes à fonte, search_path vazio e sem execução anon. RPC antiga sem clínica revogada para clientes. Pacientes/vínculos/grants continuam vazios.
- **Próximo Passo**: Contas QA ainda não comprovadas no Auth; domínio do paciente mantido conforme confirmação do proprietário. Vínculos/grants exigem IDs e autorização específicos. Commit/push do código validado agora autorizado; sem ativação de hosts/endpoints ou aplicação de 013.

## D61 - Jornada: fundação local de rascunhos médicos 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex preparou SQL 013 local para propostas append-only separadas das metas vigentes, com clínica/paciente/autor/horário, RPC de médico verificado com read/create e reenvio idempotente. Paciente/ADM global negados; rascunho não ativa elegibilidade nem prescrição. Três testes PostgreSQL aprovados. Contrato, serviço e fronteira HTTP locais exigem médico/grants, corpo limitado, entrada estrita e recibo do mesmo tenant/paciente/autor/request. Doze testes servidor/SQL e quinze servidor/HTTP passaram em execuções separadas; tipos/lint do serviço aprovados. Revisão final separa create de write e recusa write como substituto de criação. Vinte testes de rascunhos e regressão completa 567 testes/71 arquivos aprovados; tipos/lint aprovados.
- **Próximo Passo**: Conectar transporte/formulário e revisão profissional. Commit/push do lote validado agora autorizados; SQL 013 permanece local. Cadastro QA pendente, mantendo paciente no domínio confirmado pelo proprietário; sem concessões ou ativação clínica presumidas.

## D62 - Jornada/PWA: revisão final do lote para sincronização 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex revisou o lote de Jornada, PRD/status e PWA preservando design/autorias. Regressão final 567 testes/71 arquivos e tipos/lint aprovados; sete avisos históricos de Fast Refresh. Staging explícito, sem incluir alterações alheias. Permissão create separada de write nos rascunhos.
- **Próximo Passo**: Commit 6e5d9b1 enviado para main e recebido pelo Lovable. Preview /staus conferido com PRD v0.11.3, data 14/10/2026 e 62 entregas. Prosseguir com transporte/formulário de rascunhos e homologação clínica; Cloud 013 e vínculos clínicos ainda pendentes. Sem publicação de produção.

## D63 - Jornada: transporte local de rascunhos médicos 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex implementou cliente HTTP local com sessão fresca, prazo limitado, recibo estrito por clínica/paciente/solicitação, rejeição de estado ativo e reenvio idempotente da mesma entrada após resposta perdida. Dez testes direcionados aprovados.
- **Próximo Passo**: Implementar formulário e composição médica autorizada. Endpoint não montado e SQL 013 somente local; não há ativação de metas nem prescrição.

## D64 - Jornada: formulário médico local de rascunhos 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex implementou formulário com áreas não prescritivas e frequência sugerida, transporte autenticado e confirmação apenas por recibo validado. Bloqueia duplo envio, mantém proposta e identificador após incerteza, rejeita paciente divergente e ignora resposta após troca de contexto. Cinco testes de interação aprovados.
- **Próximo Passo**: Compor endpoint médico e homologar com contas/vínculos autorizados. SQL 013 permanece local; formulário não montado em rota produtiva e não ativa metas ou prescrição.

## D65 - Jornada: composição médica de rascunhos 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex conectou a fronteira HTTP ao resolvedor de host/sessão médica e ao adaptador RPC da mesma sessão. Clínica derivada no servidor, host PWA recusado antes da sessão, corpo sem tenant enviado pelo navegador e grants read/create exigidos. Dez testes de composição e adaptador aprovados.
- **Próximo Passo**: Homologar SQL 013 e fluxo médico em ambiente autorizado; composição segue não montada. Validar contas QA e vínculos específicos antes de acesso clínico.

## D66 - Jornada: integração PostgreSQL e revisão 013 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex validou cliente, host, sessão, HTTP, adaptador RPC e PostgreSQL local: resposta perdida após commit seguida de reenvio mantém um único rascunho; revogação de create impede replay e preserva histórico. Cinco testes SQL/integração aprovados. Revisão 013 documenta dependências, RLS, privilégios e preflight.
- **Próximo Passo**: Aguardar autorização específica de 013 no Cloud; continuar homologação local. Auth e registro de domínio simulados não comprovam fluxo remoto; nenhuma conta/vínculo concedido.

## D67 - Jornada: novas propostas após confirmação 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex completou o ciclo local do formulário: iniciar outra proposta somente após recibo confirmado, gerar novo identificador e manter reenvio da solicitação original em caso de incerteza. Sete testes de interação aprovados. Regressão completa final: 589 testes em 74 arquivos; tipos e lint aprovados.
- **Próximo Passo**: Homologação Cloud e interface médica operacional continuam pendentes. Autorização específica 013 solicitada; migração não aplicada.

## D68 - Jornada: migração 013 aplicada no Lovable Cloud 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex aplicou SQL 013 após autorização específica e preflight: objetos ausentes, cinco tabelas dependentes, Auth/guard e chave paciente prontos. Pós-verificação confirmou tabela vazia, RLS, política SELECT, escrita direta negada, anon sem leitura/execução, RPC SECURITY DEFINER com search_path vazio e corpo igual à fonte revisada. Vínculos/pacientes/grants permanecem zero.
- **Próximo Passo**: Homologar contas QA e obter aprovação de vínculos específicos antes de ativar fluxo clínico. Endpoints e formulário ainda não montados; não houve DNS ou Publish. Esta entrega substitui a pendência de aplicação 013 nos registros anteriores.

## D69 - Jornada: motor determinístico de pontuação (VJE-3) 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Antigravity
- **Entregue**: Antigravity implementou o motor determinístico da JORNADA (PRD v0.11.3 §11.4): normalização diária de 0 a 100 pontos baseada em metas elegíveis; suporte a clientes sem dispositivos alcançando 100 pontos; ausência de bônus automático por posse/sincronização de equipamentos; metas pausadas por médico ou sem prescrição retiradas do denominador; tratamento estrito de dia não avaliável (score null); de-duplicação idempotente por sourceEventId e anti-duplicação de eventos manual+dispositivo; isolamento multiempresa e multi-paciente. 15 novos testes unitários e de integração aprovados (605 testes no total).
- **Próximo Passo**: Implementar o motor de Escudos e regressão controlada de 7 dias (VJE-5), biblioteca central de artes de Escudos (VJE-4) e tela PWA Meus Escudos (VJE-6). Metodologia e fórmula de VITALIDADE permanecem pendentes de validação regulatória/clínica.

## D70 - Jornada: motor determinístico de Escudos e regressão controlada (VJE-5) 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Antigravity
- **Entregue**: Antigravity implementou o motor determinístico de Escudos e regressão controlada (PRD v0.11.3 §11.5, VJE-5): classificação dos 5 Escudos (Origem 0–29, Ritmo 30–54, Avanço 55–74, Equilíbrio 75–89, Plenitude 90–100); média móvel dos últimos 7 dias avaliáveis sem preencher dias ausentes com zero e excluindo dias não avaliáveis (not_evaluable/pausas); tratamento de histórico insuficiente com estado provisório; promoção imediata ao alcançar média requerida; regra de tolerância que exige 3 avaliações consecutivas desfavoráveis antes da regressão (1 ou 2 dias ruins preservam o escudo ativo); histórico permanente inviolável (highestShieldEarned nunca regride); de-duplicação idempotente de eventos de conquista; isolamento estrito multiempresa e multi-paciente. 16 novos testes unitários e de integração aprovados (621 testes no total do projeto).
- **Próximo Passo**: Implementar a biblioteca central de artes de Escudos no Super ADM (VJE-4) e a tela PWA Meus Escudos (VJE-6). Metodologia e fórmula de VITALIDADE permanecem pendentes de validação regulatória/clínica.

## D71 - Jornada: persistência local, integridade histórica e migração 014 de Escudos (VJE-5) 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Antigravity
- **Entregue**: Antigravity implementou a camada de persistência local, integridade histórica e migração 014 de Escudos (PRD v0.11.3 §11.5, VJE-5): migração local 014_journey_shields.sql com tabela de estado por cliente/clínica (tm_patient_shield_states), ledger permanente imutável de histórico de conquistas (tm_shield_history_events), políticas RLS isolando dados entre clínicas e clientes, RPC atômica tm_save_patient_shield_transition e consulta consolidada tm_get_patient_shield_overview. Correções no motor: identificadores determinísticos RFC 4122 v5 baseados em chave de idempotência e proteção para que o estado Origem provisório sem registros não polua o histórico permanente. Camada de serviço ShieldService e repositório com controle de concorrência e idempotência. 14 novos testes dedicados aprovados com PGlite e RLS (total de 635 testes aprovados no projeto). Migração 014 validada localmente; aplicação remota no Cloud permanece pendente.
- **Próximo Passo**: Aguardar autorização da coordenação para aplicação da migração 014 no Lovable Cloud. Implementar a biblioteca central de artes de Escudos no Super ADM (VJE-4) e a tela PWA Meus Escudos (VJE-6). Metodologia e fórmula de VITALIDADE permanecem pendentes de validação regulatória/clínica.

## D72 - Jornada: consolidação, segurança contra fraude e concorrência de Escudos (Ciclo 004) 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Antigravity
- **Entregue**: Antigravity auditou, corrigiu e consolidou a camada de persistência e segurança de Escudos (PRD v0.11.3 §11.5, Ciclo 004): 1) Proteção rigorosa contra fraudes de clientes na RPC tm_save_patient_shield_transition, barrando qualquer tentativa de usuários com papel de paciente forjarem pontuações, escudos ou histórico (apenas super_admin, service_role ou médicos verificados com grant específico de escrita); 2) Eliminação de race conditions na criação da primeira conquista e em atualizações simultâneas via pg_advisory_xact_lock por (clínica, paciente); 3) Proteção de integridade física no PostgreSQL garantindo que highest_shield_earned seja estritamente não-decrescente via tm_shield_rank; 4) Imutabilidade estrita do ledger histórico (tm_shield_history_events) com trigger tm_prevent_shield_history_mutation bloqueando UPDATE e DELETE; 5) Preparação de contratos enriquecidos para o PWA (PatientShieldOverview e ShieldProgressInfo) com cálculo de pontos restantes e percentual de avanço para o próximo escudo; 6) 13 novos testes automatizados de segurança e concorrência cobrindo todas as tentativas de fraude, violação multiempresa e integridade transacional (totalizando 648 testes aprovados no projeto, 78 arquivos). Migração 014 validada localmente; aplicação remota no Cloud, implantação funcional em produção e tela visual PWA permanecem pendentes.
- **Próximo Passo**: Aguardar autorização da coordenação para aplicação da migração 014 no Lovable Cloud. Implementar a biblioteca central de artes de Escudos no Super ADM (VJE-4) e a tela PWA Meus Escudos (VJE-6). Metodologia e fórmula de VITALIDADE permanecem pendentes de validação regulatória/clínica.

## D73 - Jornada: Biblioteca Central de Artes dos Escudos e 15 variações no Super ADM (VJE-4) 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Antigravity
- **Entregue**: Antigravity implementou a Biblioteca Central de Artes dos 5 Escudos oficiais da JORNADA (PRD v0.11.3 §11.5 e §11.7, VJE-4, Ciclo 005): 1) Catálogo canônico com as 15 variações visuais exigidas (Origem, Ritmo, Avanço, Equilíbrio e Plenitude em variantes active, earned e locked) com cromia semântica oficial e metadados de acessibilidade; 2) Governança estrita PlugPix no Super ADM: clínicas White Label aplicam temas cromáticos apenas à sua interface, sem capacidade de alterar a identidade semântica, classificação, artes ou critérios de conquista dos Escudos; 3) Sanitizador SVG rigoroso com bloqueio de scripts (<script>, handlers on*), elementos ativos (<foreignObject>, <embed>, <object>), URIs perigosas (javascript:) e entidades XML externas (XXE), limite de 256 KB e cálculo de hash SHA-256; 4) Painel administrativo integrado no Super ADM (/super-admin/escudos) com visualização em grid/claro/escuro, upload/substituição de artes, versionamento semântico (SemVer) e auditoria completa com histórico e rollback de versões; 5) Camada de serviço ShieldArtService para leitura segura e desacoplada dos ativos publicados pelo futuro PWA; 6) 23 novos testes automatizados unitários, de segurança, sanitização, versionamento e RBAC (totalizando 671 testes aprovados no projeto, 79 arquivos, tsc, eslint e build 100% validados). Migração 014 validada localmente; aplicação remota no Cloud e tela Meus Escudos no PWA permanecem pendentes.
- **Próximo Passo**: Aguardar autorização da coordenação para aplicação da migração 014 no Lovable Cloud. Desenvolver a tela visual Meus Escudos no PWA (VJE-6). Conectar painel médico e concluir criação/revisão de metas. Metodologia e fórmula de VITALIDADE permanecem pendentes de validação regulatória/clínica.

## D74 - Jornada: consolidação Git, auditoria da Biblioteca de Escudos e preparação PWA (Ciclo 006) 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Antigravity
- **Entregue**: Antigravity concluiu a consolidação técnica e auditoria de segurança (Ciclo 006, D74): 1) Inventário completo do Git separando 26 arquivos modificados e 141 itens untracked entre histórico de trabalho do Codex e entregas D69 a D73, sem exposição de credenciais/segredos; 2) Auditoria de integridade comprovando que todos os módulos de D69 (motor Jornada), D70 (motor Escudos), D71 (persistência local), D72 (segurança contra fraudes) e D73 (artes de Escudos) estão 100% íntegros e funcionais (81 testes dedicados aprovados); 3) Auditoria gráfica classificando formalmente todas as 15 variações de Escudos como propostas visuais aguardando aprovação humana da PlugPix (PRD §11.1, §11.5 e §11.7); 4) Auditoria de segurança constatando que a biblioteca administrativa opera com validação em memória/localStorage com sanitização rigorosa anti-XSS e hash SHA-256 no cliente, com persistência remota em Bucket de Storage e tabelas RLS Cloud mapeadas e prontas para conexão; 5) Elaboração do plano seguro de checkpoint particionado em commits lógicos para aprovação prévia; 6) 673 testes automatizados aprovados no projeto (79 arquivos), com TypeScript, ESLint e build de produção 100% validados.
- **Próximo Passo**: Aguardar autorização humana para execução do plano de commits e push ao GitHub. Aguardar autorização para aplicação das migrações no Lovable Cloud e aprovação das artes pelo proprietário. Implementar a tela visual Meus Escudos no PWA (VJE-6). Conectar painel médico e concluir criação/revisão de metas. Metodologia e fórmula de VITALIDADE permanecem pendentes de validação regulatória/clínica.

## D75 - PWA: tela inicial Meus Escudos 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex criou /app/escudos com superfícies existentes, estado vazio sem pontuação inventada e apresentação de escudo ativo/histórico para dados estritos do mesmo paciente/clínica. Artes ainda em aprovação e VITALIDADE indisponível. Dois testes iniciais, TypeScript e build aprovados; homologação visual e casos completos de histórico ainda pendentes.
- **Próximo Passo**: Ampliar testes de histórico/regressão, conferir layout no navegador e conectar leitura autorizada. Migração 014 não aplicada. Checkpoint remoto preservado; main intacta e preview ainda precisa de decisão de sincronização.

## D76 - PWA: histórico e progresso dos Escudos 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex ampliou Meus Escudos com progresso acessível para próximo nível, oculto em estado provisório, e reconhecimento de reconquista. Sete testes cobrem histórico após regressão, fuso America/Bahia, escopo divergente na raiz/estado/eventos e ausência de VITALIDADE inventada. TypeScript/lint aprovados. Rota vazia homologada no navegador local com rodapé presente.
- **Próximo Passo**: Conectar consulta autorizada e homologar cenários preenchidos/móveis. Artes aguardam aprovação; migração 014 local, sem acesso clínico concedido. Preview Lovable não confirmado para checkpoint.

## D77 - Escudos: corrigido acesso clínico implícito do Super ADM 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex revisou migração 014 local e removeu exceção que permitia leitura/escrita clínica pelo cargo global Super ADM, contrariando PRD §11.7. Guard compartilhado exige recurso exato, sem usar journey_goals como permissão para outros recursos. Vínculo médico verificado continua necessário para escrita autenticada. Vinte e oito testes PostgreSQL de segurança/persistência aprovados, incluindo bloqueio explícito do operador global.
- **Próximo Passo**: Revisar fronteira servidor antes de conectar ShieldService; contexto opcional local não comprova autorização. 014 ainda não aplicada no Cloud; revisão e autorização específicas pendentes. Preserve artes e motor como candidatos em homologação.

## D78 - Escudos: leitura própria protegida no servidor 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex implementou leitura local readOwnShields com clínica/paciente derivados do vínculo ativo da sessão, grant journey_shields read obrigatório e recusa de vínculos ambíguos ou papéis administrativos/médicos na consulta específica PWA. Valida contrato e tenant de raiz/estado/histórico antes de retornar. Sete testes do serviço e quatro de status aprovados; tipos/lint válidos.
- **Próximo Passo**: Conectar host/sessão e adaptador da RPC 014; função não montada. Mapper PostgreSQL e cliente PWA ainda pendentes. Guard genérico de autorização permanece fechado para novo recurso; sem grants ou dados reais criados.

## D79 - Escudos: fronteira HTTP própria no PWA 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex compôs GET local com resolvedor de host patient_pwa e sessão da mesma requisição. Recusa query/body e métodos de escrita, deriva escopo do paciente no serviço, usa private/no-store e Vary Authorization/Host. Erros seguros e contrato/tenant revalidados. Onze testes HTTP/serviço aprovados.
- **Próximo Passo**: Implementar mapper RPC e transporte browser; composição ainda não montada. 014 não aplicada no Cloud e homologação remota pendente; nenhuma permissão real concedida.

## D80 - Escudos: transporte e composição de leitura PWA 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex implementou cliente GET sem query de identidade, com bearer fresco, no-store/sem cookies, recusa de redirecionamento e prazo 20s incluindo sessão/rede/corpo. Valida raiz/estado/histórico por tenant e paciente. Composição PWA exibe carregamento/falha/retry, nega consulta por padrão e descarta respostas antigas após revogação/contexto. Oito testes cliente/UI aprovados; tipos/lint dos componentes aprovados.
- **Próximo Passo**: Conectar mapper SQL/RPC e ambiente autenticado antes de montar na rota. 014 permanece local. Dados reais e preview Lovable ainda não homologados para checkpoint; nenhuma permissão clínica criada.

## D81 - Escudos: adaptador protegido da RPC de leitura 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex implementou adaptador server-only tm_get_patient_shield_overview vinculado ao bearer verificado. Converte linhas PostgreSQL para contratos estritos, confere clínica/paciente/conta em cada linha, normaliza instante UTC e remove metadados internos da resposta. Repositório somente leitura; ausência de estado gera Origem provisório sem pontos/conquistas. Sete testes aprovados.
- **Próximo Passo**: Testar integração completa com PostgreSQL 014 e fronteira HTTP/PWA. 014 ainda local e endpoints não montados; permissões e hosts reais pendentes de homologação.

## D82 - Escudos: integração completa de leitura PostgreSQL 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex validou cliente autenticado, host patient_pwa, sessão, fronteira HTTP, adaptador e PostgreSQL 014 local no mesmo fluxo. Nova consulta é recusada após revogação do grant no banco, mesmo com contexto de sessão anteriormente válido; histórico não sofre alteração. Quinze testes de segurança/integração aprovados.
- **Próximo Passo**: Revisar 014 para homologação Cloud, consolidar regressão e conectar ambiente autenticado real. Auth/registro de domínio são simulados nos testes locais, não comprovação remota. Não há endpoint ativo nem concessões clínicas.

## D83 - Escudos: bloqueios de autorização e revisão 014 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex adicionou FOR SHARE de vínculo/grant médico à transição PostgreSQL local, mantendo autorização durante a transação. Teste comprova que revogar write recusa a gravação sem modificar histórico. Trinta testes segurança/persistência passaram. Revisão 014 documenta efeitos, dependências, riscos, preflight e pós-verificação.
- **Próximo Passo**: Aguardar autorização específica de 014 no Cloud. Continuar homologação local e regressão; não ativar cálculo/método clínico ou endpoints de gravação. main permanece intacta.

## D84 - Escudos: limites de pontuação e integração do menu 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex restringiu médias/valores arredondados de Escudos a 0–100 no contrato e acrescentou rejeição de respostas RPC fora dos limites. Regressão ampla executou 712 testes: 711 passaram e revelou registro ausente app/escudos no catálogo de módulos; registro corrigido preservando menu e rota. Tipos/lint/build anteriores aprovados. Vinte testes direcionados de menu/tela/RPC aprovados após correção, sem alegar regressão integral aprovada.
- **Próximo Passo**: Concluir revalidação e repetir regressão completa após correção do catálogo. 014 aguarda autorização; main intacta e checkpoint sem preview confirmado.

## D85 - Escudos: regressão consolidada e PWA móvel 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex concluiu regressão após corrigir catálogo app/escudos: 712 testes em 85 arquivos aprovados, duração 188,46s. TypeScript/lint direcionados/build aprovados antes da correção de catálogo; 20 testes direcionados já validaram essa correção. Verificação visual do estado vazio em 320×568 confirmou ausência de rolagem horizontal (scrollWidth 305) e rodapé fixo com base 568; viewport restaurado.
- **Próximo Passo**: Homologar visualmente cenários preenchidos, aplicar 014 somente após aprovação e definir sincronização do preview preservando a orientação de main intacta. Testes locais não concluem requisitos produtivos do PRD. Atualização: lote até 538d794 integrado à main por autorização humana específica e preview /staus confirmado com 85 entregas. D86 permanece no checkpoint.

## D86 - Escudos: atomicidade e escopo da persistência local 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex corrigiu repositório local que gravava estado antes de validar o evento: ambos os contratos e escopos são conferidos antes de qualquer mutação. Evento inválido preserva snapshot/ledger e libera lock; estado/evento estrangeiro não contaminam a chave clínica/paciente. Dezessete testes de atomicidade/persistência aprovados; tipos/lint aprovados.
- **Próximo Passo**: 014 e integração main permanecem aguardando decisões humanas; nenhuma alteração no Cloud nesta etapa.

## D87 - Escudos: restauração validada do histórico local 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex substituiu importação de snapshot sem validação por restauração atômica com contratos estritos, chaves clínicas coerentes, estado obrigatório para histórico, eventos únicos e idempotência íntegra. Snapshot inválido preserva dados anteriores; restauração recusa locks ativos. Vinte e quatro testes atomicidade/persistência passaram; dez testes direcionados finais aprovados após recusar chaves repetidas.
- **Próximo Passo**: D86/D87 continuam no checkpoint; main contém lote autorizado até D85. 014 segue pendente de autorização. Restauração local não é backup Cloud produtivo nem substitui política de retenção do PRD.

## D88 - Escudos: conflito de conteúdo em reenvios 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex protegeu idempotência local: evento existente com mesma identidade e conteúdo histórico alterado é recusado antes de modificar o estado. Horário técnico de reprocessamento não causa conflito; primeiro registro permanece preservado. Primeiro ensaio revelou esse detalhe no teste concorrente e foi corrigido; 41 testes finais de atomicidade/persistência/segurança passaram.
- **Próximo Passo**: D86–D88 continuam apenas no checkpoint. Homologar leitura real após decisões Cloud/hosts/permissões; main segue no lote D85 autorizado. Nenhum cálculo clínico produtivo ativado.

## D89 - PWA: acesso a Meus Escudos pela página inicial 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex adicionou link Meus Escudos no painel Mais recursos de cuidado, reutilizando classes e ícone existentes, sem alterar score demonstrativo. Quatorze testes da página inicial aprovados; navegação real no navegador local abriu /app/escudos pelo link e manteve rodapé. Tipos/lint aprovados.
- **Próximo Passo**: D86–D89 permanecem no checkpoint até aprovação de integração posterior. Tela segue vazia sem dados autorizados; Cloud 014/hosts/grants e homologação real pendentes.

## D90 - Escudos: limites 0–100 também no PostgreSQL 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex adicionou CHECKs de pontuação 0–100 ao estado e histórico na migração 014 local, preservando NULL para ausência de cálculo. Testes de gravação autorizada com média/arredondamento fora do intervalo comprovam recusa e ausência de mutação parcial. Trinta e quatro testes segurança/persistência passaram.
- **Próximo Passo**: 014 permanece não aplicada no Cloud, aguardando autorização. Regras numéricas de nível/metodologia não alteradas. D86–D90 continuam no checkpoint; main no lote D85 autorizado.

## D91 - Identidade visual: distinguir paciente e médico da gestão 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex corrigiu identificação do cabeçalho PWA para Meu cuidado, inclusive subpáginas, e navegação médica para Área médica, preservando nome/logo/cores por clínica e identidade PlugPix do Super ADM. Alternativa textual da logo usa o nome da marca. Quatorze testes do paciente aprovados e subpágina conferida no navegador local.
- **Próximo Passo**: Continuar homologação visual por perfil e conectar identidades reais conforme White Label. D86–D91 permanecem no checkpoint; main no lote D85 autorizado. Sem DNS, grants ou mudança de backend.

## D92 - Escudos: política central de leitura por perfil 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex integrou journey_shields à política central para leitura própria do paciente ou médico verificado com grant e metadados de vínculo ativo do paciente na mesma clínica. Admin e cargo global isolado não ganham acesso. Ações create/write/delete/manage são negadas na interface, mesmo com grant apresentado. Cinquenta testes de autorização/host em cinco arquivos aprovados; tipos/lint válidos.
- **Próximo Passo**: Conectar metadados verificados nos fluxos operacionais e homologar com RLS real. Nenhum grant Cloud concedido; 014 e integração pós-D85 ainda pendentes. D86–D92 apenas no checkpoint.

## D93 - Agenda: fundação local de disponibilidade médica 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex criou contratos estritos de intervalos com fuso explícito, término posterior ao início e detecção de sobreposição por instantes UTC, permitindo horários adjacentes. Preflight próprio exige médico verificado, vínculo ativo único e grant agenda/write; deriva clínica/médico da sessão, rejeita propriedade injetada e dados retornados fora do escopo. Oito testes aprovados. Não reserva nem publica horários.
- **Próximo Passo**: Preparar persistência atômica e formulário, com revisão de políticas de agenda pendentes no PRD. Duração padrão, recorrência, cancelamento e quem agenda não foram inventados. Código somente local/checkpoint; sem SQL Cloud ou acesso clínico concedido.

## D94 - Agenda: persistência local de disponibilidade própria 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex preparou migração 015 somente local com intervalos explícitos, RLS própria, vínculo médico verificado, grants agenda read/write, bloqueios de vínculo/grant e advisory por médico/clínica. RPC append-only revalida permissão antes de replay, recusa conteúdo alterado/sobreposição e aceita adjacência. Quatro testes PostgreSQL locais aprovados; Super ADM e outra clínica negados.
- **Próximo Passo**: Conectar serviço/HTTP/formulário e testar concorrência real em conexões independentes antes de operação. 015 não aplicada no Cloud. Disponibilidade não é consulta/reserva; políticas pendentes do PRD e conflito entre clínicas não foram decididos.

## D95 - Agenda: serviço e fronteira HTTP de disponibilidade 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex conectou disponibilidade própria a serviço com grant médico e RPC atômica, composição de domínio clinic_portal/sessão da mesma requisição, POST JSON limitado e respostas privadas/no-store. Identidade não vem do corpo. Recibo valida clínica/médico/solicitação e instantes antes da confirmação; conflitos/negações SQL têm mensagens seguras. Dezessete testes de contratos/serviço/HTTP aprovados.
- **Próximo Passo**: Integrar PostgreSQL local ponta a ponta, transporte/formulário e leitura da agenda. Endpoint não montado; 015 apenas local, sem reservas ou políticas pendentes inventadas. Cloud e integração pós-D85 continuam sob gates separados.

## D96 - Agenda: transporte autenticado e reenvio PostgreSQL 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex implementou cliente com bearer fresco, prazo 20s e resposta estrita de clínica/médico/solicitação/intervalo, sem cache/cookies/redirecionamento. Integração cliente-host-sessão-HTTP-RPC-SQL local comprovou reenvio após resposta perdida sem duplicar horário. Vinte e dois testes de contratos/HTTP/SQL e seis do cliente aprovados; tipos/lint válidos.
- **Próximo Passo**: Implementar formulário e leitura paginada de disponibilidade, mantendo políticas pendentes explícitas. SQL 015 somente local; endpoint não montado e Auth/hosts simulados nos testes. D86–D96 apenas no checkpoint; main no lote D85 autorizado.

## D97 - Agenda: formulário com fuso explícito e reenvio seguro 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex criou formulário reutilizável de disponibilidade com fuso da clínica explícito, validação de datas e rejeição de horários inexistentes ou ambíguos. Reenvio conserva a mesma solicitação após resultado incerto; troca de médico descarta resposta tardia. Quatro testes aprovados, TypeScript e lint válidos.
- **Próximo Passo**: Conectar formulário à composição autorizada e preparar leitura de disponibilidade. Componente ainda não montado; SQL 015 somente local e sem consulta reservada. Main permanece no lote D85; D86–D97 no checkpoint.

## D98 - Personalização: regressão de identificação acessível da clínica 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex atualizou o teste de fallback e recuperação de logo para os textos acessíveis que identificam cada clínica, introduzidos na D91. Os onze testes de personalização passaram após a correção. Nenhum componente, identidade ou design foi alterado nesta etapa.
- **Próximo Passo**: Concluir regressão completa e compilação antes de registrar aprovação geral do checkpoint. Integração na main continua limitada à autorização D85.

## D99 - Escudos: compatibilidade browser e isolamento das prévias 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex removeu node:crypto e Buffer do sanitizador, preservando hashes SHA-256 das 15 artes com biblioteca compatível com navegador e bun.lock. Prévia e cards exibem SVG como imagem isolada em vez de HTML inserido. Vinte e nove testes de artes/runtime/prévias aprovados, TypeScript válido. Navegador local confirmou artes e prévia carregadas, sem salvar substituição.
- **Próximo Passo**: Revisar sanitização completa e persistência remota antes de considerar biblioteca produtiva. Catálogo continua demonstrativo/local; não houve publicação de arte, Cloud, DNS ou integração pós-D85 na main.

## D100 - Escudos: rollback restaura a arte e verifica integridade 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex corrigiu rollback que antes restaurava apenas hash/versão mantendo SVG recente. Novos snapshots guardam arte completa; todos os arquivos são validados antes da troca. Histórico antigo sem arquivo ou com hash divergente é recusado sem alteração parcial. Cópias isoladas impedem mutação externa do fallback em memória. Trinta e um testes de artes/runtime/rollback aprovados.
- **Próximo Passo**: Validar contrato completo do catálogo armazenado e limites de persistência, sem tratar armazenamento local como backend ou autorização real. Históricos legados sem conteúdo não podem ser restaurados. Main no lote D85; mudanças posteriores somente no checkpoint.

## D101 - Escudos: validar catálogo local antes de carregar 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex substituiu aceitação de JSON por contagem de 15 entradas por contrato estrito de campos, chaves, identidade Escudo/variante, datas, estados e hashes das artes atuais. Histórico tem estrutura validada e mantém compatibilidade com registros legados sem arquivos. Dados inválidos usam fallback sem apagar conteúdo salvo. Trinta e sete testes de contrato/artes/runtime/rollback aprovados.
- **Próximo Passo**: Continuar persistência e revisão do upload. Validação local não estabelece autoridade de publicação nem substitui backend. D100 valida integridade dos arquivos históricos no rollback; catálogos legados incompletos não têm restauração inventada. Main permanece D85.

## D102 - Escudos: falhas de salvamento preservam catálogo e edição 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex removeu sucesso falso em erros de quota ou acesso ao armazenamento. Edição, publicação demonstrativa, rollback e reset só atualizam a memória após gravação bem-sucedida; falhas retornam erro e preservam o catálogo anterior. Modal mantém SVG e prévia após falha e permite tentar novamente. Quarenta testes de armazenamento/contrato/artes/rollback e três de modal/prévias aprovados.
- **Próximo Passo**: Continuar revisão das versões, sanitização e futura persistência remota autorizada. Operações continuam locais/demonstrativas; não houve publicação oficial, Cloud ou integração pós-D85 na main.

## D103 - Escudos: identidade única das versões e rollback sem ambiguidade 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex normalizou espaços na versão publicada localmente, bloqueou reutilização de identificadores históricos mesmo após rollback e recusou números SemVer com zeros iniciais. Histórico legado duplicado continua legível, mas rollback ambíguo retorna erro sem escolher arbitrariamente um registro. Trinta e nove testes de versões/persistência/artes/rollback aprovados.
- **Próximo Passo**: Consolidar regressão do checkpoint e continuar requisitos pendentes de persistência remota e upload. Não foi inventada política de incremento de versões. Biblioteca ainda demonstrativa; main permanece D85.

## D104 - Agenda: contrato de leitura própria paginada 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex criou consulta por período explícito com paginação por início/ID e limite técnico de 50 itens. Escopo deriva da sessão de médico verificado com agenda/read; escrita isolada não concede leitura. Serviço valida propriedade, janela, ordem, duplicatas e limite do retorno antes de expor a página. Vinte e sete testes de leitura e regressão de contratos/HTTP aprovados.
- **Próximo Passo**: Conectar leitor SQL sob o bearer da requisição, fronteira HTTP e interface de disponibilidade. Serviço ainda não montado; SQL 015 não aplicado no Cloud. Disponibilidade não reserva consultas nem define regras de cancelamento ou duração.

## D105 - Agenda: paginação SQL própria sob RLS local 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex conectou o serviço de leitura a adaptador SQL parametrizado com filtros de clínica/médico, período, cursor composto e limite. Linhas são mapeadas com contrato estrito. Teste PostgreSQL local percorreu três disponibilidades sem duplicação e confirmou retorno vazio sob Super ADM e após revogação de agenda/read. Dezesseis testes de leitura/SQL aprovados.
- **Próximo Passo**: Preparar fronteira HTTP e interface da leitura usando sessão e executor da mesma identidade. SQL 015 somente local; teste usa PGlite e Auth simulado. Não comprova homologação Cloud ou concorrência real. Main permanece D85.

## D106 - Agenda: leitura HTTP privada vinculada ao domínio 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex criou fábrica GET de leitura com domínio clinic_portal e sessão da mesma requisição. Query permite apenas período/limite/cursor, recusa chaves duplicadas ou identidade injetada e responde private/no-store com erros seguros. Integração HTTP-host-sessão-SQL local confirmou página própria e retorno vazio após revogação no banco. Dezesseis testes HTTP/SQL e vinte de HTTP/serviço aprovados.
- **Próximo Passo**: Implementar transporte de navegador e interface paginada, com invalidação na troca de clínica/médico. Endpoint ainda não montado; Auth/host simulados e SQL 015 apenas local. Sem Cloud ou integração pós-D85 na main.

## D107 - Agenda: transporte e lista paginada de disponibilidade 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex implementou cliente GET com bearer fresco, prazo de 20s, sem cookies/cache/redirecionamento e validação estrita de escopo, ordem, período e cursor. Lista reutilizável consulta período no fuso explícito da clínica, carrega páginas e descarta resposta após troca de contexto/permissão. Cinco testes novos de cliente e componente aprovados.
- **Próximo Passo**: Compor com sessão operacional e homologar no navegador após aprovação da ativação do backend/rotas. Componentes ainda não montados; sem simular agenda real, consultas, Cloud ou integração pós-D85 na main.

## D108 - Agenda: integração segura da rota operacional e workspace de disponibilidade 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Antigravity
- **Entregue**: Antigravity integrou o workspace de disponibilidade médica (/medico/agenda) aos componentes de formulário (D97) e listagem paginada (D107), com identificação explícita do fuso da clínica (America/Bahia) e bloqueio preventivo de dados fictícios. Criou a rota de API /api/agenda/availability vinculada aos manipuladores de runtime seguros de escrita e leitura, com autenticação obrigatória, controle de perfil médico e cabeçalhos privados. Dezesseis novos testes automatizados de interface e runtime aprovados.
- **Próximo Passo**: Homologar a aplicação remota da migração 015 no Cloud sob autorização específica e conectar endpoints às rotas de produção para transição de estado operacional.

## D109 - Agenda: homologação técnica, segurança multiclínica e fuso horário IANA 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Antigravity
- **Entregue**: Antigravity homologou a segurança técnica da Agenda Médica, auditando autenticação no servidor, autorização por perfil médico verificado e isolamento estrito multi-tenant (bloqueio entre clínicas e sessão revogada). Refatorou o tratamento de fusos horários eliminando padrões fixos arbitrários e implementando validação estrita de identificadores IANA com bloqueio preventivo de cadastro/consulta para clínicas sem fuso configurado. Confirmou o arquivo canônico único da migração 015 em database/migrations/015_doctor_availability.sql (sem divergências). Estabeleceu barreira preventiva no runtime do servidor (503 Service Unavailable) enquanto a infraestrutura remota aguarda autorização humana no Cloud. Vinte testes de interface e integração aprovados e 838 testes na suíte global.
- **Próximo Passo**: Aguardar autorização humana para aplicação da migração 015 via Lovable Cloud SQL Editor, seguida de testes ponta a ponta com banco real e liberação da flag operacional.

## D110 - Clínicas: persistência oficial do fuso horário IANA e resolução confiável no servidor 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Antigravity
- **Entregue**: Antigravity implementou e revisou a migração aditiva 016_clinic_time_zone.sql estendendo tm_clinics com time_zone nullable, trigger de auditoria administrativa e atualização da RPC tm_save_clinic com controle de revisão e validação canônica de fusos IANA contra pg_catalog.pg_timezone_names. A RPC foi blindada para preservar o fuso existente em atualizações com valores nulos ou omitidos e rejeitar identificadores inexistentes (como America/CidadeInexistente), homologada com 13 testes PGlite. Integrou o campo de Fuso horário oficial com seleção assistida e validação em tempo real na interface administrativa do Super ADM. Desenvolveu o resolvedor server-only createReliableClinicResolver e o endpoint /api/agenda/clinic com leitura autenticada direta do banco vinculada ao domínio verificado, rejeitando parâmetros arbitrários do cliente e bloqueando agendamento para clínicas sem fuso cadastrado. Bateria completa de testes específicos e suíte global aprovados com 866 testes.
- **Próximo Passo**: Aguardar autorização humana para aplicação das migrações 015 e 016 no Lovable Cloud SQL Editor, seguida de testes ponta a ponta e transição da flag operacional da agenda médica.

## D112 - Agenda Médica: correção da resolução White Label e integração a tm_clinic_domains 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Antigravity
- **Entregue**: Antigravity corrigiu a incompatibilidade no runtime da Agenda Médica, substituindo a referência incorreta a tm_domain_reservations pelo objeto oficial tm_clinic_domains definido na migração 006. Centralizou os provedores padrão defaultLookupClinicDomain e defaultLookupClinicRecord em clinic-host-context.server.ts, eliminando duplicações de consultas de catálogo e garantindo consistência entre a agenda e a resolução de fuso da clínica. Criou a suíte de testes clinic-domain-resolution.test.ts cobrindo a verificação DDL via PGlite, recusa de domínios em pending_verification (status único do schema atual), rejeição de domínios desconhecidos, clínicas inativas, usuários de outros tenants e preservação da barreira 503 com 876 testes aprovados em 109 arquivos.
- **Próximo Passo**: Elaborar e aprovar a migração de ativação de domínios (transição de pending_verification para active com validação DNS/TLS), seguida da homologação no Lovable Cloud das migrações 014, 015 e 016 e testes ponta a ponta para ativação da Agenda Médica.

## D113 - Retomada Codex: consolidação D112, plano mestre e inspeção Cloud 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex revisou e consolidou D112 do Antigravity em 93c45de, confirmou 876 testes/109 arquivos, lint/tipos/build e enviou D108–D112 ao checkpoint. Criou plano mestre cobrindo 101 identificadores e adendos. Inspeção SQL somente leitura confirmou ausência de objetos 014/015 e time_zone/assinatura 016; domínios restritos a pending_verification. Lovable confirmado na main, não no checkpoint.
- **Próximo Passo**: Implementar ciclo seguro de posse/DNS/TLS e ativação autorizada, com migração local revisada. Resolver leitura mínima de domínio para médico e leitor padrão da agenda ainda 503. Cloud 014–016, DNS, concessões clínicas e integração na main continuam gates separados; PRD não concluído.

## D114 - White Label: desafio e verificação server-only de posse DNS 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex implementou desafio aleatório de 256 bits ligado a domínio/clínica/ambiente/revisão e validade explícita. Verificador DNS server-only exige TXT exato, não combina registros separados, revalida expiração e limita espera com erros seguros. Recibo não ativa domínio nem inclui token bruto. Regressão completa aprovada: 886 testes em 110 arquivos.
- **Próximo Passo**: Persistir e rotacionar desafios sob revisão transacional; completar TLS/roteamento e ativação auditada. Antes de integrar na main, corrigir compatibilidade administrativa pré-016 identificada no Cloud. Sem endpoint, DNS alterado, domínio ativo ou migração remota nesta entrega; resolvedor nativo ainda exige homologação no runtime Cloud.

## D115 - Clínicas: compatibilidade administrativa antes da migração de fuso 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex protegeu consulta de lista/detalhe contra coluna time_zone ausente: somente erro PostgreSQL de coluna inexistente repete a leitura com campos básicos, mantendo autorização e filtros. Escrita omite p_time_zone apenas quando não solicitado; fuso explícito não é descartado nem repetido após falha. Recibo sem o fuso pedido não confirma sucesso. Testes cobrem contratos anterior e posterior à 016. Regressão aprovada: 896 testes em 111 arquivos.
- **Próximo Passo**: Homologar compatibilidade via preview após integração revisada na main; 016 continua pendente e nenhum backend foi alterado. Persistir desafios DNS e avançar TLS/ativação auditada. Aplicação remota de 014–016 e liberação de agenda continuam gates separados.

## D116 - White Label: persistência local de emissão e rotação auditadas de desafios 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex criou a migração local 017 com desafios vinculados à reserva e revisão, rotação transacional, token único, auditoria sem token e acesso restrito. Revisão antiga, entrada inválida e falha de inserção não alteram o estado; nenhum domínio é ativado. Nove testes novos e regressão completa: 905 testes em 112 arquivos, TypeScript, lint direcionado e build aprovados. Integrado localmente em develop; Cloud e preview não alterados.
- **Próximo Passo**: Implementar leitura e adaptador runtime do desafio corrente, persistência confiável da observação DNS, TLS/roteamento e ativação autorizada. Revisar/aprovar aplicação remota da 017; a emissão ainda não possui endpoint ou interface. Preservar main até integração aprovada.

## D117 - White Label: leitura corrente e prova DNS persistida com consumo transacional 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex implementou a migração local 018 e orquestrador server-only: leitura do desafio corrente, verificação TXT e gravação privada com consumo único. Rotação, expiração ou revogação durante DNS impedem a gravação; recibos divergentes e provas do navegador são recusados. Provas não incluem token bruto nem ativam domínios. Regressão aprovada: 916 testes em 113 arquivos, TypeScript, lint direcionado e build. Integrado localmente em develop; sem aplicação remota.
- **Próximo Passo**: Definir identidade mínima do verificador e transporte seguro antes de qualquer grant/endpoint Cloud; implementar consulta administrativa do recibo já consumido, TLS/roteamento e ativação autorizada. Migrações 017/018 continuam propostas locais, DNS real e concorrência Cloud não homologados. Preview depende de integração aprovada na main.

## D118 - White Label: consulta de recibos DNS e transporte HTTPS com IP público fixado 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex implementou a proposta local 019 para consultar recibos DNS já consumidos, distinguindo histórico e validade sem repetir DNS. Adaptador usa bearer/RLS existente. Sonda server-only filtra endereços IPv4/IPv6, fixa IP público, preserva Host/SNI e valida certificado; limita espera/cabeçalhos/corpo e rejeita redirects e respostas incompletas. É observação de transporte, sem confirmação de projeto, endpoint público ou ativação. Validação: 981 testes em 116 arquivos, TypeScript, lint direcionado e build aprovados.
- **Próximo Passo**: Implementar desafio de roteamento assinado e vinculado ao host confiável do ingresso antes de persistir prova TLS/roteamento ou ativar domínio. Homologar APIs de rede no executor Cloud aprovado; 017–019 continuam locais. main/preview exige integração aprovada; não aplicar SQL, grants ou DNS automaticamente.

## D119 - White Label: prova assinada de roteamento no backend local 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex concluiu e revisou a prova server-only Ed25519 vinculada a projeto, domínio, clínica, ambiente, revisão, nonce, DNS e validade. Cobertura de adulteração, rotação e revogação. Backend consolidado no commit local d204197 e integrado localmente em develop, preservando o frontend existente. Validação do conjunto: 1.040 testes em 119 arquivos, TypeScript, lint direcionado e build aprovados. Main, GitHub e Cloud não alterados.
- **Próximo Passo**: Homologar ingresso, registro de chaves e transporte Cloud após revisão/autorização própria. Prova de assinatura não ativa domínio. Qualquer push ou integração na main exige autorização separada; frontend mais recente do Antigravity permanece em sua branch.

## D120 - White Label: persistência privada e consumo único em PostgreSQL local 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex implementou a proposta LOCAL 020, registry privado com digest da chave pública, desafios, recibos e auditoria. Escrita reconfere operador, domínio, revisão, DNS e chave sob locks; consumo único e rollback transacional. Adaptador server-only exige writer privado injetado e valida todo retorno. 45 testes direcionados, incluindo 18 de persistência PGlite. Integrado localmente em develop com D119: 1.040 testes/119 arquivos, tipos, lint e build aprovados. SQL não aplicado no Cloud.
- **Próximo Passo**: Provisionar identidade mínima e chaves somente após revisão; leitura privada entregue localmente pela D121; auditar administração de chaves. Testes em conexão PGlite serializada não comprovam concorrência remota ou TLS real. Push, main, publicação e aplicação SQL continuam fora desta autorização local.

## D121 - White Label: leitura privada de desafios atuais e recibos históricos 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Codex implementou a proposta LOCAL 021 e adaptadores server-only de leitura. Desafio retorna somente se domínio, DNS e chave continuam atuais/válidos; recibos preservam snapshot histórico com isCurrent/isValid. RPCs sem grants de browser e ator administrativo persistido obrigatório. Testes usam o RPC real em PGlite: 65 testes direcionados aprovados em três arquivos (20 novos), tipos e lint aprovados. Código integrado localmente em develop; SQL não aplicado no Cloud. Validação integrada: 69 testes direcionados em quatro arquivos, TypeScript, lint e build aprovados.
- **Próximo Passo**: Auditar administração de chaves e definir identidade mínima/provedor do worker. Homologar runtime, ingresso e egress antes de ativação/SSR. Estes testes não são nova execução da regressão geral histórica 1.040/119 da D120. Sem push, main, DNS, publicação ou SQL remoto.

## D122 - PWA do Cliente: VITALIDADE, JORNADA, Escudos e Registros Diários de Hábitos 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Antigravity
- **Entregue**: Antigravity implementou a experiência diária integrada no PWA do cliente: card VITALIDADE com os 5 pilares do PRD §11.3 (sem nota numérica fictícia, em homologação clínica e modal explicativo de metodologia); card JORNADA & Escudos com escudo ativo (Ritmo), média da janela móvel de 7 dias avaliáveis, progresso para o próximo nível e regra oficial de regressão preservando conquistas anteriores; registros diários de hábitos (alimentação consciente, atividade física com duração/intensidade e confirmação de medicamentos prescritos) com autorrelato explícito; painel transparente de dispositivos de saúde (pulseira inteligente, balança de bioimpedância e anel inteligente) com status honesto (não configurada / homologação BLE) e sem simulação de dados vitais falsos, garantindo 100% de elegibilidade na JORNADA para clientes sem hardware. Suíte de testes validada: 1.084 testes aprovados em 122 arquivos (6 novos testes dedicados), TypeScript, ESLint e build aprovados.
- **Próximo Passo**: Conectar o fluxo de sincronização de dispositivos via Web Bluetooth quando o firmware homologado estiver disponível e integrar os autorrelatos diários com os endpoints do Codex para persistência transacional.

## D123 - PWA: galeria de Escudos e histórico demonstrativo 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Antigravity
- **Entregue**: Galeria canônica com cinco níveis, destaque e detalhes, preservando histórico demonstrativo. Implementação anterior consolidada sem refazer o design.
- **Próximo Passo**: Homologar histórico real e dados autorizados; galeria demo não prova persistência produtiva.

## D124 - PWA: preparação para dados reais e estados de Jornada 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Antigravity
- **Entregue**: Preparação de consumo HTTP, estados de carregamento, insuficiência, provisório e erro; score fictício bloqueado em contas reais. Histórico Git preservado na consolidação.
- **Próximo Passo**: Conectar contexto paciente/tenant derivado do servidor e persistência real; callbacks foram complementados pelo Codex durante consolidação.

## D124-BACKEND - White Label: revogação privada auditada de chaves 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Proposta local 022, revisão otimista, revogação/auditoria atômicas e recibos históricos preservados. Não reativa chave.
- **Próximo Passo**: Aplicação Cloud e identidade mínima do worker exigem revisão/autorização próprias.

## D125-AUTH - PWA: falha Auth não habilita demonstração 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Estado Auth desconhecido mantém modo restrito. Consolidação também impede lookup antigo de sobrescrever login/logout posterior e retorno após desmontagem.
- **Próximo Passo**: Homologar contas/hosts reais; distinto da D125 operacional de hábitos solicitada na retomada.

## B023 - Backend: consulta privada da auditoria de chaves 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Proposta local 023: metadados de revogação com paginação estável, escopo projeto/chave e autorização persistida.
- **Próximo Passo**: Sem endpoint/Cloud/grants; integrar ao futuro fluxo administrativo autorizado.

## B024 - Backend: inventário privado de metadados de chaves 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Proposta local 024: inventário paginado por projeto, revisão/validade/revogação, sem material privado. Índice local para auditoria.
- **Próximo Passo**: Snapshot não autoriza uso/reativação; provisionamento e worker continuam pendentes.

## B025 - Backend: ativação transacional local vinculada a provas 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Proposta local 025: exige prova persistida atual, clínica ativa, chave válida, revisão esperada e auditoria atômica. Nenhum domínio real ativado.
- **Próximo Passo**: Resolver runtime deve revalidar validade/estado; suspensão, retirada e Cloud não concluídos.

## D126 - Consolidação integral Codex e preservação do frontend 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Históricos de ambos os agentes preservados por merges não destrutivos; handoff final incorporado e governança atualizada. Validação consolidada: 1.159 testes/128 arquivos, TypeScript, build e lint global sem erros (sete avisos).
- **Próximo Passo**: D125 operacional em implementação: rotas/runtime, contexto paciente próprio, metas e persistência; main/preview e SQL remoto fora deste lote.

## D125-CONTEXT - Jornada: contexto próprio de paciente — parte 1 local 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: Schema, cliente e handler composto derivam clinicId/patientId do host e vínculo verificados; não usam Auth userId como paciente nem aceitam tenant na query. Cinco testes novos; dez direcionados com fluxo SQL de autorrelato/handler de Escudos, TypeScript e lint aprovados.
- **Próximo Passo**: D125 operacional permanece parcial: falta provedor runtime/lookup mínimo, rotas registradas, metas e integração real do frontend. Sem Cloud, grants ou domínio ativado.

## D125-RUNTIME - Jornada: rotas same-bearer e galeria com contexto próprio — parte 2 🟢

- **Status**: 🟢 Concluído no escopo descrito
- **Autores**: Codex
- **Entregue**: GET contexto/Escudos e POST autorrelato registrados, reutilizando Auth/RLS e handlers existentes. Proposta local 026 resolve somente host próprio com provas atuais. Galeria usa clinicId/patientId do servidor, sem ID Auth como paciente. Regressão consolidada: 1.175 testes/131 arquivos, TypeScript, lint direcionado e build aprovados; galeria e rodapé conferidos no navegador local.
- **Próximo Passo**: D125 operacional permanece parcial: leitura própria de metas/eventos, formulários de hábitos e homologação Cloud. Migração 014 e cadeia White Label não aplicadas por este lote; sem grants, DNS, main ou Publish.
