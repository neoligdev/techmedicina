# Homologação inicial do preview — aa61b4e

Executor: Codex. Autorização humana específica recebida: “Autorizar integração aa61b4e na main para preview”.

## Integração efetiva

main remota avançou por push normal de 111b397f65e11438fcee8a4598d4a1e7f3730d5c para aa61b4e633810a6c7f2318dbdefafbf1a95f3d96. git ls-remote confirmou exatamente o SHA autorizado; main local e origin/main também foram atualizadas ao mesmo SHA. Sem force, rebase ou inclusão de trabalho posterior. A pasta original permanece no checkpoint e seus auxiliares não rastreados foram preservados.

Lovable consultado no editor do projeto 75200069-2ce5-40c9-a874-f12db50531be: main conectada, nova revisão documental exibida no histórico. Foi acionado apenas Update preview, seguido de abertura do preview. Os detalhes da revisão mostraram o diff de RELATORIO_CODEX_RECIBOS_HTTPS.md correspondente à preparação final de aa61b4e. A página /staus renderizou a entrega D118 e 117 entregas de base/demonstração. Foram usados tanto o preview estático compilado quanto o preview ativo do editor; nenhum prompt Ask Lovable foi enviado.

## Testes realizados no navegador

| Verificação | Resultado observado |
| --- | --- |
| Status /staus | D118 visível; 34 seções, 67 subitens, 117 entregas de base. Indicadores separam conclusão integral e cobertura iniciada. |
| Login | E-mail/Senha presentes e botão Entrar habilitado; não permaneceu em confirmação de sessão. Nenhuma senha digitada ou conta criada. |
| Navegação | Super ADM, Clínica e Paciente abertos pela interface demonstrativa; opções das quatro áreas conferidas. |
| Identidade central | Marca PlugPix/Techmedicina preservada no Super ADM, inclusive após transitar por clínica e PWA. |
| Personalização local | Nome de clinica-viva alterado temporariamente para “Clínica Viva Saúde — QA aa61”, salvo pela UI e confirmado após Refresh do preview. Nome original restaurado e salvo. Imagens, cores e textura não foram trocadas. |
| Separação entre clínicas | Clínica Horizonte manteve seu próprio nome ao abrir sua personalização após salvar/recarregar/restaurar a clínica Viva. Os dois IDs são demonstrativos; isso não atesta isolamento de dados clínicos no Cloud. |
| Rodapé do PWA | Em viewport móvel do preview: position=fixed; borda inferior em aproximadamente 455,33 px para viewport de 455 px, antes e depois de rolagem. Menu permaneceu visível. |

O formulário de personalização confirmou explicitamente gravação neste navegador e integração com pacientes de outros dispositivos ainda pendente. Os dados usados na navegação são fictícios. Nenhum upload, exclusão ou escrita em backend foi realizado.

## Evidências

- evidencias/preview-aa61b4e/status-D118.png
- evidencias/preview-aa61b4e/login.png
- evidencias/preview-aa61b4e/paciente-inicio.png
- evidencias/preview-aa61b4e/paciente-rolagem.png

## Escopo das verificações e pendências

O lote já tinha 981 testes locais aprovados em 116 arquivos, tipos/lint/build aprovados e quatro testes adicionais do catálogo após reconciliação documental. Esses são resultados anteriores ao envio autorizado; não foram repetidos nesta homologação exclusivamente de navegador/metadados Git.

Não foram executadas migrações SQL 014–019, permissões clínicas, configuração de worker/DNS, ativação de agenda/domínios ou Publish. Não se afirma atualização do site publicado techmedicina.lovable.app por esta ação. O resultado confirmado é o preview do editor Lovable.

O preview estava sem sessão autenticada. Cadastro/edição reais de clínica, auditoria com Super ADM e operações médicas/paciente continuam exigindo homologação autenticada específica. OAuth, instalação física de PWA e dispositivos não foram testados. Nenhum resultado declara o PRD completo ou um módulo clínico apto à produção.

Há commits posteriores nas branches backend/integração/frontend, incluindo trabalhos D119–D123 observados nos logs. Não foram incluídos no envio autorizado de aa61b4e. Devem ser revistos e testados a partir do estado atual, preservando as autorias, antes de nova integração à main. A página de status do preview permanece corretamente em D118.

A aba Lovable foi deixada no /staus. Esta branch QA contém apenas o relatório e capturas; não altera o código da aplicação nem o catálogo oficial.
