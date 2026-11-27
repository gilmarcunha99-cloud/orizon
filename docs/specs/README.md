# Specs do Orizon Pass

Um arquivo por funcionalidade, com as regras de negócio, os campos, as validações e as decisões do Gilmar (com data).
Os specs descrevem o que está **no ar na homologação** (branch `homolog`).

**Regra (Gilmar, 27/11/2026):** todo pull request que cria ou muda uma funcionalidade atualiza, no mesmo pull request,
o spec dela e os documentos afetados (`docs/homologacao.md`, `README.md`).

| Spec | Funcionalidade | Situação |
| --- | --- | --- |
| [00-regras-gerais.md](00-regras-gerais.md) | Regras que valem para todo o sistema | Em uso |
| [01-login-web.md](01-login-web.md) | Entrar, Esqueci minha senha, Criar senha (convite) | No ar |
| [02-tela-principal.md](02-tela-principal.md) | Menu lateral, módulos e funcionalidades | No ar |
| [03-plataforma-perfis-subtipos-permissoes.md](03-plataforma-perfis-subtipos-permissoes.md) | 1.3 Perfis, 1.4 Sub-Tipo, 1.5 Permissões | No ar |
| [04-cadastros-usuarios.md](04-cadastros-usuarios.md) | 2.1 Usuários | No ar |
| [05-cadastros-clientes.md](05-cadastros-clientes.md) | 2.2 Clientes | No ar |
| [06-cadastros-fornecedores.md](06-cadastros-fornecedores.md) | 2.3 Fornecedores | No ar |
| [07-cadastros-catalogo.md](07-cadastros-catalogo.md) | 2.6 Serviços, 2.7 Mercadorias, 2.8 Equipamentos e Itens oferecidos | No ar |

## Modelo para um spec novo

```markdown
# N.N Nome da funcionalidade

Situação: proposta | aprovada | no ar (PR #, data)
Quem acessa: perfis e ações (Ver/Criar/Editar/Aprovar)

## Objetivo
## Telas (lista, formulário) e campos
## Regras de negócio
## Validações e mensagens
## Banco (tabelas, funções, migrações)
## Decisões do Gilmar (data)
## Fora do escopo / pendente
```
