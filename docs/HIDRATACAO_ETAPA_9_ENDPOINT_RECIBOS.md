# Hidratação — etapa 9: endpoint de recuperação

Codex, 30/10/2026. Implementação local; SQL 044 não aplicado no Cloud.

A rota GET /api/hydration/receipt aceita apenas recordId e sourceRequestId, UUIDs únicos. Clínica, paciente e identidade são derivados da resolução protegida do host e da sessão; nenhuma seleção demonstrativa autoriza a consulta. Host e leitura usam o mesmo bearer validado por requisição. A RPC 044 revalida o grant próprio/read no banco.

Resposta passa por schemas estritos e comparação de escopo, registro, solicitação e consistência de revisão/conteúdo antes de sair do servidor. Falhas de upstream não revelam resposta bruta nem ator interno. GET privado, no-store, Vary Authorization/Host; método indevido retorna 405. Localhost/preview continuam negados. A configuração gerada do roteador foi preservada.

O cliente envia somente os dois identificadores e bearer atual, com prazo máximo, sem cache, cookies, redirects ou retries. Compara a resposta com o comando original em memória; uma consulta sem recibo não prova falha definitiva de escrita em voo. Não há outbox clínica nem persistência de payload no navegador. A UI de escrita/recuperação permanece para a etapa seguinte.

Validação: suíte direcionada de runtime/cliente e contrato de confirmação, tipos, lint e compilação. Testes usam dados e sessões fictícios, não homologam Auth/host/SQL Cloud reais. Não foram alterados design, DNS, permissões clínicas, Cloud, main ou Publish.

Resultado final: 24 testes direcionados aprovados em 3 arquivos; TypeScript, lint dos arquivos alterados e build aprovados.
