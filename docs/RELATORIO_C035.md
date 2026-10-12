# C035 — White Label: hosts e colisões

12/10/2026. Codex. Fonte WL-1 preservada e endurecida. Portas em notação científica ou sinal recusadas; FQDN com porta reconhecido. Record de cabeçalhos respeita caixa e rejeita duplicados/arrays múltiplos; lista X-Forwarded-Host recusada inclusive com trustedProxy, exigindo ingresso que forneça um único host validado. Registro existente não transfere tenant por sobrescrita. Constructor rejeita catálogo duplicado. Operação futura de mudança de estado/domínio precisará ser explícita e auditada.

16 testes aprovados; TypeScript e lint aprovados. Teste positivo de proxy usa um host único; teste adicional cobre rejeição de lista ambígua. Evidência c035_test.txt. Sem mudanças no design, infraestrutura, dados ou integrações do servidor. Domínio não concede acesso; guards/RLS seguem necessários. Contrato local não comprova múltiplos hosts reais, TLS ou isolamento clínico produtivo. Próximo: WL-2 catálogo aditivo e integração após validar ingressos.
