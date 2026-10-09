# Escopo inicial

## Modernização visual — 09/10/2026

- [x] Consolidar tokens escuros/claros e superfícies foscas nas quatro áreas.
- [ ] Refinar navegação, formulários, listas, diálogos e personalização sem mudar regras.
- [ ] Verificar testes, lint e fluxos no navegador em celular, tablet e desktop.
- [ ] Registrar evidências, arquivos alterados e limites na documentação.

- [x] Quatro áreas navegáveis e seleção demonstrativa de clínica.
- [x] Tela Clínicas com busca e duas clínicas fictícias.
- [x] Identidades, adaptação a celular e páginas em preparação.
- [x] Documentação, regras futuras e verificação de navegação.

## Personalização demonstrativa

- [x] Tela de personalização e validação.
- [x] Preferências visuais por clínica no navegador e aplicação nas três áreas.
- [x] Documentação e verificação de salvar, recarregar e alternar clínicas.

Validação local de 08/10/2026: consulte `VALIDACAO_LOCAL.md` para resultados, diferenças em relação ao PRD e limites da demonstração.

## Coordenação (Adicionado)

- [x] Teste de conectividade C-000 concluído (leitura via Antigravity).
- [x] Tarefa C-001 (continuidade, documentos docs/COORDENACAO e PROGRESSO, cópia PRD e validação base).
- [x] Fracionamento e organização das etapas do PRD, respeitando dependências e limites desta etapa.

- [x] Matriz das 34 seções do PRD e dependências registrada em docs/MATRIZ_REQUISITOS.md.
- [x] Verificação visual móvel parcial e desktop, com limites registrados em docs/PROGRESSO.md.
- [x] Lote 1: Design UX/UI Premium (Off-white/Petróleo) e mockups criados (app, médico, clínica, super-admin).
- [x] Confirmar cores pelo seletor nativo do navegador. (Resolvido nas implementações seguintes)
- [x] Infraestrutura indicada pelo usuário: Lovable Cloud.
- [ ] Confirmar/habilitar banco e autenticação e implementar políticas por clínica.
- [x] C-002-R2: navegação por grupos, layouts por módulo, formulários temporários e painéis sem informações clínicas inventadas.
- [x] Verificar quatro áreas e diálogo em modo móvel no preview do Lovable.
- [x] Verificar tema escuro do diálogo e marca PlugPix preservada.
- [ ] Esclarecer aviso Build unsuccessful mantido no histórico, apesar de preview atualizado.
- [x] C-003-R3: Fundação parcial de autorização lógica (`core.ts` e `guards.server.ts`) e diagnósticos testados unitariamente (403) e HTTP (401).
- [ ] Implementar autenticação real, RLS no banco, encriptação e auditoria (Pendentes da fundação global C-003).

## C006 — entrega de interface e dados demonstrativos

- [x] Design global azul marinho/fosco e gráficos administrativos.
- [x] Painéis do cliente e médico com mesma fonte fictícia, gráficos e tabelas.
- [x] QA 390px/1440px, preferências por clínica e identidade PlugPix.
- [x] Tipos, lint, 64 testes e build validados.
- [x] Base manifest/service worker sem cache de dados de saúde.
- [ ] Homologar instalação PWA em dispositivos reais e ícones por clínica.
- [ ] Validar modelo H59/H59MAX, balança e protocolos oficiais.
- [ ] Implementar dados reais, autenticação e isolamento no servidor.

## C008 — Simulador de Rentabilidade Didático

- [x] Criação de `calculator.ts` isolado sem dependências de estado.
- [x] Gráficos de barra proporcionais baseados em premissas configuráveis.
- [x] Cobertura estrita contra estouro de soma e cálculos irregulares de Infinity.
- [x] Pipeline local com validações finais passando (R3).
- [ ] QA Visual (mobile/desktop) via navegador do usuário (Pendente de conexão).

## C009 — Levantamento da Fundação Lovable Cloud

- [ ] Realizar mapeamento e levantamento técnico da fundação de back-end em cloud.
- [ ] Preservar credenciais (não criar tokens desnecessários nem alterar banco de produção).
