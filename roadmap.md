# Escopo inicial

## Modernização visual — 09/10/2026

- [ ] Consolidar tokens escuros/claros e superfícies foscas nas quatro áreas.
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
- [ ] Confirmar cores pelo seletor nativo do navegador.
- [x] Infraestrutura indicada pelo usuário: Lovable Cloud.
- [ ] Confirmar/habilitar banco e autenticação e implementar políticas por clínica.
- [x] C-002-R2: navegação por grupos, layouts por módulo, formulários temporários e painéis sem informações clínicas inventadas.
- [x] Verificar quatro áreas e diálogo em modo móvel no preview do Lovable.
- [x] Verificar tema escuro do diálogo e marca PlugPix preservada.
- [ ] Esclarecer aviso Build unsuccessful mantido no histórico, apesar de preview atualizado.
- [x] C-003-R3: Fundação parcial de autorização lógica (`core.ts` e `guards.server.ts`) e diagnósticos testados unitariamente (403) e HTTP (401).
- [ ] Implementar autenticação real, RLS no banco, encriptação e auditoria (Pendentes da fundação global C-003).
