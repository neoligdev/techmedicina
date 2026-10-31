# Plano mestre de execução — PRD v0.11.3

20/10/2026 · Codex · revisão da retomada após Antigravity D112.

## Escopo e verdade operacional

Este plano cobre os 101 identificadores das 34 seções do PRD e os grupos transversais dos adendos. Não transforma entregas técnicas em percentual de produto. Os requisitos permanecem no PRD; instruções históricas de pausa documental/Antigravity são superadas pela transferência humana atual, sem aprovar DNS, permissões clínicas ou publicação remota de impacto.

Camadas distintas: demonstrativo; implementação isolada; integração local; persistência local; homologação Cloud; disponível na UI; validado ponta a ponta; pronto para operação. Nenhum grupo abaixo está declarado integralmente pronto para operação. Textos históricos do catálogo são rastreabilidade, não prova atual nem autorização.

Evidências desta retomada: working tree D112 em cinco arquivos; HEAD inicial a9b8597 e dois commits locais após bb809f5; main 111b397. Cloud consultado somente em leitura: ausência das tabelas 014/015, ausência de time_zone e tm_save_clinic com quatro argumentos. Status de domínio restrito a pending_verification. Lovable conectado à main e mostrando sincronização com GitHub; push do checkpoint não atualiza esse preview.

Lacunas críticas encontradas no código: leitor padrão da agenda é um executor que sempre retorna 503; AGENDA_OPERATIONAL_ENABLED continua desabilitada. A reserva de domínio não constitui posse, DNS ou TLS. As políticas atuais permitem leitura da tabela de domínios apenas a operadores; médico necessita futura resolução mínima mediada no servidor, sem liberar a tabela inteira.

## Ordem por dependências

1. Consolidar D112 revisada, preservar autoria Antigravity e proteger commits no checkpoint.
2. Implementar ciclo White Label: desafio de posse por domínio/revisão, verificação por servidor, DNS e TLS com evidência e validade explícitas; ativação autorizada; suspensão/revogação e auditoria. Não ativar por booleanos enviados pelo cliente. Migração local antes de aplicação remota aprovada.
3. Antes de integração na main, proteger cadastro administrativo contra schema anterior à 016: consultas atuais incluem time_zone e RPC envia quinto argumento ausentes no Cloud. D115 implementa compatibilidade explícita de leitura e escrita sem fuso solicitado; ainda falta homologação remota. Manter migração revisada/autorizada para configurar fuso; nunca remover o fuso silenciosamente. Inspecionar ingresso/hosts e configuração de hospedagem; resolução mínima autorizada e contexto consistente em cada requisição. Homologar dois tenants e seus PWAs sem mudar identidades.
4. Revisar/aplicar migrações 014–016 somente após ambiente, dependências, backup/recuperação e aprovação concreta. Remover placeholder do leitor da agenda usando transporte same-bearer compatível com o backend, sem execução SQL arbitrária nem service_role clínico.
5. Integrar Jornadas/metas/escudos e agenda existentes, depois prontuário/anexos e protocolos com regras clínicas necessárias. Não implementar cálculo real VITALIDADE antes de validação metodológica.
6. Catálogo/contratos/entitlements persistidos, pacientes/dependentes e equipes antes de cobrança, comissões, CRM e canais externos. Solicitar apenas decisões comerciais realmente bloqueantes, mantendo trabalho independente.
7. Dispositivos reais/normalização, Dr. IA e WhatsApp oficiais após fornecedores, hardware, opt-in e regras aprovadas. Conteúdos/Academy e fluxos administrativos podem avançar independentemente de fórmula clínica.
8. Homologação completa por perfil/origem, PWA instalado, recuperação, segurança e aceite por requisito. Produção só após revisão e autorização específicas. Corporativo permanece preparação futura, sem portal completo agora.

## Grupos transversais dos adendos

| Adendo | Integração prevista | Dependências e aceite |
|---|---|---|
| §1 Catálogo e contratos | Componentes independentes TM-2/3/4, hardware, IA, protocolo e suplementos; ofertas N:N por clínica; sem limite de três planos | Congelar condições na venda e validar entitlements no servidor; lista das 32 áreas, TM-4 e condições abertas não serão inventadas |
| §2 Objetivos e médico longitudinal | Objetivos individuais e tendências autorizadas | Dados com fonte/qualidade e médico da mesma clínica; prioridade operacional não é diagnóstico |
| §3 Dr. IA | Ingestão, contextualização, regras, interação, memória e reavaliação | Motor central e identidade clínica; memórias/finalidades segregadas; sem prescrição ou autonomia clínica |
| §5 Corporativo | Preparação arquitetural futura | Apenas agregados não reidentificáveis; sem portal completo nesta prioridade |
| §6 Suplementos | SKU, composição, lote/validade, estoque e fornecedor | Regularização e regras comerciais/profissionais antes de venda real |
| §9 White Label | Central separado, gestão/médico por clínica e PWA em origem distinta | Prova de posse + DNS/TLS + vínculo autorizado; mudanças de host preservam UUID; CORS/callbacks e instalação homologados |
| §11.1–3 VITALIDADE | Cobertura e tendências, sem valor numérico real | Método/população/pesos/validade aprovados antes de fórmula ou alegação clínica |
| §11.4 JORNADA | Metas elegíveis, eventos idempotentes, normalização candidata | Medicação prescrita, descanso/pausas e equidade entre planos; parâmetros finais ainda sujeitos a aprovação |
| §11.5–6 ESCUDOS/adaptação | Média candidata, regressão controlada e conquistas preservadas | Não preencher ausências com zero; adaptação clínica por profissional; versões auditáveis |
| §11.7–8 Biblioteca/UI | Artes centrais seguras, histórico PWA e painel médico | Storage/autorização/auditoria reais; clínica não altera regra/arte central; teste ponta a ponta dos nove aceites |

## Política de integração Git/Lovable

Trabalhar no checkpoint existente. Não reescrever histórico. Após regressão completa e revisão de segredos/diff, preparar PR para main com alterações e gates documentados; não mesclar automaticamente nem publicar. Confirmar no Lovable o commit e o comportamento renderizado após eventual integração autorizada. UI de histórico pode exibir avisos antigos: não concluir falha atual apenas por esses avisos.

## Matriz por requisito

Cada ficha abaixo mantém identificador e expectativa do PRD, registra a evidência do catálogo e o próximo incremento. O agrupamento define dependências, migrações e aceite mínimos; os critérios integrais do PRD prevalecem. Ausência de prova de operação é marcada como pendência, não como conclusão.

### PRD 1 — Processo e estado das decisões

- Módulo: Fundação e White Label. Prioridade: P0.
- Funcionalidade esperada: Processo e estado das decisões, conforme blocos integrais de PRD 1.
- Estado: Parcial; separar demonstração, código local e evidência remota.
- Evidência histórica / implementação: PRD preservado, matriz de requisitos e registros de continuidade criados.
- Código de referência do grupo: src/lib/auth; src/lib/clinic; src/lib/white-label; src/lib/admin; src/routes/api/platform.
- Integrações e dependências: Auth, domínio, tenant e papéis verificados; sem selector como autoridade.
- Migração necessária / estado: 001–007 existentes; 014–016 pendentes remotos. Ciclo de domínio requer migração aditiva futura revisada.
- Testes exigidos e critério objetivo mínimo: Testar reserva/prova DNS/TLS/ativação/suspensão e isolamento A/B; aceitar somente host ativo com sessão e recurso do mesmo tenant.
- Pendência Cloud e interface: Cadastro/auditoria administrativos têm evidência histórica; revalidar estado atual. Branding demo preservado; SSR por host ainda parcial.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Consolidar decisões abertas e manter este relatório a cada etapa.


### PRD 2 — Visão e arquitetura funcional

- Módulo: Fundação e White Label. Prioridade: P0.
- Funcionalidade esperada: Visão e arquitetura funcional, conforme blocos integrais de PRD 2.
- Estado: Parcial; separar demonstração, código local e evidência remota.
- Evidência histórica / implementação: Quatro áreas demonstrativas e design preservados. Cloud multi-tenant com Auth, RLS, cadastro/auditoria e marca por UUID; Super ADM e salvar/recarregar marca QA homologados. Reservas White Label pendentes persistem no Cloud, com mensagem de duplicidade verificada. Paginação e contratos locais de host/rota/identidade testados. Domínio techmedicina.com.br e Registro.br informados pelo proprietário; sugestões de hosts implementadas sem ativação.
- Código de referência do grupo: src/lib/auth; src/lib/clinic; src/lib/white-label; src/lib/admin; src/routes/api/platform.
- Integrações e dependências: Auth, domínio, tenant e papéis verificados; sem selector como autoridade.
- Migração necessária / estado: 001–007 existentes; 014–016 pendentes remotos. Ciclo de domínio requer migração aditiva futura revisada.
- Testes exigidos e critério objetivo mínimo: Testar reserva/prova DNS/TLS/ativação/suspensão e isolamento A/B; aceitar somente host ativo com sessão e recurso do mesmo tenant.
- Pendência Cloud e interface: Cadastro/auditoria administrativos têm evidência histórica; revalidar estado atual. Branding demo preservado; SSR por host ainda parcial.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Integrar registro e contexto confiável ao SSR/APIs, layouts e PWA por origem; verificar posse/TLS, callbacks e duas clínicas autorizadas antes de ativar hosts. A demo unificada continua disponível.


### PRD 3 — Módulo Médico

- Módulo: Área médica e protocolos. Prioridade: P1.
- Funcionalidade esperada: Módulo Médico, conforme blocos integrais de PRD 3.
- Estado: Parcial; separar demonstração, código local e evidência remota.
- Evidência histórica / implementação: Prévia médica navegável e painel de indicadores demonstrativos compartilhado com o cliente.
- Código de referência do grupo: src/features/agenda; src/features/journey; src/lib/agenda; src/lib/security.
- Integrações e dependências: White Label ativo, profissional verificado, vínculo/grants e paciente autorizado; keystore real e regras clínicas.
- Migração necessária / estado: 015/016 locais para agenda; novas migrações clínicas após desenho/revisão.
- Testes exigidos e critério objetivo mínimo: Testar acesso A/B, revogação, imutabilidade, autoria e reconciliação. Aceitar fluxo integrado de consulta/registro/anexos sem atalhos de autorização.
- Pendência Cloud e interface: Agenda tem workspace integrado mas flag desabilitada; leitor padrão retorna 503. Prontuário/documentos/vídeo ainda sem fluxo operacional.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Concluir identificação, prontuário, exames, agenda e comunicação com segurança real.


### PRD 3.1 — Identificação e autorização

- Módulo: Área médica e protocolos. Prioridade: P1.
- Funcionalidade esperada: Identificação e autorização, conforme blocos integrais de PRD 3.1.
- Estado: Parcial; separar demonstração, código local e evidência remota.
- Evidência histórica / implementação: Auth getUser e identidade persistida com vínculos/grants e RLS implementados. Login real do Super ADM homologado, sem acesso clínico automático. Contrato local por host restringe clínica/papel e conta multivínculo; ainda sem integração ao SSR. Validação de registro médico produtiva não implementada.
- Código de referência do grupo: src/features/agenda; src/features/journey; src/lib/agenda; src/lib/security.
- Integrações e dependências: White Label ativo, profissional verificado, vínculo/grants e paciente autorizado; keystore real e regras clínicas.
- Migração necessária / estado: 015/016 locais para agenda; novas migrações clínicas após desenho/revisão.
- Testes exigidos e critério objetivo mínimo: Testar acesso A/B, revogação, imutabilidade, autoria e reconciliação. Aceitar fluxo integrado de consulta/registro/anexos sem atalhos de autorização.
- Pendência Cloud e interface: Agenda tem workspace integrado mas flag desabilitada; leitor padrão retorna 503. Prontuário/documentos/vídeo ainda sem fluxo operacional.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Provisionar vínculos somente após verificar contas e aprovar concessões específicas; homologar médico/paciente e isolamento real entre clínicas, além da verificação profissional e contexto por domínio.


### PRD 3.2 — Prontuário e evoluções

- Módulo: Área médica e protocolos. Prioridade: P1.
- Funcionalidade esperada: Prontuário e evoluções, conforme blocos integrais de PRD 3.2.
- Estado: Parcial; separar demonstração, código local e evidência remota.
- Evidência histórica / implementação: Ainda não há prontuário funcional validado. C010 (executor OpenCode) implementa unidade de criptografia server-only AES-256-GCM para o texto clínico, com testes unitários e endurecimento R1 (snapshot de contexto, IV/limites estritos); sem persistência, guarda, UI ou assinatura.
- Código de referência do grupo: src/features/agenda; src/features/journey; src/lib/agenda; src/lib/security.
- Integrações e dependências: White Label ativo, profissional verificado, vínculo/grants e paciente autorizado; keystore real e regras clínicas.
- Migração necessária / estado: 015/016 locais para agenda; novas migrações clínicas após desenho/revisão.
- Testes exigidos e critério objetivo mínimo: Testar acesso A/B, revogação, imutabilidade, autoria e reconciliação. Aceitar fluxo integrado de consulta/registro/anexos sem atalhos de autorização.
- Pendência Cloud e interface: Agenda tem workspace integrado mas flag desabilitada; leitor padrão retorna 503. Prontuário/documentos/vídeo ainda sem fluxo operacional.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar prontuário e evoluções, respeitando as decisões pendentes do PRD.


### PRD 3.3 — Dados de saúde e IA

- Módulo: Área médica e protocolos. Prioridade: P1.
- Funcionalidade esperada: Dados de saúde e IA, conforme blocos integrais de PRD 3.3.
- Estado: Parcial; separar demonstração, código local e evidência remota.
- Evidência histórica / implementação: Bioimpedância e pulseira com números fictícios, gráficos, histórico e tabelas na visão médica.
- Código de referência do grupo: src/features/agenda; src/features/journey; src/lib/agenda; src/lib/security.
- Integrações e dependências: White Label ativo, profissional verificado, vínculo/grants e paciente autorizado; keystore real e regras clínicas.
- Migração necessária / estado: 015/016 locais para agenda; novas migrações clínicas após desenho/revisão.
- Testes exigidos e critério objetivo mínimo: Testar acesso A/B, revogação, imutabilidade, autoria e reconciliação. Aceitar fluxo integrado de consulta/registro/anexos sem atalhos de autorização.
- Pendência Cloud e interface: Agenda tem workspace integrado mas flag desabilitada; leitor padrão retorna 503. Prontuário/documentos/vídeo ainda sem fluxo operacional.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Integrar coleta real e IA validada; estados emocionais e análise clínica ainda pendentes.


### PRD 3.4 — Exames e documentos

- Módulo: Área médica e protocolos. Prioridade: P1.
- Funcionalidade esperada: Exames e documentos, conforme blocos integrais de PRD 3.4.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/agenda; src/features/journey; src/lib/agenda; src/lib/security.
- Integrações e dependências: White Label ativo, profissional verificado, vínculo/grants e paciente autorizado; keystore real e regras clínicas.
- Migração necessária / estado: 015/016 locais para agenda; novas migrações clínicas após desenho/revisão.
- Testes exigidos e critério objetivo mínimo: Testar acesso A/B, revogação, imutabilidade, autoria e reconciliação. Aceitar fluxo integrado de consulta/registro/anexos sem atalhos de autorização.
- Pendência Cloud e interface: Agenda tem workspace integrado mas flag desabilitada; leitor padrão retorna 503. Prontuário/documentos/vídeo ainda sem fluxo operacional.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar exames e documentos, respeitando as decisões pendentes do PRD.


### PRD 3.5 — Agenda e pacientes

- Módulo: Área médica e protocolos. Prioridade: P1.
- Funcionalidade esperada: Agenda e pacientes, conforme blocos integrais de PRD 3.5.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/agenda; src/features/journey; src/lib/agenda; src/lib/security.
- Integrações e dependências: White Label ativo, profissional verificado, vínculo/grants e paciente autorizado; keystore real e regras clínicas.
- Migração necessária / estado: 015/016 locais para agenda; novas migrações clínicas após desenho/revisão.
- Testes exigidos e critério objetivo mínimo: Testar acesso A/B, revogação, imutabilidade, autoria e reconciliação. Aceitar fluxo integrado de consulta/registro/anexos sem atalhos de autorização.
- Pendência Cloud e interface: Agenda tem workspace integrado mas flag desabilitada; leitor padrão retorna 503. Prontuário/documentos/vídeo ainda sem fluxo operacional.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar agenda e pacientes, respeitando as decisões pendentes do PRD.


### PRD 3.6 — Chat e vídeo

- Módulo: Área médica e protocolos. Prioridade: P1.
- Funcionalidade esperada: Chat e vídeo, conforme blocos integrais de PRD 3.6.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/agenda; src/features/journey; src/lib/agenda; src/lib/security.
- Integrações e dependências: White Label ativo, profissional verificado, vínculo/grants e paciente autorizado; keystore real e regras clínicas.
- Migração necessária / estado: 015/016 locais para agenda; novas migrações clínicas após desenho/revisão.
- Testes exigidos e critério objetivo mínimo: Testar acesso A/B, revogação, imutabilidade, autoria e reconciliação. Aceitar fluxo integrado de consulta/registro/anexos sem atalhos de autorização.
- Pendência Cloud e interface: Agenda tem workspace integrado mas flag desabilitada; leitor padrão retorna 503. Prontuário/documentos/vídeo ainda sem fluxo operacional.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar chat e vídeo, respeitando as decisões pendentes do PRD.


### PRD 4 — Segurança — definição e recomendações

- Módulo: Fundação e White Label. Prioridade: P0.
- Funcionalidade esperada: Segurança — definição e recomendações, conforme blocos integrais de PRD 4.
- Estado: Parcial; separar demonstração, código local e evidência remota.
- Evidência histórica / implementação: Negação por padrão, Auth verificado, RLS nas fundações Cloud, escritas administrativas por RPC e auditoria, revisão de marca e validação de texturas implementados. Cadastro/marca/reserva QA testados com sessão real. Contratos locais de host/rota/identidade e criptografia AES-256-GCM unitária testados. Revisão de dependências registrada; isso não atesta segurança integral ou conformidade.
- Código de referência do grupo: src/lib/auth; src/lib/clinic; src/lib/white-label; src/lib/admin; src/routes/api/platform.
- Integrações e dependências: Auth, domínio, tenant e papéis verificados; sem selector como autoridade.
- Migração necessária / estado: 001–007 existentes; 014–016 pendentes remotos. Ciclo de domínio requer migração aditiva futura revisada.
- Testes exigidos e critério objetivo mínimo: Testar reserva/prova DNS/TLS/ativação/suspensão e isolamento A/B; aceitar somente host ativo com sessão e recurso do mesmo tenant.
- Pendência Cloud e interface: Cadastro/auditoria administrativos têm evidência histórica; revalidar estado atual. Branding demo preservado; SSR por host ainda parcial.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Concluir contexto de host no runtime, keystore/rotação/backup reais, recursos clínicos autorizados e auditados, retenção e validações de produção. Criptografia unitária não equivale a prontuário implantado.


### PRD 5 — Compartilhamento dentro da mesma clínica

- Módulo: Fundação e White Label. Prioridade: P0.
- Funcionalidade esperada: Compartilhamento dentro da mesma clínica, conforme blocos integrais de PRD 5.
- Estado: Parcial; separar demonstração, código local e evidência remota.
- Evidência histórica / implementação: Ainda não há implementação funcional validada; C009 (executor OpenCode) registrou apenas auditoria local. Compartilhamento isolado por clínica permanece sem camada real. C013 (Codex): migração aditiva de clínicas/vínculos/grants, RLS de leitura própria e resolvedor persistido com testes PostgreSQL em memória; aplicação C013 verificada no Cloud, sem E2E com conta real.
- Código de referência do grupo: src/lib/auth; src/lib/clinic; src/lib/white-label; src/lib/admin; src/routes/api/platform.
- Integrações e dependências: Auth, domínio, tenant e papéis verificados; sem selector como autoridade.
- Migração necessária / estado: 001–007 existentes; 014–016 pendentes remotos. Ciclo de domínio requer migração aditiva futura revisada.
- Testes exigidos e critério objetivo mínimo: Testar reserva/prova DNS/TLS/ativação/suspensão e isolamento A/B; aceitar somente host ativo com sessão e recurso do mesmo tenant.
- Pendência Cloud e interface: Cadastro/auditoria administrativos têm evidência histórica; revalidar estado atual. Branding demo preservado; SSR por host ainda parcial.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar compartilhamento dentro da mesma clínica, respeitando as decisões pendentes do PRD.


### PRD 6 — Dispositivo e contexto anterior

- Módulo: Dispositivos e integração. Prioridade: P2.
- Funcionalidade esperada: Dispositivo e contexto anterior, conforme blocos integrais de PRD 6.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/demo/health-data.ts; src/components/platform/health-dashboard.tsx.
- Integrações e dependências: Modelo físico, documentação oficial/SDK/BLE, autorização de unidade, consentimento e vínculo temporal.
- Migração necessária / estado: Cadastro/telemetria/estoque produtivos exigem desenho e migrações; nenhum fornecedor fixado.
- Testes exigidos e critério objetivo mínimo: Testar hardware real, unidade/paciente correto, dados tardios, duplicatas, unidades, bateria datada e revogação; aceitar somente métricas homologadas.
- Pendência Cloud e interface: Dados de demonstração compartilhados entre dashboards; nenhuma integração H59MAX/balança/anel homologada.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar dispositivo e contexto anterior, respeitando as decisões pendentes do PRD.


### PRD 7 — Critérios de aceite propostos para o módulo Médico

- Módulo: Área médica e protocolos. Prioridade: P1.
- Funcionalidade esperada: Critérios de aceite propostos para o módulo Médico, conforme blocos integrais de PRD 7.
- Estado: Parcial; separar demonstração, código local e evidência remota.
- Evidência histórica / implementação: Ainda não há implementação funcional validada; critério 3 (texto clínico cifrado em repouso) iniciado parcialmente por C010 (executor OpenCode), com unidade de criptografia sem persistência. Demais critérios pendentes.
- Código de referência do grupo: src/features/agenda; src/features/journey; src/lib/agenda; src/lib/security.
- Integrações e dependências: White Label ativo, profissional verificado, vínculo/grants e paciente autorizado; keystore real e regras clínicas.
- Migração necessária / estado: 015/016 locais para agenda; novas migrações clínicas após desenho/revisão.
- Testes exigidos e critério objetivo mínimo: Testar acesso A/B, revogação, imutabilidade, autoria e reconciliação. Aceitar fluxo integrado de consulta/registro/anexos sem atalhos de autorização.
- Pendência Cloud e interface: Agenda tem workspace integrado mas flag desabilitada; leitor padrão retorna 503. Prontuário/documentos/vídeo ainda sem fluxo operacional.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar critérios de aceite propostos para o módulo médico, respeitando as decisões pendentes do PRD.


### PRD 8 — Aplicativo do cliente/paciente

- Módulo: PWA e acompanhamento. Prioridade: P1.
- Funcionalidade esperada: Aplicativo do cliente/paciente, conforme blocos integrais de PRD 8.
- Estado: Parcial; separar demonstração, código local e evidência remota.
- Evidência histórica / implementação: Aplicativo navegável, design responsivo, seis gráficos, histórico fictício e base PWA sem cache de saúde. C028 (Antigravity): novo visual resumido mobile-first com topo limpo, fontes ampliadas (28–32px), avisos compactos, protocolo, plano e score lado a lado, humor e sono interativos independentes com 5 emojis, água com ação rápida '+ Água', grade de 12 atalhos rigorosamente quadrados (1:1) em 3 colunas mobile com textura e vidro fosco translúcido, seção expansível 'Mais recursos' e rodapé fixo de 6 destinos com modais interativos e suporte a tema claro e escuro e bloqueio por inadimplência.
- Código de referência do grupo: src/features/journey; src/features/demo; src/components/platform; public.
- Integrações e dependências: Host PWA, assinatura/entitlements, paciente/representação, eventos clínicos autorizados.
- Migração necessária / estado: 008–013 têm evidências Cloud históricas; 014 ausente em inspeção atual; demais fluxos exigem migração futura.
- Testes exigidos e critério objetivo mínimo: Testar próprio paciente, fontes/unidades, dados ausentes, idempotência, mobile/PWA. Aceitar registro real refletido para paciente e médico autorizado.
- Pendência Cloud e interface: Interface e gráficos demonstrativos; Jornada local/persistência parcial; VITALIDADE numérica desativada. Instalação por origem ainda não homologada.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Integrar telemetria real dos dispositivos (pulseira/balança), serviços de telemedicina e sincronização em nuvem quando as APIs de produção forem liberadas.


### PRD 8.1 — Experiência e dados de saúde

- Módulo: PWA e acompanhamento. Prioridade: P1.
- Funcionalidade esperada: Experiência e dados de saúde, conforme blocos integrais de PRD 8.1.
- Estado: Parcial; separar demonstração, código local e evidência remota.
- Evidência histórica / implementação: Painel do cliente com oito indicadores principais, tabelas, filtro e os mesmos dados demonstrativos vistos pelo médico.
- Código de referência do grupo: src/features/journey; src/features/demo; src/components/platform; public.
- Integrações e dependências: Host PWA, assinatura/entitlements, paciente/representação, eventos clínicos autorizados.
- Migração necessária / estado: 008–013 têm evidências Cloud históricas; 014 ausente em inspeção atual; demais fluxos exigem migração futura.
- Testes exigidos e critério objetivo mínimo: Testar próprio paciente, fontes/unidades, dados ausentes, idempotência, mobile/PWA. Aceitar registro real refletido para paciente e médico autorizado.
- Pendência Cloud e interface: Interface e gráficos demonstrativos; Jornada local/persistência parcial; VITALIDADE numérica desativada. Instalação por origem ainda não homologada.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Coleta/sincronização real, estado emocional e permissões do paciente ainda não implementados.


### PRD 8.2 — Exames e histórico

- Módulo: PWA e acompanhamento. Prioridade: P1.
- Funcionalidade esperada: Exames e histórico, conforme blocos integrais de PRD 8.2.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/journey; src/features/demo; src/components/platform; public.
- Integrações e dependências: Host PWA, assinatura/entitlements, paciente/representação, eventos clínicos autorizados.
- Migração necessária / estado: 008–013 têm evidências Cloud históricas; 014 ausente em inspeção atual; demais fluxos exigem migração futura.
- Testes exigidos e critério objetivo mínimo: Testar próprio paciente, fontes/unidades, dados ausentes, idempotência, mobile/PWA. Aceitar registro real refletido para paciente e médico autorizado.
- Pendência Cloud e interface: Interface e gráficos demonstrativos; Jornada local/persistência parcial; VITALIDADE numérica desativada. Instalação por origem ainda não homologada.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar exames e histórico, respeitando as decisões pendentes do PRD.


### PRD 8.3 — Hidratação

- Módulo: PWA e acompanhamento. Prioridade: P1.
- Funcionalidade esperada: Hidratação, conforme blocos integrais de PRD 8.3.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/journey; src/features/demo; src/components/platform; public.
- Integrações e dependências: Host PWA, assinatura/entitlements, paciente/representação, eventos clínicos autorizados.
- Migração necessária / estado: 008–013 têm evidências Cloud históricas; 014 ausente em inspeção atual; demais fluxos exigem migração futura.
- Testes exigidos e critério objetivo mínimo: Testar próprio paciente, fontes/unidades, dados ausentes, idempotência, mobile/PWA. Aceitar registro real refletido para paciente e médico autorizado.
- Pendência Cloud e interface: Interface e gráficos demonstrativos; Jornada local/persistência parcial; VITALIDADE numérica desativada. Instalação por origem ainda não homologada.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar hidratação, respeitando as decisões pendentes do PRD.


### PRD 8.4 — Medicamentos e adesão

- Módulo: PWA e acompanhamento. Prioridade: P1.
- Funcionalidade esperada: Medicamentos e adesão, conforme blocos integrais de PRD 8.4.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/journey; src/features/demo; src/components/platform; public.
- Integrações e dependências: Host PWA, assinatura/entitlements, paciente/representação, eventos clínicos autorizados.
- Migração necessária / estado: 008–013 têm evidências Cloud históricas; 014 ausente em inspeção atual; demais fluxos exigem migração futura.
- Testes exigidos e critério objetivo mínimo: Testar próprio paciente, fontes/unidades, dados ausentes, idempotência, mobile/PWA. Aceitar registro real refletido para paciente e médico autorizado.
- Pendência Cloud e interface: Interface e gráficos demonstrativos; Jornada local/persistência parcial; VITALIDADE numérica desativada. Instalação por origem ainda não homologada.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar medicamentos e adesão, respeitando as decisões pendentes do PRD.


### PRD 8.5 — Chat da IA Médica e chat com o profissional

- Módulo: PWA e acompanhamento. Prioridade: P1.
- Funcionalidade esperada: Chat da IA Médica e chat com o profissional, conforme blocos integrais de PRD 8.5.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/journey; src/features/demo; src/components/platform; public.
- Integrações e dependências: Host PWA, assinatura/entitlements, paciente/representação, eventos clínicos autorizados.
- Migração necessária / estado: 008–013 têm evidências Cloud históricas; 014 ausente em inspeção atual; demais fluxos exigem migração futura.
- Testes exigidos e critério objetivo mínimo: Testar próprio paciente, fontes/unidades, dados ausentes, idempotência, mobile/PWA. Aceitar registro real refletido para paciente e médico autorizado.
- Pendência Cloud e interface: Interface e gráficos demonstrativos; Jornada local/persistência parcial; VITALIDADE numérica desativada. Instalação por origem ainda não homologada.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar chat da ia médica e chat com o profissional, respeitando as decisões pendentes do PRD.


### PRD 8.6 — Vencer hábitos

- Módulo: PWA e acompanhamento. Prioridade: P1.
- Funcionalidade esperada: Vencer hábitos, conforme blocos integrais de PRD 8.6.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/journey; src/features/demo; src/components/platform; public.
- Integrações e dependências: Host PWA, assinatura/entitlements, paciente/representação, eventos clínicos autorizados.
- Migração necessária / estado: 008–013 têm evidências Cloud históricas; 014 ausente em inspeção atual; demais fluxos exigem migração futura.
- Testes exigidos e critério objetivo mínimo: Testar próprio paciente, fontes/unidades, dados ausentes, idempotência, mobile/PWA. Aceitar registro real refletido para paciente e médico autorizado.
- Pendência Cloud e interface: Interface e gráficos demonstrativos; Jornada local/persistência parcial; VITALIDADE numérica desativada. Instalação por origem ainda não homologada.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar vencer hábitos, respeitando as decisões pendentes do PRD.


### PRD 8.7 — Benefícios e atendimento

- Módulo: PWA e acompanhamento. Prioridade: P1.
- Funcionalidade esperada: Benefícios e atendimento, conforme blocos integrais de PRD 8.7.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/journey; src/features/demo; src/components/platform; public.
- Integrações e dependências: Host PWA, assinatura/entitlements, paciente/representação, eventos clínicos autorizados.
- Migração necessária / estado: 008–013 têm evidências Cloud históricas; 014 ausente em inspeção atual; demais fluxos exigem migração futura.
- Testes exigidos e critério objetivo mínimo: Testar próprio paciente, fontes/unidades, dados ausentes, idempotência, mobile/PWA. Aceitar registro real refletido para paciente e médico autorizado.
- Pendência Cloud e interface: Interface e gráficos demonstrativos; Jornada local/persistência parcial; VITALIDADE numérica desativada. Instalação por origem ainda não homologada.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar benefícios e atendimento, respeitando as decisões pendentes do PRD.


### PRD 8.8 — Alimentação

- Módulo: PWA e acompanhamento. Prioridade: P1.
- Funcionalidade esperada: Alimentação, conforme blocos integrais de PRD 8.8.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/journey; src/features/demo; src/components/platform; public.
- Integrações e dependências: Host PWA, assinatura/entitlements, paciente/representação, eventos clínicos autorizados.
- Migração necessária / estado: 008–013 têm evidências Cloud históricas; 014 ausente em inspeção atual; demais fluxos exigem migração futura.
- Testes exigidos e critério objetivo mínimo: Testar próprio paciente, fontes/unidades, dados ausentes, idempotência, mobile/PWA. Aceitar registro real refletido para paciente e médico autorizado.
- Pendência Cloud e interface: Interface e gráficos demonstrativos; Jornada local/persistência parcial; VITALIDADE numérica desativada. Instalação por origem ainda não homologada.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar alimentação, respeitando as decisões pendentes do PRD.


### PRD 8.9 — Treino de academia

- Módulo: PWA e acompanhamento. Prioridade: P1.
- Funcionalidade esperada: Treino de academia, conforme blocos integrais de PRD 8.9.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/journey; src/features/demo; src/components/platform; public.
- Integrações e dependências: Host PWA, assinatura/entitlements, paciente/representação, eventos clínicos autorizados.
- Migração necessária / estado: 008–013 têm evidências Cloud históricas; 014 ausente em inspeção atual; demais fluxos exigem migração futura.
- Testes exigidos e critério objetivo mínimo: Testar próprio paciente, fontes/unidades, dados ausentes, idempotência, mobile/PWA. Aceitar registro real refletido para paciente e médico autorizado.
- Pendência Cloud e interface: Interface e gráficos demonstrativos; Jornada local/persistência parcial; VITALIDADE numérica desativada. Instalação por origem ainda não homologada.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar treino de academia, respeitando as decisões pendentes do PRD.


### PRD 8.10 — Visão integrada, índices e incentivo

- Módulo: PWA e acompanhamento. Prioridade: P1.
- Funcionalidade esperada: Visão integrada, índices e incentivo, conforme blocos integrais de PRD 8.10.
- Estado: Parcial; separar demonstração, código local e evidência remota.
- Evidência histórica / implementação: Base local com contratos e permissões por clínica/paciente, metas versionadas, eventos idempotentes, preferências auditadas, suspensão médica e cartões conectados aos contratos HTTP. D60 aplicou fundação SQL 008–012 e D68 aplicou SQL 013 no Cloud. D69 implementou o motor determinístico da pontuação diária JORNADA (0 a 100 pontos, PRD §11.4). D70 implementou o motor determinístico de Escudos e regressão controlada (PRD §11.5, VJE-5). D71 implementou persistência local, histórico imutável e migração 014. D72 consolidou segurança contra fraude de pontuação por clientes, advisory lock contra concorrência, não-regressão de maior escudo e contratos PWA (648 testes aprovados). D73 implementou a Biblioteca Central de Artes dos 5 Escudos com 15 variações gráficas canônicas, sanitizador SVG anti-XSS rigoroso, versionamento SemVer com histórico/rollback, interface administrativa no Super ADM e serviço de catálogo para o PWA (671 testes aprovados). D74 consolidou o inventário do Git, realizou a auditoria de integridade das entregas D69 a D73, classificou as 15 variações de artes como propostas aguardando aprovação humana da PlugPix, auditou a segurança da biblioteca administrativa (armazenamento local/demo no cliente vs. persistência Cloud pendente), desenhou a arquitetura relacional/storage para nuvem e preparou a proposta de checkpoint seguro em commits separados (673 testes aprovados). Migração 014 e armazenamento Cloud das artes pendentes de aplicação; tela Meus Escudos no PWA aguardando implementação.
- Código de referência do grupo: src/features/journey; src/features/demo; src/components/platform; public.
- Integrações e dependências: Host PWA, assinatura/entitlements, paciente/representação, eventos clínicos autorizados.
- Migração necessária / estado: 008–013 têm evidências Cloud históricas; 014 ausente em inspeção atual; demais fluxos exigem migração futura.
- Testes exigidos e critério objetivo mínimo: Testar próprio paciente, fontes/unidades, dados ausentes, idempotência, mobile/PWA. Aceitar registro real refletido para paciente e médico autorizado.
- Pendência Cloud e interface: Interface e gráficos demonstrativos; Jornada local/persistência parcial; VITALIDADE numérica desativada. Instalação por origem ainda não homologada.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Aguardar autorização humana para execução do plano de commits e push ao GitHub. Aguardar autorização para aplicação das migrações no Lovable Cloud e aprovação das artes pelo proprietário. Implementar a tela visual Meus Escudos no PWA (VJE-6). Conectar painel médico e concluir criação/revisão de metas. Metodologia e fórmula de VITALIDADE permanecem pendentes de validação regulatória/clínica.


### PRD 9 — Loja do Super ADM e loja da clínica

- Módulo: Comercial e financeiro. Prioridade: P2.
- Funcionalidade esperada: Loja do Super ADM e loja da clínica, conforme blocos integrais de PRD 9.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/demo; src/components/platform; src/lib/auth.
- Integrações e dependências: Catálogo central versionado, ofertas por clínica, um plano ativo; decisões de faturamento e fornecedores.
- Migração necessária / estado: Não há migração operacional comercial completa; projetar aditivamente após contratos definidos.
- Testes exigidos e critério objetivo mínimo: Testar oferta/tenant, condições congeladas, webhook autenticado/repetido, upgrade atômico, estorno e escopos comerciais. Aceitar ciclo de venda/fatura auditável sem fórmula inventada.
- Pendência Cloud e interface: Catálogos e simulador demonstrativos; cobrança/repasse/CRM/comissões sem homologação de fornecedor.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar loja do super adm e loja da clínica, respeitando as decisões pendentes do PRD.


### PRD 9.1 — Catálogo central

- Módulo: Comercial e financeiro. Prioridade: P2.
- Funcionalidade esperada: Catálogo central, conforme blocos integrais de PRD 9.1.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/demo; src/components/platform; src/lib/auth.
- Integrações e dependências: Catálogo central versionado, ofertas por clínica, um plano ativo; decisões de faturamento e fornecedores.
- Migração necessária / estado: Não há migração operacional comercial completa; projetar aditivamente após contratos definidos.
- Testes exigidos e critério objetivo mínimo: Testar oferta/tenant, condições congeladas, webhook autenticado/repetido, upgrade atômico, estorno e escopos comerciais. Aceitar ciclo de venda/fatura auditável sem fórmula inventada.
- Pendência Cloud e interface: Catálogos e simulador demonstrativos; cobrança/repasse/CRM/comissões sem homologação de fornecedor.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar catálogo central, respeitando as decisões pendentes do PRD.


### PRD 9.2 — Catálogo e venda da clínica

- Módulo: Comercial e financeiro. Prioridade: P2.
- Funcionalidade esperada: Catálogo e venda da clínica, conforme blocos integrais de PRD 9.2.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/demo; src/components/platform; src/lib/auth.
- Integrações e dependências: Catálogo central versionado, ofertas por clínica, um plano ativo; decisões de faturamento e fornecedores.
- Migração necessária / estado: Não há migração operacional comercial completa; projetar aditivamente após contratos definidos.
- Testes exigidos e critério objetivo mínimo: Testar oferta/tenant, condições congeladas, webhook autenticado/repetido, upgrade atômico, estorno e escopos comerciais. Aceitar ciclo de venda/fatura auditável sem fórmula inventada.
- Pendência Cloud e interface: Catálogos e simulador demonstrativos; cobrança/repasse/CRM/comissões sem homologação de fornecedor.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar catálogo e venda da clínica, respeitando as decisões pendentes do PRD.


### PRD 9.3 — Operação comercial

- Módulo: Comercial e financeiro. Prioridade: P2.
- Funcionalidade esperada: Operação comercial, conforme blocos integrais de PRD 9.3.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/demo; src/components/platform; src/lib/auth.
- Integrações e dependências: Catálogo central versionado, ofertas por clínica, um plano ativo; decisões de faturamento e fornecedores.
- Migração necessária / estado: Não há migração operacional comercial completa; projetar aditivamente após contratos definidos.
- Testes exigidos e critério objetivo mínimo: Testar oferta/tenant, condições congeladas, webhook autenticado/repetido, upgrade atômico, estorno e escopos comerciais. Aceitar ciclo de venda/fatura auditável sem fórmula inventada.
- Pendência Cloud e interface: Catálogos e simulador demonstrativos; cobrança/repasse/CRM/comissões sem homologação de fornecedor.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar operação comercial, respeitando as decisões pendentes do PRD.


### PRD 10 — Integração dos módulos e notificações

- Módulo: PWA e acompanhamento. Prioridade: P1.
- Funcionalidade esperada: Integração dos módulos e notificações, conforme blocos integrais de PRD 10.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/journey; src/features/demo; src/components/platform; public.
- Integrações e dependências: Host PWA, assinatura/entitlements, paciente/representação, eventos clínicos autorizados.
- Migração necessária / estado: 008–013 têm evidências Cloud históricas; 014 ausente em inspeção atual; demais fluxos exigem migração futura.
- Testes exigidos e critério objetivo mínimo: Testar próprio paciente, fontes/unidades, dados ausentes, idempotência, mobile/PWA. Aceitar registro real refletido para paciente e médico autorizado.
- Pendência Cloud e interface: Interface e gráficos demonstrativos; Jornada local/persistência parcial; VITALIDADE numérica desativada. Instalação por origem ainda não homologada.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar integração dos módulos e notificações, respeitando as decisões pendentes do PRD.


### PRD 11 — Critérios de aceite propostos — aplicativo e loja

- Módulo: PWA e acompanhamento. Prioridade: P1.
- Funcionalidade esperada: Critérios de aceite propostos — aplicativo e loja, conforme blocos integrais de PRD 11.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/journey; src/features/demo; src/components/platform; public.
- Integrações e dependências: Host PWA, assinatura/entitlements, paciente/representação, eventos clínicos autorizados.
- Migração necessária / estado: 008–013 têm evidências Cloud históricas; 014 ausente em inspeção atual; demais fluxos exigem migração futura.
- Testes exigidos e critério objetivo mínimo: Testar próprio paciente, fontes/unidades, dados ausentes, idempotência, mobile/PWA. Aceitar registro real refletido para paciente e médico autorizado.
- Pendência Cloud e interface: Interface e gráficos demonstrativos; Jornada local/persistência parcial; VITALIDADE numérica desativada. Instalação por origem ainda não homologada.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar critérios de aceite propostos — aplicativo e loja, respeitando as decisões pendentes do PRD.


### PRD 12 — Super ADM — gestão global e visão da clínica

- Módulo: Fundação e White Label. Prioridade: P0.
- Funcionalidade esperada: Super ADM — gestão global e visão da clínica, conforme blocos integrais de PRD 12.
- Estado: Parcial; separar demonstração, código local e evidência remota.
- Evidência histórica / implementação: Lista/busca de clínicas e gráficos administrativos derivados dos cadastros fictícios.
- Código de referência do grupo: src/lib/auth; src/lib/clinic; src/lib/white-label; src/lib/admin; src/routes/api/platform.
- Integrações e dependências: Auth, domínio, tenant e papéis verificados; sem selector como autoridade.
- Migração necessária / estado: 001–007 existentes; 014–016 pendentes remotos. Ciclo de domínio requer migração aditiva futura revisada.
- Testes exigidos e critério objetivo mínimo: Testar reserva/prova DNS/TLS/ativação/suspensão e isolamento A/B; aceitar somente host ativo com sessão e recurso do mesmo tenant.
- Pendência Cloud e interface: Cadastro/auditoria administrativos têm evidência histórica; revalidar estado atual. Branding demo preservado; SSR por host ainda parcial.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Implementar gestão, vínculos, agenda e fechamento financeiro reais.


### PRD 12.1 — Clínicas e acesso administrativo

- Módulo: Fundação e White Label. Prioridade: P0.
- Funcionalidade esperada: Clínicas e acesso administrativo, conforme blocos integrais de PRD 12.1.
- Estado: Parcial; separar demonstração, código local e evidência remota.
- Evidência histórica / implementação: Duas clínicas demonstrativas, busca, seleção e personalização por ID imutável; Super ADM conserva PlugPix. C014 (Codex): consulta real de clínicas no login do operador, API autenticada com papel persistido e RLS, campos administrativos validados e sem dados clínicos. C015 (Codex): migração de criação/edição com revisão otimista, auditoria atômica e API POST validadas localmente; C015 agora aplicada no Cloud. C016 (Codex): formulário real de criação/edição integrado ao login do operador, carregamento de revisão no servidor e testes de conflito/duplicação/logout; C015 aplicada no Cloud; E2E pendente. C018 (Codex/Lovable): C015 gerenciada idêntica ao SQL revisado, RLS remota ativa e escrita direta negada em clínicas/auditoria. Cadastro por e-mail/Google incorporado do Lovable; 230 testes locais aprovados. Primeira conta Auth verificada e Super ADM ativado após autorização específica do titular. C021: rede administrativa consultável por páginas de até 100, com cursor validado no servidor, revisão da lista após salvar e respostas após logout ignoradas; validação local.
- Código de referência do grupo: src/lib/auth; src/lib/clinic; src/lib/white-label; src/lib/admin; src/routes/api/platform.
- Integrações e dependências: Auth, domínio, tenant e papéis verificados; sem selector como autoridade.
- Migração necessária / estado: 001–007 existentes; 014–016 pendentes remotos. Ciclo de domínio requer migração aditiva futura revisada.
- Testes exigidos e critério objetivo mínimo: Testar reserva/prova DNS/TLS/ativação/suspensão e isolamento A/B; aceitar somente host ativo com sessão e recurso do mesmo tenant.
- Pendência Cloud e interface: Cadastro/auditoria administrativos têm evidência histórica; revalidar estado atual. Branding demo preservado; SSR por host ainda parcial.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Homologar login, cadastro, edição e auditoria reais com o primeiro Super ADM ativo. Seguir vínculos e isolamento entre clínicas; integrações, chaves e decisões do PRD continuam pendentes.


### PRD 12.2 — Médicos, cadastro e vínculos

- Módulo: Fundação e White Label. Prioridade: P0.
- Funcionalidade esperada: Médicos, cadastro e vínculos, conforme blocos integrais de PRD 12.2.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/lib/auth; src/lib/clinic; src/lib/white-label; src/lib/admin; src/routes/api/platform.
- Integrações e dependências: Auth, domínio, tenant e papéis verificados; sem selector como autoridade.
- Migração necessária / estado: 001–007 existentes; 014–016 pendentes remotos. Ciclo de domínio requer migração aditiva futura revisada.
- Testes exigidos e critério objetivo mínimo: Testar reserva/prova DNS/TLS/ativação/suspensão e isolamento A/B; aceitar somente host ativo com sessão e recurso do mesmo tenant.
- Pendência Cloud e interface: Cadastro/auditoria administrativos têm evidência histórica; revalidar estado atual. Branding demo preservado; SSR por host ainda parcial.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar médicos, cadastro e vínculos, respeitando as decisões pendentes do PRD.


### PRD 12.3 — Clientes, uso, agenda e pagamentos

- Módulo: Fundação e White Label. Prioridade: P0.
- Funcionalidade esperada: Clientes, uso, agenda e pagamentos, conforme blocos integrais de PRD 12.3.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/lib/auth; src/lib/clinic; src/lib/white-label; src/lib/admin; src/routes/api/platform.
- Integrações e dependências: Auth, domínio, tenant e papéis verificados; sem selector como autoridade.
- Migração necessária / estado: 001–007 existentes; 014–016 pendentes remotos. Ciclo de domínio requer migração aditiva futura revisada.
- Testes exigidos e critério objetivo mínimo: Testar reserva/prova DNS/TLS/ativação/suspensão e isolamento A/B; aceitar somente host ativo com sessão e recurso do mesmo tenant.
- Pendência Cloud e interface: Cadastro/auditoria administrativos têm evidência histórica; revalidar estado atual. Branding demo preservado; SSR por host ainda parcial.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar clientes, uso, agenda e pagamentos, respeitando as decisões pendentes do PRD.


### PRD 12.4 — Vidas e faturamento mensal da clínica

- Módulo: Fundação e White Label. Prioridade: P0.
- Funcionalidade esperada: Vidas e faturamento mensal da clínica, conforme blocos integrais de PRD 12.4.
- Estado: Parcial; separar demonstração, código local e evidência remota.
- Evidência histórica / implementação: Contagens demonstrativas de vidas habilitadas e distribuição por clínica; nenhum faturamento inventado.
- Código de referência do grupo: src/lib/auth; src/lib/clinic; src/lib/white-label; src/lib/admin; src/routes/api/platform.
- Integrações e dependências: Auth, domínio, tenant e papéis verificados; sem selector como autoridade.
- Migração necessária / estado: 001–007 existentes; 014–016 pendentes remotos. Ciclo de domínio requer migração aditiva futura revisada.
- Testes exigidos e critério objetivo mínimo: Testar reserva/prova DNS/TLS/ativação/suspensão e isolamento A/B; aceitar somente host ativo com sessão e recurso do mesmo tenant.
- Pendência Cloud e interface: Cadastro/auditoria administrativos têm evidência histórica; revalidar estado atual. Branding demo preservado; SSR por host ainda parcial.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Implementar fechamento mensal, cobrança por vida e registros financeiros persistentes.


### PRD 13 — Planos comerciais e configuração dos serviços

- Módulo: Comercial e financeiro. Prioridade: P2.
- Funcionalidade esperada: Planos comerciais e configuração dos serviços, conforme blocos integrais de PRD 13.
- Estado: Parcial; separar demonstração, código local e evidência remota.
- Evidência histórica / implementação: Catálogo local de rascunhos de telemedicina e pulseira com validação e tratamento de erro no navegador.
- Código de referência do grupo: src/features/demo; src/components/platform; src/lib/auth.
- Integrações e dependências: Catálogo central versionado, ofertas por clínica, um plano ativo; decisões de faturamento e fornecedores.
- Migração necessária / estado: Não há migração operacional comercial completa; projetar aditivamente após contratos definidos.
- Testes exigidos e critério objetivo mínimo: Testar oferta/tenant, condições congeladas, webhook autenticado/repetido, upgrade atômico, estorno e escopos comerciais. Aceitar ciclo de venda/fatura auditável sem fórmula inventada.
- Pendência Cloud e interface: Catálogos e simulador demonstrativos; cobrança/repasse/CRM/comissões sem homologação de fornecedor.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Implementar contratos, venda e ativação real; consolidar condições comerciais pendentes.


### PRD 13.1 — Contrato de uso da clínica com a PlugPix

- Módulo: Comercial e financeiro. Prioridade: P2.
- Funcionalidade esperada: Contrato de uso da clínica com a PlugPix, conforme blocos integrais de PRD 13.1.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/demo; src/components/platform; src/lib/auth.
- Integrações e dependências: Catálogo central versionado, ofertas por clínica, um plano ativo; decisões de faturamento e fornecedores.
- Migração necessária / estado: Não há migração operacional comercial completa; projetar aditivamente após contratos definidos.
- Testes exigidos e critério objetivo mínimo: Testar oferta/tenant, condições congeladas, webhook autenticado/repetido, upgrade atômico, estorno e escopos comerciais. Aceitar ciclo de venda/fatura auditável sem fórmula inventada.
- Pendência Cloud e interface: Catálogos e simulador demonstrativos; cobrança/repasse/CRM/comissões sem homologação de fornecedor.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar contrato de uso da clínica com a plugpix, respeitando as decisões pendentes do PRD.


### PRD 13.2 — Catálogo-base de telemedicina e venda pela clínica

- Módulo: Comercial e financeiro. Prioridade: P2.
- Funcionalidade esperada: Catálogo-base de telemedicina e venda pela clínica, conforme blocos integrais de PRD 13.2.
- Estado: Parcial; separar demonstração, código local e evidência remota.
- Evidência histórica / implementação: CRUD local de rascunhos, sete opções de serviço, coparticipação e condições opcionais sem ativação comercial.
- Código de referência do grupo: src/features/demo; src/components/platform; src/lib/auth.
- Integrações e dependências: Catálogo central versionado, ofertas por clínica, um plano ativo; decisões de faturamento e fornecedores.
- Migração necessária / estado: Não há migração operacional comercial completa; projetar aditivamente após contratos definidos.
- Testes exigidos e critério objetivo mínimo: Testar oferta/tenant, condições congeladas, webhook autenticado/repetido, upgrade atômico, estorno e escopos comerciais. Aceitar ciclo de venda/fatura auditável sem fórmula inventada.
- Pendência Cloud e interface: Catálogos e simulador demonstrativos; cobrança/repasse/CRM/comissões sem homologação de fornecedor.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Consolidar Grupo32, carência/fidelidade e implementar venda e persistência no servidor.


### PRD 13.3 — Pulseira inteligente — plano-base

- Módulo: Comercial e financeiro. Prioridade: P2.
- Funcionalidade esperada: Pulseira inteligente — plano-base, conforme blocos integrais de PRD 13.3.
- Estado: Parcial; separar demonstração, código local e evidência remota.
- Evidência histórica / implementação: Rascunhos com preço de ativação/mensalidade e opções independentes de médico, IA e fidelidade.
- Código de referência do grupo: src/features/demo; src/components/platform; src/lib/auth.
- Integrações e dependências: Catálogo central versionado, ofertas por clínica, um plano ativo; decisões de faturamento e fornecedores.
- Migração necessária / estado: Não há migração operacional comercial completa; projetar aditivamente após contratos definidos.
- Testes exigidos e critério objetivo mínimo: Testar oferta/tenant, condições congeladas, webhook autenticado/repetido, upgrade atômico, estorno e escopos comerciais. Aceitar ciclo de venda/fatura auditável sem fórmula inventada.
- Pendência Cloud e interface: Catálogos e simulador demonstrativos; cobrança/repasse/CRM/comissões sem homologação de fornecedor.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Definir modalidades e condições pendentes e integrar plano comercial e dispositivo reais.


### PRD 13.4 — Três camadas comerciais

- Módulo: Comercial e financeiro. Prioridade: P2.
- Funcionalidade esperada: Três camadas comerciais, conforme blocos integrais de PRD 13.4.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/demo; src/components/platform; src/lib/auth.
- Integrações e dependências: Catálogo central versionado, ofertas por clínica, um plano ativo; decisões de faturamento e fornecedores.
- Migração necessária / estado: Não há migração operacional comercial completa; projetar aditivamente após contratos definidos.
- Testes exigidos e critério objetivo mínimo: Testar oferta/tenant, condições congeladas, webhook autenticado/repetido, upgrade atômico, estorno e escopos comerciais. Aceitar ciclo de venda/fatura auditável sem fórmula inventada.
- Pendência Cloud e interface: Catálogos e simulador demonstrativos; cobrança/repasse/CRM/comissões sem homologação de fornecedor.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar três camadas comerciais, respeitando as decisões pendentes do PRD.


### PRD 14 — Critérios de aceite propostos — Super ADM e planos

- Módulo: Comercial e financeiro. Prioridade: P2.
- Funcionalidade esperada: Critérios de aceite propostos — Super ADM e planos, conforme blocos integrais de PRD 14.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/demo; src/components/platform; src/lib/auth.
- Integrações e dependências: Catálogo central versionado, ofertas por clínica, um plano ativo; decisões de faturamento e fornecedores.
- Migração necessária / estado: Não há migração operacional comercial completa; projetar aditivamente após contratos definidos.
- Testes exigidos e critério objetivo mínimo: Testar oferta/tenant, condições congeladas, webhook autenticado/repetido, upgrade atômico, estorno e escopos comerciais. Aceitar ciclo de venda/fatura auditável sem fórmula inventada.
- Pendência Cloud e interface: Catálogos e simulador demonstrativos; cobrança/repasse/CRM/comissões sem homologação de fornecedor.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar critérios de aceite propostos — super adm e planos, respeitando as decisões pendentes do PRD.


### PRD 15 — Blog central e blog no aplicativo

- Módulo: Conteúdo, Academy e comunicação. Prioridade: P2.
- Funcionalidade esperada: Blog central e blog no aplicativo, conforme blocos integrais de PRD 15.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/components/platform; src/features/demo.
- Integrações e dependências: Editor autorizado, Storage privado/público conforme conteúdo, direitos editoriais e fornecedores de canais.
- Migração necessária / estado: Migrações de conteúdo/mídia a desenhar; não reutilizar dados clínicos para marketing.
- Testes exigidos e critério objetivo mínimo: Testar rascunho/publicação/retirada central e seleção por clínica, mídia segura e acesso por perfil; Academy sem acesso automático do paciente.
- Pendência Cloud e interface: Previews de interface; publicação/editorial/consumo produtivos não comprovados.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar blog central e blog no aplicativo, respeitando as decisões pendentes do PRD.


### PRD 16 — Academy para clínicas

- Módulo: Conteúdo, Academy e comunicação. Prioridade: P2.
- Funcionalidade esperada: Academy para clínicas, conforme blocos integrais de PRD 16.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/components/platform; src/features/demo.
- Integrações e dependências: Editor autorizado, Storage privado/público conforme conteúdo, direitos editoriais e fornecedores de canais.
- Migração necessária / estado: Migrações de conteúdo/mídia a desenhar; não reutilizar dados clínicos para marketing.
- Testes exigidos e critério objetivo mínimo: Testar rascunho/publicação/retirada central e seleção por clínica, mídia segura e acesso por perfil; Academy sem acesso automático do paciente.
- Pendência Cloud e interface: Previews de interface; publicação/editorial/consumo produtivos não comprovados.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar academy para clínicas, respeitando as decisões pendentes do PRD.


### PRD 17 — Indique e Ganhe

- Módulo: Comercial e financeiro. Prioridade: P2.
- Funcionalidade esperada: Indique e Ganhe, conforme blocos integrais de PRD 17.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/demo; src/components/platform; src/lib/auth.
- Integrações e dependências: Catálogo central versionado, ofertas por clínica, um plano ativo; decisões de faturamento e fornecedores.
- Migração necessária / estado: Não há migração operacional comercial completa; projetar aditivamente após contratos definidos.
- Testes exigidos e critério objetivo mínimo: Testar oferta/tenant, condições congeladas, webhook autenticado/repetido, upgrade atômico, estorno e escopos comerciais. Aceitar ciclo de venda/fatura auditável sem fórmula inventada.
- Pendência Cloud e interface: Catálogos e simulador demonstrativos; cobrança/repasse/CRM/comissões sem homologação de fornecedor.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar indique e ganhe, respeitando as decisões pendentes do PRD.


### PRD 17.1 — Configuração da clínica

- Módulo: Comercial e financeiro. Prioridade: P2.
- Funcionalidade esperada: Configuração da clínica, conforme blocos integrais de PRD 17.1.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/demo; src/components/platform; src/lib/auth.
- Integrações e dependências: Catálogo central versionado, ofertas por clínica, um plano ativo; decisões de faturamento e fornecedores.
- Migração necessária / estado: Não há migração operacional comercial completa; projetar aditivamente após contratos definidos.
- Testes exigidos e critério objetivo mínimo: Testar oferta/tenant, condições congeladas, webhook autenticado/repetido, upgrade atômico, estorno e escopos comerciais. Aceitar ciclo de venda/fatura auditável sem fórmula inventada.
- Pendência Cloud e interface: Catálogos e simulador demonstrativos; cobrança/repasse/CRM/comissões sem homologação de fornecedor.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar configuração da clínica, respeitando as decisões pendentes do PRD.


### PRD 17.2 — Aplicativo do cliente

- Módulo: Comercial e financeiro. Prioridade: P2.
- Funcionalidade esperada: Aplicativo do cliente, conforme blocos integrais de PRD 17.2.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/demo; src/components/platform; src/lib/auth.
- Integrações e dependências: Catálogo central versionado, ofertas por clínica, um plano ativo; decisões de faturamento e fornecedores.
- Migração necessária / estado: Não há migração operacional comercial completa; projetar aditivamente após contratos definidos.
- Testes exigidos e critério objetivo mínimo: Testar oferta/tenant, condições congeladas, webhook autenticado/repetido, upgrade atômico, estorno e escopos comerciais. Aceitar ciclo de venda/fatura auditável sem fórmula inventada.
- Pendência Cloud e interface: Catálogos e simulador demonstrativos; cobrança/repasse/CRM/comissões sem homologação de fornecedor.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar aplicativo do cliente, respeitando as decisões pendentes do PRD.


### PRD 18 — Dependentes e plano familiar

- Módulo: PWA e acompanhamento. Prioridade: P1.
- Funcionalidade esperada: Dependentes e plano familiar, conforme blocos integrais de PRD 18.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/journey; src/features/demo; src/components/platform; public.
- Integrações e dependências: Host PWA, assinatura/entitlements, paciente/representação, eventos clínicos autorizados.
- Migração necessária / estado: 008–013 têm evidências Cloud históricas; 014 ausente em inspeção atual; demais fluxos exigem migração futura.
- Testes exigidos e critério objetivo mínimo: Testar próprio paciente, fontes/unidades, dados ausentes, idempotência, mobile/PWA. Aceitar registro real refletido para paciente e médico autorizado.
- Pendência Cloud e interface: Interface e gráficos demonstrativos; Jornada local/persistência parcial; VITALIDADE numérica desativada. Instalação por origem ainda não homologada.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar dependentes e plano familiar, respeitando as decisões pendentes do PRD.


### PRD 19 — Financeiro do cliente, inadimplência e plano ativo

- Módulo: Comercial e financeiro. Prioridade: P2.
- Funcionalidade esperada: Financeiro do cliente, inadimplência e plano ativo, conforme blocos integrais de PRD 19.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/demo; src/components/platform; src/lib/auth.
- Integrações e dependências: Catálogo central versionado, ofertas por clínica, um plano ativo; decisões de faturamento e fornecedores.
- Migração necessária / estado: Não há migração operacional comercial completa; projetar aditivamente após contratos definidos.
- Testes exigidos e critério objetivo mínimo: Testar oferta/tenant, condições congeladas, webhook autenticado/repetido, upgrade atômico, estorno e escopos comerciais. Aceitar ciclo de venda/fatura auditável sem fórmula inventada.
- Pendência Cloud e interface: Catálogos e simulador demonstrativos; cobrança/repasse/CRM/comissões sem homologação de fornecedor.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar financeiro do cliente, inadimplência e plano ativo, respeitando as decisões pendentes do PRD.


### PRD 19.1 — Financeiro no aplicativo

- Módulo: Comercial e financeiro. Prioridade: P2.
- Funcionalidade esperada: Financeiro no aplicativo, conforme blocos integrais de PRD 19.1.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/demo; src/components/platform; src/lib/auth.
- Integrações e dependências: Catálogo central versionado, ofertas por clínica, um plano ativo; decisões de faturamento e fornecedores.
- Migração necessária / estado: Não há migração operacional comercial completa; projetar aditivamente após contratos definidos.
- Testes exigidos e critério objetivo mínimo: Testar oferta/tenant, condições congeladas, webhook autenticado/repetido, upgrade atômico, estorno e escopos comerciais. Aceitar ciclo de venda/fatura auditável sem fórmula inventada.
- Pendência Cloud e interface: Catálogos e simulador demonstrativos; cobrança/repasse/CRM/comissões sem homologação de fornecedor.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar financeiro no aplicativo, respeitando as decisões pendentes do PRD.


### PRD 19.2 — Um plano ativo e upgrade

- Módulo: Comercial e financeiro. Prioridade: P2.
- Funcionalidade esperada: Um plano ativo e upgrade, conforme blocos integrais de PRD 19.2.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/demo; src/components/platform; src/lib/auth.
- Integrações e dependências: Catálogo central versionado, ofertas por clínica, um plano ativo; decisões de faturamento e fornecedores.
- Migração necessária / estado: Não há migração operacional comercial completa; projetar aditivamente após contratos definidos.
- Testes exigidos e critério objetivo mínimo: Testar oferta/tenant, condições congeladas, webhook autenticado/repetido, upgrade atômico, estorno e escopos comerciais. Aceitar ciclo de venda/fatura auditável sem fórmula inventada.
- Pendência Cloud e interface: Catálogos e simulador demonstrativos; cobrança/repasse/CRM/comissões sem homologação de fornecedor.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar um plano ativo e upgrade, respeitando as decisões pendentes do PRD.


### PRD 20 — Planos & Produtos do ADM da clínica

- Módulo: Comercial e financeiro. Prioridade: P2.
- Funcionalidade esperada: Planos & Produtos do ADM da clínica, conforme blocos integrais de PRD 20.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/demo; src/components/platform; src/lib/auth.
- Integrações e dependências: Catálogo central versionado, ofertas por clínica, um plano ativo; decisões de faturamento e fornecedores.
- Migração necessária / estado: Não há migração operacional comercial completa; projetar aditivamente após contratos definidos.
- Testes exigidos e critério objetivo mínimo: Testar oferta/tenant, condições congeladas, webhook autenticado/repetido, upgrade atômico, estorno e escopos comerciais. Aceitar ciclo de venda/fatura auditável sem fórmula inventada.
- Pendência Cloud e interface: Catálogos e simulador demonstrativos; cobrança/repasse/CRM/comissões sem homologação de fornecedor.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar planos & produtos do adm da clínica, respeitando as decisões pendentes do PRD.


### PRD 21 — CRM de vendas e agente de IA

- Módulo: Comercial e financeiro. Prioridade: P2.
- Funcionalidade esperada: CRM de vendas e agente de IA, conforme blocos integrais de PRD 21.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/demo; src/components/platform; src/lib/auth.
- Integrações e dependências: Catálogo central versionado, ofertas por clínica, um plano ativo; decisões de faturamento e fornecedores.
- Migração necessária / estado: Não há migração operacional comercial completa; projetar aditivamente após contratos definidos.
- Testes exigidos e critério objetivo mínimo: Testar oferta/tenant, condições congeladas, webhook autenticado/repetido, upgrade atômico, estorno e escopos comerciais. Aceitar ciclo de venda/fatura auditável sem fórmula inventada.
- Pendência Cloud e interface: Catálogos e simulador demonstrativos; cobrança/repasse/CRM/comissões sem homologação de fornecedor.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar crm de vendas e agente de ia, respeitando as decisões pendentes do PRD.


### PRD 21.1 — Funis e leads

- Módulo: Comercial e financeiro. Prioridade: P2.
- Funcionalidade esperada: Funis e leads, conforme blocos integrais de PRD 21.1.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/demo; src/components/platform; src/lib/auth.
- Integrações e dependências: Catálogo central versionado, ofertas por clínica, um plano ativo; decisões de faturamento e fornecedores.
- Migração necessária / estado: Não há migração operacional comercial completa; projetar aditivamente após contratos definidos.
- Testes exigidos e critério objetivo mínimo: Testar oferta/tenant, condições congeladas, webhook autenticado/repetido, upgrade atômico, estorno e escopos comerciais. Aceitar ciclo de venda/fatura auditável sem fórmula inventada.
- Pendência Cloud e interface: Catálogos e simulador demonstrativos; cobrança/repasse/CRM/comissões sem homologação de fornecedor.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar funis e leads, respeitando as decisões pendentes do PRD.


### PRD 22 — Integrações por clínica

- Módulo: Comercial e financeiro. Prioridade: P2.
- Funcionalidade esperada: Integrações por clínica, conforme blocos integrais de PRD 22.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/demo; src/components/platform; src/lib/auth.
- Integrações e dependências: Catálogo central versionado, ofertas por clínica, um plano ativo; decisões de faturamento e fornecedores.
- Migração necessária / estado: Não há migração operacional comercial completa; projetar aditivamente após contratos definidos.
- Testes exigidos e critério objetivo mínimo: Testar oferta/tenant, condições congeladas, webhook autenticado/repetido, upgrade atômico, estorno e escopos comerciais. Aceitar ciclo de venda/fatura auditável sem fórmula inventada.
- Pendência Cloud e interface: Catálogos e simulador demonstrativos; cobrança/repasse/CRM/comissões sem homologação de fornecedor.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar integrações por clínica, respeitando as decisões pendentes do PRD.


### PRD 23 — Equipe de vendas, hierarquia e comissões

- Módulo: Comercial e financeiro. Prioridade: P2.
- Funcionalidade esperada: Equipe de vendas, hierarquia e comissões, conforme blocos integrais de PRD 23.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/demo; src/components/platform; src/lib/auth.
- Integrações e dependências: Catálogo central versionado, ofertas por clínica, um plano ativo; decisões de faturamento e fornecedores.
- Migração necessária / estado: Não há migração operacional comercial completa; projetar aditivamente após contratos definidos.
- Testes exigidos e critério objetivo mínimo: Testar oferta/tenant, condições congeladas, webhook autenticado/repetido, upgrade atômico, estorno e escopos comerciais. Aceitar ciclo de venda/fatura auditável sem fórmula inventada.
- Pendência Cloud e interface: Catálogos e simulador demonstrativos; cobrança/repasse/CRM/comissões sem homologação de fornecedor.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar equipe de vendas, hierarquia e comissões, respeitando as decisões pendentes do PRD.


### PRD 23.1 — Estrutura

- Módulo: Comercial e financeiro. Prioridade: P2.
- Funcionalidade esperada: Estrutura, conforme blocos integrais de PRD 23.1.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/demo; src/components/platform; src/lib/auth.
- Integrações e dependências: Catálogo central versionado, ofertas por clínica, um plano ativo; decisões de faturamento e fornecedores.
- Migração necessária / estado: Não há migração operacional comercial completa; projetar aditivamente após contratos definidos.
- Testes exigidos e critério objetivo mínimo: Testar oferta/tenant, condições congeladas, webhook autenticado/repetido, upgrade atômico, estorno e escopos comerciais. Aceitar ciclo de venda/fatura auditável sem fórmula inventada.
- Pendência Cloud e interface: Catálogos e simulador demonstrativos; cobrança/repasse/CRM/comissões sem homologação de fornecedor.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar estrutura, respeitando as decisões pendentes do PRD.


### PRD 23.2 — Links, ofertas e atribuição

- Módulo: Comercial e financeiro. Prioridade: P2.
- Funcionalidade esperada: Links, ofertas e atribuição, conforme blocos integrais de PRD 23.2.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/demo; src/components/platform; src/lib/auth.
- Integrações e dependências: Catálogo central versionado, ofertas por clínica, um plano ativo; decisões de faturamento e fornecedores.
- Migração necessária / estado: Não há migração operacional comercial completa; projetar aditivamente após contratos definidos.
- Testes exigidos e critério objetivo mínimo: Testar oferta/tenant, condições congeladas, webhook autenticado/repetido, upgrade atômico, estorno e escopos comerciais. Aceitar ciclo de venda/fatura auditável sem fórmula inventada.
- Pendência Cloud e interface: Catálogos e simulador demonstrativos; cobrança/repasse/CRM/comissões sem homologação de fornecedor.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar links, ofertas e atribuição, respeitando as decisões pendentes do PRD.


### PRD 23.3 — Cálculo e estados da comissão

- Módulo: Comercial e financeiro. Prioridade: P2.
- Funcionalidade esperada: Cálculo e estados da comissão, conforme blocos integrais de PRD 23.3.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/demo; src/components/platform; src/lib/auth.
- Integrações e dependências: Catálogo central versionado, ofertas por clínica, um plano ativo; decisões de faturamento e fornecedores.
- Migração necessária / estado: Não há migração operacional comercial completa; projetar aditivamente após contratos definidos.
- Testes exigidos e critério objetivo mínimo: Testar oferta/tenant, condições congeladas, webhook autenticado/repetido, upgrade atômico, estorno e escopos comerciais. Aceitar ciclo de venda/fatura auditável sem fórmula inventada.
- Pendência Cloud e interface: Catálogos e simulador demonstrativos; cobrança/repasse/CRM/comissões sem homologação de fornecedor.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar cálculo e estados da comissão, respeitando as decisões pendentes do PRD.


### PRD 23.4 — Painéis e alcance

- Módulo: Comercial e financeiro. Prioridade: P2.
- Funcionalidade esperada: Painéis e alcance, conforme blocos integrais de PRD 23.4.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/demo; src/components/platform; src/lib/auth.
- Integrações e dependências: Catálogo central versionado, ofertas por clínica, um plano ativo; decisões de faturamento e fornecedores.
- Migração necessária / estado: Não há migração operacional comercial completa; projetar aditivamente após contratos definidos.
- Testes exigidos e critério objetivo mínimo: Testar oferta/tenant, condições congeladas, webhook autenticado/repetido, upgrade atômico, estorno e escopos comerciais. Aceitar ciclo de venda/fatura auditável sem fórmula inventada.
- Pendência Cloud e interface: Catálogos e simulador demonstrativos; cobrança/repasse/CRM/comissões sem homologação de fornecedor.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar painéis e alcance, respeitando as decisões pendentes do PRD.


### PRD 24 — Critérios de aceite propostos — conteúdo, indicações e operação comercial

- Módulo: Comercial e financeiro. Prioridade: P2.
- Funcionalidade esperada: Critérios de aceite propostos — conteúdo, indicações e operação comercial, conforme blocos integrais de PRD 24.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/demo; src/components/platform; src/lib/auth.
- Integrações e dependências: Catálogo central versionado, ofertas por clínica, um plano ativo; decisões de faturamento e fornecedores.
- Migração necessária / estado: Não há migração operacional comercial completa; projetar aditivamente após contratos definidos.
- Testes exigidos e critério objetivo mínimo: Testar oferta/tenant, condições congeladas, webhook autenticado/repetido, upgrade atômico, estorno e escopos comerciais. Aceitar ciclo de venda/fatura auditável sem fórmula inventada.
- Pendência Cloud e interface: Catálogos e simulador demonstrativos; cobrança/repasse/CRM/comissões sem homologação de fornecedor.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar critérios de aceite propostos — conteúdo, indicações e operação comercial, respeitando as decisões pendentes do PRD.


### PRD 25 — Pulseira Inteligente — gestão central no Super ADM

- Módulo: Dispositivos e integração. Prioridade: P2.
- Funcionalidade esperada: Pulseira Inteligente — gestão central no Super ADM, conforme blocos integrais de PRD 25.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/demo/health-data.ts; src/components/platform/health-dashboard.tsx.
- Integrações e dependências: Modelo físico, documentação oficial/SDK/BLE, autorização de unidade, consentimento e vínculo temporal.
- Migração necessária / estado: Cadastro/telemetria/estoque produtivos exigem desenho e migrações; nenhum fornecedor fixado.
- Testes exigidos e critério objetivo mínimo: Testar hardware real, unidade/paciente correto, dados tardios, duplicatas, unidades, bateria datada e revogação; aceitar somente métricas homologadas.
- Pendência Cloud e interface: Dados de demonstração compartilhados entre dashboards; nenhuma integração H59MAX/balança/anel homologada.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar pulseira inteligente — gestão central no super adm, respeitando as decisões pendentes do PRD.


### PRD 25.1 — Cadastro, estoque e expedição

- Módulo: Dispositivos e integração. Prioridade: P2.
- Funcionalidade esperada: Cadastro, estoque e expedição, conforme blocos integrais de PRD 25.1.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/demo/health-data.ts; src/components/platform/health-dashboard.tsx.
- Integrações e dependências: Modelo físico, documentação oficial/SDK/BLE, autorização de unidade, consentimento e vínculo temporal.
- Migração necessária / estado: Cadastro/telemetria/estoque produtivos exigem desenho e migrações; nenhum fornecedor fixado.
- Testes exigidos e critério objetivo mínimo: Testar hardware real, unidade/paciente correto, dados tardios, duplicatas, unidades, bateria datada e revogação; aceitar somente métricas homologadas.
- Pendência Cloud e interface: Dados de demonstração compartilhados entre dashboards; nenhuma integração H59MAX/balança/anel homologada.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar cadastro, estoque e expedição, respeitando as decisões pendentes do PRD.


### PRD 25.2 — Firmware, identificação e autorização

- Módulo: Dispositivos e integração. Prioridade: P2.
- Funcionalidade esperada: Firmware, identificação e autorização, conforme blocos integrais de PRD 25.2.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/demo/health-data.ts; src/components/platform/health-dashboard.tsx.
- Integrações e dependências: Modelo físico, documentação oficial/SDK/BLE, autorização de unidade, consentimento e vínculo temporal.
- Migração necessária / estado: Cadastro/telemetria/estoque produtivos exigem desenho e migrações; nenhum fornecedor fixado.
- Testes exigidos e critério objetivo mínimo: Testar hardware real, unidade/paciente correto, dados tardios, duplicatas, unidades, bateria datada e revogação; aceitar somente métricas homologadas.
- Pendência Cloud e interface: Dados de demonstração compartilhados entre dashboards; nenhuma integração H59MAX/balança/anel homologada.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar firmware, identificação e autorização, respeitando as decisões pendentes do PRD.


### PRD 25.3 — Monitoramento e vínculo

- Módulo: Dispositivos e integração. Prioridade: P2.
- Funcionalidade esperada: Monitoramento e vínculo, conforme blocos integrais de PRD 25.3.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/demo/health-data.ts; src/components/platform/health-dashboard.tsx.
- Integrações e dependências: Modelo físico, documentação oficial/SDK/BLE, autorização de unidade, consentimento e vínculo temporal.
- Migração necessária / estado: Cadastro/telemetria/estoque produtivos exigem desenho e migrações; nenhum fornecedor fixado.
- Testes exigidos e critério objetivo mínimo: Testar hardware real, unidade/paciente correto, dados tardios, duplicatas, unidades, bateria datada e revogação; aceitar somente métricas homologadas.
- Pendência Cloud e interface: Dados de demonstração compartilhados entre dashboards; nenhuma integração H59MAX/balança/anel homologada.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar monitoramento e vínculo, respeitando as decisões pendentes do PRD.


### PRD 25.4 — Inativação e cancelamento

- Módulo: Dispositivos e integração. Prioridade: P2.
- Funcionalidade esperada: Inativação e cancelamento, conforme blocos integrais de PRD 25.4.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/demo/health-data.ts; src/components/platform/health-dashboard.tsx.
- Integrações e dependências: Modelo físico, documentação oficial/SDK/BLE, autorização de unidade, consentimento e vínculo temporal.
- Migração necessária / estado: Cadastro/telemetria/estoque produtivos exigem desenho e migrações; nenhum fornecedor fixado.
- Testes exigidos e critério objetivo mínimo: Testar hardware real, unidade/paciente correto, dados tardios, duplicatas, unidades, bateria datada e revogação; aceitar somente métricas homologadas.
- Pendência Cloud e interface: Dados de demonstração compartilhados entre dashboards; nenhuma integração H59MAX/balança/anel homologada.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar inativação e cancelamento, respeitando as decisões pendentes do PRD.


### PRD 25.5 — Pulseiras e estoque no ADM da clínica

- Módulo: Dispositivos e integração. Prioridade: P2.
- Funcionalidade esperada: Pulseiras e estoque no ADM da clínica, conforme blocos integrais de PRD 25.5.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/demo/health-data.ts; src/components/platform/health-dashboard.tsx.
- Integrações e dependências: Modelo físico, documentação oficial/SDK/BLE, autorização de unidade, consentimento e vínculo temporal.
- Migração necessária / estado: Cadastro/telemetria/estoque produtivos exigem desenho e migrações; nenhum fornecedor fixado.
- Testes exigidos e critério objetivo mínimo: Testar hardware real, unidade/paciente correto, dados tardios, duplicatas, unidades, bateria datada e revogação; aceitar somente métricas homologadas.
- Pendência Cloud e interface: Dados de demonstração compartilhados entre dashboards; nenhuma integração H59MAX/balança/anel homologada.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar pulseiras e estoque no adm da clínica, respeitando as decisões pendentes do PRD.


### PRD 26 — Critérios de aceite propostos — ciclo da pulseira

- Módulo: Dispositivos e integração. Prioridade: P2.
- Funcionalidade esperada: Critérios de aceite propostos — ciclo da pulseira, conforme blocos integrais de PRD 26.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/demo/health-data.ts; src/components/platform/health-dashboard.tsx.
- Integrações e dependências: Modelo físico, documentação oficial/SDK/BLE, autorização de unidade, consentimento e vínculo temporal.
- Migração necessária / estado: Cadastro/telemetria/estoque produtivos exigem desenho e migrações; nenhum fornecedor fixado.
- Testes exigidos e critério objetivo mínimo: Testar hardware real, unidade/paciente correto, dados tardios, duplicatas, unidades, bateria datada e revogação; aceitar somente métricas homologadas.
- Pendência Cloud e interface: Dados de demonstração compartilhados entre dashboards; nenhuma integração H59MAX/balança/anel homologada.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar critérios de aceite propostos — ciclo da pulseira, respeitando as decisões pendentes do PRD.


### PRD 27 — Bioimpedância — balança integrada

- Módulo: Dispositivos e integração. Prioridade: P2.
- Funcionalidade esperada: Bioimpedância — balança integrada, conforme blocos integrais de PRD 27.
- Estado: Parcial; separar demonstração, código local e evidência remota.
- Evidência histórica / implementação: Interface de bioimpedância com medições fictícias compartilhada entre cliente e médico.
- Código de referência do grupo: src/features/demo/health-data.ts; src/components/platform/health-dashboard.tsx.
- Integrações e dependências: Modelo físico, documentação oficial/SDK/BLE, autorização de unidade, consentimento e vínculo temporal.
- Migração necessária / estado: Cadastro/telemetria/estoque produtivos exigem desenho e migrações; nenhum fornecedor fixado.
- Testes exigidos e critério objetivo mínimo: Testar hardware real, unidade/paciente correto, dados tardios, duplicatas, unidades, bateria datada e revogação; aceitar somente métricas homologadas.
- Pendência Cloud e interface: Dados de demonstração compartilhados entre dashboards; nenhuma integração H59MAX/balança/anel homologada.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Escolher balança, validar protocolo, integrar medidas e implementar gestão operacional e acesso real.


### PRD 27.1 — Escopo e aplicativo do paciente

- Módulo: Dispositivos e integração. Prioridade: P2.
- Funcionalidade esperada: Escopo e aplicativo do paciente, conforme blocos integrais de PRD 27.1.
- Estado: Parcial; separar demonstração, código local e evidência remota.
- Evidência histórica / implementação: Oito medições fictícias, três gráficos de composição corporal, unidades, horários, filtro e tabelas.
- Código de referência do grupo: src/features/demo/health-data.ts; src/components/platform/health-dashboard.tsx.
- Integrações e dependências: Modelo físico, documentação oficial/SDK/BLE, autorização de unidade, consentimento e vínculo temporal.
- Migração necessária / estado: Cadastro/telemetria/estoque produtivos exigem desenho e migrações; nenhum fornecedor fixado.
- Testes exigidos e critério objetivo mínimo: Testar hardware real, unidade/paciente correto, dados tardios, duplicatas, unidades, bateria datada e revogação; aceitar somente métricas homologadas.
- Pendência Cloud e interface: Dados de demonstração compartilhados entre dashboards; nenhuma integração H59MAX/balança/anel homologada.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Integrar uma balança homologada e apresentar somente métricas efetivamente suportadas.


### PRD 27.2 — Histórico clínico, IA e visibilidade administrativa

- Módulo: Dispositivos e integração. Prioridade: P2.
- Funcionalidade esperada: Histórico clínico, IA e visibilidade administrativa, conforme blocos integrais de PRD 27.2.
- Estado: Parcial; separar demonstração, código local e evidência remota.
- Evidência histórica / implementação: Médico e cliente consomem o mesmo componente e a mesma fonte estática de dados demonstrativos.
- Código de referência do grupo: src/features/demo/health-data.ts; src/components/platform/health-dashboard.tsx.
- Integrações e dependências: Modelo físico, documentação oficial/SDK/BLE, autorização de unidade, consentimento e vínculo temporal.
- Migração necessária / estado: Cadastro/telemetria/estoque produtivos exigem desenho e migrações; nenhum fornecedor fixado.
- Testes exigidos e critério objetivo mínimo: Testar hardware real, unidade/paciente correto, dados tardios, duplicatas, unidades, bateria datada e revogação; aceitar somente métricas homologadas.
- Pendência Cloud e interface: Dados de demonstração compartilhados entre dashboards; nenhuma integração H59MAX/balança/anel homologada.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Implementar histórico persistente, autorização clínica, auditoria e IA; alcance administrativo clínico permanece pendente.


### PRD 27.3 — Gestão central no Super ADM

- Módulo: Dispositivos e integração. Prioridade: P2.
- Funcionalidade esperada: Gestão central no Super ADM, conforme blocos integrais de PRD 27.3.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/demo/health-data.ts; src/components/platform/health-dashboard.tsx.
- Integrações e dependências: Modelo físico, documentação oficial/SDK/BLE, autorização de unidade, consentimento e vínculo temporal.
- Migração necessária / estado: Cadastro/telemetria/estoque produtivos exigem desenho e migrações; nenhum fornecedor fixado.
- Testes exigidos e critério objetivo mínimo: Testar hardware real, unidade/paciente correto, dados tardios, duplicatas, unidades, bateria datada e revogação; aceitar somente métricas homologadas.
- Pendência Cloud e interface: Dados de demonstração compartilhados entre dashboards; nenhuma integração H59MAX/balança/anel homologada.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar gestão central no super adm, respeitando as decisões pendentes do PRD.


### PRD 27.4 — Gestão no ADM da clínica

- Módulo: Dispositivos e integração. Prioridade: P2.
- Funcionalidade esperada: Gestão no ADM da clínica, conforme blocos integrais de PRD 27.4.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/demo/health-data.ts; src/components/platform/health-dashboard.tsx.
- Integrações e dependências: Modelo físico, documentação oficial/SDK/BLE, autorização de unidade, consentimento e vínculo temporal.
- Migração necessária / estado: Cadastro/telemetria/estoque produtivos exigem desenho e migrações; nenhum fornecedor fixado.
- Testes exigidos e critério objetivo mínimo: Testar hardware real, unidade/paciente correto, dados tardios, duplicatas, unidades, bateria datada e revogação; aceitar somente métricas homologadas.
- Pendência Cloud e interface: Dados de demonstração compartilhados entre dashboards; nenhuma integração H59MAX/balança/anel homologada.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar gestão no adm da clínica, respeitando as decisões pendentes do PRD.


### PRD 27.5 — Uso individual ou compartilhado e identificação do paciente

- Módulo: Dispositivos e integração. Prioridade: P2.
- Funcionalidade esperada: Uso individual ou compartilhado e identificação do paciente, conforme blocos integrais de PRD 27.5.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/demo/health-data.ts; src/components/platform/health-dashboard.tsx.
- Integrações e dependências: Modelo físico, documentação oficial/SDK/BLE, autorização de unidade, consentimento e vínculo temporal.
- Migração necessária / estado: Cadastro/telemetria/estoque produtivos exigem desenho e migrações; nenhum fornecedor fixado.
- Testes exigidos e critério objetivo mínimo: Testar hardware real, unidade/paciente correto, dados tardios, duplicatas, unidades, bateria datada e revogação; aceitar somente métricas homologadas.
- Pendência Cloud e interface: Dados de demonstração compartilhados entre dashboards; nenhuma integração H59MAX/balança/anel homologada.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar uso individual ou compartilhado e identificação do paciente, respeitando as decisões pendentes do PRD.


### PRD 27.6 — Integração e status em tempo real

- Módulo: Dispositivos e integração. Prioridade: P2.
- Funcionalidade esperada: Integração e status em tempo real, conforme blocos integrais de PRD 27.6.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/demo/health-data.ts; src/components/platform/health-dashboard.tsx.
- Integrações e dependências: Modelo físico, documentação oficial/SDK/BLE, autorização de unidade, consentimento e vínculo temporal.
- Migração necessária / estado: Cadastro/telemetria/estoque produtivos exigem desenho e migrações; nenhum fornecedor fixado.
- Testes exigidos e critério objetivo mínimo: Testar hardware real, unidade/paciente correto, dados tardios, duplicatas, unidades, bateria datada e revogação; aceitar somente métricas homologadas.
- Pendência Cloud e interface: Dados de demonstração compartilhados entre dashboards; nenhuma integração H59MAX/balança/anel homologada.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar integração e status em tempo real, respeitando as decisões pendentes do PRD.


### PRD 27.7 — Plano, habilitação e cobrança

- Módulo: Dispositivos e integração. Prioridade: P2.
- Funcionalidade esperada: Plano, habilitação e cobrança, conforme blocos integrais de PRD 27.7.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/demo/health-data.ts; src/components/platform/health-dashboard.tsx.
- Integrações e dependências: Modelo físico, documentação oficial/SDK/BLE, autorização de unidade, consentimento e vínculo temporal.
- Migração necessária / estado: Cadastro/telemetria/estoque produtivos exigem desenho e migrações; nenhum fornecedor fixado.
- Testes exigidos e critério objetivo mínimo: Testar hardware real, unidade/paciente correto, dados tardios, duplicatas, unidades, bateria datada e revogação; aceitar somente métricas homologadas.
- Pendência Cloud e interface: Dados de demonstração compartilhados entre dashboards; nenhuma integração H59MAX/balança/anel homologada.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar plano, habilitação e cobrança, respeitando as decisões pendentes do PRD.


### PRD 28 — Critérios de aceite propostos — bioimpedância

- Módulo: Dispositivos e integração. Prioridade: P2.
- Funcionalidade esperada: Critérios de aceite propostos — bioimpedância, conforme blocos integrais de PRD 28.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/demo/health-data.ts; src/components/platform/health-dashboard.tsx.
- Integrações e dependências: Modelo físico, documentação oficial/SDK/BLE, autorização de unidade, consentimento e vínculo temporal.
- Migração necessária / estado: Cadastro/telemetria/estoque produtivos exigem desenho e migrações; nenhum fornecedor fixado.
- Testes exigidos e critério objetivo mínimo: Testar hardware real, unidade/paciente correto, dados tardios, duplicatas, unidades, bateria datada e revogação; aceitar somente métricas homologadas.
- Pendência Cloud e interface: Dados de demonstração compartilhados entre dashboards; nenhuma integração H59MAX/balança/anel homologada.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar critérios de aceite propostos — bioimpedância, respeitando as decisões pendentes do PRD.


### PRD 29 — Inovações aprovadas — Super ADM

- Módulo: Operação, IA e qualidade. Prioridade: P1.
- Funcionalidade esperada: Inovações aprovadas — Super ADM, conforme blocos integrais de PRD 29.
- Estado: Parcial; separar demonstração, código local e evidência remota.
- Evidência histórica / implementação: Simulador de rentabilidade (29.1) concluído em modo didático local.
- Código de referência do grupo: src/lib/auth; src/lib/security; src/features/demo; src/components/platform.
- Integrações e dependências: Metadados reais, permissões por finalidade, fornecedor/limites de IA e protocolos aprovados.
- Migração necessária / estado: Aproveitar auditoria existente; persistência operacional/IA ainda a desenhar.
- Testes exigidos e critério objetivo mínimo: Testar incidentes sem dados clínicos, regras explicáveis, IA sem prescrição, piloto e recuperação. Aceitar critérios das seções 7/11/14/24/26/28/32.6/33 com evidências reais.
- Pendência Cloud e interface: Simulador local; painéis/filas em prévia. Keystore, observabilidade, backup e IA reais não homologados.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Faltam fórmulas oficiais, custos homologados, persistência/exportação e uso produtivo. Finalizar as demais inovações.


### PRD 29.1 — Simulador de rentabilidade

- Módulo: Operação, IA e qualidade. Prioridade: P1.
- Funcionalidade esperada: Simulador de rentabilidade, conforme blocos integrais de PRD 29.1.
- Estado: Parcial; separar demonstração, código local e evidência remota.
- Evidência histórica / implementação: Simulador didático puro com validações e gráfico em barras proporcionais integrado à UI (C008).
- Código de referência do grupo: src/lib/auth; src/lib/security; src/features/demo; src/components/platform.
- Integrações e dependências: Metadados reais, permissões por finalidade, fornecedor/limites de IA e protocolos aprovados.
- Migração necessária / estado: Aproveitar auditoria existente; persistência operacional/IA ainda a desenhar.
- Testes exigidos e critério objetivo mínimo: Testar incidentes sem dados clínicos, regras explicáveis, IA sem prescrição, piloto e recuperação. Aceitar critérios das seções 7/11/14/24/26/28/32.6/33 com evidências reais.
- Pendência Cloud e interface: Simulador local; painéis/filas em prévia. Keystore, observabilidade, backup e IA reais não homologados.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Faltam fórmulas oficiais, custos homologados, persistência/exportação e uso produtivo.


### PRD 29.2 — Central de funcionamento da plataforma

- Módulo: Operação, IA e qualidade. Prioridade: P1.
- Funcionalidade esperada: Central de funcionamento da plataforma, conforme blocos integrais de PRD 29.2.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/lib/auth; src/lib/security; src/features/demo; src/components/platform.
- Integrações e dependências: Metadados reais, permissões por finalidade, fornecedor/limites de IA e protocolos aprovados.
- Migração necessária / estado: Aproveitar auditoria existente; persistência operacional/IA ainda a desenhar.
- Testes exigidos e critério objetivo mínimo: Testar incidentes sem dados clínicos, regras explicáveis, IA sem prescrição, piloto e recuperação. Aceitar critérios das seções 7/11/14/24/26/28/32.6/33 com evidências reais.
- Pendência Cloud e interface: Simulador local; painéis/filas em prévia. Keystore, observabilidade, backup e IA reais não homologados.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar central de funcionamento da plataforma, respeitando as decisões pendentes do PRD.


### PRD 29.3 — Implantação guiada de clínicas

- Módulo: Operação, IA e qualidade. Prioridade: P1.
- Funcionalidade esperada: Implantação guiada de clínicas, conforme blocos integrais de PRD 29.3.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/lib/auth; src/lib/security; src/features/demo; src/components/platform.
- Integrações e dependências: Metadados reais, permissões por finalidade, fornecedor/limites de IA e protocolos aprovados.
- Migração necessária / estado: Aproveitar auditoria existente; persistência operacional/IA ainda a desenhar.
- Testes exigidos e critério objetivo mínimo: Testar incidentes sem dados clínicos, regras explicáveis, IA sem prescrição, piloto e recuperação. Aceitar critérios das seções 7/11/14/24/26/28/32.6/33 com evidências reais.
- Pendência Cloud e interface: Simulador local; painéis/filas em prévia. Keystore, observabilidade, backup e IA reais não homologados.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar implantação guiada de clínicas, respeitando as decisões pendentes do PRD.


### PRD 29.4 — Laboratório de qualidade da IA

- Módulo: Operação, IA e qualidade. Prioridade: P1.
- Funcionalidade esperada: Laboratório de qualidade da IA, conforme blocos integrais de PRD 29.4.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/lib/auth; src/lib/security; src/features/demo; src/components/platform.
- Integrações e dependências: Metadados reais, permissões por finalidade, fornecedor/limites de IA e protocolos aprovados.
- Migração necessária / estado: Aproveitar auditoria existente; persistência operacional/IA ainda a desenhar.
- Testes exigidos e critério objetivo mínimo: Testar incidentes sem dados clínicos, regras explicáveis, IA sem prescrição, piloto e recuperação. Aceitar critérios das seções 7/11/14/24/26/28/32.6/33 com evidências reais.
- Pendência Cloud e interface: Simulador local; painéis/filas em prévia. Keystore, observabilidade, backup e IA reais não homologados.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar laboratório de qualidade da ia, respeitando as decisões pendentes do PRD.


### PRD 30 — Inovações aprovadas — clínica e equipe

- Módulo: Área médica e protocolos. Prioridade: P1.
- Funcionalidade esperada: Inovações aprovadas — clínica e equipe, conforme blocos integrais de PRD 30.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/agenda; src/features/journey; src/lib/agenda; src/lib/security.
- Integrações e dependências: White Label ativo, profissional verificado, vínculo/grants e paciente autorizado; keystore real e regras clínicas.
- Migração necessária / estado: 015/016 locais para agenda; novas migrações clínicas após desenho/revisão.
- Testes exigidos e critério objetivo mínimo: Testar acesso A/B, revogação, imutabilidade, autoria e reconciliação. Aceitar fluxo integrado de consulta/registro/anexos sem atalhos de autorização.
- Pendência Cloud e interface: Agenda tem workspace integrado mas flag desabilitada; leitor padrão retorna 503. Prontuário/documentos/vídeo ainda sem fluxo operacional.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar inovações aprovadas — clínica e equipe, respeitando as decisões pendentes do PRD.


### PRD 30.1 — Jornadas configuráveis

- Módulo: Área médica e protocolos. Prioridade: P1.
- Funcionalidade esperada: Jornadas configuráveis, conforme blocos integrais de PRD 30.1.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/agenda; src/features/journey; src/lib/agenda; src/lib/security.
- Integrações e dependências: White Label ativo, profissional verificado, vínculo/grants e paciente autorizado; keystore real e regras clínicas.
- Migração necessária / estado: 015/016 locais para agenda; novas migrações clínicas após desenho/revisão.
- Testes exigidos e critério objetivo mínimo: Testar acesso A/B, revogação, imutabilidade, autoria e reconciliação. Aceitar fluxo integrado de consulta/registro/anexos sem atalhos de autorização.
- Pendência Cloud e interface: Agenda tem workspace integrado mas flag desabilitada; leitor padrão retorna 503. Prontuário/documentos/vídeo ainda sem fluxo operacional.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar jornadas configuráveis, respeitando as decisões pendentes do PRD.


### PRD 30.2 — Fila de próximos passos

- Módulo: Área médica e protocolos. Prioridade: P1.
- Funcionalidade esperada: Fila de próximos passos, conforme blocos integrais de PRD 30.2.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/agenda; src/features/journey; src/lib/agenda; src/lib/security.
- Integrações e dependências: White Label ativo, profissional verificado, vínculo/grants e paciente autorizado; keystore real e regras clínicas.
- Migração necessária / estado: 015/016 locais para agenda; novas migrações clínicas após desenho/revisão.
- Testes exigidos e critério objetivo mínimo: Testar acesso A/B, revogação, imutabilidade, autoria e reconciliação. Aceitar fluxo integrado de consulta/registro/anexos sem atalhos de autorização.
- Pendência Cloud e interface: Agenda tem workspace integrado mas flag desabilitada; leitor padrão retorna 503. Prontuário/documentos/vídeo ainda sem fluxo operacional.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar fila de próximos passos, respeitando as decisões pendentes do PRD.


### PRD 30.3 — Resumo preparatório da consulta

- Módulo: Área médica e protocolos. Prioridade: P1.
- Funcionalidade esperada: Resumo preparatório da consulta, conforme blocos integrais de PRD 30.3.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/agenda; src/features/journey; src/lib/agenda; src/lib/security.
- Integrações e dependências: White Label ativo, profissional verificado, vínculo/grants e paciente autorizado; keystore real e regras clínicas.
- Migração necessária / estado: 015/016 locais para agenda; novas migrações clínicas após desenho/revisão.
- Testes exigidos e critério objetivo mínimo: Testar acesso A/B, revogação, imutabilidade, autoria e reconciliação. Aceitar fluxo integrado de consulta/registro/anexos sem atalhos de autorização.
- Pendência Cloud e interface: Agenda tem workspace integrado mas flag desabilitada; leitor padrão retorna 503. Prontuário/documentos/vídeo ainda sem fluxo operacional.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar resumo preparatório da consulta, respeitando as decisões pendentes do PRD.


### PRD 30.4 — Retenção orientada por relacionamento

- Módulo: Área médica e protocolos. Prioridade: P1.
- Funcionalidade esperada: Retenção orientada por relacionamento, conforme blocos integrais de PRD 30.4.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/agenda; src/features/journey; src/lib/agenda; src/lib/security.
- Integrações e dependências: White Label ativo, profissional verificado, vínculo/grants e paciente autorizado; keystore real e regras clínicas.
- Migração necessária / estado: 015/016 locais para agenda; novas migrações clínicas após desenho/revisão.
- Testes exigidos e critério objetivo mínimo: Testar acesso A/B, revogação, imutabilidade, autoria e reconciliação. Aceitar fluxo integrado de consulta/registro/anexos sem atalhos de autorização.
- Pendência Cloud e interface: Agenda tem workspace integrado mas flag desabilitada; leitor padrão retorna 503. Prontuário/documentos/vídeo ainda sem fluxo operacional.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar retenção orientada por relacionamento, respeitando as decisões pendentes do PRD.


### PRD 31 — Inovações aprovadas — aplicativo do cliente

- Módulo: PWA e acompanhamento. Prioridade: P1.
- Funcionalidade esperada: Inovações aprovadas — aplicativo do cliente, conforme blocos integrais de PRD 31.
- Estado: Parcial; separar demonstração, código local e evidência remota.
- Evidência histórica / implementação: Novo painel Meu dia e navegação móvel adaptada ao acompanhamento demonstrativo.
- Código de referência do grupo: src/features/journey; src/features/demo; src/components/platform; public.
- Integrações e dependências: Host PWA, assinatura/entitlements, paciente/representação, eventos clínicos autorizados.
- Migração necessária / estado: 008–013 têm evidências Cloud históricas; 014 ausente em inspeção atual; demais fluxos exigem migração futura.
- Testes exigidos e critério objetivo mínimo: Testar próprio paciente, fontes/unidades, dados ausentes, idempotência, mobile/PWA. Aceitar registro real refletido para paciente e médico autorizado.
- Pendência Cloud e interface: Interface e gráficos demonstrativos; Jornada local/persistência parcial; VITALIDADE numérica desativada. Instalação por origem ainda não homologada.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Integrar rotina real, preparação da consulta, linha do tempo, metas e privacidade.


### PRD 31.1 — Meu dia

- Módulo: PWA e acompanhamento. Prioridade: P1.
- Funcionalidade esperada: Meu dia, conforme blocos integrais de PRD 31.1.
- Estado: Parcial; separar demonstração, código local e evidência remota.
- Evidência histórica / implementação: Meu dia apresenta composição corporal, atividade e descanso fictícios com acesso aos demais módulos.
- Código de referência do grupo: src/features/journey; src/features/demo; src/components/platform; public.
- Integrações e dependências: Host PWA, assinatura/entitlements, paciente/representação, eventos clínicos autorizados.
- Migração necessária / estado: 008–013 têm evidências Cloud históricas; 014 ausente em inspeção atual; demais fluxos exigem migração futura.
- Testes exigidos e critério objetivo mínimo: Testar próprio paciente, fontes/unidades, dados ausentes, idempotência, mobile/PWA. Aceitar registro real refletido para paciente e médico autorizado.
- Pendência Cloud e interface: Interface e gráficos demonstrativos; Jornada local/persistência parcial; VITALIDADE numérica desativada. Instalação por origem ainda não homologada.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Conectar agenda, medicamentos, hidratação e demais próximos passos reais do paciente.


### PRD 31.2 — Preparação para a consulta

- Módulo: PWA e acompanhamento. Prioridade: P1.
- Funcionalidade esperada: Preparação para a consulta, conforme blocos integrais de PRD 31.2.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/journey; src/features/demo; src/components/platform; public.
- Integrações e dependências: Host PWA, assinatura/entitlements, paciente/representação, eventos clínicos autorizados.
- Migração necessária / estado: 008–013 têm evidências Cloud históricas; 014 ausente em inspeção atual; demais fluxos exigem migração futura.
- Testes exigidos e critério objetivo mínimo: Testar próprio paciente, fontes/unidades, dados ausentes, idempotência, mobile/PWA. Aceitar registro real refletido para paciente e médico autorizado.
- Pendência Cloud e interface: Interface e gráficos demonstrativos; Jornada local/persistência parcial; VITALIDADE numérica desativada. Instalação por origem ainda não homologada.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar preparação para a consulta, respeitando as decisões pendentes do PRD.


### PRD 31.3 — Linha do tempo contextual

- Módulo: PWA e acompanhamento. Prioridade: P1.
- Funcionalidade esperada: Linha do tempo contextual, conforme blocos integrais de PRD 31.3.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/journey; src/features/demo; src/components/platform; public.
- Integrações e dependências: Host PWA, assinatura/entitlements, paciente/representação, eventos clínicos autorizados.
- Migração necessária / estado: 008–013 têm evidências Cloud históricas; 014 ausente em inspeção atual; demais fluxos exigem migração futura.
- Testes exigidos e critério objetivo mínimo: Testar próprio paciente, fontes/unidades, dados ausentes, idempotência, mobile/PWA. Aceitar registro real refletido para paciente e médico autorizado.
- Pendência Cloud e interface: Interface e gráficos demonstrativos; Jornada local/persistência parcial; VITALIDADE numérica desativada. Instalação por origem ainda não homologada.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar linha do tempo contextual, respeitando as decisões pendentes do PRD.


### PRD 31.4 — Metas pequenas e adaptáveis

- Módulo: PWA e acompanhamento. Prioridade: P1.
- Funcionalidade esperada: Metas pequenas e adaptáveis, conforme blocos integrais de PRD 31.4.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/journey; src/features/demo; src/components/platform; public.
- Integrações e dependências: Host PWA, assinatura/entitlements, paciente/representação, eventos clínicos autorizados.
- Migração necessária / estado: 008–013 têm evidências Cloud históricas; 014 ausente em inspeção atual; demais fluxos exigem migração futura.
- Testes exigidos e critério objetivo mínimo: Testar próprio paciente, fontes/unidades, dados ausentes, idempotência, mobile/PWA. Aceitar registro real refletido para paciente e médico autorizado.
- Pendência Cloud e interface: Interface e gráficos demonstrativos; Jornada local/persistência parcial; VITALIDADE numérica desativada. Instalação por origem ainda não homologada.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar metas pequenas e adaptáveis, respeitando as decisões pendentes do PRD.


### PRD 31.5 — Central de privacidade

- Módulo: PWA e acompanhamento. Prioridade: P1.
- Funcionalidade esperada: Central de privacidade, conforme blocos integrais de PRD 31.5.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/journey; src/features/demo; src/components/platform; public.
- Integrações e dependências: Host PWA, assinatura/entitlements, paciente/representação, eventos clínicos autorizados.
- Migração necessária / estado: 008–013 têm evidências Cloud históricas; 014 ausente em inspeção atual; demais fluxos exigem migração futura.
- Testes exigidos e critério objetivo mínimo: Testar próprio paciente, fontes/unidades, dados ausentes, idempotência, mobile/PWA. Aceitar registro real refletido para paciente e médico autorizado.
- Pendência Cloud e interface: Interface e gráficos demonstrativos; Jornada local/persistência parcial; VITALIDADE numérica desativada. Instalação por origem ainda não homologada.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar central de privacidade, respeitando as decisões pendentes do PRD.


### PRD 32 — Protocolos de acompanhamento da clínica

- Módulo: Área médica e protocolos. Prioridade: P1.
- Funcionalidade esperada: Protocolos de acompanhamento da clínica, conforme blocos integrais de PRD 32.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/agenda; src/features/journey; src/lib/agenda; src/lib/security.
- Integrações e dependências: White Label ativo, profissional verificado, vínculo/grants e paciente autorizado; keystore real e regras clínicas.
- Migração necessária / estado: 015/016 locais para agenda; novas migrações clínicas após desenho/revisão.
- Testes exigidos e critério objetivo mínimo: Testar acesso A/B, revogação, imutabilidade, autoria e reconciliação. Aceitar fluxo integrado de consulta/registro/anexos sem atalhos de autorização.
- Pendência Cloud e interface: Agenda tem workspace integrado mas flag desabilitada; leitor padrão retorna 503. Prontuário/documentos/vídeo ainda sem fluxo operacional.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar protocolos de acompanhamento da clínica, respeitando as decisões pendentes do PRD.


### PRD 32.1 — Criação e composição

- Módulo: Área médica e protocolos. Prioridade: P1.
- Funcionalidade esperada: Criação e composição, conforme blocos integrais de PRD 32.1.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/agenda; src/features/journey; src/lib/agenda; src/lib/security.
- Integrações e dependências: White Label ativo, profissional verificado, vínculo/grants e paciente autorizado; keystore real e regras clínicas.
- Migração necessária / estado: 015/016 locais para agenda; novas migrações clínicas após desenho/revisão.
- Testes exigidos e critério objetivo mínimo: Testar acesso A/B, revogação, imutabilidade, autoria e reconciliação. Aceitar fluxo integrado de consulta/registro/anexos sem atalhos de autorização.
- Pendência Cloud e interface: Agenda tem workspace integrado mas flag desabilitada; leitor padrão retorna 503. Prontuário/documentos/vídeo ainda sem fluxo operacional.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar criação e composição, respeitando as decisões pendentes do PRD.


### PRD 32.2 — Avaliação e decisão médica

- Módulo: Área médica e protocolos. Prioridade: P1.
- Funcionalidade esperada: Avaliação e decisão médica, conforme blocos integrais de PRD 32.2.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/agenda; src/features/journey; src/lib/agenda; src/lib/security.
- Integrações e dependências: White Label ativo, profissional verificado, vínculo/grants e paciente autorizado; keystore real e regras clínicas.
- Migração necessária / estado: 015/016 locais para agenda; novas migrações clínicas após desenho/revisão.
- Testes exigidos e critério objetivo mínimo: Testar acesso A/B, revogação, imutabilidade, autoria e reconciliação. Aceitar fluxo integrado de consulta/registro/anexos sem atalhos de autorização.
- Pendência Cloud e interface: Agenda tem workspace integrado mas flag desabilitada; leitor padrão retorna 503. Prontuário/documentos/vídeo ainda sem fluxo operacional.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar avaliação e decisão médica, respeitando as decisões pendentes do PRD.


### PRD 32.3 — Apto — liberação do acompanhamento

- Módulo: Área médica e protocolos. Prioridade: P1.
- Funcionalidade esperada: Apto — liberação do acompanhamento, conforme blocos integrais de PRD 32.3.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/agenda; src/features/journey; src/lib/agenda; src/lib/security.
- Integrações e dependências: White Label ativo, profissional verificado, vínculo/grants e paciente autorizado; keystore real e regras clínicas.
- Migração necessária / estado: 015/016 locais para agenda; novas migrações clínicas após desenho/revisão.
- Testes exigidos e critério objetivo mínimo: Testar acesso A/B, revogação, imutabilidade, autoria e reconciliação. Aceitar fluxo integrado de consulta/registro/anexos sem atalhos de autorização.
- Pendência Cloud e interface: Agenda tem workspace integrado mas flag desabilitada; leitor padrão retorna 503. Prontuário/documentos/vídeo ainda sem fluxo operacional.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar apto — liberação do acompanhamento, respeitando as decisões pendentes do PRD.


### PRD 32.4 — Não apto — encaminhamento

- Módulo: Área médica e protocolos. Prioridade: P1.
- Funcionalidade esperada: Não apto — encaminhamento, conforme blocos integrais de PRD 32.4.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/agenda; src/features/journey; src/lib/agenda; src/lib/security.
- Integrações e dependências: White Label ativo, profissional verificado, vínculo/grants e paciente autorizado; keystore real e regras clínicas.
- Migração necessária / estado: 015/016 locais para agenda; novas migrações clínicas após desenho/revisão.
- Testes exigidos e critério objetivo mínimo: Testar acesso A/B, revogação, imutabilidade, autoria e reconciliação. Aceitar fluxo integrado de consulta/registro/anexos sem atalhos de autorização.
- Pendência Cloud e interface: Agenda tem workspace integrado mas flag desabilitada; leitor padrão retorna 503. Prontuário/documentos/vídeo ainda sem fluxo operacional.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar não apto — encaminhamento, respeitando as decisões pendentes do PRD.


### PRD 32.5 — Estados, plano ativo e evolução

- Módulo: Área médica e protocolos. Prioridade: P1.
- Funcionalidade esperada: Estados, plano ativo e evolução, conforme blocos integrais de PRD 32.5.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/agenda; src/features/journey; src/lib/agenda; src/lib/security.
- Integrações e dependências: White Label ativo, profissional verificado, vínculo/grants e paciente autorizado; keystore real e regras clínicas.
- Migração necessária / estado: 015/016 locais para agenda; novas migrações clínicas após desenho/revisão.
- Testes exigidos e critério objetivo mínimo: Testar acesso A/B, revogação, imutabilidade, autoria e reconciliação. Aceitar fluxo integrado de consulta/registro/anexos sem atalhos de autorização.
- Pendência Cloud e interface: Agenda tem workspace integrado mas flag desabilitada; leitor padrão retorna 503. Prontuário/documentos/vídeo ainda sem fluxo operacional.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar estados, plano ativo e evolução, respeitando as decisões pendentes do PRD.


### PRD 32.6 — Critérios de aceite propostos — protocolos

- Módulo: Área médica e protocolos. Prioridade: P1.
- Funcionalidade esperada: Critérios de aceite propostos — protocolos, conforme blocos integrais de PRD 32.6.
- Estado: Não implementado funcionalmente / preview não é operação.
- Evidência histórica / implementação: Ainda não há implementação funcional deste requisito validada.
- Código de referência do grupo: src/features/agenda; src/features/journey; src/lib/agenda; src/lib/security.
- Integrações e dependências: White Label ativo, profissional verificado, vínculo/grants e paciente autorizado; keystore real e regras clínicas.
- Migração necessária / estado: 015/016 locais para agenda; novas migrações clínicas após desenho/revisão.
- Testes exigidos e critério objetivo mínimo: Testar acesso A/B, revogação, imutabilidade, autoria e reconciliação. Aceitar fluxo integrado de consulta/registro/anexos sem atalhos de autorização.
- Pendência Cloud e interface: Agenda tem workspace integrado mas flag desabilitada; leitor padrão retorna 503. Prontuário/documentos/vídeo ainda sem fluxo operacional.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Falta implementar e validar critérios de aceite propostos — protocolos, respeitando as decisões pendentes do PRD.


### PRD 33 — Critérios de aceite propostos — inovações aprovadas

- Módulo: Operação, IA e qualidade. Prioridade: P1.
- Funcionalidade esperada: Critérios de aceite propostos — inovações aprovadas, conforme blocos integrais de PRD 33.
- Estado: Parcial; separar demonstração, código local e evidência remota.
- Evidência histórica / implementação: Critério 1 resolvido apenas no escopo do cálculo didático em frontend.
- Código de referência do grupo: src/lib/auth; src/lib/security; src/features/demo; src/components/platform.
- Integrações e dependências: Metadados reais, permissões por finalidade, fornecedor/limites de IA e protocolos aprovados.
- Migração necessária / estado: Aproveitar auditoria existente; persistência operacional/IA ainda a desenhar.
- Testes exigidos e critério objetivo mínimo: Testar incidentes sem dados clínicos, regras explicáveis, IA sem prescrição, piloto e recuperação. Aceitar critérios das seções 7/11/14/24/26/28/32.6/33 com evidências reais.
- Pendência Cloud e interface: Simulador local; painéis/filas em prévia. Keystore, observabilidade, backup e IA reais não homologados.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Faltam fórmulas oficiais, custos homologados, persistência/exportação e uso produtivo. Demais critérios pendentes.


### PRD 34 — Prioridade recomendada e decisões pendentes

- Módulo: Fundação e White Label. Prioridade: P0.
- Funcionalidade esperada: Prioridade recomendada e decisões pendentes, conforme blocos integrais de PRD 34.
- Estado: Parcial; separar demonstração, código local e evidência remota.
- Evidência histórica / implementação: PRD v0.11.3 e adendos preservados, com execução direta Codex e design existente mantido. Administração e marca QA têm homologações Cloud históricas; White Label mantém reservas pendentes e contratos locais, sem DNS/ativação. Jornada avançou localmente até preferências, suspensão auditada e autorrelatos idempotentes ligados ao host. Regressão da base anterior: 516 testes/62 arquivos; autorrelato posterior: 32 testes/7 arquivos e sequência SQL 008–012 aprovados. Esses resultados não concluem fluxos produtivos do PRD. Em 14/10, Codex recebeu autorização expressa para commit/push ao preview. Lote revisado: 567 testes em 71 arquivos e tipos/lint aprovados. Cloud 008–012 conferido; 013 e criação de rascunhos somente locais.
- Código de referência do grupo: src/lib/auth; src/lib/clinic; src/lib/white-label; src/lib/admin; src/routes/api/platform.
- Integrações e dependências: Auth, domínio, tenant e papéis verificados; sem selector como autoridade.
- Migração necessária / estado: 001–007 existentes; 014–016 pendentes remotos. Ciclo de domínio requer migração aditiva futura revisada.
- Testes exigidos e critério objetivo mínimo: Testar reserva/prova DNS/TLS/ativação/suspensão e isolamento A/B; aceitar somente host ativo com sessão e recurso do mesmo tenant.
- Pendência Cloud e interface: Cadastro/auditoria administrativos têm evidência histórica; revalidar estado atual. Branding demo preservado; SSR por host ainda parcial.
- Aceite final: todos os blocos DEFINIDO e critérios correspondentes no PRD, teste ponta a ponta, persistência e recusa cross-tenant; decisões RECOMENDADO/PENDENTE não viram regra automaticamente.
- Próximo incremento específico: Continuar auditoria e contexto White Label e recursos independentes. Hospedagem/DNS/TLS, contas QA clínicas, keystore, protocolo H59MAX/balança, fornecedores e condições comerciais/clínicas abertas exigem definição antes dos respectivos fluxos produtivos.


## Retomada durável

Ver RETOMADA_CODEX_20261020.md para HEAD, resultados verificados e próximo passo exato. Atualizar este plano ao resolver dependências, sem apagar registros históricos.

## Avanço local — 31/10/2026: prontuário

PRD 3.2 passa a parcial com núcleo cifrado/imutável e auditoria privados em proposta 048, serviço e adaptador, sem concessão de acesso ou endpoint. Próxima etapa: histórico paginado, seguida de interface ligada a Auth/host e keystore operacionais. PRD e adendos preservados; decisões de assinatura não resolvidas por suposição. Entregas técnicas locais 171; conclusão integral do PRD não é inferida dessa contagem. Revisão: REVISAO_MIGRACAO_PRONTUARIO_048.md.

## Continuidade — histórico clínico local, 31/10/2026

049 acrescenta histórico cifrado por cursor com auditoria, sem endpoint ou privilégio novo. Regressão ampliada: 192 testes/20 arquivos aprovada, tipos/lint/build válidos. Status local 172 conferido com busca do item 3.2; permanece parcial. SQL Editor remoto somente leitura confirmou estado anterior de hidratação e ausência de vínculos clínicos, sem aplicar migrações. Próximo incremento: fronteira HTTP com contexto profissional derivado de servidor e recuperação de comando incerto, sem exposição enquanto Auth/host/CRM/KMS não estiverem operacionais.

## Continuidade — fronteira HTTP clínica local, 31/10/2026

Factory sem rota ativada e sem contexto/KMS padrão; valida escopo médico, corpo limitado e confirmação por ID. Teste integrado de HTTP/serviço/criptografia/SQL e regressão ampliada com 203 testes/21 arquivos aprovados; tipos/lint/build válidos. Status 173, ainda parcial. Próximo incremento: cliente com prazo/resultado incerto, sem armazenamento de texto clínico no navegador nem retry automático. Dependências operacionais em RETOMADA_PENDENCIAS_OPERACIONAIS_20261031.md.

## Continuidade — cliente clínico local, 31/10/2026

Cliente com deadline, contexto de conta fixo, confirmação por ID original, histórico limitado e fechamento dos transportes. Regressão 218 testes/22 arquivos, tipos/lint/build aprovados. Status local 174; nenhuma rota clínica ativada. Próximo incremento: workspace com bloqueio de comandos incertos e descarte de estado ao trocar contexto, seguido da ligação operacional Auth/host/CRM/KMS mediante decisões próprias.
