# Integração develop → main para preview — rascunho revisável

21/10/2026. Este documento não cria PR remoto nem autoriza merge/Publish.

## Problema e comportamento proposto

main está em 111b397 (D85); Lovable sincroniza essa branch. As entregas posteriores atualmente protegidas em develop não aparecem nesse preview. A integração proposta disponibiliza as correções e a página de status atualizadas sem aplicar SQL ou ativar funcionalidades que ainda dependem de homologação Cloud.

O lote preserva o design existente e o trabalho do Antigravity D108–D112. Inclui reforços de Escudos, fundação local de disponibilidade médica/fuso/host, compatibilidade D115 com cadastro administrativo anterior à 016 e fundação White Label D114/D116–D118. Migrações são arquivos locais; não são disparadas pelo build. Agenda continua sob gate operacional e seu executor padrão não fornece operação real. Domínios continuam pendentes até provas completas e ativação autorizada. Novo transporte HTTPS não tem endpoint público e não confirma sozinho identidade do projeto.

## Evidência e gates

Cada lote teve verificações próprias; a regressão mais recente deve acompanhar o SHA final integrado. D117: 916 testes/113 arquivos. D118: 981 testes aprovados em 116 arquivos; resultado em RELATORIO_CODEX_RECIBOS_HTTPS.md. TypeScript/lint direcionado/build aprovados no lote D118. A cobertura dos 101 identificadores do PRD é preservada pelo catálogo; requisito global não é marcado concluído por essas entregas técnicas.

A integração prevista é por fast-forward do histórico validado, sem rebase/force push. Confirmar SHAs e ausência de novo commit remoto antes do envio. main exige aprovação humana conforme configuração de desenvolvimento paralelo. Isso não autoriza SQL 014–019, worker/grants, DNS, endpoints operacionais ou Publish. Após envio aprovado, conferir commit sincronizado no Lovable e homologar login/administração, personalização e status no preview. Falha do preview não autoriza contornar os gates.

## Remotos e ferramentas

Git push autenticado está disponível. GitHub CLI sem autenticação na consulta anterior; connector GitHub consultado nesta rodada informa pull=true e push=false. Nenhum PR remoto criado. As URLs de comparação são revisões navegáveis, não PRs:
https://github.com/neoligdev/techmedicina/compare/main...develop

## Próximo passo

Após concluir regressão e integrar D118 em develop, apresentar SHA final e solicitar aprovação específica para main/preview. Enquanto pendente, continuar desenvolvimento independente em dev/codex-backend. Manter original checkpoint/d69-d74 e worktree Antigravity intactos.
