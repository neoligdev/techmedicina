# Revisão local da migração 018 — observações DNS

21/10/2026 · Codex. Proposta sem aplicação remota. Complementa 017 ainda não aplicada no Cloud.

Dependências: 001/006/007/017 e objetos oficiais; manter ordem de implantação revisada. Confirmar projeto, backup/recuperação, estado e ausência das funções/tabela propostas antes de autorização concreta. Não repetir migrações históricas nem presumir 014–017 aplicadas.

Adições: consumed_at em desafios, tm_domain_dns_proofs com RLS e sem grants comuns, tm_read_domain_challenge para authenticated com operador ativo, tm_record_domain_dns_proof sem EXECUTE para PUBLIC/anon/authenticated. Todas as funções SECURITY DEFINER têm search_path vazio. Nenhuma elevação de usuário clínico ou ativação de host.

Boundary privilegiado: a gravação é confiável porque somente owner a executa no teste local. O banco valida estado/escopo/tempo mas não observa o DNS por conta própria e não comprova o digest criptográfico do TXT. Esse trabalho pertence ao verificador server-only. Não conceder execução a um papel de worker sem definir sua identidade mínima e impedir que browser escolha ator/recibo. Não criar cliente service-role na UI nem ampliar privilégios de authenticated para contornar a ausência do worker. Nenhuma credencial nova foi criada.

Aceite remoto posterior: homologar com duas clínicas QA aprovadas, testar leitura administrativa, negação a usuários comuns, rotação e revogação durante DNS, expiração, consumo/replay, rollback e imutabilidade do status pending_verification. Comprovar transporte seguro e DNS do runtime real separadamente. Não executar verificação TLS sem proteção SSRF e origem configurada.

Recuperação: falha dentro do script transacional causa rollback; após uso, preferir correção aditiva que preserve provas e auditoria. Não remover histórico/objetos nem restaurar backup sem plano e autorização específica.
