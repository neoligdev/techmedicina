# Coordenação de agentes — desenvolvimento paralelo

Configuração local preparada por Codex em 21/10/2026, por instrução humana específica. Este documento prevalece sobre as atribuições históricas de executor único de docs/COORDENACAO.md somente quanto à divisão abaixo. Uma única pessoa/agente por worktree.

## Base e histórico preservado

D112: 93c45de125d93d54b61cf93e18625ed532e97895 (implementação Antigravity; consolidação Codex). Já estava versionada; não foi refeita.
Base comum escolhida: 6479cf0eff60d7dac586f256903ce95ffc8e38a8 (D115), preservando D113, D114 e D115 posteriores ao contexto desatualizado do pedido. Referência anterior de validação: 896 testes aprovados; isso não representa nova execução nesta preparação.
Original: C:/Users/marco/OneDrive/Desktop/PROGRAMAÇÃO/techmedicina/techmedicina, checkpoint/d69-d74, mantido em D115, com os auxiliares não rastreados preservados.
main preservada: 111b397f65e11438fcee8a4598d4a1e7f3730d5c.

## Ambientes

| Papel | Branch | Diretório |
| --- | --- | --- |
| Integração | develop | Sem checkout permanente; integrar uma operação por vez |
| Codex | dev/codex-backend | C:/dev/techmedicina-codex |
| Antigravity | dev/antigravity-frontend | C:/dev/techmedicina-antigravity |

As três branches foram criadas em D115. O primeiro commit documental desta configuração será exclusivo da branch Codex até integração revisada. Não confundir essa diferença posterior com bases de código divergentes.

## Responsabilidades

Codex: backend, banco/migrações, APIs, autenticação/RLS, regras de negócio, integrações e contratos de backend.
Antigravity: frontend, PWA, painéis Super ADM/clínica/médico/paciente, UX, responsividade, componentes e testes de interface.
Não editar arquivos do outro executor sem combinar escopo. Contratos compartilhados devem ser versionados e aprovados antes de consumo. Abrir o diretório correto no IDE; não trabalhar simultaneamente na pasta original.

## Integração e arquivos compartilhados

Fluxo: dev/codex-backend e dev/antigravity-frontend → develop, por PR ou merge revisado; develop → main somente após validação e aprovação humana. Commits pequenos; resolver conflitos antes de integrar. Nunca reset, clean, rebase de histórico publicado ou force push. Apenas uma integração por vez.
Catálogo oficial, catalog.ts e STATUS_PROJETO_TEMPORARIO.md são atualizados somente na integração. Cada agente registra proposta de entrega e evidências em relatório próprio, preservando autoria. PRD/adendos, AGENTS.md, package.json, bun.lock, rotas geradas, contratos compartilhados e CSS global exigem coordenação prévia; não editar os mesmos arquivos simultaneamente. Reservar o próximo número de migração antes de criá-la.

## Cloud e publicação

Codex coordena o acesso Cloud. Nunca dois agentes alterando Cloud ao mesmo tempo; nenhuma migração concorrente. DDL, permissões clínicas, DNS e produção exigem autorização concreta. Esta preparação não autoriza tais ações. Não enviar prompts ao Ask Lovable. Não trocar a branch de sincronização do Lovable.
GitHub consultado por git ls-remote: apenas main e checkpoint/d69-d74, ambos alinhados às referências locais em 21/10. Nenhum push nesta etapa. Antes de eventual push apresentar branches, commits e destino origin (https://github.com/neoligdev/techmedicina.git).
Lovable inspecionado em modo leitura em 21/10: neoligdev/techmedicina, main, Connected, In sync; o painel informa verificação anterior de quatro horas. Isso não comprova novo build. Branches locais de desenvolvimento não atualizam o preview.

## Dependências e testes independentes

bun.lock é oficial. Em cada diretório executar npx --yes bun install --frozen-lockfile (ou Bun instalado). Não copiar node_modules entre ambientes nem compartilhar junctions. Não copiar credenciais ou configurações secretas do original. Arquivos já rastreados vêm do checkout Git; revisar o uso local de .env antes de testes conectados. Não imprimir valores.
Testes: npx --yes bun run test -- --maxWorkers=1; tipos: npx --yes bun x tsc --noEmit; build: npx --yes bun run build. Servidores devem usar portas distintas (exemplo Codex 8082, Antigravity 8083) sem ativar endpoints Cloud. Registrar limitações locais separadamente de homologação real.

## Encerramento desta etapa

Nenhuma implementação funcional nova, migração, deploy, alteração da main ou push. D113 já existia e não foi reiniciada. Próximo trabalho simultâneo depende de abrir cada IDE na worktree atribuída e combinar o primeiro contrato compartilhado. Para consultar o estado: git worktree list; git branch -vv; git -C <diretório> status --short; git -C <diretório> rev-parse HEAD.

## Evidência final da preparação

As instalações com Bun 1.4.3 e --frozen-lockfile concluíram nas duas worktrees. A tentativa inicial com cache comum encontrou ENOTEMPTY; foi interrompida e repetida com caches exclusivos, sem apagar arquivos:
- Codex: definir BUN_INSTALL_CACHE_DIR=C:/dev/cache-techmedicina-codex antes da instalação.
- Antigravity: definir BUN_INSTALL_CACHE_DIR=C:/dev/cache-techmedicina-antigravity antes da instalação.
O ambiente Bun informou leitura de .env ignorado pelo Git. Não foi copiado nenhum arquivo secreto do original nem foram lidos/registrados valores. Não presumir que o checkout dispense configuração local para testes conectados.
Teste de fumaça escolhido: src/test/domain-possession.test.ts, isolado e sem rede real. A suíte completa não foi repetida nesta tarefa de preparação.
As worktrees ficam fora dos writable roots desta sessão Codex; o acesso foi autorizado por escalonamento para a preparação. Uma sessão futura deve abrir C:/dev/techmedicina-codex como workspace, evitando depender de permissões excepcionais a cada edição.
Resultado: 10 testes aprovados em cada worktree (um arquivo por ambiente). git status sem mudanças rastreadas nas duas worktrees após instalação; bun.lock preservado. git merge-base confirma D115 como base comum. A diferença na branch Codex contém exclusivamente este documento de coordenação. Não houve atualização do catálogo de entregas: trata-se de preparação Git, e o status oficial só deve mudar durante integração.
