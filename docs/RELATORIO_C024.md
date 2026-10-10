# C024 — Fundação da identidade visual por clínica

10/10/2026. Executor: Codex.

Migração 003 preparada, sem implantação no Cloud. Tabela de preferências por ID de clínica com RLS; leitura exige vínculo ativo ou operador ativo. Gravação por RPC exige operador ativo ou administrador da clínica com concessão explícita de escrita. Médico/paciente não podem gravar. Revisão e bloqueio da linha da clínica protegem contra sobrescritas; alterações geram auditoria somente dos nomes de campos.

Contrato estrito para nome, cores, tema, logo e ícone. Imagens limitadas a PNG/JPEG/WebP em base64, tamanho limitado e assinatura verificada; essa checagem não substitui decodificação integral de imagem. O painel de auditoria reconhece o novo evento de identidade visual.

Validação local: 243 testes em 26 arquivos aprovados, incluindo nove novos testes com as três migrações executadas em PGlite. TypeScript, lint dos quatro arquivos de código alterados e build aprovados. Testes verificam separação entre clínicas, autorização, revisão, auditoria, revogação e rejeição de entradas inválidas. Auth simulado nesses testes não comprova homologação real no Cloud.

Pendências: aplicar migração pelo fluxo gerenciado e regenerar tipos; implementar API e conectar formulário com sessão real. Personalização atual permanece no navegador. Nenhuma conta, concessão, migração remota ou publicação criada nesta entrega. Super ADM conserva logo e identidade PlugPix da C019.
