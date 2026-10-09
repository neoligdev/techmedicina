# Coordenação - Techmedicina

## Papéis

- **Coordenador**: Codex (avalia requisitos, aprova ações, lê relatórios, delega etapas e valida interface/regras de negócio). O Codex NUNCA deve editar o projeto diretamente.
- **Executor**: Antigravity (executa código, compilações, testes e documentação na pasta do projeto). Único executor ativo nesta pasta.

## Diretrizes e Regras de Retomada

- **Tarefa Única**: Apenas uma tarefa ativa por vez na mesma pasta. Codex não editará arquivos nem fará verificações concorrentes.
- **Autorização**: A instrução atual autoriza coordenação e desenvolvimento imediato (Divergência registrada com frase antiga do PRD que adiava comandos, porém o PRD original é mantido intacto).
- **Trabalho Autônomo**: Agente deve continuar tarefas viáveis até concluir critérios ou encontrar bloqueio concreto, não encerrando o fluxo só porque concluiu um micro-passo.
- **Ambiente base**: Pasta absoluta `C:/Users/marco/OneDrive/Desktop/PROGRAMAÇÃO/techmedicina/techmedicina`, Repositório `https://github.com/neoligdev/techmedicina.git`, branch `main`.

Transferência final C-001-R2: executor OCIOSO; coordenador assumiu revisão documental e visual. Ver PROGRESSO.md. Durante execução do Antigravity, continuam proibidas edições ou checks concorrentes.

## Infraestrutura e Sincronização (Atualizado 09/10/2026)

O usuário informou que o projeto usa Lovable Cloud, conectado via GitHub. A configuração efetiva de DB e Auth ainda não foi verificada, devendo prosseguir localmente.

### Autorização de Desenvolvimento Contínuo
O usuário autorizou explicitamente o desenvolvimento contínuo (PRD contínuo).
O executor Antigravity é o único executor autorizado e é responsável por realizar os **commits e push normais** diretamente, de acordo com o fluxo, sem precisar delegar o push ao Coordenador. A restrição antiga de envio ao GitHub está completamente superada para estas tarefas autorizadas.
Não há autorização para ativação de deploy em nuvem ("Publish/Cloud activation") neste momento.

Antigravity permanece OCIOSO. Codex assume a tarefa de revisão e sincronização Git. origin/main foi atualizado por fetch e estava alinhado com HEAD (0/0) antes do commit. bun.lock permanece a referência versionada; package-lock.json preexistente não rastreado fica local. Logs .log são ignorados pelo Git; resumo reproduzível está em docs/EVIDENCIAS_VALIDACAO.md.

Após o push, conferir o commit efetivamente sincronizado no Lovable antes de considerar seu preview validado. Push bem-sucedido não comprova atualização do preview.


## Atualização humana — 09/10/2026
O usuário autorizou explicitamente o Codex a implementar diretamente a modernização global e os painéis demonstrativos, fazer commit e push. Esta decisão substitui o executor exclusivo Antigravity registrado anteriormente. Preservar uma tarefa/executor ativo por vez, Git sem reescrita e requisitos do PRD. Resultados atuais em RELATORIO_C006.md.
