# Prontuário — fronteira HTTP local

Codex, 31/10/2026. Continuidade do PRD 3.2/4/5, após 048–049. Factory server-only testada, sem rota registrada ou ativada e sem implementação padrão do resolvedor. Não houve SQL remoto, conta, grant, KMS ou infraestrutura nova.

## Contrato

Resolver injetado deve verificar getUser/bearer, domínio da clínica e paciente ativo naquele tenant; não pode derivar autoridade da demonstração ou de campos do corpo. A factory exige bearer e apenas um vínculo na clínica corrente, depois aplica isAuthorized/prontuario/read (e create para gravar), médico verificado e vínculo ativo do paciente. A autoria profissional continua sendo resolvida e cifrada pelo serviço; o resultado de criação deve corresponder ao usuário da sessão. CRM/UF não são extraídos do pedido.

POST admite somente id, text e supplementsId, com JSON estrito e leitura limitada a 262144 bytes reais; Content-Length não contorna o limite. Exige Origin igual à origem efetiva da requisição. Integração atrás do ingresso White Label deve preservar essa origem verificada; não flexibilizar a regra com X-Forwarded-Host arbitrário. Sem query extra em gravação. Nenhum endpoint de edição/exclusão existe.

GET record consulta ID exato, sem gravar; GET history recebe cursor completo de data/ID ou nenhum. Campos duplicados ou desconhecidos são recusados. Resultados passam por contrato estrito e escopo; todo retorno usa private,no-store, Pragma no-cache, Vary e nosniff. Não há persistência em navegador ou retry automático.

Erros do provedor não são devolvidos. Depois de despachar create, qualquer erro ou resposta incompatível retorna 503/outcome uncertain/recordId original, incluindo erro de confirmação após persistir. Isso não afirma falha nem sucesso; o chamador precisa consultar o ID original e comparar o comando antes de confirmar ou repetir explicitamente. Não registrar outro UUID para contornar uma resposta incerta. Falha de consulta não resolve incerteza de gravação. Uma resposta 404 não autoriza concluir ausência histórica se a consulta não estiver no contexto válido.

## Validação

Testes de fronteira cobrem contexto derivado, tentativa de impor tenant/autoria, bearer/origem, admin, médico não verificado, grant ausente, limite real de corpo, resultado estrangeiro, mensagem genérica, recuperação por ID, cursor incompleto/duplicado e métodos. Teste integrado usa Request/Response, serviço clínico, AES-GCM com chave efêmera e SQL PGlite para criar, reler e listar texto fictício; conteúdo permanece cifrado no banco.

Contexto e token são fictícios no teste. Não comprova login/gateway/domínio/KMS reais, assinatura ou homologação Cloud. Sem instância/resolvedor de produção e sem concessões aprovadas, a factory não pode operar com pacientes reais. Não foram criadas rotas indisponíveis que aparentem estar operacionais.

Próximo passo: cliente com deadline e UX de comando incerto, workspace clínico, resolvedor Auth/host/profissional e gestão de chaves. Implantação de 048–049 e acesso clínico dependem de aprovação própria; fluxo de assinatura permanece pendente no PRD.

Validação final: 203 testes direcionados em 21 arquivos aprovados, cobrindo prontuário/HTTP/criptografia/hidratação/identidade/permissões/status. TypeScript, lint dos arquivos afetados e build Vite aprovados. /staus local mostra 173 entregas e mantém os requisitos produtivos parciais. Não é suíte global nem homologação de login, KMS ou dados clínicos reais.
