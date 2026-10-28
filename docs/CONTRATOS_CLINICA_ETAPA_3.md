# Contrato da clínica — etapa 3: biblioteca por clínica

Executor Codex, 28/10/2026. PRD 13.1 parcial.

Editor agora abre rascunhos pela biblioteca da clínica selecionada, com busca literal por título, páginas de 25 e cursor UUID exclusivo. A resposta inclui apenas título, revisão, data, ID e estado draft; não termos completos nem ator. Atualiza após recibo confirmado. Enquanto a edição estiver suja/incerta, não abre outro item. Buscar não substitui o formulário. Troca de clínica descarta página antiga e respostas atrasadas; não reaproveita cursor de outro tenant.

API GET /api/platform/clinic-contract-drafts exige clinicId, sessão verificada e Super ADM ativo. Valida parâmetros únicos/permitidos, cursor, tamanho/ordem/escopo da página e filtro. Cliente obtém bearer atual e aplica prazo, credentials omit, redirect error e no-store. UI distingue carregamento, erro/retry e coleção vazia.

SQL local 035 depende de 034, cria índice (clinic_id,id) e RPC SECURITY DEFINER com search_path vazio, ativo revalidado e sem acesso direto às tabelas. Cursor deve pertencer à mesma clínica e busca. Busca literal ignora caixa, não promete remover acentos. Alteração do título pode invalidar cursor de filtro e exigir reinício; não há snapshot da coleção entre páginas. Nenhuma cobrança, aceite ou grant clínico criado.

Testes locais SQL cobrem 26 rascunhos/duas páginas, clínica estrangeira, cursor estrangeiro, busca literal e anonimato/conta sem operador. HTTP/cliente verificam escopo e DTO mínimo. UI cobre busca, paginação, proteção de edição, refresh após save e resposta antiga após trocar clínica. Testes direcionados, TypeScript e lint aprovados; build final executado antes do commit.

A tela local foi conferida no navegador: design e catálogo existentes preservados e novo cartão protegido de contrato visível; sem sessão local não abre editor. HTTP local retornou 401/no-store/Vary Authorization para as duas APIs. Screenshot docs/evidencias/contratos-clinica/contratos-protegidos.png prova apenas tela/proteção, não gravação remota. Lovable permanece na main histórica com 131 entregas; esta biblioteca não foi homologada no preview.

034–035 ainda propostas locais; revisão em REVISAO_MIGRACOES_CONTRATOS_034_035.md. Próxima frente: consulta das versões comerciais, mantendo rascunho separado de aceite e preservando decisões pendentes do PRD. Nenhum SQL remoto, main, Publish, DNS ou infraestrutura alterado.
