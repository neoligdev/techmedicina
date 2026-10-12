# Domínios White Label — convenção proposta

12/10/2026. Domínio informado pelo proprietário: techmedicina.com.br, administrado no Registro.br. Informação humana registrada; DNS e titularidade técnica não inspecionados nesta etapa.

| Ambiente | Host proposto | Estado |
|---|---|---|
| Super ADM | admin.techmedicina.com.br | Proposta, não ativado |
| Clínica e médico | <identificador>.techmedicina.com.br | Proposta, não ativado |
| PWA do paciente | app.<identificador>.techmedicina.com.br | Proposta, não ativado |

Médico usa o domínio da clínica, com autenticação/vínculo/papel próprios. Subdomínio PWA é independente da administração. Domínio próprio de clínica continua aceito pelo campo livre; os hosts propostos não o substituem. Identificador exige label DNS canônico e recusa nomes reservados. Sugestão no formulário apenas preenche hostname; reserva é envio separado, vinculada ao UUID imutável da clínica e permanece pending_verification. A sugestão não cria slug persistido, prova de posse, TLS ou provisionamento.

Antes da ativação: validar múltiplos hosts na hospedagem, contexto de ingresso e cabeçalhos confiáveis, registros exigidos pelo provedor, prova de posse, cobertura TLS por hostname, callbacks de Auth, sessão por origem, comportamento SSR/layout/manifesto e duas clínicas QA autorizadas. Não inventar destinos A/CNAME, alterar nameservers ou tocar DNS antes de preparar a configuração concreta para revisão. URL raiz techmedicina.com.br permanece sem destino definido por esta etapa.

Configurações Lovable consultadas somente em leitura no navegador Codex: seção Settings e item Domains foram encontrados. O controle falhou ao abrir Domains; não foi possível confirmar hosts cadastrados, limites ou configuração de hospedagem. Nenhum Ask Lovable, alteração de DNS, publicação ou compra.

## Inspeção de hospedagem C048

12/10/2026: Domains foi aberto em leitura pelo controle de teclado. A tela mostrou a URL Lovable existente e nenhuma entrada de domínio próprio; wizard aberto vazio e cancelado, sem cadastro. A [documentação oficial](https://docs.lovable.dev/features/custom-domain) informa conexão individual de múltiplos subdomínios e redirecionamento dos demais para o principal; ao remover a definição de principal, os hosts servem igualmente. Conexão requer plano pago, mas o plano/limite efetivo desta conta não foi confirmado. Isso não prova preservação do Host no SSR ou execução deste backend em cada origem; homologação permanece obrigatória. Não configurar principal que unifique as origens White Label. Nenhuma configuração externa alterada.
