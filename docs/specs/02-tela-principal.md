# Tela principal (menu e módulos)

Situação: no ar (PR #6). Protótipo obrigatório aprovado em 27/11: https://claude.ai/artifact/HgnRGHwA53dxwTo9A4wwzi
Quem acessa: todo usuário logado; cada um vê só o que o perfil permite.

## Layout
- Barra lateral à esquerda: logo, combo único **MÓDULO**, lista numerada das **FUNCIONALIDADES** do módulo e, embaixo, o usuário logado com **Sair**.
- Conteúdo: trilha (módulo › funcionalidade) e número + título da funcionalidade.
- Trocar o módulo abre a primeira funcionalidade dele.
- Endereço de cada funcionalidade: `/m/<codigo>` (ex.: `/m/cadastros.usuarios`); item aberto: `/m/<codigo>/<id>`.
- A versão com barra no topo foi rejeitada (27/11). Layout de celular fica para depois.

## Módulos e funcionalidades (27/11)
| Nº | Módulo | Funcionalidades |
| --- | --- | --- |
| 1 | Plataforma (só Admin) | 1.1 ASAAS, 1.2 E-mail, 1.3 Perfis, 1.4 Sub-Tipo, 1.5 Permissões, 1.6 WhatsApp |
| 2 | Cadastros | 2.1 Usuários, 2.2 Clientes, 2.3 Fornecedores, 2.4 Patrocinadores, 2.5 Grupo/Assessoria, 2.6 Serviços, 2.7 Mercadorias, 2.8 Equipamentos, 2.9 Locais/Arenas |
| 3 | Eventos | 3.1 Criação, 3.2 Contratos, 3.3 Inscrições, 3.4 Mapa da Arena, 3.5 Resultados, 3.6 Calendário, 3.7 Kit, 3.8 Credenciamento/Check-in |
| 4 | Financeiro | 4.1 Orçamento, 4.2 Contas à Pagar, 4.3 Contas à Receber, 4.4 Prestação de Contas |

A lista vem da tabela `funcionalidade` (código, módulo, nome, ordem). Funcionalidade ainda não construída mostra só o título.

## Decisões do Gilmar (27/11)
- Expositores removido; fica Patrocinadores.
- Cobranças do ASAAS ficam em Plataforma.
- Perfis e Sub-Tipo saíram de Cadastros e foram para Plataforma.

## Pendente
- Onde ficam Categorias/Modalidades (proposta: dentro de 3.1 Criação), Termos e Privacidade e Auditoria (proposta: Plataforma).
