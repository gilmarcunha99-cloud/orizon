# 2.6 Serviços, 2.7 Mercadorias e 2.8 Equipamentos (catálogo de itens)

Situação: no ar (migração `20261127120000_catalogo`). Prévias: `/mnt/project-files/orizon-pass/previa-catalogo/`.
Quem acessa: perfis com permissão em `cadastros.servicos`, `cadastros.mercadorias` e `cadastros.equipamentos`.
Quem edita fornecedores também pode criar um item novo direto da ficha do fornecedor.

## Objetivo
Um catálogo único do que a Orizon contrata ou compra para os eventos. Cada item pertence a uma categoria de fornecedor.
O fornecedor marca na ficha quais itens oferece. **Sem preço no cadastro**: preço, quantidade e prazo ficam no orçamento do evento.

## Lista (as três telas usam o mesmo modelo)
- Colunas: Nome (A-Z / Z-A), Categoria, Unidade, Fornecedores (quantos oferecem o item), Situação, Editar.
- 2.8 Equipamentos tem também Origem (Próprio / Alugado / Próprio e alugado) e Qtd. própria.
- Filtros: busca por nome (2.8 também pelo nº de patrimônio), categoria, situação; em 2.8, Próprios e alugados / Só próprios / Só alugados.
- "+ Novo serviço / Nova mercadoria / Novo equipamento" abre o painel lateral.

## Painel lateral (campos)
- Nome (obrigatório, CAIXA ALTA, não repete dentro do mesmo tipo).
- Categoria (obrigatória, uma das 13 categorias de fornecedor).
- Unidade de cobrança (obrigatória): Unidade, Peça, Litro, Quilo, Diária, Hora, Por atleta, Por evento, Metro quadrado, Quilômetro, Pacote.
- Descrição (CAIXA ALTA).
- Situação: Ativo (aparece para os fornecedores e no orçamento) ou Inativo (fica guardado, não aparece para escolher). Item não é excluído.
- Só equipamentos: Origem (Próprio da Orizon e/ou Alugado de fornecedor, pelo menos um). Se Próprio: bloco "Patrimônio da Orizon"
  com Quantidade própria (obrigatória), Estado de conservação (Novo, Bom, Regular, Precisa de reparo), Nº de patrimônio e Onde fica guardado.

## Ficha do fornecedor: seção "Itens oferecidos" (abaixo de "O que fornece")
- Mostra só os itens ativos das categorias marcadas em "O que fornece" (e os já marcados, mesmo que tenham sido inativados),
  agrupados por categoria, com "X de Y marcados" e "Marcar todos / Desmarcar todos".
- Busca e filtro por tipo (serviço, mercadoria, equipamento). Cada item mostra o tipo.
- "+ Item que não está no catálogo": cria o item no catálogo na hora (tipo, nome, categoria entre as marcadas, unidade…) e já o marca.
- Ao salvar, ficam só os itens das categorias marcadas; desmarcar uma categoria retira os itens dela.

## Validações e mensagens
| Situação | Mensagem |
| --- | --- |
| Sem nome | Informe o nome do serviço / da mercadoria / do equipamento. |
| Sem categoria | Escolha a categoria. |
| Sem unidade | Escolha a unidade de cobrança. |
| Nome repetido | Esse serviço (mercadoria, equipamento) já está no catálogo. |
| Equipamento sem origem | Marque a origem: próprio, alugado ou os dois. |
| Próprio sem quantidade | Informe a quantidade própria. |

## Banco
- Tabela `item` (tipo `servico` / `mercadoria` / `equipamento`) e `fornecedor_item` (empresa × item, sem preço).
- Funções: `catalogo_itens(tipo)` (lista com a contagem de fornecedores), `salvar_item(id, dados)`,
  `salvar_fornecedor(id, dados)` (grava a ficha via `salvar_empresa` e troca os itens marcados na mesma transação).
- Auditoria: `servico.criar/editar`, `mercadoria.criar/editar`, `equipamento.criar/editar`, `fornecedor.itens` (quantos entraram e saíram).
- Código: `apps/web/src/app/(painel)/cadastros/` (`CatalogoTela.tsx`, `ItensOferecidos.tsx`, `catalogoRegras.ts`).

## Decisões do Gilmar (27/11/2026)
- Itens associados ao fornecedor no cadastro, sem preço; preço e prazo só no orçamento (que guardará o histórico por fornecedor).
- Equipamentos podem ser próprios e alugados.
- Unidades Peça, Litros e Quilos incluídas.
- Mercadorias e Equipamentos seguem o mesmo modelo de Serviços (Equipamentos com o bloco de patrimônio).

## Fora do escopo / pendente
- Reserva de equipamento próprio por evento e baixa de estoque: módulo Eventos.
- Preço por fornecedor e histórico de preços: orçamento do evento.
