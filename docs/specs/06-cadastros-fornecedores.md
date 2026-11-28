# 2.3 Fornecedores

Situação: no ar (PR #21, migração `20261127110000_fornecedores`). Prévias: `/mnt/project-files/orizon-pass/previa-fornecedores/`.
Quem acessa: perfis com permissão em `cadastros.fornecedores`.

## Lista
- Colunas: Nome (A-Z / Z-A), CNPJ/CPF, Contato, Telefone, Cidade/UF, Situação. **Sem coluna de categoria** (27/11).
- Busca por nome, razão social, CNPJ/CPF, contato ou e-mail. Filtro por categorias (várias; mostra quem tem qualquer uma delas) e situação.

## Formulário
- Empresa: mesmos campos de 2.2 Clientes (tipo, CNPJ/CPF, razão social, nome fantasia, inscrição estadual, situação).
- O que fornece: categorias (uma ou mais, obrigatório) e descrição dos serviços.
- Itens oferecidos: itens do catálogo das categorias marcadas, sem preço (veja [07-cadastros-catalogo.md](07-cadastros-catalogo.md)).
- Contato: nome, cargo, e-mail, celular, telefone fixo (opcional), site.
- Pagamento (tudo opcional): meios aceitos, chave PIX (tipo + chave), banco (sugestões ao digitar, aceita qualquer um), agência, conta, tipo de conta, titular.
- Endereço e observações como em 2.2.

Categorias: Som e iluminação, Estrutura e tendas, Cronometragem, Hidratação e alimentação, Saúde e ambulância, Segurança, Limpeza,
Foto e vídeo, Gráfica e brindes, Medalhas e troféus, Camisetas e kits, Transporte, Outros.

Meios de pagamento (lista fixa, **sem "Outros"**; novos entram na lista quando surgirem, 27/11): PIX, Boleto, Transferência, Dinheiro,
Cartão de crédito, Cartão de débito, Cheque, Permuta. O meio usado em cada conta é escolhido em 4.2 Contas à Pagar.

## Regras
- Mesmo cadastro único e situação por papel de 2.2 Clientes: um CNPJ já cadastrado como cliente ganha o papel fornecedor ao salvar.
- Chave PIX é conferida conforme o tipo (CNPJ, CPF, e-mail, celular ou aleatória); CNPJ/CPF/celular gravados só com dígitos, e-mail em minúsculas.

## Validações e mensagens (além das de 2.2)
| Situação | Mensagem |
| --- | --- |
| Sem categoria | Marque pelo menos uma categoria em O que fornece. |
| Chave sem tipo | Escolha o tipo da chave PIX. |
| Chave inválida | Chave PIX: CNPJ inválido. / CPF inválido. / e-mail inválido. / celular inválido. |

## Banco
- Mesma tabela `empresa` (papel `fornecedor`), campos `categorias[]` e `meios_pagamento[]`; gravação por `salvar_fornecedor(...)`, que usa `salvar_empresa('fornecedor', ...)` e grava os itens oferecidos (`fornecedor_item`).
- Código: `apps/web/src/app/(painel)/cadastros/` (partes comuns em `CamposEmpresa.tsx`).

## Próximo
- 2.4 Patrocinadores já usa `salvar_empresa` (veja [08-cadastros-patrocinadores.md](08-cadastros-patrocinadores.md)).
