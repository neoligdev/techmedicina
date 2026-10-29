# Dispositivos — etapa 4: lista de revisões

Codex, 29/10/2026. Continuação local após a705177; não incluída no pedido de integração desse candidato na main.

Lista sob demanda de versões por unidade: título, revisão e data, 10 por página, decrescente. Consulta selecionada usa a API de revisão exata já protegida. Não traz observações, firmware ou autor interno na listagem; não restaura, salva, libera equipamento ou modifica edição pendente. Página antiga descartada na troca de unidade/revisão. Erro não representa histórico vazio; tentativa explícita disponível.

GET /api/platform/device-registration-versions exige sessão de Super ADM. Parâmetros únicos/estritos, limite 1–50, revisão inteira positiva. Valida resposta no mesmo UUID, ordem decrescente estrita, cursor coerente e limite; não aceita conteúdo adicional. Bearer atual, no-store/private, Vary Authorization, sem cookies ou redirecionamento.

## Revisão SQL 040 — local apenas

Depende de 037. Uma função SECURITY DEFINER/search_path vazio, guarda de operador ativo em cada chamada FOR SHARE, EXECUTE sem PUBLIC/anon e sem acesso direto às tabelas. Cursor deve existir no histórico da unidade pedida. Sem alteração de tabela, registros, hardware, vínculo clínico ou estoque. Antes de futura aplicação autorizada: confirmar backend/dependências e ausência/comparar assinatura, sem reaplicar ou apagar objetos. Hash SHA256: 19bc290010fd9476a6cf2a477c199ea3ce0d4541c2fd3d82444e88c6c0a02285.

A regressão global de 1.335 testes pertence à base anterior 6fe31a8; não inclui esta nova etapa. Validações direcionadas e tipos/build desta etapa registrados após conclusão abaixo. Nenhum SQL remoto, main, Publish, DNS, infraestrutura ou grant clínico alterado.

Validação concluída: 20 testes direcionados (16 API/UI/editor e 4 PostgreSQL), mais 4 de status. TypeScript, lint direcionado e build com saída 0. HTTP anônimo local 401 com no-store/private. SQL 040 não aplicada.
