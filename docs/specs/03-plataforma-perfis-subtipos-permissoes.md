# 1.3 Perfis, 1.4 Sub-Tipo e 1.5 Permissões

Situação: no ar (PR #11, migração `20261127040000_perfis_editaveis`). Prévias: `/mnt/project-files/orizon-pass/previa-plataforma/`.
Quem acessa: só o Admin (módulo Plataforma).

## 1.3 Perfis
**10 perfis do sistema** (não podem ser excluídos nem mudar de código) + **perfis livres** criados pelo Admin (27/11).

| Perfil | Participação nos eventos |
| --- | --- |
| Admin | Permanente (acesso total) |
| Diretor(a), Organizador(a), Coordenador(a), Auxiliares | Permanente: valem para todos os eventos |
| Staff, Árbitro(a) | Eventual: escalados por evento (Equipe do evento e Credenciamento) |
| Atleta, Patrocinador, Visitante | Não se aplica |

- "Auxiliares" é o antigo "Terceiros" (o código interno continua `terceiros`).
- Campos editáveis: nome (2 a 60 letras), descrição (até 300), participação, ativo.
- Perfil livre: o código é gerado do nome (ex.: `fotografo`, `fotografo_2`); ao criar, pode copiar as permissões de outro perfil. Perfil livre só tem as permissões da matriz (sem regras especiais).
- Não dá para inativar perfil que ainda tem usuários; não dá para excluir perfil do sistema, com usuários, com sub-tipos ou já usado em eventos (nesse caso, inativar).
- Nome de perfil não repete.

## 1.4 Sub-Tipo
- Todo sub-tipo pertence a um perfil ("Não existe sub-tipo sem perfil").
- Nome de 2 a 60 letras, não repete dentro do mesmo perfil.
- Lista com filtro por perfil, busca e situação; mostra quantos usuários usam cada um.
- Sub-tipo em uso não pode mudar de perfil; pode ser inativado.

## 1.5 Permissões
- Matriz por perfil: cada funcionalidade × **Ver, Criar, Editar, Aprovar**.
- "Copiar de outro perfil" preenche a matriz a partir de outro perfil.
- O Admin não aparece na matriz (tem tudo).
- Ao salvar: "Permissões salvas. Valem no próximo acesso de quem tem esse perfil." Fica registrado no log.

## Banco
- Tabela `perfil` (codigo texto, nome, descricao, participacao `permanente|eventual|nao_se_aplica`, sistema, ativo, ordem).
- Tabela `subtipo` (perfil, nome, ativo); tabela `permissao` (perfil, funcionalidade, acao).
- Função `salvar_permissoes`; função `pode(f, a)` usada pelas telas e pelas regras do banco.

## Decisões do Gilmar (27/11)
- Permanente/Eventual aprovados como acima.
- Perfis = 10 do sistema + livres criados só pela matriz.
- Sub-Tipo sempre ligado a um perfil.
