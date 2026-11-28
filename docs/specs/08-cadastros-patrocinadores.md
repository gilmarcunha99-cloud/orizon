# 2.4 Patrocinadores

Situação: no ar (migração `20261128090000_patrocinadores`). Prévias: `/mnt/project-files/orizon-pass/previa-patrocinadores/`.
Quem acessa: perfis com permissão em `cadastros.patrocinadores`.

## Objetivo
Empresas ou pessoas que patrocinam os eventos (cota e marca) e/ou expõem neles com estande. O antigo cadastro de Expositores
faz parte desta tela (27/11). Cota, valor e contrapartidas de cada evento ficam no evento (módulo Eventos).

## Lista
- Barra padrão: busca e filtros à esquerda, **+ Novo patrocinador** à direita, sem contagem de registros.
- Busca por nome, razão social, CNPJ/CPF, contato, e-mail ou ramo. Filtros: Patrocinadores e expositores / Só patrocinadores /
  Só expositores; situação.
- Colunas: Nome fantasia (A-Z / Z-A), CNPJ/CPF, Ramo, Participação, Contato, Equipe, Situação.
- **Equipe** = pessoas que a empresa cadastrou como staff nos eventos (fica 0 até o módulo Eventos).

## Ficha
- Identificação: igual a 2.2 Clientes (tipo de pessoa, CNPJ/CPF, razão social, nome fantasia, IE, situação).
- Patrocínio: como participa (Patrocinador e/ou Expositor, pelo menos um), ramo de atividade (texto livre com sugestões, CAIXA ALTA),
  descrição / observações comerciais.
- Contato principal: nome, cargo, e-mail, celular, telefone fixo, site/Instagram, e-mail do financeiro (cobrança das cotas).
- Acesso ao Orizon Pass: o contato principal recebe convite por e-mail e entra com o perfil Patrocinador; lá cadastra a equipe da
  empresa (perfil Staff) em cada evento patrocinado. A Orizon vê a equipe e pode inativar qualquer pessoa.
  **Hoje:** o botão "Enviar convite" aparece desligado até o envio de e-mails funcionar; a equipe chega com o módulo Eventos.
- Eventos patrocinados: só leitura, virá do módulo Eventos.
- Endereço (CEP preenche o resto) e observações.

## Regras
- Cadastro único (mesmo CNPJ/CPF = um registro): se o documento já for de um cliente ou fornecedor, a ficha aproveita os dados
  e a empresa ganha o papel Patrocinador. A situação (ativo/inativo) é separada por papel.
- Quem era só "expositor" no banco passou a patrocinador com participação Expositor.

## Validações e mensagens (além das de 2.2)
| Situação | Mensagem |
| --- | --- |
| Sem participação | Marque como participa dos eventos: patrocinador, expositor ou os dois. |
| Sem ramo | Informe o ramo de atividade. |
| E-mail do financeiro errado | E-mail do financeiro inválido. |

## Banco
- Tabela `empresa` (papel `patrocinador`), campos `participacao[]`, `ramo`, `descricao_comercial`.
- Gravação por `salvar_patrocinador(id, dados)`, que confere os campos e usa `salvar_empresa('patrocinador', ...)`.
- Leitura (RLS) pela permissão `cadastros.patrocinadores`. Auditoria `patrocinador.criar` / `patrocinador.editar`.
- Código: `apps/web/src/app/(painel)/cadastros/` (`PatrocinadoresTela.tsx`, `PatrocinadorForm.tsx`, `patrocinadorRegras.ts`).

## Decisões do Gilmar (28/11/2026)
- Sem logo da marca.
- Ramo de atividade em texto livre.
- Acesso: convite por e-mail ao contato da empresa, que cadastra o próprio pessoal com perfil Staff nos eventos.

## Fora do escopo / pendente
- Envio do convite (depende do Mailgrid e do domínio).
- Equipe por evento, cotas e contrapartidas (módulo Eventos).
