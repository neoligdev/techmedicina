# Hidratação — etapa 6: consulta no PWA

Codex, 30/10/2026. PRD 8.3 parcial.

Rota /app/hidratacao usa cartão e tokens existentes, preservando a identidade visual da clínica, cabeçalho e rodapé. Tela de consulta apenas: não cria consumo, meta, prescrição ou notificação. Em localhost/preview exibe aviso e não consulta Auth/dados reais. Em host operacional, identidade Auth controla montagem; autorização efetiva e host continuam no servidor. Identificador de usuário não vira paciente. Ao sair/trocar conta, componente é desmontado e registros não permanecem na tela.

Consulta por hoje, últimos sete dias, mês ou ano corrente. Exige fuso explícito; opções iniciais Bahia/São Paulo/UTC, sem usar silenciosamente o computador nem persistir preferência. Convenções/unidades continuam propostas locais, não regra clínica. O corte asOf representa a consulta solicitada pelo cliente, não timestamp autoritativo do servidor. Relógio/configuração operacional ainda precisam homologação.

Carregador recupera contexto próprio e todas as páginas com token atual em cada chamada. Limite técnico de mil páginas/100 mil snapshots; excesso ou falha gera erro e nenhum gráfico parcial. Consulta usa margem de 48 horas antes da primeira data civil para os fusos operacionais expostos; projeção filtra exatamente as datas locais. Expansão dos fusos deve revisar essa estratégia. Sem cache de saúde, localStorage ou outbox.

Atualizações entre páginas não formam snapshot transacional: botão permite nova consulta, sem promessa de fotografia exata do banco. Margem pode trazer registros fora do período, que a projeção exclui; paginação completa se refere ao intervalo consultado. Maior volume requer benchmark. Navegar/sair impede aplicar resposta antiga e interrompe próximas páginas; RPC já em andamento pode terminar até seu deadline.

Precisão: uma ocorrência futura dentro do mesmo milissegundo não deve ser contada. Comparação do corte agora preserva o sufixo fracionário além dos milissegundos, coberto por teste. Tabela distingue ausência (desconhecido) de zero informado, sem inferir consumo real ou adesão.

Validação inicial: 19 testes em 3 arquivos de painel/projeção/gráfico, com paginação, falha intermediária/retry, descarte após desmontagem, contexto inválido, preview bloqueado e remoção de total já exibido após logout. TypeScript/lint/build aprovados. Novas fixtures usam apenas dados sintéticos; nenhuma chamada clínica Cloud homologada nesta etapa.

Navegador local: tela protegida renderizada, footer fixed com base 720px na janela de 720px; largura do documento 1280px para viewport 1280px, sem overflow horizontal nessa janela desktop. Evidência em docs/evidencias/hidratacao/pwa-protegida.png. Não é homologação móvel ou de dados reais.

Próxima etapa: escrita HTTP/recibo e formulário, mantendo permissões e revisão. Cloud 041–043, DNS/domínio, grants QA e main permanecem nos respectivos gates.

Regressão global concluída em 30/10/2026 sobre e11b928: 1.399 testes em 175 arquivos, 549,95 segundos, saída 0. Código permaneceu estável durante a execução; somente documentação foi preparada. Lint global: zero erros e 7 avisos preexistentes. Nenhuma aplicação SQL remota ou alteração de main incluída.
