# Jornada — host e sessão vinculados localmente

13/10/2026 · Codex. Composição local `createJourneyHostSessionResolver`, reutilizando extração/normalização White Label e criação de contexto autenticado existentes. Nenhuma mudança em banco, DNS, provedores, concessões, infraestrutura ou Git remoto.

Host e autoridade da URL devem concordar sem política de proxy revisada. Cabeçalhos ambíguos/spoofing, nomes reservados e ambientes locais/demo/preview são negados antes de registro/Auth. Registro fornecido pelo servidor é validado estritamente: hostname canônico exato, UUID da clínica, finalidade esperada e estado ativo. Pendentes/suspensos/retirados não iniciam Auth. Proxy confiável é opção exclusivamente de implantação/peer revisados, nunca parâmetro do browser; não foi habilitado nesta entrega.

Sessão resolvida na mesma requisição deve vir de getUser/identidade persistida verificados. Contexto conserva somente vínculo ativo da clínica do domínio e remove privilégio global. Jornada no portal exige médico verificado; PWA exige paciente com ID válido. Administrador/cargo global isolado não ganha contexto clínico. Não há cache de domínio/sessão no compositor; estado suspenso em consulta posterior impede reutilizar autorização anterior. Seleção de clínica enviada em cabeçalho não muda o contexto.

Verificações: 49 testes em cinco arquivos aprovados (`vje2_host_session.txt`), incluindo compositor, host/RBAC e handlers de leitura/participação. Tipos e lint aprovados nos logs correspondentes. Fixtures positivas usam domínio reservado de exemplo, sem rede; .test permanece bloqueado como demo. Teste com handler médico usa fonte/Auth/repositório simulados, não backend de produção.

Pendências: fonte persistida confiável de hosts ativos, posse/TLS/ativação auditada, política real de proxy/hospedagem e sessão Auth na mesma origem. A tabela atual de reservas 006 admite apenas pending_verification; o compositor não a converte em ativa e não é um adaptador operacional para ela. Implementar transporte real e composição dos endpoints após esses gates. Testes não comprovam TLS, DNS, isolamento multi-host remoto ou permissões clínicas reais. Sem migração/push/deploy e sem Prompt Zero/Ask Lovable.

A tentativa anterior de verificações não foi executada porque a revisão automática falhou por limite de uso, sem determinação de risco. Nesta retomada os checks foram concluídos nas permissões normais do workspace, usando cache temporário dentro de node_modules. Nenhuma proteção ou aprovação foi desabilitada.

Continuidade Codex: endpoints.server.ts compõe os três handlers com host/sessão e transportes injetados. Fonte ativa/transportes reais continuam pendentes e nenhum endpoint foi montado. Testes: 12 de composição/host e 13 de HTTP/fluxo aprovados. Métodos trocados retornam 405/Allow antes de Auth/RPC.

Adaptador local rpc-repository.server.ts recebe transporte injetado da sessão Auth validada, sem credenciais próprias ou bypass de RLS. Consulta médica usa UUID da clínica do contexto e valida goal/patientLink integralmente. Conflito 40001, acesso 42501 e entrada 22023 têm classificação segura; erro desconhecido não produz sucesso. Seis testes aprovados com transportes simulados. Adaptador não consulta Cloud nem ativa rotas.

Verificação posterior: build local de produção concluído com exit 0 (docs/evidencias/vje2_build_atual.txt), sem deploy. Regressão completa iniciada com um worker e cache temporário no workspace: handle 51755, log vje2_regressao_atual.txt. Resultado ainda pendente nesta anotação; não reiniciar somente por demora de observação.
