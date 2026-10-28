# Contrato da clínica — etapa 4: histórico somente leitura

Codex, 28/10/2026. PRD 13.1 permanece parcial: histórico de rascunhos não é aceite contratual.

Editor de rascunho salvo inclui listagem sob demanda de títulos/datas históricos, páginas de 10 por revisão decrescente e consulta exata em painel separado. Mostra setup, mensalidade, escolhas, vidas e preços de titular/dependente, mantendo null como não definido e zero como valor explícito. Não calcula total nem altera campos atuais. Textos e notas são escapados; nenhuma restauração, aceite ou cobrança é exposta.

APIs GET /api/platform/clinic-contract-version e /api/platform/clinic-contract-versions usam sessão validada e RPCs com o mesmo bearer. DTOs estritos confirmam rascunho/clínica/revisão, ordem e cursor; respostas privadas/no-store. Cliente obtém token atual e prazo máximo. Troca de rascunho/clínica/revisão/cliente ou desmontagem descarta respostas antigas. Falha não é tratada como versão inexistente.

Proposta SQL local 036 depende de 034 e adiciona somente duas RPCs protegidas; detalhes em REVISAO_MIGRACAO_CONTRATOS_036.md. Não faz parte da autorização 034–035 solicitada, não foi aplicada no Cloud e não aprova novos acessos.

Validação: 19 testes direcionados/4 arquivos (SQL local, API/clientes, painel e integração do editor), TypeScript, lint direcionado e build aprovados. HTTP local confirmou 401/private/no-store/Vary Authorization nas duas rotas. A regressão anterior de 1.288 testes/154 arquivos foi da base até e71769f e não inclui automaticamente esta integração posterior.

Próximos passos produtivos exigem definir aceite, regras comerciais finais, vigência e cobrança, além de homologar Cloud com autorização específica. Não foi reconstruído o design nem alterado main, Publish, DNS, infraestrutura, credenciais ou grants clínicos.
