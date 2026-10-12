# Design e experiência da plataforma

Revisão C-002-R2, 08/10/2026. Esta entrega organiza as quatro áreas e os módulos previstos no PRD como prévias de interface. Não conclui os módulos de produção.

## Direção visual

Direção atual C006 (09/10/2026) e C028 (12/10/2026): azul marinho profundo, superfícies translúcidas foscas, textura discreta, bordas suaves e cartões com espaçamento generoso. Verde cana é a cor principal padrão; ciano, violeta e rosa distinguem séries e indicadores. Campos e botões têm cantos arredondados e foco visível. O tema claro continua disponível e preferências anteriores são preservadas. A identidade PlugPix permanece no Super ADM; as três áreas da clínica usam suas preferências visuais.

Na C028 (12/10/2026), o aplicativo do paciente foi reformulado com visual de celular e tela inicial resumida:

- Topo limpo sem seletores administrativos ou Super ADM, destacando a clínica ativa e o sino de avisos.
- Saudação ampla "Olá, [primeiro nome]" (28–32px), sem parágrafos de apresentação.
- Faixa compacta de Avisos com badge e central dedicada.
- Card principal Meu protocolo com acompanhamento, etapa e barra de progresso.
- Cards duplos lado a lado: Meu plano (situação) e Meu score (pontuação em destaque de 32–40px e modal de critérios).
- Humor e sono em cards duplos independentes com seleção de 5 emojis e relato opcional.
- Água de hoje com exibição em fonte grande e ação única de acréscimo rápido (+ Água).
- Grade de 12 acessos rápidos rigorosamente quadrados (`aspect-ratio: 1 / 1`) em 3 colunas no celular: Financeiro, Água, Clube de benefícios, Balança, Pulseira inteligente (com legenda adaptativa "Pulseira" em telas estreitas), Protocolo, Sono, Score, Exames, Adesão, Medicamentos e Treinos.
- Textura de fundo original (`/patient-mobile-texture.jpg`) e cards com efeito de vidro fosco translúcido (`backdrop-filter`) exclusivos da tela Início no layout de celular, com textos totalmente nítidos e fallback para navegadores sem suporte. Computador, tablet e telas internas mantêm o fundo padrão original.
- Seção expansível "Mais recursos" preservando acesso a todos os serviços adicionais.
- Rodapé fixo com seis destinos inegociáveis: INÍCIO | TELEMEDICINA | ÁGUA | IA | ALIMENTAÇÃO | PERFIL, com contraste e espaçamento de segurança inferior.

## Cobertura

- Super ADM: clínicas, médicos, clientes, planos, loja, financeiro, pulseiras, bioimpedância, blog, Academy, inovações e privacidade.
- Clínica: painel, pacientes, equipe, planos/produtos, CRM, vendas, comissões, protocolos, jornadas, retenção, dispositivos, integrações, Academy e personalização.
- Médico: painel, pacientes, consultas, exames, resumo clínico e mensagens.
- Aplicativo: Meu dia, saúde, bioimpedância, protocolos, hidratação, medicamentos, hábitos, alimentação, treinos, blog, benefícios, loja, dependentes, financeiro, indicações, preparação da consulta, linha do tempo, mensagens e privacidade.

As rotas e referências às seções do PRD estão em `src/features/demo/module-catalog.ts`. Personalização tem sua tela específica. Os demais layouts compartilham `module-page.tsx`, com conteúdo e etapas próprias por módulo.

## Interações e limites

Busca ignora caixa e acentos; filtro distingue exemplos de rascunhos. Formulários validam nomes, permitem cancelar, adicionar exemplo e consultar sua descrição. Exemplos são descartados ao sair, mudar de clínica ou recarregar. Somente preferências visuais ficam no navegador, separadas por ID de clínica.

Na C006, o usuário autorizou explicitamente dados de saúde fictícios para demonstração. Cliente e médico usam a mesma fonte estática, com unidades, datas, gráficos e tabelas acessíveis. Não são inventadas metas terapêuticas, prescrições, avaliações de IA ou regras de pontuação. Não há atendimento, prontuário, venda, autorização ou integração real. Autenticação, isolamento no servidor, auditoria e persistência clínica continuam pendentes.
