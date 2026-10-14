# PWA — cartões e teclado

Codex, 13/10/2026. Seis cartões PatientHome mantêm visual e ação de clique; ativação por Enter/Espaço com preventDefault. Eventos de botão interno e repeat ignorados no pai, evitando navegação involuntária no + Água. Treze testes da tela aprovados. Tipos em execução no handle 5946 nesta anotação. Não comprova teste em aparelho nem acessibilidade completa do sistema. Cloud, DNS e GitHub preservados.
Conclusão: TypeScript aprovado (handle 5946, exit 0), lint dos arquivos corrigido sem erros registrados. Apenas organização do helper foi ajustada após os testes, sem mudança comportamental.

Navegador local: Espaço abriu modal score; Enter no botão Água abriu somente modal, URL permaneceu /app. Nenhum volume foi registrado. Modal fechado normalmente. Menu com position fixed e bottom 884px igual a innerHeight 884px no viewport observado. Captura docs/evidencias/pwa_teclado_rodape_local.png. Não comprova todos os breakpoints/aparelhos ou o preview remoto.

Responsividade: em 320×568 o modal score tinha topo -89px/base657px, cortando cabeçalho/ação. .patient-modal agora limita largura e altura ao viewport (vh/dvh) com margem32px e rolagem auto. Medição após correção: topo16/base552/largura288/clientHeight534/scrollHeight864. Captura pwa_modal_compacto_local.png; viewport resetado. Apenas CSS, sem teste unitário que espelha regra. Autorização humana recebida para aplicação 008–012 no Cloud após preflight, sem contas/grants/DNS/endpoints/commit/push/deploy.
