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

## Estrutura

- `src/routes/`: quatro áreas (`/super-admin`, `/clinica`, `/medico`, `/app`) e páginas de extensão por seção, com metadados próprios.
- `src/components/platform/`: layout, marca, navegação, seletor de demonstração, tela Clínicas e página reutilizada “Em preparação”.
- `src/features/demo/`: tipos, dados administrativos fictícios, contexto de clínica, configuração de navegação, tema e metadados.
- `src/styles.css`: variáveis semânticas e identidades visuais da plataforma e das clínicas.
- `src/test/`: testes básicos.

A busca opera somente sobre as duas clínicas fictícias. “Visualizar clínica” seleciona o identificador no contexto React e abre a área da clínica. A seleção é temporária; ao recarregar, retorna à primeira clínica. As cores são definidas em variáveis por tema e o nome vem da identidade de cada clínica. O seletor “Demonstração” não é login: todas as áreas estão públicas, sem autorização ou isolamento real. Nenhum prontuário, senha ou chave foi criado.

## Pendências para produção

Backend e persistência; autenticação; autorização no servidor; isolamento entre clínicas; criptografia; auditoria; integrações. Os menus são pontos de extensão; apenas Clínicas está detalhado. Não usar a seleção demonstrativa como mecanismo de segurança.

## Regras futuras de negócio

- Vida faturável é pessoa habilitada, independentemente de uso.
- Prontuário definitivo não é editável.
- Médicos compartilham histórico somente na mesma clínica.
- Protocolo exige aptidão registrada por médico.
- Cliente possui um plano ativo.
