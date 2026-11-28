# Regras gerais

Valem para todas as funcionalidades.

## Usuários e acesso
- Todos os usuários são da Orizon: não há várias empresas no sistema. Cliente é só um cadastro ligado aos eventos (26/11).
- Login por e-mail e senha. Google e Apple ficam para depois do MVP (15/11).
- Na web não existe "Primeiro acesso": as pessoas são cadastradas pela gestão e recebem um convite por e-mail para criar a senha (20/11).
- Cada pessoa tem **um cadastro (CPF) e um perfil só** (27/11). Ser Atleta é ter inscrição em um evento.
- Visitante só se cadastra pelo celular (27/11).

## Padrão dos dados (27/11)
- Nomes próprios (pessoas, empresas, endereço, cidade) são gravados em **CAIXA ALTA**, sem espaços repetidos.
- E-mail é gravado em **minúsculas**.
- CPF, CNPJ, CEP, celular e telefone são gravados **só com dígitos** e mostrados com máscara.
- Celular: DDD + 9 dígitos, começando com 9. Telefone fixo: DDD + 8 dígitos, começando de 2 a 5.
- CPF e CNPJ são conferidos pelos dígitos verificadores.
- A regra vale também no banco (gatilhos), não só na tela.

## Telas
- Fundo Cloud Mist (#E4E7E7), campos brancos, botão principal azul (#003E49) com seta laranja; textos só o essencial (16/11).
- Os rótulos das telas não usam caixa alta forçada; a regra de CAIXA ALTA é dos dados gravados.
- Toda funcionalidade nova tem uma prévia aprovada pelo Gilmar antes de ser feita.
- Erros aparecem em vermelho, em português simples, junto do campo ou do botão.
- Barra de opções das listas de cadastro (28/11): busca e filtros à esquerda, botão **+ Novo** sempre à direita e sem a contagem de registros. Vale para todos os cadastros (modelo: 2.1 Usuários).

## Permissões e registro
- Cada tela confere a permissão do perfil (Ver, Criar, Editar, Aprovar) definida em 1.5 Permissões; o banco confere de novo (RLS).
- O módulo Plataforma é só do Admin.
- Alterações importantes ficam registradas no log de auditoria (`registrar_log`).

## Banco
- Toda tabela nova precisa de `grant` para `authenticated` (o projeto de homologação não libera sozinho).
- Migrações em `supabase/migrations/`, numeradas por data e hora.
