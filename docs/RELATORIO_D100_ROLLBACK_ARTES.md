# D100 — restauração real das artes

Codex, 15/10/2026. Escopo demonstrativo/local, no checkpoint/d69-d74.

O rollback anterior copiava hash e versão do histórico, mas deixava o SVG atual. Uma edição seguida de restauração podia apresentar arte diferente da identidade registrada. Os novos registros históricos agora incluem cópia completa de cada arte, além dos campos anteriores.

A restauração valida todos os arquivos e seus hashes antes de substituir o catálogo. Confere identidade, Escudo, variante, versão e estado publicado. Se um arquivo faltar ou divergir, retorna erro e mantém o catálogo atual. Históricos antigos que armazenam somente hashes permanecem legíveis, mas não são restauráveis: o conteúdo ausente não é inventado.

O fallback em memória e os snapshots também usam cópias independentes, evitando que uma referência retornada modifique silenciosamente o estado persistido.

Evidência: quatro testes novos exercitam alteração real de desenho seguida de publicação local e rollback, histórico incompleto, arquivo adulterado no último item (sem restauração parcial dos anteriores) e mutação de referências retornadas. Somados aos testes existentes de artes/runtime, 31 passaram; TypeScript e lint dos arquivos alterados passaram. Quatro testes de catálogo de status passaram.

Limites: nenhuma versão foi publicada no ambiente real; os testes usam catálogo fictício local. Isso não implementa armazenamento remoto, autenticação administrativa real, auditoria Cloud ou recuperação de históricos legados sem arquivos. A leitura geral de catálogo local ainda precisa de validação estrutural mais completa.
