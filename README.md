# PlugPix Techmedicina

Base demonstrativa em português do Brasil, construída com React, TypeScript, TanStack Start e Tailwind CSS. Não possui banco, autenticação real ou integrações.

## Execução

```sh
bun install
bun run dev
# Verificações locais:
bun run test
bun run build
```

Abra o endereço indicado pelo Vite. `/` direciona para `/super-admin`.

Neste computador também foi validada a execução com Node/npm: `npm run dev`, `npm run test`, `npm run build`, `npm run lint` e `npx tsc --noEmit`, usando as dependências já instaladas. O endereço depende da porta disponível. Resultados da retomada e diferenças em relação ao PRD externo estão em `VALIDACAO_LOCAL.md`.

## Estrutura

- `src/routes/`: quatro áreas (`/super-admin`, `/clinica`, `/medico`, `/app`) e páginas de extensão por seção, com metadados próprios.
- `src/components/platform/`: layout, marca, navegação, seletor de demonstração, tela Clínicas e página reutilizada “Em preparação”.
- `src/features/demo/`: tipos, dados administrativos fictícios, contexto de clínica, configuração de navegação, tema e metadados.
- `src/styles.css`: variáveis semânticas e identidades visuais da plataforma e das clínicas.
- `src/test/`: testes básicos.

A busca opera somente sobre as duas clínicas fictícias e reflete seus nomes personalizados. “Visualizar clínica” seleciona o identificador no contexto React e abre a área da clínica. A seleção é temporária; ao recarregar, retorna à primeira clínica. O seletor “Demonstração” não é login: todas as áreas estão públicas, sem autorização ou isolamento real. Nenhum prontuário, senha ou chave foi criado.

## Personalização demonstrativa

O menu da clínica permite editar nome, cores e tema, salvar ou restaurar o padrão. Somente essas preferências visuais ficam no `localStorage`, separadas pelo identificador imutável da clínica; não há dados de saúde, credenciais ou permissões. A identidade é aplicada em `/clinica`, `/medico` e `/app`; `/super-admin` mantém PlugPix. As cores de uso em textos e botões são ajustadas para contraste; as amostras preservam as cores escolhidas. Falha de armazenamento gera aviso, sem confirmação falsa. Isso não substitui persistência, autorização ou isolamento no servidor.

Arquivos: `personalization-page.tsx` (tela); `features/demo/personalization.ts` (configuração/validação), `preference-storage.ts` (adaptador substituível), `theme.ts` (contraste/variáveis), `context.tsx` (preferências por unidade); ajustes no layout, lista, menu, rota da clínica, estilos e testes. Nenhum serviço ou dependência foi adicionado.

## Pendências para produção

Backend e persistência; autenticação; autorização no servidor; isolamento entre clínicas; criptografia; auditoria; integrações. Os menus são pontos de extensão; apenas Clínicas está detalhado. Não usar a seleção demonstrativa como mecanismo de segurança.

## Regras futuras de negócio

- Vida faturável é pessoa habilitada, independentemente de uso.
- Prontuário definitivo não é editável.
- Médicos compartilham histórico somente na mesma clínica.
- Protocolo exige aptidão registrada por médico.
- Cliente possui um plano ativo.
