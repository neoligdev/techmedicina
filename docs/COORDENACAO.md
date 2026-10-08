# Coordenação - Techmedicina

## Papéis

- **Coordenador**: Codex (avalia requisitos, aprova ações, lê relatórios, delega etapas e valida interface/regras de negócio quando ferramentas automatizadas estão indisponíveis).
- **Executor**: Antigravity (executa código, compilações, testes e documentação na pasta do projeto). Único executor ativo nesta pasta.

## Diretrizes e Regras de Retomada

- **Tarefa Única**: Apenas uma tarefa ativa por vez na mesma pasta. Codex não editará arquivos nem fará verificações concorrentes.
- **Autorização**: A instrução atual autoriza coordenação e desenvolvimento imediato (Divergência registrada com frase antiga do PRD que adiava comandos, porém o PRD original é mantido intacto).
- **Trabalho Autônomo**: Agente deve continuar tarefas viáveis até concluir critérios ou encontrar bloqueio concreto, não encerrando o fluxo só porque concluiu um micro-passo.
- **Ambiente base**: Pasta absoluta `C:/Users/marco/OneDrive/Desktop/PROGRAMAÇÃO/techmedicina/techmedicina`, Repositório `https://github.com/neoligdev/techmedicina.git`, branch `main`.

Transferência final C-001-R2: executor OCIOSO; coordenador assumiu revisão documental e visual. Ver PROGRESSO.md. Durante execução do Antigravity, continuam proibidas edições ou checks concorrentes.

## Infraestrutura informada pelo usuário — 08/10/2026

O usuário informou que o projeto usa Lovable Cloud, conectado ao projeto via GitHub. Isso substitui a pendência de escolher um provedor. A configuração efetiva do ambiente, banco, autenticação, permissões e sincronização ainda não foi verificada pelo coordenador. Não presumir que a conexão com GitHub comprova serviços ativos ou isolamento de dados.

Próxima etapa: verificar a configuração existente do Lovable Cloud e o vínculo com este repositório antes de propor implementação de persistência/autenticação. Esta informação não autoriza commit, push, publicação ou alterações de produção; manter as restrições vigentes.

## Autorização de sincronização — 08/10/2026

O usuário autorizou explicitamente commit e push para atualizar o preview do Lovable e testar o sistema. A restrição anterior de envio ao GitHub está superada para estas alterações locais de validação. Não há autorização adicional para mudanças de produção ou serviços.

Antigravity permanece OCIOSO. Codex assume a tarefa de revisão e sincronização Git. origin/main foi atualizado por fetch e estava alinhado com HEAD (0/0) antes do commit. bun.lock permanece a referência versionada; package-lock.json preexistente não rastreado fica local. Logs .log são ignorados pelo Git; resumo reproduzível está em docs/EVIDENCIAS_VALIDACAO.md.

Após o push, conferir o commit efetivamente sincronizado no Lovable antes de considerar seu preview validado. Push bem-sucedido não comprova atualização do preview.
