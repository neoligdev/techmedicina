# D99 — Escudos no navegador

Executor: Codex. Data: 15/10/2026. Ramificação: checkpoint/d69-d74.

O sanitizador e a geração inicial das artes eram importados pelo navegador, mas dependiam de node:crypto e Buffer. A compilação anterior emitia externalização de node:crypto. A implementação agora usa @noble/hashes para SHA-256 síncrono e TextEncoder para medir bytes UTF-8. O bun.lock oficial foi atualizado; package-lock.json local permanece excluído.

Os hashes das quinze artes foram comparados com node:crypto nos testes e permaneceram iguais. Testes também retiram Buffer do ambiente para verificar o caminho de navegador e o limite em bytes com caracteres multibyte.

Cards e comparação de upload passaram a usar img com fonte SVG codificada em data URL, sem inserir SVG armazenado ou enviado como HTML da aplicação. Os testes verificam que conteúdo do arquivo não cria elementos script/foreignObject/input no DOM da aplicação. Isso é uma fronteira adicional de renderização; não comprova sanitização completa de SVG nem segurança de um futuro armazenamento remoto.

Validação: 29 testes de biblioteca/runtime/prévias aprovados; TypeScript aprovado. Catálogo temporário validado separadamente. A compilação da substituição de hash passou sem aviso de node:crypto; compilação final após alteração das prévias e catálogo também aprovada.

Navegador local: /super-admin/escudos carregou cinco artes exibidas. Modal aceitou SVG fictício simples, calculou hash c487c831856e… e exibiu arte atual e nova prévia; todas as imagens observadas estavam carregadas. Cancelado sem salvar ou publicar substituição. Evidência: evidencias/escudos_preview_local_D99_20261015.png.

Limites: catálogo ainda demonstrativo em armazenamento local; não houve publicação oficial, migração Cloud, grants, DNS ou alteração de main. A regressão anterior executou 767 testes, com 766 aprovados e um teste desatualizado de alt da logo; esse teste foi corrigido em D98 e os onze testes de personalização passaram no reenvio. Não tratar essa execução inicial como regressão integral verde.
