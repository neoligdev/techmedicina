# Status temporário do projeto — 09/10/2026

Fonte: PRD_Techmedicina.md. 34 seções + 67 subitens. Atualização manual por commit; azul significa iniciado/parcial, não execução em segundo plano. Dados demo não concluem requisitos de produção.

## Entregas concluídas no escopo demonstrativo

🟢 ✅ **Quatro áreas e navegação demonstrativa**

- Feito: Base Super ADM, clínica, médico e cliente criada e navegável.
- Próximo passo: Módulos funcionais produtivos continuam nas pendências do PRD.
- Executor: Lovable, Antigravity

🟢 ✅ **Personalização visual no navegador**

- Feito: Nome, cores, tema, logomarca e favicon salvos por clínica; Super ADM preserva PlugPix.
- Próximo passo: Domínio, identidade de instalação e persistência real ainda pendentes no item2.
- Executor: Lovable, Antigravity

🟢 ✅ **Design global azul marinho e superfícies foscas**

- Feito: Cartões, campos, navegação e gráficos com tokens semânticos e tema claro preservado.
- Próximo passo: Manter o padrão nos próximos módulos.
- Executor: Lovable, Codex

🟢 ✅ **Catálogo demonstrativo de planos**

- Feito: Salvar, recarregar, editar e excluir rascunhos locais de telemedicina/pulseira; validação e falhas cobertas.
- Próximo passo: Ativação, venda e cobrança real permanecem nos itens13 e20.
- Executor: Antigravity, Codex

🟢 ✅ **Painéis de saúde com números fictícios**

- Feito: Cliente e médico usam a mesma fonte de medições, seis gráficos e tabelas, com QA móvel e desktop.
- Próximo passo: Integração H59/H59MAX e balança real permanecem nos itens6,25 e27.
- Executor: Codex

🟢 ✅ **Base PWA de rede sem cache de saúde**

- Feito: Manifest, ícone SVG, service worker e mensagem de desconexão implementados e testados unitariamente.
- Próximo passo: Homologar instalação em aparelhos e ícones por clínica; histórico clínico offline não implementado.
- Executor: Codex

🟢 ✅ **Verificação local da entrega C006**

- Feito: 64 testes passaram; tipos e build válidos; lint sem erros e7avisos Fast Refresh.
- Próximo passo: Build remoto Lovable ainda apresenta aviso, apesar de recebimento/renderização do commit.
- Executor: Codex

🟢 ✅ **Relatório temporário Status do projeto**

- Feito: 101 títulos do PRD organizados com requisitos, situações, executores, busca e filtros na rota /staus.
- Próximo passo: Atualizar em cada entrega; excluir página, botão e catálogo ao concluir o projeto.
- Executor: Codex

## Todos os itens do PRD

🔵 ✅ **1 — Processo e estado das decisões**

- Feito: PRD preservado, matriz de requisitos e registros de continuidade criados.
- Em desenvolvimento / próximo passo: Consolidar decisões abertas e manter este relatório a cada etapa.
- Executor: Antigravity, Codex

🔵 ✅ **2 — Visão e arquitetura funcional**

- Feito: Quatro áreas navegáveis, identidade PlugPix, preferências visuais por clínica, UI fosca e base PWA entregues como demonstração.
- Em desenvolvimento / próximo passo: Completar SaaS, domínio e ícone de instalação por clínica, banco, módulos por contrato e autorização real.
- Executor: Lovable, Antigravity, Codex

🔵 ✅ **3 — Módulo Médico**

- Feito: Prévia médica navegável e painel de indicadores demonstrativos compartilhado com o cliente.
- Em desenvolvimento / próximo passo: Concluir identificação, prontuário, exames, agenda e comunicação com segurança real.
- Executor: Lovable, Antigravity, Codex

🔵 ✅ **3.1 — Identificação e autorização**

- Feito: Contratos e motor lógico de autorização com guardas que negam acesso sem sessão.
- Em desenvolvimento / próximo passo: Conectar autenticação real e validação de identidade/registro profissional e vínculo com a clínica.
- Executor: Antigravity

🟡 **3.2 — Prontuário e evoluções**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar prontuário e evoluções, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🔵 ✅ **3.3 — Dados de saúde e IA**

- Feito: Bioimpedância e pulseira com números fictícios, gráficos, histórico e tabelas na visão médica.
- Em desenvolvimento / próximo passo: Integrar coleta real e IA validada; estados emocionais e análise clínica ainda pendentes.
- Executor: Codex

🟡 **3.4 — Exames e documentos**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar exames e documentos, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **3.5 — Agenda e pacientes**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar agenda e pacientes, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **3.6 — Chat e vídeo**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar chat e vídeo, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🔵 ✅ **4 — Segurança — definição e recomendações**

- Feito: Fundação lógica de autorização, rota de diagnóstico e testes de negação por padrão.
- Em desenvolvimento / próximo passo: Implementar autenticação, isolamento persistente, criptografia, auditoria e demais controles produtivos.
- Executor: Antigravity

🟡 **5 — Compartilhamento dentro da mesma clínica**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar compartilhamento dentro da mesma clínica, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **6 — Dispositivo e contexto anterior**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar dispositivo e contexto anterior, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **7 — Critérios de aceite propostos para o módulo Médico**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar critérios de aceite propostos para o módulo médico, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🔵 ✅ **8 — Aplicativo do cliente/paciente**

- Feito: Aplicativo navegável, design responsivo, seis gráficos, histórico fictício e base PWA sem cache de saúde.
- Em desenvolvimento / próximo passo: Implementar dados e serviços reais, rotina, exames, IA e regras dos subitens.
- Executor: Lovable, Antigravity, Codex

🔵 ✅ **8.1 — Experiência e dados de saúde**

- Feito: Painel do cliente com oito indicadores principais, tabelas, filtro e os mesmos dados demonstrativos vistos pelo médico.
- Em desenvolvimento / próximo passo: Coleta/sincronização real, estado emocional e permissões do paciente ainda não implementados.
- Executor: Codex

🟡 **8.2 — Exames e histórico**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar exames e histórico, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **8.3 — Hidratação**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar hidratação, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **8.4 — Medicamentos e adesão**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar medicamentos e adesão, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **8.5 — Chat da IA Médica e chat com o profissional**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar chat da ia médica e chat com o profissional, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **8.6 — Vencer hábitos**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar vencer hábitos, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **8.7 — Benefícios e atendimento**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar benefícios e atendimento, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **8.8 — Alimentação**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar alimentação, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **8.9 — Treino de academia**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar treino de academia, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **8.10 — Visão integrada, índices e incentivo**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar visão integrada, índices e incentivo, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **9 — Loja do Super ADM e loja da clínica**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar loja do super adm e loja da clínica, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **9.1 — Catálogo central**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar catálogo central, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **9.2 — Catálogo e venda da clínica**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar catálogo e venda da clínica, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **9.3 — Operação comercial**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar operação comercial, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **10 — Integração dos módulos e notificações**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar integração dos módulos e notificações, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **11 — Critérios de aceite propostos — aplicativo e loja**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar critérios de aceite propostos — aplicativo e loja, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🔵 ✅ **12 — Super ADM — gestão global e visão da clínica**

- Feito: Lista/busca de clínicas e gráficos administrativos derivados dos cadastros fictícios.
- Em desenvolvimento / próximo passo: Implementar gestão, vínculos, agenda e fechamento financeiro reais.
- Executor: Lovable, Antigravity, Codex

🔵 ✅ **12.1 — Clínicas e acesso administrativo**

- Feito: Duas clínicas demonstrativas, busca, seleção e personalização por ID imutável; Super ADM conserva PlugPix.
- Em desenvolvimento / próximo passo: Cadastro e administração reais, permissões, contratos e liberação de módulos ainda pendentes.
- Executor: Lovable, Antigravity, Codex

🟡 **12.2 — Médicos, cadastro e vínculos**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar médicos, cadastro e vínculos, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **12.3 — Clientes, uso, agenda e pagamentos**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar clientes, uso, agenda e pagamentos, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🔵 ✅ **12.4 — Vidas e faturamento mensal da clínica**

- Feito: Contagens demonstrativas de vidas habilitadas e distribuição por clínica; nenhum faturamento inventado.
- Em desenvolvimento / próximo passo: Implementar fechamento mensal, cobrança por vida e registros financeiros persistentes.
- Executor: Lovable, Codex

🔵 ✅ **13 — Planos comerciais e configuração dos serviços**

- Feito: Catálogo local de rascunhos de telemedicina e pulseira com validação e tratamento de erro no navegador.
- Em desenvolvimento / próximo passo: Implementar contratos, venda e ativação real; consolidar condições comerciais pendentes.
- Executor: Antigravity, Codex

🟡 **13.1 — Contrato de uso da clínica com a PlugPix**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar contrato de uso da clínica com a plugpix, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🔵 ✅ **13.2 — Catálogo-base de telemedicina e venda pela clínica**

- Feito: CRUD local de rascunhos, sete opções de serviço, coparticipação e condições opcionais sem ativação comercial.
- Em desenvolvimento / próximo passo: Consolidar Grupo32, carência/fidelidade e implementar venda e persistência no servidor.
- Executor: Antigravity, Codex

🔵 ✅ **13.3 — Pulseira inteligente — plano-base**

- Feito: Rascunhos com preço de ativação/mensalidade e opções independentes de médico, IA e fidelidade.
- Em desenvolvimento / próximo passo: Definir modalidades e condições pendentes e integrar plano comercial e dispositivo reais.
- Executor: Antigravity, Codex

🟡 **13.4 — Três camadas comerciais**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar três camadas comerciais, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **14 — Critérios de aceite propostos — Super ADM e planos**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar critérios de aceite propostos — super adm e planos, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **15 — Blog central e blog no aplicativo**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar blog central e blog no aplicativo, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **16 — Academy para clínicas**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar academy para clínicas, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **17 — Indique e Ganhe**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar indique e ganhe, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **17.1 — Configuração da clínica**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar configuração da clínica, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **17.2 — Aplicativo do cliente**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar aplicativo do cliente, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **18 — Dependentes e plano familiar**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar dependentes e plano familiar, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **19 — Financeiro do cliente, inadimplência e plano ativo**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar financeiro do cliente, inadimplência e plano ativo, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **19.1 — Financeiro no aplicativo**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar financeiro no aplicativo, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **19.2 — Um plano ativo e upgrade**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar um plano ativo e upgrade, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **20 — Planos & Produtos do ADM da clínica**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar planos & produtos do adm da clínica, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **21 — CRM de vendas e agente de IA**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar crm de vendas e agente de ia, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **21.1 — Funis e leads**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar funis e leads, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **22 — Integrações por clínica**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar integrações por clínica, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **23 — Equipe de vendas, hierarquia e comissões**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar equipe de vendas, hierarquia e comissões, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **23.1 — Estrutura**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar estrutura, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **23.2 — Links, ofertas e atribuição**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar links, ofertas e atribuição, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **23.3 — Cálculo e estados da comissão**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar cálculo e estados da comissão, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **23.4 — Painéis e alcance**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar painéis e alcance, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **24 — Critérios de aceite propostos — conteúdo, indicações e operação comercial**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar critérios de aceite propostos — conteúdo, indicações e operação comercial, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **25 — Pulseira Inteligente — gestão central no Super ADM**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar pulseira inteligente — gestão central no super adm, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **25.1 — Cadastro, estoque e expedição**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar cadastro, estoque e expedição, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **25.2 — Firmware, identificação e autorização**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar firmware, identificação e autorização, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **25.3 — Monitoramento e vínculo**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar monitoramento e vínculo, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **25.4 — Inativação e cancelamento**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar inativação e cancelamento, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **25.5 — Pulseiras e estoque no ADM da clínica**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar pulseiras e estoque no adm da clínica, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **26 — Critérios de aceite propostos — ciclo da pulseira**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar critérios de aceite propostos — ciclo da pulseira, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🔵 ✅ **27 — Bioimpedância — balança integrada**

- Feito: Interface de bioimpedância com medições fictícias compartilhada entre cliente e médico.
- Em desenvolvimento / próximo passo: Escolher balança, validar protocolo, integrar medidas e implementar gestão operacional e acesso real.
- Executor: Codex

🔵 ✅ **27.1 — Escopo e aplicativo do paciente**

- Feito: Oito medições fictícias, três gráficos de composição corporal, unidades, horários, filtro e tabelas.
- Em desenvolvimento / próximo passo: Integrar uma balança homologada e apresentar somente métricas efetivamente suportadas.
- Executor: Codex

🔵 ✅ **27.2 — Histórico clínico, IA e visibilidade administrativa**

- Feito: Médico e cliente consomem o mesmo componente e a mesma fonte estática de dados demonstrativos.
- Em desenvolvimento / próximo passo: Implementar histórico persistente, autorização clínica, auditoria e IA; alcance administrativo clínico permanece pendente.
- Executor: Codex

🟡 **27.3 — Gestão central no Super ADM**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar gestão central no super adm, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **27.4 — Gestão no ADM da clínica**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar gestão no adm da clínica, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **27.5 — Uso individual ou compartilhado e identificação do paciente**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar uso individual ou compartilhado e identificação do paciente, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **27.6 — Integração e status em tempo real**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar integração e status em tempo real, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **27.7 — Plano, habilitação e cobrança**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar plano, habilitação e cobrança, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **28 — Critérios de aceite propostos — bioimpedância**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar critérios de aceite propostos — bioimpedância, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **29 — Inovações aprovadas — Super ADM**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar inovações aprovadas — super adm, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **29.1 — Simulador de rentabilidade**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar simulador de rentabilidade, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **29.2 — Central de funcionamento da plataforma**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar central de funcionamento da plataforma, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **29.3 — Implantação guiada de clínicas**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar implantação guiada de clínicas, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **29.4 — Laboratório de qualidade da IA**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar laboratório de qualidade da ia, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **30 — Inovações aprovadas — clínica e equipe**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar inovações aprovadas — clínica e equipe, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **30.1 — Jornadas configuráveis**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar jornadas configuráveis, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **30.2 — Fila de próximos passos**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar fila de próximos passos, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **30.3 — Resumo preparatório da consulta**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar resumo preparatório da consulta, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **30.4 — Retenção orientada por relacionamento**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar retenção orientada por relacionamento, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🔵 ✅ **31 — Inovações aprovadas — aplicativo do cliente**

- Feito: Novo painel Meu dia e navegação móvel adaptada ao acompanhamento demonstrativo.
- Em desenvolvimento / próximo passo: Integrar rotina real, preparação da consulta, linha do tempo, metas e privacidade.
- Executor: Lovable, Antigravity, Codex

🔵 ✅ **31.1 — Meu dia**

- Feito: Meu dia apresenta composição corporal, atividade e descanso fictícios com acesso aos demais módulos.
- Em desenvolvimento / próximo passo: Conectar agenda, medicamentos, hidratação e demais próximos passos reais do paciente.
- Executor: Codex

🟡 **31.2 — Preparação para a consulta**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar preparação para a consulta, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **31.3 — Linha do tempo contextual**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar linha do tempo contextual, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **31.4 — Metas pequenas e adaptáveis**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar metas pequenas e adaptáveis, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **31.5 — Central de privacidade**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar central de privacidade, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **32 — Protocolos de acompanhamento da clínica**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar protocolos de acompanhamento da clínica, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **32.1 — Criação e composição**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar criação e composição, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **32.2 — Avaliação e decisão médica**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar avaliação e decisão médica, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **32.3 — Apto — liberação do acompanhamento**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar apto — liberação do acompanhamento, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **32.4 — Não apto — encaminhamento**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar não apto — encaminhamento, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **32.5 — Estados, plano ativo e evolução**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar estados, plano ativo e evolução, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **32.6 — Critérios de aceite propostos — protocolos**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar critérios de aceite propostos — protocolos, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🟡 **33 — Critérios de aceite propostos — inovações aprovadas**

- Feito: Ainda não há implementação funcional deste requisito validada.
- Em desenvolvimento / próximo passo: Falta implementar e validar critérios de aceite propostos — inovações aprovadas, respeitando as decisões pendentes do PRD.
- Executor: Nenhum executor; não iniciado.

🔵 ✅ **34 — Prioridade recomendada e decisões pendentes**

- Feito: Roadmap e matriz registram etapas, dependências, limites e decisões pendentes.
- Em desenvolvimento / próximo passo: Atualizar prioridades com a fundação real, dispositivos homologados e regras consolidadas.
- Executor: Antigravity, Codex
