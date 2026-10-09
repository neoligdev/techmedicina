# Design e experiência da plataforma

Revisão C-002-R2, 08/10/2026. Esta entrega organiza as quatro áreas e os módulos previstos no PRD como prévias de interface. Não conclui os módulos de produção.

## Direção visual

Superfícies claras, bordas suaves, cartões com espaçamento generoso, títulos destacados e cores semânticas. Campos e botões têm cantos arredondados e foco visível. A identidade PlugPix permanece no Super ADM; as três áreas da clínica usam suas preferências visuais.

A navegação administrativa é agrupada por função. O aplicativo oferece quatro acessos principais e um botão Mais para os demais recursos. Listagens têm busca e filtro; conteúdo usa cartões; CRM usa colunas; jornadas e integrações mostram etapas e estado sem dados ou conexão.

## Cobertura

- Super ADM: clínicas, médicos, clientes, planos, loja, financeiro, pulseiras, bioimpedância, blog, Academy, inovações e privacidade.
- Clínica: painel, pacientes, equipe, planos/produtos, CRM, vendas, comissões, protocolos, jornadas, retenção, dispositivos, integrações, Academy e personalização.
- Médico: painel, pacientes, consultas, exames, resumo clínico e mensagens.
- Aplicativo: Meu dia, saúde, bioimpedância, protocolos, hidratação, medicamentos, hábitos, alimentação, treinos, blog, benefícios, loja, dependentes, financeiro, indicações, preparação da consulta, linha do tempo, mensagens e privacidade.

As rotas e referências às seções do PRD estão em `src/features/demo/module-catalog.ts`. Personalização tem sua tela específica. Os demais layouts compartilham `module-page.tsx`, com conteúdo e etapas próprias por módulo.

## Interações e limites

Busca ignora caixa e acentos; filtro distingue exemplos de rascunhos. Formulários validam nomes, permitem cancelar, adicionar exemplo e consultar sua descrição. Exemplos são descartados ao sair, mudar de clínica ou recarregar. Somente preferências visuais ficam no navegador, separadas por ID de clínica.

Não são inventadas metas de saúde, medicamentos, avaliações de IA, indicadores financeiros ou regras de pontuação. Não há atendimento, prontuário, venda, autorização ou integração real. Autenticação, isolamento no servidor, auditoria e persistência clínica continuam pendentes.
