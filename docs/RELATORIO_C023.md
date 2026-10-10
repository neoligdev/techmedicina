# C023 — Recuperação do preview

10/10/2026. Codex: diagnóstico/verificação; Lovable: reinício do runtime.

Chrome reapareceu como conexão 4 após a desconexão anterior. O diagnóstico anterior do Lovable reportava build C021 succeeded/in_sync e não fornecia falha concreta. Codex confirmou no iframe atual a D22 com o texto R1 de 7a6e6cc: a versão atual era renderizada, apesar dos cartões ainda indicarem Build unsuccessful / Preview is out of date.

No login, a interface permanecia em Confirmando sessão. Console registrou Failed to fetch dynamically imported module para a entrada client.tsx do TanStack; erro também ocorreu após Refresh. Registros com horário em c023_module_errors.json, sem credenciais. Isso mostrava falha de inicialização no navegador; não estabelecia uma causa no código ou nas dependências.

Lovable recebeu tarefa restrita ao runtime, informou HTTP 200/text/javascript para o módulo, logs anteriores Error: aborted/500 sem causalidade provada e reiniciou somente o preview. Relatou build 7a6e6ccc89960a91e1085d4f9c7ea53b94025df3 succeeded/in_sync, Bun 1.3.3, Node v22.22.0, Vite 8.1.5 e importação bem-sucedida após Refresh.

Codex verificou o iframe depois: E-mail/Senha presentes, botão Entrar habilitado e mensagem de espera ausente. Capturas c023_login_preview.jpg e c023_status_preview.jpg. Sem publicar, criar dados/contas, mudar permissões, banco ou credenciais. Recuperação do formulário não comprova login/JWT/gateway/RLS ponta a ponta; titular precisa entrar com sua senha. A tela foi deixada aberta para essa ação.

Não houve mudança funcional de código nesta entrega. Teste de cobertura do status deve continuar com 101 itens; requisitos produtivos permanecem parciais. Próxima etapa: homologar clínica QA/auditoria e avançar na persistência de identidade visual e vínculos, respeitando decisões do PRD.
