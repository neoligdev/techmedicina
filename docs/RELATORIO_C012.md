# C012 — Login Cloud (10/10/2026)

- Autoria: Antigravity iniciou rota, formulário, integração de shell e testes R1. Por orientação humana posterior, Codex interrompeu o executor e assumiu diretamente as correções, testes, documentação e publicação. OpenCode permaneceu ocioso.
- Repositório: pasta interna `techmedicina/techmedicina`, origem `neoligdev/techmedicina`, branch `main`, base C011 `c9015af`.
- PRD: itens 2, 3.1, 4 e 5 continuam parciais. Não foram criadas tabelas, contas, permissões, DDL ou políticas RLS. Cloud Lovable é o backend corrente; o Supabase externo ligado ao GitHub não foi conectado à aplicação.

## Entregue

- `/login` com marca PlugPix, cores semânticas azul-marinho/verde-cana e superfície fosca; rótulos, autocomplete, exibição acessível da senha, estado de carregamento e mensagens genéricas.
- Formulário envia senha sem trim ao SDK gerado. A resposta do login é validada mesmo quando não ocorre evento de sessão.
- Sessão restaurada e token renovado são confirmados no servidor usando Bearer em `/api/access-check`. Apenas HTTP200 com JSON `status: ok` permite mostrar identidade autenticada.
- Nenhum papel, clínica ou permissão é inferido de metadados, do seletor demo ou do estado do navegador. A conta autenticada aguarda vínculo autorizado.
- AbortController e contador de revisão impedem resultados antigos e restauração atrasada de sobrescrever logout ou validação nova. Listener desinscrito no unmount; nenhuma chamada aguardada ao SDK dentro do callback síncrono.
- Logout com `scope: local`; limpa campos, contém erros retornados/lançados e permite tentar sair novamente. Não promete revogação imediata de JWT já emitido.
- Inicialização do SDK somente após hidratação; configuração ausente ou chave com prefixo secreto bloqueia formulário de forma controlada. Nenhum armazenamento customizado de credenciais ou token.
- API envia `Cache-Control: private, no-store` em todas as respostas.
- Seleção reativa da rota raiz evita manter AppShell no login após navegação. Demonstração e botão `/staus` preservados.

## Validação e evidências

- `c012_codex_tsc.txt`: exit 0.
- `c012_codex_lint.txt`: exit 0, sete avisos Fast Refresh preexistentes, zero erros.
- `c012_codex_test.txt`: 137/137 testes em 16 arquivos; 22 cenários do login. Fixtures tipadas sem `any`; respostas HTTP reais nos testes, SDK mockado. Sem mock de gráficos.
- `c012_codex_build.txt`: exit 0, build cliente/servidor incluindo catálogo atualizado.
- `c012_codex_status.txt`: 3/3 testes de cobertura do PRD aprovados após atualização do catálogo (101 itens/12 entregas).
- `c012_codex_http.txt`: `/login`, `/staus` e `/super-admin` HTTP200; API sem sessão HTTP401 com `Cache-Control: no-store, private`. Esse teste sem Bearer não valida um login remoto.
- Servidor local reiniciado em `http://127.0.0.1:8080`; servidor anterior não estava mais disponível. Preview remoto permanece sem confirmação.
- Falha inicial de cache Vitest no sandbox (EPERM) resolvida executando o teste fora do sandbox. Um teste reutilizava Response já consumida; fixture corrigida para criar uma resposta nova por chamada.
- Relatório inicial do Antigravity alegava lint limpo; seu próprio `c012_lint.txt` registra 50 erros e exit 1. Evidências R1 preservadas como histórico, não como aprovação. Esta revisão substitui aquelas alegações.

## Pendências e divergências

- Controle do navegador indisponível (`Transport closed`); não houve QA visual desta revisão nem confirmação do novo preview remoto.
- Não houve login com conta real nem validação ponta a ponta do Auth Cloud. Passar em testes com mocks não comprova serviço remoto, cadastro ou isolamento.
- Vínculos persistidos, validação profissional, RLS/tenant, recuperação, segundo fator e implantação segura seguem pendentes conforme PRD.
- A diretriz Codex direto de 10/10 substitui as instruções antigas coordenador/Antigravity em AGENTS e no prompt anexado; PRD permanece intacto. README original descrevia ausência de backend; adendo atual esclarece Cloud habilitado sem domínio persistido.
- Próxima etapa: fundação persistida de clínicas e vínculos, com migrações versionadas e testes de isolamento, mantendo negação por padrão e sem bootstrap administrativo implícito.
