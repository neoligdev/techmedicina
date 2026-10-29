# Dispositivos — etapa 2: biblioteca de cadastros declarados

Codex, 28/10/2026. PRD 25.1/25.2 permanecem parciais.

Biblioteca pesquisa literalmente por título, modelo ou identificador declarado, ignorando caixa. Páginas de 25 por UUID e cursor exclusivo; abertura respeita edição suja/resposta incerta, e recibo confirmado atualiza lista. Modelo, identificador e firmware são exibidos como informados e sem liberação de integração. Nenhum número representa estoque físico verificado, vidas ou telemetria.

GET /api/platform/device-registration-drafts exige sessão/Super ADM e retorno estrito com integrationAuthorized=false. Recusa alegação de liberação, dados extras e cursor/ordem/filtro incompatíveis. Texto de busca não vira padrão LIKE, incluindo % e _. UI diferencia falha de coleção vazia e descarta respostas antigas. Cliente usa token atual, prazo e no-store/credentials omit/redirect error.

## Revisão da proposta SQL 038

Local apenas, depende de 037. Adiciona somente RPC administrativa de metadados, usando chave primária UUID existente e limite 1–50. Cursor pertence ao filtro atual. SECURITY DEFINER/search_path vazio e operador ativo revalidado sob bloqueio compartilhado. Anônimo sem EXECUTE, sem acesso direto às tabelas e sem campos clínicos/autor interno/notas na lista. Não altera autorização de unidade, estoque, expedição, vínculos ou ingestão.

Antes de aplicação remota futura: confirmar 037 e ausência/comparar assinaturas; nunca reaplicar cegamente ou remover registros. 037–038 não fazem parte do pedido de autorização 034–035 e não foram aplicadas no Cloud. Busca não promete remoção de acentos, full-text ou snapshot entre requisições. Mudar título/modelo/identificador pode invalidar cursor de busca e exigir reinício.

Validação: 20 testes em 5 arquivos (SQL/HTTP/clientes/UI), TypeScript, lint direcionado e build aprovados. Cadastros em duas páginas, busca literal por identificador, recusa de alegada liberação e abertura protegida verificados. HTTP local anônimo recusado com 401/no-store. Navegador local confirma cartão protegido e identidade PlugPix preservados; não houve gravação autenticada real no Cloud.

Regressão visual adicional do PWA /app/escudos: footer position fixed, base 720px na janela de 720px antes/depois de scrollY=200; scrollWidth=1265 e viewportWidth=1280, sem overflow horizontal. Não alterou tema/personalização ou CSS; teste somente nessa janela desktop, sem afirmar homologação móvel integral. Evidências em docs/evidencias/dispositivos/.

Continuidade: firmware/identificadores e métodos de autenticação exigem documentação/hardware real; estoque e expedição aguardam estados/regras finais. Main para preview tem proposta específica 5b4ff09 pendente (exclui estas duas etapas posteriores de dispositivos). SQL 034–035 tem autorização separada pendente; 036–038 não foram autorizadas por inferência. Sem Publish, DNS, credenciais ou grants clínicos.
