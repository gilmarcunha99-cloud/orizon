# 2.2 Clientes

Situação: no ar (PR #20, migração `20261127100000_clientes`). Prévias: `/mnt/project-files/orizon-pass/previa-clientes/`.
Quem acessa: perfis com permissão em `cadastros.clientes`.

## Lista
- Colunas: Nome (A-Z / Z-A), CNPJ/CPF, Contato, Telefone, Cidade/UF, Eventos (quantidade), Situação.
- Busca por nome, razão social, CNPJ/CPF, contato ou e-mail. Filtros: PJ/PF e situação.

## Formulário
- Empresa: tipo (pessoa jurídica ou física), CNPJ/CPF, razão social (ou nome completo), nome fantasia, inscrição estadual (só PJ), situação.
- Contato: nome, cargo, e-mail, celular, telefone fixo (opcional), e-mail financeiro (opcional).
- Endereço (opcional): CEP, logradouro, número, complemento, bairro, cidade, UF. Observações.
- Na ficha aparecem os eventos do cliente.

## Regras
- **Cadastro único** (27/11): o mesmo CNPJ/CPF é um registro só para todos os papéis (cliente, fornecedor, patrocinador...).
  Ao digitar um documento que já existe em outro papel, os dados são carregados e, ao salvar, o papel cliente é acrescentado.
- A situação (ativo/inativo) é **por papel**: inativar como cliente não inativa como fornecedor.
- Padronização: CAIXA ALTA, e-mail minúsculo, documentos só com dígitos.

## Validações e mensagens
| Situação | Mensagem |
| --- | --- |
| Documento | CNPJ inválido. / CPF inválido. / Esse CNPJ/CPF já está cadastrado. |
| Razão social | Informe a razão social. (PF: Informe o nome completo.) |
| Nome fantasia | Informe o nome fantasia. |
| Contato | Informe o nome do contato. / Informe um e-mail válido para o contato. |
| Telefones | Celular inválido. Use DDD + 9 dígitos. / Telefone fixo inválido. Use DDD + 8 dígitos. |
| Outros | E-mail financeiro inválido. / CEP inválido. Use 8 dígitos. |

## Banco
- Tabela `empresa` com `tipos[]` (papéis) e `tipos_inativos[]` (situação por papel; a coluna `ativo` não é usada).
- Funções `salvar_empresa(p_tipo, p_id, p_dados)` (grava só os campos enviados), `salvar_cliente`, `empresa_por_documento`, `eventos_do_cliente`.
- Leitura (RLS) por papel; gatilho `padronizar_empresa`.
