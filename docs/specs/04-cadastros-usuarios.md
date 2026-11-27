# 2.1 Usuários

Situação: no ar (PRs #12 a #19; migrações `20261127050000` a `20261127090000`). Prévia aprovada: A (`previa-atleta/A-ficha-atleta.png`).
Quem acessa: perfis com permissão em `cadastros.usuarios` (Ver, Criar, Editar).

## Lista
- Colunas: Nome (ordem A-Z / Z-A), E-mail, Celular, Perfil, Sub-tipo, Situação. **Sem coluna Acesso** (27/11).
- Filtros: perfil, situação (todas / só ativos / só inativos). Busca por nome, e-mail, CPF ou **celular**.
- Sem botão de importar: a importação de atletas fica em 3.3 Inscrições.

## Formulário (`/m/cadastros.usuarios/novo` e `/m/cadastros.usuarios/<id>`)
Campos de todos: nome completo, e-mail, CPF, celular, data de nascimento, sexo (Feminino/Masculino), situação, perfil, sub-tipo.
Ficha do atleta (só para quem tem perfil Atleta): cidade, UF, camiseta (PP a XG), grupo/assessoria, contato de emergência (nome e celular),
tipo sanguíneo, observações de saúde/alergias e, para menor de 18 anos, responsável legal (nome, CPF, celular).
A ficha mostra a situação de acesso: já acessou, convite enviado (com botão **Reenviar convite**) ou sem convite.

## Regras
- **Um cadastro por CPF e um perfil por pessoa** (27/11).
- **Atleta não é cadastrado pela web**: só pelo celular ou pela planilha em 3.3 Inscrições. A gestão pode editar a ficha de um Atleta que já existe (27/11).
- **Visitante não é cadastrado pela web** nem pela importação: só pelo celular (27/11).
- CPF, e-mail e celular não repetem. O e-mail é o login e só é escolhido no cadastro (não muda na edição).
- Novo usuário recebe **convite por e-mail** para criar a senha (destino `/criar-senha`). Se o e-mail não sair (limite de envio), a conta é criada e o convite é reenviado depois pela ficha.
- Reenviar convite só para quem ainda não acessou.
- Nomes em CAIXA ALTA, e-mail minúsculo, documentos só com dígitos (também por gatilho no banco).

## Validações e mensagens
| Situação | Mensagem |
| --- | --- |
| Nome com menos de 3 letras | Informe o nome completo. |
| E-mail inválido / repetido | Informe um e-mail válido. / Já existe um usuário com esse e-mail. |
| CPF inválido / repetido | CPF inválido. / Já existe uma pessoa cadastrada com esse CPF. |
| Celular inválido / repetido | Celular inválido. Use DDD + 9 dígitos. / Esse celular já está no cadastro de <NOME>. |
| Nascimento | Data de nascimento inválida. (no passado e até 120 anos) |
| Novo Atleta na web | O perfil Atleta só entra pelo cadastro no celular ou pela planilha em 3.3 Inscrições. |
| Novo Visitante na web | O perfil Visitante só entra pelo cadastro no celular. |
| Ficha incompleta | Na ficha do atleta, informe cidade e UF. / escolha o tamanho da camiseta. / informe o contato de emergência com celular válido. |
| Atleta menor | Atleta menor de 18 anos: informe nome, CPF e celular do responsável legal. |

## Banco
- Tabelas `usuario`, `usuario_perfil` (índice único por usuário = um perfil), `ficha_atleta`.
- Função `salvar_usuario(p_id, p_dados, p_novo)`; gatilhos de padronização e de celular único.
- O convite usa a chave secreta do Supabase (`SUPABASE_SERVICE_ROLE_KEY`, configurada na Vercel).

## Guardado para depois (27/11)
- Prévia B: importação da planilha padrão em 3.3 Inscrições (procura pelo CPF: existe → só inscrição e atualiza; novo → cria Atleta + convite; cria só Atleta).
- Prévia C: inscrição pelo celular em 4 passos.
