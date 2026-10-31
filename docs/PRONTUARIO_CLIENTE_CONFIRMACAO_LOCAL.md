# Prontuário — cliente e confirmação de comando incerto (local)

Codex, 31/10/2026. PRD 3.2/4, continuidade das etapas 048–049 e fronteira HTTP. Cliente browser-safe sem importação de chaves, banco ou módulos server-only; não montado no workspace produtivo e sem rota ativada.

## Comportamento

A instância recebe escopo e UUID do usuário já verificados pela camada de sessão futura. Antes de cada operação consulta a sessão atual e recusa token de outro usuário. Captura o comando validado antes de qualquer await; o corpo só contém id/text/supplementsId. Não envia tenant, paciente ou autor como autoridade.

Uma única requisição POST, com deadline de 20 s cobrindo token/rede/corpo, no-store, sem cookies e sem seguir redirects. Falha após despacho, resposta inválida, resultado estrangeiro ou texto/complemento/autoria incompatíveis mantêm outcome uncertain. Falhas 4xx pré-despacho definidas no contrato HTTP são rejected; não interpreta texto de erro remoto. Não há retry automático ou criação de outro UUID. O chamador deve manter em memória o comando original enquanto incerto.

Confirm usa somente GET pelo ID original: valida o escopo e compara texto, complemento e UUID do autor. Igual retorna confirmed; conteúdo/autor diferente é conflict; 404 é unconfirmed, sem afirmar que o POST falhou ou autorizar novo ID. Falha de leitura não confirma nem rejeita a gravação. Mesmo comando conserva a autoria/data originais persistidas pelo núcleo.

Close marca a instância encerrada e aborta transportes pendentes; resposta tardia não libera texto. Abortar transporte ou expirar timeout não desfaz commit SQL. Uma busca de token que termina depois do prazo/fechamento não pode iniciar fetch. Os controladores são removidos ao concluir a operação. Não existe armazenamento local, cache de saúde, outbox, telemetria ou log de texto.

## Testes e limites

Testes cobrem envio único, campos estruturados, sessão trocada, fechamento antes/depois do despacho, resposta incompatível, 404/conflict, deadline antes/depois do envio e mutação tardia do objeto original. Integração local liga cliente, Request/Response HTTP, serviço criptográfico e SQL PGlite: POST grava e perde a resposta; GET original confirma o mesmo registro, com uma única linha no banco. Usa contexto/token/texto fictícios e chave efêmera; não é autenticação nem KMS reais.

Próxima etapa: workspace com bloqueio de novos comandos enquanto incerto, confirmação explícita, descarte seguro de estado no logout/troca de paciente e integração do resolvedor Auth/host/profissional. O futuro adaptador de sessão deve vincular getSession à identidade que abriu a tela e fechar a instância ao desmontar. Endereço relativo /api/medical/evolutions é o contrato futuro, sem registro de rota nesta entrega; não acionar com dados reais enquanto as dependências não forem homologadas.

Cloud 048–049, cadastro/validação profissional, grants aprovados, KMS/rotação/backup, assinatura e operação real seguem pendentes. Design e funcionalidades existentes preservados.

O cliente também lê uma página de histórico por chamada, com cursor explícito, validação de escopo/ordem/tamanho e sem auto-carregar todas as páginas. Seus contratos de resultado/cursor são browser-safe. O teste recusa página de paciente alheio e retorno que repete a linha do cursor; futuras rotas devem encaminhar GET sem id para o histórico e GET com id para leitura individual.

Validação final: 218 testes direcionados em 22 arquivos aprovados, além de TypeScript, lint e build Vite. Inclui 14 casos do cliente e o fluxo de resposta perdida cliente/HTTP/SQL. Não é suíte global nem homologação remota. Status local 174; código continua em desenvolvimento sem rota clínica operacional.
