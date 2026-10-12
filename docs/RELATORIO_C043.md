# C043 — Paginação de reservas e recuperação no preview

12/10/2026. Codex. GET aceita clinicId obrigatório e after opcional, hostname canônico estrito. Transporte adiciona hostname gt mantendo clinic_id eq, limite 101 e ordenação hostname/id. Resposta entrega cem itens, hasMore e nextCursor da última linha exibida. Sem offset e sem remoção do filtro tenant. UI valida consistência do cursor, substitui página, oferece Próxima/Primeira e limpa cursor ao alternar clínica/recarregar. Escrita confirmada recarrega primeira página em vez de anexar fora da ordem.

24 testes aprovados, incluindo navegação além de cem e retorno à primeira, cursor inválido/injeção rejeitado antes do transporte, tenant obrigatório e contratos anteriores. TypeScript/build aprovados.

Preview Cloud C041: envio duplicado terminou em resultado não confirmado, lista indisponível para reenvio. Recarregar recuperou a única reserva e liberou o formulário. Evidências c043_timeout_preview.png/c043_reload_preview.png. Causa da demora ainda não comprovada, e não foi observado retorno específico 409. Paginação remota com mais de cem ainda não homologada: não gerar massa no banco sem necessidade.

Preservados design, banco e identidades; sem DNS/TLS/ativação/Ask Lovable. Próximo: resolver semântica da colisão e contexto SSR confiável.
