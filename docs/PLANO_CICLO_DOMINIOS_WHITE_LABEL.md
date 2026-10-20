# Ciclo operacional de domínios White Label

20/10/2026 · Codex · PRD §2/adendo §9. Implementação incremental sobre tm_clinic_domains; sem novo backend.

## Evidência e bloqueios

Cloud consultado em leitura nesta retomada confirma status restrito a pending_verification. Migrações 014–016 ausentes nos objetos verificados. A tabela atual de domínios permite SELECT somente a operadores; isso impede seu uso direto por médico. HostResolver já reconhece active, suspended e retired, mas essa lista de TypeScript não muda o banco. D112 apenas corrigiu o nome da tabela e centralizou provedores.

## Prova DNS implementada localmente — D114

domain-possession.server.ts emite desafio aleatório de 256 bits, com UUID próprio e vínculo a domainId, clinicId, hostname canônico, ambiente e revision. Somente identidade administrativa confiável pode emitir/verificar. O chamador deve ler reserva e desafio persistidos no servidor; não aceitar esses objetos do navegador como evidência.

Registro técnico: TXT em `_plugpix-verification.<hostname>`, valor `plugpix-domain-verification=<token>`. Cada desafio deve ser salvo antes de mostrar a instrução. Validade é fornecida por política revisada no servidor, sem prazo comercial inventado. Rotação invalida o desafio anterior; a futura persistência deve conferir qual desafio é o atual.

O verificador usa node:dns/promises por padrão e aceita resolvedor injetado para testes. Suporte dessa API no runtime real do Cloud ainda precisa ser comprovado; compilação local não prova capacidade de rede do ambiente de hospedagem. Se necessário, configurar outro resolvedor confiável no servidor, sem aceitar endereço de resolvedor enviado pelo navegador e sem inventar fornecedor. Compara valor completo e concatena somente segmentos do mesmo TXT; não concatena registros independentes. Confere identidade/revisão antes da rede e validade antes/depois; limita o tempo de espera e não devolve diagnóstico bruto do resolvedor. O timeout limita a espera do chamador, não promete cancelar uma consulta DNS nativa já iniciada.

Recibo tem IDs de escopo, revisão, instante, validade e digest; não contém token bruto, nem status active. Este módulo não grava evidência, não cria endpoint e não altera DNS. Não é verificação TLS, roteamento, autorização de operação ou homologação real do domínio techmedicina.com.br.

## Persistência e migração seguinte proposta

Implementar migração aditiva posterior à 016, somente local antes da revisão remota:

1. Preservar UUID, hostname único, clinic_id e environment imutáveis. Ampliar CHECK de status para os estados já reconhecidos pelo resolvedor, sem atualizar reservas existentes para active.
2. Persistir desafios separados, vinculados ao domínio e à revisão, com emissão/expiração, emissor e estado de consumo/revogação. Restringir acesso por RLS/RPC; não registrar token bruto em auditoria comum. Não conceder escrita direta ao navegador.
3. Persistir observações de DNS/TLS/roteamento emitidas por verificador confiável. Evidência tem domínio, revisão/desafio, instante e validade; confirmação enviada pelo navegador ou checkbox administrativo não substitui observação técnica. Definir identidade de execução e credenciais do verificador com privilégio mínimo antes de liberar RPC remota.
4. Ativação transacional exige operador autorizado, revisão esperada, clínica ativa e evidências atuais da mesma reserva. Revalidar sob bloqueio antes de mudar estado e auditar a transição. Não emitir concessões clínicas.
5. Suspensão e retirada revogam resolução imediatamente no servidor, auditadas com revisão otimista. Reativação exige novas provas conforme política. Não liberar hostname retirado para outro tenant por simples exclusão de linha; transferência requer fluxo explícito.
6. Resolver domínio por RPC mínima autenticada para vínculo ativo da própria clínica, retornando somente host/tenant/ambiente/status necessários. Não liberar leitura global da tabela a médicos/pacientes para contornar RLS.

## TLS e roteamento — gates ainda não implementados

- Verificar HTTPS do hostname exato com cadeia e nome do certificado válidos, sem ignorar alertas nem aceitar certificados próprios. A hospedagem precisa servir o projeto correto naquele host; TLS válido de outro site não basta.
- Usar desafio de roteamento do projeto no ingresso conhecido e origem exata, sem seguir redirecionamentos para hosts arbitrários. Definir destino da hospedagem a partir da configuração real, nunca inventar CNAME/A.
- Qualquer sonda HTTP/TLS precisa de proteção SSRF: resolver e filtrar todos os endereços, rejeitar redes não públicas, fixar o IP aprovado durante a conexão, manter SNI/validação do host, não seguir redirects e limitar tempo/corpo. DNS TXT não implica autorização para sondar uma rede privada.
- Política de validade/revalidação e identidade do executor devem ser explícitas. Ausência/falha mantém o host pendente ou indisponível; não usar marca/tenant da primeira clínica.

## Testes e aceite da sequência completa

Desafios de duas clínicas/domínios/revisões não são intercambiáveis; expirado/rotacionado/consumido não ativa. DNS inexistente, parcial, expirado, resposta lenta ou indisponível não produz sucesso. TLS inválido/host errado/redirect/roteamento de outro projeto impedem ativação. Tentativa de gravar evidência ou status diretamente pelo navegador é negada. Reserva/ativação concorrente e repetição não duplicam domínio nem evento. Suspensão/revogação são observadas por requisições seguintes e não transferem pacientes ou identidade.

Homologar no Cloud com duas clínicas QA, contas/grants aprovados, hosts reais e configuração de ingresso comprovada. Não confundir prova local injetada com observação DNS/TLS real. Aplicação remota requer ambiente correto, dependências e backup/recuperação revisados, aprovação concreta e consultas posteriores. Main/preview via PR revisado; sem Publish automático.
