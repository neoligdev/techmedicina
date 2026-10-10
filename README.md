# PlugPix Techmedicina

> Estado em 10/10/2026 (C023): Lovable Cloud com C013/C015 aplicadas, RLS e RPC de cadastro auditado; primeiro Super ADM provisionado após autorização específica. Login/cadastro, diretório e auditoria com paginação implementados; 234 testes locais, TypeScript e build aprovados. Homologação com sessão real pendente. Dependências revisadas: instalação frozen e bun audit sem alertas conhecidos. Preview atualizado confirmado pela C022 R1 renderizada; Lovable reiniciou o runtime e Codex confirmou o formulário de login após falha de importação do cliente. Testes autenticados ainda aguardam entrada do titular. As quatro áreas continuam demonstrações públicas com dados fictícios, sem acesso clínico real. Status em /staus; executor atual Codex.

Base demonstrativa em português do Brasil, construída com React, TypeScript, TanStack Start e Tailwind CSS. Inclui interface azul marinho com superfícies foscas, catálogo local de rascunhos e painéis de saúde com dados fictícios compartilhados entre cliente e médico. As áreas demonstrativas usam dados fictícios; o acesso autenticado e o cadastro administrativo usam o Cloud, com homologação real ainda pendente. Integrações de dispositivos não estão concluídas.

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
A autorização LOTE 1 validou localmente o Design System e implementou os componentes focados em interfaces UX.

## Estrutura

- `src/routes/`: quatro áreas (`/super-admin`, `/clinica`, `/medico`, `/app`) e páginas de extensão por seção, com metadados próprios.
- `src/components/platform/`: layout, marca, navegação, seletor de demonstração, tela Clínicas, painéis e layouts de prévia por módulo.
- `src/features/demo/`: tipos, dados administrativos fictícios, contexto de clínica, configuração de navegação, tema e metadados.
- `src/styles.css`: variáveis semânticas e identidades visuais da plataforma e das clínicas.
- `src/test/`: testes básicos.

A busca opera somente sobre as duas clínicas fictícias e reflete seus nomes personalizados. “Visualizar clínica” seleciona o identificador no contexto React e abre a área da clínica. A seleção é temporária; ao recarregar, retorna à primeira clínica. O seletor “Demonstração” não é login: todas as áreas estão públicas, sem autorização ou isolamento real. Nenhum prontuário, senha ou chave foi criado.

## Personalização demonstrativa

O menu da clínica permite editar nome, cores e tema, salvar ou restaurar o padrão. Somente essas preferências visuais ficam no `localStorage`, separadas pelo identificador imutável da clínica; não há dados de saúde, credenciais ou permissões. A identidade é aplicada em `/clinica`, `/medico` e `/app`; `/super-admin` mantém PlugPix. As cores de uso em textos e botões são ajustadas para contraste; as amostras preservam as cores escolhidas. Falha de armazenamento gera aviso, sem confirmação falsa. Isso não substitui persistência, autorização ou isolamento no servidor.

Arquivos: `personalization-page.tsx` (tela); `features/demo/personalization.ts` (configuração/validação), `preference-storage.ts` (adaptador substituível), `theme.ts` (contraste/variáveis), `context.tsx` (preferências por unidade); ajustes no layout, lista, menu, rota da clínica, estilos e testes. Nenhum serviço ou dependência foi adicionado.

## Pendências para produção

Backend e persistência; autenticação; autorização no servidor; isolamento entre clínicas; criptografia; auditoria; integrações. Os menus são pontos de extensão; as áreas têm prévias de interface descritas em docs/DESIGN_SYSTEM.md. Não usar a seleção demonstrativa como mecanismo de segurança.

## Painéis demonstrativos e base PWA — C006

`/app` apresenta oito indicadores principais e seis gráficos. `/app/bioimpedancia` detalha composição corporal e `/app/saude` apresenta pulseira/atividade. `/medico/pacientes` e `/medico/resumo` usam o mesmo componente e as mesmas fixtures de `src/features/demo/health-data.ts`. Os dados são estáticos no código, identificados como fictícios; não são coletados nem persistidos como prontuário. Indicadores da H59/H59MAX e da balança dependem de documentação e validação reais.

A base PWA possui manifest, ícone SVG e service worker restrito à navegação do aplicativo. O worker usa rede sem cache e apresenta uma mensagem genérica ao perder conexão; não oferece histórico clínico offline. Instalação em aparelhos reais, ícones de instalação por clínica e suporte a iOS ainda precisam de validação. Registro de resultados e arquivos: `docs/RELATORIO_C006.md`.

Além das preferências visuais, o catálogo C005 guarda somente rascunhos comerciais fictícios no navegador. Não há ativação, cobrança ou venda real.

## Regras futuras de negócio

- Vida faturável é pessoa habilitada, independentemente de uso.
- Prontuário definitivo não é editável.
- Médicos compartilham histórico somente na mesma clínica.
- Protocolo exige aptidão registrada por médico.
- Cliente possui um plano ativo.
