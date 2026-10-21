# Recibos DNS e transporte HTTPS protegido — proposta D118

21/10/2026 · executor Codex · branch dev/codex-backend. Implementação local incremental sobre D116/D117. Sem mudanças no design, main, DNS ou Cloud.

## Entregue no código

019_domain_dns_proof_read.sql permite que operador ativo consulte um recibo já persistido por domínio e desafio exatos. Retorna digest, escopo, autor/instante e indicadores de revisão vigente/validade. Não retorna token bruto e não repete DNS nem consome novamente o desafio. Após rotação, o recibo permanece histórico e inválido para novas transições. A leitura mantém RLS/locks e não concede acesso à tabela de provas.
createDnsReceiptReader valida IDs, identidade, escopo, formato e consistência dos indicadores e recalcula expiração ao responder. readDomainDnsReceipt usa o transporte existente com bearer/publishable da sessão verificada; sem service key e sem nova rota HTTP. Depende da 019 aplicada antes de conectar a uma interface.
probeDomainHttps implementa observação de transporte: lê apenas o hostname canônico de uma reserva pendente, exige operador e política técnica limitada. Resolve todos os IPs, rejeita todo o conjunto se qualquer endereço for não público/inválido e fixa um endereço literal aprovado na conexão HTTPS. Conserva Host/SNI e validação de cadeia/nome do certificado, não reutiliza agente global nem segue redirects. GET somente na rota técnica proposta /.well-known/plugpix-routing, porta 443, sem cookies/bearer. Limita tempo total, cabeçalhos e corpo; rejeita resposta truncada e status diferente de 200. DNS que termina após timeout não abre conexão tardia; requisição HTTPS recebe AbortSignal.

## Limite essencial de roteamento

O transporte devolve corpo e fingerprint apenas ao chamador server-only. Não afirma routingVerified, não grava prova TLS, não ativa domínio e não confirma sozinho a aplicação correta. Texto/marker público copiável não é prova exclusiva do projeto. A próxima etapa precisa de desafio assinado vinculado a host/domínio/clínica/ambiente/revisão/validade e ingresso que assine pelo host efetivamente confiável, impedindo reflexão/relay de resposta do domínio central. Nenhuma chave, endpoint no ingresso, CNAME/A ou destino de hospedagem foi inventado/configurado. O corpo remoto nunca é renderizado como HTML nem devolvido por rota pública neste lote.

## Fontes técnicas consultadas

- https://nodejs.org/download/release/latest-v22.x/docs/api/https.html — opções HTTPS/TLS e agentes; consultado em 21/10/2026.
- https://nodejs.org/api/tls.html — validação do certificado/SNI; consultado em 21/10/2026. Capacidade efetiva do runtime Cloud ainda precisa de homologação.
- https://www.iana.org/assignments/iana-ipv4-special-registry — faixas especiais IPv4.
- https://www.iana.org/assignments/iana-ipv6-special-registry — faixas especiais IPv6, incluindo documentação 3fff::/20. Consulta 21/10/2026.

Política IP conservadora: bloqueia faixas especiais selecionadas e só permite IPv6 unicast global ordinário. Exceções públicas dentro de faixas bloqueadas não são liberadas automaticamente; não promete suportar qualquer endereço global. Não usa biblioteca nova. Conferir registros/política de rede antes de ativar sondas reais; filtragem de endereço não elimina necessidade de controle de saída no executor.

## Validação e pendências

Testes locais de PostgreSQL PGlite verificam recuperação do recibo, rotação e recusa a contas comuns/anônimas e domínio incorreto. Testes do transporte simulam stream/request e conferem conexão literal-IP, SNI, Host, validação do nome, ausência de cookies/Authorization, certificado não autorizado, redirects, corpo excessivo e resposta incompleta. Testes de política cobrem IPv4/IPv6, endereços especiais, conjuntos DNS mistos, timeout e resposta tardia. Não houve conexão real ou homologação de certificado de domínio real. TypeScript/lint corrigiram somente tipagem de testes; verificações estritas mantidas. Resultados completos registrados após regressão/build.

Cloud 017–019 pendente; 014–016 continuam com seus próprios gates. Necessários identidade mínima do worker, transporte de observação privada, prova de roteamento assinada, persistência TLS e transições auditadas. Atualização do status oficial somente em develop durante integração. Main/preview depende de revisão e autorização de integração, sem Publish automático.

## Resultado consolidado

Regressão completa: 981 testes aprovados em 116 arquivos (309,48 segundos). TypeScript, lint dos arquivos afetados e build local aprovados. Validação direcionada: 72 testes de persistência/sonda/transporte, mais quatro testes de recibos. DNS, HTTPS e certificados reais não foram homologados por esses testes; o transporte nativo foi exercitado com request/stream simulados. Arquivo gerado de rotas preservado sem diferença rastreada.

## Integração

f5517e7 integrado por merge revisado em develop. Catálogo D118 atualizado somente nesta integração, mantendo requisito White Label parcial e todas as autorias anteriores. Varredura de padrões específicos (tokens de provedores/chave privada) no diff textual src/database/docs desde main encontrou zero correspondências; isso não é garantia universal de ausência de segredos. Nada aplicado no Cloud ou DNS. Worktree original e Antigravity preservadas.
